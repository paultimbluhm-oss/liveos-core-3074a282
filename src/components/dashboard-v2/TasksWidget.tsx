import { useState, useEffect } from 'react';
import { ListTodo, Plus, ChevronDown, Clock, AlertCircle, CheckCircle2, Calendar, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, isPast, parseISO, isBefore, addDays, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { TasksManagementSheet } from './TasksManagementSheet';
import { TaskDialog } from '@/components/privat/tasks/TaskDialog';
import { toast } from 'sonner';
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
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    if (!user) return;
    // Fetch incomplete tasks + today's completed tasks (avoid old completed tasks filling the limit)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: openTasks } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .eq('completed', false)
      .order('due_date', { ascending: true, nullsFirst: false });
    const { data: todayDone } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .eq('completed', true)
      .gte('due_date', todayStr)
      .lt('due_date', todayStr + 'T23:59:59')
      ;
    setTasks([...(openTasks || []), ...(todayDone || [])]);
  };

  useEffect(() => { if (user) fetchTasks(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('dv2-tasks-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const toggleComplete = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    const sb = getSupabase();
    const newCompleted = !task.completed;
    await sb.from('tasks').update({ completed: newCompleted }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    toast.success('Geloescht');
    setDetailTask(null);
    fetchTasks();
  };

  // Categorize tasks
  const today = startOfDay(new Date());
  const overdueTasks = tasks.filter(t => t.due_date && isBefore(parseISO(t.due_date), today) && !isToday(parseISO(t.due_date)) && !t.completed);
  const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
  const soonTasks = tasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    const d = parseISO(t.due_date);
    return !isToday(d) && !isBefore(d, today) && isBefore(d, addDays(today, 8));
  });
  const laterTasks = tasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    const d = parseISO(t.due_date);
    return !isBefore(d, addDays(today, 8));
  });
  const noDueTasks = tasks.filter(t => !t.due_date && !t.completed);

  const todayOpen = [...todayTasks.filter(t => !t.completed), ...overdueTasks];
  const todayDone = todayTasks.filter(t => t.completed);
  const overdueCount = overdueTasks.length;
  const todayTotal = todayTasks.length + overdueTasks.length;
  const todayDoneCount = todayDone.length;
  const percentage = todayTotal === 0 ? 100 : Math.round((todayDoneCount / todayTotal) * 100);

  const formatDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'EEE, d. MMM', { locale: de });
  };


  const TaskRow = ({ task, showDate = true }: { task: Task; showDate?: boolean }) => {
    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && !task.completed;
    
    return (
      <button
        onClick={() => setDetailTask(task)}
        className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl transition-all active:scale-[0.98] ${
          task.completed 
            ? 'bg-muted/20 opacity-50' 
            : isOverdue 
              ? 'bg-rose-500/5 border border-rose-500/20' 
              : 'bg-card border border-border/40 shadow-sm hover:shadow-md'
        }`}
      >
        
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleComplete(task)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm leading-tight block truncate ${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
            {task.title}
          </span>
          {task.description && !task.completed && (
            <span className="text-[11px] text-muted-foreground truncate block mt-0.5">{task.description}</span>
          )}
        </div>
        {showDate && task.due_date && (
          <span className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded-md ${
            isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-muted/50 text-muted-foreground'
          }`}>
            {formatDate(task.due_date)}
          </span>
        )}
      </button>
    );
  };

  const SectionHeader = ({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) => (
    <div className="flex items-center gap-2 pt-1 pb-1">
      <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.5} />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color} bg-current/10`}>
        <span className="text-current">{count}</span>
      </span>
    </div>
  );

  // === SMALL ===
  if (size === 'small') {
    return (
      <>
        <button
          onClick={() => setShowSheet(true)}
          className="rounded-2xl bg-card border border-border/50 p-4 w-full text-left hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${percentage === 100 ? 'bg-emerald-500/10' : overdueCount > 0 ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
              <ListTodo className={`w-4 h-4 ${percentage === 100 ? 'text-emerald-500' : overdueCount > 0 ? 'text-rose-500' : 'text-primary'}`} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold">Aufgaben</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className={`text-3xl font-bold ${percentage === 100 ? 'text-emerald-500' : ''}`}>{percentage}%</span>
              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden mt-1.5">
                <div className={`h-full rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
            <div className="text-right">
              {todayOpen.length > 0 && <p className="text-xs text-muted-foreground">{todayOpen.length} offen</p>}
              {overdueCount > 0 && <p className="text-[11px] text-rose-500 font-medium">{overdueCount} ueberfaellig</p>}
            </div>
          </div>
        </button>
        <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      </>
    );
  }

  const displayLimit = size === 'medium' ? 5 : 10;

  // === MEDIUM / LARGE ===
  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSheet(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${percentage === 100 ? 'bg-emerald-500/10' : overdueCount > 0 ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
              <ListTodo className={`w-4 h-4 ${percentage === 100 ? 'text-emerald-500' : overdueCount > 0 ? 'text-rose-500' : 'text-primary'}`} strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-sm font-semibold block">Aufgaben</span>
              <span className={`text-[11px] ${percentage === 100 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                {todayOpen.length === 0 && todayDoneCount === 0 ? 'Nichts geplant' : `${percentage}% erledigt`}
              </span>
            </div>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4 text-primary" strokeWidth={2} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${percentage === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Task list */}
        {todayOpen.length === 0 && todayDoneCount === 0 && soonTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground">Keine Aufgaben</p>
            <button onClick={() => setShowAdd(true)} className="text-xs text-primary font-medium hover:underline">
              Neue Aufgabe erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <>
                <SectionHeader icon={AlertCircle} label="Ueberfaellig" count={overdueTasks.length} color="text-rose-500" />
                {overdueTasks.slice(0, 3).map(task => <TaskRow key={task.id} task={task} />)}
                {overdueTasks.length > 3 && (
                  <button onClick={() => setShowSheet(true)} className="w-full text-center text-xs text-rose-500/70 py-1 hover:text-rose-500">
                    +{overdueTasks.length - 3} weitere
                  </button>
                )}
              </>
            )}

            {/* Today */}
            {todayTasks.filter(t => !t.completed).length > 0 && (
              <>
                <SectionHeader icon={Clock} label="Heute" count={todayTasks.filter(t => !t.completed).length} color="text-primary" />
                {todayTasks.filter(t => !t.completed).slice(0, displayLimit).map(task => <TaskRow key={task.id} task={task} showDate={false} />)}
              </>
            )}

            {/* Soon (next 7 days) */}
            {size === 'large' && soonTasks.length > 0 && (
              <>
                <SectionHeader icon={Calendar} label="Diese Woche" count={soonTasks.length} color="text-amber-500" />
                {soonTasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} />)}
                {soonTasks.length > 4 && (
                  <button onClick={() => setShowSheet(true)} className="w-full text-center text-xs text-muted-foreground py-1 hover:text-foreground">
                    +{soonTasks.length - 4} weitere
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Completed collapse */}
        {todayDone.length > 0 && (
          <Collapsible open={showDoneTasks} onOpenChange={setShowDoneTasks}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDoneTasks ? 'rotate-180' : ''}`} />
              <span>Erledigt ({todayDone.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 pt-1.5">
              {todayDone.map(task => <TaskRow key={task.id} task={task} showDate={false} />)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Task Detail Sheet */}
      <Sheet open={!!detailTask} onOpenChange={(o) => { if (!o) setDetailTask(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
          {detailTask && (() => {
            
            const isOverdue = detailTask.due_date && isPast(parseISO(detailTask.due_date)) && !isToday(parseISO(detailTask.due_date)) && !detailTask.completed;
            return (
              <>
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-left flex items-start gap-3">
                    <div className="w-1.5 h-8 rounded-full shrink-0 mt-0.5 bg-primary" />
                    <span className={`${detailTask.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {detailTask.title}
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-2">
                    {detailTask.due_date && (
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {formatDate(detailTask.due_date)}
                      </span>
                    )}
                    {detailTask.completed && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-medium">
                        Erledigt
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {detailTask.description && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detailTask.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={detailTask.completed ? 'outline' : 'default'}
                      className="flex-1"
                      onClick={() => {
                        toggleComplete(detailTask);
                        setDetailTask({ ...detailTask, completed: !detailTask.completed });
                      }}
                    >
                      {detailTask.completed ? 'Wiederherstellen' : 'Erledigt'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailTask(null);
                        setEditTask(detailTask);
                      }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteTask(detailTask.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <TasksManagementSheet open={showSheet} onOpenChange={(o) => { setShowSheet(o); if (!o) fetchTasks(); }} />
      <TaskDialog 
        open={showAdd || !!editTask} 
        onOpenChange={(o) => { 
          if (!o) { setShowAdd(false); setEditTask(null); } 
        }} 
        task={editTask || undefined}
        onSuccess={() => { fetchTasks(); setEditTask(null); }} 
      />
    </>
  );
}