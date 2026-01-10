-- Add course_id to grades table for linking grades to courses
ALTER TABLE public.grades 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add course_id to timetable_entries table for linking timetable entries to courses
ALTER TABLE public.timetable_entries 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add room to courses table if not exists
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS room TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grades_course_id ON public.grades(course_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_course_id ON public.timetable_entries(course_id);