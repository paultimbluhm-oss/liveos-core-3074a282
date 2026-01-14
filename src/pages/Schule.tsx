import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, Settings, Users, Plus, Clock, UserPlus, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SchoolSettingsDialog } from '@/components/schule/schools/SchoolSettingsDialog';
import { CreateCourseDialog } from '@/components/schule/schools/CreateCourseDialog';
import { SchoolTabsDrawer } from '@/components/schule/SchoolTabsDrawer';
import { Course } from '@/components/schule/schools/types';
import { toast } from 'sonner';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  course_id: string | null;
  teacher_short: string | null;
  room: string | null;
  week_type: string;
}

interface CourseGradeAvg {
  course_id: string;
  avg: number;
}

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

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export default function Schule() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearInfo | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Timetable
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [courseGrades, setCourseGrades] = useState<CourseGradeAvg[]>([]);
  
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

  const fetchTimetable = async () => {
    if (!user) return;
    
    const { data: entries } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week')
      .order('period');
    
    if (entries) setTimetableEntries(entries);
    
    // Fetch grades per course
    const { data: grades } = await supabase
      .from('grades')
      .select('course_id, points')
      .eq('user_id', user.id)
      .not('course_id', 'is', null);
    
    if (grades) {
      // Calculate average per course
      const courseMap = new Map<string, number[]>();
      grades.forEach(g => {
        if (g.course_id) {
          if (!courseMap.has(g.course_id)) {
            courseMap.set(g.course_id, []);
          }
          courseMap.get(g.course_id)!.push(g.points);
        }
      });
      
      const avgs: CourseGradeAvg[] = [];
      courseMap.forEach((points, courseId) => {
        const avg = points.reduce((a, b) => a + b, 0) / points.length;
        avgs.push({ course_id: courseId, avg: Math.round(avg * 10) / 10 });
      });
      setCourseGrades(avgs);
    }
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
    if (user) {
      fetchTimetable();
    }
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
    fetchTimetable();
  };

  const openCourse = (course: Course) => {
    setDrawerContext('course');
    setSelectedCourse(course);
    setDrawerOpen(true);
  };

  const openCourseById = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      openCourse(course);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 13) return 'bg-emerald-500';
    if (grade >= 10) return 'bg-amber-500';
    if (grade >= 5) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getCourseGrade = (courseId: string | null) => {
    if (!courseId) return null;
    const found = courseGrades.find(g => g.course_id === courseId);
    return found?.avg ?? null;
  };

  if (loading || !user) return null;

  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);

  // Build timetable grid
  const getEntry = (day: number, period: number) => {
    return timetableEntries.find(e => e.day_of_week === day && e.period === period);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
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
            {/* Timetable Grid - Always visible */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 gap-0.5 min-w-[320px]">
                {/* Header row */}
                <div className="h-6" />
                {DAYS.map(day => (
                  <div key={day} className="h-6 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {/* Period rows */}
                {PERIODS.map(period => (
                  <>
                    <div key={`p-${period}`} className="h-12 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      {period}
                    </div>
                    {DAYS.map((_, dayIndex) => {
                      const entry = getEntry(dayIndex, period);
                      const courseId = entry?.course_id;
                      const grade = getCourseGrade(courseId);
                      const course = courseId ? courses.find(c => c.id === courseId) : null;
                      const hasContent = !!entry?.course_id || !!entry?.teacher_short;
                      
                      return (
                        <div
                          key={`${dayIndex}-${period}`}
                          onClick={() => courseId && openCourseById(courseId)}
                          className={`h-12 rounded-lg flex flex-col items-center justify-center text-[9px] font-medium relative transition-all ${
                            hasContent 
                              ? 'bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/20' 
                              : 'bg-muted/30'
                          }`}
                        >
                          {hasContent && (
                            <>
                              <span className="text-primary font-bold">
                                {course?.short_name?.slice(0, 3) || entry?.teacher_short?.slice(0, 3) || ''}
                              </span>
                              {entry?.room && (
                                <span className="text-[8px] text-muted-foreground">{entry.room}</span>
                              )}
                              {grade !== null && (
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getGradeColor(grade)} flex items-center justify-center`}>
                                  <span className="text-[7px] text-white font-bold">{Math.round(grade)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
            
            {/* Courses Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg border-2 border-violet-500 bg-transparent">
                    <Users className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-semibold text-sm">Meine Kurse</h2>
                </div>
                <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-3 h-3" strokeWidth={1.5} />
                  Kurs
                </Button>
              </div>
              
              {/* My Courses - Compact horizontal list */}
              {myCourses.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {myCourses.map(course => {
                    const grade = getCourseGrade(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => openCourse(course)}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div 
                          className="w-7 h-7 rounded-md border-2 flex items-center justify-center"
                          style={{ borderColor: course.color || 'hsl(var(--primary))' }}
                        >
                          <span 
                            className="text-[9px] font-bold"
                            style={{ color: course.color || 'hsl(var(--primary))' }}
                          >
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[80px]">{course.short_name || course.name}</p>
                          {grade !== null && (
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getGradeColor(grade)}`} />
                              <span className="text-[10px] text-muted-foreground">{grade}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">Noch keine Kurse beigetreten</p>
                </div>
              )}
              
              {/* Available Courses */}
              {availableCourses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Verfuegbar</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {availableCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50"
                      >
                        <div className="w-7 h-7 rounded-md border-2 border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-muted-foreground">
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[60px]">{course.short_name || course.name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-2.5 h-2.5" strokeWidth={1.5} />
                            {course.member_count}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); joinCourse(course.id); }}
                          disabled={joiningCourseId === course.id}
                        >
                          <UserPlus className="w-3 h-3" strokeWidth={1.5} />
                        </Button>
                      </div>
                    ))}
                  </div>
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
            onCourseCreated={() => { fetchCourses(); fetchTimetable(); }}
          />
        )}
        
        {/* Tabs Drawer */}
        <SchoolTabsDrawer 
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            if (!open) {
              fetchTimetable();
            }
          }}
          context={drawerContext}
          course={selectedCourse}
        />
      </div>
    </AppLayout>
  );
}
