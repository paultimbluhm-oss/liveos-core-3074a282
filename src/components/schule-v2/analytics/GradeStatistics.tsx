import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { TrendingUp, TrendingDown, BarChart3, ArrowUpDown } from 'lucide-react';
import { useGradeColors } from '@/hooks/useGradeColors';

interface GradeEntry {
  points: number;
  grade_type: string;
  course_id: string;
  semester: number;
  created_at: string;
}

interface CourseInfo {
  id: string;
  name: string;
  short_name: string | null;
  color: string | null;
  oral_weight: number;
  written_weight: number;
  practical_weight: number;
  has_practical: boolean;
  semester: number;
}

export function GradeStatistics() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const { getGradeColor } = useGradeColors();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !scope.school) return;

      const { data: coursesData } = await supabase
        .from('v2_courses')
        .select('id, name, short_name, color, oral_weight, written_weight, practical_weight, has_practical, semester')
        .eq('school_id', scope.school.id)
        .eq('grade_level', scope.gradeLevel);

      if (!coursesData || coursesData.length === 0) { setLoading(false); return; }

      const courseIds = coursesData.map(c => c.id);

      const { data: members } = await supabase
        .from('v2_course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      const memberIds = new Set((members || []).map(m => m.course_id));
      const myCourses = coursesData.filter(c => memberIds.has(c.id)).map(c => ({ ...c, has_practical: c.has_practical ?? false }));

      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('points, grade_type, course_id, semester, created_at')
        .eq('user_id', user.id)
        .in('course_id', myCourses.map(c => c.id))
        .order('created_at');

      setCourses(myCourses);
      setGrades((gradesData || []) as GradeEntry[]);
      setLoading(false);
    };
    load();
  }, [user, scope.school?.id, scope.gradeLevel]);

  const stats = useMemo(() => {
    if (grades.length === 0 || courses.length === 0) return null;

    // By grade type
    const oral = grades.filter(g => g.grade_type === 'oral');
    const written = grades.filter(g => g.grade_type === 'written');
    const practical = grades.filter(g => g.grade_type === 'practical');

    const oralAvg = oral.length > 0 ? oral.reduce((s, g) => s + g.points, 0) / oral.length : null;
    const writtenAvg = written.length > 0 ? written.reduce((s, g) => s + g.points, 0) / written.length : null;
    const practicalAvg = practical.length > 0 ? practical.reduce((s, g) => s + g.points, 0) / practical.length : null;

    // Per course averages
    const courseAvgs: { name: string; short_name: string | null; color: string | null; avg: number; count: number; semester: number }[] = [];
    courses.forEach(course => {
      const cGrades = grades.filter(g => g.course_id === course.id);
      if (cGrades.length === 0) return;
      const avg = cGrades.reduce((s, g) => s + g.points, 0) / cGrades.length;
      courseAvgs.push({ name: course.name, short_name: course.short_name, color: course.color, avg, count: cGrades.length, semester: course.semester });
    });

    const sorted = [...courseAvgs].sort((a, b) => b.avg - a.avg);
    const best = sorted[0] || null;
    const worst = sorted[sorted.length - 1] || null;

    // Per semester comparison
    const sem1Grades = grades.filter(g => g.semester === 1);
    const sem2Grades = grades.filter(g => g.semester === 2);
    const sem1Avg = sem1Grades.length > 0 ? sem1Grades.reduce((s, g) => s + g.points, 0) / sem1Grades.length : null;
    const sem2Avg = sem2Grades.length > 0 ? sem2Grades.reduce((s, g) => s + g.points, 0) / sem2Grades.length : null;

    // Distribution (0-15)
    const dist = new Array(16).fill(0);
    grades.forEach(g => { dist[g.points]++; });

    return {
      total: grades.length,
      oralAvg: oralAvg !== null ? Math.round(oralAvg * 10) / 10 : null,
      writtenAvg: writtenAvg !== null ? Math.round(writtenAvg * 10) / 10 : null,
      practicalAvg: practicalAvg !== null ? Math.round(practicalAvg * 10) / 10 : null,
      oralCount: oral.length,
      writtenCount: written.length,
      practicalCount: practical.length,
      best,
      worst,
      courseAvgs: sorted,
      sem1Avg: sem1Avg !== null ? Math.round(sem1Avg * 10) / 10 : null,
      sem2Avg: sem2Avg !== null ? Math.round(sem2Avg * 10) / 10 : null,
      sem1Count: sem1Grades.length,
      sem2Count: sem2Grades.length,
      distribution: dist,
    };
  }, [grades, courses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-xs text-muted-foreground text-center py-6">Noch keine Noten vorhanden</p>;
  }

  const maxDist = Math.max(...stats.distribution, 1);

  return (
    <div className="space-y-4">
      {/* Type comparison */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nach Notentyp</span>
        <div className="grid grid-cols-3 gap-2">
          {stats.oralAvg !== null && (
            <div className="rounded-xl bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Muendlich</p>
              <p className="text-lg font-bold">{stats.oralAvg}</p>
              <p className="text-[10px] text-muted-foreground">{stats.oralCount} Noten</p>
            </div>
          )}
          {stats.writtenAvg !== null && (
            <div className="rounded-xl bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Schriftlich</p>
              <p className="text-lg font-bold">{stats.writtenAvg}</p>
              <p className="text-[10px] text-muted-foreground">{stats.writtenCount} Noten</p>
            </div>
          )}
          {stats.practicalAvg !== null && (
            <div className="rounded-xl bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Praxis</p>
              <p className="text-lg font-bold">{stats.practicalAvg}</p>
              <p className="text-[10px] text-muted-foreground">{stats.practicalCount} Noten</p>
            </div>
          )}
        </div>
      </div>

      {/* Semester comparison */}
      {(stats.sem1Avg !== null || stats.sem2Avg !== null) && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Halbjahres-Vergleich</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">HJ 1</p>
              <p className="text-lg font-bold">{stats.sem1Avg ?? '-'}</p>
              <p className="text-[10px] text-muted-foreground">{stats.sem1Count} Noten</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-2.5 text-center relative">
              <p className="text-[10px] text-muted-foreground">HJ 2</p>
              <p className="text-lg font-bold">{stats.sem2Avg ?? '-'}</p>
              <p className="text-[10px] text-muted-foreground">{stats.sem2Count} Noten</p>
              {stats.sem1Avg !== null && stats.sem2Avg !== null && (
                <div className="absolute top-1.5 right-1.5">
                  {stats.sem2Avg >= stats.sem1Avg
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    : <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Best / Worst */}
      {stats.best && stats.worst && stats.courseAvgs.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Bester Kurs</span>
            </div>
            <p className="text-xs font-medium truncate">{stats.best.short_name || stats.best.name}</p>
            <p className="text-sm font-bold">{Math.round(stats.best.avg * 10) / 10} P</p>
          </div>
          <div className="rounded-xl p-2.5 border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] text-muted-foreground">Schwaecher</span>
            </div>
            <p className="text-xs font-medium truncate">{stats.worst.short_name || stats.worst.name}</p>
            <p className="text-sm font-bold">{Math.round(stats.worst.avg * 10) / 10} P</p>
          </div>
        </div>
      )}

      {/* Distribution bar chart */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Notenverteilung</span>
        </div>
        <div className="flex items-end gap-[3px] h-16">
          {stats.distribution.map((count, pts) => (
            <div key={pts} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${(count / maxDist) * 100}%`,
                  minHeight: count > 0 ? '4px' : '0px',
                  backgroundColor: count > 0 ? getGradeColor(pts) : 'transparent',
                }}
              />
              <span className="text-[8px] text-muted-foreground">{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
