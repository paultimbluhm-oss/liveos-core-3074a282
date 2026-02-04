import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { V2Course, V2TimetableSlot, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, UserX, Stethoscope, Calendar, Building2, AlertCircle, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface V2Absence {
  id: string;
  user_id: string;
  course_id: string;
  timetable_slot_id: string | null;
  date: string;
  status: 'unexcused' | 'excused';
  is_eva: boolean;
  notes: string | null;
}

interface SlotActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: V2TimetableSlot | null;
  course: V2Course | null;
  slotDate: Date | null;
  onOpenCourseDetail: () => void;
  onAbsenceChange?: () => void;
}

const ABSENCE_REASONS = [
  { value: 'krank', label: 'Krank', icon: Stethoscope },
  { value: 'arzttermin', label: 'Arzttermin', icon: Calendar },
  { value: 'schulprojekt', label: 'Schulprojekt', icon: Building2 },
  { value: 'sonstiges', label: 'Sonstiges', icon: AlertCircle },
];

export function SlotActionSheet({ 
  open, 
  onOpenChange, 
  slot, 
  course, 
  slotDate,
  onOpenCourseDetail,
  onAbsenceChange 
}: SlotActionSheetProps) {
  const { user } = useAuth();
  const [absence, setAbsence] = useState<V2Absence | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [isEva, setIsEva] = useState(false);
  const [isMissed, setIsMissed] = useState(false);
  const [isExcused, setIsExcused] = useState(false);
  const [reason, setReason] = useState('krank');
  const [notes, setNotes] = useState('');

  // Load existing absence for this slot
  useEffect(() => {
    const loadAbsence = async () => {
      if (!user || !slot || !slotDate) {
        setAbsence(null);
        resetForm();
        return;
      }

      setLoading(true);
      const dateStr = format(slotDate, 'yyyy-MM-dd');

      const { data } = await supabase
        .from('v2_absences')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', slot.course_id)
        .eq('timetable_slot_id', slot.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (data) {
        setAbsence(data as V2Absence);
        setIsEva(data.is_eva);
        setIsMissed(!data.is_eva);
        setIsExcused(data.status === 'excused');
        setNotes(data.notes || '');
        // Parse reason from notes if available
        const matchedReason = ABSENCE_REASONS.find(r => data.notes?.toLowerCase().includes(r.value));
        if (matchedReason) setReason(matchedReason.value);
      } else {
        resetForm();
      }

      setLoading(false);
    };

    if (open) {
      loadAbsence();
    }
  }, [open, user, slot, slotDate]);

  const resetForm = () => {
    setAbsence(null);
    setIsEva(false);
    setIsMissed(false);
    setIsExcused(false);
    setReason('krank');
    setNotes('');
  };

  const handleSave = async () => {
    if (!user || !slot || !slotDate) return;

    setSaving(true);
    const dateStr = format(slotDate, 'yyyy-MM-dd');

    // If neither EVA nor missed, delete any existing absence
    if (!isEva && !isMissed) {
      if (absence) {
        await supabase
          .from('v2_absences')
          .delete()
          .eq('id', absence.id);
        toast.success('Eintrag entfernt');
      }
      onAbsenceChange?.();
      onOpenChange(false);
      setSaving(false);
      return;
    }

    const absenceData = {
      user_id: user.id,
      course_id: slot.course_id,
      timetable_slot_id: slot.id,
      date: dateStr,
      status: isExcused ? 'excused' : 'unexcused',
      is_eva: isEva && !isMissed,
      notes: isMissed ? `${ABSENCE_REASONS.find(r => r.value === reason)?.label}${notes ? ': ' + notes : ''}` : (notes || null),
    };

    if (absence) {
      // Update existing
      const { error } = await supabase
        .from('v2_absences')
        .update(absenceData)
        .eq('id', absence.id);

      if (error) {
        toast.error('Fehler beim Speichern');
      } else {
        toast.success('Gespeichert');
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('v2_absences')
        .insert(absenceData);

      if (error) {
        toast.error('Fehler beim Speichern');
      } else {
        toast.success('Gespeichert');
      }
    }

    onAbsenceChange?.();
    onOpenChange(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!absence) return;

    setSaving(true);
    await supabase.from('v2_absences').delete().eq('id', absence.id);
    toast.success('Eintrag entfernt');
    onAbsenceChange?.();
    onOpenChange(false);
    setSaving(false);
  };

  if (!slot || !course || !slotDate) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: course.color || '#6366f1' }}
            >
              {course.short_name || course.name.substring(0, 2)}
            </div>
            <div>
              <SheetTitle>{course.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {WEEKDAYS[slot.day_of_week - 1]}, {format(slotDate, 'd. MMMM', { locale: de })} · {slot.period}. Stunde
              </p>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {/* Quick action: Open course details */}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                onOpenChange(false);
                onOpenCourseDetail();
              }}
            >
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
              Kurs-Details offnen
            </Button>

            <div className="border-t pt-4 space-y-4">
              <div className="text-sm font-medium">Anwesenheit</div>

              {/* EVA Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">EVA</div>
                    <div className="text-xs text-muted-foreground">Eigenverantwortliches Arbeiten</div>
                  </div>
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
              <div className={`p-3 rounded-lg ${isMissed ? 'bg-rose-500/10' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMissed ? 'bg-rose-500/20' : 'bg-muted'}`}>
                      <UserX className={`w-4 h-4 ${isMissed ? 'text-rose-600' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Gefehlt</div>
                      <div className="text-xs text-muted-foreground">In dieser Stunde nicht anwesend</div>
                    </div>
                  </div>
                  <Switch 
                    checked={isMissed}
                    onCheckedChange={(checked) => {
                      setIsMissed(checked);
                      if (checked) setIsEva(false);
                    }}
                  />
                </div>

                {/* Absence details - only show when missed */}
                {isMissed && (
                  <div className="mt-4 pt-4 border-t border-rose-200/30 space-y-4">
                    {/* Excused toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExcused ? (
                          <Check className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                        ) : (
                          <X className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
                        )}
                        <span className="text-sm">
                          {isExcused ? 'Entschuldigt' : 'Nicht entschuldigt'}
                        </span>
                      </div>
                      <Switch 
                        checked={isExcused}
                        onCheckedChange={setIsExcused}
                      />
                    </div>

                    {/* Reason selector */}
                    <div className="space-y-2">
                      <Label className="text-xs">Grund</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ABSENCE_REASONS.map(r => (
                            <SelectItem key={r.value} value={r.value}>
                              <div className="flex items-center gap-2">
                                <r.icon className="w-4 h-4" strokeWidth={1.5} />
                                {r.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-xs">Notizen (optional)</Label>
                      <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Weitere Details..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {absence && (
                <Button 
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Entfernen
                </Button>
              )}
              <Button 
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
