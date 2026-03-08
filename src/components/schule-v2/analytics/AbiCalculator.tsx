import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { Target, TrendingUp, Calculator, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Niedersachsen Abitur:
 * Block I: 32-36 Halbjahresergebnisse. P1+P2 (eA) zählen doppelt → 8 doppelte + 24-28 einfache.
 *   Formel: E_I = 40 × Punktsumme / Anzahl (P1/P2 zählen bei Anzahl doppelt)
 *   Min 200, Max 600
 * Block II: 5 Prüfungsergebnisse × 4
 *   Min 100, Max 300
 * Gesamt: 300–900 → Note via offizielle Tabelle
 */

type CourseType = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'gk' | 'abgewaehlt';

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  p1: 'P1 (eA)',
  p2: 'P2 (eA)',
  p3: 'P3 (eA)',
  p4: 'P4 (gA)',
  p5: 'P5 (mdl)',
  gk: 'GK',
  abgewaehlt: 'Abgew.',
};

interface SemesterGrade {
  gradeLevel: number;
  semester: number;
  avg: number;
  label: string; // e.g. "Q1.1"
}

interface MergedCourse {
  name: string;
  short_name: string | null;
  color: string | null;
  courseType: CourseType;
  semesterGrades: SemesterGrade[];
  courseIds: string[]; // all course IDs for this subject
  primaryId: string; // first course ID (for settings)
}

interface RawCourse {
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
}

// Official Niedersachsen points-to-note table
function pointsToNote(points: number): number {
  if (points >= 823) return 1.0;
  if (points >= 805) return 1.1;
  if (points >= 787) return 1.2;
  if (points >= 769) return 1.3;
  if (points >= 751) return 1.4;
  if (points >= 733) return 1.5;
  if (points >= 715) return 1.6;
  if (points >= 697) return 1.7;
  if (points >= 679) return 1.8;
  if (points >= 661) return 1.9;
  if (points >= 643) return 2.0;
  if (points >= 625) return 2.1;
  if (points >= 607) return 2.2;
  if (points >= 589) return 2.3;
  if (points >= 571) return 2.4;
  if (points >= 553) return 2.5;
  if (points >= 535) return 2.6;
  if (points >= 517) return 2.7;
  if (points >= 499) return 2.8;
  if (points >= 481) return 2.9;
  if (points >= 463) return 3.0;
  if (points >= 445) return 3.1;
  if (points >= 427) return 3.2;
  if (points >= 409) return 3.3;
  if (points >= 391) return 3.4;
  if (points >= 373) return 3.5;
  if (points >= 355) return 3.6;
  if (points >= 337) return 3.7;
  if (points >= 319) return 3.8;
  if (points >= 301) return 3.9;
  return 4.0;
}

function calcCourseAvg(grades: { points: number; grade_type: string }[], course: RawCourse): number | null {
  if (grades.length === 0) return null;
  const semesterGrade = grades.find(g => g.grade_type === 'semester');
  if (semesterGrade) return semesterGrade.points;

  const oral = grades.filter(g => g.grade_type === 'oral');
  const written = grades.filter(g => g.grade_type === 'written');
  const practical = grades.filter(g => g.grade_type === 'practical');

  const oralAvg = oral.length > 0 ? oral.reduce((s, g) => s + g.points, 0) / oral.length : null;
  const writtenAvg = written.length > 0 ? written.reduce((s, g) => s + g.points, 0) / written.length : null;
  const practicalAvg = practical.length > 0 ? practical.reduce((s, g) => s + g.points, 0) / practical.length : null;

  let totalWeight = 0, weightedSum = 0;
  if (oralAvg !== null) { weightedSum += oralAvg * course.oral_weight; totalWeight += course.oral_weight; }
  if (writtenAvg !== null) { weightedSum += writtenAvg * course.written_weight; totalWeight += course.written_weight; }
  if (practicalAvg !== null && course.has_practical) { weightedSum += practicalAvg * course.practical_weight; totalWeight += course.practical_weight; }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
}

// Map grade_level + semester to Q-label
function toQLabel(gradeLevel: number, semester: number, baseGradeLevel: number): string {
  const qYear = gradeLevel - baseGradeLevel + 1;
  return `Q${qYear}.${semester}`;
}

