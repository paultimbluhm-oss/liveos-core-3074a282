import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Habit {
  id: string;
  name: string;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
}

export function HabitsOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    const [habitsRes, completionsRes] = await Promise.all([
      supabase.from('habits').select('id, name').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('*').eq('user_id', user.id).eq('completed_date', today),
    ]);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (completionsRes.data) setCompletions(completionsRes.data);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel('habits-overview').on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, fetchData).subscribe();
    const ch2 = supabase.channel('habit-completions-overview').on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user]);

  const isCompletedToday = (habitId: string) => completions.some(c => c.habit_id === habitId);

  const toggleHabit = async (habit: Habit) => {
    if (!user) return;
    const alreadyCompleted = isCompletedToday(habit.id);
    if (alreadyCompleted) {
      await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today);
      setCompletions(prev => prev.filter(c => c.habit_id !== habit.id));
    } else {
      const { data } = await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: habit.id, completed_date: today }).select().single();
      if (data) setCompletions(prev => [...prev, data]);
    }
  };

  const completedCount = habits.filter(h => isCompletedToday(h.id)).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (allDone) return null;

  if (habits.length === 0) {
    return (
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/20"><Check className="w-5 h-5 text-success" /></div>
            <h3 className="font-semibold">Habits</h3>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">Noch keine Habits erstellt</p>
          <Button onClick={() => navigate('/privat?section=habits')} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Habits erstellen
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/20"><Check className="w-5 h-5 text-success" /></div>
            <div>
              <h3 className="font-semibold">Habits</h3>
              <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} erledigt</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/privat?section=habits')} className="gap-1">
            Alle <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-4">
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-success/80 to-success" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {(() => {
            const incompleteHabits = habits.filter(h => !isCompletedToday(h.id));
            const completedHabits = habits.filter(h => isCompletedToday(h.id));
            return [...incompleteHabits, ...completedHabits].map((habit) => {
              const completed = isCompletedToday(habit.id);
              return (
                <div key={habit.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer hover:bg-secondary/50 ${completed ? 'bg-success/5' : 'bg-secondary/30'}`} onClick={() => toggleHabit(habit)}>
                  <Checkbox checked={completed} className="pointer-events-none" />
                  <span className={`flex-1 text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>{habit.name}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </Card>
  );
}
