import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { Clock, TrendingUp } from 'lucide-react';

interface StatsHeaderV2Props {
  totalLessons: number;
}

export function StatsHeaderV2({ totalLessons }: StatsHeaderV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  const [yearAverage, setYearAverage] = useState<number | null>(null);

  // Berechne Jahresschnitt (HJ1 + HJ2 / 2)
  useEffect(() => {
    const loadYearAverage = async () => {
      if (!user || !scope.school) {
        setYearAverage(null);
        return;
      }

      // Hole alle Kurse für diesen Jahrgang (beide Halbjahre)
      const { data: courses } = await supabase
        .from('v2_courses')
        .select('id')
        .eq('school_id', scope.school.id)
        .eq('grade_level', scope.gradeLevel);

      if (!courses || courses.length === 0) {
        setYearAverage(null);
        return;
      }

      const courseIds = courses.map(c => c.id);

      // Hole alle Noten des Users für diese Kurse
      const { data: grades } = await supabase
        .from('v2_grades')
        .select('points')
        .eq('user_id', user.id)
        .in('course_id', courseIds);

      if (!grades || grades.length === 0) {
        setYearAverage(null);
        return;
      }

      const avg = grades.reduce((sum, g) => sum + g.points, 0) / grades.length;
      setYearAverage(Math.round(avg * 10) / 10);
    };

    loadYearAverage();
  }, [user, scope.school?.id, scope.gradeLevel]);

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Gesamtstunden */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="w-4 h-4" strokeWidth={1.5} />
        <span className="font-medium text-foreground">{totalLessons}</span>
        <span>Std.</span>
      </div>

      {/* Jahresschnitt */}
      {yearAverage !== null && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
          <span className="font-medium text-foreground">{yearAverage}</span>
          <span>P</span>
        </div>
      )}
    </div>
  );
}
