import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, Settings, Users, Plus, Clock, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SchoolSettingsDialog } from '@/components/schule/schools/SchoolSettingsDialog';
import { CreateCourseDialog } from '@/components/schule/schools/CreateCourseDialog';
import { SchoolTabsDrawer } from '@/components/schule/SchoolTabsDrawer';
import { Course } from '@/components/schule/schools/types';
import { toast } from 'sonner';

interface SchoolInfo {
  id: string;
  name: string;
  short_name: string | null;
}

interface YearInfo {
  id: string;
  name: string;
  year_number: number | null;
}

interface ClassInfo {
  id: string;
  name: string;
}

export default function Schule() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearInfo | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Courses
  const [courses, setCourses] = useState<(Course & { is_member?: boolean; member_count?: number; slot_count?: number })[]>([]);
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);
  
  // Tabs Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<'timetable' | 'course'>('timetable');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchUserSchool = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_school_id, selected_school_year_id, selected_class_id')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.selected_school_id) {
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, short_name')
        .eq('id', profile.selected_school_id)
        .single();
      
      if (school) setSelectedSchool(school);
      
      if (profile.selected_school_year_id) {
        const { data: year } = await supabase
          .from('school_years')
          .select('id, name, year_number')
          .eq('id', profile.selected_school_year_id)
          .single();
        
        if (year) setSelectedYear(year);
      }
      
      if (profile.selected_class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('id, name')
          .eq('id', profile.selected_class_id)
          .single();
        
        if (cls) setSelectedClass(cls);
      } else {
        setSelectedClass(null);
      }
    }
    
    setDataLoading(false);
  };

  const fetchCourses = async () => {
    if (!user || !selectedYear) return;
    
    let query = supabase
      .from('courses')
      .select('*')
      .eq('school_year_id', selectedYear.id)
      .order('name');
    
    if (selectedClass) {
      query = query.or(`class_id.eq.${selectedClass.id},class_id.is.null`);
    }
    
    const { data: coursesData } = await query;
    
    if (coursesData) {
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
  };

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  useEffect(() => {
    if (selectedYear) {
      fetchCourses();
    }
  }, [selectedYear, selectedClass, user]);

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
      const { data: existing } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .eq('week_type', slot.week_type || 'both')
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('timetable_entries')
          .update({
            course_id: courseId,
            teacher_short: courseData.teacher_name || '',
            room: slot.room || courseData.room || null,
          })
          .eq('id', existing.id);
      } else {
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

  const openTimetable = () => {
    setDrawerContext('timetable');
    setSelectedCourse(null);
    setDrawerOpen(true);
  };

  const openCourse = (course: Course) => {
    setDrawerContext('course');
    setSelectedCourse(course);
    setDrawerOpen(true);
  };

  if (loading || !user) return null;

  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {selectedSchool ? (
              <>
                <h1 className="text-lg font-bold">{selectedSchool.short_name || selectedSchool.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedYear?.name}
                  {selectedClass && ` - ${selectedClass.name}`}
                </p>
              </>
            ) : (
              <h1 className="text-lg font-bold">Schule</h1>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
        
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : selectedSchool && selectedYear ? (
          <>
            {/* Stundenplan Card */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={openTimetable}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border-2 border-blue-500 bg-transparent">
                      <GraduationCap className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-semibold">Stundenplan</h2>
                      <p className="text-xs text-muted-foreground">Deine Woche im Ueberblick</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>
            
            {/* Courses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg border-2 border-violet-500 bg-transparent">
                    <Users className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold">Meine Kurse</h2>
                </div>
                <Button size="sm" className="h-8 gap-1" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Kurs
                </Button>
              </div>
              
              {/* My Courses */}
              {myCourses.length > 0 ? (
                <div className="space-y-2">
                  {myCourses.map(course => (
                    <Card 
                      key={course.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => openCourse(course)}
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
                                {(course.slot_count || 0) > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                                    {course.slot_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">Noch keine Kurse beigetreten</p>
                </div>
              )}
              
              {/* Available Courses */}
              {availableCourses.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Verfuegbare Kurse</p>
                  {availableCourses.map(course => (
                    <Card key={course.id}>
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
                            onClick={(e) => { e.stopPropagation(); joinCourse(course.id); }}
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
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="p-3 rounded-xl border-2 border-muted-foreground/30 bg-transparent w-fit mx-auto mb-3">
              <GraduationCap className="w-8 h-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground">Keine Schule ausgewaehlt</p>
            <p className="text-[10px] text-muted-foreground/70 mb-3">
              Waehle Schule, Jahrgang und Klasse aus
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4 mr-1" strokeWidth={1.5} />
              Einstellungen
            </Button>
          </div>
        )}
        
        {/* Dialogs */}
        <SchoolSettingsDialog 
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSchoolChanged={fetchUserSchool}
        />
        
        {selectedYear && (
          <CreateCourseDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            schoolYearId={selectedYear.id}
            schoolId={selectedSchool?.id || ''}
            classId={selectedClass?.id}
            onCourseCreated={fetchCourses}
          />
        )}
        
        {/* Tabs Drawer */}
        <SchoolTabsDrawer 
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          context={drawerContext}
          course={selectedCourse}
        />
      </div>
    </AppLayout>
  );
}
