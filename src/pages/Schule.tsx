import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolScope } from '@/hooks/useSchoolScope';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScopeHeader } from '@/components/schule/ScopeHeader';
import { ScopedCoursesList } from '@/components/schule/ScopedCoursesList';
import { ScopedTimetable } from '@/components/schule/ScopedTimetable';
import { SchoolSetupDialog } from '@/components/schule/SchoolSetupDialog';
import { ScopedCreateCourseDialog } from '@/components/schule/ScopedCreateCourseDialog';
import { SchoolTabsDrawer } from '@/components/schule/SchoolTabsDrawer';
import { Course, CourseTimetableSlot } from '@/components/schule/schools/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Plus } from 'lucide-react';

export default function Schule() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const {
    scope,
    semesterEntity,
    getOrCreateSemester,
    schools,
    years,
    changeSchool,
    changeYear,
    changeGradeLevel,
    changeSemester,
    changeClassName,
    loading: scopeLoading,
    refreshSchools,
    refreshYears,
  } = useSchoolScope();
  
  // Dialogs
  const [setupOpen, setSetupOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  
  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<'timetable' | 'course'>('timetable');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Courses and Slots (fuer Stundenplan und Stats)
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSlots, setCourseSlots] = useState<CourseTimetableSlot[]>([]);
  const [timetableKey, setTimetableKey] = useState(0);
  
  // Grades fuer Durchschnittsberechnung
  const [yearAverage, setYearAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Berechne Jahresschnitt (Halbjahr 1 + Halbjahr 2)
  useEffect(() => {
    const loadYearAverage = async () => {
      if (!user || !scope.year) {
        setYearAverage(null);
        return;
      }
      
      // Hole alle Semester fuer diesen Jahrgang + dieses Schuljahr
      const { data: semesters } = await supabase
        .from('year_semesters')
        .select('id')
        .eq('school_year_id', scope.year.id)
        .eq('grade_level', scope.gradeLevel);
      
      if (!semesters || semesters.length === 0) {
        setYearAverage(null);
        return;
      }
      
      const semesterIds = semesters.map(s => s.id);
      
      // Hole alle Kurse in diesen Semestern
      const { data: coursesInYear } = await supabase
        .from('courses')
        .select('id')
        .in('semester_id', semesterIds);
      
      if (!coursesInYear || coursesInYear.length === 0) {
        setYearAverage(null);
        return;
      }
      
      const courseIds = coursesInYear.map(c => c.id);
      
      // Hole alle Noten fuer diese Kurse
      const { data: grades } = await supabase
        .from('grades')
        .select('points')
        .eq('user_id', user.id)
        .in('course_id', courseIds);
      
      if (!grades || grades.length === 0) {
        setYearAverage(null);
        return;
      }
      
      const avg = grades.reduce((sum, g) => sum + g.points, 0) / grades.length;
      setYearAverage(Math.round(avg * 10) / 10);
    };
    
    loadYearAverage();
  }, [user, scope.year?.id, scope.gradeLevel]);

  // Berechne Gesamtstunden pro Woche
  const totalLessons = useMemo(() => {
    // Zaehle alle Slots (jeder Slot = 1 Stunde)
    return courseSlots.length;
  }, [courseSlots]);

  const handleCoursesLoaded = (loadedCourses: Course[], slots: CourseTimetableSlot[]) => {
    setCourses(loadedCourses);
    setCourseSlots(slots);
  };

  const handleCourseCreated = () => {
    setTimetableKey(prev => prev + 1);
  };

  const openCourse = (course: Course) => {
    setDrawerContext('course');
    setSelectedCourse(course);
    setDrawerOpen(true);
  };

  if (authLoading || !user) return null;

  // Setup-Screen wenn keine Schule/Jahr gewaehlt
  const needsSetup = !scope.school || !scope.year;

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-5">
        {/* Header mit Scope-Dropdowns */}
        <ScopeHeader
          scope={scope}
          onGradeLevelChange={changeGradeLevel}
          onSemesterChange={changeSemester}
          onClassNameChange={changeClassName}
          onSettingsOpen={() => setSetupOpen(true)}
          totalLessons={totalLessons}
          yearAverage={yearAverage}
        />
        
        {scopeLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : needsSetup ? (
          /* Setup-Prompt */
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-semibold">Schule einrichten</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Waehle deine Schule und deinen Abitur-Jahrgang
                </p>
              </div>
              <Button onClick={() => setSetupOpen(true)}>
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Einrichten
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stundenplan */}
            <ScopedTimetable
              key={timetableKey}
              scope={scope}
              semesterEntity={semesterEntity}
              courses={courses}
              courseSlots={courseSlots}
            />
            
            {/* Kursliste */}
            <ScopedCoursesList
              scope={scope}
              semesterEntity={semesterEntity}
              onCourseSelect={openCourse}
              onCreateCourse={() => setCreateCourseOpen(true)}
              onCoursesLoaded={handleCoursesLoaded}
            />
          </>
        )}
      </div>
      
      {/* Setup Dialog */}
      <SchoolSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        schools={schools}
        years={years}
        currentSchool={scope.school}
        currentYear={scope.year}
        onSchoolChange={changeSchool}
        onYearChange={changeYear}
        onSchoolCreated={refreshSchools}
        onYearCreated={refreshYears}
      />
      
      {/* Create Course Dialog */}
      <ScopedCreateCourseDialog
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        scope={scope}
        getOrCreateSemester={getOrCreateSemester}
        onCourseCreated={handleCourseCreated}
      />
      
      {/* Course/Timetable Drawer */}
      <SchoolTabsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        context={drawerContext}
        course={selectedCourse}
      />
    </AppLayout>
  );
}
