import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { Target, TrendingUp, Calculator } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CourseType = 'lk' | 'gk' | 'abgewaehlt';

interface CourseWithGrades {
  id: string;
  name: string;
  short_name: string | null;
  color: string | null;
  grade_level: number;
  semester: number;
  oral_weight: number;
  written_weight: number;
  practical_weight: number;
  has_practical: boolean;
  grades: { points: number; grade_type: string }[];
  courseType: CourseType;
}

export function AbiCalculator() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [courses, setCourses] = useState<CourseWithGrades[]>([]);
  const [courseTypes, setCourseTypes] = useState<Record<string, CourseType>>({});
  const [targetAvg, setTargetAvg] = useState(10);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || !scope.school) return;

    const { data: coursesData } = await supabase
      .from('v2_courses')
      .select('id, name, short_name, color, grade_level, semester, oral_weight, written_weight, practical_weight, has_practical')
      .eq('school_id', scope.school.id);

    if (!coursesData || coursesData.length === 0) {
      setLoading(false);
      return;
    }

    const courseIds = coursesData.map(c => c.id);

    const [membersRes, gradesRes, settingsRes] = await Promise.all([
      supabase.from('v2_course_members').select('course_id').eq('user_id', user.id).in('course_id', courseIds),
      supabase.from('v2_grades').select('course_id, points, grade_type').eq('user_id', user.id).in('course_id', courseIds),
      supabase.from('v2_abi_course_settings').select('course_id, course_type').eq('user_id', user.id),
    ]);

    const memberCourseIds = new Set((membersRes.data || []).map(m => m.course_id));

    const gradeMap: Record<string, { points: number; grade_type: string }[]> = {};
    (gradesRes.data || []).forEach(g => {
      if (!gradeMap[g.course_id]) gradeMap[g.course_id] = [];
      gradeMap[g.course_id].push(g);
    });

    const typeMap: Record<string, CourseType> = {};
    (settingsRes.data || []).forEach(s => {
      typeMap[s.course_id] = s.course_type as CourseType;
    });
    setCourseTypes(typeMap);

    const result: CourseWithGrades[] = coursesData
      .filter(c => memberCourseIds.has(c.id))
      .map(c => ({
        ...c,
        has_practical: c.has_practical ?? false,
        grades: gradeMap[c.id] || [],
        courseType: typeMap[c.id] || 'gk',
      }));

    setCourses(result);
    setLoading(false);
  }, [user, scope.school?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTypeChange = async (courseId: string, newType: CourseType) => {
    if (!user) return;

    setCourseTypes(prev => ({ ...prev, [courseId]: newType }));
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, courseType: newType } : c));

    await supabase
      .from('v2_abi_course_settings')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        course_type: newType,
      }, { onConflict: 'user_id,course_id' });
  };

  const stats = useMemo(() => {
    const activeCourses = courses.filter(c => c.courseType !== 'abgewaehlt');
    if (activeCourses.length === 0) return null;

    const courseAverages: { id: string; name: string; short_name: string | null; color: string | null; avg: number; gradeLevel: number; semester: number; courseType: CourseType }[] = [];

    activeCourses.forEach(course => {
      if (course.grades.length === 0) return;

      const oral = course.grades.filter(g => g.grade_type === 'oral');
      const written = course.grades.filter(g => g.grade_type === 'written');
      const practical = course.grades.filter(g => g.grade_type === 'practical');

      const oralAvg = oral.length > 0 ? oral.reduce((s, g) => s + g.points, 0) / oral.length : null;
      const writtenAvg = written.length > 0 ? written.reduce((s, g) => s + g.points, 0) / written.length : null;
      const practicalAvg = practical.length > 0 ? practical.reduce((s, g) => s + g.points, 0) / practical.length : null;

      let totalWeight = 0;
      let weightedSum = 0;
      if (oralAvg !== null) { weightedSum += oralAvg * course.oral_weight; totalWeight += course.oral_weight; }
      if (writtenAvg !== null) { weightedSum += writtenAvg * course.written_weight; totalWeight += course.written_weight; }
      if (practicalAvg !== null && course.has_practical) { weightedSum += practicalAvg * course.practical_weight; totalWeight += course.practical_weight; }

      if (totalWeight > 0) {
        courseAverages.push({
          id: course.id,
          name: course.name,
          short_name: course.short_name,
          color: course.color,
          avg: weightedSum / totalWeight,
          gradeLevel: course.grade_level,
          semester: course.semester,
          courseType: course.courseType,
        });
      }
    });

    if (courseAverages.length === 0) return null;

    const lkCourses = courseAverages.filter(c => c.courseType === 'lk');
    const gkCourses = courseAverages.filter(c => c.courseType === 'gk');

    const overallAvg = courseAverages.reduce((s, c) => s + c.avg, 0) / courseAverages.length;
    const abiNote = Math.max(1.0, Math.min(4.0, 17 / 3 - overallAvg / 3));

    const neededAvg = targetAvg;
    const currentDiff = neededAvg - overallAvg;

    return {
      courseAverages: courseAverages.sort((a, b) => b.avg - a.avg),
      lkCount: lkCourses.length,
      gkCount: gkCourses.length,
      droppedCount: courses.filter(c => c.courseType === 'abgewaehlt').length,
      overallAvg: Math.round(overallAvg * 10) / 10,
      abiNote: Math.round(abiNote * 10) / 10,
      lkAvg: lkCourses.length > 0 ? Math.round(lkCourses.reduce((s, c) => s + c.avg, 0) / lkCourses.length * 10) / 10 : null,
      gkAvg: gkCourses.length > 0 ? Math.round(gkCourses.reduce((s, c) => s + c.avg, 0) / gkCourses.length * 10) / 10 : null,
      neededAvg,
      currentDiff: Math.round(currentDiff * 10) / 10,
      coursesWithGrades: courseAverages.length,
    };
  }, [courses, targetAvg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const allCourses = courses;
  const lkCourses = allCourses.filter(c => c.courseType === 'lk');
  const gkCourses = allCourses.filter(c => c.courseType === 'gk');
  const droppedCourses = allCourses.filter(c => c.courseType === 'abgewaehlt');

  return (
    <div className="space-y-4">
      {/* Prognose */}
      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Schnitt</p>
              <p className="text-lg font-bold">{stats.overallAvg}</p>
              <p className="text-[10px] text-muted-foreground">Punkte</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <Calculator className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Prognose</p>
              <p className="text-lg font-bold">{stats.abiNote}</p>
              <p className="text-[10px] text-muted-foreground">Abi-Note</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <Target className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Kurse</p>
              <p className="text-lg font-bold">{stats.coursesWithGrades}</p>
              <p className="text-[10px] text-muted-foreground">bewertet</p>
            </div>
          </div>

          {/* LK / GK Schnitt */}
          {(stats.lkAvg !== null || stats.gkAvg !== null) && (
            <div className="flex gap-3">
              {stats.lkAvg !== null && (
                <div className="flex-1 rounded-xl bg-primary/10 p-3 text-center">
                  <p className="text-[10px] text-primary font-medium">LK-Schnitt</p>
                  <p className="text-lg font-bold text-primary">{stats.lkAvg}</p>
                </div>
              )}
              {stats.gkAvg !== null && (
                <div className="flex-1 rounded-xl bg-muted/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">GK-Schnitt</p>
                  <p className="text-lg font-bold">{stats.gkAvg}</p>
                </div>
              )}
            </div>
          )}

          {/* Ziel-Slider */}
          <div className="rounded-xl bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ziel-Schnitt</span>
              <span className="text-sm font-bold">{targetAvg} Punkte</span>
            </div>
            <Slider
              value={[targetAvg]}
              onValueChange={([v]) => setTargetAvg(v)}
              min={5}
              max={15}
              step={1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              {stats.currentDiff > 0
                ? `Du brauchst noch ${stats.currentDiff} Punkte mehr im Schnitt`
                : stats.currentDiff === 0
                  ? 'Du bist genau auf Kurs'
                  : `Du liegst ${Math.abs(stats.currentDiff)} Punkte ueber deinem Ziel`
              }
            </p>
          </div>
        </>
      )}

      {!stats && allCourses.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Noch keine Noten vorhanden
        </div>
      )}

      {allCourses.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Noch keine Kurse vorhanden
        </div>
      )}

      {/* Kurs-Zuordnung */}
      {allCourses.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Kurs-Zuordnung</span>

          {/* LK */}
          {lkCourses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-primary">Leistungskurse ({lkCourses.length})</p>
              {lkCourses.map(c => (
                <CourseTypeRow key={c.id} course={c} onTypeChange={handleTypeChange} stats={stats} />
              ))}
            </div>
          )}

          {/* GK */}
          {gkCourses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold">Grundkurse ({gkCourses.length})</p>
              {gkCourses.map(c => (
                <CourseTypeRow key={c.id} course={c} onTypeChange={handleTypeChange} stats={stats} />
              ))}
            </div>
          )}

          {/* Abgewaehlt */}
          {droppedCourses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Abgewaehlt ({droppedCourses.length})</p>
              {droppedCourses.map(c => (
                <CourseTypeRow key={c.id} course={c} onTypeChange={handleTypeChange} stats={stats} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourseTypeRow({ course, onTypeChange, stats }: {
  course: CourseWithGrades;
  onTypeChange: (courseId: string, type: CourseType) => void;
  stats: any;
}) {
  const avg = stats?.courseAverages?.find((c: any) => c.id === course.id)?.avg;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: course.color || 'hsl(var(--primary))' }}
      >
        {course.short_name || course.name.substring(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{course.name}</p>
        <p className="text-[10px] text-muted-foreground">Jg. {course.grade_level} / HJ {course.semester}</p>
      </div>
      {avg !== undefined && (
        <span className="text-sm font-bold shrink-0 mr-1">{Math.round(avg * 10) / 10}</span>
      )}
      <Select value={course.courseType} onValueChange={(v) => onTypeChange(course.id, v as CourseType)}>
        <SelectTrigger className="w-20 h-7 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lk" className="text-xs">LK</SelectItem>
          <SelectItem value="gk" className="text-xs">GK</SelectItem>
          <SelectItem value="abgewaehlt" className="text-xs">Abgew.</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
