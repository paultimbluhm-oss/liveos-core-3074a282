import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Check } from 'lucide-react';

interface CoursesListV2Props {
  onCourseSelect?: (course: V2Course) => void;
  onCreateCourse?: () => void;
  onCoursesLoaded?: (courses: V2Course[]) => void;
}

export interface CoursesListV2Ref {
  refresh: () => void;
}

export const CoursesListV2 = forwardRef<CoursesListV2Ref, CoursesListV2Props>(
  function CoursesListV2({ onCourseSelect, onCreateCourse, onCoursesLoaded }, ref) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [courses, setCourses] = useState<V2Course[]>([]);
  const [memberCourseIds, setMemberCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load courses for current scope
  const loadCourses = useCallback(async () => {
    if (!user || !scope.school) {
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Hole alle Kurse im aktuellen Scope
    // Jahrgangskurse (class_name = null) + Klassenkurse für aktuelle Klasse
    const { data: coursesData } = await supabase
      .from('v2_courses')
      .select('*')
      .eq('school_id', scope.school.id)
      .eq('grade_level', scope.gradeLevel)
      .eq('semester', scope.semester)
      .or(`class_name.is.null,class_name.eq.${scope.className}`)
      .order('name');

    // Hole Mitgliedschaften des Users
    const { data: memberships } = await supabase
      .from('v2_course_members')
      .select('course_id')
      .eq('user_id', user.id);

    const memberIds = new Set((memberships || []).map(m => m.course_id));
    setMemberCourseIds(memberIds);

    const enrichedCourses = (coursesData || []).map(c => ({
      ...c,
      semester: c.semester as 1 | 2,
      class_name: c.class_name as 'A' | 'B' | 'C' | 'D' | null,
      is_member: memberIds.has(c.id),
    }));

    setCourses(enrichedCourses);
    onCoursesLoaded?.(enrichedCourses);
    setLoading(false);
  }, [user, scope.school?.id, scope.gradeLevel, scope.semester, scope.className, onCoursesLoaded]);

  // Expose refresh to parent
  useImperativeHandle(ref, () => ({
    refresh: loadCourses,
  }), [loadCourses]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleJoinCourse = async (courseId: string) => {
    if (!user) return;

    await supabase
      .from('v2_course_members')
      .insert({
        course_id: courseId,
        user_id: user.id,
        role: 'member',
      });

    // Update local state
    setMemberCourseIds(prev => new Set([...prev, courseId]));
    setCourses(prev => prev.map(c => 
      c.id === courseId ? { ...c, is_member: true } : c
    ));
  };

  const handleLeaveCourse = async (courseId: string) => {
    if (!user) return;

    await supabase
      .from('v2_course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);

    // Update local state
    setMemberCourseIds(prev => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
    setCourses(prev => prev.map(c => 
      c.id === courseId ? { ...c, is_member: false } : c
    ));
  };

  // Separate into my courses and available courses
  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  return (
    <div className="space-y-4">
      {/* Meine Kurse */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Meine Kurse</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateCourse}>
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            </div>
          ) : myCourses.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Noch keine Kurse beigetreten
            </div>
          ) : (
            <div className="space-y-1">
              {myCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => onCourseSelect?.(course)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  >
                    {course.short_name || course.name.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{course.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {course.teacher_name || 'Kein Lehrer'}
                      {course.class_name ? ` · ${scope.gradeLevel}${course.class_name}` : ' · Jahrgang'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verfügbare Kurse */}
      {availableCourses.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-medium">Verfügbare Kurse</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1">
              {availableCourses.map(course => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium opacity-60"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  >
                    {course.short_name || course.name.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{course.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {course.teacher_name || 'Kein Lehrer'}
                      {course.class_name ? ` · ${scope.gradeLevel}${course.class_name}` : ' · Jahrgang'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleJoinCourse(course.id)}
                  >
                    <Users className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    Beitreten
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
