import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, Settings, Users, Plus, UserPlus, ChevronLeft, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SchoolSettingsDialog } from '@/components/schule/schools/SchoolSettingsDialog';
import { CreateCourseDialog } from '@/components/schule/schools/CreateCourseDialog';
import { EditCourseDialog } from '@/components/schule/schools/EditCourseDialog';
import { SchoolTabsDrawer } from '@/components/schule/SchoolTabsDrawer';
import { SchoolFilterDropdowns } from '@/components/schule/schools/SchoolFilterDropdowns';
import { Course, CourseTimetableSlot } from '@/components/schule/schools/types';
import { LESSON_TIMES } from '@/components/calendar/types';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, eachDayOfInterval, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  course_id: string | null;
  teacher_short: string | null;
  room: string | null;
  week_type: string;
}

interface TimetableOverride {
  id: string;
  date: string;
  period: number;
  override_type: string;
  label: string | null;
  color: string | null;
  original_course_id: string | null;
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
  const {
    selectedSchool,
    selectedYear,
    gradeLevel,
    semester,
    selectedClassId,
    setGradeLevel,
    setSemester,
    setSelectedClassId,
    availableClasses,
    getOrCreateSemester,
    loading: contextLoading,
    refetch: refetchContext,
  } = useSchoolContext();
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  // Timetable
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [timetableOverrides, setTimetableOverrides] = useState<TimetableOverride[]>([]);
  const [courseGrades, setCourseGrades] = useState<CourseGradeAvg[]>([]);
  const [courseTimetableSlots, setCourseTimetableSlots] = useState<CourseTimetableSlot[]>([]);
  
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
  
