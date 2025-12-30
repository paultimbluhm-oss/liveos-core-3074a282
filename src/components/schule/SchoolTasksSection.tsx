import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, GraduationCap, Plus, Trash2, Edit, ClipboardList, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SchoolTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  person_name: string | null;
  completed: boolean;
  created_at: string;
}

interface SchoolTasksSectionProps {
  onBack: () => void;
}

export function SchoolTasksSection({ onBack }: SchoolTasksSectionProps) {
  const { user } = useAuth();
  const [taskType, setTaskType] = useState<'classmate' | 'teacher'>('classmate');
  const [tasks, setTasks] = useState<SchoolTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SchoolTask | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [personName, setPersonName] = useState('');

  const isClassmate = taskType === 'classmate';
  const personLabel = isClassmate ? 'Mitschüler' : 'Lehrer';

  useEffect(() => {
    if (user) fetchTasks();
  }, [user, taskType]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('school_tasks').select('*')
      .eq('user_id', user!.id).eq('task_type', taskType)
      .order('completed', { ascending: true }).order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    const taskData = { title, description: description || null, person_name: personName || null, task_type: taskType };

    if (editingTask) {
      const { error } = await supabase.from('school_tasks').update(taskData).eq('id', editingTask.id);
      if (!error) { toast.success('Aktualisiert'); fetchTasks(); }
    } else {
      const { error } = await supabase.from('school_tasks').insert({ ...taskData, user_id: user!.id });
      if (!error) { toast.success('Erstellt'); fetchTasks(); }
    }
    resetForm();
  };

  const toggleComplete = async (task: SchoolTask) => {
    const { error } = await supabase.from('school_tasks').update({ completed: !task.completed }).eq('id', task.id);
    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
      toast.success(task.completed ? 'Wiederhergestellt' : 'Erledigt');
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('school_tasks').delete().eq('id', id);
    if (!error) { toast.success('Gelöscht'); fetchTasks(); }
  };

  const resetForm = () => { setTitle(''); setDescription(''); setPersonName(''); setEditingTask(null); setDialogOpen(false); };

  const openEdit = (task: SchoolTask) => {
    setEditingTask(task); setTitle(task.title); setDescription(task.description || ''); setPersonName(task.person_name || '');
    setDialogOpen(true);
  };

  const openTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shrink-0">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold truncate">Aufgaben</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden sm:flex gap-1 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Neu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Bearbeiten' : 'Neue Aufgabe'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Titel</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Was ist zu tun?" /></div>
              <div><Label>Beschreibung</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={2} /></div>
              <div><Label>{personLabel}</Label><Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={`Name`} /></div>
              <Button onClick={saveTask} className="w-full">{editingTask ? 'Speichern' : 'Erstellen'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type Toggle - Mobile Dropdown */}
      <div className="sm:hidden">
        <Select value={taskType} onValueChange={(v: 'classmate' | 'teacher') => setTaskType(v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classmate"><div className="flex items-center gap-2"><Users className="w-4 h-4" />Mitschüler</div></SelectItem>
            <SelectItem value="teacher"><div className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Lehrer</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type Toggle - Desktop */}
      <div className="hidden sm:flex gap-1 p-1 bg-muted rounded-lg">
        <Button variant={taskType === 'classmate' ? 'default' : 'ghost'} size="sm" className="flex-1 gap-2 h-8" onClick={() => setTaskType('classmate')}>
          <Users className="w-4 h-4" />Mitschüler
        </Button>
        <Button variant={taskType === 'teacher' ? 'default' : 'ghost'} size="sm" className="flex-1 gap-2 h-8" onClick={() => setTaskType('teacher')}>
          <GraduationCap className="w-4 h-4" />Lehrer
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{openTasks.length} offen</span>
        <span className="text-emerald-500">{completedTasks.length} erledigt</span>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {isClassmate ? <Users className="w-10 h-10 mx-auto mb-3 opacity-50" /> : <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />}
          <p className="text-sm">Keine Aufgaben</p>
        </div>
      ) : (
        <div className="space-y-2">
          {openTasks.map((task) => (
            <TaskCard key={task.id} task={task} personLabel={personLabel} onToggle={() => toggleComplete(task)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
          ))}
          
          {completedTasks.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-3 pb-1">Erledigt</p>
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} personLabel={personLabel} onToggle={() => toggleComplete(task)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      <Button className="fixed bottom-20 right-4 sm:hidden h-12 w-12 rounded-full shadow-lg z-40" onClick={() => setDialogOpen(true)}>
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}

function TaskCard({ task, personLabel, onToggle, onEdit, onDelete }: { 
  task: SchoolTask; personLabel: string; onToggle: () => void; onEdit: () => void; onDelete: () => void; 
}) {
  return (
    <div className={cn(
      "relative flex items-center gap-3 p-3 rounded-lg border transition-all group",
      task.completed ? "bg-muted/30 border-border/30 opacity-60" : "bg-card/80 border-border/50"
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", task.completed ? "bg-emerald-500" : "bg-orange-500")} />
      
      <button
        className={cn(
          "ml-2 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          task.completed ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-orange-500"
        )}
        onClick={onToggle}
      >
        {task.completed && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", task.completed && "line-through")}>{task.title}</p>
        {task.person_name && <p className="text-xs text-muted-foreground">{personLabel}: {task.person_name}</p>}
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}
