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
import { ArrowLeft, Trash2, ChevronLeft, ChevronRight, GraduationCap, Calendar, Clock, Settings, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { format, addWeeks, subWeeks, startOfWeek, addDays, getISOWeek, isWithinInterval, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddHolidayDialog } from './AddHolidayDialog';
import { SubjectActionSheet } from './SubjectActionSheet';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  subject_id: string | null;
  course_id: string | null;
  teacher_short: string;
  room: string | null;
  week_type: string;
  course?: {
    id: string;
    name: string;
    short_name: string | null;
    teacher_name: string | null;
    color: string | null;
  } | null;
}

interface LessonAbsence {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  timetable_entry_id: string;
}

interface SubjectGradeData {
  courseId: string;
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
  const [courseGrades, setCourseGrades] = useState<Record<string, SubjectGradeData>>({});
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [gradeColorSettings, setGradeColorSettings] = useState<{ green_min: number; yellow_min: number }>({ green_min: 13, yellow_min: 10 });
  const [gradeSettingsOpen, setGradeSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Free period dialog
  const [freePeriodDialogOpen, setFreePeriodDialogOpen] = useState(false);
  const [fpDayOfWeek, setFpDayOfWeek] = useState('1');
  const [fpPeriod, setFpPeriod] = useState('1');
  const [fpIsDouble, setFpIsDouble] = useState(false);
  const [fpWeekType, setFpWeekType] = useState('both');
  
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  
  const [currentDay, setCurrentDay] = useState(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 ? today - 1 : 0;
  });
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const currentWeekNum = getISOWeek(currentWeekStart);
  const isOddWeek = currentWeekNum % 2 === 1;

