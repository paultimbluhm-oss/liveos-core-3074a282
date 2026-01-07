import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, GraduationCap, TrendingUp, Calendar, Clock, Settings } from 'lucide-react';
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
import { SubjectActionSheet } from './SubjectActionSheet';

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
}

interface CustomHoliday {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface UnifiedTimetableSectionProps {
  onBack: () => void;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export function UnifiedTimetableSection({ onBack }: UnifiedTimetableSectionProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, SubjectGradeData>>({});
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [gradeColorSettings, setGradeColorSettings] = useState<{ green_min: number; yellow_min: number }>({ green_min: 13, yellow_min: 10 });
  const [gradeSettingsOpen, setGradeSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  
  const [currentDay, setCurrentDay] = useState(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 ? today - 1 : 0;
  });
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [period, setPeriod] = useState('1');
  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherShort, setTeacherShort] = useState('');
  const [room, setRoom] = useState('');
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);
  const [weekType, setWeekType] = useState<string>('both');

  const currentWeekNum = getISOWeek(currentWeekStart);
  const isOddWeek = currentWeekNum % 2 === 1;

  const fetchData = async () => {
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [entriesRes, subjectsRes, absencesRes, gradesRes, gradeSettingsRes] = await Promise.all([
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
        .from('grades')
        .select('points, grade_type, subject_id')
        .eq('user_id', user.id),
      supabase
        .from('grade_color_settings')
        .select('green_min, yellow_min')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    setEntries(entriesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setAbsences(absencesRes.data || []);
    
    if (gradeSettingsRes.data) {
      setGradeColorSettings(gradeSettingsRes.data);
    }

    if (gradesRes.data && subjectsRes.data) {
      const gradeDataResult: Record<string, SubjectGradeData> = {};
      const subjectGradeMap: Record<string, { oral: number[], written: number[], weights: { oral: number, written: number } }> = {};
      
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

        gradeDataResult[subjectId] = { subjectId, finalGrade, oralAvg, writtenAvg };
      });

      setSubjectGrades(gradeDataResult);
    }

    setLoading(false);
  };

  const fetchHolidays = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-school-holidays', {
        body: { stateCode: 'NI' },
      });
      
      if (!error && data?.holidays) {
        setHolidays(data.holidays);
      }
      
      const { data: customData } = await supabase
        .from('custom_holidays')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date');
      
      if (customData) {
        setCustomHolidays(customData);
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

  const handleSubmit = async () => {
    if (!user) return;
    if (!teacherShort.trim()) {
      toast.error('Lehrerkürzel fehlt');
      return;
    }

    const periodNum = parseInt(period);
    const dayNum = parseInt(dayOfWeek);

    if (periodNum === 7) {
      toast.error('7. Stunde ist Pause');
      return;
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
      } else {
        toast.success('Gespeichert');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      // Check if entry already exists for this slot
      const existingEntry = entries.find(e => 
        e.day_of_week === dayNum && 
        e.period === periodNum && 
        (e.week_type === weekType || e.week_type === 'both' || weekType === 'both')
      );

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('timetable_entries')
          .update({ ...baseData, period: periodNum })
          .eq('id', existingEntry.id);

        if (error) {
          toast.error('Fehler beim Speichern');
          return;
        }
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('timetable_entries')
          .insert({ ...baseData, period: periodNum });

        if (error) {
          toast.error('Fehler beim Speichern');
          return;
        }
      }

      // Handle double lesson
      if (isDoubleLesson && periodNum + 1 !== 7 && periodNum < 9) {
        const nextPeriod = periodNum + 1;
        const existingNext = entries.find(e => 
          e.day_of_week === dayNum && 
          e.period === nextPeriod && 
          (e.week_type === weekType || e.week_type === 'both' || weekType === 'both')
        );

        if (existingNext) {
          await supabase
            .from('timetable_entries')
            .update({ ...baseData, period: nextPeriod })
            .eq('id', existingNext.id);
        } else {
          await supabase
            .from('timetable_entries')
            .insert({ ...baseData, period: nextPeriod });
        }
      }

      toast.success('Hinzugefügt');
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('timetable_entries').delete().eq('id', id);
    if (!error) {
      toast.success('Gelöscht');
      fetchData();
    }
  };

  const getEntryForSlot = (day: number, periodNum: number) => {
    return entries.find(e => {
      if (e.day_of_week !== day || e.period !== periodNum) return false;
      if (e.week_type === 'both') return true;
      if (e.week_type === 'odd' && isOddWeek) return true;
      if (e.week_type === 'even' && !isOddWeek) return true;
      return false;
    });
  };

  const getHolidayForDate = (date: Date): string | null => {
    for (const holiday of holidays) {
      if (isWithinInterval(date, { start: parseISO(holiday.start), end: parseISO(holiday.end) })) {
        return holiday.name;
      }
    }
    for (const holiday of customHolidays) {
      if (isWithinInterval(date, { start: parseISO(holiday.start_date), end: parseISO(holiday.end_date) })) {
        return holiday.name;
      }
    }
    return null;
  };

  const weekDates = DAYS.map((_, i) => addDays(currentWeekStart, i));
  const currentDate = weekDates[currentDay];
  const holidayName = getHolidayForDate(currentDate);

  const allFinalGrades = Object.values(subjectGrades).filter(g => g.finalGrade !== null).map(g => g.finalGrade!);
  const averageGrade = allFinalGrades.length > 0 
    ? Math.round((allFinalGrades.reduce((a, b) => a + b, 0) / allFinalGrades.length) * 10) / 10 
    : null;

  // Get all entries for the current day (including free periods)
  const todayEntries = entries.filter(e => {
    if (e.day_of_week !== currentDay + 1) return false;
    if (e.week_type === 'both') return true;
    if (e.week_type === 'odd' && isOddWeek) return true;
    if (e.week_type === 'even' && !isOddWeek) return true;
    return false;
  }).sort((a, b) => a.period - b.period);

  // Lessons for stats (excluding free periods)
  const todayLessons = todayEntries.filter(e => !(e.teacher_short === 'FREI' && !e.subject_id));

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'bg-muted text-muted-foreground';
    if (grade >= gradeColorSettings.green_min) return 'bg-emerald-500 text-white';
    if (grade >= gradeColorSettings.yellow_min) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const saveGradeColorSettings = async (greenMin: number, yellowMin: number) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('grade_color_settings')
      .upsert({ 
        user_id: user.id, 
        green_min: greenMin, 
        yellow_min: yellowMin,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (!error) {
      setGradeColorSettings({ green_min: greenMin, yellow_min: yellowMin });
      toast.success('Einstellungen gespeichert');
      setGradeSettingsOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Stundenplan</h2>
          </div>
        </div>
        <div className="flex gap-1.5">
          <SubjectsOverviewDialog 
            subjects={subjects} 
            onSubjectEdit={setEditingSubject}
            onSubjectsChanged={fetchData}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 px-2.5">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Bearbeiten' : 'Stunde hinzufügen'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tag</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_FULL.map((day, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Stunde</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIODS.map(p => (
                          <SelectItem key={p} value={p.toString()}>{p}.</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {!editingEntry && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="double" checked={isDoubleLesson} onCheckedChange={(c) => setIsDoubleLesson(!!c)} />
                    <label htmlFor="double" className="text-sm">Doppelstunde</label>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Wochenrhythmus</Label>
                  <Select value={weekType} onValueChange={setWeekType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Jede Woche</SelectItem>
                      <SelectItem value="odd">A-Woche</SelectItem>
                      <SelectItem value="even">B-Woche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Fach</Label>
                  <Select 
                    value={subjectId} 
                    onValueChange={(value) => {
                      setSubjectId(value);
                      const s = subjects.find(x => x.id === value);
                      if (s) {
                        if (!teacherShort && s.teacher_short) setTeacherShort(s.teacher_short);
                        if (!room && s.room) setRoom(s.room);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.short_name ? ` (${s.short_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Lehrer *</Label>
                    <Input value={teacherShort} onChange={(e) => setTeacherShort(e.target.value)} className="h-9" placeholder="Kürzel" />
                  </div>
                  <div>
                    <Label className="text-xs">Raum</Label>
                    <Input value={room} onChange={(e) => setRoom(e.target.value)} className="h-9" placeholder="A101" />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSubmit} className="flex-1 h-10">Speichern</Button>
                  {editingEntry && (
                    <Button variant="destructive" size="icon" className="h-10 w-10" onClick={() => { handleDelete(editingEntry.id); setDialogOpen(false); }}>
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
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{subjects.length}</p>
          <p className="text-[10px] text-muted-foreground">Fächer</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{todayLessons.length}</p>
          <p className="text-[10px] text-muted-foreground">Heute</p>
        </div>
        <div className={`p-3 rounded-xl text-center ${averageGrade !== null && averageGrade >= 10 ? 'bg-emerald-500/10' : averageGrade !== null ? 'bg-amber-500/10' : 'bg-secondary/40'}`}>
          <p className={`text-xl font-bold ${averageGrade !== null && averageGrade >= 10 ? 'text-emerald-500' : averageGrade !== null ? 'text-amber-500' : ''}`}>
            {averageGrade !== null ? averageGrade : '-'}
          </p>
          <p className="text-[10px] text-muted-foreground">Schnitt</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 bg-card rounded-xl p-2 border border-border/50">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="text-sm font-medium">
            {format(currentWeekStart, 'dd.MM.', { locale: de })} - {format(addDays(currentWeekStart, 4), 'dd.MM.yy', { locale: de })}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isOddWeek ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {isOddWeek ? 'A' : 'B'}
            </span>
            <span className="text-[10px] text-muted-foreground">KW {currentWeekNum}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => {
          const isSelected = i === currentDay;
          const date = weekDates[i];
          const isHoliday = !!getHolidayForDate(date);
          return (
            <button
              key={day}
              onClick={() => setCurrentDay(i)}
              className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : isHoliday 
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-secondary/40 hover:bg-secondary/60'
              }`}
            >
              <div className="text-xs font-medium">{day}</div>
              <div className="text-[10px] opacity-70">{format(date, 'd')}</div>
            </button>
          );
        })}
      </div>

      {/* Holiday Banner */}
      {holidayName && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-sm font-medium text-emerald-600">{holidayName}</p>
        </div>
      )}

      {/* Day Schedule */}
      <div className="space-y-1.5">
        {todayEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Stunden eingetragen</p>
          </div>
        ) : (
          todayEntries.map((entry) => {
            const isFree = entry.teacher_short === 'FREI' && !entry.subject_id;
            const grade = entry.subject_id ? subjectGrades[entry.subject_id]?.finalGrade : null;
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const evaAbsence = absences.find(a => a.timetable_entry_id === entry.id && a.date === dateStr && a.reason === 'efa');
            const isEVA = !!evaAbsence;
            
            return (
              <div 
                key={entry.id}
                onClick={() => {
                  setSelectedEntry(entry);
                  setActionSheetOpen(true);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isEVA
                    ? 'bg-purple-500/10 border-purple-500/40 ring-2 ring-purple-500/50'
                    : isFree 
                      ? 'bg-muted/30 border-border/30' 
                      : 'bg-card border-border/50 hover:border-primary/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isEVA ? 'bg-purple-500 text-white' : isFree ? 'bg-muted/50 text-muted-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {entry.period}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm truncate ${isEVA ? 'line-through text-purple-400' : isFree ? 'text-muted-foreground' : ''}`}>
                      {isFree ? 'Freistunde' : (entry.subjects?.short_name || entry.subjects?.name || entry.teacher_short)}
                    </span>
                    {isEVA && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-medium">
                        EVA
                      </span>
                    )}
                    {entry.week_type !== 'both' && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        {entry.week_type === 'odd' ? 'A' : 'B'}
                      </span>
                    )}
                  </div>
                  {!isFree && (
                    <div className={`flex items-center gap-2 text-[10px] ${isEVA ? 'text-purple-400/70' : 'text-muted-foreground'}`}>
                      {entry.room && <span>{entry.room}</span>}
                      <span>{entry.teacher_short}</span>
                    </div>
                  )}
                </div>
                {grade !== null && !isEVA && (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeColor(grade)}`}>
                    {grade}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-2 pt-2">
        <AddSubjectDialog onSubjectAdded={fetchData} />
        <DefaultFreePeriodDialog onFreePeriodAdded={fetchData} />
        <AddHolidayDialog onHolidayAdded={fetchHolidays} />
        <Dialog open={gradeSettingsOpen} onOpenChange={setGradeSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Settings className="w-4 h-4" />
              Notenfarben
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Notenfarben einstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-emerald-500" />
                <div className="flex-1">
                  <Label className="text-xs">ab Punkten</Label>
                  <Input
                    type="number"
                    min="0"
                    max="15"
                    defaultValue={gradeColorSettings.green_min}
                    id="greenMin"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-amber-500" />
                <div className="flex-1">
                  <Label className="text-xs">ab Punkten</Label>
                  <Input
                    type="number"
                    min="0"
                    max="15"
                    defaultValue={gradeColorSettings.yellow_min}
                    id="yellowMin"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-rose-500" />
                <span className="text-sm text-muted-foreground">darunter</span>
              </div>
              <Button 
                className="w-full"
                onClick={() => {
                  const greenMin = parseInt((document.getElementById('greenMin') as HTMLInputElement).value) || 13;
                  const yellowMin = parseInt((document.getElementById('yellowMin') as HTMLInputElement).value) || 10;
                  saveGradeColorSettings(greenMin, yellowMin);
                }}
              >
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subject Sheet */}
      <Sheet open={subjectSheetOpen} onOpenChange={setSubjectSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedSubject?.name}</SheetTitle>
          </SheetHeader>
          {selectedSubject && (
            <SubjectCard 
              subject={selectedSubject}
              onDeleted={() => {
                setSubjectSheetOpen(false);
                fetchData();
              }}
              onDataChanged={fetchData}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Subject Dialog */}
      {editingSubject && (
        <EditSubjectDialog 
          subject={editingSubject}
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
          onSubjectUpdated={() => {
            setEditingSubject(null);
            fetchData();
          }}
        />
      )}

      {/* Subject Action Sheet */}
      <SubjectActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        entry={selectedEntry}
        onDataChanged={fetchData}
        onEditEntry={() => {
          if (selectedEntry) {
            openEdit(selectedEntry);
          }
        }}
        currentDate={currentDate}
        existingEvaId={selectedEntry ? absences.find(a => a.timetable_entry_id === selectedEntry.id && a.date === format(currentDate, 'yyyy-MM-dd') && a.reason === 'efa')?.id : null}
      />
    </div>
  );
}
