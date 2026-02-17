import { useState, useEffect } from 'react';
import { ListTodo, Plus, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { TasksManagementSheet } from './TasksManagementSheet';
import { TaskDialog } from '@/components/privat/tasks/TaskDialog';
import type { WidgetSize } from '@/hooks/useDashboardV2';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  recurrence_type?: string | null;
}

export function TasksWidget({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(50);
    setTasks(data || []);
  };

  useEffect(() => { if (user) fetchTasks(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('dv2-tasks-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const toggleComplete = async (task: Task) => {
    if (!user) return;
    const sb = getSupabase();
    const newCompleted = !task.completed;
    await sb.from('tasks').update({ completed: newCompleted }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
  };

  // Filters
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const d = parseISO(t.due_date);
    return isToday(d) || (isPast(d) && !isToday(d));
  });
  const tomorrowTasks = tasks.filter(t => t.due_date && isTomorrow(parseISO(t.due_date)) && !t.completed);
  const todayOpen = todayTasks.filter(t => !t.completed);
  const todayDone = todayTasks.filter(t => t.completed);
  const overdueCount = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !t.completed).length;
  const todayTotal = todayTasks.length;
  const todayDoneCount = todayDone.length;
  const percentage = todayTotal === 0 ? 100 : Math.round((todayDoneCount / todayTotal) * 100);

  const formatDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'dd.MM', { locale: de });
  };

  const priorityIndicator: Record<string, string> = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && !task.completed;
    return (
      <div className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
        task.completed ? 'bg-secondary/20 opacity-60' : isOverdue ? 'bg-rose-500/5' : 'bg-muted/30 hover:bg-muted/50'
      }`}>
        <div className={`w-0.5 h-5 rounded-full shrink-0 ${priorityIndicator[task.priority] || priorityIndicator.medium}`} />
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleComplete(task)}
          className="shrink-0"
        />
        <span className={`flex-1 text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
        {task.due_date && (
          <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    );
  };

  // === SMALL: Percentage + count ===
  if (size === 'small') {
    return (
      <>
        <button
          onClick={() => setShowSheet(true)}
          className="rounded-2xl bg-card border border-border/50 p-4 w-full text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${percentage === 100 ? 'bg-emerald-500/10' : overdueCount > 0 ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
              <ListTodo className={`w-4 h-4 ${percentage === 100 ? 'text-emerald-500' : overdueCount > 0 ? 'text-rose-500' : 'text-primary'}`} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold">Aufgaben</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${percentage === 100 ? 'text-emerald-500' : ''}`}>{percentage}%</span>
          </div>
          {todayOpen.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">{todayOpen.length} offen</p>
          )}
          {overdueCount > 0 && (
            <p className="text-[10px] text-rose-500 font-medium mt-0.5">{overdueCount} ueberfaellig</p>
          )}
        </button>
        <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      </>
    );
  }

  // Determine how many to show based on size
  const displayLimit = size === 'medium' ? 4 : 8;
  const displayTodayOpen = todayOpen.slice(0, displayLimit);
  const remainingSlots = displayLimit - displayTodayOpen.length;
  const displayTomorrow = size === 'large' && remainingSlots > 0 ? tomorrowTasks.slice(0, Math.min(remainingSlots, 3)) : [];
  const moreCount = Math.max(0, todayOpen.length - displayLimit);

  // === MEDIUM / LARGE ===
  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSheet(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${percentage === 100 ? 'bg-emerald-500/10' : overdueCount > 0 ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
              <ListTodo className={`w-4 h-4 ${percentage === 100 ? 'text-emerald-500' : overdueCount > 0 ? 'text-rose-500' : 'text-primary'}`} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold">Aufgaben</span>
            <span className={`text-xs font-mono ${percentage === 100 ? 'text-emerald-500' : 'text-muted-foreground'}`}>{percentage}%</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${percentage === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Task list */}
        {todayOpen.length === 0 && todayDoneCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-3 gap-1">
            <p className="text-xs text-muted-foreground">Keine Aufgaben fuer heute</p>
            <button onClick={() => setShowAdd(true)} className="text-xs text-primary hover:underline">
              Aufgabe hinzufuegen
            </button>
          </div>
        ) : todayOpen.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <p className="text-xs text-emerald-500 font-medium">Alles erledigt</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayTodayOpen.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
            {moreCount > 0 && (
              <button
                onClick={() => setShowSheet(true)}
                className="w-full text-center text-xs text-muted-foreground py-1 hover:text-foreground transition-colors"
              >
                +{moreCount} weitere
              </button>
            )}
          </div>
        )}

        {/* Tomorrow preview (large only) */}
        {displayTomorrow.length > 0 && (
          <div className="pt-1 border-t border-border/30">
            <button onClick={() => setShowSheet(true)} className="flex items-center gap-1 mb-1.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Morgen</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <div className="space-y-1">
              {displayTomorrow.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>

      <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      <TaskDialog open={showAdd} onOpenChange={setShowAdd} onSuccess={fetchTasks} />
    </>
  );
}
