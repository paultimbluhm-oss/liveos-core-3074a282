import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { format, subDays, startOfWeek, endOfWeek, isAfter, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckCircle2, GraduationCap, Calendar, TrendingUp } from 'lucide-react';

export function WeeklySummary() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [homeworkDone, setHomeworkDone] = useState(0);
  const [homeworkTotal, setHomeworkTotal] = useState(0);
  const [newGrades, setNewGrades] = useState<{ points: number; courseName: string }[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ title: string; date: string; courseName: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !scope.school) return;

      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const nextWeekEnd = format(endOfWeek(subDays(now, -7), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Get courses for current scope
      const { data: courses } = await supabase
        .from('v2_courses')
        .select('id, name, short_name, color')
        .eq('school_id', scope.school.id)
        .eq('grade_level', scope.gradeLevel)
        .eq('semester', scope.semester);

      if (!courses || courses.length === 0) { setLoading(false); return; }

      const courseIds = courses.map(c => c.id);
      const courseMap: Record<string, { name: string; color: string }> = {};
      courses.forEach(c => { courseMap[c.id] = { name: c.short_name || c.name, color: c.color || '#6366f1' }; });

      // Get memberships
      const { data: members } = await supabase
        .from('v2_course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      const memberIds = new Set((members || []).map(m => m.course_id));

      // Homework this week
      const { data: homework } = await supabase
        .from('v2_homework')
        .select('id, course_id, completed')
        .in('course_id', courseIds)
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd);

      const myHomework = (homework || []).filter(h => memberIds.has(h.course_id));

      // Homework completions
      const hwIds = myHomework.map(h => h.id);
      let completedIds = new Set<string>();
      if (hwIds.length > 0) {
        const { data: completions } = await supabase
          .from('v2_homework_completions')
          .select('homework_id')
          .eq('user_id', user.id)
          .in('homework_id', hwIds);
        completedIds = new Set((completions || []).map(c => c.homework_id));
      }

      setHomeworkTotal(myHomework.length);
      setHomeworkDone(myHomework.filter(h => completedIds.has(h.id)).length);

      // New grades this week
      const { data: grades } = await supabase
        .from('v2_grades')
        .select('points, course_id, created_at')
        .eq('user_id', user.id)
        .in('course_id', Array.from(memberIds))
        .gte('created_at', `${weekStart}T00:00:00`)
        .lte('created_at', `${weekEnd}T23:59:59`);

      setNewGrades((grades || []).map(g => ({
        points: g.points,
        courseName: courseMap[g.course_id]?.name || '?',
      })));

      // Upcoming events (next 2 weeks)
      const { data: events } = await supabase
        .from('v2_course_events')
        .select('title, event_date, course_id, event_type')
        .in('course_id', Array.from(memberIds))
        .gte('event_date', format(now, 'yyyy-MM-dd'))
        .lte('event_date', nextWeekEnd)
        .order('event_date');

      setUpcomingEvents((events || []).map(e => ({
        title: e.title,
        date: e.event_date,
        courseName: courseMap[e.course_id]?.name || '?',
        color: courseMap[e.course_id]?.color || '#6366f1',
      })));

      setLoading(false);
    };
    load();
  }, [user, scope.school?.id, scope.gradeLevel, scope.semester]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const hwPct = homeworkTotal > 0 ? Math.round((homeworkDone / homeworkTotal) * 100) : 100;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        KW {format(new Date(), 'w', { locale: de })}
      </p>

      {/* Homework Progress */}
      <div className="rounded-xl bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium">Hausaufgaben</span>
          </div>
          <span className="text-xs font-bold">{homeworkDone}/{homeworkTotal}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${hwPct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${hwPct}%` }}
          />
        </div>
      </div>

      {/* New Grades */}
      {newGrades.length > 0 && (
        <div className="rounded-xl bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium">Neue Noten</span>
          </div>
          {newGrades.map((g, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{g.courseName}</span>
              <span className="text-xs font-bold">{g.points} P</span>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="rounded-xl bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium">Anstehend</span>
          </div>
          {upcomingEvents.slice(0, 4).map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-xs truncate flex-1">{e.courseName}: {e.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(parseISO(e.date), 'dd.MM.', { locale: de })}
              </span>
            </div>
          ))}
        </div>
      )}

      {homeworkTotal === 0 && newGrades.length === 0 && upcomingEvents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Ruhige Woche</p>
      )}
    </div>
  );
}
