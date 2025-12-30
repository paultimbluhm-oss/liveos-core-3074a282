import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, BookOpen, Calendar, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGamification } from '@/contexts/GamificationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  completed: boolean;
  xp_reward: number;
  subject_id: string;
  subjects?: {
    id: string;
    name: string;
    short_name: string | null;
  } | null;
}

interface Subject {
  id: string;
  name: string;
  short_name: string | null;
}

interface HomeworkSectionProps {
  onBack: () => void;
}

export function HomeworkSection({ onBack }: HomeworkSectionProps) {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [subjectId, setSubjectId] = useState('');
  const [xpReward, setXpReward] = useState('10');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const [homeworkRes, subjectsRes] = await Promise.all([
      supabase
        .from('homework')
        .select('*, subjects(id, name, short_name)')
        .eq('user_id', user.id)
        .order('due_date'),
      supabase
        .from('subjects')
        .select('id, name, short_name')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    setHomework(homeworkRes.data || []);
    setSubjects(subjectsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleComplete = async (hw: Homework) => {
    const newCompleted = !hw.completed;
    const { error } = await supabase
      .from('homework')
      .update({ completed: newCompleted })
      .eq('id', hw.id);

    if (error) {
      toast.error('Fehler beim Aktualisieren');
    } else {
      if (newCompleted && hw.xp_reward > 0) {
        addXP(hw.xp_reward);
        toast.success(`Erledigt! +${hw.xp_reward} XP`);
      } else {
        toast.success(newCompleted ? 'Erledigt' : 'Als offen markiert');
      }
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Gelöscht');
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !dueDate || !subjectId) return;

    setFormLoading(true);
    const { error } = await supabase.from('homework').insert({
      user_id: user.id,
      subject_id: subjectId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate,
      priority,
      xp_reward: parseInt(xpReward) || 10,
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success('Hausaufgabe hinzugefügt');
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setSubjectId('');
      setXpReward('10');
      setDialogOpen(false);
      fetchData();
    }
    setFormLoading(false);
  };

  const quickDates = [
    { label: 'Morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 2 Tagen', value: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: '1 Woche', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  const getDueDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    if (isPast(date)) return 'Überfällig';
    return format(date, 'EEE, d. MMM', { locale: de });
  };

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-rose-500';
    if (p === 'low') return 'text-muted-foreground';
    return 'text-amber-500';
  };

  const getDueColor = (dateStr: string, completed: boolean) => {
    if (completed) return 'text-muted-foreground';
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-rose-500';
    if (isToday(date)) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const pendingHomework = homework.filter(h => !h.completed);
  const completedHomework = homework.filter(h => h.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border-2 border-green-500 bg-transparent">
              <BookOpen className="w-4 h-4 text-green-500" />
            </div>
            <h2 className="text-lg font-bold">Hausaufgaben</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-2.5">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Hausaufgabe hinzufügen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Fach</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Fach wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.short_name || s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Titel</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Aufgaben S. 42"
                  className="h-9"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fällig am
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {quickDates.map((qd) => (
                    <Button
                      key={qd.label}
                      type="button"
                      variant={dueDate === qd.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDueDate(qd.value)}
                    >
                      {qd.label}
                    </Button>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={dueDate && !quickDates.find(q => q.value === dueDate) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <CalendarIcon className="w-3 h-3" />
                        {dueDate && !quickDates.find(q => q.value === dueDate)
                          ? format(new Date(dueDate), 'd. MMM', { locale: de })
                          : 'Datum'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dueDate ? new Date(dueDate) : undefined}
                        onSelect={(date) => date && setDueDate(format(date, 'yyyy-MM-dd'))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Priorität</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="low">Niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">XP</Label>
                  <Select value={xpReward} onValueChange={setXpReward}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 XP</SelectItem>
                      <SelectItem value="10">10 XP</SelectItem>
                      <SelectItem value="25">25 XP</SelectItem>
                      <SelectItem value="50">50 XP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={formLoading || !dueDate || !subjectId}>
                {formLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <div className="text-2xl font-bold">{pendingHomework.length}</div>
          <div className="text-xs text-muted-foreground">Offen</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <div className="text-2xl font-bold">{completedHomework.length}</div>
          <div className="text-xs text-muted-foreground">Erledigt</div>
        </div>
      </div>

      {/* Pending Homework */}
      <div className="space-y-1.5">
        {pendingHomework.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine offenen Hausaufgaben</p>
          </div>
        ) : (
          pendingHomework.map((hw) => (
            <div 
              key={hw.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
            >
              <Checkbox
                checked={hw.completed}
                onCheckedChange={() => handleComplete(hw)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{hw.title}</span>
                  <span className={`text-[10px] ${getPriorityColor(hw.priority)}`}>
                    {hw.priority === 'high' ? 'Wichtig' : hw.priority === 'low' ? 'Niedrig' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{hw.subjects?.short_name || hw.subjects?.name}</span>
                  <span className={getDueColor(hw.due_date, hw.completed)}>
                    {getDueDateLabel(hw.due_date)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{hw.xp_reward} XP</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(hw.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Completed Toggle */}
      {completedHomework.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Erledigte ausblenden' : `${completedHomework.length} erledigte anzeigen`}
          </Button>
          {showCompleted && (
            <div className="space-y-1.5 mt-2">
              {completedHomework.map((hw) => (
                <div 
                  key={hw.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                >
                  <Checkbox
                    checked={hw.completed}
                    onCheckedChange={() => handleComplete(hw)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate text-muted-foreground line-through">
                      {hw.title}
                    </span>
                    <div className="text-[10px] text-muted-foreground">
                      {hw.subjects?.short_name || hw.subjects?.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(hw.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
