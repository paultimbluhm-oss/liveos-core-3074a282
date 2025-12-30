import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Flame, CheckCircle2, Star } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface TodayStats {
  tasksCompleted: number;
  tasksTotal: number;
  homeworkCompleted: number;
  homeworkTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
}

export function TodayProgressCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TodayStats>({
    tasksCompleted: 0,
    tasksTotal: 0,
    homeworkCompleted: 0,
    homeworkTotal: 0,
    habitsCompleted: 0,
    habitsTotal: 0,
  });

  const fetchTodayStats = async () => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const [tasksRes, homeworkRes, habitsRes, habitCompletionsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, completed, due_date')
        .eq('user_id', user.id)
        .not('due_date', 'is', null),
      supabase
        .from('homework')
        .select('id, completed, due_date')
        .eq('user_id', user.id)
        .eq('due_date', today),
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('habit_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed_date', today),
    ]);

    const todaysTasks = (tasksRes.data || []).filter(t => {
      if (!t.due_date) return false;
      const taskDate = format(new Date(t.due_date), 'yyyy-MM-dd');
      return taskDate === today;
    });

    setStats({
      tasksCompleted: todaysTasks.filter(t => t.completed).length,
      tasksTotal: todaysTasks.length,
      homeworkCompleted: homeworkRes.data?.filter(h => h.completed).length || 0,
      homeworkTotal: homeworkRes.data?.length || 0,
      habitsCompleted: habitCompletionsRes.data?.length || 0,
      habitsTotal: habitsRes.data?.length || 0,
    });
  };

  useEffect(() => {
    if (user) {
      fetchTodayStats();
    }
  }, [user]);

  // Realtime subscriptions for auto-refresh
  useEffect(() => {
    if (!user) return;

    const tasksChannel = supabase
      .channel('today-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTodayStats)
      .subscribe();

    const homeworkChannel = supabase
      .channel('today-homework')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchTodayStats)
      .subscribe();

    const habitsChannel = supabase
      .channel('today-habits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchTodayStats)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(homeworkChannel);
      supabase.removeChannel(habitsChannel);
    };
  }, [user]);

  const totalCompleted = stats.tasksCompleted + stats.homeworkCompleted + stats.habitsCompleted;
  const totalItems = stats.tasksTotal + stats.homeworkTotal + stats.habitsTotal;
  const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  const allDone = totalItems > 0 && totalCompleted === totalItems;

  const progressItems = [
    { 
      label: 'Tasks', 
      completed: stats.tasksCompleted, 
      total: stats.tasksTotal,
      icon: CheckCircle2,
      color: 'text-primary',
      bgColor: 'bg-primary/20'
    },
    { 
      label: 'Hausaufgaben', 
      completed: stats.homeworkCompleted, 
      total: stats.homeworkTotal,
      icon: Star,
      color: 'text-accent',
      bgColor: 'bg-accent/20'
    },
    { 
      label: 'Habits', 
      completed: stats.habitsCompleted, 
      total: stats.habitsTotal,
      icon: Flame,
      color: 'text-streak',
      bgColor: 'bg-streak/20'
    },
  ];

  return (
    <div className="glass-card p-4 md:p-5 relative overflow-hidden">
      {/* Background glow when completed */}
      {allDone && (
        <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5 pointer-events-none" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${allDone ? 'text-success' : 'text-level'}`} />
            <h3 className="font-semibold text-base">Heute geschafft</h3>
          </div>
          <motion.div 
            className={`text-2xl font-bold font-mono ${allDone ? 'text-success' : 'text-foreground'}`}
            key={overallProgress}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {overallProgress}%
          </motion.div>
        </div>

        {/* Overall progress bar */}
        <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
          <motion.div
            className={`h-full rounded-full ${
              allDone 
                ? 'bg-gradient-to-r from-success to-emerald-400' 
                : 'bg-gradient-to-r from-primary via-accent to-success'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Individual progress items */}
        <div className="grid grid-cols-3 gap-2">
          {progressItems.map((item, i) => {
            const Icon = item.icon;
            const itemProgress = item.total > 0 ? (item.completed / item.total) * 100 : 0;
            const itemDone = item.total > 0 && item.completed === item.total;

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-lg bg-secondary/30 text-center ${itemDone ? 'ring-1 ring-success/50' : ''}`}
              >
                <div className={`p-2 rounded-lg ${item.bgColor} w-fit mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${itemDone ? 'text-success' : item.color}`} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-sm font-bold ${itemDone ? 'text-success' : 'text-foreground'}`}>
                  {item.completed}/{item.total}
                </p>
                <div className="h-1 bg-secondary/50 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${itemDone ? 'bg-success' : item.color.replace('text-', 'bg-')}`}
                    style={{ width: `${itemProgress}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {allDone && totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-success text-sm font-medium"
          >
            🎉 Alles erledigt! Fantastisch!
          </motion.div>
        )}
      </div>
    </div>
  );
}
