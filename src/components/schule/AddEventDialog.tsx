import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AddEventDialogProps {
  subjectId: string;
  subjectName: string;
  onEventAdded: () => void;
}

export function AddEventDialog({ subjectId, subjectName, onEventAdded }: AddEventDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('exam');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !eventDate) return;

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Verbindungsfehler');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('school_events').insert({
      user_id: user.id,
      subject_id: subjectId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      event_type: eventType,
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen des Termins');
    } else {
      toast.success('Termin hinzugefügt');
      setTitle('');
      setDescription('');
      setEventDate('');
      setEventType('exam');
      setOpen(false);
      onEventAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Calendar className="h-3 w-3" />
          Termin
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Termin für {subjectName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Klausur Analysis"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Art des Termins</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Klausur</SelectItem>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="presentation">Präsentation</SelectItem>
                <SelectItem value="other">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventDate">Datum</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zum Termin..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Wird hinzugefügt...' : 'Termin hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
