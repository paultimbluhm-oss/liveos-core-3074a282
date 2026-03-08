import { useState, useEffect } from 'react';
import { CalendarDays, BookOpen, Check, ChevronDown, AlertTriangle, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, parseISO, isBefore, startOfDay, addDays, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { PERIOD_TIMES } from '@/components/schule-v2/types';
import { SchoolV2Provider } from '@/components/schule-v2/context/SchoolV2Context';

import { CourseDetailSheetV2 } from '@/components/schule-v2/course-detail/CourseDetailSheetV2';
import type { V2Course, V2TimetableSlot } from '@/components/schule-v2/types';
import type { WidgetSize } from '@/hooks/useDashboardV2';
import { toast } from 'sonner';

interface SlotWithCourse {
  id: string;
  period: number;
  day_of_week: number;
  is_double_lesson: boolean;
  room: string | null;
  week_type: string;
  course_id: string;
  created_at: string;
  course: {
    id: string;
    name: string;
    short_name: string | null;
    color: string | null;
    created_by: string;
    school_id: string;
    grade_level: number;
    semester: number;
    class_name: string | null;
    has_oral: boolean;
    has_written: boolean;
    has_practical: boolean;
    oral_weight: number;
    written_weight: number;
    practical_weight: number;
    created_at: string;
    teacher_name: string | null;
    room: string | null;
  };
}

interface HomeworkItem {
  id: string;
  title: string;
  due_date: string;
  course_id: string;
  course_name: string;
  course_short_name: string | null;
  course_color: string | null;
}

interface UpcomingEvent {
  id: string;
  event_type: string;
  date: string;
  topic: string | null;
  course_name: string;
  course_color: string | null;
}

function EventCountdown({ event }: { event: UpcomingEvent }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const typeLabels: Record<string, string> = { vocab_test: 'VT', exam: 'KA', abi_exam: 'ABI', other: '' };
  const typeColors: Record<string, string> = { vocab_test: '#38bdf8', exam: '#fbbf24', abi_exam: '#f87171', other: '#94a3b8' };

  const target = new Date(event.date + 'T08:00:00');
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const isTodayEvent = days === 0;
  const timerStr = days > 0
    ? `${days}d ${hours}h`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="event-countdown-row flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
      <div
        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
        style={{ backgroundColor: typeColors[event.event_type] || '#94a3b8' }}
      >
        {typeLabels[event.event_type]}
      </div>
      <span className="text-xs font-medium truncate flex-1 min-w-0">{event.topic || event.course_name}</span>
      <span className={`text-xs font-mono font-bold shrink-0 ${diffMs === 0 ? 'text-destructive' : isTodayEvent ? 'text-destructive' : 'text-primary'}`}>
        {diffMs === 0 ? 'Jetzt' : timerStr}
      </span>
    </div>
  );
}

