import { useState, useEffect } from 'react';
import { Check, Flame, Plus, Minus, ChevronDown, Sparkles } from 'lucide-react';
import { icons } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, parseISO } from 'date-fns';
import { HabitsManagementSheet } from './HabitsManagementSheet';
import { HabitDetailSheet } from './HabitDetailSheet';
import { HabitCreationWizard } from './HabitCreationWizard';
import type { WidgetSize, DashboardSettings } from '@/hooks/useDashboardV2';

interface Habit { id: string; name: string; icon: string | null; habit_type: string; created_at: string | null; half_width: boolean; }

interface Props {
  size: WidgetSize;
  settings?: DashboardSettings;
}

function computeStreaks(habits: Habit[], completions: { habit_id: string; completed_date: string }[]): Record<string, number> {
  const streaks: Record<string, number> = {};
  const today = format(new Date(), 'yyyy-MM-dd');
  for (const habit of habits) {
    const id = habit.id;
    const dates = new Set(completions.filter(c => c.habit_id === id).map(c => c.completed_date));
    if (dates.has(today)) {
      let streak = 1;
      let day = 1;
      while (dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) { streak++; day++; }
      streaks[id] = streak;
    } else {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      if (dates.has(yesterday)) {
        let streak = 1;
        let day = 2;
        while (dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) { streak++; day++; }
        streaks[id] = streak;
      } else {
        // Negative streak: count missed days from yesterday back to last completion or creation date
        const createdDate = habit.created_at ? format(parseISO(habit.created_at), 'yyyy-MM-dd') : null;
        let missed = 0;
        let day = 1;
        while (!dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) {
          const checkDate = format(subDays(new Date(), day), 'yyyy-MM-dd');
          // Stop if we go before the habit creation date
          if (createdDate && checkDate < createdDate) break;
          missed++;
          day++;
          if (day > 60) break;
        }
        streaks[id] = missed > 0 ? -missed : 0;
      }
    }
  }
  return streaks;
}

