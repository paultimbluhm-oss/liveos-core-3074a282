import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGradeColors } from '@/hooks/useGradeColors';
import { V2Course, V2TimetableSlot, V2Grade, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  BookOpen, UserX, Stethoscope, Calendar, Building2, AlertCircle, 
  Check, X, Settings, GraduationCap, Plus, ChevronDown, ChevronUp, LogOut 
} from 'lucide-react';
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
  onCourseLeft?: () => void;
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
  onAbsenceChange,
  onCourseLeft
}: SlotActionSheetProps) {
  const { user } = useAuth();
  const { settings: gradeColorSettings } = useGradeColors();
  
  const [absence, setAbsence] = useState<V2Absence | null>(null);
  const [grades, setGrades] = useState<V2Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sections expand state
  const [gradesExpanded, setGradesExpanded] = useState(true);
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);

  // Form state
  const [isEva, setIsEva] = useState(false);
  const [isMissed, setIsMissed] = useState(false);
  const [isExcused, setIsExcused] = useState(false);
  const [reason, setReason] = useState('krank');
  const [notes, setNotes] = useState('');

  // Add grade dialog
  const [addGradeOpen, setAddGradeOpen] = useState(false);

  // Course settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Check if user is course creator
  const isCreator = user?.id === course?.created_by;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user || !slot || !slotDate || !course) {
        setAbsence(null);
        setGrades([]);
        resetForm();
        return;
      }

      setLoading(true);
      const dateStr = format(slotDate, 'yyyy-MM-dd');

      // Load absence
      const { data: absenceData } = await supabase
        .from('v2_absences')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', slot.course_id)
        .eq('timetable_slot_id', slot.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (absenceData) {
        setAbsence(absenceData as V2Absence);
        setIsEva(absenceData.is_eva);
        setIsMissed(!absenceData.is_eva);
        setIsExcused(absenceData.status === 'excused');
        setNotes(absenceData.notes || '');
        const matchedReason = ABSENCE_REASONS.find(r => absenceData.notes?.toLowerCase().includes(r.value));
        if (matchedReason) setReason(matchedReason.value);
        setAttendanceExpanded(true);
        setGradesExpanded(false);
      } else {
        resetForm();
      }

      // Load grades for this course
      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setGrades((gradesData || []).map(g => ({
        ...g,
        grade_type: g.grade_type as 'oral' | 'written' | 'practical' | 'semester',
        semester: g.semester as 1 | 2,
      })));

      setLoading(false);
    };

    if (open) {
      loadData();
    }
  }, [open, user, slot, slotDate, course]);

  const resetForm = () => {
    setAbsence(null);
    setIsEva(false);
    setIsMissed(false);
    setIsExcused(false);
    setReason('krank');
    setNotes('');
  };

  const handleSaveAbsence = async () => {
    if (!user || !slot || !slotDate) return;

    setSaving(true);
    const dateStr = format(slotDate, 'yyyy-MM-dd');

    if (!isEva && !isMissed) {
      if (absence) {
        await supabase.from('v2_absences').delete().eq('id', absence.id);
        toast.success('Eintrag entfernt');
        setAbsence(null);
      }
      onAbsenceChange?.();
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
      await supabase.from('v2_absences').update(absenceData).eq('id', absence.id);
    } else {
      await supabase.from('v2_absences').insert(absenceData);
    }

    toast.success('Gespeichert');
    onAbsenceChange?.();
    setSaving(false);
  };

  const getGradeBgClass = (points: number): string => {
    if (points >= gradeColorSettings.green_min) return 'bg-emerald-500';
    if (points >= gradeColorSettings.yellow_min) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const handleGradeAdded = (grade: V2Grade) => {
    setGrades(prev => [grade, ...prev].slice(0, 5));
    setAddGradeOpen(false);
  };

  if (!slot || !course || !slotDate) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: course.color || '#6366f1' }}
              >
                {course.short_name || course.name.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  {course.name}
                  {isCreator && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  )}
                </SheetTitle>
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
            <div className="space-y-3 pb-4">
              {/* Grades Section */}
              <div className="rounded-lg border">
                <button
                  className="w-full flex items-center justify-between p-3"
                  onClick={() => setGradesExpanded(!gradesExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="font-medium text-sm">Noten</span>
                    {grades.length > 0 && (
                      <span className="text-xs text-muted-foreground">({grades.length})</span>
                    )}
                  </div>
                  {gradesExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {gradesExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setAddGradeOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
                      Note hinzufugen
                    </Button>

                    {grades.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Noch keine Noten
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {grades.map(grade => (
                          <div 
                            key={grade.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <span 
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${getGradeBgClass(grade.points)}`}
                              >
                                {grade.points}
                              </span>
                              <div>
                                <span className="text-xs font-medium">
                                  {grade.grade_type === 'oral' && 'Mundlich'}
                                  {grade.grade_type === 'written' && 'Schriftlich'}
                                  {grade.grade_type === 'practical' && 'Praxis'}
                                  {grade.grade_type === 'semester' && 'Halbjahresnote'}
                                </span>
                                {grade.description && (
                                  <p className="text-[10px] text-muted-foreground">{grade.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              HJ {grade.semester}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenCourseDetail();
                      }}
                    >
                      Alle Noten anzeigen
                    </Button>
                  </div>
                )}
              </div>

              {/* Attendance Section */}
              <div className="rounded-lg border">
                <button
                  className="w-full flex items-center justify-between p-3"
                  onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="font-medium text-sm">Anwesenheit</span>
                    {(isEva || isMissed) && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isEva ? 'bg-blue-500/20 text-blue-600' : 'bg-rose-500/20 text-rose-600'}`}>
                        {isEva ? 'EVA' : 'Gefehlt'}
                      </span>
                    )}
                  </div>
                  {attendanceExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {attendanceExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* EVA Toggle */}
                    <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                        <span className="text-sm">EVA</span>
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
                      onClick={handleSaveAbsence}
                      disabled={saving}
                    >
                      Speichern
                    </Button>
                  </div>
                )}
              </div>

              {/* More options */}
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => {
                  onOpenChange(false);
                  onOpenCourseDetail();
                }}
              >
                <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                Alle Kurs-Details
              </Button>

              {/* Leave Course Button */}
              {!isCreator && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (!user || !course) return;
                    
                    await supabase
                      .from('v2_course_members')
                      .delete()
                      .eq('course_id', course.id)
                      .eq('user_id', user.id);
                    
                    toast.success('Kurs verlassen');
                    onOpenChange(false);
                    onCourseLeft?.();
                  }}
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  Kurs verlassen
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Grade Dialog */}
      {course && (
        <AddGradeDialogInline
          open={addGradeOpen}
          onOpenChange={setAddGradeOpen}
          course={course}
          onAdded={handleGradeAdded}
        />
      )}

      {/* Course Settings Dialog */}
      {course && isCreator && (
        <CourseSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          course={course}
          onUpdated={() => {
            onAbsenceChange?.();
          }}
        />
      )}
    </>
  );
}

