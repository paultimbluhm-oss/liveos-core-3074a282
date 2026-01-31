import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Course, CourseTimetableSlot } from '@/components/schule/schools/types';
import { Scope, SemesterInfo } from '@/hooks/useSchoolScope';
import { LESSON_TIMES } from '@/components/calendar/types';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, eachDayOfInterval, isToday, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  course_id: string | null;
  teacher_short: string | null;
  room: string | null;
  week_type: string;
}

interface TimetableOverride {
  id: string;
  date: string;
  period: number;
  override_type: string;
  label: string | null;
}

interface ScopedTimetableProps {
  scope: Scope;
  semesterEntity: SemesterInfo | null;
  courses: Course[];
  courseSlots: CourseTimetableSlot[];
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export function ScopedTimetable({
  scope,
  semesterEntity,
  courses,
  courseSlots,
}: ScopedTimetableProps) {
  const { user } = useAuth();
  
  // Woche-Navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  // Stundenplan-Eintraege
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [courseGrades, setCourseGrades] = useState<Map<string, number>>(new Map());
  const [gradeColors, setGradeColors] = useState({ green_min: 13, yellow_min: 10 });

  // Woche-Berechnung
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekType: 'A' | 'B' = weekNumber % 2 === 0 ? 'B' : 'A';
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).slice(0, 5);
  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Lade Stundenplan-Eintraege
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('period');
      
