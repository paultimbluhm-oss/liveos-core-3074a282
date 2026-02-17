import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil, Repeat, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaskDialog } from '@/components/privat/tasks/TaskDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  recurrence_type?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TasksManagementSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { if (open && user) { setLoading(true); fetchTasks(); } }, [open, user]);

  const toggleComplete = async (task: Task) => {
    const supabase = getSupabase();
    const newCompleted = !task.completed;
    const { error } = await supabase.from('tasks').update({ completed: newCompleted }).eq('id', task.id);
    if (!error) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
  };

  const deleteTask = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Aufgabe geloescht' });
    }
  };

  const filterTasks = () => {
    let filtered = tasks;
    if (!showCompleted) filtered = filtered.filter(t => !t.completed);
    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(t => {
          if (!t.due_date) return false;
          const date = parseISO(t.due_date);
          return isToday(date) || (isPast(date) && !t.completed);
        });
        break;
      case 'week':
        filtered = filtered.filter(t => t.due_date && isThisWeek(parseISO(t.due_date), { locale: de }));
        break;
      case 'all':
        break;
    }
    return filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  };

  const filtered = filterTasks();
  const overdueCount = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !t.completed && !isToday(parseISO(t.due_date))).length;
  const todayCount = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && !t.completed).length;

  const priorityIndicator: Record<string, string> = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  };

  const filterOptions = [
    { value: 'today', label: 'Heute' },
    { value: 'week', label: 'Diese Woche' },
    { value: 'all', label: 'Alle' },
  ];
  const currentFilter = filterOptions.find(f => f.value === activeTab);

  const formatDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'd. MMM', { locale: de });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-4">
          <SheetHeader className="pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Aufgaben</SheetTitle>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Neu
              </Button>
            </div>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-secondary/40 text-center">
              <p className="text-lg font-bold">{todayCount}</p>
              <p className="text-[10px] text-muted-foreground">Heute</p>
            </div>
            <div className={`p-2.5 rounded-xl text-center ${overdueCount > 0 ? 'bg-rose-500/10' : 'bg-secondary/40'}`}>
              <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-rose-500' : ''}`}>{overdueCount}</p>
              <p className="text-[10px] text-muted-foreground">Ueberfaellig</p>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary/40 text-center">
              <p className="text-lg font-bold">{tasks.filter(t => t.completed).length}</p>
              <p className="text-[10px] text-muted-foreground">Erledigt</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 justify-between h-9">
                  <span className="text-sm">{currentFilter?.label}</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-popover border border-border shadow-lg z-50">
                {filterOptions.map(opt => (
                  <DropdownMenuItem key={opt.value} onClick={() => setActiveTab(opt.value)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant={showCompleted ? 'secondary' : 'outline'} size="sm" onClick={() => setShowCompleted(!showCompleted)} className="h-9 px-3">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[calc(85vh-220px)]">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Laden...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Keine Aufgaben</p>
            ) : (
              filtered.map(task => {
                const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !task.completed && !isToday(parseISO(task.due_date));
                return (
                  <div key={task.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all group ${
                    task.completed ? 'bg-secondary/20 opacity-60' : isOverdue ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-muted/30 hover:bg-muted/50'
                  }`}>
                    <div className={`w-1 h-7 rounded-full shrink-0 ${priorityIndicator[task.priority] || priorityIndicator.medium}`} />
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleComplete(task)} className="shrink-0" />
                    <div className="flex-1 min-w-0" onClick={() => setEditTask(task)}>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                        {task.recurrence_type && <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />}
                      </div>
                      {task.due_date && (
                        <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-rose-500' : isToday(parseISO(task.due_date)) ? 'text-primary' : 'text-muted-foreground'}`}>
                          {formatDate(task.due_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => setEditTask(task)}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TaskDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchTasks} />
      <TaskDialog open={!!editTask} onOpenChange={(o) => { if (!o) setEditTask(null); }} onSuccess={fetchTasks} task={editTask} />
    </>
  );
}
