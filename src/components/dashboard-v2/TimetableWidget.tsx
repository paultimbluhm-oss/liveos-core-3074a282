import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, parseISO, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { PERIOD_TIMES } from '@/components/schule-v2/types';
import type { WidgetSize } from '@/hooks/useDashboardV2';

interface SlotWithCourse {
  id: string;
  period: number;
  day_of_week: number;
  is_double_lesson: boolean;
  room: string | null;
  week_type: string;
  course: {
    id: string;
    name: string;
    short_name: string | null;
    color: string | null;
  };
}

interface HomeworkItem {
  id: string;
  title: string;
  due_date: string;
  course_name: string;
  course_color: string | null;
}

export function TimetableWidget({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<SlotWithCourse[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get membership for scope
    const { data: membership } = await supabase
      .from('v2_school_memberships')
      .select('school_id, current_grade_level, current_semester, current_class_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      setLoading(false);
      return;
    }

    // Get user's courses in scope
    const { data: members } = await supabase
      .from('v2_course_members')
      .select('course_id')
      .eq('user_id', user.id);

    if (!members?.length) {
      setLoading(false);
      return;
    }

    const courseIds = members.map(m => m.course_id);

    const { data: courses } = await supabase
      .from('v2_courses')
      .select('id, name, short_name, color')
      .eq('school_id', membership.school_id)
      .eq('grade_level', membership.current_grade_level)
      .eq('semester', membership.current_semester)
      .in('id', courseIds)
      .or(`class_name.is.null,class_name.eq.${membership.current_class_name}`);

    if (!courses?.length) {
      setLoading(false);
      return;
    }

    const scopeCourseIds = courses.map(c => c.id);

    // Load slots + homework + completions in parallel
    const [slotsRes, hwRes, completionsRes] = await Promise.all([
      supabase.from('v2_timetable_slots').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework_completions').select('homework_id').eq('user_id', user.id),
    ]);

    // Enrich slots with course data
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    const todayDow = today === 0 ? 7 : today; // Convert to 1=Mon format

    // Week type
    const weekNum = parseInt(format(new Date(), 'w'));
    const weekType = weekNum % 2 === 0 ? 'A' : 'B';

    const enriched = (slotsRes.data || [])
      .filter(s => s.day_of_week === todayDow)
      .filter(s => s.week_type === 'both' || s.week_type === weekType)
      .map(s => {
        const course = courses.find(c => c.id === s.course_id);
        if (!course) return null;
        return { ...s, course } as SlotWithCourse;
      })
      .filter(Boolean) as SlotWithCourse[];

    // Sort by period
    enriched.sort((a, b) => a.period - b.period);

    // Remove duplicate periods from double lessons
    const skipPeriods = new Set<number>();
    enriched.forEach(s => {
      if (s.is_double_lesson) skipPeriods.add(s.period + 1);
    });
    const filtered = enriched.filter(s => !skipPeriods.has(s.period));

    setSlots(filtered);

    // Process homework - only open (not completed)
    const completedIds = new Set((completionsRes.data || []).map(c => c.homework_id));
    const openHw = (hwRes.data || [])
      .filter(hw => !completedIds.has(hw.id))
      .map(hw => {
        const course = courses.find(c => c.id === hw.course_id);
        return {
          id: hw.id,
          title: hw.title,
          due_date: hw.due_date,
          course_name: course?.short_name || course?.name || '',
          course_color: course?.color || null,
        };
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    setHomework(openHw);
    setLoading(false);
  };

  // Check if past lesson
  const isPastLesson = (period: number, isDouble: boolean) => {
    const now = new Date();
    if (!isToday(now)) return false;
    const endPeriod = isDouble ? period + 1 : period;
    const endTime = PERIOD_TIMES[endPeriod]?.end;
    if (!endTime) return false;
    const [h, m] = endTime.split(':').map(Number);
    const end = new Date();
    end.setHours(h, m, 0, 0);
    return now > end;
  };

  const formatDueDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Heute';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return 'Morgen';
    return format(date, 'dd.MM', { locale: de });
  };

  const isOverdue = (d: string) => {
    return isBefore(parseISO(d), startOfDay(new Date()));
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-center min-h-[80px]">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const hasNoSchool = slots.length === 0;

  // === SMALL ===
  if (size === 'small') {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 w-full">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold">Schule</span>
        </div>
        {isWeekend || hasNoSchool ? (
          <p className="text-xs text-muted-foreground">Kein Unterricht</p>
        ) : (
          <>
            <p className="text-2xl font-bold">{slots.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {slots.length === 1 ? 'Stunde' : 'Stunden'} heute
            </p>
          </>
        )}
        {homework.length > 0 && (
          <p className="text-[10px] text-primary font-medium mt-1">{homework.length} HA offen</p>
        )}
      </div>
    );
  }

  // === MEDIUM / LARGE ===
  const hwLimit = size === 'medium' ? 3 : 6;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-primary" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold">Stundenplan</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(), 'EEEE', { locale: de })}
        </span>
      </div>

      {/* Today's schedule */}
      {isWeekend || hasNoSchool ? (
        <div className="flex items-center justify-center py-3">
          <p className="text-xs text-muted-foreground">
            {isWeekend ? 'Wochenende' : 'Kein Unterricht heute'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {slots.map(slot => {
            const past = isPastLesson(slot.period, slot.is_double_lesson);
            const time = PERIOD_TIMES[slot.period];
            return (
              <div
                key={slot.id}
                className={`flex items-center gap-2 p-2 rounded-xl transition-opacity ${
                  past ? 'opacity-30' : ''
                }`}
              >
                <div
                  className="w-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: slot.course.color || 'hsl(var(--primary))',
                    height: slot.is_double_lesson ? '2rem' : '1.25rem',
                  }}
                />
                <span className="text-[10px] font-mono text-muted-foreground w-10 shrink-0">
                  {time?.start || ''}
                </span>
                <span className={`text-sm font-medium flex-1 truncate ${past ? 'line-through' : ''}`}>
                  {slot.course.short_name || slot.course.name}
                </span>
                {slot.is_double_lesson && (
                  <span className="text-[9px] text-muted-foreground font-mono">2h</span>
                )}
                {slot.room && (
                  <span className="text-[10px] text-muted-foreground">{slot.room}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Homework section */}
      {homework.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <div className="flex items-center gap-1 mb-1.5">
            <BookOpen className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Hausaufgaben ({homework.length})
            </span>
          </div>
          <div className="space-y-1">
            {homework.slice(0, hwLimit).map(hw => (
              <div
                key={hw.id}
                className={`flex items-center gap-2 p-1.5 rounded-lg ${
                  isOverdue(hw.due_date) ? 'bg-destructive/5' : 'bg-muted/30'
                }`}
              >
                <div
                  className="w-0.5 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: hw.course_color || 'hsl(var(--primary))' }}
                />
                <span className="text-xs flex-1 truncate">{hw.title}</span>
                <span className={`text-[10px] font-mono shrink-0 ${
                  isOverdue(hw.due_date) ? 'text-destructive font-bold' : 'text-muted-foreground'
                }`}>
                  {formatDueDate(hw.due_date)}
                </span>
              </div>
            ))}
            {homework.length > hwLimit && (
              <p className="text-center text-[10px] text-muted-foreground py-0.5">
                +{homework.length - hwLimit} weitere
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
