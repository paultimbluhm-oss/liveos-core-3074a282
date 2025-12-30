import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Repeat, ChevronDown, FileText } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  xp_reward: number;
  recurrence_type?: string | null;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  task?: Task | null;
}

export function TaskDialog({ open, onOpenChange, onSuccess, task }: TaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState('medium');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const isEditMode = !!task;

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority);
        setRecurrence(task.recurrence_type || 'none');
        setShowMore(!!task.recurrence_type);
        setShowDescription(!!task.description);
        
        if (task.due_date) {
          setSelectedDate(startOfDay(new Date(task.due_date)));
        } else {
          setSelectedDate(undefined);
        }
      } else {
        setTitle('');
        setDescription('');
        setSelectedDate(undefined);
        setPriority('medium');
        setRecurrence('none');
        setShowMore(false);
        setShowDescription(false);
      }
    }
  }, [open, task]);

  const today = startOfDay(new Date());
  const quickDates = [
    { label: 'Heute', date: today },
    { label: 'Morgen', date: addDays(today, 1) },
    { label: '+3 Tage', date: addDays(today, 3) },
    { label: '+1 Woche', date: addDays(today, 7) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setLoading(true);
    const supabase = getSupabase();

    let dueDate: string | null = null;
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      dueDate = new Date(year, month, day, 23, 59, 0).toISOString();
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate,
      priority,
      recurrence_type: recurrence === 'none' ? null : recurrence,
      xp_reward: priority === 'high' ? 25 : priority === 'medium' ? 15 : 10,
    };

    if (isEditMode && task) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', task.id);

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Aufgabe aktualisiert' });
        onOpenChange(false);
        onSuccess();
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        ...taskData,
        completed: false,
      });

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Aufgabe erstellt' });
        onOpenChange(false);
        onSuccess();
      }
    }
    setLoading(false);
  };

  const isQuickDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">{isEditMode ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input - Large and prominent */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was muss erledigt werden?"
            className="text-base h-12"
            autoFocus
            required
          />

          {/* Quick Date Selection - Very prominent */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fällig am</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  type="button"
                  variant={isQuickDateSelected(qd.date) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate(qd.date)}
                  className="text-xs h-9"
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start text-xs h-9",
                      selectedDate && !quickDates.some(q => isQuickDateSelected(q.date)) && "border-primary"
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                    {selectedDate && !quickDates.some(q => isQuickDateSelected(q.date)) 
                      ? format(selectedDate, 'd. MMM', { locale: de })
                      : 'Anderes Datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(startOfDay(date));
                      setCalendarOpen(false);
                    }}
                    locale={de}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              {selectedDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="text-xs h-9 px-2 text-muted-foreground"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* Priority - Compact segmented control */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/50 rounded-lg">
              {[
                { value: 'low', label: 'Niedrig' },
                { value: 'medium', label: 'Mittel' },
                { value: 'high', label: 'Hoch' },
              ].map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={priority === p.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "text-xs h-8",
                    priority === p.value && p.value === 'high' && "bg-rose-500 hover:bg-rose-600",
                    priority === p.value && p.value === 'low' && "bg-emerald-500 hover:bg-emerald-600"
                  )}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Description Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDescription(!showDescription)}
            className="w-full justify-between text-xs text-muted-foreground h-8"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Beschreibung
              {description && <span className="text-primary">•</span>}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDescription && "rotate-180")} />
          </Button>

          {showDescription && (
            <div className="animate-in slide-in-from-top-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zusätzliche Details..."
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
          )}

          {/* Recurrence Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMore(!showMore)}
            className="w-full justify-between text-xs text-muted-foreground h-8"
          >
            <span className="flex items-center gap-2">
              <Repeat className="w-3.5 h-3.5" />
              Wiederholung
              {recurrence !== 'none' && <span className="text-primary">•</span>}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMore && "rotate-180")} />
          </Button>

          {showMore && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-5 gap-1 p-1 bg-secondary/50 rounded-lg">
                {[
                  { value: 'none', label: 'Nie' },
                  { value: 'daily', label: 'Tag' },
                  { value: 'weekly', label: 'Woche' },
                  { value: 'monthly', label: 'Monat' },
                  { value: 'yearly', label: 'Jahr' },
                ].map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    variant={recurrence === r.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRecurrence(r.value)}
                    className="text-[10px] h-7 px-1"
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading || !title.trim()} 
            className="w-full h-11"
          >
            {loading ? 'Speichern...' : (isEditMode ? 'Speichern' : 'Erstellen')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}