import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { Target, TrendingUp, Calculator } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
}

export function AbiCalculator() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [courses, setCourses] = useState<CourseWithGrades[]>([]);
  const [targetAvg, setTargetAvg] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !scope.school) return;
      
      // Get all courses for this school across all grade levels
      const { data: coursesData } = await supabase
        .from('v2_courses')
        .select('id, name, short_name, color, grade_level, semester, oral_weight, written_weight, practical_weight, has_practical')
        .eq('school_id', scope.school.id);

      if (!coursesData || coursesData.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = coursesData.map(c => c.id);
      
      // Get memberships to filter only joined courses
      const { data: members } = await supabase
        .from('v2_course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      const memberCourseIds = new Set((members || []).map(m => m.course_id));

      // Get all grades
      const { data: grades } = await supabase
        .from('v2_grades')
        .select('course_id, points, grade_type')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      const gradeMap: Record<string, { points: number; grade_type: string }[]> = {};
      (grades || []).forEach(g => {
        if (!gradeMap[g.course_id]) gradeMap[g.course_id] = [];
        gradeMap[g.course_id].push(g);
      });

      const result: CourseWithGrades[] = coursesData
        .filter(c => memberCourseIds.has(c.id))
        .map(c => ({
          ...c,
          has_practical: c.has_practical ?? false,
          grades: gradeMap[c.id] || [],
        }));

      setCourses(result);
      setLoading(false);
    };
    load();
  }, [user, scope.school?.id]);

  const stats = useMemo(() => {
    if (courses.length === 0) return null;

    const courseAverages: { name: string; short_name: string | null; color: string | null; avg: number; gradeLevel: number; semester: number }[] = [];

    courses.forEach(course => {
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
          name: course.name,
          short_name: course.short_name,
          color: course.color,
          avg: weightedSum / totalWeight,
          gradeLevel: course.grade_level,
          semester: course.semester,
        });
      }
    });

    if (courseAverages.length === 0) return null;

    const overallAvg = courseAverages.reduce((s, c) => s + c.avg, 0) / courseAverages.length;
    const totalPoints = courseAverages.reduce((s, c) => s + Math.round(c.avg), 0);
    
    // Abi-Schnitt Berechnung (vereinfacht: Durchschnitt * Faktor)
    // Formel: Abi-Note = 17/3 - (Punkteschnitt / 3)
    const abiNote = Math.max(1.0, Math.min(4.0, 17 / 3 - overallAvg / 3));

    // Was braucht der User noch fuer sein Ziel?
    const targetPoints = (17 / 3 - targetAvg / 15 * 4) * 3; // Umkehr
    const neededAvg = targetAvg;
    const currentDiff = neededAvg - overallAvg;

    return {
      courseAverages: courseAverages.sort((a, b) => b.avg - a.avg),
      overallAvg: Math.round(overallAvg * 10) / 10,
      totalPoints,
      abiNote: Math.round(abiNote * 10) / 10,
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

  if (!stats) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Noch keine Noten vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aktuelle Prognose */}
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

      {/* Kurs-Ranking */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Kurs-Ranking</span>
        {stats.courseAverages.map((c, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: c.color || '#6366f1' }}
            >
              {c.short_name || c.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">Jg. {c.gradeLevel} / HJ {c.semester}</p>
            </div>
            <span className="text-sm font-bold shrink-0">{Math.round(c.avg * 10) / 10}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
