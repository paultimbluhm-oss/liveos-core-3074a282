import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertTriangle, ChevronDown, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/contexts/GamificationContext';
import { TaskCard } from './TaskCard';
import { HomeworkCard } from './HomeworkCard';
import { TaskDialog } from './TaskDialog';
import { format, isToday, isTomorrow, isPast, isThisWeek, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  xp_reward: number;
  created_at: string;
  recurrence_type?: string | null;
  type: 'task';
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  completed: boolean;
  subject_id: string;
  subject_name?: string;
  priority?: string;
  xp_reward?: number;
  type: 'homework';
}

interface Subject {
  id: string;
  name: string;
}

type TaskItem = Task | Homework;

interface TaskSectionProps {
  onBack: () => void;
}

export function TaskSection({ onBack }: TaskSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addXP, celebrateTaskComplete } = useGamification();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const [tasksRes, homeworkRes, subjectsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('homework')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id),
    ]);

    if (tasksRes.error) {
      toast({ title: 'Fehler', description: tasksRes.error.message, variant: 'destructive' });
    } else {
      setTasks((tasksRes.data || []).map(t => ({ ...t, type: 'task' as const })));
    }

    if (subjectsRes.data) {
      setSubjects(subjectsRes.data);
    }

    if (homeworkRes.data && subjectsRes.data) {
      const homeworkWithSubjects = homeworkRes.data.map(hw => ({
        ...hw,
        type: 'homework' as const,
        subject_name: subjectsRes.data.find(s => s.id === hw.subject_id)?.name || 'Unbekannt',
      }));
      setHomework(homeworkWithSubjects);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const toggleTaskComplete = async (task: Task) => {
    const supabase = getSupabase();
    const newCompleted = !task.completed;
    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompleted })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
      if (newCompleted && task.xp_reward) {
        celebrateTaskComplete();
        await addXP(task.xp_reward, task.title);
      }
    }
  };

  const toggleHomeworkComplete = async (hw: Homework) => {
    const supabase = getSupabase();
    const newCompleted = !hw.completed;
    const { error } = await supabase
      .from('homework')
      .update({ completed: newCompleted })
      .eq('id', hw.id);

    if (!error) {
      setHomework(homework.map(h => h.id === hw.id ? { ...h, completed: newCompleted } : h));
      if (newCompleted) {
        const xpAmount = hw.xp_reward || 10;
        celebrateTaskComplete();
        await addXP(xpAmount, hw.title);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast({ title: 'Aufgabe gelöscht' });
    }
  };

  const deleteHomework = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (!error) {
      setHomework(homework.filter(h => h.id !== id));
      toast({ title: 'Hausaufgabe gelöscht' });
    }
  };

  const allItems: TaskItem[] = [...tasks, ...homework];
  
  const filterItems = (items: TaskItem[]) => {
    let filtered = items;
    
    if (!showCompleted) {
      filtered = filtered.filter(item => !item.completed);
    }

    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(item => {
          if (!item.due_date) return false;
          const date = parseISO(item.due_date);
          // Heute ODER überfällig (alle überfälligen Aufgaben anzeigen)
          if (isToday(date)) return true;
          if (isPast(date) && !item.completed) return true;
          return false;
        });
        break;
      case 'week':
        filtered = filtered.filter(item => 
          item.due_date && isThisWeek(parseISO(item.due_date), { locale: de })
        );
        break;
      case 'overdue':
        filtered = filtered.filter(item => 
          item.due_date && isPast(parseISO(item.due_date)) && !item.completed
        );
        break;
      case 'homework':
        filtered = filtered.filter(item => item.type === 'homework');
        break;
    }

    return filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  };

  const filteredItems = filterItems(allItems);
  
  const overdueCount = allItems.filter(item => 
    item.due_date && isPast(parseISO(item.due_date)) && !item.completed
  ).length;

  const todayCount = allItems.filter(item => 
    item.due_date && isToday(parseISO(item.due_date)) && !item.completed
  ).length;

  const groupByDate = (items: TaskItem[]) => {
    const groups: { [key: string]: TaskItem[] } = {};
    
    items.forEach(item => {
      let key = 'Ohne Datum';
      if (item.due_date) {
        const date = parseISO(item.due_date);
        if (isToday(date)) {
          key = 'Heute';
        } else if (isTomorrow(date)) {
          key = 'Morgen';
        } else if (isPast(date)) {
          key = 'Überfällig';
        } else {
          key = format(date, 'EEEE, d. MMM', { locale: de });
        }
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const order = ['Überfällig', 'Heute', 'Morgen'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      if (a === 'Ohne Datum') return 1;
      if (b === 'Ohne Datum') return -1;
      return 0;
    });

    return sortedKeys.map(key => ({ key, items: groups[key] }));
  };

  const groupedItems = groupByDate(filteredItems);

  const filterOptions = [
    { value: 'today', label: 'Heute', count: todayCount },
    { value: 'week', label: 'Diese Woche' },
    { value: 'overdue', label: 'Überfällig', count: overdueCount, danger: overdueCount > 0 },
    { value: 'all', label: 'Alle' },
    { value: 'homework', label: 'Hausaufgaben' },
  ];

  const currentFilter = filterOptions.find(f => f.value === activeTab);

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">Aufgaben</h2>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="hidden md:flex">
          <Plus className="w-4 h-4 mr-1" />
          Neu
        </Button>
      </div>

      {/* Quick Stats - Minimal */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{todayCount}</p>
          <p className="text-[10px] text-muted-foreground">Heute</p>
        </div>
        <div className={`p-3 rounded-xl text-center ${overdueCount > 0 ? 'bg-rose-500/10' : 'bg-secondary/40'}`}>
          <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-rose-500' : ''}`}>{overdueCount}</p>
          <p className="text-[10px] text-muted-foreground">Überfällig</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{allItems.filter(i => i.completed).length}</p>
          <p className="text-[10px] text-muted-foreground">Erledigt</p>
        </div>
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between h-9">
              <span className="text-sm">{currentFilter?.label}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 bg-popover border border-border shadow-lg z-50">
            {filterOptions.map(opt => (
              <DropdownMenuItem 
                key={opt.value} 
                onClick={() => setActiveTab(opt.value)}
                className={opt.danger ? 'text-rose-500' : ''}
              >
                {opt.label}
                {opt.count !== undefined && opt.count > 0 && (
                  <span className="ml-auto text-xs opacity-60">({opt.count})</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant={showCompleted ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
          className="h-9 px-3"
        >
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Laden...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Aufgaben</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map(group => (
            <div key={group.key}>
              <h3 className={`text-xs font-medium mb-2 ${
                group.key === 'Überfällig' ? 'text-rose-500' : 
                group.key === 'Heute' ? 'text-primary' : 
                'text-muted-foreground'
              }`}>
                {group.key}
              </h3>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  item.type === 'task' ? (
                    <TaskCard
                      key={item.id}
                      task={item}
                      onToggle={() => toggleTaskComplete(item)}
                      onDelete={() => deleteTask(item.id)}
                      onUpdate={fetchData}
                    />
                  ) : (
                    <HomeworkCard
                      key={item.id}
                      homework={item}
                      onToggle={() => toggleHomeworkComplete(item)}
                      onDelete={() => deleteHomework(item.id)}
                      onUpdate={fetchData}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button - Mobile */}
      <Button 
        className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40" 
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <TaskDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchData}
      />
    </div>
  );
}