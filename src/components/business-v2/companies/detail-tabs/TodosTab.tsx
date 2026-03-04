import { useState } from 'react';
import { Plus, Check, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company } from '../../types';

interface TodosTabProps {
  company: Company;
}

export function TodosTab({ company }: TodosTabProps) {
  const { getCompanyTodos, addTodo, updateTodo, deleteTodo } = useBusinessV2();
  const todos = getCompanyTodos(company.id);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addTodo(company.id, newTitle.trim(), newDueDate || undefined);
    setNewTitle('');
    setNewDueDate('');
  };

  const openTodos = todos.filter(t => !t.completed);
  const doneTodos = todos.filter(t => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Naechste Schritte</span>
        <span className="text-[10px] text-muted-foreground">{openTodos.length} offen</span>
      </div>

      {/* Add form */}
      <div className="flex gap-2">
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Neuer Schritt..." className="h-8 text-xs flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="h-8 text-xs w-32" />
        <Button size="icon" className="h-8 w-8 shrink-0" disabled={!newTitle.trim()} onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Open todos */}
      <div className="space-y-1.5">
        {openTodos.map(todo => {
          const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date));
          return (
            <div key={todo.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 group">
              <Checkbox checked={false} onCheckedChange={() => updateTodo(todo.id, { completed: true })} className="h-4 w-4" />
              <span className="text-sm flex-1 min-w-0 truncate">{todo.title}</span>
              {todo.due_date && (
                <span className={cn('text-[10px] shrink-0 flex items-center gap-0.5', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                  <Calendar className="w-3 h-3" />
                  {format(new Date(todo.due_date), 'dd.MM.', { locale: de })}
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteTodo(todo.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Done todos */}
      {doneTodos.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Erledigt</span>
          {doneTodos.map(todo => (
            <div key={todo.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/20 group">
              <Checkbox checked={true} onCheckedChange={() => updateTodo(todo.id, { completed: false })} className="h-4 w-4" />
              <span className="text-sm flex-1 min-w-0 truncate line-through text-muted-foreground">{todo.title}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteTodo(todo.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {todos.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">Keine To-Dos</p>
      )}
    </div>
  );
}
