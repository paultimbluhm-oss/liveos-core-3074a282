import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, BookOpen, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Scope, ClassName, CLASS_OPTIONS } from '@/hooks/useSchoolScope';

const DEFAULT_SUBJECTS = [
  { name: 'Mathematik', short_name: 'MA' },
  { name: 'Deutsch', short_name: 'DE' },
  { name: 'Englisch', short_name: 'EN' },
  { name: 'Franzoesisch', short_name: 'FR' },
  { name: 'Latein', short_name: 'LA' },
  { name: 'Spanisch', short_name: 'SP' },
  { name: 'Physik', short_name: 'PH' },
  { name: 'Chemie', short_name: 'CH' },
  { name: 'Biologie', short_name: 'BI' },
  { name: 'Informatik', short_name: 'IF' },
  { name: 'Geschichte', short_name: 'GE' },
  { name: 'Politik', short_name: 'PO' },
  { name: 'Erdkunde', short_name: 'EK' },
  { name: 'Kunst', short_name: 'KU' },
  { name: 'Musik', short_name: 'MU' },
  { name: 'Sport', short_name: 'SP' },
  { name: 'Religion', short_name: 'RE' },
  { name: 'Ethik', short_name: 'ET' },
  { name: 'Philosophie', short_name: 'PL' },
  { name: 'Wirtschaft', short_name: 'WI' },
  { name: 'Paedagogik', short_name: 'PA' },
  { name: 'Sozialwissenschaften', short_name: 'SW' },
];

const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  period: number;
  isDouble: boolean;
  weekType: 'both' | 'odd' | 'even';
}

interface ScopedCreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  getOrCreateSemester: () => Promise<string | null>;
  onCourseCreated: () => void;
}