// Inline Add Grade Dialog
interface AddGradeDialogInlineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  onAdded: (grade: V2Grade) => void;
}

function AddGradeDialogInline({ open, onOpenChange, course, onAdded }: AddGradeDialogInlineProps) {
  const { user } = useAuth();
  
  const [gradeType, setGradeType] = useState<'oral' | 'written' | 'practical' | 'semester'>('oral');
  const [semester, setSemester] = useState<1 | 2>(1);
  const [points, setPoints] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('v2_grades')
      .insert({
        user_id: user.id,
        course_id: course.id,
        grade_type: gradeType,
        points,
        description: description.trim() || null,
        date: new Date().toISOString().split('T')[0],
        semester,
      })
      .select()
      .single();

    if (!error && data) {
      onAdded({
        ...data,
        grade_type: data.grade_type as 'oral' | 'written' | 'practical' | 'semester',
        semester: data.semester as 1 | 2,
      });
      setGradeType('oral');
      setPoints(10);
      setDescription('');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Note hinzufugen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Typ</Label>
              <Select value={gradeType} onValueChange={(v) => setGradeType(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Mundlich</SelectItem>
                  <SelectItem value="written">Schriftlich</SelectItem>
                  {course.has_practical && (
                    <SelectItem value="practical">Praxis</SelectItem>
                  )}
                  <SelectItem value="semester">Halbjahresnote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Halbjahr</Label>
              <Select value={String(semester)} onValueChange={(v) => setSemester(parseInt(v) as 1 | 2)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1. Halbjahr</SelectItem>
                  <SelectItem value="2">2. Halbjahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Punkte</Label>
              <span className="text-2xl font-bold tabular-nums">{points}</span>
            </div>
            <Slider
              value={[points]}
              onValueChange={(v) => setPoints(v[0])}
              min={0}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Beschreibung (optional)</Label>
            <Input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Klausur 1"
              className="h-9"
            />
          </div>

          <Button onClick={handleAdd} disabled={loading} className="w-full">
            Hinzufugen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Course Settings Dialog
interface CourseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  onUpdated: () => void;
}

function CourseSettingsDialog({ open, onOpenChange, course, onUpdated }: CourseSettingsDialogProps) {
  const [name, setName] = useState(course.name);
  const [shortName, setShortName] = useState(course.short_name || '');
  const [teacherName, setTeacherName] = useState(course.teacher_name || '');
  const [room, setRoom] = useState(course.room || '');
  const [oralWeight, setOralWeight] = useState(course.oral_weight);
  const [writtenWeight, setWrittenWeight] = useState(course.written_weight);
  const [practicalWeight, setPracticalWeight] = useState(course.practical_weight);
  const [hasPractical, setHasPractical] = useState(course.has_practical);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(course.name);
      setShortName(course.short_name || '');
      setTeacherName(course.teacher_name || '');
      setRoom(course.room || '');
      setOralWeight(course.oral_weight);
      setWrittenWeight(course.written_weight);
      setPracticalWeight(course.practical_weight);
      setHasPractical(course.has_practical);
    }
  }, [open, course]);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('v2_courses')
      .update({
        name: name.trim(),
        short_name: shortName.trim() || null,
        teacher_name: teacherName.trim() || null,
        room: room.trim() || null,
        oral_weight: oralWeight,
        written_weight: writtenWeight,
        practical_weight: practicalWeight,
        has_practical: hasPractical,
      })
      .eq('id', course.id);

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Kurs aktualisiert');
      onUpdated();
      onOpenChange(false);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kurs bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Kurzel</Label>
              <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="z.B. Ma" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Raum</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="z.B. A101" className="h-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Lehrer</Label>
            <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="z.B. Herr Muller" className="h-9" />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="text-xs font-medium">Gewichtung</div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Mundlich</span>
                <span className="font-medium">{oralWeight}%</span>
              </div>
              <Slider value={[oralWeight]} onValueChange={(v) => setOralWeight(v[0])} min={0} max={100} step={5} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Schriftlich</span>
                <span className="font-medium">{writtenWeight}%</span>
              </div>
              <Slider value={[writtenWeight]} onValueChange={(v) => setWrittenWeight(v[0])} min={0} max={100} step={5} />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-xs">Praxis-Noten</Label>
              <Switch checked={hasPractical} onCheckedChange={setHasPractical} />
            </div>

            {hasPractical && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Praxis</span>
                  <span className="font-medium">{practicalWeight}%</span>
                </div>
                <Slider value={[practicalWeight]} onValueChange={(v) => setPracticalWeight(v[0])} min={0} max={100} step={5} />
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Summe: {oralWeight + writtenWeight + (hasPractical ? practicalWeight : 0)}%
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
