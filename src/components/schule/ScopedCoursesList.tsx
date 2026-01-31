import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Users, UserPlus, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Course, CourseTimetableSlot } from '@/components/schule/schools/types';
import { Scope, SemesterInfo, ClassName } from '@/hooks/useSchoolScope';

interface ScopedCoursesListProps {
  scope: Scope;
  semesterEntity: SemesterInfo | null;
  onCourseSelect: (course: Course) => void;
  onCreateCourse: () => void;
  onCoursesLoaded?: (courses: Course[], slots: CourseTimetableSlot[]) => void;
}

interface EnrichedCourse extends Course {
  is_member: boolean;
  member_count: number;
  slot_count: number;
  is_class_course: boolean; // true = Klassenkurs, false = Jahrgangskurs
}

export function ScopedCoursesList({
  scope,
  semesterEntity,
  onCourseSelect,
  onCreateCourse,
  onCoursesLoaded,
}: ScopedCoursesListProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user || !scope.year || !semesterEntity) {
      setCourses([]);
      setLoading(false);
      return;
    }
    
    // Hole Kurse fuer diesen Scope:
    // - semester_id muss matchen (Jahrgang + Halbjahr)
    // - class_id ist NULL (Jahrgangskurs) ODER class_id matcht die Klasse
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('school_year_id', scope.year.id)
      .eq('name', scope.className)
      .maybeSingle();
    
    const classId = classData?.id;
    
    let query = supabase
      .from('courses')
      .select('*')
      .eq('semester_id', semesterEntity.id)
      .order('name');
    
    // Zeige Jahrgangskurse (class_id = null) + Klassenkurse (class_id = classId)
    if (classId) {
      query = query.or(`class_id.is.null,class_id.eq.${classId}`);
    } else {
      // Nur Jahrgangskurse wenn keine Klasse gefunden
      query = query.is('class_id', null);
    }
    
    const { data: coursesData } = await query;
    
    if (!coursesData) {
      setCourses([]);
      setLoading(false);
      return;
    }
    
    // Enriche mit Mitgliedschaft und Slot-Count
    const enriched = await Promise.all(coursesData.map(async (course) => {
      const [memberCountRes, membershipRes, slotsRes] = await Promise.all([
        supabase
          .from('course_members')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id),
        supabase
          .from('course_members')
          .select('id')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('course_timetable_slots')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id),
      ]);
      
      return {
        ...course,
        member_count: memberCountRes.count || 0,
        is_member: !!membershipRes.data,
        slot_count: slotsRes.count || 0,
        is_class_course: !!course.class_id,
      } as EnrichedCourse;
    }));
    
    setCourses(enriched);
    setLoading(false);
    
    // Lade Slots fuer beigetretene Kurse
    if (onCoursesLoaded) {
      const memberCourseIds = enriched.filter(c => c.is_member).map(c => c.id);
      if (memberCourseIds.length > 0) {
        const { data: slotsData } = await supabase
          .from('course_timetable_slots')
          .select('*')
          .in('course_id', memberCourseIds);
        
        onCoursesLoaded(enriched, slotsData || []);
      } else {
        onCoursesLoaded(enriched, []);
      }
    }
  }, [user, scope.year?.id, scope.className, semesterEntity?.id, onCoursesLoaded]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const applyCourseSlotsToTimetable = async (courseId: string, userId: string) => {
    const { data: courseData } = await supabase
      .from('courses')
      .select('name, teacher_name, room')
      .eq('id', courseId)
      .single();
    
    if (!courseData) return;
    
    const { data: courseSlots } = await supabase
      .from('course_timetable_slots')
      .select('*')
      .eq('course_id', courseId);
    
    if (!courseSlots || courseSlots.length === 0) return;
    
    for (const slot of courseSlots) {
      // Loesche existierende Eintraege an dieser Stelle
      await supabase
        .from('timetable_entries')
        .delete()
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .eq('week_type', slot.week_type || 'both');
      
      // Erstelle neuen Eintrag
      await supabase.from('timetable_entries').insert({
        user_id: userId,
        day_of_week: slot.day_of_week,
        period: slot.period,
        course_id: courseId,
        teacher_short: courseData.teacher_name || '',
        room: slot.room || courseData.room || null,
        week_type: slot.week_type || 'both',
      });
    }
  };

  const joinCourse = async (courseId: string) => {
    if (!user) return;
    
    setJoiningCourseId(courseId);
    
    const { error } = await supabase.from('course_members').insert({
      course_id: courseId,
      user_id: user.id,
      role: 'member',
    });
    
    if (error) {
      if (error.code === '23505') {
        toast.error('Bereits beigetreten');
      } else {
        toast.error('Fehler beim Beitreten');
      }
      setJoiningCourseId(null);
      return;
    }
    
    await applyCourseSlotsToTimetable(courseId, user.id);
    
    toast.success('Kurs beigetreten');
    setJoiningCourseId(null);
    fetchCourses();
  };

  const leaveCourse = async (courseId: string) => {
    if (!user) return;
    
    // Verlasse Kurs
    await supabase
      .from('course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);
    
    // Entferne Stundenplan-Eintraege
    await supabase
      .from('timetable_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId);
    
    toast.success('Kurs verlassen');
    fetchCourses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Kurse</h3>
        <Button size="sm" className="h-8 gap-1" onClick={onCreateCourse}>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Kurs
        </Button>
      </div>
      
      {courses.length === 0 ? (
        <div className="py-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Keine Kurse in diesem Scope</p>
          <p className="text-[10px] text-muted-foreground/70">
            {scope.gradeLevel}. Jg / {scope.semester}. HJ / Klasse {scope.className}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meine Kurse */}
          {myCourses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Meine Kurse</p>
              {myCourses.map(course => (
                <Card 
                  key={course.id} 
                  className="border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onCourseSelect(course)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-lg border-2 border-emerald-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-500">
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{course.name}</p>
                            {course.is_class_course ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                                {scope.gradeLevel}{scope.className}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                Jg
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {course.teacher_name && <span>{course.teacher_name}</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" strokeWidth={1.5} />
                              {course.member_count}
                            </span>
                            {course.slot_count > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" strokeWidth={1.5} />
                                {course.slot_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px] text-muted-foreground px-2"
                          onClick={(e) => { e.stopPropagation(); leaveCourse(course.id); }}
                        >
                          Verlassen
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Verfuegbare Kurse */}
          {availableCourses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Verfuegbare Kurse</p>
              {availableCourses.map(course => (
                <Card key={course.id} className="transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-lg border-2 border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-muted-foreground">
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{course.name}</p>
                            {course.is_class_course ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                                {scope.gradeLevel}{scope.className}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                Jg
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {course.teacher_name && <span>{course.teacher_name}</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" strokeWidth={1.5} />
                              {course.member_count}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] gap-1"
                        onClick={() => joinCourse(course.id)}
                        disabled={joiningCourseId === course.id}
                      >
                        <UserPlus className="w-3 h-3" strokeWidth={1.5} />
                        {joiningCourseId === course.id ? '...' : 'Beitreten'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
