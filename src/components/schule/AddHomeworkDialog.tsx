import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Calendar } from 'lucide-react';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface AddHomeworkDialogProps {
  subjectId: string;
  subjectName: string;
  onHomeworkAdded: () => void;
}

export function AddHomeworkDialog({ subjectId, subjectName, onHomeworkAdded }: AddHomeworkDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [xpReward, setXpReward] = useState('10');
  const [loading, setLoading] = useState(false);

  const quickDates = [
    { label: 'Morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 2 Tagen', value: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: 'In 1 Woche', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !dueDate) return;

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Verbindungsfehler');
      setLoading(false);
      return;
    }
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
      toast.error('Fehler beim Hinzufügen der Hausaufgabe');
    } else {
      toast.success(`Hausaufgabe hinzugefügt (+${xpReward} XP wenn erledigt)`);
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setXpReward('10');
      setOpen(false);
      onHomeworkAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Hausaufgabe
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Hausaufgabe für {subjectName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Aufgaben S. 42"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zur Hausaufgabe..."
              rows={2}
            />
          </div>
          
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fällig am
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  type="button"
                  variant={dueDate === qd.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDueDate(qd.value)}
                >
                  {qd.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={dueDate && !quickDates.find(q => q.value === dueDate) ? 'default' : 'outline'}
                size="sm"
                className="relative"
              >
                Datum wählen
                <Input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </Button>
            </div>
            
            {dueDate && (
              <p className="text-sm text-muted-foreground">
                Gewählt: {format(new Date(dueDate), 'dd.MM.yyyy')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="low">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>XP-Belohnung</Label>
              <Select value={xpReward} onValueChange={setXpReward}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 XP</SelectItem>
                  <SelectItem value="10">10 XP</SelectItem>
                  <SelectItem value="25">25 XP</SelectItem>
                  <SelectItem value="50">50 XP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !dueDate}>
            {loading ? 'Wird hinzugefügt...' : 'Hausaufgabe hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