function TimetableWidgetInner({ size, onOpenSheet }: { size: WidgetSize; onOpenSheet?: () => void }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<SlotWithCourse[]>([]);
  const [allHomework, setAllHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedHwIds, setCompletedHwIds] = useState<Set<string>>(new Set());
  const [showDoneHw, setShowDoneHw] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  // CourseDetailSheet state
  const [courseDetailOpen, setCourseDetailOpen] = useState(false);
  const [courseDetailCourse, setCourseDetailCourse] = useState<V2Course | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: membership } = await supabase
      .from('v2_school_memberships')
      .select('school_id, current_grade_level, current_semester, current_class_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }

    const { data: members } = await supabase
      .from('v2_course_members')
      .select('course_id')
      .eq('user_id', user.id);

    if (!members?.length) { setLoading(false); return; }

    const courseIds = members.map(m => m.course_id);

    const { data: courses } = await supabase
      .from('v2_courses')
      .select('*')
      .eq('school_id', membership.school_id)
      .eq('grade_level', membership.current_grade_level)
      .eq('semester', membership.current_semester)
      .in('id', courseIds)
      .or(`class_name.is.null,class_name.eq.${membership.current_class_name}`);

    if (!courses?.length) { setLoading(false); return; }

    const scopeCourseIds = courses.map(c => c.id);

    const [slotsRes, hwRes, completionsRes, eventsRes] = await Promise.all([
      supabase.from('v2_timetable_slots').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework_completions').select('homework_id').eq('user_id', user.id),
      supabase.from('v2_course_events').select('*').eq('user_id', user.id).in('course_id', scopeCourseIds).neq('event_type', 'absence').gte('date', format(new Date(), 'yyyy-MM-dd')).order('date', { ascending: true }).limit(2),
    ]);

    const today = new Date().getDay();
    const todayDow = today === 0 ? 7 : today;
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

    enriched.sort((a, b) => a.period - b.period);
    const skipPeriods = new Set<number>();
    enriched.forEach(s => { if (s.is_double_lesson) skipPeriods.add(s.period + 1); });
    setSlots(enriched.filter(s => !skipPeriods.has(s.period)));

    const completedIds = new Set((completionsRes.data || []).map(c => c.homework_id));
    setCompletedHwIds(completedIds);

    const allHw = (hwRes.data || [])
      .map(hw => {
        const course = courses.find(c => c.id === hw.course_id);
        return {
          id: hw.id,
          title: hw.title,
          due_date: hw.due_date,
          course_id: hw.course_id,
          course_name: course?.name || '',
          course_short_name: course?.short_name || null,
          course_color: course?.color || null,
        };
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    setAllHomework(allHw);

    // Upcoming events
    const upEvents: UpcomingEvent[] = (eventsRes.data || []).map((ev: any) => {
      const course = courses.find(c => c.id === ev.course_id);
      return {
        id: ev.id,
        event_type: ev.event_type,
        date: ev.date,
        topic: ev.topic,
        course_name: course?.short_name || course?.name || '',
        course_color: course?.color || null,
      };
    });
    setUpcomingEvents(upEvents);

    setLoading(false);
  };

  const toggleHomework = async (hwId: string) => {
    if (!user) return;
    const isCompleted = completedHwIds.has(hwId);
    if (isCompleted) {
      const { error } = await supabase.from('v2_homework_completions').delete().eq('homework_id', hwId).eq('user_id', user.id);
      if (!error) {
        setCompletedHwIds(prev => { const n = new Set(prev); n.delete(hwId); return n; });
        toast.success('Rueckgaengig');
      }
    } else {
      const { error } = await supabase.from('v2_homework_completions').insert({ homework_id: hwId, user_id: user.id });
      if (!error) {
        setCompletedHwIds(prev => new Set([...prev, hwId]));
        toast.success('Erledigt');
      }
    }
  };

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

  const isOverdue = (d: string) => isBefore(parseISO(d), startOfDay(new Date()));

  const openHomework = allHomework.filter(hw => !completedHwIds.has(hw.id));
  const doneHomework = allHomework.filter(hw => completedHwIds.has(hw.id));

  const handleSlotClick = (slot: SlotWithCourse) => {
    const courseAsV2: V2Course = {
      ...slot.course,
      semester: slot.course.semester as 1 | 2,
      class_name: slot.course.class_name as any,
      is_member: true,
    };
    setCourseDetailCourse(courseAsV2);
    setCourseDetailOpen(true);
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
      <>
        <div className="rounded-2xl bg-card border border-border/50 p-4 w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Schule</button>
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
          {openHomework.length > 0 && (
            <p className="text-[10px] text-primary font-medium mt-1">{openHomework.length} HA offen</p>
          )}
        </div>
        <CourseDetailSheetV2
          open={courseDetailOpen}
          onOpenChange={setCourseDetailOpen}
          course={courseDetailCourse}
          onHomeworkChange={loadData}
          onAbsenceChange={loadData}
        />
      </>
    );
  }

  // === MEDIUM / LARGE ===
  const HwRow = ({ hw, completed, onToggle, isOverdue: isOD, formatDueDate: fdd }: {
    hw: HomeworkItem; completed: boolean; onToggle: () => void;
    isOverdue: (d: string) => boolean; formatDueDate: (d: string) => string;
  }) => (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${completed ? 'opacity-50' : isOD(hw.due_date) ? 'bg-destructive/5' : 'bg-muted/30'}`}>
      <Checkbox checked={completed} onCheckedChange={onToggle} className="shrink-0" />
      <div
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
        style={{ backgroundColor: hw.course_color || 'hsl(var(--primary))' }}
      >
        {(hw.course_short_name || hw.course_name).slice(0, 3)}
      </div>
      <span className={`text-sm flex-1 truncate ${completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>{hw.title}</span>
      <span className={`text-xs font-mono shrink-0 ${!completed && isOD(hw.due_date) ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
        {fdd(hw.due_date)}
      </span>
    </div>
  );

  const hwLimit = size === 'medium' ? 3 : 6;

  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Stundenplan</button>
          <span className="text-xs text-muted-foreground ml-auto mr-1">
            {format(new Date(), 'EEEE', { locale: de })}
          </span>
          <a
            href="https://portal.hls-ol.de"
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            title="LARA Portal"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          </a>
        </div>

        {/* Today's schedule - 2 column grid */}
        {isWeekend || hasNoSchool ? (
          <div className="flex items-center justify-center py-3">
            <p className="text-xs text-muted-foreground">
              {isWeekend ? 'Wochenende' : 'Kein Unterricht heute'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {slots.map(slot => {
              const past = isPastLesson(slot.period, slot.is_double_lesson);
              const time = PERIOD_TIMES[slot.period];
              return (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all hover:bg-muted/50 active:scale-[0.98] ${
                    past ? 'opacity-30' : 'bg-muted/20'
                  }`}
                >
                  <div
                    className="w-0.5 rounded-full shrink-0 self-stretch"
                    style={{ backgroundColor: slot.course.color || 'hsl(var(--primary))' }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-medium truncate block ${past ? 'line-through' : ''}`}>
                      {slot.course.short_name || slot.course.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {time?.start || ''}{slot.room ? ` · ${slot.room}` : ''}{slot.is_double_lesson ? ' · 2h' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Upcoming Events - compact inline */}
        {upcomingEvents.length > 0 && (
          <div className="pt-1 border-t border-border/30 space-y-1">
            {upcomingEvents.map(ev => (
              <EventCountdown key={ev.id} event={ev} />
            ))}
          </div>
        )}

        {/* Homework section */}
        {allHomework.length > 0 && (
          <div className="pt-1 border-t border-border/30 space-y-2">
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Hausaufgaben ({openHomework.length} offen)
              </span>
            </div>
            {openHomework.length > 0 && (
              <div className="space-y-1">
                {openHomework.map(hw => (
                  <HwRow key={hw.id} hw={hw} completed={false} onToggle={() => toggleHomework(hw.id)} isOverdue={isOverdue} formatDueDate={formatDueDate} />
                ))}
              </div>
            )}
            {doneHomework.length > 0 && (
              <Collapsible open={showDoneHw} onOpenChange={setShowDoneHw}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDoneHw ? 'rotate-180' : ''}`} />
                  <span>Abgehakte Hausaufgaben ({doneHomework.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pt-1">
                  {doneHomework.map(hw => (
                    <HwRow key={hw.id} hw={hw} completed={true} onToggle={() => toggleHomework(hw.id)} isOverdue={isOverdue} formatDueDate={formatDueDate} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>

      <CourseDetailSheetV2
        open={courseDetailOpen}
        onOpenChange={setCourseDetailOpen}
        course={courseDetailCourse}
        onHomeworkChange={loadData}
        onAbsenceChange={loadData}
      />
    </>
  );
}

// Wrap in SchoolV2Provider so SlotActionSheet/CourseDetailSheet can access school context
export function TimetableWidget({ size, onOpenSheet }: { size: WidgetSize; onOpenSheet?: () => void }) {
  return (
    <SchoolV2Provider>
      <TimetableWidgetInner size={size} onOpenSheet={onOpenSheet} />
    </SchoolV2Provider>
  );
}