export function ScopedCreateCourseDialog({ 
  open, 
  onOpenChange, 
  scope,
  getOrCreateSemester,
  onCourseCreated,
}: ScopedCreateCourseDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Sichtbarkeit: Jahrgangskurs vs Klassenkurs
  const [isClassCourse, setIsClassCourse] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassName>(scope.className);
  
  // Grunddaten
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customName, setCustomName] = useState('');
  const [customShortName, setCustomShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  
  // Benotung
  const [hasGrading, setHasGrading] = useState(true);
  const [writtenWeight, setWrittenWeight] = useState('50');
  const [oralWeight, setOralWeight] = useState('50');
  
  // Stundenplan-Slots
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState('1');
  const [newSlotPeriod, setNewSlotPeriod] = useState('1');
  const [newSlotDouble, setNewSlotDouble] = useState(false);
  const [newSlotWeekType, setNewSlotWeekType] = useState<'both' | 'odd' | 'even'>('both');

  // Update selected class when scope changes
  useEffect(() => {
    setSelectedClass(scope.className);
  }, [scope.className]);

  const handleSubjectChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setSelectedSubject('');
    } else {
      setIsCustom(false);
      setSelectedSubject(value);
      
      const subject = DEFAULT_SUBJECTS.find(s => s.name === value);
      if (subject) {
        setCustomName(subject.name);
        setCustomShortName(subject.short_name);
      }
    }
  };

  const addSlot = () => {
    const dayNum = parseInt(newSlotDay);
    const periodNum = parseInt(newSlotPeriod);
    
    const exists = slots.some(s => 
      s.dayOfWeek === dayNum && 
      s.period === periodNum && 
      s.weekType === newSlotWeekType
    );
    
    if (exists) {
      toast.error('Diese Stunde existiert bereits');
      return;
    }
    
    setSlots([...slots, {
      id: crypto.randomUUID(),
      dayOfWeek: dayNum,
      period: periodNum,
      isDouble: newSlotDouble,
      weekType: newSlotWeekType,
    }]);
    
    setShowSlotForm(false);
    setNewSlotDay('1');
    setNewSlotPeriod('1');
    setNewSlotDouble(false);
    setNewSlotWeekType('both');
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const handleCreate = async () => {
    if (!user || !scope.year || !scope.school || loading) return;
    
    setLoading(true);
    
    const name = isCustom ? customName.trim() : customName;
    const shortName = isCustom ? customShortName.trim() : customShortName;
    
    if (!name) {
      toast.error('Fach erforderlich');
      setLoading(false);
      return;
    }
    
    // Hole oder erstelle Semester
    const semesterId = await getOrCreateSemester();
    if (!semesterId) {
      toast.error('Fehler beim Erstellen des Semesters');
      setLoading(false);
      return;
    }
    
    // Hole class_id wenn Klassenkurs
    let classId: string | null = null;
    if (isClassCourse) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('school_year_id', scope.year.id)
        .eq('name', selectedClass)
        .maybeSingle();
      
      classId = classData?.id || null;
      
      // Erstelle Klasse falls nicht vorhanden
      if (!classId) {
        const { data: newClass } = await supabase
          .from('classes')
          .insert({
            school_year_id: scope.year.id,
            name: selectedClass,
            created_by: user.id,
          })
          .select('id')
          .single();
        
        classId = newClass?.id || null;
      }
    }
    
    // Erstelle Kurs
    const { data: courseData, error } = await supabase.from('courses').insert({
      school_year_id: scope.year.id,
      semester_id: semesterId,
      class_id: classId,
      name: name,
      short_name: shortName || null,
      teacher_name: teacherName.trim() || null,
      room: room.trim() || null,
      created_by: user.id,
      has_grading: hasGrading,
      written_weight: hasGrading ? parseInt(writtenWeight) || 50 : null,
      oral_weight: hasGrading ? parseInt(oralWeight) || 50 : null,
    }).select().single();
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      setLoading(false);
      return;
    }
    
    // Creator als Admin hinzufuegen
    await supabase.from('course_members').insert({
      course_id: courseData.id,
      user_id: user.id,
      role: 'admin',
    });
    
    // Stundenplan-Slots erstellen
    for (const slot of slots) {
      await supabase.from('course_timetable_slots').insert({
        course_id: courseData.id,
        day_of_week: slot.dayOfWeek,
        period: slot.period,
        room: room.trim() || null,
        week_type: slot.weekType,
        is_double_lesson: slot.isDouble,
      });
      
      // Doppelstunde: zweiten Slot erstellen
      if (slot.isDouble && slot.period < 9 && slot.period !== 6) {
        const nextPeriod = slot.period === 6 ? 8 : slot.period + 1;
        await supabase.from('course_timetable_slots').insert({
          course_id: courseData.id,
          day_of_week: slot.dayOfWeek,
          period: nextPeriod,
          room: room.trim() || null,
          week_type: slot.weekType,
          is_double_lesson: false,
        });
      }
    }
    
    // In persoenlichen Stundenplan eintragen
    await applyCourseSlotsToTimetable(courseData.id, user.id);
    
    toast.success('Kurs erstellt');
    setLoading(false);
    resetForm();
    onCourseCreated();
    onOpenChange(false);
  };

  const applyCourseSlotsToTimetable = async (courseId: string, userId: string) => {
    const { data: courseData } = await supabase
      .from('courses')
      .select('name, teacher_name, room')
      .eq('id', courseId)
      .single();
    
    if (!courseData) return;
    
    const { data: courseSlots } = await supabase
      .from('course_timetable_slots')
      .select('*')
      .eq('course_id', courseId);
    
    if (!courseSlots) return;
    
    for (const slot of courseSlots) {
      // Loesche existierende Eintraege
      await supabase
        .from('timetable_entries')
        .delete()
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .eq('week_type', slot.week_type);
      
      // Erstelle neuen Eintrag
      await supabase.from('timetable_entries').insert({
        user_id: userId,
        day_of_week: slot.day_of_week,
        period: slot.period,
        course_id: courseId,
        teacher_short: courseData.teacher_name || '',
        room: slot.room || courseData.room || null,
        week_type: slot.week_type,
      });
    }
  };

  const resetForm = () => {
    setSelectedSubject('');
    setCustomName('');
    setCustomShortName('');
    setTeacherName('');
    setRoom('');
    setIsCustom(false);
    setHasGrading(true);
    setWrittenWeight('50');
    setOralWeight('50');
    setSlots([]);
    setShowSlotForm(false);
    setIsClassCourse(true);
    setSelectedClass(scope.className);
  };

  const getWeekTypeLabel = (wt: string) => {
    if (wt === 'odd') return 'A';
    if (wt === 'even') return 'B';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />
            Kurs erstellen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Scope-Info */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            {scope.gradeLevel}. Jahrgang / {scope.semester}. Halbjahr
          </div>
          
          {/* Sichtbarkeit: Jahrgangskurs vs Klassenkurs */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Fuer Klasse</Label>
              <Switch
                checked={isClassCourse}
                onCheckedChange={setIsClassCourse}
              />
            </div>
            
            {isClassCourse ? (
              <div>
                <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassName)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Klasse waehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map(cls => (
                      <SelectItem key={cls} value={cls}>
                        {scope.gradeLevel}{cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Nur fuer Klasse {scope.gradeLevel}{selectedClass} sichtbar
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Fuer alle Klassen im {scope.gradeLevel}. Jahrgang sichtbar
              </p>
            )}
          </div>
          
          {/* Fach-Auswahl */}
          <div>
            <Label className="text-xs">Fach</Label>
            <Select 
              value={isCustom ? 'custom' : selectedSubject} 
              onValueChange={handleSubjectChange}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Fach waehlen..." />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_SUBJECTS.map(subject => (
                  <SelectItem key={subject.name} value={subject.name}>
                    {subject.name} ({subject.short_name})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Eigenes Fach...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom Name wenn "Eigenes Fach" */}
          {isCustom && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Kursname</Label>
                <Input 
                  value={customName} 
                  onChange={(e) => setCustomName(e.target.value)} 
                  placeholder="z.B. Informatik LK"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={customShortName} 
                  onChange={(e) => setCustomShortName(e.target.value.toUpperCase())} 
                  placeholder="IF"
                  className="h-9 mt-1"
                  maxLength={4}
                />
              </div>
            </div>
          )}
          
          {/* Lehrer + Raum */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Lehrer</Label>
              <Input 
                value={teacherName} 
                onChange={(e) => setTeacherName(e.target.value)} 
                placeholder="z.B. Mueller"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Raum</Label>
              <Input 
                value={room} 
                onChange={(e) => setRoom(e.target.value)} 
                placeholder="z.B. 203"
                className="h-9 mt-1"
              />
            </div>
          </div>
          
          {/* Benotung */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Benotung aktiv</Label>
              <Switch
                checked={hasGrading}
                onCheckedChange={setHasGrading}
              />
            </div>
            
            {hasGrading && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Schriftlich %</Label>
                  <Input 
                    type="number"
                    value={writtenWeight} 
                    onChange={(e) => setWrittenWeight(e.target.value)} 
                    className="h-8 mt-1"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Muendlich %</Label>
                  <Input 
                    type="number"
                    value={oralWeight} 
                    onChange={(e) => setOralWeight(e.target.value)} 
                    className="h-8 mt-1"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Stundenplan-Slots */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" strokeWidth={1.5} />
                Unterrichtszeiten
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setShowSlotForm(true)}
              >
                <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Stunde
              </Button>
            </div>
            
            {slots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {slots.map(slot => (
                  <div 
                    key={slot.id} 
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs"
                  >
                    <span>{DAYS_FULL[slot.dayOfWeek - 1]?.slice(0, 2)}</span>
                    <span className="font-semibold">{slot.period}</span>
                    {slot.isDouble && <span className="text-[9px]">+{slot.period + 1}</span>}
                    {slot.weekType !== 'both' && (
                      <span className="text-[9px] px-1 rounded bg-background">
                        {getWeekTypeLabel(slot.weekType)}
                      </span>
                    )}
                    <button 
                      onClick={() => removeSlot(slot.id)}
                      className="ml-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showSlotForm && (
              <div className="p-2 rounded-md bg-muted/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_FULL.map((day, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newSlotPeriod} onValueChange={setNewSlotPeriod}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map(p => (
                        <SelectItem key={p} value={String(p)}>{p}. Stunde</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[10px]">
                    <input 
                      type="checkbox" 
                      checked={newSlotDouble}
                      onChange={(e) => setNewSlotDouble(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    Doppelstunde
                  </label>
                  <Select value={newSlotWeekType} onValueChange={(v) => setNewSlotWeekType(v as 'both' | 'odd' | 'even')}>
                    <SelectTrigger className="h-6 text-[10px] w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Jede</SelectItem>
                      <SelectItem value="odd">A-Woche</SelectItem>
                      <SelectItem value="even">B-Woche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={addSlot}>
                    Hinzufuegen
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSlotForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
            
            {slots.length === 0 && !showSlotForm && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Keine Stunden hinzugefuegt
              </p>
            )}
          </div>
          
          {/* Erstellen Button */}
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? 'Erstelle...' : 'Kurs erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
