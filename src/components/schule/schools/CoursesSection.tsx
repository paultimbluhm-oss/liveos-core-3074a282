import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, BookOpen, Users, ChevronRight, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SchoolYear, Course } from './types';
import { CourseDetailSection } from './CourseDetailSection';

interface CoursesSectionProps {
  schoolYear: SchoolYear;
  schoolName: string;
  onBack: () => void;
}

export function CoursesSection({ schoolYear, schoolName, onBack }: CoursesSectionProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const fetchCourses = async () => {
    if (!user) return;

    const { data: coursesData, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_year_id', schoolYear.id)
      .order('name');
    
    if (!error && coursesData) {
      // Get member counts and check membership
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
  }, [schoolYear.id, user]);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error('Name erforderlich');
      return;
    }

    const { data: courseData, error } = await supabase.from('courses').insert({
      school_year_id: schoolYear.id,
      name: name.trim(),
      short_name: shortName.trim() || null,
      teacher_name: teacherName.trim() || null,
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      // Auto-join the creator
      await supabase.from('course_members').insert({
        course_id: courseData.id,
        user_id: user.id,
        role: 'admin',
      });
      
      toast.success('Kurs erstellt');
      setDialogOpen(false);
      setName('');
      setShortName('');
      setTeacherName('');
      fetchCourses();
    }
  };

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
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-[10px] text-muted-foreground">{schoolName} - {schoolYear.name}</p>
            <h2 className="text-lg font-bold">Kurse</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-2.5">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Kurs erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="z.B. Mathe LK"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={shortName} 
                  onChange={(e) => setShortName(e.target.value)} 
                  placeholder="z.B. MA"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Lehrer</Label>
                <Input 
                  value={teacherName} 
                  onChange={(e) => setTeacherName(e.target.value)} 
                  placeholder="z.B. Herr Mueller"
                  className="h-9"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Keine Kurse vorhanden</p>
          <p className="text-xs text-muted-foreground/70">Erstelle einen Kurs oder tritt einem bei</p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map(course => (
            <Card 
              key={course.id} 
              className={`transition-colors ${course.is_member ? 'border-primary/30' : ''}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => course.is_member && setSelectedCourse(course)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                      {(course.short_name || course.name)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{course.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {course.teacher_name && <span>{course.teacher_name}</span>}
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {course.member_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {course.is_member ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => leaveCourse(course.id)}
                        >
                          Verlassen
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => setSelectedCourse(course)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-xs gap-1"
                        onClick={() => joinCourse(course.id)}
                      >
                        <UserPlus className="w-3 h-3" />
                        Beitreten
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
