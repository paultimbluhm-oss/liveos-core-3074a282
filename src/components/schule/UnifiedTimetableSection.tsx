import { useState, useEffect, useRef, TouchEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, BookOpen, Coffee, UtensilsCrossed, CheckCircle2, XCircle, LayoutGrid, Columns3, GraduationCap, TrendingUp, Calendar, Edit2, Clock, Palmtree } from 'lucide-react';
import { toast } from 'sonner';
import { format, addWeeks, subWeeks, startOfWeek, addDays, getISOWeek, isWithinInterval, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubjectCard } from './SubjectCard';
import { AddSubjectDialog } from './AddSubjectDialog';
import { EditSubjectDialog } from './EditSubjectDialog';
import { AddHolidayDialog } from './AddHolidayDialog';
import { SubjectsOverviewDialog } from './SubjectsOverviewDialog';
import { DefaultFreePeriodDialog } from './DefaultFreePeriodDialog';

interface CustomHoliday {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface Subject {
  id: string;
  name: string;
  short_name: string | null;
  teacher_short: string | null;
  room: string | null;
  grade_year: number;
  written_weight: number;
  oral_weight: number;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  subject_id: string | null;
  teacher_short: string;
  room: string | null;
  week_type: string;
  subjects?: Subject | null;
}

interface LessonAbsence {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  timetable_entry_id: string;
}

interface Homework {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  subject_id: string;
}

interface SubjectGradeData {
  subjectId: string;
  finalGrade: number | null;
  oralAvg: number | null;
  writtenAvg: number | null;
}

interface SchoolHoliday {
  name: string;
  start: string;
  end: string;
  year: number;
  stateCode: string;
}

interface UnifiedTimetableSectionProps {
  onBack: () => void;
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const PERIOD_STRUCTURE = [
  { period: 1, showBreakAfter: false },
  { period: 2, showBreakAfter: true, breakDuration: '20 Min' },
  { period: 3, showBreakAfter: false },
  { period: 4, showBreakAfter: true, breakDuration: '20 Min' },
  { period: 5, showBreakAfter: false },
  { period: 6, showBreakAfter: false },
  { period: 7, isLunch: true, lunchDuration: '65 Min' },
  { period: 8, showBreakAfter: false },
  { period: 9, showBreakAfter: false },
];

export function UnifiedTimetableSection({ onBack }: UnifiedTimetableSectionProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, SubjectGradeData>>({});
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  
  // Subject detail view
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSlotEntry, setSelectedSlotEntry] = useState<TimetableEntry | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);
  
