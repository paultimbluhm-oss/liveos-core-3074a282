import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarEvent } from './types';
import { format } from 'date-fns';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Partial<CalendarEvent>) => Promise<void>;
  calendars: Calendar[];
  initialDate?: Date;
  initialHour?: number;
  editEvent?: CalendarEvent | null;
}

export function AddEventDialog({
  open,
  onOpenChange,
  onSave,
  calendars,
  initialDate,
  initialHour,
  editEvent,
}: AddEventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDescription(editEvent.description || '');
        setStartDate(format(new Date(editEvent.start_time), 'yyyy-MM-dd'));
        setStartTime(format(new Date(editEvent.start_time), 'HH:mm'));
        setEndDate(format(new Date(editEvent.end_time), 'yyyy-MM-dd'));
        setEndTime(format(new Date(editEvent.end_time), 'HH:mm'));
        setLocation(editEvent.location || '');
        setAllDay(editEvent.all_day);
        setCalendarId(editEvent.calendar_id || '');
      } else {
        const date = initialDate || new Date();
        const hour = initialHour ?? 9;
        setTitle('');
        setDescription('');
        setStartDate(format(date, 'yyyy-MM-dd'));
        setStartTime(`${hour.toString().padStart(2, '0')}:00`);
        setEndDate(format(date, 'yyyy-MM-dd'));
        setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
        setLocation('');
        setAllDay(false);
        setCalendarId(calendars.find(c => c.is_default)?.id || calendars[0]?.id || '');
      }
    }
  }, [open, editEvent, initialDate, initialHour, calendars]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const startDateTime = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : new Date(`${endDate}T${endTime}:00`).toISOString();

      await onSave({
        id: editEvent?.id,
        title: title.trim(),
        description: description.trim() || null,
        start_time: startDateTime,
        end_time: endDateTime,
        location: location.trim() || null,
        all_day: allDay,
        calendar_id: calendarId || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedCalendar = calendars.find(c => c.id === calendarId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Event bearbeiten' : 'Neues Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event-Titel"
              required
              autoFocus
            />
          </div>

          {calendars.length > 0 && (
            <div className="space-y-2">
              <Label>Kalender</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kalender wählen">
                    {selectedCalendar && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedCalendar.color }}
                        />
                        {selectedCalendar.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cal.color }}
                        />
                        {cal.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label htmlFor="allDay">Ganztägig</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              {!allDay && (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Ende</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              {!allDay && (
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ort</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Speichern...' : editEvent ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
