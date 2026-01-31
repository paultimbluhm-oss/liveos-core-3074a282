import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course, V2TimetableSlot, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';

interface WeekTimetableV2Props {
  onSlotClick?: (slot: V2TimetableSlot, course: V2Course) => void;
}

export function WeekTimetableV2({ onSlotClick }: WeekTimetableV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<(V2TimetableSlot & { course: V2Course })[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user, scope.school?.id, scope.gradeLevel, scope.semester, scope.className]);

  // Determine week type (A/B) based on week number
  const weekType = useMemo(() => {
    const weekNum = parseInt(format(currentWeek, 'w'));
    return weekNum % 2 === 0 ? 'A' : 'B';
  }, [currentWeek]);

  // Filter slots by week type
  const visibleSlots = useMemo(() => {
    return slots.filter(s => s.week_type === 'both' || s.week_type === weekType);
  }, [slots, weekType]);

  // Build grid data
  const gridData = useMemo(() => {
    const grid: Record<number, Record<number, (V2TimetableSlot & { course: V2Course }) | null>> = {};
    
    // Initialize grid
    for (let period = 1; period <= 9; period++) {
      grid[period] = {};
      for (let day = 1; day <= 5; day++) {
        grid[period][day] = null;
      }
    }

    // Fill with slots
    visibleSlots.forEach(slot => {
      if (grid[slot.period]) {
        grid[slot.period][slot.day_of_week] = slot;
      }
    });

    return grid;
  }, [visibleSlots]);

  const goToPrevWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Periods to display (skip 7 = Pause visually but keep structure)
  const displayPeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  return (
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
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Button>
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
                {displayPeriods.map(period => (
                  <tr key={period} className={period === 8 ? 'border-t-2 border-dashed' : ''}>
                    <td className="p-1 text-center text-muted-foreground text-[10px]">
                      {PERIOD_TIMES[period]?.label || period}
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      const slot = gridData[period]?.[day];
                      const date = addDays(currentWeek, day - 1);
                      const isPast = date < new Date() && !isToday(date);

                      if (!slot) {
                        return (
                          <td key={day} className="p-0.5">
                            <div className="h-10 rounded bg-muted/30" />
                          </td>
                        );
                      }

                      return (
                        <td key={day} className="p-0.5">
                          <button
                            onClick={() => onSlotClick?.(slot, slot.course)}
                            className={`
                              w-full h-10 rounded text-[10px] font-medium text-white
                              flex flex-col items-center justify-center
                              transition-all hover:scale-[1.02] active:scale-[0.98]
                              ${isPast ? 'opacity-40' : ''}
                            `}
                            style={{ backgroundColor: slot.course.color || '#6366f1' }}
                          >
                            <span>{slot.course.short_name || slot.course.name.substring(0, 3)}</span>
                            {slot.room && (
                              <span className="text-[8px] opacity-80">{slot.room}</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