  const fetchData = async () => {
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [entriesRes, absencesRes, gradesRes, gradeSettingsRes] = await Promise.all([
      supabase
        .from('timetable_entries')
        .select('*, courses:course_id(id, name, short_name, teacher_name, color)')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('period'),
      supabase
        .from('lesson_absences')
        .select('id, date, reason, excused, timetable_entry_id')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
      supabase
        .from('grades')
        .select('points, grade_type, course_id')
        .eq('user_id', user.id)
        .not('course_id', 'is', null),
      supabase
        .from('grade_color_settings')
        .select('green_min, yellow_min')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const mappedEntries = (entriesRes.data || []).map((e: any) => ({
      ...e,
      course: e.courses,
    }));
    setEntries(mappedEntries);
    setAbsences(absencesRes.data || []);
    
    if (gradeSettingsRes.data) {
      setGradeColorSettings(gradeSettingsRes.data);
    }

    // Calculate grades per course
    if (gradesRes.data) {
      const gradeDataResult: Record<string, SubjectGradeData> = {};
      const courseGradeMap: Record<string, { oral: number[], written: number[] }> = {};
      
      gradesRes.data.forEach(grade => {
        if (!grade.course_id) return;
        if (!courseGradeMap[grade.course_id]) {
          courseGradeMap[grade.course_id] = { oral: [], written: [] };
        }
        if (grade.grade_type === 'oral') {
          courseGradeMap[grade.course_id].oral.push(grade.points);
        } else {
          courseGradeMap[grade.course_id].written.push(grade.points);
        }
      });

      Object.entries(courseGradeMap).forEach(([courseId, { oral, written }]) => {
        const oralAvg = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : null;
        const writtenAvg = written.length > 0 ? written.reduce((a, b) => a + b, 0) / written.length : null;

        let finalGrade: number | null = null;
        if (oralAvg !== null && writtenAvg !== null) {
          finalGrade = Math.round((writtenAvg * 50 + oralAvg * 50) / 100);
        } else if (oralAvg !== null) {
          finalGrade = Math.round(oralAvg);
        } else if (writtenAvg !== null) {
          finalGrade = Math.round(writtenAvg);
        }

        gradeDataResult[courseId] = { courseId, finalGrade, oralAvg, writtenAvg };
      });

      setCourseGrades(gradeDataResult);
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

  const handleAddFreePeriod = async () => {
    if (!user) return;

    const dayNum = parseInt(fpDayOfWeek);
    const periodNum = parseInt(fpPeriod);

    // Check for existing entry
    const { data: existing } = await supabase
      .from('timetable_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_of_week', dayNum)
      .eq('period', periodNum)
      .eq('week_type', fpWeekType)
      .maybeSingle();

    if (existing) {
      // Update to free period
      await supabase
        .from('timetable_entries')
        .update({
          teacher_short: 'FREI',
          subject_id: null,
          course_id: null,
          room: null,
        })
        .eq('id', existing.id);
    } else {
      // Insert free period
      await supabase.from('timetable_entries').insert({
        user_id: user.id,
        day_of_week: dayNum,
        period: periodNum,
        teacher_short: 'FREI',
        week_type: fpWeekType,
      });
    }

    // Handle double period
    if (fpIsDouble && periodNum < 9 && periodNum !== 6) {
      const nextPeriod = periodNum === 6 ? 8 : periodNum + 1;
      
      const { data: existingNext } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('day_of_week', dayNum)
        .eq('period', nextPeriod)
        .eq('week_type', fpWeekType)
        .maybeSingle();

      if (existingNext) {
        await supabase
          .from('timetable_entries')
          .update({
            teacher_short: 'FREI',
            subject_id: null,
            course_id: null,
            room: null,
          })
          .eq('id', existingNext.id);
      } else {
        await supabase.from('timetable_entries').insert({
          user_id: user.id,
          day_of_week: dayNum,
          period: nextPeriod,
          teacher_short: 'FREI',
          week_type: fpWeekType,
        });
      }
    }

    toast.success('Freistunde hinzugefuegt');
    setFreePeriodDialogOpen(false);
    setFpDayOfWeek('1');
    setFpPeriod('1');
    setFpIsDouble(false);
    setFpWeekType('both');
    fetchData();
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from('timetable_entries').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
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

  // Get all entries for the current day
  const todayEntries = entries.filter(e => {
    if (e.day_of_week !== currentDay + 1) return false;
    if (e.week_type === 'both') return true;
    if (e.week_type === 'odd' && isOddWeek) return true;
    if (e.week_type === 'even' && !isOddWeek) return true;
    return false;
  }).sort((a, b) => a.period - b.period);

  // Lessons for stats (excluding free periods)
  const todayLessons = todayEntries.filter(e => !(e.teacher_short === 'FREI' && !e.course_id));

  // Count unique courses
  const uniqueCourseIds = new Set(entries.filter(e => e.course_id).map(e => e.course_id));
  const courseCount = uniqueCourseIds.size;

  // Calculate average grade from courses
  const allFinalGrades = Object.values(courseGrades).filter(g => g.finalGrade !== null).map(g => g.finalGrade!);
  const averageGrade = allFinalGrades.length > 0 
    ? Math.round((allFinalGrades.reduce((a, b) => a + b, 0) / allFinalGrades.length) * 10) / 10 
    : null;

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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{courseCount}</p>
          <p className="text-[10px] text-muted-foreground">Kurse</p>
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
            <p className="text-[10px] text-muted-foreground/60">Tritt einem Kurs bei, um Stunden zu sehen</p>
          </div>
        ) : (
          todayEntries.map((entry) => {
            const isFree = entry.teacher_short === 'FREI' && !entry.course_id;
            const grade = entry.course_id ? courseGrades[entry.course_id]?.finalGrade : null;
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
                      {isFree ? 'Freistunde' : (entry.course?.short_name || entry.course?.name || entry.teacher_short)}
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
                      <span>{entry.course?.teacher_name || entry.teacher_short}</span>
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

      {/* Bottom Actions - Only Free Period and Holiday */}
      <div className="flex gap-2 pt-2">
        {/* Free Period Dialog */}
        <Dialog open={freePeriodDialogOpen} onOpenChange={setFreePeriodDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 flex-1">
              <Coffee className="w-4 h-4" strokeWidth={1.5} />
              Freistunde
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Freistunde hinzufuegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tag</Label>
                  <Select value={fpDayOfWeek} onValueChange={setFpDayOfWeek}>
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
                  <Select value={fpPeriod} onValueChange={setFpPeriod}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODS.map(p => (
                        <SelectItem key={p} value={p.toString()}>{p}.</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox id="fpDouble" checked={fpIsDouble} onCheckedChange={(c) => setFpIsDouble(!!c)} />
                <label htmlFor="fpDouble" className="text-sm">Doppelstunde</label>
              </div>
              
              <div>
                <Label className="text-xs">Wochenrhythmus</Label>
                <Select value={fpWeekType} onValueChange={setFpWeekType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Jede Woche</SelectItem>
                    <SelectItem value="odd">A-Woche</SelectItem>
                    <SelectItem value="even">B-Woche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleAddFreePeriod} className="w-full">
                Hinzufuegen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <AddHolidayDialog onHolidayAdded={fetchHolidays} />
        
        {/* Grade Color Settings */}
        <Dialog open={gradeSettingsOpen} onOpenChange={setGradeSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-2.5">
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Notenfarben</DialogTitle>
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

      {/* Subject Action Sheet for local adjustments */}
      <SubjectActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        entry={selectedEntry as any}
        onDataChanged={fetchData}
        onEditEntry={() => {
          // Local edit - just delete option for now
          if (selectedEntry) {
            handleDeleteEntry(selectedEntry.id);
            setActionSheetOpen(false);
          }
        }}
        currentDate={currentDate}
        existingEvaId={selectedEntry ? absences.find(a => a.timetable_entry_id === selectedEntry.id && a.date === format(currentDate, 'yyyy-MM-dd') && a.reason === 'efa')?.id : null}
      />
    </div>
  );
}
