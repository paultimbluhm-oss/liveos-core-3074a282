import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SchoolV2Provider, useSchoolV2 } from '@/components/schule-v2/context/SchoolV2Context';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchoolSetupV2 } from '@/components/schule-v2/setup/SchoolSetupV2';
import { ScopeSelectorV2 } from '@/components/schule-v2/header/ScopeSelectorV2';
import { StatsHeaderV2 } from '@/components/schule-v2/header/StatsHeaderV2';
import { WeekTimetableV2 } from '@/components/schule-v2/timetable/WeekTimetableV2';
import { CoursesListV2 } from '@/components/schule-v2/courses/CoursesListV2';
import { CreateCourseDialogV2 } from '@/components/schule-v2/courses/CreateCourseDialogV2';
import { CourseDetailSheetV2 } from '@/components/schule-v2/course-detail/CourseDetailSheetV2';
import { V2Course, V2TimetableSlot } from '@/components/schule-v2/types';

function SchuleV2Content() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { hasSchool, loading: schoolLoading, refresh } = useSchoolV2();

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<V2Course | null>(null);
  const [courseDetailOpen, setCourseDetailOpen] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);
  const [timetableKey, setTimetableKey] = useState(0);

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

  const handleCourseCreated = () => {
    refresh();
  };

  const handleTimetableChange = () => {
    setTimetableKey(prev => prev + 1);
  };

  const handleHomeworkChange = () => {
    setTimetableKey(prev => prev + 1);
  };

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
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
        {/* Header with Scope Selector */}
        <div className="space-y-3">
          <ScopeSelectorV2 />
          <StatsHeaderV2 totalLessons={totalLessons} />
        </div>

        {/* Timetable */}
        <WeekTimetableV2 key={timetableKey} onSlotClick={handleSlotClick} />

        {/* Courses List */}
        <CoursesListV2 
          onCourseSelect={handleCourseSelect}
          onCreateCourse={() => setCreateCourseOpen(true)}
          onCoursesLoaded={(courses) => {
            // Count lessons would need timetable slots - simplified for now
          }}
        />
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
