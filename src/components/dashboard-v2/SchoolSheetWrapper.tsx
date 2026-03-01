import { useState, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SchoolV2Provider, useSchoolV2 } from '@/components/schule-v2/context/SchoolV2Context';
import { ScopeSelectorV2 } from '@/components/schule-v2/header/ScopeSelectorV2';
import { StatsHeaderV2 } from '@/components/schule-v2/header/StatsHeaderV2';
import { WeekTimetableV2 } from '@/components/schule-v2/timetable/WeekTimetableV2';
import { CoursesListV2, CoursesListV2Ref } from '@/components/schule-v2/courses/CoursesListV2';
import { CreateCourseDialogV2 } from '@/components/schule-v2/courses/CreateCourseDialogV2';
import { CourseDetailSheetV2 } from '@/components/schule-v2/course-detail/CourseDetailSheetV2';
import { VocabSection } from '@/components/schule-v2/vocab/VocabSection';
import { V2Course, V2TimetableSlot } from '@/components/schule-v2/types';

interface SchoolSheetWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SchoolSheetContent() {
  const { hasSchool, loading, refresh } = useSchoolV2();
  const coursesListRef = useRef<CoursesListV2Ref>(null);

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<V2Course | null>(null);
  const [courseDetailOpen, setCourseDetailOpen] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);
  const [timetableKey, setTimetableKey] = useState(0);
  const [coursesCollapsed, setCoursesCollapsed] = useState(false);

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

  const handleEventsChange = useCallback(() => {
    setTimetableKey(prev => prev + 1);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasSchool) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-sm text-muted-foreground">Keine Schule eingerichtet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <ScopeSelectorV2 />
        <StatsHeaderV2 totalLessons={totalLessons} />
        <WeekTimetableV2 key={timetableKey} onSlotClick={handleSlotClick} />
        <CoursesListV2
          ref={coursesListRef}
          onCourseSelect={handleCourseSelect}
          onCreateCourse={() => setCreateCourseOpen(true)}
          onCoursesLoaded={() => {}}
          onCollapseChange={setCoursesCollapsed}
        />
        <VocabSection />
      </div>

      <CreateCourseDialogV2
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        onCreated={handleCourseCreated}
      />

      <CourseDetailSheetV2
        open={courseDetailOpen}
        onOpenChange={setCourseDetailOpen}
        course={selectedCourse}
        onTimetableChange={handleTimetableChange}
        onHomeworkChange={handleHomeworkChange}
        onAbsenceChange={handleAbsenceChange}
        onEventsChange={handleEventsChange}
      />
    </>
  );
}

export function SchoolSheetWrapper({ open, onOpenChange }: SchoolSheetWrapperProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
        <SchoolV2Provider>
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Schule</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(92vh-80px)]">
            <SchoolSheetContent />
          </div>
        </SchoolV2Provider>
      </SheetContent>
    </Sheet>
  );
}
