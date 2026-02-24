import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { V2Course } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X, FileText, BookOpen, GraduationCap, AlertTriangle, Calendar } from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export interface CourseEvent {
  id: string;
  course_id: string;
  user_id: string;
  event_type: 'vocab_test' | 'exam' | 'abi_exam' | 'absence' | 'other';
  date: string;
  period: number | null;
  topic: string | null;
  weight_percent: number | null;
  notes: string | null;
  absence_status: string | null;
  is_eva: boolean;
  timetable_slot_id: string | null;
  created_at: string;
  updated_at: string;
}

const EVENT_TYPES = [
  { value: 'vocab_test', label: 'Vokabeltest', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-400' },
  { value: 'exam', label: 'Klassenarbeit', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-400' },
  { value: 'abi_exam', label: 'Abi-Klausur', icon: GraduationCap, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-400' },
  { value: 'other', label: 'Sonstiges', icon: Calendar, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-muted-foreground/30' },
] as const;

interface EventsTabV2Props {
  course: V2Course;
  onEventsChange?: () => void;
}

export function EventsTabV2({ course, onEventsChange }: EventsTabV2Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CourseEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CourseEvent | null>(null);

  useEffect(() => { loadEvents(); }, [user, course]);

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('v2_course_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .neq('event_type', 'absence')
      .order('date', { ascending: true });
    setEvents((data || []) as CourseEvent[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('v2_course_events').delete().eq('id', id);
    toast.success('Geloescht');
    loadEvents();
    onEventsChange?.();
  };

  const openEdit = (ev: CourseEvent) => {
    setEditEvent(ev);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditEvent(null);
    setDialogOpen(true);
  };

  const getTypeConfig = (type: string) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[3];

  const today = startOfDay(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const upcoming = events.filter(e => new Date(e.date) >= today);
  const past = events.filter(e => new Date(e.date) < today);

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" className="w-full" onClick={openCreate}>
        <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
        Termin hinzufuegen
      </Button>

      {events.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Keine besonderen Termine
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Bevorstehend</div>
              {upcoming.map(ev => <EventCard key={ev.id} event={ev} config={getTypeConfig(ev.event_type)} onEdit={openEdit} onDelete={handleDelete} onDetail={setDetailEvent} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Vergangen</div>
              {past.map(ev => <EventCard key={ev.id} event={ev} config={getTypeConfig(ev.event_type)} onEdit={openEdit} onDelete={handleDelete} onDetail={setDetailEvent} isPast />)}
            </div>
          )}
        </>
      )}

      <AddEditEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={course}
        editEvent={editEvent}
        onSaved={() => { loadEvents(); onEventsChange?.(); }}
      />

      {/* Detail View */}
      {detailEvent && (
        <Dialog open={!!detailEvent} onOpenChange={() => setDetailEvent(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => { const c = getTypeConfig(detailEvent.event_type); const Icon = c.icon; return <Icon className={`w-4 h-4 ${c.color}`} strokeWidth={1.5} />; })()}
                {getTypeConfig(detailEvent.event_type).label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Datum:</span>{' '}
                {format(new Date(detailEvent.date), 'd. MMMM yyyy', { locale: de })}
              </div>
              {detailEvent.topic && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Thema:</span> {detailEvent.topic}
                </div>
              )}
              {detailEvent.weight_percent != null && detailEvent.weight_percent > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Gewichtung:</span> {detailEvent.weight_percent}%
                </div>
              )}
              {detailEvent.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notizen:</span>
                  <p className="mt-1 whitespace-pre-wrap text-foreground/80">{detailEvent.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailEvent(null); openEdit(detailEvent); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Bearbeiten
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { handleDelete(detailEvent.id); setDetailEvent(null); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EventCard({ event, config, onEdit, onDelete, onDetail, isPast }: {
  event: CourseEvent;
  config: typeof EVENT_TYPES[number];
  onEdit: (e: CourseEvent) => void;
  onDelete: (id: string) => void;
  onDetail: (e: CourseEvent) => void;
  isPast?: boolean;
}) {
  const Icon = config.icon;
  const daysUntil = differenceInDays(new Date(event.date), startOfDay(new Date()));

  return (
    <button
      onClick={() => onDetail(event)}
      className={`w-full text-left p-3 rounded-xl border ${config.bg} ${isPast ? 'opacity-50' : ''} transition-all active:scale-[0.98]`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{event.topic || config.label}</span>
            {event.weight_percent != null && event.weight_percent > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                {event.weight_percent}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(event.date), 'd. MMM yyyy', { locale: de })}
            {!isPast && daysUntil >= 0 && (
              <span className="ml-1.5 font-medium">
                {daysUntil === 0 ? 'Heute' : daysUntil === 1 ? 'Morgen' : `in ${daysUntil} Tagen`}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function AddEditEventDialog({ open, onOpenChange, course, editEvent, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course: V2Course;
  editEvent: CourseEvent | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [eventType, setEventType] = useState<string>(editEvent?.event_type || 'exam');
  const [date, setDate] = useState(editEvent?.date || format(new Date(), 'yyyy-MM-dd'));
  const [topic, setTopic] = useState(editEvent?.topic || '');
  const [weight, setWeight] = useState(editEvent?.weight_percent?.toString() || '');
  const [notes, setNotes] = useState(editEvent?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEventType(editEvent?.event_type || 'exam');
      setDate(editEvent?.date || format(new Date(), 'yyyy-MM-dd'));
      setTopic(editEvent?.topic || '');
      setWeight(editEvent?.weight_percent?.toString() || '');
      setNotes(editEvent?.notes || '');
    }
  }, [open, editEvent]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      course_id: course.id,
      user_id: user.id,
      event_type: eventType,
      date,
      topic: topic.trim() || null,
      weight_percent: weight ? parseInt(weight) : 0,
      notes: notes.trim() || null,
    };

    if (editEvent) {
      await supabase.from('v2_course_events').update(payload).eq('id', editEvent.id);
    } else {
      await supabase.from('v2_course_events').insert(payload);
    }

    toast.success(editEvent ? 'Aktualisiert' : 'Erstellt');
    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Art</Label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.filter(t => t.value !== 'other').map(t => {
                const Icon = t.icon;
                const selected = eventType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEventType(t.value)}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                      selected ? `${t.border} ${t.bg}` : 'border-transparent bg-muted/30'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${selected ? t.color : 'text-muted-foreground'}`} strokeWidth={1.5} />
                    <div className="text-xs font-medium">{t.label}</div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setEventType('other')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  eventType === 'other' ? 'border-muted-foreground/30 bg-muted/50' : 'border-transparent bg-muted/30'
                }`}
              >
                <Calendar className={`w-4 h-4 mb-1 ${eventType === 'other' ? 'text-foreground' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                <div className="text-xs font-medium">Sonstiges</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Datum</Label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Thema</Label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="z.B. Unit 3 Vokabeln" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Gewichtung fuer Halbjahresnote (%)</Label>
            <Input type="number" min="0" max="100" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Notizen</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Zusaetzliche Infos..." className="min-h-[60px]" />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {editEvent ? 'Speichern' : 'Erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
