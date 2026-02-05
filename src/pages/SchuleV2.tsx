import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SchoolV2Provider, useSchoolV2 } from '@/components/schule-v2/context/SchoolV2Context';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchoolSetupV2 } from '@/components/schule-v2/setup/SchoolSetupV2';
import { ScopeSelectorV2 } from '@/components/schule-v2/header/ScopeSelectorV2';
import { StatsHeaderV2 } from '@/components/schule-v2/header/StatsHeaderV2';
import { WeekTimetableV2 } from '@/components/schule-v2/timetable/WeekTimetableV2';
import { CoursesListV2, CoursesListV2Ref } from '@/components/schule-v2/courses/CoursesListV2';
import { CreateCourseDialogV2 } from '@/components/schule-v2/courses/CreateCourseDialogV2';
import { CourseDetailSheetV2 } from '@/components/schule-v2/course-detail/CourseDetailSheetV2';
import { V2Course, V2TimetableSlot } from '@/components/schule-v2/types';

function SchuleV2Content() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { hasSchool, loading: schoolLoading, refresh } = useSchoolV2();

  const coursesListRef = useRef<CoursesListV2Ref>(null);

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<V2Course | null>(null);
  const [courseDetailOpen, setCourseDetailOpen] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);
  const [timetableKey, setTimetableKey] = useState(0);
  const [coursesCollapsed, setCoursesCollapsed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSlotClick = (slot: V2TimetableSlot, course: V2Course) => {
    setSelectedCourse(course);
    setCourseDetailOpen(true);
  };

  const handleCourseSelect = (course: V2Course) => {
    setSelectedCourse(course);
    setCourseDetailOpen(true);
  };

  const handleCourseCreated = useCallback(() => {
    refresh();
    coursesListRef.current?.refresh();
    setTimetableKey(prev => prev + 1);
  }, [refresh]);

  const handleTimetableChange = useCallback(() => {
    setTimetableKey(prev => prev + 1);
    coursesListRef.current?.refresh();
  }, []);

  const handleHomeworkChange = useCallback(() => {
    setTimetableKey(prev => prev + 1);
  }, []);

  const handleAbsenceChange = useCallback(() => {
    setTimetableKey(prev => prev + 1);
  }, []);

  if (authLoading || !user) return null;

  if (schoolLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  // Setup screen if no school
  if (!hasSchool) {
    return (
      <AppLayout>
        <SchoolSetupV2 />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24">
        {/* Desktop: Flex-Layout mit Sidebar für Kurse */}
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="space-y-3 mb-4">
            <ScopeSelectorV2 />
            <StatsHeaderV2 totalLessons={totalLessons} />
          </div>

          {/* Main Content: Desktop = nebeneinander, Mobile = untereinander */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Timetable - expandiert wenn Kurse eingeklappt */}
            <div className={`transition-all duration-300 ${coursesCollapsed ? 'lg:flex-1' : 'lg:flex-1'}`}>
              <WeekTimetableV2 key={timetableKey} onSlotClick={handleSlotClick} />
            </div>

            {/* Courses Sidebar - auf Desktop rechts, auf Mobile unten */}
            <div className={`transition-all duration-300 ${coursesCollapsed ? 'lg:w-64' : 'lg:w-80'}`}>
              <CoursesListV2 
                ref={coursesListRef}
                onCourseSelect={handleCourseSelect}
                onCreateCourse={() => setCreateCourseOpen(true)}
                onCoursesLoaded={(courses) => {
                  // Count lessons would need timetable slots - simplified for now
                }}
                onCollapseChange={setCoursesCollapsed}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Dialog */}
      <CreateCourseDialogV2 
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        onCreated={handleCourseCreated}
      />

      {/* Course Detail Sheet */}
      <CourseDetailSheetV2 
        open={courseDetailOpen}
        onOpenChange={setCourseDetailOpen}
        course={selectedCourse}
        onTimetableChange={handleTimetableChange}
        onHomeworkChange={handleHomeworkChange}
        onAbsenceChange={handleAbsenceChange}
      />
    </AppLayout>
  );
}

export default function SchuleV2() {
  return (
    <SchoolV2Provider>
      <SchuleV2Content />
    </SchoolV2Provider>
  );
}
