import { useState, useEffect } from 'react';
import { ListTodo, Plus, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
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
      .from('tasks').select('*').eq('user_id', user.id).eq('completed', false)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(20);
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
    await sb.from('tasks').update({ completed: true }).eq('id', task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const todayTasks = tasks.filter(t => t.due_date && (isToday(parseISO(t.due_date)) || (isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))));
  const todayOnlyCount = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date))).length;
  const overdueCount = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length;
  const totalOpen = tasks.length;

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

  // === SMALL: Just counts ===
  if (size === 'small') {
    return (
      <>
        <button
          onClick={() => setShowSheet(true)}
          className="rounded-2xl bg-card border border-border/50 p-4 w-full text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold">Aufgaben</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold">{todayOnlyCount + overdueCount}</span>
            <span className="text-xs text-muted-foreground">offen</span>
          </div>
          {overdueCount > 0 && (
            <p className="text-[10px] text-rose-500 font-medium mt-1">{overdueCount} ueberfaellig</p>
          )}
        </button>
        <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      </>
    );
  }

  // Determine how many to show based on size
  const displayLimit = size === 'medium' ? 3 : 6;
  const displayTasks = todayTasks.slice(0, displayLimit);
  const moreCount = Math.max(0, todayTasks.length - displayLimit);

  // === MEDIUM / LARGE: List with inline actions ===
  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSheet(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
              <ListTodo className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-500' : 'text-primary'}`} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold">Aufgaben</span>
            <span className="text-xs text-muted-foreground ml-1">{todayOnlyCount + overdueCount}</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {displayTasks.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-xs text-muted-foreground">Keine Aufgaben fuer heute</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayTasks.map(task => {
              const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-0.5 h-5 rounded-full shrink-0 ${priorityIndicator[task.priority] || priorityIndicator.medium}`} />
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleComplete(task)}
                    className="shrink-0"
                  />
                  <span className="flex-1 text-sm truncate">{task.title}</span>
                  {task.due_date && (
                    <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              );
            })}
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
      </div>

      <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      <TaskDialog open={showAdd} onOpenChange={setShowAdd} onSuccess={fetchTasks} />
    </>
  );
}
