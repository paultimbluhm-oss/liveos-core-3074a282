import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Users, UserPlus, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Course } from './types';
import { CreateCourseDialog } from './CreateCourseDialog';
import { CourseDetailSection } from './CourseDetailSection';

interface CoursesListProps {
  schoolYearId: string;
  schoolId: string;
  schoolName: string;
  yearName: string;
  classId?: string;
  className?: string;
}

export function CoursesList({ schoolYearId, schoolId, schoolName, yearName, classId, className }: CoursesListProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);

  const fetchCourses = async () => {
    if (!user) return;
    
    let query = supabase
      .from('courses')
      .select('*')
      .eq('school_year_id', schoolYearId)
      .order('name');
    
    // If a class is selected, filter by class_id (show class-specific + year-wide courses)
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    }
    
    const { data: coursesData, error } = await query;
    
    if (!error && coursesData) {
      // Get member counts, membership status, and slot counts
      const enrichedCourses = await Promise.all(coursesData.map(async (course) => {
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
        };
      }));
      
      setCourses(enrichedCourses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [schoolYearId, classId, user]);

  const applyCourseSlotsToTimetable = async (courseId: string, userId: string) => {
    // Get course details
    const { data: courseData } = await supabase
      .from('courses')
      .select('name, teacher_name, room')
      .eq('id', courseId)
      .single();
    
    if (!courseData) return;
    
    // Get all slots for this course
    const { data: courseSlots } = await supabase
      .from('course_timetable_slots')
      .select('*')
      .eq('course_id', courseId);
    
    if (!courseSlots || courseSlots.length === 0) return;
    
    for (const slot of courseSlots) {
      // Check if slot already exists for this user at this time
      const { data: existing } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .eq('week_type', slot.week_type || 'both')
        .maybeSingle();
      
      if (existing) {
        // Update existing entry
        await supabase
          .from('timetable_entries')
          .update({
            course_id: courseId,
            teacher_short: courseData.teacher_name || '',
            room: slot.room || courseData.room || null,
          })
          .eq('id', existing.id);
      } else {
        // Insert new entry
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
    }
  };

  const removeCourseSlotsFromTimetable = async (courseId: string, userId: string) => {
    // Remove all timetable entries linked to this course
    await supabase
      .from('timetable_entries')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);
  };

  const joinCourse = async (courseId: string) => {
    if (!user) return;
    
    setJoiningCourseId(courseId);
    
    // Join the course
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
    
    // Automatically apply course slots to personal timetable
    await applyCourseSlotsToTimetable(courseId, user.id);
    
    toast.success('Kurs beigetreten - Stundenplan aktualisiert');
    setJoiningCourseId(null);
    fetchCourses();
  };

  const leaveCourse = async (courseId: string) => {
    if (!user) return;
    
    // Leave the course
    const { error } = await supabase
      .from('course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);
    
    if (!error) {
      // Remove course slots from personal timetable
      await removeCourseSlotsFromTimetable(courseId, user.id);
      
      toast.success('Kurs verlassen');
      fetchCourses();
    }
  };

  if (selectedCourse) {
    return (
      <CourseDetailSection 
        course={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          fetchCourses();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // Filter to show only courses user is member of + available courses
  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">{schoolName}</p>
          <h3 className="font-semibold">{yearName}{className && ` - ${className}`}</h3>
        </div>
        <Button size="sm" className="h-8 gap-1" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Kurs
        </Button>
      </div>
      
      {courses.length === 0 ? (
        <div className="py-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Keine Kurse vorhanden</p>
          <p className="text-[10px] text-muted-foreground/70">Erstelle einen Kurs oder tritt einem bei</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* My Courses */}
          {myCourses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Meine Kurse</p>
              {myCourses.map(course => (
                <Card 
                  key={course.id} 
                  className="border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedCourse(course)}
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
                          <p className="font-medium text-sm truncate">{course.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {course.teacher_name && <span>{course.teacher_name}</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" strokeWidth={1.5} />
                              {course.member_count}
                            </span>
                            {(course as any).slot_count > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" strokeWidth={1.5} />
                                {(course as any).slot_count}
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
          
          {/* Available Courses */}
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
                          <p className="font-medium text-sm truncate">{course.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {course.teacher_name && <span>{course.teacher_name}</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" strokeWidth={1.5} />
                              {course.member_count}
                            </span>
                            {(course as any).slot_count > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" strokeWidth={1.5} />
                                {(course as any).slot_count}
                              </span>
                            )}
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
                        {joiningCourseId === course.id ? 'Wird...' : 'Beitreten'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      
      <CreateCourseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        schoolYearId={schoolYearId}
        schoolId={schoolId}
        classId={classId}
        onCourseCreated={fetchCourses}
      />
    </div>
  );
}
