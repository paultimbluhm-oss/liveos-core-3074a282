import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course, V2Grade } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, ClipboardList, GraduationCap, Clock, Settings, UserX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TimetableSlotManagerV2 } from './TimetableSlotManagerV2';
import { HomeworkTabV2 } from './HomeworkTabV2';
import { AbsencesTabV2 } from './AbsencesTabV2';

interface CourseDetailSheetV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course | null;
  onTimetableChange?: () => void;
  onHomeworkChange?: () => void;
  onAbsenceChange?: () => void;
  initialTab?: string;
}

export function CourseDetailSheetV2({ open, onOpenChange, course, onTimetableChange, onHomeworkChange, onAbsenceChange, initialTab = 'grades' }: CourseDetailSheetV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [grades, setGrades] = useState<V2Grade[]>([]);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCreator = course?.created_by === user?.id;

  // Load grades when course changes
  useEffect(() => {
    const loadData = async () => {
      if (!user || !course) return;

      setLoading(true);

      // Load grades
      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .order('created_at', { ascending: false });

      setGrades((gradesData || []).map(g => ({
        ...g,
        grade_type: g.grade_type as 'oral' | 'written' | 'practical' | 'semester',
        semester: g.semester as 1 | 2,
      })));

      setLoading(false);
    };

    if (open && course) {
      loadData();
    }
  }, [open, course, user]);

  // Calculate average
  const calculateAverage = () => {
    if (!course || grades.length === 0) return null;

    const oralGrades = grades.filter(g => g.grade_type === 'oral');
    const writtenGrades = grades.filter(g => g.grade_type === 'written');
    const practicalGrades = grades.filter(g => g.grade_type === 'practical');

    const oralAvg = oralGrades.length > 0 
      ? oralGrades.reduce((sum, g) => sum + g.points, 0) / oralGrades.length 
      : null;
    const writtenAvg = writtenGrades.length > 0 
      ? writtenGrades.reduce((sum, g) => sum + g.points, 0) / writtenGrades.length 
      : null;
    const practicalAvg = practicalGrades.length > 0 
      ? practicalGrades.reduce((sum, g) => sum + g.points, 0) / practicalGrades.length 
      : null;

    let totalWeight = 0;
    let weightedSum = 0;

    if (oralAvg !== null) {
      weightedSum += oralAvg * course.oral_weight;
      totalWeight += course.oral_weight;
    }
    if (writtenAvg !== null) {
      weightedSum += writtenAvg * course.written_weight;
      totalWeight += course.written_weight;
    }
    if (practicalAvg !== null && course.has_practical) {
      weightedSum += practicalAvg * course.practical_weight;
      totalWeight += course.practical_weight;
    }

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
  };

  const average = calculateAverage();

  if (!course) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
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
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {course.teacher_name || 'Kein Lehrer'} · {course.room || 'Kein Raum'}
                </p>
              </div>
              {average !== null && (
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold">{average}</div>
                  <div className="text-xs text-muted-foreground">Punkte</div>
                </div>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue={initialTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="grades" className="gap-1 text-xs px-1">
                <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.5} />
                Noten
              </TabsTrigger>
              <TabsTrigger value="timetable" className="gap-1 text-xs px-1">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                Stunden
              </TabsTrigger>
              <TabsTrigger value="homework" className="gap-1 text-xs px-1">
                <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.5} />
                Aufgaben
              </TabsTrigger>
              <TabsTrigger value="absences" className="gap-1 text-xs px-1">
                <UserX className="w-3.5 h-3.5" strokeWidth={1.5} />
                Fehlzeit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="mt-4 space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setAddGradeOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
                Note hinzufügen
              </Button>

              {grades.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Noch keine Noten eingetragen
                </div>
              ) : (
                <div className="space-y-2">
                  {grades.map(grade => (
                    <div 
                      key={grade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {grade.grade_type === 'oral' && 'Mündlich'}
                          {grade.grade_type === 'written' && 'Schriftlich'}
                          {grade.grade_type === 'practical' && 'Praxis'}
                          {grade.grade_type === 'semester' && 'Halbjahresnote'}
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            HJ {(grade as any).semester || scope.semester}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {grade.description || 'Keine Beschreibung'}
                          {grade.date && ` · ${format(new Date(grade.date), 'd. MMM', { locale: de })}`}
                        </div>
                      </div>
                      <div className="text-xl font-bold">{grade.points}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Gewichtung anzeigen */}
              <div className="pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2">Gewichtung</div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-muted">Mündlich: {course.oral_weight}%</span>
                  <span className="px-2 py-1 rounded bg-muted">Schriftlich: {course.written_weight}%</span>
                  {course.has_practical && (
                    <span className="px-2 py-1 rounded bg-muted">Praxis: {course.practical_weight}%</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timetable" className="mt-4">
              <TimetableSlotManagerV2 course={course} onSlotsChange={onTimetableChange} />
            </TabsContent>

            <TabsContent value="homework" className="mt-4">
              <HomeworkTabV2 course={course} onHomeworkChange={onHomeworkChange} />
            </TabsContent>

            <TabsContent value="absences" className="mt-4">
              <AbsencesTabV2 course={course} onAbsenceChange={onAbsenceChange} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AddGradeDialogV2 
        open={addGradeOpen}
        onOpenChange={setAddGradeOpen}
        course={course}
        currentSemester={scope.semester}
        onAdded={(grade) => setGrades(prev => [grade, ...prev])}
      />

      <CourseSettingsDialogV2
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        course={course}
        isCreator={isCreator}
        onUpdated={() => {
          onTimetableChange?.();
        }}
      />
    </>
  );
}

// Course Settings Dialog
const COURSE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
];

interface CourseSettingsDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  isCreator: boolean;
  onUpdated: () => void;
}

function CourseSettingsDialogV2({ open, onOpenChange, course, isCreator, onUpdated }: CourseSettingsDialogV2Props) {
  const { scope } = useSchoolV2();
  
  const [name, setName] = useState(course.name);
  const [shortName, setShortName] = useState(course.short_name || '');
  const [room, setRoom] = useState(course.room || '');
  const [teacher, setTeacher] = useState(course.teacher_name || '');
  const [color, setColor] = useState(course.color || '#6366f1');
  const [isClassCourse, setIsClassCourse] = useState(!!course.class_name);
  const [oralWeight, setOralWeight] = useState(course.oral_weight);
  const [writtenWeight, setWrittenWeight] = useState(course.written_weight);
  const [hasPractical, setHasPractical] = useState(course.has_practical);
  const [practicalWeight, setPracticalWeight] = useState(course.practical_weight);
  const [saving, setSaving] = useState(false);

  // Reset form when course changes
  useEffect(() => {
    setName(course.name);
    setShortName(course.short_name || '');
    setRoom(course.room || '');
    setTeacher(course.teacher_name || '');
    setColor(course.color || '#6366f1');
    setIsClassCourse(!!course.class_name);
    setOralWeight(course.oral_weight);
    setWrittenWeight(course.written_weight);
    setHasPractical(course.has_practical);
    setPracticalWeight(course.practical_weight);
  }, [course]);

  // Adjust weights when practical is toggled
  useEffect(() => {
    if (hasPractical) {
      const newOral = Math.round(oralWeight * 0.8);
      const newWritten = Math.round(writtenWeight * 0.8);
      const newPractical = 100 - newOral - newWritten;
      setOralWeight(newOral);
      setWrittenWeight(newWritten);
      setPracticalWeight(newPractical);
    } else {
      const total = oralWeight + writtenWeight;
      setOralWeight(Math.round((oralWeight / total) * 100));
      setWrittenWeight(Math.round((writtenWeight / total) * 100));
      setPracticalWeight(0);
    }
  }, [hasPractical]);

  const handleOralChange = (value: number[]) => {
    const newOral = value[0];
    const remaining = 100 - newOral;
    if (hasPractical) {
      const ratio = writtenWeight / (writtenWeight + practicalWeight) || 0.5;
      setWrittenWeight(Math.round(remaining * ratio));
      setPracticalWeight(remaining - Math.round(remaining * ratio));
    } else {
      setWrittenWeight(remaining);
    }
    setOralWeight(newOral);
  };

  const handleWrittenChange = (value: number[]) => {
    const newWritten = value[0];
    const remaining = 100 - newWritten;
    if (hasPractical) {
      const ratio = oralWeight / (oralWeight + practicalWeight) || 0.5;
      setOralWeight(Math.round(remaining * ratio));
      setPracticalWeight(remaining - Math.round(remaining * ratio));
    } else {
      setOralWeight(remaining);
    }
    setWrittenWeight(newWritten);
  };

  const handlePracticalChange = (value: number[]) => {
    const newPractical = value[0];
    const remaining = 100 - newPractical;
    const ratio = oralWeight / (oralWeight + writtenWeight) || 0.5;
    setOralWeight(Math.round(remaining * ratio));
    setWrittenWeight(remaining - Math.round(remaining * ratio));
    setPracticalWeight(newPractical);
  };

  const handleSave = async () => {
    if (!isCreator) return;
    setSaving(true);

    const { error } = await supabase
      .from('v2_courses')
      .update({
        name: name.trim(),
        short_name: shortName.trim() || null,
        room: room.trim() || null,
        teacher_name: teacher.trim() || null,
        color,
        class_name: isClassCourse ? scope.className : null,
        oral_weight: oralWeight,
        written_weight: writtenWeight,
        practical_weight: hasPractical ? practicalWeight : 0,
        has_practical: hasPractical,
      })
      .eq('id', course.id);

    if (!error) {
      onUpdated();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kurseinstellungen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kursname</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                disabled={!isCreator}
              />
            </div>
            <div className="space-y-2">
              <Label>Kürzel</Label>
              <Input 
                value={shortName} 
                onChange={(e) => setShortName(e.target.value)}
                placeholder="z.B. Phy"
                maxLength={4}
                disabled={!isCreator}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Raum</Label>
              <Input 
                value={room} 
                onChange={(e) => setRoom(e.target.value)}
                placeholder="z.B. R204"
                disabled={!isCreator}
              />
            </div>
            <div className="space-y-2">
              <Label>Lehrer</Label>
              <Input 
                value={teacher} 
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="z.B. Hr. Müller"
                disabled={!isCreator}
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => isCreator && setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  } ${!isCreator ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: c }}
                  disabled={!isCreator}
                />
              ))}
            </div>
          </div>

          {/* Class Scope */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Nur meine Klasse</Label>
              <p className="text-xs text-muted-foreground">
                {isClassCourse ? `Nur Klasse ${scope.className}` : 'Für den ganzen Jahrgang'}
              </p>
            </div>
            <Switch 
              checked={isClassCourse} 
              onCheckedChange={setIsClassCourse}
              disabled={!isCreator}
            />
          </div>

          {/* Weights */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Notengewichtung</Label>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mündlich</span>
                <span className="font-medium">{oralWeight}%</span>
              </div>
              <Slider
                value={[oralWeight]}
                onValueChange={handleOralChange}
                min={0}
                max={100}
                step={5}
                disabled={!isCreator}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Schriftlich</span>
                <span className="font-medium">{writtenWeight}%</span>
              </div>
              <Slider
                value={[writtenWeight]}
                onValueChange={handleWrittenChange}
                min={0}
                max={100}
                step={5}
                disabled={!isCreator}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Praxis-Note</Label>
              <Switch 
                checked={hasPractical} 
                onCheckedChange={setHasPractical}
                disabled={!isCreator}
              />
            </div>

            {hasPractical && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Praxis</span>
                  <span className="font-medium">{practicalWeight}%</span>
                </div>
                <Slider
                  value={[practicalWeight]}
                  onValueChange={handlePracticalChange}
                  min={0}
                  max={100}
                  step={5}
                  disabled={!isCreator}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Gesamt: {oralWeight + writtenWeight + (hasPractical ? practicalWeight : 0)}%
            </p>
          </div>

          {isCreator ? (
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
              Speichern
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-2">
              Nur der Ersteller kann diesen Kurs bearbeiten
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline Add Grade Dialog
interface AddGradeDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  currentSemester: 1 | 2;
  onAdded: (grade: V2Grade) => void;
}

function AddGradeDialogV2({ open, onOpenChange, course, currentSemester, onAdded }: AddGradeDialogV2Props) {
  const { user } = useAuth();
  
  const [gradeType, setGradeType] = useState<'oral' | 'written' | 'practical' | 'semester'>('oral');
  const [semester, setSemester] = useState<1 | 2>(currentSemester);
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
      setSemester(currentSemester);
      setPoints(10);
      setDescription('');
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Note hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={gradeType} onValueChange={(v) => setGradeType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Mündlich</SelectItem>
                  <SelectItem value="written">Schriftlich</SelectItem>
                  {course.has_practical && (
                    <SelectItem value="practical">Praxis</SelectItem>
                  )}
                  <SelectItem value="semester">Halbjahresnote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Halbjahr</Label>
              <Select value={String(semester)} onValueChange={(v) => setSemester(parseInt(v) as 1 | 2)}>
                <SelectTrigger>
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
              <Label>Punkte</Label>
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beschreibung (optional)</Label>
            <Input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Klausur 1"
            />
          </div>

          <Button onClick={handleAdd} disabled={loading} className="w-full">
            Hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
