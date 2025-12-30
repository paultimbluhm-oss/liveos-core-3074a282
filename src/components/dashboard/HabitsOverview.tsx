import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronRight, Flame, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/contexts/GamificationContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Habit {
  id: string;
  name: string;
  xp_reward: number;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
}

export function HabitsOverview() {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    const [habitsRes, completionsRes] = await Promise.all([
      supabase
        .from('habits')
        .select('id, name, xp_reward')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed_date', today)
    ]);

    if (habitsRes.data) {
      // Sort by XP (highest first)
      const sorted = habitsRes.data.sort((a, b) => (b.xp_reward || 0) - (a.xp_reward || 0));
      setHabits(sorted);
    }
    if (completionsRes.data) setCompletions(completionsRes.data);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!user) return;

    const habitsChannel = supabase
      .channel('habits-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, fetchData)
      .subscribe();

    const completionsChannel = supabase
      .channel('habit-completions-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(habitsChannel);
      supabase.removeChannel(completionsChannel);
    };
  }, [user]);

  const isCompletedToday = (habitId: string) => {
    return completions.some(c => c.habit_id === habitId);
  };

  const toggleHabit = async (habit: Habit) => {
    const alreadyCompleted = isCompletedToday(habit.id);

    if (alreadyCompleted) {
      // Remove completion and subtract XP
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habit.id)
        .eq('completed_date', today);
      setCompletions(prev => prev.filter(c => c.habit_id !== habit.id));
      
      // Subtract XP (negative amount)
      await addXP(-habit.xp_reward, `${habit.name} rückgängig`);
      toast.info(`-${habit.xp_reward} XP`);
    } else {
      const { data } = await supabase
        .from('habit_completions')
        .insert({
          user_id: user!.id,
          habit_id: habit.id,
          completed_date: today
        })
        .select()
        .single();

      if (data) {
        setCompletions(prev => [...prev, data]);
        await addXP(habit.xp_reward, habit.name);
      }
    }
  };

  const completedCount = habits.filter(h => isCompletedToday(h.id)).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Hide widget completely when all habits are done
  if (allDone) {
    return null;
  }

  if (habits.length === 0) {
    return (
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/20">
              <Check className="w-5 h-5 text-success" />
            </div>
            <h3 className="font-semibold">Tägliche Habits</h3>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">Noch keine Habits erstellt</p>
          <Button onClick={() => navigate('/privat?section=habits')} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Habits erstellen
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6 relative overflow-hidden">
      {/* Glow when all done */}
      {allDone && (
        <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${allDone ? 'bg-success/20 animate-pulse' : 'bg-success/20'}`}>
              <Check className={`w-5 h-5 ${allDone ? 'text-success' : 'text-success'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Tägliche Habits</h3>
              <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} erledigt</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/privat?section=habits')} className="gap-1">
            Alle <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                allDone 
                  ? 'bg-gradient-to-r from-success to-emerald-400 shadow-[0_0_15px_hsl(var(--success)/0.5)]' 
                  : 'bg-gradient-to-r from-success/80 to-success'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {allDone && (
          <div className="flex items-center gap-2 text-success text-sm mb-4 p-2 rounded-lg bg-success/10">
            <Check className="w-4 h-4" />
            <span>Alle Habits erledigt!</span>
          </div>
        )}

        {/* Habits list - show ALL habits, incomplete first */}
        <div className="space-y-2">
          {(() => {
            const incompleteHabits = habits.filter(h => !isCompletedToday(h.id));
            const completedHabits = habits.filter(h => isCompletedToday(h.id));
            const displayHabits = [...incompleteHabits, ...completedHabits];
            
            return displayHabits.map((habit) => {
              const completed = isCompletedToday(habit.id);
              return (
                <div 
                  key={habit.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer hover:bg-secondary/50 ${
                    completed ? 'bg-success/5' : 'bg-secondary/30'
                  }`}
                  onClick={() => toggleHabit(habit)}
                >
                  <Checkbox checked={completed} className="pointer-events-none" />
                  <span className={`flex-1 text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>
                    {habit.name}
                  </span>
                  <span className="text-xs text-primary">+{habit.xp_reward}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </Card>
  );
}