export function AbiCalculator() {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [mergedCourses, setMergedCourses] = useState<MergedCourse[]>([]);
  const [examPoints, setExamPoints] = useState<Record<string, number | null>>({});
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
      supabase.from('v2_abi_course_settings').select('course_id, course_type, exam_points').eq('user_id', user.id),
    ]);

    const memberCourseIds = new Set((membersRes.data || []).map(m => m.course_id));
    const myCourses = coursesData.filter(c => memberCourseIds.has(c.id));

    const gradeMap: Record<string, { points: number; grade_type: string }[]> = {};
    (gradesRes.data || []).forEach(g => {
      if (!gradeMap[g.course_id]) gradeMap[g.course_id] = [];
      gradeMap[g.course_id].push(g);
    });

    const settingsMap: Record<string, { course_type: CourseType; exam_points: number | null }> = {};
    (settingsRes.data || []).forEach(s => {
      settingsMap[s.course_id] = { course_type: s.course_type as CourseType, exam_points: s.exam_points };
    });

    // Find lowest grade level as base for Q-labels
    const gradeLevels = [...new Set(myCourses.map(c => c.grade_level))].sort((a, b) => a - b);
    const baseGradeLevel = gradeLevels.length > 0 ? gradeLevels[0] : 11;

    // Group courses by name
    const groupMap: Record<string, { courses: RawCourse[]; semesterGrades: SemesterGrade[] }> = {};

    myCourses.forEach(course => {
      const key = course.name;
      if (!groupMap[key]) {
        groupMap[key] = { courses: [], semesterGrades: [] };
      }
      groupMap[key].courses.push(course);

      const avg = calcCourseAvg(gradeMap[course.id] || [], course);
      if (avg !== null) {
        groupMap[key].semesterGrades.push({
          gradeLevel: course.grade_level,
          semester: course.semester,
          avg,
          label: toQLabel(course.grade_level, course.semester, baseGradeLevel),
        });
      }
    });

    // Build merged courses - use first course's settings for the type, propagate to all
    const examPts: Record<string, number | null> = {};
    const merged: MergedCourse[] = Object.entries(groupMap).map(([name, group]) => {
      const firstCourse = group.courses[0];
      const allIds = group.courses.map(c => c.id);
      
      // Find course type from any of the course IDs
      let courseType: CourseType = 'gk';
      for (const id of allIds) {
        if (settingsMap[id]) {
          courseType = settingsMap[id].course_type;
          if (settingsMap[id].exam_points !== null) {
            examPts[name] = settingsMap[id].exam_points;
          }
          break;
        }
      }

      // Sort semester grades chronologically
      const sortedGrades = group.semesterGrades.sort((a, b) => 
        a.gradeLevel !== b.gradeLevel ? a.gradeLevel - b.gradeLevel : a.semester - b.semester
      );

      return {
        name,
        short_name: firstCourse.short_name,
        color: firstCourse.color,
        courseType,
        semesterGrades: sortedGrades,
        courseIds: allIds,
        primaryId: allIds[0],
      };
    });

    // Sort: P1-P5 first, then GK, then abgewaehlt
    const typeOrder: Record<CourseType, number> = { p1: 0, p2: 1, p3: 2, p4: 3, p5: 4, gk: 5, abgewaehlt: 6 };
    merged.sort((a, b) => typeOrder[a.courseType] - typeOrder[b.courseType]);

    setMergedCourses(merged);
    setExamPoints(examPts);
    setLoading(false);
  }, [user, scope.school?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTypeChange = async (course: MergedCourse, newType: CourseType) => {
    if (!user) return;

    setMergedCourses(prev => prev.map(c => c.name === course.name ? { ...c, courseType: newType } : c));

    // Save for all course IDs of this subject
    for (const courseId of course.courseIds) {
      await supabase
        .from('v2_abi_course_settings')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          course_type: newType,
        }, { onConflict: 'user_id,course_id' });
    }
  };

  const handleExamPointsChange = async (course: MergedCourse, points: number | null) => {
    if (!user) return;
    setExamPoints(prev => ({ ...prev, [course.name]: points }));

    // Save on primary course ID
    await supabase
      .from('v2_abi_course_settings')
      .upsert({
        user_id: user.id,
        course_id: course.primaryId,
        course_type: course.courseType,
        exam_points: points,
      }, { onConflict: 'user_id,course_id' });
  };

  const calculation = useMemo(() => {
    const activeCourses = mergedCourses.filter(c => c.courseType !== 'abgewaehlt');
    if (activeCourses.length === 0) return null;

    // Block I: Collect all semester grades
    let blockISum = 0;
    let blockICount = 0; // P1/P2 count double in denominator
    let semesterResults: { name: string; label: string; points: number; weight: number }[] = [];

    activeCourses.forEach(course => {
      const isP1P2 = course.courseType === 'p1' || course.courseType === 'p2';
      const weight = isP1P2 ? 2 : 1;

      course.semesterGrades.forEach(sg => {
        const rounded = Math.round(sg.avg);
        blockISum += rounded * weight;
        blockICount += weight;
        semesterResults.push({
          name: course.name,
          label: sg.label,
          points: rounded,
          weight,
        });
      });
    });

    // Block I formula: E_I = 40 × blockISum / blockICount
    const blockI = blockICount > 0 ? Math.round(40 * blockISum / blockICount) : 0;
    const blockIClamped = Math.min(600, Math.max(0, blockI));

    // Block II: Exam results × 4
    const examCourses = activeCourses.filter(c => ['p1', 'p2', 'p3', 'p4', 'p5'].includes(c.courseType));
    let blockIISum = 0;
    let examCount = 0;
    const examResults: { name: string; type: CourseType; points: number | null }[] = [];

    examCourses.forEach(course => {
      const pts = examPoints[course.name] ?? null;
      examResults.push({ name: course.name, type: course.courseType, points: pts });
      if (pts !== null) {
        blockIISum += pts * 4;
        examCount++;
      }
    });

    const blockII = Math.min(300, Math.max(0, blockIISum));
    const hasAllExams = examCount === 5;

    // Total
    const total = blockIClamped + blockII;
    const maxTotal = blockIClamped + (hasAllExams ? blockII : 300); // optimistic max
    const minTotal = blockIClamped + (hasAllExams ? blockII : 100); // pessimistic min
    
    const abiNote = pointsToNote(total);
    const bestCase = pointsToNote(maxTotal);
    const worstCase = pointsToNote(minTotal);

    // Average across all semester grades
    const allGradePoints = activeCourses.flatMap(c => c.semesterGrades.map(sg => Math.round(sg.avg)));
    const overallAvg = allGradePoints.length > 0 
      ? Math.round(allGradePoints.reduce((s, p) => s + p, 0) / allGradePoints.length * 10) / 10 
      : 0;

    return {
      blockI: blockIClamped,
      blockII,
      total,
      abiNote,
      bestCase,
      worstCase,
      hasAllExams,
      examResults,
      semesterCount: semesterResults.length,
      overallAvg,
      activeCourseCount: activeCourses.length,
      droppedCount: mergedCourses.filter(c => c.courseType === 'abgewaehlt').length,
    };
  }, [mergedCourses, examPoints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (mergedCourses.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Noch keine Kurse vorhanden
      </div>
    );
  }

  const pruefungsFaecher = mergedCourses.filter(c => ['p1', 'p2', 'p3', 'p4', 'p5'].includes(c.courseType));
  const grundkurse = mergedCourses.filter(c => c.courseType === 'gk');
  const abgewaehlt = mergedCourses.filter(c => c.courseType === 'abgewaehlt');

  return (
    <div className="space-y-4">
      {/* Ergebnis-Uebersicht */}
      {calculation && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Schnitt</p>
              <p className="text-lg font-bold">{calculation.overallAvg}</p>
              <p className="text-[10px] text-muted-foreground">Punkte</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <Calculator className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Prognose</p>
              <p className="text-lg font-bold">{calculation.abiNote}</p>
              <p className="text-[10px] text-muted-foreground">Abi-Note</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <Target className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Gesamt</p>
              <p className="text-lg font-bold">{calculation.total}</p>
              <p className="text-[10px] text-muted-foreground">/ 900</p>
            </div>
          </div>

          {/* Block-Aufschluesselung */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-[10px] text-primary font-medium">Block I</p>
              <p className="text-lg font-bold text-primary">{calculation.blockI}</p>
              <p className="text-[10px] text-muted-foreground">/ 600 Punkte</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-primary/20 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, calculation.blockI / 6)}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Block II</p>
              <p className="text-lg font-bold">{calculation.blockII}</p>
              <p className="text-[10px] text-muted-foreground">/ 300 Punkte</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-foreground/40 transition-all" style={{ width: `${Math.min(100, calculation.blockII / 3)}%` }} />
              </div>
            </div>
          </div>

          {/* Best/Worst Case wenn nicht alle Pruefungen eingetragen */}
          {!calculation.hasAllExams && (
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-emerald-500/10 p-2.5 text-center">
                <p className="text-[10px] text-emerald-600">Best Case</p>
                <p className="text-sm font-bold text-emerald-600">{calculation.bestCase}</p>
              </div>
              <div className="flex-1 rounded-xl bg-rose-500/10 p-2.5 text-center">
                <p className="text-[10px] text-rose-600">Worst Case</p>
                <p className="text-sm font-bold text-rose-600">{calculation.worstCase}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pruefungsfaecher */}
      {pruefungsFaecher.length > 0 && (
        <Section title={`Pruefungsfaecher (${pruefungsFaecher.length}/5)`}>
          {pruefungsFaecher.map(c => (
            <CourseRow
              key={c.name}
              course={c}
              onTypeChange={handleTypeChange}
              examPoints={examPoints[c.name] ?? null}
              onExamPointsChange={handleExamPointsChange}
              showExamInput
            />
          ))}
        </Section>
      )}

      {/* Grundkurse */}
      {grundkurse.length > 0 && (
        <Section title={`Grundkurse (${grundkurse.length})`}>
          {grundkurse.map(c => (
            <CourseRow
              key={c.name}
              course={c}
              onTypeChange={handleTypeChange}
              examPoints={null}
              onExamPointsChange={handleExamPointsChange}
              showExamInput={false}
            />
          ))}
        </Section>
      )}

      {/* Abgewaehlt */}
      {abgewaehlt.length > 0 && (
        <Section title={`Abgewaehlt (${abgewaehlt.length})`}>
          {abgewaehlt.map(c => (
            <CourseRow
              key={c.name}
              course={c}
              onTypeChange={handleTypeChange}
              examPoints={null}
              onExamPointsChange={handleExamPointsChange}
              showExamInput={false}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function CourseRow({ course, onTypeChange, examPoints, onExamPointsChange, showExamInput }: {
  course: MergedCourse;
  onTypeChange: (course: MergedCourse, type: CourseType) => void;
  examPoints: number | null;
  onExamPointsChange: (course: MergedCourse, points: number | null) => void;
  showExamInput: boolean;
}) {
  return (
    <div className="rounded-lg bg-card border border-border/50 p-2.5 space-y-2">
      {/* Top row: course info + type selector */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: course.color || 'hsl(var(--primary))' }}
        >
          {course.short_name || course.name.substring(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{course.name}</p>
        </div>
        <Select value={course.courseType} onValueChange={(v) => onTypeChange(course, v as CourseType)}>
          <SelectTrigger className="w-24 h-7 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p1" className="text-xs">P1 (eA)</SelectItem>
            <SelectItem value="p2" className="text-xs">P2 (eA)</SelectItem>
            <SelectItem value="p3" className="text-xs">P3 (eA)</SelectItem>
            <SelectItem value="p4" className="text-xs">P4 (gA)</SelectItem>
            <SelectItem value="p5" className="text-xs">P5 (mdl)</SelectItem>
            <SelectItem value="gk" className="text-xs">GK</SelectItem>
            <SelectItem value="abgewaehlt" className="text-xs">Abgew.</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Semester grades */}
      {course.semesterGrades.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {course.semesterGrades.map(sg => (
            <div key={sg.label} className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
              <span className="text-[10px] text-muted-foreground">{sg.label}</span>
              <span className="text-xs font-bold">{Math.round(sg.avg)}</span>
            </div>
          ))}
          {/* Overall for this course */}
          <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
            <span className="text-[10px] text-primary">Schnitt</span>
            <span className="text-xs font-bold text-primary">
              {Math.round(course.semesterGrades.reduce((s, sg) => s + sg.avg, 0) / course.semesterGrades.length * 10) / 10}
            </span>
          </div>
        </div>
      )}

      {course.semesterGrades.length === 0 && course.courseType !== 'abgewaehlt' && (
        <p className="text-[10px] text-muted-foreground">Noch keine Noten</p>
      )}

      {/* Exam input for P1-P5 */}
      {showExamInput && (
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <span className="text-[10px] text-muted-foreground shrink-0">Abi-Pruefung:</span>
          <Input
            type="number"
            min={0}
            max={15}
            placeholder="0-15"
            value={examPoints ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.min(15, Math.max(0, parseInt(e.target.value) || 0));
              onExamPointsChange(course, val);
            }}
            className="h-7 w-16 text-xs text-center"
          />
          {examPoints !== null && (
            <span className="text-[10px] text-muted-foreground">= {examPoints * 4} Pkt (x4)</span>
          )}
        </div>
      )}
    </div>
  );
}
