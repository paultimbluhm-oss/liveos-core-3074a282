import { useState, useEffect } from 'react';
import { ChevronRight, Clock, BookOpen, ListTodo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { WidgetSize } from '@/hooks/useDashboardV2';

interface ActionItem {
  id: string;
  title: string;
  type: 'task' | 'homework';
  dueDate: string;
  overdue: boolean;
}

export function NextActionsWidget({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    const [tasksRes, hwRes] = await Promise.all([
      supabase.from('tasks').select('id, title, due_date').eq('user_id', user.id).eq('completed', false).not('due_date', 'is', null).order('due_date').limit(5),
      supabase.from('homework').select('id, title, due_date').eq('user_id', user.id).eq('completed', false).order('due_date').limit(5),
    ]);

    const actions: ActionItem[] = [];
    (tasksRes.data || []).forEach(t => {
      actions.push({ id: t.id, title: t.title, type: 'task', dueDate: t.due_date!, overdue: isPast(parseISO(t.due_date!)) && !isToday(parseISO(t.due_date!)) });
    });
    (hwRes.data || []).forEach(h => {
      actions.push({ id: h.id, title: h.title, type: 'homework', dueDate: h.due_date, overdue: isPast(parseISO(h.due_date)) && !isToday(parseISO(h.due_date)) });
    });

    actions.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setItems(actions.slice(0, 6));
  };

  const formatDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'dd.MM', { locale: de });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Keine offenen Aufgaben</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-warning" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold">Naechste Aktionen</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map(item => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(item.type === 'homework' ? '/schule-v2' : '/privat?section=aufgaben')}
          >
            {item.type === 'homework' ? (
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            ) : (
              <ListTodo className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            )}
            <span className="flex-1 text-sm truncate">{item.title}</span>
            <span className={`text-[10px] font-mono shrink-0 ${item.overdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
              {formatDate(item.dueDate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
