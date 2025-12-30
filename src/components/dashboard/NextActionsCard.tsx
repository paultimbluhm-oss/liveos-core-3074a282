import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Target, Check } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/contexts/GamificationContext';
import { Checkbox } from '@/components/ui/checkbox';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  type: 'task' | 'homework';
  subject_name?: string;
  xp_reward?: number;
}

export function NextActionsCard() {
  const { user } = useAuth();
  const { addXP, celebrateTaskComplete } = useGamification();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNextActions = async () => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [tasksRes, homeworkRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, xp_reward')
        .eq('user_id', user.id)
        .eq('completed', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(10),
      supabase
        .from('homework')
        .select('id, title, due_date, priority, xp_reward, subjects(name)')
        .eq('user_id', user.id)
        .eq('completed', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(10),
    ]);

    // Filter to show today's AND overdue tasks/homework
    const allTasks: Task[] = [
      ...(tasksRes.data || [])
        .filter(t => {
          if (!t.due_date) return false;
          const date = parseISO(t.due_date);
          return isToday(date) || isPast(date);
        })
        .map(t => ({ ...t, type: 'task' as const })),
      ...(homeworkRes.data || [])
        .filter(h => {
          if (!h.due_date) return false;
          const date = parseISO(h.due_date);
          return isToday(date) || isPast(date);
        })
        .map(h => ({
          id: h.id,
          title: h.title,
          due_date: h.due_date,
          priority: h.priority,
          type: 'homework' as const,
          subject_name: (h.subjects as any)?.name,
          xp_reward: h.xp_reward,
        })),
    ];

    allTasks.sort((a, b) => {
      if (a.due_date && b.due_date) {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });

    setTasks(allTasks.slice(0, 4));
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchNextActions();
    }
  }, [user]);

  // Realtime subscriptions for auto-refresh
  useEffect(() => {
    if (!user) return;

    const tasksChannel = supabase
      .channel('next-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchNextActions)
      .subscribe();

    const homeworkChannel = supabase
      .channel('next-homework')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchNextActions)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(homeworkChannel);
    };
  }, [user]);

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return 'Kein Datum';
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'EEE, dd. MMM', { locale: de });
  };

  const getPriorityIndicator = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-emerald-500';
    }
  };

  const completeTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const table = task.type === 'task' ? 'tasks' : 'homework';
    
    await supabase
      .from(table)
      .update({ completed: true })
      .eq('id', task.id);
    
    // Remove from list with animation
    setTasks(prev => prev.filter(t => t.id !== task.id));
    
    // Award XP and celebrate
    const xp = task.xp_reward || 10;
    await addXP(xp, task.title);
    celebrateTaskComplete(task.title);
  };

  // Don't render anything if no tasks for today
  if (!loading && tasks.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Heute</h3>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
        </div>
        <Link to="/privat?section=aufgaben" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          Alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-1">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.05 }}
                layout
                className="group flex items-center gap-2 p-2 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all"
              >
                {/* Priority indicator */}
                <div className={`w-0.5 h-6 rounded-full ${getPriorityIndicator(task.priority)}`} />
                
                {/* Checkbox */}
                <div 
                  onClick={(e) => completeTask(task, e)}
                  className="cursor-pointer"
                >
                  <Checkbox className="h-4 w-4 data-[state=checked]:bg-success data-[state=checked]:border-success" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {task.title}
                  </p>
                </div>
                
                <span className="text-[10px] text-muted-foreground font-mono">
                  +{task.xp_reward || 10}
                </span>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
