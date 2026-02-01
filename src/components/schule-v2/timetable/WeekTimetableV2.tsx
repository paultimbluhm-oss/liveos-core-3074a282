import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { useGradeColors } from '@/hooks/useGradeColors';
import { V2Course, V2TimetableSlot, V2Grade, V2Homework, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { GradeColorSettingsV2 } from '../settings/GradeColorSettingsV2';

interface WeekTimetableV2Props {
  onSlotClick?: (slot: V2TimetableSlot, course: V2Course) => void;
}

export function WeekTimetableV2({ onSlotClick }: WeekTimetableV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const { getGradeColor, settings: gradeColorSettings } = useGradeColors();
  
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<(V2TimetableSlot & { course: V2Course })[]>([]);
  const [courseAverages, setCourseAverages] = useState<Record<string, number | null>>({});
  const [homeworkByDate, setHomeworkByDate] = useState<Record<string, V2Homework[]>>({});
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load timetable slots for user's courses in current scope
  useEffect(() => {
    const loadSlots = async () => {
      if (!user || !scope.school) {
        setSlots([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Hole Kurse, denen der User beigetreten ist im aktuellen Scope
      const { data: memberships } = await supabase
        .from('v2_course_members')
        .select('course_id')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        setSlots([]);
        setLoading(false);
        return;
      }

      const courseIds = memberships.map(m => m.course_id);

      // Hole Kurse im aktuellen Scope
      const { data: courses } = await supabase
        .from('v2_courses')
        .select('*')
        .eq('school_id', scope.school.id)
        .eq('grade_level', scope.gradeLevel)
        .eq('semester', scope.semester)
        .in('id', courseIds)
        .or(`class_name.is.null,class_name.eq.${scope.className}`);

      if (!courses || courses.length === 0) {
        setSlots([]);
        setLoading(false);
        return;
      }

      const scopeCourseIds = courses.map(c => c.id);

      // Hole Stundenplan-Slots für diese Kurse
      const { data: slotsData } = await supabase
        .from('v2_timetable_slots')
        .select('*')
        .in('course_id', scopeCourseIds);

      // Hole Noten für diese Kurse um Durchschnitte zu berechnen
      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('*')
        .eq('user_id', user.id)
        .in('course_id', scopeCourseIds);

      // Berechne Durchschnitte pro Kurs
      const averages: Record<string, number | null> = {};
      courses.forEach(course => {
        const courseGrades = (gradesData || []).filter(g => g.course_id === course.id);
        if (courseGrades.length === 0) {
          averages[course.id] = null;
        } else {
          // Prüfe ob es eine Halbjahresnote gibt
          const semesterGrade = courseGrades.find(g => g.grade_type === 'semester');
          if (semesterGrade) {
            averages[course.id] = semesterGrade.points;
          } else {
            // Berechne gewichteten Durchschnitt
            const oralGrades = courseGrades.filter(g => g.grade_type === 'oral');
            const writtenGrades = courseGrades.filter(g => g.grade_type === 'written');
            const practicalGrades = courseGrades.filter(g => g.grade_type === 'practical');

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

          averages[course.id] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
          }
        }
      });
      setCourseAverages(averages);

      // Hole Hausaufgaben für diese Kurse
      const { data: homeworkData } = await supabase
        .from('v2_homework')
        .select('*')
        .in('course_id', scopeCourseIds)
        .eq('completed', false);

      // Gruppiere nach Fälligkeitsdatum
      const hwByDate: Record<string, V2Homework[]> = {};
      (homeworkData || []).forEach(hw => {
        const dateKey = hw.due_date;
        if (!hwByDate[dateKey]) hwByDate[dateKey] = [];
        hwByDate[dateKey].push(hw as V2Homework);
      });
      setHomeworkByDate(hwByDate);

      if (slotsData) {
        const enrichedSlots = slotsData.map(slot => ({
          ...slot,
          week_type: slot.week_type as 'both' | 'A' | 'B',
          course: courses.find(c => c.id === slot.course_id)!,
        })).filter(s => s.course);

        setSlots(enrichedSlots as (V2TimetableSlot & { course: V2Course })[]);
      }

      setLoading(false);
    };

    loadSlots();
  }, [user, scope.school?.id, scope.gradeLevel, scope.semester, scope.className, refreshKey]);

  // Determine week type (A/B) based on week number
  const weekType = useMemo(() => {
    const weekNum = parseInt(format(currentWeek, 'w'));
    return weekNum % 2 === 0 ? 'A' : 'B';
  }, [currentWeek]);

  // Filter slots by week type
  const visibleSlots = useMemo(() => {
    return slots.filter(s => s.week_type === 'both' || s.week_type === weekType);
  }, [slots, weekType]);

  // Build grid data with double lesson handling
  const gridData = useMemo(() => {
    const grid: Record<number, Record<number, (V2TimetableSlot & { course: V2Course }) | null>> = {};
    const skipCells: Record<string, boolean> = {}; // Track cells to skip due to double lessons
    
    // Initialize grid
    for (let period = 1; period <= 9; period++) {
      grid[period] = {};
      for (let day = 1; day <= 5; day++) {
        grid[period][day] = null;
      }
    }

    // Fill with slots and mark skip cells for double lessons
    visibleSlots.forEach(slot => {
      if (grid[slot.period]) {
        grid[slot.period][slot.day_of_week] = slot;
        // If double lesson, mark the next period as skip
        if (slot.is_double_lesson && slot.period < 9) {
          skipCells[`${slot.period + 1}-${slot.day_of_week}`] = true;
        }
      }
    });

    return { grid, skipCells };
  }, [visibleSlots]);

  const goToPrevWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Periods to display (skip 7 = Pause visually but keep structure)
  const displayPeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  const getGradeBgClass = (points: number | null): string => {
    if (points === null) return '';
    if (points >= gradeColorSettings.green_min) return 'bg-emerald-500';
    if (points >= gradeColorSettings.yellow_min) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          
          <button 
            onClick={goToToday}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            {format(currentWeek, "'KW' w", { locale: de })} 
            <span className="text-muted-foreground ml-1">({weekType})</span>
          </button>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-1 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="w-8 p-1"></th>
                  {WEEKDAYS.map((day, idx) => {
                    const date = addDays(currentWeek, idx);
                    const today = isToday(date);
                    return (
                      <th 
                        key={day} 
                        className={`p-1 text-center font-medium ${today ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        <div>{day}</div>
                        <div className={`text-[10px] ${today ? 'font-semibold' : 'font-normal'}`}>
                          {format(date, 'd.M.')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayPeriods.map((period, periodIdx) => {
                  return (
                  <tr key={period} className={period === 8 ? 'border-t-2 border-dashed' : ''}>
                    <td className="p-1 text-center text-muted-foreground text-[10px]">
                      {PERIOD_TIMES[period]?.label || period}
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      const skipKey = `${period}-${day}`;
                      
                      // Skip this cell if it's covered by a double lesson from previous period
                      if (gridData.skipCells[skipKey]) {
                        return null;
                      }
                      
                      const slot = gridData.grid[period]?.[day];
                      const date = addDays(currentWeek, day - 1);
                      const dateKey = format(date, 'yyyy-MM-dd');
                      const isPast = date < new Date() && !isToday(date);
                      const isDouble = slot?.is_double_lesson;

                      if (!slot) {
                        return (
                          <td key={day} className="p-0.5">
                            <div className="h-10 rounded bg-muted/30" />
                          </td>
                        );
                      }

                      const avg = courseAverages[slot.course.id];
                      
                      // Hausaufgaben für diesen Kurs an diesem Tag fällig?
                      const hwForSlot = (homeworkByDate[dateKey] || []).filter(
                        hw => hw.course_id === slot.course.id
                      );
                      const hwCount = hwForSlot.length;

                      return (
                        <td key={day} className="p-0.5" rowSpan={isDouble ? 2 : 1}>
                          <button
                            onClick={() => onSlotClick?.(slot, slot.course)}
                            className={`
                              w-full rounded text-[10px] font-medium text-white relative
                              flex flex-col items-center justify-center
                              transition-all hover:scale-[1.02] active:scale-[0.98]
                              ${isPast ? 'opacity-40' : ''}
                              ${isDouble ? 'h-[84px]' : 'h-10'}
                            `}
                            style={{ backgroundColor: slot.course.color || '#6366f1' }}
                          >
                            <span>{slot.course.short_name || slot.course.name.substring(0, 3)}</span>
                            {/* Hausaufgaben Badge links oben */}
                            {hwCount > 0 && (
                              <span 
                                className="absolute -top-2 -left-2 w-5 h-5 text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm bg-rose-500 text-white"
                              >
                                {hwCount}
                              </span>
                            )}
                            {/* Noten Badge rechts oben */}
                            {avg !== null && (
                              <span 
                                className={`absolute -top-2 -right-2 w-6 h-6 text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ${getGradeBgClass(avg)}`}
                              >
                                {avg}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    <GradeColorSettingsV2 
      open={settingsOpen} 
      onOpenChange={setSettingsOpen}
      onSettingsChange={() => setRefreshKey(prev => prev + 1)}
    />
    </>
  );
}
