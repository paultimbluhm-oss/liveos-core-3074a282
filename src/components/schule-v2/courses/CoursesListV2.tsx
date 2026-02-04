import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course } from '../types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Users, ChevronDown, ChevronRight } from 'lucide-react';

interface CoursesListV2Props {
  onCourseSelect?: (course: V2Course) => void;
  onCreateCourse?: () => void;
  onCoursesLoaded?: (courses: V2Course[]) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export interface CoursesListV2Ref {
  refresh: () => void;
}

export const CoursesListV2 = forwardRef<CoursesListV2Ref, CoursesListV2Props>(
  function CoursesListV2({ onCourseSelect, onCreateCourse, onCoursesLoaded, onCollapseChange }, ref) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [courses, setCourses] = useState<V2Course[]>([]);
  const [memberCourseIds, setMemberCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [myCoursesOpen, setMyCoursesOpen] = useState(true);
  const [availableCoursesOpen, setAvailableCoursesOpen] = useState(false);

  // Notify parent when collapse state changes
  useEffect(() => {
    const allCollapsed = !myCoursesOpen && !availableCoursesOpen;
    onCollapseChange?.(allCollapsed);
  }, [myCoursesOpen, availableCoursesOpen, onCollapseChange]);

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

  // Separate into my courses and available courses
  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  return (
    <div className="space-y-2">
      {/* Meine Kurse - Collapsible */}
      <Collapsible open={myCoursesOpen} onOpenChange={setMyCoursesOpen}>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-card border">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
            {myCoursesOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            )}
            <span className="text-sm font-medium">Meine Kurse</span>
            <span className="text-xs text-muted-foreground">({myCourses.length})</span>
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreateCourse}>
            <Plus className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
        <CollapsibleContent className="pt-1">
          <div className="rounded-lg bg-card border p-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              </div>
            ) : myCourses.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
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
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-medium"
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
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Verfügbare Kurse - Collapsible */}
      {availableCourses.length > 0 && (
        <Collapsible open={availableCoursesOpen} onOpenChange={setAvailableCoursesOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border w-full text-left">
            {availableCoursesOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            )}
            <span className="text-sm font-medium">Verfügbare Kurse</span>
            <span className="text-xs text-muted-foreground">({availableCourses.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <div className="rounded-lg bg-card border p-2 space-y-1">
              {availableCourses.map(course => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                >
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-medium opacity-60"
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
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});
