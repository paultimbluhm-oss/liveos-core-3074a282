import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { AlertTriangle, Check, X, UserX } from 'lucide-react';

interface AbsenceData {
  course_id: string;
  status: string;
  is_eva: boolean;
}

interface CourseInfo {
  id: string;
  name: string;
  short_name: string | null;
  color: string | null;
}

interface SlotCount {
  course_id: string;
}

export function AbsenceDashboard() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [absences, setAbsences] = useState<AbsenceData[]>([]);
  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  const [slotCounts, setSlotCounts] = useState<SlotCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !scope.school) return;

      const { data: courses } = await supabase
        .from('v2_courses')
        .select('id, name, short_name, color')
        .eq('school_id', scope.school.id)
        .eq('grade_level', scope.gradeLevel);

      if (!courses || courses.length === 0) { setLoading(false); return; }

      const courseIds = courses.map(c => c.id);

      // Get memberships
      const { data: members } = await supabase
        .from('v2_course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      const memberIds = new Set((members || []).map(m => m.course_id));
      const myCourses = courses.filter(c => memberIds.has(c.id));
      const myCourseIds = myCourses.map(c => c.id);

      const [absRes, slotsRes] = await Promise.all([
        supabase.from('v2_absences').select('course_id, status, is_eva').eq('user_id', user.id).in('course_id', myCourseIds),
        supabase.from('v2_timetable_slots').select('course_id').in('course_id', myCourseIds),
      ]);

      setCourseInfos(myCourses);
      setAbsences((absRes.data || []) as AbsenceData[]);
      setSlotCounts((slotsRes.data || []) as SlotCount[]);
      setLoading(false);
    };
    load();
  }, [user, scope.school?.id, scope.gradeLevel]);

  const courseStats = useMemo(() => {
    return courseInfos.map(course => {
      const courseAbsences = absences.filter(a => a.course_id === course.id);
      const totalSlots = slotCounts.filter(s => s.course_id === course.id).length;
      const totalAbsences = courseAbsences.length;
      const excused = courseAbsences.filter(a => a.status === 'excused').length;
      const unexcused = courseAbsences.filter(a => a.status === 'unexcused').length;
      const eva = courseAbsences.filter(a => a.is_eva).length;
      // Weekly slots approximation (total slots = weekly, so total lessons ~ slots * weeks in semester)
      const weeklySlots = totalSlots;
      const approxWeeks = 20; // ~20 weeks per semester
      const totalLessons = weeklySlots * approxWeeks;
      const absenceRate = totalLessons > 0 ? (totalAbsences / totalLessons) * 100 : 0;

      return {
        ...course,
        totalAbsences,
        excused,
        unexcused,
        eva,
        absenceRate: Math.round(absenceRate * 10) / 10,
        isWarning: absenceRate >= 15,
        isDanger: absenceRate >= 25,
      };
    }).sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [courseInfos, absences, slotCounts]);

  const totalStats = useMemo(() => {
    const total = absences.length;
    const excused = absences.filter(a => a.status === 'excused').length;
    const unexcused = absences.filter(a => a.status === 'unexcused').length;
    const eva = absences.filter(a => a.is_eva).length;
    return { total, excused, unexcused, eva };
  }, [absences]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
          <p className="text-lg font-bold">{totalStats.total}</p>
          <p className="text-[10px] text-muted-foreground">Gesamt</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-500">{totalStats.excused}</p>
          <p className="text-[10px] text-muted-foreground">Entsch.</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
          <p className="text-lg font-bold text-destructive">{totalStats.unexcused}</p>
          <p className="text-[10px] text-muted-foreground">Unentsch.</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
          <p className="text-lg font-bold text-amber-500">{totalStats.eva}</p>
          <p className="text-[10px] text-muted-foreground">EVA</p>
        </div>
      </div>

      {/* Per Course */}
      {courseStats.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Keine Kurse</p>
      ) : (
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pro Kurs</span>
          {courseStats.map(course => (
            <div
              key={course.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                course.isDanger ? 'border-destructive/30 bg-destructive/5' :
                course.isWarning ? 'border-amber-500/30 bg-amber-500/5' :
                'border-border/50 bg-card'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: course.color || '#6366f1' }}
              >
                {course.short_name || course.name.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{course.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {course.excused > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-500">
                      <Check className="w-2.5 h-2.5" /> {course.excused}
                    </span>
                  )}
                  {course.unexcused > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                      <X className="w-2.5 h-2.5" /> {course.unexcused}
                    </span>
                  )}
                  {course.eva > 0 && (
                    <span className="text-[10px] text-amber-500">EVA {course.eva}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">{course.totalAbsences}</p>
                {course.isDanger && <AlertTriangle className="w-3.5 h-3.5 text-destructive ml-auto" />}
                {course.isWarning && !course.isDanger && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-auto" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
