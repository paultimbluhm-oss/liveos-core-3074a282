import { useState } from 'react';
import { Pencil, Trash2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaskDialog } from './TaskDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  recurrence_type?: string | null;
}

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

export function TaskCard({ task, onToggle, onDelete, onUpdate }: TaskCardProps) {
  const [editing, setEditing] = useState(false);

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !task.completed;
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  const priorityIndicator = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  };

  return (
    <>
      <div className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
        task.completed ? 'bg-secondary/20 opacity-60' : isOverdue ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-secondary/40 hover:bg-secondary/60'
      }`}>
        <div className={`w-1 h-8 rounded-full ${priorityIndicator[task.priority as keyof typeof priorityIndicator] || priorityIndicator.medium}`} />
        <Checkbox checked={task.completed} onCheckedChange={onToggle} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
            {task.recurrence_type && <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />}
          </div>
          {task.due_date && (
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-rose-500' : isDueToday ? 'text-primary' : 'text-muted-foreground'}`}>
              {format(parseISO(task.due_date), 'd. MMM', { locale: de })}
            </p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
        </div>
      </div>
      <TaskDialog open={editing} onOpenChange={setEditing} onSuccess={onUpdate} task={task} />
    </>
  );
}
