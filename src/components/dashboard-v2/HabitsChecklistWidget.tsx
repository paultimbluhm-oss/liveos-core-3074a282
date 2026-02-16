import { useState, useEffect } from 'react';
import { Check, Flame, Plus, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/contexts/GamificationContext';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { HabitsManagementSheet } from './HabitsManagementSheet';
import type { WidgetSize, DashboardSettings } from '@/hooks/useDashboardV2';

interface Habit { id: string; name: string; xp_reward: number; }

interface Props {
  size: WidgetSize;
  settings?: DashboardSettings;
}

function computeStreaks(habitIds: string[], completions: { habit_id: string; completed_date: string }[]): Record<string, number> {
  const streaks: Record<string, number> = {};
  const today = format(new Date(), 'yyyy-MM-dd');

  for (const id of habitIds) {
    const dates = new Set(
      completions.filter(c => c.habit_id === id).map(c => c.completed_date)
    );
    
    let streak = 0;
    // Check if completed today first
    if (dates.has(today)) {
      streak = 1;
      let day = 1;
      while (dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) {
        streak++;
        day++;
      }
    } else {
      // Check if yesterday was completed (streak not broken yet today)
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      if (dates.has(yesterday)) {
        streak = 1;
        let day = 2;
        while (dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) {
          streak++;
          day++;
        }
      }
    }
    streaks[id] = streak;
  }
  return streaks;
}

export function HabitsChecklistWidget({ size, settings }: Props) {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [lifetimeCounts, setLifetimeCounts] = useState<Record<string, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({});
  const [showManagement, setShowManagement] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    const [hRes, cRes] = await Promise.all([
      supabase.from('habits').select('id, name, xp_reward').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('habit_id').eq('user_id', user.id).eq('completed_date', today),
    ]);
    if (hRes.data) {
      setHabits(hRes.data.sort((a, b) => (b.xp_reward || 0) - (a.xp_reward || 0)));
      const ids = hRes.data.map(h => h.id);
      if (ids.length > 0) {
        // Fetch all completions for lifetime counts AND streak calculation
        const { data: allCompletions } = await supabase
          .from('habit_completions')
          .select('habit_id, completed_date')
          .eq('user_id', user.id)
          .in('habit_id', ids);
        
        // Lifetime counts
        const counts: Record<string, number> = {};
        allCompletions?.forEach(c => { counts[c.habit_id] = (counts[c.habit_id] || 0) + 1; });
        setLifetimeCounts(counts);

        // Per-habit streaks
        setHabitStreaks(computeStreaks(ids, allCompletions || []));
      }
    }
    if (cRes.data) setCompletions(cRes.data.map(c => c.habit_id));
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
      await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today);
      setCompletions(prev => prev.filter(id => id !== habit.id));
      await addXP(-habit.xp_reward, `${habit.name} rueckgaengig`);
    } else {
      await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: habit.id, completed_date: today });
      setCompletions(prev => [...prev, habit.id]);
      await addXP(habit.xp_reward, habit.name);
    }
  };

  const doneCount = completions.length;
  const total = habits.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  const limit = settings?.habitDisplayLimit || 0;
  const sortedHabits = [...habits].sort((a, b) => {
    const aDone = completions.includes(a.id);
    const bDone = completions.includes(b.id);
    if (aDone === bDone) return 0;
    return aDone ? 1 : -1;
  });
  const displayHabits = limit > 0 ? sortedHabits.slice(0, limit) : sortedHabits;
  const hiddenCount = limit > 0 ? Math.max(0, sortedHabits.length - limit) : 0;

  if (habits.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Noch keine Habits</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/privat?section=habits')}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-card border border-border/50 p-4 space-y-3 ${allDone ? 'ring-1 ring-success/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowManagement(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${allDone ? 'bg-success/20' : 'bg-primary/10'}`}>
            <Check className={`w-4 h-4 ${allDone ? 'text-success' : 'text-primary'}`} strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold">{doneCount}/{total}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-mono ${allDone ? 'text-success' : 'text-primary'}`}>{pct}%</span>
          <button onClick={() => setShowManagement(true)} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${allDone ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* List */}
      <div className={`space-y-1.5 ${limit > 0 ? 'max-h-48 overflow-y-auto scrollbar-hide' : ''}`}>
        {displayHabits.map(habit => {
          const done = completions.includes(habit.id);
          const ltCount = lifetimeCounts[habit.id] || 0;
          const ltPct = Math.min(ltCount, 100);
          const streak = habitStreaks[habit.id] || 0;

          return (
            <div key={habit.id} className="space-y-1">
              <div
                onClick={() => toggle(habit)}
                className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                  done ? 'bg-success/5 opacity-60' : 'bg-muted/30 hover:bg-muted/60'
                }`}
              >
                <Checkbox checked={done} className="pointer-events-none" />
                <span className={`flex-1 text-sm truncate ${done ? 'line-through text-muted-foreground' : ''}`}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Flame className={`w-3 h-3 ${streak >= 7 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <span className={`text-[10px] font-mono ${streak >= 7 ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}`}>
                      {streak}
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ltCount}/100</span>
                <span className="text-[10px] text-primary font-mono shrink-0">+{habit.xp_reward}</span>
              </div>
              {/* Mini lifetime progress bar */}
              <div className="px-2">
                <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${ltCount >= 100 ? 'bg-success' : 'bg-primary/50'}`}
                    style={{ width: `${ltPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowManagement(true)}
            className="w-full text-center text-xs text-muted-foreground py-1.5 hover:text-foreground transition-colors"
          >
            +{hiddenCount} weitere
          </button>
        )}
      </div>

      <HabitsManagementSheet open={showManagement} onOpenChange={(o) => { setShowManagement(o); if (!o) fetchData(); }} />
    </div>
  );
}