  // Mobile view mode
  const [mobileViewStart, setMobileViewStart] = useState(0);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  
  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Form state for timetable entry
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [period, setPeriod] = useState('1');
  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherShort, setTeacherShort] = useState('');
  const [room, setRoom] = useState('');
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);
  const [weekType, setWeekType] = useState<string>('both');

  useEffect(() => {
    if (isMobile) {
      setViewMode('compact');
    }
  }, [isMobile]);

  const fetchData = async () => {
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [entriesRes, subjectsRes, absencesRes, homeworkRes, gradesRes] = await Promise.all([
      supabase
        .from('timetable_entries')
        .select('*, subjects(id, name, short_name, teacher_short, room, grade_year, written_weight, oral_weight)')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('period'),
      supabase
        .from('subjects')
        .select('id, name, short_name, teacher_short, room, grade_year, written_weight, oral_weight')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('lesson_absences')
        .select('id, date, reason, excused, timetable_entry_id')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
      supabase
        .from('homework')
        .select('id, title, due_date, completed, subject_id')
        .eq('user_id', user.id)
        .gte('due_date', weekStartStr)
        .lte('due_date', weekEndStr),
      supabase
        .from('grades')
        .select('points, grade_type, subject_id')
        .eq('user_id', user.id),
    ]);

    if (entriesRes.error) console.error(entriesRes.error);
    if (subjectsRes.error) console.error(subjectsRes.error);
    if (absencesRes.error) console.error(absencesRes.error);
    if (homeworkRes.error) console.error(homeworkRes.error);
    if (gradesRes.error) console.error(gradesRes.error);

    setEntries(entriesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setAbsences(absencesRes.data || []);
    setHomework(homeworkRes.data || []);

    // Calculate grades per subject
    if (gradesRes.data && subjectsRes.data) {
      const subjectGradeMap: Record<string, { oral: number[], written: number[], weights: { oral: number, written: number } }> = {};
      const gradeDataResult: Record<string, SubjectGradeData> = {};
      
      subjectsRes.data.forEach(subject => {
        subjectGradeMap[subject.id] = { 
          oral: [], 
          written: [], 
          weights: { oral: subject.oral_weight, written: subject.written_weight } 
        };
      });

      gradesRes.data.forEach(grade => {
        if (subjectGradeMap[grade.subject_id]) {
          if (grade.grade_type === 'oral') {
            subjectGradeMap[grade.subject_id].oral.push(grade.points);
          } else {
            subjectGradeMap[grade.subject_id].written.push(grade.points);
          }
        }
      });

      Object.entries(subjectGradeMap).forEach(([subjectId, { oral, written, weights }]) => {
        const oralAvg = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : null;
        const writtenAvg = written.length > 0 ? written.reduce((a, b) => a + b, 0) / written.length : null;

        let finalGrade: number | null = null;
        if (oralAvg !== null && writtenAvg !== null) {
          finalGrade = Math.round((writtenAvg * weights.written + oralAvg * weights.oral) / 100);
        } else if (oralAvg !== null) {
          finalGrade = Math.round(oralAvg);
        } else if (writtenAvg !== null) {
          finalGrade = Math.round(writtenAvg);
        }

        gradeDataResult[subjectId] = {
          subjectId,
          finalGrade,
          oralAvg,
          writtenAvg
        };
      });

      setSubjectGrades(gradeDataResult);
    }

    setLoading(false);
  };

  // Fetch holidays (API + custom)
  const fetchHolidays = async () => {
    if (!user) return;
    
    try {
      // Fetch from API
      const { data, error } = await supabase.functions.invoke('get-school-holidays', {
        body: { stateCode: 'NI' },
      });
      
      if (error) {
        console.error('Error fetching API holidays:', error);
      } else if (data?.success && data?.holidays) {
        setHolidays(data.holidays);
        console.log('Loaded API holidays:', data.holidays.length);
      }
      
      // Fetch custom holidays from database
      const { data: customData, error: customError } = await supabase
        .from('custom_holidays')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date');
      
      if (customError) {
        console.error('Error fetching custom holidays:', customError);
      } else if (customData) {
        setCustomHolidays(customData);
        console.log('Loaded custom holidays:', customData.length);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [user, currentWeekStart]);

  const resetForm = () => {
    setDayOfWeek('1');
    setPeriod('1');
    setSubjectId('');
    setTeacherShort('');
    setRoom('');
    setIsDoubleLesson(false);
    setWeekType('both');
    setEditingEntry(null);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setDayOfWeek(entry.day_of_week.toString());
    setPeriod(entry.period.toString());
    setSubjectId(entry.subject_id || '');
    setTeacherShort(entry.teacher_short);
    setRoom(entry.room || '');
    setWeekType(entry.week_type || 'both');
    setIsDoubleLesson(false);
    setDialogOpen(true);
  };

  const openSubjectDetail = (entry: TimetableEntry, date: Date) => {
    if (entry.subjects) {
      setSelectedSubject(entry.subjects);
      setSelectedSlotEntry(entry);
      setSelectedSlotDate(date);
      setSubjectSheetOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!teacherShort.trim()) {
      toast.error('Bitte gib ein Lehrerkürzel ein');
      return;
    }

    const periodNum = parseInt(period);
    const dayNum = parseInt(dayOfWeek);

    if (periodNum === 7) {
      toast.error('Die 7. Stunde ist Mittagspause');
      return;
    }

    if (isDoubleLesson) {
      const nextPeriod = periodNum + 1;
      if (nextPeriod > 9 || nextPeriod === 7) {
        toast.error('Doppelstunde kann hier nicht eingetragen werden');
        return;
      }
    }

    const baseData = {
      user_id: user.id,
      day_of_week: dayNum,
      subject_id: subjectId || null,
      teacher_short: teacherShort.trim(),
      room: room.trim() || null,
      week_type: weekType,
    };

    if (editingEntry) {
      const { error } = await supabase
        .from('timetable_entries')
        .update({ ...baseData, period: periodNum, week_type: weekType })
        .eq('id', editingEntry.id);

      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
      } else {
        toast.success('Stunde aktualisiert');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      const { error: error1 } = await supabase
        .from('timetable_entries')
        .upsert({ ...baseData, period: periodNum }, { onConflict: 'user_id,day_of_week,period' });

      if (error1) {
        toast.error('Fehler beim Speichern');
        console.error(error1);
        return;
      }

      if (isDoubleLesson) {
        const nextPeriod = periodNum + 1;
        const { error: error2 } = await supabase
          .from('timetable_entries')
          .upsert({ ...baseData, period: nextPeriod }, { onConflict: 'user_id,day_of_week,period' });

        if (error2) {
          toast.error('Fehler beim Speichern der zweiten Stunde');
          console.error(error2);
          return;
        }
      }

      toast.success(isDoubleLesson ? 'Doppelstunde hinzugefügt' : 'Stunde hinzugefügt');
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Stunde gelöscht');
      fetchData();
    }
  };

  const getEntryForSlot = (day: number, periodNum: number) => {
    const currentWeekNum = getISOWeek(currentWeekStart);
    const isOddWeek = currentWeekNum % 2 === 1;
    
    return entries.find(e => {
      if (e.day_of_week !== day || e.period !== periodNum) return false;
      if (e.week_type === 'both') return true;
      if (e.week_type === 'odd' && isOddWeek) return true;
      if (e.week_type === 'even' && !isOddWeek) return true;
      return false;
    });
  };

  const getAbsenceForSlot = (date: Date, entry: TimetableEntry | undefined) => {
    if (!entry) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return absences.find(a => a.date === dateStr && a.timetable_entry_id === entry.id);
  };

  const getHomeworkForDay = (date: Date, subjectIdParam: string | null) => {
    if (!subjectIdParam) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return homework.filter(h => h.due_date === dateStr && h.subject_id === subjectIdParam);
  };

  const getSlotColor = (absence: LessonAbsence | null) => {
    if (!absence) return 'bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300';
    if (absence.reason === 'efa') {
      return 'bg-muted border-2 border-red-500 text-muted-foreground';
    }
    if (absence.reason === 'school_project') {
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300';
    }
    return 'bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300';
  };

  // Check if a date is during school holidays (API or custom)
  const getHolidayForDate = (date: Date): { name: string; isCustom?: boolean } | null => {
    const dateToCheck = date;
    
    // Check API holidays
    for (const holiday of holidays) {
      const start = parseISO(holiday.start);
      const end = parseISO(holiday.end);
      
      if (isWithinInterval(dateToCheck, { start, end })) {
        return { name: holiday.name };
      }
    }
    
    // Check custom holidays
    for (const holiday of customHolidays) {
      const start = parseISO(holiday.start_date);
      const end = parseISO(holiday.end_date);
      
      if (isWithinInterval(dateToCheck, { start, end })) {
        return { name: holiday.name, isCustom: true };
      }
    }
    
    return null;
  };

  // Toggle EVA status for a slot
  const toggleEVA = async (entry: TimetableEntry, date: Date) => {
    if (!user) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingAbsence = absences.find(a => a.date === dateStr && a.timetable_entry_id === entry.id);
    
    if (existingAbsence?.reason === 'efa') {
      // Remove EVA
      const { error } = await supabase
        .from('lesson_absences')
        .delete()
        .eq('id', existingAbsence.id);
      
      if (error) {
        toast.error('Fehler beim Entfernen');
      } else {
        toast.success('EVA entfernt');
        fetchData();
      }
    } else if (!existingAbsence) {
      // Add EVA
      const { error } = await supabase
        .from('lesson_absences')
        .insert({
          user_id: user.id,
          timetable_entry_id: entry.id,
          date: dateStr,
          reason: 'efa',
          excused: true,
          description: 'Eigenverantwortliches Arbeiten'
        });
      
      if (error) {
        toast.error('Fehler beim Markieren');
        console.error(error);
      } else {
        toast.success('Als EVA markiert');
        fetchData();
      }
    } else {
      toast.error('Diese Stunde hat bereits eine andere Abwesenheit');
    }
  };

  const getEvaStatusForSlot = (entry: TimetableEntry, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const absence = absences.find(a => a.date === dateStr && a.timetable_entry_id === entry.id);
    return absence?.reason === 'efa';
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'bg-muted text-muted-foreground';
    if (grade >= 13) return 'bg-green-500 text-white';
    if (grade >= 10) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  const isStartOfDouble = (day: number, periodNum: number) => {
    const current = getEntryForSlot(day, periodNum);
    const next = getEntryForSlot(day, periodNum + 1);
    if (!current || !next) return false;
    return current.subject_id === next.subject_id && 
           current.teacher_short === next.teacher_short &&
           current.week_type === next.week_type &&
           periodNum !== 6 && periodNum + 1 !== 7;
  };

  const isSecondOfDouble = (day: number, periodNum: number) => {
    const current = getEntryForSlot(day, periodNum);
    const prev = getEntryForSlot(day, periodNum - 1);
    if (!current || !prev) return false;
    return current.subject_id === prev.subject_id && 
           current.teacher_short === prev.teacher_short &&
           current.week_type === prev.week_type &&
           periodNum !== 7 && periodNum - 1 !== 7;
  };

  const weekDates = DAYS.map((_, i) => addDays(currentWeekStart, i));

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const goToPreviousDay = () => setMobileViewStart(Math.max(0, mobileViewStart - 1));
  const goToNextDay = () => setMobileViewStart(Math.min(2, mobileViewStart + 1));

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (viewMode === 'compact') {
      if (isLeftSwipe && mobileViewStart < 2) {
        setMobileViewStart(mobileViewStart + 1);
      }
      if (isRightSwipe && mobileViewStart > 0) {
        setMobileViewStart(mobileViewStart - 1);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const getVisibleDays = () => {
    if (viewMode === 'full') {
      return [0, 1, 2, 3, 4];
    }
    const start = mobileViewStart;
    return [start, start + 1, start + 2].filter(i => i < 5);
  };

  const visibleDayIndices = getVisibleDays();
  const availablePeriods = PERIOD_STRUCTURE.filter(p => !p.isLunch).map(p => p.period);

  // Calculate average grade
  const allFinalGrades = Object.values(subjectGrades).filter(g => g.finalGrade !== null).map(g => g.finalGrade!);
  const averageGrade = allFinalGrades.length > 0 
    ? Math.round((allFinalGrades.reduce((a, b) => a + b, 0) / allFinalGrades.length) * 10) / 10 
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Stundenplan & Fächer</h2>
            <p className="text-sm text-muted-foreground">Alles an einem Ort</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SubjectsOverviewDialog 
            subjects={subjects} 
            onSubjectEdit={setEditingSubject}
            onSubjectsChanged={fetchData}
          />
          <DefaultFreePeriodDialog onFreePeriodAdded={fetchData} />
          <AddHolidayDialog onHolidayAdded={fetchHolidays} />
          <AddSubjectDialog onSubjectAdded={fetchData} />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Stunde</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Stunde bearbeiten' : 'Stunde hinzufügen'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tag</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stunde</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map(p => (
                          <SelectItem key={p} value={p.toString()}>{p}. Stunde</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {!editingEntry && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doubleLesson"
                      checked={isDoubleLesson}
                      onCheckedChange={(checked) => setIsDoubleLesson(checked as boolean)}
                    />
                    <label
                      htmlFor="doubleLesson"
                      className="text-sm font-medium leading-none"
                    >
                      Doppelstunde
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Wochenrhythmus</Label>
                  <Select value={weekType} onValueChange={setWeekType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Jede Woche</SelectItem>
                      <SelectItem value="odd">Nur A-Woche</SelectItem>
                      <SelectItem value="even">Nur B-Woche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fach</Label>
                  <Select 
                    value={subjectId} 
                    onValueChange={(value) => {
                      setSubjectId(value);
                      const selectedSubject = subjects.find(s => s.id === value);
                      if (selectedSubject) {
                        if (!teacherShort && selectedSubject.teacher_short) {
                          setTeacherShort(selectedSubject.teacher_short);
                        }
                        if (!room && selectedSubject.room) {
                          setRoom(selectedSubject.room);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Fach auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.short_name ? ` (${s.short_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground">Füge zuerst Fächer hinzu.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lehrerkürzel *</Label>
                    <Input
                      value={teacherShort}
                      onChange={(e) => setTeacherShort(e.target.value)}
                      placeholder="z.B. Mü"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Raum</Label>
                    <Input
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="z.B. A201"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} className="flex-1">
                    Speichern
                  </Button>
                  {editingEntry && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleDelete(editingEntry.id);
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <GraduationCap className="h-3.5 w-3.5" />
            Fächer
          </div>
          <div className="text-xl font-bold">{subjects.length}</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Ø Note
          </div>
          <div className={`text-xl font-bold ${averageGrade !== null ? (averageGrade >= 13 ? 'text-green-400' : averageGrade >= 10 ? 'text-yellow-400' : 'text-red-400') : ''}`}>
            {averageGrade !== null ? `${averageGrade} P` : '-'}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <BookOpen className="h-3.5 w-3.5" />
            HA diese Woche
          </div>
          <div className="text-xl font-bold">{homework.filter(h => !h.completed).length}</div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-medium text-sm md:text-base">
            {format(currentWeekStart, 'dd. MMM', { locale: de })} - {format(addDays(currentWeekStart, 4), 'dd. MMM yyyy', { locale: de })}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getISOWeek(currentWeekStart) % 2 === 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {getISOWeek(currentWeekStart) % 2 === 1 ? 'A-Woche' : 'B-Woche'}
            </span>
            <span className="text-xs text-muted-foreground">(KW {getISOWeek(currentWeekStart)})</span>
          </div>
          <Button variant="link" size="sm" onClick={goToCurrentWeek} className="text-muted-foreground text-xs">
            Zur aktuellen Woche
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextWeek} className="shrink-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* View Mode Toggle & Mobile Day Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button 
            variant={viewMode === 'full' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('full')}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Vollansicht</span>
            <span className="sm:hidden">5 Tage</span>
          </Button>
          <Button 
            variant={viewMode === 'compact' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('compact')}
          >
            <Columns3 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Kompakt</span>
            <span className="sm:hidden">3 Tage</span>
          </Button>
        </div>

        {viewMode === 'compact' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={goToPreviousDay} disabled={mobileViewStart === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium min-w-[60px] text-center">
              {DAYS_SHORT[visibleDayIndices[0]]} - {DAYS_SHORT[visibleDayIndices[visibleDayIndices.length - 1]]}
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={goToNextDay} disabled={mobileViewStart >= 2}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-green-500/20 border border-green-500/30" />
          <span>Anwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-cyan-500/10 border border-cyan-500/30" />
          <span>Freistunde</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-muted border-2 border-red-500 relative overflow-hidden">
            <div className="absolute inset-0 w-full h-0.5 bg-red-500 rotate-45 top-1/2 -translate-y-1/2 origin-center" style={{ width: '150%', left: '-25%' }} />
          </div>
          <span>EVA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
          <span>Schulprojekt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-red-500/20 border border-red-500/30" />
          <span>Abwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-teal-500/20 border border-teal-500/30" />
          <span>Ferien</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary flex items-center justify-center text-[8px] md:text-[10px] text-primary-foreground font-bold">P</div>
          <span>Notenpunkte</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        className={viewMode === 'full' ? 'overflow-x-auto' : 'touch-pan-y'}
        onTouchStart={viewMode === 'compact' ? handleTouchStart : undefined}
        onTouchMove={viewMode === 'compact' ? handleTouchMove : undefined}
        onTouchEnd={viewMode === 'compact' ? handleTouchEnd : undefined}
      >
        <div className={viewMode === 'full' ? 'min-w-[700px]' : ''}>
          <div className={`grid gap-1 ${viewMode === 'full' ? 'grid-cols-6' : 'grid-cols-4'}`}>
            {/* Header row */}
            <div className="p-1 md:p-2 font-medium text-center text-muted-foreground text-xs md:text-sm">Std.</div>
            {visibleDayIndices.map((i) => (
              <div key={i} className="p-1 md:p-2 font-medium text-center text-xs md:text-sm bg-muted/50 rounded-t-lg">
                <div>{DAYS_SHORT[i]}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">{format(weekDates[i], 'dd.MM')}</div>
              </div>
            ))}

            {/* Period rows with breaks */}
            {PERIOD_STRUCTURE.map((periodInfo, idx) => (
              <>
                {periodInfo.isLunch ? (
                  <div key={`lunch-${idx}`} className={viewMode === 'full' ? 'col-span-6' : 'col-span-4'} style={{ gridColumn: viewMode === 'full' ? 'span 6' : 'span 4' }}>
                    <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 bg-amber-500/10 rounded-lg border border-amber-500/20 my-1">
                      <UtensilsCrossed className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                      <span className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">Mittag</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div key={`period-${periodInfo.period}`} className="p-1 md:p-2 text-center text-muted-foreground text-xs md:text-sm flex items-center justify-center">
                      {periodInfo.period}.
                    </div>
                    {visibleDayIndices.map((dayIndex) => {
                      const date = weekDates[dayIndex];
                      const holiday = getHolidayForDate(date);
                      
                      // If it's a holiday, show holiday card
                      if (holiday) {
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className="p-1 md:p-2 min-h-[45px] md:min-h-[60px] flex flex-col justify-center items-center text-center bg-teal-500/20 border border-teal-500/30"
                          >
                            <Palmtree className="w-3 h-3 md:w-4 md:h-4 text-teal-600 mb-0.5" />
                            <span className="text-[8px] md:text-[10px] font-medium text-teal-700 dark:text-teal-300 line-clamp-2">
                              {holiday.name}
                            </span>
                          </Card>
                        );
                      }
                      
                      const entry = getEntryForSlot(dayIndex + 1, periodInfo.period);
                      const absence = getAbsenceForSlot(date, entry);
                      const dayHomework = entry ? getHomeworkForDay(date, entry.subject_id) : [];
                      const isDoubleStart = isStartOfDouble(dayIndex + 1, periodInfo.period);
                      const isDoubleSecond = isSecondOfDouble(dayIndex + 1, periodInfo.period);
                      
                      if (isDoubleSecond) return null;
                      
                      if (!entry) {
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className="p-1 md:p-2 min-h-[45px] md:min-h-[60px] flex flex-col justify-center items-center text-center bg-card/30 border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setDayOfWeek((dayIndex + 1).toString());
                              setPeriod(periodInfo.period.toString());
                              setDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/30" />
                          </Card>
                        );
                      }

                      // Check if this is a default free period
                      const isDefaultFreePeriod = entry.teacher_short === 'FREI' && !entry.subject_id;

                      if (isDefaultFreePeriod) {
                        const isDoubleFreePeriod = isDoubleStart;
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className={`p-1 md:p-2 flex flex-col justify-center items-center text-center bg-cyan-500/10 border border-cyan-500/30 ${isDoubleFreePeriod ? 'min-h-[90px] md:min-h-[120px] row-span-2' : 'min-h-[45px] md:min-h-[60px]'}`}
                            style={isDoubleFreePeriod ? { gridRow: 'span 2' } : undefined}
                          >
                            <Coffee className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 mb-0.5" />
                            <span className="text-[9px] md:text-xs font-medium text-cyan-700 dark:text-cyan-300">
                              Freistunde
                            </span>
                            {entry.week_type !== 'both' && (
                              <span className="text-[8px] md:text-[10px] mt-0.5 px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-600">
                                {entry.week_type === 'odd' ? 'A' : 'B'}
                              </span>
                            )}
                          </Card>
                        );
                      }

                      const subjectGrade = entry.subject_id ? subjectGrades[entry.subject_id] : null;
                      const finalGrade = subjectGrade?.finalGrade;

                      if (isDoubleStart) {
                        const nextAbsence = getAbsenceForSlot(date, getEntryForSlot(dayIndex + 1, periodInfo.period + 1));
                        const nextHomework = getHomeworkForDay(date, entry.subject_id);
                        const totalHomework = [...dayHomework, ...nextHomework.filter(h => !dayHomework.some(d => d.id === h.id))];
                        const worstAbsence = absence || nextAbsence;
                        const isExcused = worstAbsence?.excused;
                        const isEfa = worstAbsence?.reason === 'efa';
                        
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className={`p-1 md:p-2 min-h-[90px] md:min-h-[120px] flex flex-col justify-center text-center cursor-pointer transition-all hover:scale-[1.02] border row-span-2 relative ${getSlotColor(worstAbsence)}`}
                            style={{ gridRow: 'span 2' }}
                            onClick={() => openSubjectDetail(entry, date)}
                          >
                            {/* Grade indicator top-left */}
                            {finalGrade !== null && (
                              <div className={`absolute top-0.5 left-0.5 md:top-1 md:left-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[9px] md:text-[11px] font-bold ${getGradeColor(finalGrade)}`}>
                                {finalGrade}
                              </div>
                            )}
                            {/* Excused/Not excused indicator top-right */}
                            {worstAbsence && (
                              <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                                {isExcused ? (
                                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                                )}
                              </div>
                            )}
                            {/* Red diagonal strikethrough for EVA */}
                            {isEfa && (
                              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                                <div className="absolute top-1/2 left-1/2 w-[150%] h-0.5 bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-45" />
                              </div>
                            )}
                            <div className={`flex flex-col items-center gap-0.5 ${isEfa ? 'opacity-40' : ''}`}>
                              <span className="font-semibold text-[10px] md:text-sm truncate block max-w-full">
                                {entry.subjects?.short_name || entry.subjects?.name?.slice(0, 4) || '-'}
                              </span>
                              {isEfa ? (
                                <span className="text-[9px] md:text-xs font-bold text-red-500">EVA</span>
                              ) : (
                                <>
                                  <span className="text-[9px] md:text-xs opacity-70">{entry.teacher_short}</span>
                                  {viewMode === 'full' && entry.room && <span className="text-[9px] md:text-xs opacity-50">{entry.room}</span>}
                                </>
                              )}
                              {entry.week_type !== 'both' && (
                                <span className="text-[8px] md:text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary">
                                  {entry.week_type === 'odd' ? 'A' : 'B'}
                                </span>
                              )}
                            </div>
                            {totalHomework.length > 0 && (
                              <div className="flex items-center justify-center gap-0.5 mt-1">
                                <BookOpen className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-500" />
                                <span className="text-[9px] md:text-xs text-blue-500">{totalHomework.length}</span>
                              </div>
                            )}
                          </Card>
                        );
                      }

                      // Single lesson
                      const isEfaSingle = absence?.reason === 'efa';
                      
                      return (
                        <Card
                          key={`${dayIndex}-${periodInfo.period}`}
                          className={`p-1 md:p-2 min-h-[45px] md:min-h-[60px] flex flex-col justify-between text-center cursor-pointer transition-all hover:scale-[1.02] border relative ${getSlotColor(absence)}`}
                          onClick={() => openSubjectDetail(entry, date)}
                        >
                          {/* Grade indicator top-left */}
                          {finalGrade !== null && (
                            <div className={`absolute top-0.5 left-0.5 md:top-1 md:left-1 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold ${getGradeColor(finalGrade)}`}>
                              {finalGrade}
                            </div>
                          )}
                          {/* Excused/Not excused indicator top-right (not for EFA) */}
                          {absence && !isEfaSingle && (
                            <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                              {absence.excused ? (
                                <CheckCircle2 className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-green-500" />
                              ) : (
                                <XCircle className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-orange-500" />
                              )}
                            </div>
                          )}
                          {/* Red diagonal strikethrough for EVA */}
                          {isEfaSingle && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                              <div className="absolute top-1/2 left-1/2 w-[150%] h-0.5 bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-45" />
                            </div>
                          )}
                          <div className={isEfaSingle ? 'opacity-40' : ''}>
                            <span className="font-medium text-[10px] md:text-xs truncate block">
                              {entry.subjects?.short_name || entry.subjects?.name?.slice(0, 4) || '-'}
                            </span>
                            {isEfaSingle ? (
                              <span className="text-[9px] md:text-xs font-bold text-red-500">EVA</span>
                            ) : (
                              <span className="text-[9px] md:text-xs opacity-70">{entry.teacher_short}</span>
                            )}
                            {entry.week_type !== 'both' && (
                              <span className="text-[8px] md:text-[10px] ml-0.5 px-0.5 py-0.5 rounded bg-primary/20 text-primary">
                                {entry.week_type === 'odd' ? 'A' : 'B'}
                              </span>
                            )}
                          </div>
                          {dayHomework.length > 0 && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <BookOpen className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                              <span className="text-[9px] md:text-xs text-blue-500">{dayHomework.length}</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}

                    {periodInfo.showBreakAfter && (
                      <div key={`break-${periodInfo.period}`} className={viewMode === 'full' ? 'col-span-6' : 'col-span-4'} style={{ gridColumn: viewMode === 'full' ? 'span 6' : 'span 4' }}>
                        <div className="flex items-center justify-center gap-1 py-1 bg-muted/50 rounded border border-border/30 my-0.5">
                          <Coffee className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                          <span className="text-[9px] md:text-xs text-muted-foreground">Pause</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Detail Sheet */}
      <Sheet open={subjectSheetOpen} onOpenChange={setSubjectSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2 flex-1 min-w-0">
                <GraduationCap className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="truncate">{selectedSubject?.name}</span>
                {selectedSubject?.short_name && (
                  <span className="text-muted-foreground font-normal shrink-0">({selectedSubject.short_name})</span>
                )}
              </SheetTitle>
              <div className="flex gap-1 shrink-0">
                {/* EVA Toggle Button */}
                {selectedSlotEntry && selectedSlotDate && (
                  <Button 
                    variant={getEvaStatusForSlot(selectedSlotEntry, selectedSlotDate) ? 'destructive' : 'outline'}
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => toggleEVA(selectedSlotEntry, selectedSlotDate)}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    EVA
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => selectedSubject && setEditingSubject(selectedSubject)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => selectedSlotEntry && openEdit(selectedSlotEntry)}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Show which slot/date this is for */}
            {selectedSlotDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(selectedSlotDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
                {getEvaStatusForSlot(selectedSlotEntry!, selectedSlotDate) && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    EVA - Freistunde
                  </Badge>
                )}
              </p>
            )}
          </SheetHeader>
          <div className="mt-4">
            {selectedSubject && (
              <SubjectCard 
                subject={selectedSubject}
                onDeleted={() => { setSubjectSheetOpen(false); setSelectedSubject(null); fetchData(); }}
                onDataChanged={fetchData}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Subject Dialog */}
      {editingSubject && (
        <EditSubjectDialog
          subject={editingSubject}
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
          onSubjectUpdated={() => {
            fetchData();
            if (editingSubject.id === selectedSubject?.id) {
              supabase
                .from('subjects')
                .select('*')
                .eq('id', editingSubject.id)
                .single()
                .then(({ data }) => {
                  if (data) setSelectedSubject(data);
                });
            }
          }}
        />
      )}
    </div>
  );
}
