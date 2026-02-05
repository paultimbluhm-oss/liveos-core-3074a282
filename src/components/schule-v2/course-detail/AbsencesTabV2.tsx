import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course, V2TimetableSlot, V2Absence, WEEKDAYS } from '../types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, UserX, Stethoscope, Calendar, Building2, AlertCircle, 
  Check, X, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface AbsencesTabV2Props {
  course: V2Course;
  onAbsenceChange?: () => void;
}

const ABSENCE_REASONS = [
  { value: 'krank', label: 'Krank', icon: Stethoscope },
  { value: 'arzttermin', label: 'Arzttermin', icon: Calendar },
  { value: 'schulprojekt', label: 'Schulprojekt', icon: Building2 },
  { value: 'sonstiges', label: 'Sonstiges', icon: AlertCircle },
];

interface AbsenceEntry extends V2Absence {
  slot?: V2TimetableSlot;
}

export function AbsencesTabV2({ course, onAbsenceChange }: AbsencesTabV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();

  const [slots, setSlots] = useState<V2TimetableSlot[]>([]);
  const [absences, setAbsences] = useState<AbsenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state for new absence
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isEva, setIsEva] = useState(false);
  const [isMissed, setIsMissed] = useState(true);
  const [isExcused, setIsExcused] = useState(false);
  const [reason, setReason] = useState('krank');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Stats
  const stats = {
    total: absences.filter(a => !a.is_eva).length,
    excused: absences.filter(a => !a.is_eva && a.status === 'excused').length,
    unexcused: absences.filter(a => !a.is_eva && a.status === 'unexcused').length,
    eva: absences.filter(a => a.is_eva).length,
  };

  useEffect(() => {
    loadData();
  }, [user, course]);

  const loadData = async () => {
    if (!user || !course) return;

    setLoading(true);

    // Load timetable slots for this course
    const { data: slotsData } = await supabase
      .from('v2_timetable_slots')
      .select('*')
      .eq('course_id', course.id);

    const typedSlots = (slotsData || []).map(s => ({
      ...s,
      week_type: s.week_type as 'both' | 'A' | 'B',
    }));
    setSlots(typedSlots);

    // Load absences for this course
    const { data: absencesData } = await supabase
      .from('v2_absences')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .order('date', { ascending: false });

    const enrichedAbsences: AbsenceEntry[] = (absencesData || []).map(a => ({
      ...a,
      status: a.status as 'excused' | 'unexcused',
      slot: typedSlots.find(s => s.id === a.timetable_slot_id),
    }));

    setAbsences(enrichedAbsences);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !selectedSlotId) {
      toast.error('Bitte Stunde auswählen');
      return;
    }

    setSaving(true);

    const absenceData = {
      user_id: user.id,
      course_id: course.id,
      timetable_slot_id: selectedSlotId,
      date: selectedDate,
      status: isExcused ? 'excused' : 'unexcused',
      is_eva: isEva && !isMissed,
      notes: isMissed ? `${ABSENCE_REASONS.find(r => r.value === reason)?.label}${notes ? ': ' + notes : ''}` : (notes || null),
    };

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('v2_absences')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('timetable_slot_id', selectedSlotId)
      .eq('date', selectedDate)
      .maybeSingle();

    if (existing) {
      await supabase.from('v2_absences').update(absenceData).eq('id', existing.id);
    } else {
      await supabase.from('v2_absences').insert(absenceData);
    }

    toast.success('Gespeichert');
    resetForm();
    loadData();
    onAbsenceChange?.();
    setSaving(false);
  };

  const handleDelete = async (absenceId: string) => {
    await supabase.from('v2_absences').delete().eq('id', absenceId);
    toast.success('Gelöscht');
    loadData();
    onAbsenceChange?.();
  };

  const handleToggleExcused = async (absence: AbsenceEntry) => {
    const newStatus = absence.status === 'excused' ? 'unexcused' : 'excused';
    await supabase.from('v2_absences').update({ status: newStatus }).eq('id', absence.id);
    toast.success(newStatus === 'excused' ? 'Entschuldigt' : 'Nicht entschuldigt');
    loadData();
    onAbsenceChange?.();
  };

  const resetForm = () => {
    setAddFormOpen(false);
    setSelectedSlotId('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setIsEva(false);
    setIsMissed(true);
    setIsExcused(false);
    setReason('krank');
    setNotes('');
  };

  const getSlotLabel = (slot: V2TimetableSlot) => {
    return `${WEEKDAYS[slot.day_of_week - 1]} ${slot.period}. Std${slot.is_double_lesson ? ' (Doppel)' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="text-lg font-bold">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">Gefehlt</div>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
          <div className="text-lg font-bold text-emerald-600">{stats.excused}</div>
          <div className="text-[10px] text-muted-foreground">Entsch.</div>
        </div>
        <div className="p-3 rounded-lg bg-rose-500/10 text-center">
          <div className="text-lg font-bold text-rose-600">{stats.unexcused}</div>
          <div className="text-[10px] text-muted-foreground">Offen</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 text-center">
          <div className="text-lg font-bold text-blue-600">{stats.eva}</div>
          <div className="text-[10px] text-muted-foreground">EVA</div>
        </div>
      </div>

      {/* Add New Button */}
      {!addFormOpen ? (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setAddFormOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
          Fehlzeit eintragen
        </Button>
      ) : (
        <div className="p-3 rounded-lg border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Neue Fehlzeit</span>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Slot selection */}
          <div className="space-y-2">
            <Label className="text-xs">Stunde</Label>
            <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Stunde wählen" />
              </SelectTrigger>
              <SelectContent>
                {slots.map(slot => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {getSlotLabel(slot)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-xs">Datum</Label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
            />
          </div>

          {/* EVA Toggle */}
          <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
              <span className="text-sm">EVA (Selbststudium)</span>
            </div>
            <Switch 
              checked={isEva}
              onCheckedChange={(checked) => {
                setIsEva(checked);
                if (checked) setIsMissed(false);
              }}
            />
          </div>

          {/* Missed Toggle */}
          <div className={`p-2 rounded ${isMissed ? 'bg-rose-500/10' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className={`w-4 h-4 ${isMissed ? 'text-rose-600' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                <span className="text-sm">Gefehlt</span>
              </div>
              <Switch 
                checked={isMissed}
                onCheckedChange={(checked) => {
                  setIsMissed(checked);
                  if (checked) setIsEva(false);
                }}
              />
            </div>

            {isMissed && (
              <div className="mt-3 pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1">
                    {isExcused ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-rose-500" />
                    )}
                    {isExcused ? 'Entschuldigt' : 'Nicht entschuldigt'}
                  </span>
                  <Switch checked={isExcused} onCheckedChange={setIsExcused} />
                </div>

                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ABSENCE_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <r.icon className="w-3 h-3" strokeWidth={1.5} />
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notizen..."
                  className="min-h-[40px] text-xs"
                />
              </div>
            )}
          </div>

          <Button 
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={saving || !selectedSlotId}
          >
            Speichern
          </Button>
        </div>
      )}

      {/* Absences List */}
      {absences.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Keine Fehlzeiten eingetragen
        </div>
      ) : (
        <div className="space-y-2">
          {absences.map(absence => (
            <div 
              key={absence.id}
              className={`p-3 rounded-lg border ${
                absence.is_eva 
                  ? 'bg-blue-500/5 border-blue-500/20' 
                  : absence.status === 'excused'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-rose-500/5 border-rose-500/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {absence.is_eva ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                    </div>
                  ) : absence.status === 'excused' ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.5} />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {absence.is_eva ? 'EVA' : absence.status === 'excused' ? 'Entschuldigt' : 'Nicht entschuldigt'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(absence.date), 'd. MMM yyyy', { locale: de })}
                      {absence.slot && ` · ${WEEKDAYS[absence.slot.day_of_week - 1]} ${absence.slot.period}. Std`}
                    </div>
                    {absence.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{absence.notes}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!absence.is_eva && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleExcused(absence)}
                    >
                      {absence.status === 'excused' ? (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(absence.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
