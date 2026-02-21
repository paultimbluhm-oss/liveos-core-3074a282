import { useState, useEffect } from 'react';
import { CalendarDays, BookOpen, Check, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, parseISO, isBefore, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { PERIOD_TIMES } from '@/components/schule-v2/types';
import { SchoolV2Provider } from '@/components/schule-v2/context/SchoolV2Context';
import { SlotActionSheet } from '@/components/schule-v2/timetable/SlotActionSheet';
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

function TimetableWidgetInner({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<SlotWithCourse[]>([]);
  const [allHomework, setAllHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedHwIds, setCompletedHwIds] = useState<Set<string>>(new Set());
  const [showDoneHw, setShowDoneHw] = useState(false);

  // SlotActionSheet state
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<V2TimetableSlot | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<V2Course | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

    const [slotsRes, hwRes, completionsRes] = await Promise.all([
      supabase.from('v2_timetable_slots').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework').select('*').in('course_id', scopeCourseIds),
      supabase.from('v2_homework_completions').select('homework_id').eq('user_id', user.id),
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
    const slotAsV2: V2TimetableSlot = {
      id: slot.id,
      course_id: slot.course_id,
      day_of_week: slot.day_of_week,
      period: slot.period,
      room: slot.room,
      week_type: slot.week_type as 'both' | 'A' | 'B',
      is_double_lesson: slot.is_double_lesson,
      created_at: slot.created_at,
    };
    const courseAsV2: V2Course = {
      ...slot.course,
      semester: slot.course.semester as 1 | 2,
      class_name: slot.course.class_name as any,
      is_member: true,
    };
    setSelectedSlot(slotAsV2);
    setSelectedCourse(courseAsV2);
    setSelectedDate(new Date());
    setActionSheetOpen(true);
  };

  const handleOpenCourseDetail = () => {
    if (selectedCourse) {
      setCourseDetailCourse(selectedCourse);
      setCourseDetailOpen(true);
    }
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
          {openHomework.length > 0 && (
            <p className="text-[10px] text-primary font-medium mt-1">{openHomework.length} HA offen</p>
          )}
        </div>
        <SlotActionSheet
          open={actionSheetOpen}
          onOpenChange={setActionSheetOpen}
          slot={selectedSlot}
          course={selectedCourse}
          slotDate={selectedDate}
          onOpenCourseDetail={handleOpenCourseDetail}
          onAbsenceChange={loadData}
        />
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
    <div className={`flex items-center gap-2 p-1.5 rounded-lg ${completed ? 'opacity-50' : isOD(hw.due_date) ? 'bg-destructive/5' : 'bg-muted/30'}`}>
      <Checkbox checked={completed} onCheckedChange={onToggle} className="shrink-0" />
      <div
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
        style={{ backgroundColor: hw.course_color || 'hsl(var(--primary))' }}
      >
        {(hw.course_short_name || hw.course_name).slice(0, 3)}
      </div>
      <span className={`text-xs flex-1 truncate ${completed ? 'line-through text-muted-foreground' : ''}`}>{hw.title}</span>
      <span className={`text-[10px] font-mono shrink-0 ${!completed && isOD(hw.due_date) ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
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
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all hover:bg-muted/50 active:scale-[0.98] ${
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
                  <span className="text-[10px] font-mono text-muted-foreground w-10 shrink-0 text-left">
                    {time?.start || ''}
                  </span>
                  <span className={`text-sm font-medium flex-1 truncate text-left ${past ? 'line-through' : ''}`}>
                    {slot.course.short_name || slot.course.name}
                  </span>
                  {slot.is_double_lesson && (
                    <span className="text-[9px] text-muted-foreground font-mono">2h</span>
                  )}
                  {slot.room && (
                    <span className="text-[10px] text-muted-foreground">{slot.room}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Homework section */}
        {allHomework.length > 0 && (
          <div className="pt-1 border-t border-border/30 space-y-2">
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
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

      <SlotActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        slot={selectedSlot}
        course={selectedCourse}
        slotDate={selectedDate}
        onOpenCourseDetail={handleOpenCourseDetail}
        onAbsenceChange={loadData}
      />
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
export function TimetableWidget({ size }: { size: WidgetSize }) {
  return (
    <SchoolV2Provider>
      <TimetableWidgetInner size={size} />
    </SchoolV2Provider>
  );
}
