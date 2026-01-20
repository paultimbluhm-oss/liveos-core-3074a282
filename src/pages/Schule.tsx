import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, Settings, Users, Plus, Clock, UserPlus, CalendarX, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SchoolSettingsDialog } from '@/components/schule/schools/SchoolSettingsDialog';
import { CreateCourseDialog } from '@/components/schule/schools/CreateCourseDialog';
import { EditCourseDialog } from '@/components/schule/schools/EditCourseDialog';
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
  
  // Grade color settings
  const [gradeColorSettings, setGradeColorSettings] = useState<{ green_min: number; yellow_min: number }>({ green_min: 13, yellow_min: 10 });
  
  // Courses
  const [courses, setCourses] = useState<(Course & { is_member?: boolean; member_count?: number; slot_count?: number })[]>([]);
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);
  
  // Tabs Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<'timetable' | 'course'>('timetable');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Edit Course Dialog
  const [editCourseDialogOpen, setEditCourseDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

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
    
    const [entriesRes, gradesRes, colorSettingsRes] = await Promise.all([
      supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('period'),
      supabase
        .from('grades')
        .select('course_id, points')
        .eq('user_id', user.id)
        .not('course_id', 'is', null),
      supabase
        .from('grade_color_settings')
        .select('green_min, yellow_min')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);
    
    if (entriesRes.data) setTimetableEntries(entriesRes.data);
    
    if (colorSettingsRes.data) {
      setGradeColorSettings(colorSettingsRes.data);
    }
    
    if (gradesRes.data) {
      // Calculate average per course
      const courseMap = new Map<string, number[]>();
      gradesRes.data.forEach(g => {
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

  // Clean up duplicate timetable entries
  const cleanupDuplicateEntries = async () => {
    if (!user) return;
    
    // Get all entries for this user
    const { data: entries } = await supabase
      .from('timetable_entries')
      .select('id, day_of_week, period, course_id, week_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!entries) return;
    
    // Find duplicates (same day + period + week_type)
    const seen = new Map<string, string>();
    const toDelete: string[] = [];
    
    for (const entry of entries) {
      const key = `${entry.day_of_week}-${entry.period}-${entry.week_type || 'both'}`;
      if (seen.has(key)) {
        // Keep the one with course_id if possible, otherwise keep the newest
        const existingId = seen.get(key)!;
        const existingEntry = entries.find(e => e.id === existingId);
        
        if (entry.course_id && !existingEntry?.course_id) {
          // Current entry has course, existing doesn't - delete existing
          toDelete.push(existingId);
          seen.set(key, entry.id);
        } else {
          // Delete current (older or no course)
          toDelete.push(entry.id);
        }
      } else {
        seen.set(key, entry.id);
      }
    }
    
    // Delete duplicates
    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await supabase.from('timetable_entries').delete().eq('id', id);
      }
    }
  };
  
  // Clean up duplicate courses (same name in same school year for this user)
  const cleanupDuplicateCourses = async () => {
    if (!user || !selectedYear) return;
    
    // Get all courses the user is a member of in this school year
    const { data: memberCourses } = await supabase
      .from('course_members')
      .select('course_id, courses(id, name, school_year_id, created_at)')
      .eq('user_id', user.id);
    
    if (!memberCourses) return;
    
    // Group by course name
    const coursesByName = new Map<string, { id: string; created_at: string }[]>();
    
    for (const mc of memberCourses) {
      const course = mc.courses as any;
      if (!course || course.school_year_id !== selectedYear.id) continue;
      
      const key = course.name.toLowerCase();
      if (!coursesByName.has(key)) {
        coursesByName.set(key, []);
      }
      coursesByName.get(key)!.push({ id: course.id, created_at: course.created_at });
    }
    
    // For each name with duplicates, keep oldest and remove user from newer ones
    for (const [, coursesWithSameName] of coursesByName) {
      if (coursesWithSameName.length > 1) {
        // Sort by created_at ascending (oldest first)
        coursesWithSameName.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Remove membership from all but the oldest
        for (let i = 1; i < coursesWithSameName.length; i++) {
          await supabase
            .from('course_members')
            .delete()
            .eq('course_id', coursesWithSameName[i].id)
            .eq('user_id', user.id);
            
          // Also remove timetable entries for this course
          await supabase
            .from('timetable_entries')
            .delete()
            .eq('course_id', coursesWithSameName[i].id)
            .eq('user_id', user.id);
        }
      }
    }
  };

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  useEffect(() => {
    if (user) {
      // First cleanup, then fetch
      cleanupDuplicateEntries().then(() => fetchTimetable());
    }
  }, [user]);

  useEffect(() => {
    if (selectedYear && user) {
      // First cleanup duplicate courses, then fetch
      cleanupDuplicateCourses().then(() => fetchCourses());
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
      // First, check for ANY existing entry at this day/period (regardless of week_type)
      // to prevent duplicates
      const { data: existingEntries } = await supabase
        .from('timetable_entries')
        .select('id, week_type, course_id')
        .eq('user_id', userId)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period);
      
      const slotWeekType = slot.week_type || 'both';
      
      if (existingEntries && existingEntries.length > 0) {
        // Delete all existing entries at this slot to avoid duplicates
        for (const entry of existingEntries) {
          // Only update/delete if it's not already assigned to another course
          // or if it has no course
          if (!entry.course_id || entry.course_id === courseId) {
            await supabase
              .from('timetable_entries')
              .delete()
              .eq('id', entry.id);
          }
        }
      }
      
      // Insert fresh entry
      await supabase.from('timetable_entries').insert({
        user_id: userId,
        day_of_week: slot.day_of_week,
        period: slot.period,
        course_id: courseId,
        teacher_short: courseData.teacher_name || '',
        room: slot.room || courseData.room || null,
        week_type: slotWeekType,
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
    if (grade >= gradeColorSettings.green_min) return 'bg-emerald-500';
    if (grade >= gradeColorSettings.yellow_min) return 'bg-amber-500';
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

  // Build timetable grid with double lesson detection
  const getEntry = (day: number, period: number) => {
    return timetableEntries.find(e => e.day_of_week === day && e.period === period);
  };

  // Helper to check if entry is a free period
  const isFreeEntry = (entry: TimetableEntry | undefined): boolean => {
    return entry?.teacher_short === 'FREI' && !entry?.course_id;
  };

  // Check if this period is the START of a double lesson (works for courses AND free periods)
  const isDoubleStart = (day: number, period: number): boolean => {
    const entry = getEntry(day, period);
    if (!entry) return false;
    
    const isFree = isFreeEntry(entry);
    const hasCourse = !!entry.course_id;
    
    if (!isFree && !hasCourse) return false;
    
    // Find next period in sequence
    const periodIndex = PERIODS.indexOf(period);
    if (periodIndex < 0 || periodIndex >= PERIODS.length - 1) return false;
    
    const nextPeriod = PERIODS[periodIndex + 1];
    const nextEntry = getEntry(day, nextPeriod);
    
    if (!nextEntry) return false;
    
    // Match: both are free periods OR both have the same course_id
    if (isFree && isFreeEntry(nextEntry)) return true;
    if (hasCourse && nextEntry.course_id === entry.course_id) return true;
    
    return false;
  };

  // Check if this period is the SECOND part of a double lesson (should be hidden)
  const isDoubleContinuation = (day: number, period: number): boolean => {
    const entry = getEntry(day, period);
    if (!entry) return false;
    
    const isFree = isFreeEntry(entry);
    const hasCourse = !!entry.course_id;
    
    if (!isFree && !hasCourse) return false;
    
    // Find previous period in sequence
    const periodIndex = PERIODS.indexOf(period);
    if (periodIndex <= 0) return false;
    
    const prevPeriod = PERIODS[periodIndex - 1];
    const prevEntry = getEntry(day, prevPeriod);
    
    if (!prevEntry) return false;
    
    // Match: both are free periods OR both have the same course_id
    if (isFree && isFreeEntry(prevEntry)) return true;
    if (hasCourse && prevEntry.course_id === entry.course_id) return true;
    
    return false;
  };

  // Delete free period(s)
  const deleteFreeperiod = async (day: number, period: number) => {
    if (!user) return;
    
    const entry = getEntry(day, period);
    if (!entry || !isFreeEntry(entry)) return;
    
    // Check if this is a double free period - delete both
    const isDouble = isDoubleStart(day, period);
    const periodIndex = PERIODS.indexOf(period);
    const nextPeriod = isDouble && periodIndex < PERIODS.length - 1 ? PERIODS[periodIndex + 1] : null;
    
    // Delete main entry
    await supabase.from('timetable_entries').delete().eq('id', entry.id);
    
    // Delete second entry if double
    if (nextPeriod) {
      const nextEntry = getEntry(day, nextPeriod);
      if (nextEntry && isFreeEntry(nextEntry)) {
        await supabase.from('timetable_entries').delete().eq('id', nextEntry.id);
      }
    }
    
    toast.success('Freistunde entfernt');
    fetchTimetable();
  };

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
              <GraduationCap className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              {selectedSchool ? (
                <>
                  <h1 className="text-base font-bold leading-tight">{selectedSchool.short_name || selectedSchool.name}</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedYear?.name}
                    {selectedClass && ` · ${selectedClass.name}`}
                  </p>
                </>
              ) : (
                <h1 className="text-base font-bold">Schule</h1>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-xl"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
        
        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : selectedSchool && selectedYear ? (
          <>
            {/* Timetable Grid - Mobile optimized with double lesson support */}
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gridTemplateRows: `auto repeat(${PERIODS.length}, 44px)` }}>
                  {/* Header row */}
                  <div className="h-7" />
                  {DAYS.map(day => (
                    <div key={day} className="h-7 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
                    </div>
                  ))}
                  
                  {/* Generate all cells */}
                  {PERIODS.map((period, periodIdx) => {
                    // Period label
                    const periodLabel = (
                      <div 
                        key={`period-${period}`} 
                        className="h-11 flex items-center justify-center"
                        style={{ gridColumn: 1, gridRow: periodIdx + 2 }}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground/70">{period}</span>
                      </div>
                    );
                    
                    // Day cells
                    const dayCells = DAYS.map((_, dayIndex) => {
                      const day = dayIndex + 1;
                      const entry = getEntry(day, period);
                      const courseId = entry?.course_id;
                      const grade = getCourseGrade(courseId);
                      const course = courseId ? courses.find(c => c.id === courseId) : null;
                      const isFreeperiod = entry?.teacher_short === 'FREI' && !entry?.course_id;
                      const hasContent = !!entry?.course_id || !!entry?.teacher_short;
                      const courseColor = isFreeperiod ? 'hsl(142, 76%, 36%)' : (course?.color || 'hsl(var(--primary))');
                      
                      const isDouble = isDoubleStart(day, period);
                      const isContinuation = isDoubleContinuation(day, period);
                      
                      // Skip if this is continuation of a double lesson
                      if (isContinuation) {
                        return null;
                      }
                      
                      return (
                        <div
                          key={`${dayIndex}-${period}`}
                          onClick={() => {
                            if (courseId) {
                              openCourseById(courseId);
                            } else if (isFreeperiod) {
                              deleteFreeperiod(day, period);
                            }
                          }}
                          className={`rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                            hasContent ? 'cursor-pointer' : 'bg-muted/20'
                          }`}
                          style={{
                            gridColumn: dayIndex + 2,
                            gridRow: isDouble ? `${periodIdx + 2} / span 2` : periodIdx + 2,
                            ...(hasContent ? {
                              backgroundColor: isFreeperiod 
                                ? 'hsl(142, 76%, 36%, 0.15)' 
                                : `color-mix(in srgb, ${courseColor} 15%, transparent)`,
                              borderWidth: 1,
                              borderColor: isFreeperiod 
                                ? 'hsl(142, 76%, 36%, 0.4)' 
                                : `color-mix(in srgb, ${courseColor} 40%, transparent)`,
                            } : {}),
                          }}
                        >
                          {hasContent && (
                            <>
                              <span 
                                className="text-[10px] font-bold leading-none"
                                style={{ color: courseColor }}
                              >
                                {isFreeperiod ? 'Frei' : (course?.short_name?.slice(0, 3).toUpperCase() || entry?.teacher_short?.slice(0, 3) || '')}
                              </span>
                              {entry?.room && !isFreeperiod && (
                                <span className="text-[8px] text-muted-foreground/70 leading-none mt-0.5">{entry.room}</span>
                              )}
                              {grade !== null && (
                                <div className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full ${getGradeColor(grade)} flex items-center justify-center shadow-sm`}>
                                  <span className="text-[8px] text-white font-bold">{Math.round(grade)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    });
                    
                    return [periodLabel, ...dayCells.filter(Boolean)];
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Courses Section */}
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <Users className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <span className="font-semibold text-sm">Meine Kurse</span>
                </div>
                <Button 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs rounded-lg" 
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Kurs
                </Button>
              </div>
              
              {/* My Courses - Horizontal scrollable list */}
              {myCourses.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                  {myCourses.map(course => {
                    const grade = getCourseGrade(course.id);
                    const courseColor = course.color || 'hsl(var(--primary))';
                    return (
                      <div
                        key={course.id}
                        className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/50 cursor-pointer active:scale-98 transition-transform"
                        style={{ minWidth: 140 }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${courseColor} 15%, transparent)`,
                            borderWidth: 2,
                            borderColor: courseColor,
                          }}
                          onClick={() => openCourse(course)}
                        >
                          <span 
                            className="text-[10px] font-bold"
                            style={{ color: courseColor }}
                          >
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1" onClick={() => openCourse(course)}>
                          <p className="text-xs font-medium truncate">{course.short_name || course.name}</p>
                          {grade !== null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className={`w-2 h-2 rounded-full ${getGradeColor(grade)}`} />
                              <span className="text-[10px] text-muted-foreground font-medium">{grade} Punkte</span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToEdit(course);
                            setEditCourseDialogOpen(true);
                          }}
                        >
                          <Settings className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center rounded-xl border border-dashed border-border/50">
                  <p className="text-xs text-muted-foreground">Noch keinem Kurs beigetreten</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">Tritt einem Kurs bei oder erstelle einen neuen</p>
                </div>
              )}
              
              {/* Available Courses */}
              {availableCourses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Verfuegbare Kurse</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {availableCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card/50 border border-border/30"
                        style={{ minWidth: 150 }}
                      >
                        <div className="w-8 h-8 rounded-lg border-2 border-muted-foreground/20 flex items-center justify-center bg-muted/30">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{course.short_name || course.name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-2.5 h-2.5" strokeWidth={1.5} />
                            <span>{course.member_count} Mitglieder</span>
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 rounded-lg hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); joinCourse(course.id); }}
                          disabled={joiningCourseId === course.id}
                        >
                          {joiningCourseId === course.id ? (
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          )}
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
            userClassId={selectedClass?.id}
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
        
        {/* Edit Course Dialog */}
        {courseToEdit && (
          <EditCourseDialog
            open={editCourseDialogOpen}
            onOpenChange={(open) => {
              setEditCourseDialogOpen(open);
              if (!open) setCourseToEdit(null);
            }}
            course={courseToEdit}
            onCourseUpdated={() => {
              fetchCourses();
              fetchTimetable();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