      if (data) setEntries(data);
    };
    
    loadEntries();
  }, [user, scope, courseSlots]);

  // Lade Overrides fuer die aktuelle Woche
  useEffect(() => {
    const loadOverrides = async () => {
      if (!user) return;
      
      const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('timetable_overrides')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEndStr);
      
      if (data) setOverrides(data);
    };
    
    loadOverrides();
  }, [user, currentWeekStart]);

  // Lade Noten und Farb-Einstellungen
  useEffect(() => {
    const loadGrades = async () => {
      if (!user) return;
      
      const [gradesRes, colorsRes] = await Promise.all([
        supabase
          .from('grades')
          .select('course_id, points')
          .eq('user_id', user.id)
          .not('course_id', 'is', null),
        supabase
          .from('grade_color_settings')
          .select('green_min, yellow_min')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      
      if (gradesRes.data) {
        const courseMap = new Map<string, number[]>();
        gradesRes.data.forEach(g => {
          if (g.course_id) {
            if (!courseMap.has(g.course_id)) courseMap.set(g.course_id, []);
            courseMap.get(g.course_id)!.push(g.points);
          }
        });
        
        const avgMap = new Map<string, number>();
        courseMap.forEach((points, courseId) => {
          avgMap.set(courseId, points.reduce((a, b) => a + b, 0) / points.length);
        });
        setCourseGrades(avgMap);
      }
      
      if (colorsRes.data) {
        setGradeColors(colorsRes.data);
      }
    };
    
    loadGrades();
  }, [user]);

  // Navigation
  const goToPrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Hole Eintrag fuer Tag/Periode unter Beruecksichtigung der Woche
  const getEntry = (day: number, period: number): TimetableEntry | undefined => {
    return entries.find(e => 
      e.day_of_week === day && 
      e.period === period && 
      (e.week_type === 'both' || 
       (weekType === 'A' && e.week_type === 'odd') || 
       (weekType === 'B' && e.week_type === 'even'))
    );
  };

  // Hole Override fuer Datum/Periode
  const getOverride = (date: Date, period: number): TimetableOverride | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return overrides.find(o => o.date === dateStr && o.period === period);
  };

  // Pruefe ob Stunde vorbei ist
  const isPeriodPassed = (date: Date, period: number): boolean => {
    const now = new Date();
    if (isBefore(date, startOfDay(now)) && !isToday(date)) return true;
    if (!isToday(date)) return false;
    
    const times = LESSON_TIMES[period];
    if (!times) return false;
    
    const [endH, endM] = times.end.split(':').map(Number);
    const periodEnd = new Date(date);
    periodEnd.setHours(endH, endM, 0, 0);
    
    return now > periodEnd;
  };

  // Doppelstunden-Logik
  const isDoubleStart = (day: number, period: number): boolean => {
    const entry = getEntry(day, period);
    if (!entry || !entry.course_id) return false;
    
    const periodIndex = PERIODS.indexOf(period);
    if (periodIndex < 0 || periodIndex >= PERIODS.length - 1) return false;
    
    const nextPeriod = PERIODS[periodIndex + 1];
    const nextEntry = getEntry(day, nextPeriod);
    
    return nextEntry?.course_id === entry.course_id;
  };

  const isDoubleContinuation = (day: number, period: number): boolean => {
    const entry = getEntry(day, period);
    if (!entry || !entry.course_id) return false;
    
    const periodIndex = PERIODS.indexOf(period);
    if (periodIndex <= 0) return false;
    
    const prevPeriod = PERIODS[periodIndex - 1];
    const prevEntry = getEntry(day, prevPeriod);
    
    return prevEntry?.course_id === entry.course_id;
  };

  // Noten-Farbe
  const getGradeColor = (grade: number) => {
    if (grade >= gradeColors.green_min) return 'bg-emerald-500';
    if (grade >= gradeColors.yellow_min) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-3">
      {/* Woche-Navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={goToPrevWeek}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </Button>
        
        <div className="flex flex-col items-center">
          <button
            onClick={goToCurrentWeek}
            className={`text-sm font-semibold ${isCurrentWeek ? 'text-primary' : 'text-foreground'}`}
          >
            KW {weekNumber} · {weekType}-Woche
          </button>
          <span className="text-[10px] text-muted-foreground">
            {format(currentWeekStart, 'd. MMM', { locale: de })} - {format(weekEnd, 'd. MMM yyyy', { locale: de })}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={goToNextWeek}
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Stundenplan-Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div 
            className="grid gap-1" 
            style={{ 
              gridTemplateColumns: 'auto repeat(5, 1fr)', 
              gridTemplateRows: `auto repeat(${PERIODS.length}, 44px)` 
            }}
          >
            {/* Header */}
            <div className="h-7" />
            {weekDays.map((date, dayIndex) => (
              <div key={dayIndex} className="h-7 flex flex-col items-center justify-center">
                <span className={`text-[10px] font-semibold ${isToday(date) ? 'text-primary' : 'text-muted-foreground'}`}>
                  {DAYS[dayIndex]}
                </span>
                <span className={`text-[8px] ${isToday(date) ? 'text-primary font-semibold' : 'text-muted-foreground/60'}`}>
                  {format(date, 'd.')}
                </span>
              </div>
            ))}
            
            {/* Perioden */}
            {PERIODS.map((period, periodIdx) => (
              <>
                {/* Perioden-Label */}
                <div 
                  key={`period-${period}`} 
                  className="h-11 flex items-center justify-center"
                  style={{ gridColumn: 1, gridRow: periodIdx + 2 }}
                >
                  <span className="text-[10px] font-medium text-muted-foreground/70">{period}</span>
                </div>
                
                {/* Tage */}
                {weekDays.map((date, dayIndex) => {
                  const day = dayIndex + 1;
                  const entry = getEntry(day, period);
                  const override = getOverride(date, period);
                  const courseId = entry?.course_id;
                  const course = courseId ? courses.find(c => c.id === courseId) : null;
                  const grade = courseId ? courseGrades.get(courseId) : null;
                  const passed = isPeriodPassed(date, period);
                  const isFree = entry?.teacher_short === 'FREI' && !entry?.course_id;
                  const hasContent = !!entry?.course_id || !!entry?.teacher_short;
                  
                  // Doppelstunde: ueberspringe zweite Haelfte
                  if (isDoubleContinuation(day, period)) {
                    return null;
                  }
                  
                  const isDouble = isDoubleStart(day, period);
                  const rowSpan = isDouble ? 2 : 1;
                  
                  return (
                    <div
                      key={`${day}-${period}`}
                      className={`
                        rounded-md p-1 flex flex-col items-center justify-center text-center min-w-0
                        ${passed ? 'opacity-40' : ''}
                        ${hasContent 
                          ? isFree 
                            ? 'bg-emerald-500/10 border border-emerald-500/30' 
                            : 'bg-muted/50 border border-border/50 cursor-pointer hover:border-primary/50'
                          : 'border border-transparent'
                        }
                        ${override?.override_type === 'eva' ? 'bg-amber-500/10 border-amber-500/30' : ''}
                      `}
                      style={{ 
                        gridColumn: dayIndex + 2, 
                        gridRow: `${periodIdx + 2} / span ${rowSpan}`,
                        height: isDouble ? '92px' : '44px',
                      }}
                    >
                      {override?.override_type === 'eva' ? (
                        <span className="text-[10px] font-semibold text-amber-600">EVA</span>
                      ) : isFree ? (
                        <span className="text-[10px] font-semibold text-emerald-600">FREI</span>
                      ) : course ? (
                        <>
                          <span className="text-[10px] font-semibold truncate w-full">
                            {course.short_name || course.name.slice(0, 4)}
                          </span>
                          {entry?.room && (
                            <span className="text-[8px] text-muted-foreground truncate w-full">
                              {entry.room}
                            </span>
                          )}
                          {grade !== null && grade !== undefined && (
                            <div className={`w-4 h-4 rounded-full ${getGradeColor(grade)} flex items-center justify-center mt-0.5`}>
                              <span className="text-[8px] font-bold text-white">{Math.round(grade)}</span>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