export function HabitsChecklistWidget({ size, settings }: Props) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [countValues, setCountValues] = useState<Record<string, number>>({});
  const [yesterdayValues, setYesterdayValues] = useState<Record<string, number>>({});
  const [lifetimeCounts, setLifetimeCounts] = useState<Record<string, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({});
  const [showManagement, setShowManagement] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const [hRes, cRes, yRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('*').eq('user_id', user.id).eq('completed_date', today),
      supabase.from('habit_completions').select('*').eq('user_id', user.id).eq('completed_date', yesterday),
    ]);
    if (hRes.data) {
      const habitsWithType = hRes.data.map((h: any) => ({ id: h.id, name: h.name, icon: h.icon || null, habit_type: h.habit_type || 'check', created_at: h.created_at || null, half_width: h.half_width || false }));
      setHabits(habitsWithType);
      const ids = habitsWithType.map((h: Habit) => h.id);
      if (ids.length > 0) {
        const { data: allCompletions } = await supabase
          .from('habit_completions')
          .select('habit_id, completed_date')
          .eq('user_id', user.id)
          .in('habit_id', ids);
        const counts: Record<string, number> = {};
        allCompletions?.forEach(c => { counts[c.habit_id] = (counts[c.habit_id] || 0) + 1; });
        setLifetimeCounts(counts);
        setHabitStreaks(computeStreaks(habitsWithType, allCompletions || []));
      }
    }
    if (cRes.data) {
      setCompletions(cRes.data.map((c: any) => c.habit_id));
      const cv: Record<string, number> = {};
      cRes.data.forEach((c: any) => { if (c.value != null) cv[c.habit_id] = c.value; });
      setCountValues(cv);
    }
    if (yRes.data) {
      const yv: Record<string, number> = {};
      yRes.data.forEach((c: any) => { if (c.value != null) yv[c.habit_id] = c.value; });
      setYesterdayValues(yv);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('dv2-habits-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const toggle = async (habit: Habit) => {
    if (!user) return;
    const done = completions.includes(habit.id);
    if (done) {
      await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today).eq('user_id', user.id);
      setCompletions(prev => prev.filter(id => id !== habit.id));
      setCountValues(prev => { const n = { ...prev }; delete n[habit.id]; return n; });
    } else {
      await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: habit.id, completed_date: today } as any);
      setCompletions(prev => [...prev, habit.id]);
    }
  };

  const adjustCount = async (habit: Habit, delta: number) => {
    if (!user) return;
    const current = countValues[habit.id] || 0;
    const newVal = Math.max(0, current + delta);
    const alreadyExists = completions.includes(habit.id);
    if (newVal === 0 && alreadyExists) {
      await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today).eq('user_id', user.id);
      setCompletions(prev => prev.filter(id => id !== habit.id));
      setCountValues(prev => { const n = { ...prev }; delete n[habit.id]; return n; });
    } else if (alreadyExists) {
      await (supabase.from('habit_completions').update({ value: newVal } as any).eq('habit_id', habit.id).eq('completed_date', today).eq('user_id', user.id));
      setCountValues(prev => ({ ...prev, [habit.id]: newVal }));
    } else {
      await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: habit.id, completed_date: today, value: newVal } as any);
      setCompletions(prev => [...prev, habit.id]);
      setCountValues(prev => ({ ...prev, [habit.id]: newVal }));
    }
  };

  const doneCount = completions.length;
  const total = habits.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  const limit = settings?.habitDisplayLimit || 0;
  const openHabits = habits.filter(h => h.habit_type === 'count' || !completions.includes(h.id));
  const doneHabits = habits.filter(h => h.habit_type !== 'count' && completions.includes(h.id));
  const displayOpen = limit > 0 ? openHabits.slice(0, limit) : openHabits;
  const hiddenCount = limit > 0 ? Math.max(0, openHabits.length - limit) : 0;
  const [showDone, setShowDone] = useState(false);

  if (habits.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Noch keine Habits</p>
        <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Erstellen
        </Button>
        <HabitCreationWizard open={showWizard} onOpenChange={setShowWizard} onCreated={fetchData} />
        <HabitsManagementSheet open={showManagement} onOpenChange={(o) => { setShowManagement(o); if (!o) fetchData(); }} />
      </div>
    );
  }

  const renderCompactHabit = (habit: Habit) => {
    const isDoneToday = completions.includes(habit.id);
    const isCount = habit.habit_type === 'count';
    const currentVal = countValues[habit.id] || 0;
    const streak = habitStreaks[habit.id] || 0;
    const isNegative = streak < 0;
    const HabitIcon = icons[(habit.icon || 'Check') as keyof typeof icons] || icons.Check;

    return (
      <button
        key={habit.id}
        onClick={() => isCount ? adjustCount(habit, 1) : toggle(habit)}
        onContextMenu={(e) => { e.preventDefault(); setSelectedHabitId(habit.id); }}
        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-h-[52px] ${
          isDoneToday
            ? 'bg-success/10 ring-1 ring-success/30'
            : isNegative
              ? 'bg-destructive/8 border border-destructive/20'
              : 'bg-muted/30 hover:bg-muted/60'
        }`}
      >
        <HabitIcon className={`w-5 h-5 ${isDoneToday ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`} strokeWidth={1.5} />
        {isCount && (
          <span className="text-[10px] font-mono font-semibold">{currentVal}</span>
        )}
      </button>
    );
  };

  const renderHabitRow = (habit: Habit, isDone: boolean) => {
    if (habit.half_width) return null; // rendered separately in grid
    const ltCount = lifetimeCounts[habit.id] || 0;
    const ltPct = Math.min(ltCount, 100);
    const streak = habitStreaks[habit.id] || 0;
    const isCount = habit.habit_type === 'count';
    const currentVal = countValues[habit.id] || 0;
    const isDoneToday = completions.includes(habit.id);
    const isNegative = streak < 0;
    const streakColor = isNegative ? 'text-destructive' : isDoneToday ? 'text-orange-500' : 'text-muted-foreground';
    const streakWeight = isDoneToday || isNegative ? 'font-semibold' : '';
    const adopted = ltCount >= 100;
    const negativeBg = isNegative && !isDoneToday ? 'bg-destructive/8 border border-destructive/20' : '';
    const HabitIcon = icons[(habit.icon || 'Check') as keyof typeof icons] || icons.Check;

    return (
      <div key={habit.id} className="space-y-0.5">
        {isCount ? (
          <div className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-colors ${isDoneToday ? 'bg-success/10' : negativeBg || 'bg-muted/30'}`}>
            <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
              <HabitIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <button onClick={() => adjustCount(habit, -1)} className="w-6 h-6 rounded-md bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors shrink-0">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-mono font-semibold min-w-[2ch] text-center">{currentVal}</span>
            <button onClick={() => adjustCount(habit, 1)} className="w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
              <Plus className="w-3 h-3 text-primary" />
            </button>
            <button onClick={() => setSelectedHabitId(habit.id)} className={`flex-1 text-xs truncate text-left hover:underline underline-offset-2 ${isNegative && !isDoneToday ? 'text-destructive' : ''}`}>
              {habit.name}
            </button>
            {streak !== 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Flame className={`w-2.5 h-2.5 ${streakColor}`} />
                <span className={`text-[10px] font-mono ${streakColor} ${streakWeight}`}>{streak}</span>
              </div>
            )}
            {adopted && <Sparkles className="w-2.5 h-2.5 text-success shrink-0" />}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ltPct}%</span>
          </div>
        ) : isDone ? (
          <div className="flex items-center gap-1.5 p-1.5 rounded-lg transition-all bg-success/5 opacity-60 hover:opacity-80">
            <Checkbox checked={true} onCheckedChange={() => toggle(habit)} className="w-4 h-4" />
            <div className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <HabitIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <button onClick={() => setSelectedHabitId(habit.id)} className="flex-1 text-xs truncate line-through text-muted-foreground text-left hover:underline underline-offset-2 cursor-pointer">
              {habit.name}
            </button>
            {streak !== 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Flame className={`w-2.5 h-2.5 ${streakColor}`} />
                <span className={`text-[10px] font-mono ${streakColor} ${streakWeight}`}>{streak}</span>
              </div>
            )}
            {adopted && <Sparkles className="w-2.5 h-2.5 text-success shrink-0" />}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ltPct}%</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all ${negativeBg || 'bg-muted/30 hover:bg-muted/60'}`}>
            <Checkbox checked={false} onCheckedChange={() => toggle(habit)} className="w-4 h-4" />
            <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
              <HabitIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <button onClick={() => setSelectedHabitId(habit.id)} className={`flex-1 text-xs truncate text-left hover:underline underline-offset-2 ${isNegative ? 'text-destructive font-medium' : ''}`}>
              {habit.name}
            </button>
            {streak !== 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Flame className={`w-2.5 h-2.5 ${streakColor}`} />
                <span className={`text-[10px] font-mono ${streakColor} ${streakWeight}`}>{streak}</span>
              </div>
            )}
            {adopted && <Sparkles className="w-2.5 h-2.5 text-success shrink-0" />}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ltPct}%</span>
          </div>
        )}
      </div>
    );
  };

  const compactHabits = habits.filter(h => h.half_width);
  const fullWidthOpen = displayOpen.filter(h => !h.half_width);
  const fullWidthDone = doneHabits.filter(h => !h.half_width);

  return (
    <div className={`rounded-2xl bg-card border border-border/50 p-4 space-y-3 ${allDone ? 'ring-1 ring-success/30' : ''}`}>
      <div className="flex items-center justify-between">
        <button onClick={() => setShowManagement(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${allDone ? 'bg-success/20' : 'bg-primary/10'}`}>
            <Check className={`w-4 h-4 ${allDone ? 'text-success' : 'text-primary'}`} strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold">{doneCount}/{total}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-mono ${allDone ? 'text-success' : 'text-primary'}`}>{pct}%</span>
          <button onClick={() => setShowWizard(true)} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${allDone ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {compactHabits.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {compactHabits.map(habit => renderCompactHabit(habit))}
        </div>
      )}

      <div className={`space-y-1.5 ${limit > 0 ? 'max-h-48 overflow-y-auto scrollbar-hide' : ''}`}>
        {fullWidthOpen.map(habit => renderHabitRow(habit, false))}
        {hiddenCount > 0 && (
          <button onClick={() => setShowManagement(true)} className="w-full text-center text-xs text-muted-foreground py-1.5 hover:text-foreground transition-colors">
            +{hiddenCount} weitere
          </button>
        )}
      </div>

      {fullWidthDone.length > 0 && (
        <Collapsible open={showDone} onOpenChange={setShowDone}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`} />
            <span>Erledigt ({fullWidthDone.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 pt-1.5">
            {fullWidthDone.map(habit => renderHabitRow(habit, true))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <HabitsManagementSheet open={showManagement} onOpenChange={(o) => { setShowManagement(o); if (!o) fetchData(); }} />
      <HabitCreationWizard open={showWizard} onOpenChange={setShowWizard} onCreated={fetchData} />
      <HabitDetailSheet open={!!selectedHabitId} onOpenChange={(o) => { if (!o) setSelectedHabitId(null); }} habitId={selectedHabitId} onUpdated={fetchData} />
    </div>
  );
}