  // Week calculations
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekType: 'A' | 'B' = weekNumber % 2 === 0 ? 'B' : 'A';
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).slice(0, 5); // Mo-Fr

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Use context loading instead of local fetch
  useEffect(() => {
    if (!contextLoading) {
      setDataLoading(false);
    }
  }, [contextLoading]);

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

  // Fetch week-specific overrides
  const fetchOverrides = async () => {
    if (!user) return;
    
    const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('timetable_overrides')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lte('date', weekEnd);
    
    if (data) setTimetableOverrides(data);
  };

  // Toggle EVA for a specific slot
  const toggleEva = async (date: Date, period: number, courseId: string | null) => {
    if (!user) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = timetableOverrides.find(o => o.date === dateStr && o.period === period);
    
    if (existing) {
      // Remove EVA
      await supabase.from('timetable_overrides').delete().eq('id', existing.id);
      toast.success('EVA entfernt');
    } else {
      // Add EVA
      await supabase.from('timetable_overrides').insert({
        user_id: user.id,
        date: dateStr,
        period,
        override_type: 'eva',
        label: 'EVA',
        original_course_id: courseId,
      });
      toast.success('EVA eingetragen');
    }
    
    fetchOverrides();
  };

  // Get override for a specific date and period
  const getOverride = (date: Date, period: number): TimetableOverride | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timetableOverrides.find(o => o.date === dateStr && o.period === period);
  };

  const fetchCourses = async () => {
    if (!user || !selectedYear) return;
    
    // First, get the semester_id for the current grade level and semester
    const { data: semesterData } = await supabase
      .from('year_semesters')
      .select('id')
      .eq('school_year_id', selectedYear.id)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    let query = supabase
      .from('courses')
      .select('*')
      .eq('school_year_id', selectedYear.id)
      .order('name');
    
    // Filter by semester_id if exists, or show courses without semester_id
    if (semesterData) {
      query = query.or(`semester_id.eq.${semesterData.id},semester_id.is.null`);
    }
    
    // Filter by class
    if (selectedClassId) {
      query = query.or(`class_id.eq.${selectedClassId},class_id.is.null`);
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
      
      // Fetch all course timetable slots for the user's courses
      const memberCourseIds = enrichedCourses.filter(c => c.is_member).map(c => c.id);
      if (memberCourseIds.length > 0) {
        const { data: slotsData } = await supabase
          .from('course_timetable_slots')
          .select('*')
          .in('course_id', memberCourseIds);
        
        if (slotsData) {
          setCourseTimetableSlots(slotsData);
        }
      }
    }
  };

  // Clean up duplicate timetable entries - ONLY removes true duplicates
  // Does NOT delete course entries in favor of free periods
  const cleanupDuplicateEntries = async () => {
    if (!user) return;
    
    // Get all entries for this user, sorted by created_at ascending (oldest first)
    const { data: entries } = await supabase
      .from('timetable_entries')
      .select('id, day_of_week, period, course_id, week_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (!entries) return;
    
    // Group entries by slot (day + period + week_type)
    // We want to keep entries with course_id and only remove true duplicates
    const slotGroups = new Map<string, typeof entries>();
    
    for (const entry of entries) {
      const key = `${entry.day_of_week}-${entry.period}-${entry.week_type || 'both'}`;
      if (!slotGroups.has(key)) {
        slotGroups.set(key, []);
      }
      slotGroups.get(key)!.push(entry);
    }
    
    const toDelete: string[] = [];
    
    for (const [, slotEntries] of slotGroups) {
      if (slotEntries.length <= 1) continue;
      
      // Separate entries with course_id and without (free periods)
      const withCourse = slotEntries.filter(e => e.course_id);
      const withoutCourse = slotEntries.filter(e => !e.course_id);
      
      // Priority: Keep course entries, delete duplicates
      if (withCourse.length > 0) {
        // Keep the first (oldest) course entry, delete all others
        for (let i = 1; i < withCourse.length; i++) {
          toDelete.push(withCourse[i].id);
        }
        // Delete ALL free period entries at the same slot (course takes priority)
        for (const entry of withoutCourse) {
          toDelete.push(entry.id);
        }
      } else {
        // No course entries - keep the first free period, delete duplicates
        for (let i = 1; i < withoutCourse.length; i++) {
          toDelete.push(withoutCourse[i].id);
        }
      }
    }
    
    // Delete duplicates
    if (toDelete.length > 0) {
      await supabase.from('timetable_entries').delete().in('id', toDelete);
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

  // Context loading is handled by useSchoolContext

  useEffect(() => {
    if (user) {
      // First cleanup, then fetch
      cleanupDuplicateEntries().then(() => fetchTimetable());
    }
  }, [user]);

  // Fetch overrides when week changes
  useEffect(() => {
    if (user) {
      fetchOverrides();
    }
  }, [user, currentWeekStart]);

  useEffect(() => {
    if (selectedYear && user) {
      // First cleanup duplicate courses, then fetch
      cleanupDuplicateCourses().then(() => fetchCourses());
    }
  }, [selectedYear, selectedClassId, gradeLevel, semester, user]);

  // Week navigation
  const goToPrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

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

  // Helper to check if a period on a specific date has passed
  const isPeriodPassed = (date: Date, period: number): boolean => {
    const now = new Date();
    // If date is before today, it's passed
    if (isBefore(date, startOfDay(now)) && !isToday(date)) return true;
    // If date is after today, it's not passed
    if (!isToday(date)) return false;
    
    const times = LESSON_TIMES[period];
    if (!times) return false;
    
    const [endH, endM] = times.end.split(':').map(Number);
    const periodEnd = new Date(date);
    periodEnd.setHours(endH, endM, 0, 0);
    
    return now > periodEnd;
  };

  // Helper to get the next slot info for a course
  const getNextSlotInfo = (courseId: string): { label: string; minutesUntil: number } | null => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ...
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Get all slots for this course
    const slots = courseTimetableSlots.filter(s => s.course_id === courseId);
    if (slots.length === 0) return null;
    
    // Also check timetable entries as fallback
    const entries = timetableEntries.filter(e => e.course_id === courseId);
    const allSlots = slots.length > 0 ? slots : entries.map(e => ({
      day_of_week: e.day_of_week,
      period: e.period,
      week_type: e.week_type,
    }));
    
    if (allSlots.length === 0) return null;
    
    let bestSlot: { dayOffset: number; period: number; dayOfWeek: number } | null = null;
    let minMinutesUntil = Infinity;
    
    for (const slot of allSlots) {
      // Check week type compatibility
      if (slot.week_type !== 'both' && slot.week_type !== weekType) continue;
      
      const slotDay = slot.day_of_week; // 1=Monday, ..., 5=Friday
      const times = LESSON_TIMES[slot.period];
      if (!times) continue;
      
      const [startH, startM] = times.start.split(':').map(Number);
      const slotStartMinutes = startH * 60 + startM;
      
      // Calculate days until this slot
      let dayOffset = slotDay - currentDay;
      
      // If it's today but the slot hasn't started yet
      if (dayOffset === 0 && slotStartMinutes > currentMinutes) {
        const minutesUntil = slotStartMinutes - currentMinutes;
        if (minutesUntil < minMinutesUntil) {
          minMinutesUntil = minutesUntil;
          bestSlot = { dayOffset: 0, period: slot.period, dayOfWeek: slotDay };
        }
      }
      // If it's a future day this week
      else if (dayOffset > 0 && dayOffset <= 5) {
        const minutesUntil = dayOffset * 24 * 60 + slotStartMinutes - currentMinutes;
        if (minutesUntil < minMinutesUntil) {
          minMinutesUntil = minutesUntil;
          bestSlot = { dayOffset, period: slot.period, dayOfWeek: slotDay };
        }
      }
      // Next week (add 7 days if day already passed)
      else if (dayOffset <= 0) {
        const adjustedOffset = dayOffset + 7;
        const minutesUntil = adjustedOffset * 24 * 60 + slotStartMinutes - currentMinutes;
        if (minutesUntil < minMinutesUntil) {
          minMinutesUntil = minutesUntil;
          bestSlot = { dayOffset: adjustedOffset, period: slot.period, dayOfWeek: slotDay };
        }
      }
    }
    
    if (!bestSlot) return null;
    
    const times = LESSON_TIMES[bestSlot.period];
    if (!times) return null;
    
    // Format the label
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    if (bestSlot.dayOffset === 0) {
      return { label: `Heute, ${times.start}`, minutesUntil: minMinutesUntil };
    } else if (bestSlot.dayOffset === 1) {
      return { label: `Morgen, ${times.start}`, minutesUntil: minMinutesUntil };
    } else {
      const targetDate = addDays(now, bestSlot.dayOffset);
      return { label: `${dayNames[bestSlot.dayOfWeek]}, ${format(targetDate, 'd. MMM', { locale: de })}`, minutesUntil: minMinutesUntil };
    }
  };

  if (loading || !user) return null;

  const myCourses = courses.filter(c => c.is_member);
  const availableCourses = courses.filter(c => !c.is_member);
  
  // Sort courses by next upcoming lesson
  const sortedMyCourses = [...myCourses].sort((a, b) => {
    const aNext = getNextSlotInfo(a.id);
    const bNext = getNextSlotInfo(b.id);
    
    if (!aNext && !bNext) return 0;
    if (!aNext) return 1;
    if (!bNext) return -1;
    
    return aNext.minutesUntil - bNext.minutesUntil;
  });

  // Build timetable grid with double lesson detection
  // Now considers week_type to show the correct entry for A/B weeks
  const getEntry = (day: number, period: number) => {
    // First try to find an entry matching the current week type
    const matchingWeekType = timetableEntries.find(e => 
      e.day_of_week === day && 
      e.period === period && 
      (e.week_type === 'both' || 
       (weekType === 'A' && e.week_type === 'odd') || 
       (weekType === 'B' && e.week_type === 'even'))
    );
    
    return matchingWeekType;
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
                  </p>
                </>
              ) : (
                <h1 className="text-base font-bold">Schule</h1>
              )}
            </div>
          </div>
          
          {/* Filter Dropdowns */}
          {selectedYear && (
            <SchoolFilterDropdowns
              gradeLevel={gradeLevel}
              semester={semester}
              selectedClassId={selectedClassId}
              availableClasses={availableClasses}
              onGradeLevelChange={setGradeLevel}
              onSemesterChange={setSemester}
              onClassChange={setSelectedClassId}
            />
          )}
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
            {/* Week Navigation */}
            <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={goToPrevWeek}
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </Button>
              
              <div className="flex flex-col items-center">
                <button
                  onClick={goToCurrentWeek}
                  className={`text-sm font-semibold ${isCurrentWeek ? 'text-primary' : 'text-foreground'}`}
                >
                  KW {weekNumber} · {weekType}-Woche
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {format(currentWeekStart, 'd. MMM', { locale: de })} - {format(weekEnd, 'd. MMM yyyy', { locale: de })}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={goToNextWeek}
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>

            {/* Timetable Grid - Mobile optimized with double lesson and override support */}
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gridTemplateRows: `auto repeat(${PERIODS.length}, 44px)` }}>
                  {/* Header row with dates */}
                  <div className="h-7" />
                  {weekDays.map((date, dayIndex) => (
                    <div key={dayIndex} className="h-7 flex flex-col items-center justify-center">
                      <span className={`text-[10px] font-semibold ${isToday(date) ? 'text-primary' : 'text-muted-foreground'}`}>
                        {DAYS[dayIndex]}
                      </span>
                      <span className={`text-[8px] ${isToday(date) ? 'text-primary font-semibold' : 'text-muted-foreground/60'}`}>
                        {format(date, 'd.')}
                      </span>
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
                    
                    // Day cells - now date-aware
                    const dayCells = weekDays.map((date, dayIndex) => {
                      const day = dayIndex + 1;
                      const entry = getEntry(day, period);
                      const override = getOverride(date, period);
                      const courseId = entry?.course_id;
                      const grade = getCourseGrade(courseId);
                      const course = courseId ? courses.find(c => c.id === courseId) : null;
                      const isFreeperiod = entry?.teacher_short === 'FREI' && !entry?.course_id;
                      const hasContent = !!entry?.course_id || !!entry?.teacher_short;
                      
                      // Check if EVA or other override
                      const isEva = override?.override_type === 'eva';
                      const isVacation = override?.override_type === 'vacation';
                      
                      // Determine display color
                      let displayColor = 'hsl(var(--primary))';
                      if (isEva) {
                        displayColor = 'hsl(45, 93%, 47%)'; // Amber for EVA
                      } else if (isVacation) {
                        displayColor = 'hsl(280, 60%, 50%)'; // Purple for vacation
                      } else if (isFreeperiod) {
                        displayColor = 'hsl(142, 76%, 36%)'; // Green for free
                      } else if (course?.color) {
                        displayColor = course.color;
                      }
                      
                      const isDouble = isDoubleStart(day, period);
                      const isContinuation = isDoubleContinuation(day, period);
                      
                      // Skip if this is continuation of a double lesson
                      if (isContinuation) {
                        return null;
                      }
                      
                      // Handle long press for EVA toggle
                      const handleLongPress = () => {
                        if (courseId) {
                          toggleEva(date, period, courseId);
                        }
                      };
                      
                      // Check if this period has passed (for graying out)
                      const hasPassed = isPeriodPassed(date, period);
                      
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
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleLongPress();
                          }}
                          className={`rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                            hasContent || isEva || isVacation ? 'cursor-pointer' : 'bg-muted/20'
                          } ${hasPassed ? 'opacity-40' : ''}`}
                          style={{
                            gridColumn: dayIndex + 2,
                            gridRow: isDouble ? `${periodIdx + 2} / span 2` : periodIdx + 2,
                            ...((hasContent || isEva || isVacation) ? {
                              backgroundColor: `color-mix(in srgb, ${displayColor} 15%, transparent)`,
                              borderWidth: 1,
                              borderColor: `color-mix(in srgb, ${displayColor} 40%, transparent)`,
                            } : {}),
                          }}
                        >
                          {(hasContent || isEva || isVacation) && (
                            <>
                              <span 
                                className="text-[10px] font-bold leading-none"
                                style={{ color: displayColor }}
                              >
                                {isEva ? 'EVA' : isVacation ? (override?.label || 'Ferien') : isFreeperiod ? 'Frei' : (course?.short_name?.slice(0, 3).toUpperCase() || entry?.teacher_short?.slice(0, 3) || '')}
                              </span>
                              {entry?.room && !isFreeperiod && !isEva && !isVacation && (
                                <span className="text-[8px] text-muted-foreground/70 leading-none mt-0.5">{entry.room}</span>
                              )}
                              {grade !== null && !isEva && !isVacation && (
                                <div className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full ${getGradeColor(grade)} flex items-center justify-center shadow-sm`}>
                                  <span className="text-[8px] text-white font-bold">{Math.round(grade)}</span>
                                </div>
                              )}
                              {isEva && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                                  <BookOpen className="w-2 h-2 text-white" strokeWidth={2} />
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
              
              {/* My Courses - Vertical list sorted by next lesson */}
              {sortedMyCourses.length > 0 ? (
                <div className="space-y-2">
                  {sortedMyCourses.map(course => {
                    const grade = getCourseGrade(course.id);
                    const courseColor = course.color || 'hsl(var(--primary))';
                    const nextSlot = getNextSlotInfo(course.id);
                    
                    return (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => openCourse(course)}
                      >
                        {/* Course Icon */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${courseColor} 15%, transparent)`,
                            borderWidth: 2,
                            borderColor: courseColor,
                          }}
                        >
                          <span 
                            className="text-xs font-bold"
                            style={{ color: courseColor }}
                          >
                            {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Course Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{course.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                            <span className="text-[10px] text-muted-foreground">
                              {nextSlot ? nextSlot.label : 'Keine Stunde diese Woche'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Grade Badge */}
                        {grade !== null && (
                          <Badge className={`${getGradeColor(grade)} text-white text-[10px] px-2 py-0.5`}>
                            {grade.toFixed(1)} P
                          </Badge>
                        )}
                        
                        {/* Settings Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToEdit(course);
                            setEditCourseDialogOpen(true);
                          }}
                        >
                          <Settings className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
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
          onSchoolChanged={refetchContext}
        />
        
        {selectedYear && (
          <CreateCourseDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            schoolYearId={selectedYear.id}
            schoolId={selectedSchool?.id || ''}
            userClassId={selectedClassId || undefined}
            gradeLevel={gradeLevel}
            semester={semester}
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
          currentWeekStart={currentWeekStart}
          weekType={weekType}
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
