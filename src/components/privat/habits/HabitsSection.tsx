import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Check, Trash2, Edit, TrendingUp, Calendar, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  created_at: string;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
}

interface HabitsSectionProps {
  onBack: () => void;
}

export function HabitsSection({ onBack }: HabitsSectionProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      fetchHabits();
      fetchCompletions();
    }
  }, [user]);

  const fetchHabits = async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && data) setHabits(data);
  };

  const fetchCompletions = async () => {
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', user!.id)
      .gte('completed_date', thirtyDaysAgo);

    if (!error && data) setCompletions(data);
  };

  const isCompletedToday = (habitId: string) => {
    return completions.some(c => c.habit_id === habitId && c.completed_date === today);
  };

  const allHabitsCompletedToday = () => {
    if (habits.length === 0) return false;
    return habits.every(h => isCompletedToday(h.id));
  };

  const toggleHabit = async (habit: Habit) => {
    const alreadyCompleted = isCompletedToday(habit.id);

    if (alreadyCompleted) {
      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habit.id)
        .eq('completed_date', today);

      if (!error) {
        setCompletions(prev => prev.filter(c => !(c.habit_id === habit.id && c.completed_date === today)));
        toast.info('Habit rueckgaengig gemacht');
      }
    } else {
      const { data, error } = await supabase
        .from('habit_completions')
        .insert({ user_id: user!.id, habit_id: habit.id, completed_date: today })
        .select()
        .single();

      if (!error && data) {
        setCompletions(prev => [...prev, data]);
        toast.success('Habit erledigt');
      }
    }
  };

  const saveHabit = async () => {
    if (!name.trim()) return;

    if (editingHabit) {
      const { error } = await supabase
        .from('habits')
        .update({ name, description: description || null })
        .eq('id', editingHabit.id);

      if (!error) { toast.success('Habit aktualisiert'); fetchHabits(); }
    } else {
      const { error } = await supabase
        .from('habits')
        .insert({ user_id: user!.id, name, description: description || null });

      if (!error) { toast.success('Habit erstellt'); fetchHabits(); }
    }
    resetForm();
  };

  const deleteHabit = async (id: string) => {
    const { error } = await supabase.from('habits').update({ is_active: false }).eq('id', id);
    if (!error) { toast.success('Habit geloescht'); fetchHabits(); }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingHabit(null);
    setDialogOpen(false);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description || '');
    setDialogOpen(true);
  };

  const getLast7Days = () => Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
  const getLast14Days = () => Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'));

  const getCompletionRate = (date: string) => {
    const habitsOnDate = habits.filter(h => format(new Date(h.created_at), 'yyyy-MM-dd') <= date);
    if (habitsOnDate.length === 0) return 0;
    const completed = habitsOnDate.filter(h => completions.some(c => c.habit_id === h.id && c.completed_date === date)).length;
    return (completed / habitsOnDate.length) * 100;
  };

  const completedToday = habits.filter(h => isCompletedToday(h.id)).length;
  const progressPercent = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;

  const chartData = useMemo(() => getLast14Days().map(date => ({
    date, label: format(new Date(date), 'dd.MM'), rate: getCompletionRate(date),
    completed: habits.filter(h => completions.some(c => c.habit_id === h.id && c.completed_date === date)).length,
  })), [habits, completions]);

  const habitStats = useMemo(() => {
    const last7 = getLast7Days();
    return habits.map(habit => {
      const completedDays = last7.filter(date => completions.some(c => c.habit_id === habit.id && c.completed_date === date)).length;
      return { ...habit, completedDays, rate: (completedDays / 7) * 100 };
    });
  }, [habits, completions]);

  const chartConfig = { rate: { label: 'Erfolgsrate', color: 'hsl(var(--primary))' } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border-2 border-emerald-500 text-emerald-500"><Check className="w-4 h-4" strokeWidth={1.5} /></div>
            <h2 className="text-lg font-bold">Habits</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden sm:flex h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Neu</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingHabit ? 'Habit bearbeiten' : 'Neuer Habit'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Wasser trinken" /></div>
              <div><Label>Beschreibung (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z.B. 2L pro Tag" /></div>
              <Button onClick={saveHabit} className="w-full">{editingHabit ? 'Speichern' : 'Erstellen'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(142, 76%, 36%)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${progressPercent * 0.94} 100`} className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold">{Math.round(progressPercent)}%</span></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Heute</div>
          <div className="text-xs text-muted-foreground">{completedToday}/{habits.length} erledigt</div>
          {allHabitsCompletedToday() && habits.length > 0 && (<div className="text-xs text-emerald-500 font-medium mt-0.5">Perfekt!</div>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardHeader className="py-2 px-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" />14-Tage Trend</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs><linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorRate)" name="Erfolgsrate" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="py-2 px-3"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-emerald-500" />Woche</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-7 gap-1.5">
              {getLast7Days().map((date) => {
                const rate = getCompletionRate(date);
                const isCurrentDay = date === today;
                const dayLabel = format(new Date(date), 'EEEEEE', { locale: de });
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase">{dayLabel}</span>
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${rate === 100 ? 'bg-emerald-500 text-white' : rate > 0 ? 'bg-emerald-500/30 text-emerald-500' : 'bg-muted text-muted-foreground'} ${isCurrentDay ? 'ring-1 ring-primary ring-offset-1 ring-offset-background' : ''}`}>
                      {format(new Date(date), 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {habitStats.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-2 px-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-3.5 h-3.5 text-amber-500" />Performance</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {habitStats.map((habit) => (
                <div key={habit.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate">{habit.name}</span>
                      <span className="text-[10px] text-muted-foreground">{habit.completedDays}/7</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${habit.rate >= 80 ? 'bg-emerald-500' : habit.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${habit.rate}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${habit.rate >= 80 ? 'text-emerald-500' : habit.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{Math.round(habit.rate)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {habits.length === 0 ? (
          <Card className="p-6 border-border/50 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Plus className="w-6 h-6 text-emerald-500" /></div>
            <p className="text-sm text-muted-foreground">Noch keine Habits</p>
            <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}><Plus className="w-3 h-3 mr-1" />Ersten Habit erstellen</Button>
          </Card>
        ) : (
          habits.map((habit) => {
            const completed = isCompletedToday(habit.id);
            return (
              <div key={habit.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${completed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border/50 hover:border-primary/30'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all ${completed ? 'bg-emerald-500 shadow-md shadow-emerald-500/25' : 'bg-muted hover:bg-muted/80'}`} onClick={() => toggleHabit(habit)}>
                  <Check className={`w-4 h-4 transition-all ${completed ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${completed ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{habit.name}</p>
                  {habit.description && (<p className="text-xs text-muted-foreground truncate">{habit.description}</p>)}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(habit)}><Edit className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteHabit(habit.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Button className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-xl sm:hidden" onClick={() => setDialogOpen(true)}>
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
