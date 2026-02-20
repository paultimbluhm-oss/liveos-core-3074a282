import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { useGradeColors } from '@/hooks/useGradeColors';
import { V2Course, V2TimetableSlot, V2Grade, V2Homework, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { GradeColorSettingsV2 } from '../settings/GradeColorSettingsV2';

interface WeekTimetableV2Props {
  onSlotClick?: (slot: V2TimetableSlot, course: V2Course) => void;
}

export function WeekTimetableV2({ onSlotClick }: WeekTimetableV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const { settings: gradeColorSettings } = useGradeColors();
  
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<(V2TimetableSlot & { course: V2Course })[]>([]);
  const [courseAverages, setCourseAverages] = useState<Record<string, number | null>>({});
  const [homeworkByDate, setHomeworkByDate] = useState<Record<string, V2Homework[]>>({});
  const [completedHwByDate, setCompletedHwByDate] = useState<Record<string, V2Homework[]>>({});
  const [absenceMap, setAbsenceMap] = useState<Record<string, { is_eva: boolean; status: 'excused' | 'unexcused' }>>({});
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadSlots = async () => {
      if (!user || !scope.school) {
        setSlots([]);
        setLoading(false);
        return;
      }

      setLoading(true);

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

      const { data: slotsData } = await supabase
        .from('v2_timetable_slots')
        .select('*')
        .in('course_id', scopeCourseIds);

      // Grades
      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('*')
        .eq('user_id', user.id)
        .in('course_id', scopeCourseIds);

      const averages: Record<string, number | null> = {};
      courses.forEach(course => {
        const courseGrades = (gradesData || []).filter(g => g.course_id === course.id);
        if (courseGrades.length === 0) {
          averages[course.id] = null;
        } else {
          const semesterGrade = courseGrades.find(g => g.grade_type === 'semester');
          if (semesterGrade) {
            averages[course.id] = semesterGrade.points;
          } else {
            const oralGrades = courseGrades.filter(g => g.grade_type === 'oral');
            const writtenGrades = courseGrades.filter(g => g.grade_type === 'written');
            const practicalGrades = courseGrades.filter(g => g.grade_type === 'practical');
            const oralAvg = oralGrades.length > 0 ? oralGrades.reduce((s, g) => s + g.points, 0) / oralGrades.length : null;
            const writtenAvg = writtenGrades.length > 0 ? writtenGrades.reduce((s, g) => s + g.points, 0) / writtenGrades.length : null;
            const practicalAvg = practicalGrades.length > 0 ? practicalGrades.reduce((s, g) => s + g.points, 0) / practicalGrades.length : null;
            let totalWeight = 0, weightedSum = 0;
            if (oralAvg !== null) { weightedSum += oralAvg * course.oral_weight; totalWeight += course.oral_weight; }
            if (writtenAvg !== null) { weightedSum += writtenAvg * course.written_weight; totalWeight += course.written_weight; }
            if (practicalAvg !== null && course.has_practical) { weightedSum += practicalAvg * course.practical_weight; totalWeight += course.practical_weight; }
            averages[course.id] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
          }
        }
      });
      setCourseAverages(averages);

      // Homework
      const { data: homeworkData } = await supabase
        .from('v2_homework')
        .select('*')
        .in('course_id', scopeCourseIds);

      const { data: completions } = await supabase
        .from('v2_homework_completions')
        .select('homework_id')
        .eq('user_id', user.id);

      const completedIds = new Set((completions || []).map(c => c.homework_id));

      const hwByDate: Record<string, V2Homework[]> = {};
      const completedByDate: Record<string, V2Homework[]> = {};
      (homeworkData || []).forEach(hw => {
        const dateKey = hw.due_date;
        if (completedIds.has(hw.id)) {
          if (!completedByDate[dateKey]) completedByDate[dateKey] = [];
          completedByDate[dateKey].push(hw as V2Homework);
        } else {
          if (!hwByDate[dateKey]) hwByDate[dateKey] = [];
          hwByDate[dateKey].push(hw as V2Homework);
        }
      });
      setHomeworkByDate(hwByDate);
      setCompletedHwByDate(completedByDate);

      // Absences
      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      
      const { data: absencesData } = await supabase
        .from('v2_absences')
        .select('*')
        .eq('user_id', user.id)
        .in('course_id', scopeCourseIds)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const absMap: Record<string, { is_eva: boolean; status: 'excused' | 'unexcused' }> = {};
      (absencesData || []).forEach(abs => {
        if (abs.timetable_slot_id) {
          const key = `${abs.timetable_slot_id}-${abs.date}`;
          absMap[key] = { is_eva: abs.is_eva, status: abs.status as 'excused' | 'unexcused' };
        }
      });
      setAbsenceMap(absMap);

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
  }, [user, scope.school?.id, scope.gradeLevel, scope.semester, scope.className, refreshKey, currentWeek]);

  const weekType = useMemo(() => {
    const weekNum = parseInt(format(currentWeek, 'w'));
    return weekNum % 2 === 0 ? 'A' : 'B';
  }, [currentWeek]);

  const visibleSlots = useMemo(() => {
    return slots.filter(s => s.week_type === 'both' || s.week_type === weekType);
  }, [slots, weekType]);

  const gridData = useMemo(() => {
    const grid: Record<number, Record<number, (V2TimetableSlot & { course: V2Course }) | null>> = {};
    const skipCells: Record<string, boolean> = {};
    for (let period = 1; period <= 9; period++) {
      grid[period] = {};
      for (let day = 1; day <= 5; day++) grid[period][day] = null;
    }
    visibleSlots.forEach(slot => {
      if (grid[slot.period]) {
        grid[slot.period][slot.day_of_week] = slot;
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

  const displayPeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  const getGradeColor = (points: number | null): string => {
    if (points === null) return '';
    if (points >= gradeColorSettings.green_min) return 'bg-emerald-500';
    if (points >= gradeColorSettings.yellow_min) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <>
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </Button>
        
        <button 
          onClick={goToToday}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          KW {format(currentWeek, 'w')}
          <span className="text-muted-foreground font-normal ml-1.5 text-xs">Woche {weekType}</span>
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

      {/* Content */}
      <div className="p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate" style={{ borderSpacing: '3px' }}>
              <thead>
                <tr>
                  <th className="w-7 p-0"></th>
                  {WEEKDAYS.map((day, idx) => {
                    const date = addDays(currentWeek, idx);
                    const today = isToday(date);
                    return (
                      <th 
                        key={day} 
                        className={`p-1.5 text-center rounded-lg ${today ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                      >
                        <div className="font-semibold text-[11px]">{day}</div>
                        <div className={`text-[10px] ${today ? 'font-bold' : 'font-normal opacity-60'}`}>
                          {format(date, 'd.')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayPeriods.map((period) => {
                  return (
                  <tr key={period} className={period === 8 ? 'border-t border-dashed' : ''}>
                    <td className="p-0 text-center text-muted-foreground/50 text-[9px] font-medium align-middle">
                      {PERIOD_TIMES[period]?.label || period}
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      const skipKey = `${period}-${day}`;
                      if (gridData.skipCells[skipKey]) return null;
                      
                      const slot = gridData.grid[period]?.[day];
                      const date = addDays(currentWeek, day - 1);
                      const dateKey = format(date, 'yyyy-MM-dd');
                      const now = new Date();
                      
                      const isPastDay = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      let isPastToday = false;
                      if (isToday(date) && slot) {
                        const periodEnd = PERIOD_TIMES[slot.is_double_lesson ? slot.period + 1 : slot.period]?.end;
                        if (periodEnd) {
                          const [endHour, endMin] = periodEnd.split(':').map(Number);
                          const endTime = new Date();
                          endTime.setHours(endHour, endMin, 0, 0);
                          isPastToday = now > endTime;
                        }
                      }
                      
                      const isPast = isPastDay || isPastToday;
                      const isDouble = slot?.is_double_lesson;

                      if (!slot) {
                        return (
                          <td key={day} className="p-0">
                            <div className={`${isDouble ? 'h-[76px]' : 'h-9'} rounded-lg bg-muted/20`} />
                          </td>
                        );
                      }

                      const avg = courseAverages[slot.course.id];
                      
                      // Open homework for this course on this date
                      const hwOpen = (homeworkByDate[dateKey] || []).filter(hw => hw.course_id === slot.course.id);
                      const hwDone = (completedHwByDate[dateKey] || []).filter(hw => hw.course_id === slot.course.id);
                      const hwOpenCount = hwOpen.length;
                      const hwDoneCount = hwDone.length;
                      const allHwDone = hwDoneCount > 0 && hwOpenCount === 0;

                      const absenceKey = `${slot.id}-${dateKey}`;
                      const absenceInfo = absenceMap[absenceKey];
                      const hasEva = absenceInfo?.is_eva;
                      const hasMissed = absenceInfo && !absenceInfo.is_eva;
                      const isExcused = hasMissed && absenceInfo?.status === 'excused';
                      const isUnexcused = hasMissed && absenceInfo?.status === 'unexcused';

                      // Determine border style
                      let borderClass = 'border border-transparent';
                      if (hasEva) borderClass = 'border-2 border-sky-400/60';
                      else if (isExcused) borderClass = 'border-2 border-emerald-400/60';
                      else if (isUnexcused) borderClass = 'border-2 border-rose-400/60';

                      return (
                        <td key={day} className="p-0" rowSpan={isDouble ? 2 : 1}>
                          <button
                            onClick={() => onSlotClick?.(slot, slot.course)}
                            className={`
                              w-full rounded-lg text-[10px] font-semibold text-white relative
                              flex flex-col items-center justify-center
                              transition-all duration-150 active:scale-95
                              ${borderClass}
                              ${isPast ? 'opacity-30 saturate-50' : ''}
                              ${hasEva || hasMissed ? 'opacity-50' : ''}
                              ${isDouble ? 'h-[76px]' : 'h-9'}
                            `}
                            style={{ backgroundColor: slot.course.color || '#6366f1' }}
                          >
                            <span className={`${hasMissed || hasEva || isPast ? 'line-through opacity-70' : ''}`}>
                              {slot.course.short_name || slot.course.name.substring(0, 3)}
                            </span>
                            
                            {/* EVA badge */}
                            {hasEva && !isPast && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-md">
                                  EVA
                                </span>
                              </span>
                            )}
                            {/* Excused badge */}
                            {isExcused && !isPast && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-bold bg-emerald-500 text-white px-1 py-0.5 rounded-md">
                                  Entsch.
                                </span>
                              </span>
                            )}
                            {/* Unexcused badge */}
                            {isUnexcused && !isPast && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-bold bg-rose-500 text-white px-1 py-0.5 rounded-md">
                                  Offen
                                </span>
                              </span>
                            )}
                            
                            {/* Homework badge: red=open, green=all done */}
                            {!isPast && !hasMissed && !hasEva && hwOpenCount > 0 && (
                              <span className="absolute top-0.5 left-0.5 min-w-[14px] h-[14px] text-[8px] font-bold rounded-full flex items-center justify-center bg-rose-500 text-white px-0.5">
                                {hwOpenCount}
                              </span>
                            )}
                            {!isPast && !hasMissed && !hasEva && allHwDone && (
                              <span className="absolute top-0.5 left-0.5 min-w-[14px] h-[14px] text-[8px] font-bold rounded-full flex items-center justify-center bg-emerald-500 text-white px-0.5">
                                {hwDoneCount}
                              </span>
                            )}
                            
                            {/* Grade badge */}
                            {avg !== null && !isPast && !hasMissed && !hasEva && (
                              <span className={`absolute top-0.5 right-0.5 min-w-[16px] h-[16px] text-[9px] font-bold rounded-full flex items-center justify-center text-white ${getGradeColor(avg)}`}>
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
      </div>
    </div>

    <GradeColorSettingsV2 
      open={settingsOpen} 
      onOpenChange={setSettingsOpen}
      onSettingsChange={() => setRefreshKey(prev => prev + 1)}
    />
    </>
  );
}