import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, BookOpen, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolSubject {
  id: string;
  name: string;
  short_name: string | null;
}

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

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  period: number;
  isDouble: boolean;
  weekType: 'both' | 'odd' | 'even';
}

interface ClassOption {
  id: string;
  name: string;
}

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYearId: string;
  schoolId: string;
  userClassId?: string;
  gradeLevel?: number;
  semester?: 1 | 2;
  onCourseCreated: () => void;
}

export function CreateCourseDialog({ 
  open, 
  onOpenChange, 
  schoolYearId, 
  schoolId,
  userClassId,
  gradeLevel = 12,
  semester = 1,
  onCourseCreated 
}: CreateCourseDialogProps) {
  const { user } = useAuth();
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Visibility
  const [visibilityType, setVisibilityType] = useState<'year' | 'class'>('year');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Basic info
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customName, setCustomName] = useState('');
  const [customShortName, setCustomShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  
  // Grading
  const [hasGrading, setHasGrading] = useState(true);
  const [writtenWeight, setWrittenWeight] = useState('50');
  const [oralWeight, setOralWeight] = useState('50');
  
  // Timetable slots
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState('1');
  const [newSlotPeriod, setNewSlotPeriod] = useState('1');
  const [newSlotDouble, setNewSlotDouble] = useState(false);
  const [newSlotWeekType, setNewSlotWeekType] = useState<'both' | 'odd' | 'even'>('both');

  useEffect(() => {
    if (open && schoolId) {
      fetchSchoolSubjects();
      fetchClasses();
      // Default: if user has a class, pre-select class visibility
      if (userClassId) {
        setVisibilityType('class');
        setSelectedClassId(userClassId);
      } else {
        setVisibilityType('year');
        setSelectedClassId('');
      }
    }
  }, [open, schoolId, userClassId]);

  const fetchClasses = async () => {
    if (!schoolYearId) return;
    
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_year_id', schoolYearId)
      .order('name');
    
    if (data) {
      setAvailableClasses(data);
    }
  };

  const fetchSchoolSubjects = async () => {
    const { data } = await supabase
      .from('school_subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    
    if (data && data.length > 0) {
      setSchoolSubjects(data);
    } else {
      setSchoolSubjects([]);
    }
  };

  const handleSubjectChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setSelectedSubject('');
    } else {
      setIsCustom(false);
      setSelectedSubject(value);
      
      const subject = schoolSubjects.find(s => s.id === value) 
        || DEFAULT_SUBJECTS.find(s => s.name === value);
      if (subject) {
        setCustomName(subject.name);
        setCustomShortName(subject.short_name || '');
      }
    }
  };

  const addSlot = () => {
    const dayNum = parseInt(newSlotDay);
    const periodNum = parseInt(newSlotPeriod);
    
    // Check for duplicates
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
    if (!user || !schoolYearId || loading) return;
    
    setLoading(true);
    
    const name = isCustom ? customName.trim() : customName;
    const shortName = isCustom ? customShortName.trim() : customShortName;
    
    if (!name) {
      toast.error('Fach erforderlich');
      setLoading(false);
      return;
    }
    
    // Check if user already has a course with the same name in this school year
    const { data: existingMemberships } = await supabase
      .from('course_members')
      .select('course_id, courses!inner(name, school_year_id)')
      .eq('user_id', user.id);
    
    const alreadyHasSameCourse = existingMemberships?.some((m: any) => 
      m.courses?.name?.toLowerCase() === name.toLowerCase() && 
      m.courses?.school_year_id === schoolYearId
    );
    
    if (alreadyHasSameCourse) {
      toast.error('Du bist bereits in einem Kurs mit diesem Namen');
      setLoading(false);
      return;
    }
    
    // Determine class_id based on visibility
    const courseClassId = visibilityType === 'class' ? selectedClassId : null;
    
    // Get or create semester_id
    let semesterId: string | null = null;
    const { data: existingSemester } = await supabase
      .from('year_semesters')
      .select('id')
      .eq('school_year_id', schoolYearId)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    if (existingSemester) {
      semesterId = existingSemester.id;
    } else {
      const { data: newSemester } = await supabase
        .from('year_semesters')
        .insert({
          school_year_id: schoolYearId,
          grade_level: gradeLevel,
          semester: semester,
        })
        .select()
        .single();
      
      if (newSemester) {
        semesterId = newSemester.id;
      }
    }
    
    // Create course
    const { data: courseData, error } = await supabase.from('courses').insert({
      school_year_id: schoolYearId,
      semester_id: semesterId,
      class_id: courseClassId || null,
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
    
    // Auto-join the creator as admin
    await supabase.from('course_members').insert({
      course_id: courseData.id,
      user_id: user.id,
      role: 'admin',
    });
    
    // Create timetable slots
    for (const slot of slots) {
      await supabase.from('course_timetable_slots').insert({
        course_id: courseData.id,
        day_of_week: slot.dayOfWeek,
        period: slot.period,
        room: room.trim() || null,
        week_type: slot.weekType,
        is_double_lesson: slot.isDouble,
      });
      
      // If double lesson, create second slot
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
    
    // Auto-apply slots to creator's personal timetable
    await applyCourseSlotsToTimetable(courseData.id, user.id, name, teacherName.trim(), room.trim());
    
    toast.success('Kurs erstellt');
    setLoading(false);
    resetForm();
    onCourseCreated();
    onOpenChange(false);
  };

  const applyCourseSlotsToTimetable = async (
    courseId: string, 
    userId: string, 
    courseName: string,
    teacher: string,
    courseRoom: string
  ) => {
    // Get all slots for this course
    const { data: courseSlots } = await supabase
      .from('course_timetable_slots')
      .select('*')
      .eq('course_id', courseId);
    
    if (!courseSlots) return;
    
    for (const slot of courseSlots) {
      // Check if slot already exists
      const { data: existing } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .eq('week_type', slot.week_type)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('timetable_entries')
          .update({
            course_id: courseId,
            teacher_short: teacher || '',
            room: slot.room || courseRoom || null,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('timetable_entries').insert({
          user_id: userId,
          day_of_week: slot.day_of_week,
          period: slot.period,
          course_id: courseId,
          teacher_short: teacher || '',
          room: slot.room || courseRoom || null,
          week_type: slot.week_type,
        });
      }
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
    setVisibilityType(userClassId ? 'class' : 'year');
    setSelectedClassId(userClassId || '');
  };

  const subjectOptions = schoolSubjects.length > 0 
    ? schoolSubjects.map(s => ({ id: s.id, name: s.name, short_name: s.short_name }))
    : DEFAULT_SUBJECTS.map(s => ({ id: s.name, name: s.name, short_name: s.short_name }));

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
          {/* Visibility Selection - REQUIRED */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <Label className="text-xs font-medium">Sichtbarkeit</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={visibilityType === 'year' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setVisibilityType('year');
                  setSelectedClassId('');
                }}
              >
                Gesamter Jahrgang
              </Button>
              <Button
                type="button"
                variant={visibilityType === 'class' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setVisibilityType('class');
                  setSelectedClassId(userClassId || '');
                }}
              >
                Nur Klasse
              </Button>
            </div>
            
            {visibilityType === 'class' && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Klasse waehlen</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue placeholder="Klasse waehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Subject Selection */}
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
                {subjectOptions.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.short_name ? `${subject.short_name} - ${subject.name}` : subject.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Eigenes Fach</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isCustom && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fachname</Label>
                <Input 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="z.B. Darstellendes Spiel"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={customShortName}
                  onChange={(e) => setCustomShortName(e.target.value)}
                  placeholder="z.B. DS"
                  className="h-9 mt-1"
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Lehrer</Label>
              <Input 
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="z.B. Mue"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Raum</Label>
              <Input 
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="z.B. A204"
                className="h-9 mt-1"
              />
            </div>
          </div>
          
          {/* Grading Section */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Bewertung</Label>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="hasGrading" 
                  checked={hasGrading} 
                  onCheckedChange={(c) => setHasGrading(!!c)} 
                />
                <label htmlFor="hasGrading" className="text-xs text-muted-foreground">
                  Benotung aktiv
                </label>
              </div>
            </div>
            
            {hasGrading && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Schriftlich %</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={writtenWeight}
                    onChange={(e) => {
                      setWrittenWeight(e.target.value);
                      const w = parseInt(e.target.value) || 0;
                      setOralWeight((100 - w).toString());
                    }}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Muendlich %</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={oralWeight}
                    onChange={(e) => {
                      setOralWeight(e.target.value);
                      const o = parseInt(e.target.value) || 0;
                      setWrittenWeight((100 - o).toString());
                    }}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Timetable Slots Section */}
          <div className="p-3 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <Label className="text-xs font-medium">Kursstunden</Label>
              </div>
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                className="h-7 text-[10px] gap-1"
                onClick={() => setShowSlotForm(true)}
              >
                <Plus className="w-3 h-3" strokeWidth={1.5} />
                Stunde
              </Button>
            </div>
            
            {/* Current Slots */}
            {slots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {slots.map(slot => (
                  <div 
                    key={slot.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px]"
                  >
                    <span className="font-medium">
                      {DAYS[slot.dayOfWeek - 1]} {slot.period}.
                      {slot.isDouble && '-' + (slot.period === 6 ? 8 : slot.period + 1) + '.'}
                      {slot.weekType !== 'both' && ` (${getWeekTypeLabel(slot.weekType)})`}
                    </span>
                    <button 
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {slots.length === 0 && !showSlotForm && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Keine Stunden hinzugefuegt
              </p>
            )}
            
            {/* Add Slot Form */}
            {showSlotForm && (
              <div className="p-2 rounded-md bg-muted/30 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Tag</Label>
                    <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                      <SelectTrigger className="h-8 mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_FULL.map((day, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Stunde</Label>
                    <Select value={newSlotPeriod} onValueChange={setNewSlotPeriod}>
                      <SelectTrigger className="h-8 mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map(p => (
                          <SelectItem key={p} value={p.toString()}>{p}.</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Checkbox 
                      id="slotDouble" 
                      checked={newSlotDouble} 
                      onCheckedChange={(c) => setNewSlotDouble(!!c)} 
                    />
                    <label htmlFor="slotDouble" className="text-[10px]">Doppelstunde</label>
                  </div>
                  
                  <Select value={newSlotWeekType} onValueChange={(v) => setNewSlotWeekType(v as 'both' | 'odd' | 'even')}>
                    <SelectTrigger className="h-7 w-28 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Jede Woche</SelectItem>
                      <SelectItem value="odd">A-Woche</SelectItem>
                      <SelectItem value="even">B-Woche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    size="sm" 
                    className="h-7 flex-1 text-[10px]"
                    onClick={addSlot}
                  >
                    Hinzufuegen
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-[10px]"
                    onClick={() => setShowSlotForm(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleCreate} 
            className="w-full"
            disabled={
              loading || 
              (!selectedSubject && !customName.trim()) ||
              (visibilityType === 'class' && !selectedClassId)
            }
          >
            <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
            {loading ? 'Wird erstellt...' : 'Kurs erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
