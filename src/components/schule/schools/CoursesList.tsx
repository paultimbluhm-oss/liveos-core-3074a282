import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Users, UserPlus, ChevronRight } from 'lucide-react';
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

  const fetchCourses = async () => {
    if (!user) return;
    
    let query = supabase
      .from('courses')
      .select('*')
      .eq('school_year_id', schoolYearId)
      .order('name');
    
    // If a class is selected, filter by class_id
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    }
    
    const { data: coursesData, error } = await query;
    
    if (!error && coursesData) {
      // Get member counts and membership status
      const enrichedCourses = await Promise.all(coursesData.map(async (course) => {
        const { count } = await supabase
          .from('course_members')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);
        
        const { data: membership } = await supabase
          .from('course_members')
          .select('id')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        return {
          ...course,
          member_count: count || 0,
          is_member: !!membership,
        };
      }));
      
      setCourses(enrichedCourses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [schoolYearId, classId, user]);

  const joinCourse = async (courseId: string) => {
    if (!user) return;
    
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
    } else {
      toast.success('Kurs beigetreten');
      fetchCourses();
    }
  };

  const leaveCourse = async (courseId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);
    
    if (!error) {
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
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] gap-1"
                        onClick={() => joinCourse(course.id)}
                      >
                        <UserPlus className="w-3 h-3" strokeWidth={1.5} />
                        Beitreten
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
