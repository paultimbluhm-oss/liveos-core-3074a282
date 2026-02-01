import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { V2Course, V2Homework } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';

interface HomeworkTabV2Props {
  course: V2Course;
  onHomeworkChange?: () => void;
}

export function HomeworkTabV2({ course, onHomeworkChange }: HomeworkTabV2Props) {
  const { user } = useAuth();
  const [homework, setHomework] = useState<V2Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const loadHomework = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('v2_homework')
      .select('*')
      .eq('course_id', course.id)
      .order('due_date', { ascending: true });

    setHomework((data || []) as V2Homework[]);
    setLoading(false);
  };

  useEffect(() => {
    loadHomework();
  }, [course.id, user]);

  const toggleComplete = async (hw: V2Homework) => {
    await supabase
      .from('v2_homework')
      .update({ completed: !hw.completed })
      .eq('id', hw.id);

    setHomework(prev => 
      prev.map(h => h.id === hw.id ? { ...h, completed: !h.completed } : h)
    );
    onHomeworkChange?.();
  };

  const deleteHomework = async (id: string) => {
    await supabase.from('v2_homework').delete().eq('id', id);
    setHomework(prev => prev.filter(h => h.id !== id));
    onHomeworkChange?.();
  };

  const handleAdded = (newHw: V2Homework) => {
    setHomework(prev => [...prev, newHw].sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    ));
    setAddDialogOpen(false);
    onHomeworkChange?.();
  };

  const pendingHomework = homework.filter(h => !h.completed);
  const completedHomework = homework.filter(h => h.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => setAddDialogOpen(true)}
      >
        <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
        Hausaufgabe hinzufugen
      </Button>

      {pendingHomework.length === 0 && completedHomework.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Noch keine Hausaufgaben eingetragen
        </div>
      ) : (
        <>
          {pendingHomework.length > 0 && (
            <div className="space-y-2">
              {pendingHomework.map(hw => {
                const dueDate = new Date(hw.due_date);
                const isOverdue = isPast(dueDate) && !isToday(dueDate);
                const isDueToday = isToday(dueDate);

                return (
                  <div 
                    key={hw.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      isOverdue ? 'bg-rose-500/10' : isDueToday ? 'bg-amber-500/10' : 'bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={hw.completed}
                      onCheckedChange={() => toggleComplete(hw)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{hw.title}</div>
                      {hw.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {hw.description}
                        </p>
                      )}
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        isOverdue ? 'text-rose-500' : isDueToday ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        {format(dueDate, 'd. MMMM', { locale: de })}
                        {isOverdue && ' (uberfallig)'}
                        {isDueToday && ' (heute)'}
                      </div>
                    </div>
                    {hw.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteHomework(hw.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {completedHomework.length > 0 && (
            <div className="space-y-2 opacity-50">
              <div className="text-xs text-muted-foreground">Erledigt</div>
              {completedHomework.map(hw => (
                <div 
                  key={hw.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Checkbox
                    checked={hw.completed}
                    onCheckedChange={() => toggleComplete(hw)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-through">{hw.title}</div>
                  </div>
                  {hw.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteHomework(hw.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AddHomeworkDialogV2
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        course={course}
        onAdded={handleAdded}
      />
    </div>
  );
}

interface AddHomeworkDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  onAdded: (homework: V2Homework) => void;
}

function AddHomeworkDialogV2({ open, onOpenChange, course, onAdded }: AddHomeworkDialogV2Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!user || !title.trim() || !dueDate) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('v2_homework')
      .insert({
        course_id: course.id,
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
      })
      .select()
      .single();

    if (!error && data) {
      onAdded(data as V2Homework);
      setTitle('');
      setDescription('');
      setDueDate('');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hausaufgabe hinzufugen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Seite 42, Aufgabe 1-3"
            />
          </div>

          <div className="space-y-2">
            <Label>Beschreibung (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weitere Details..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Fallig am</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <Button 
            onClick={handleAdd} 
            disabled={loading || !title.trim() || !dueDate} 
            className="w-full"
          >
            Hinzufugen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
