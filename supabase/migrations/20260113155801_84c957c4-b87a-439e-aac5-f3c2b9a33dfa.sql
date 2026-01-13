-- Add week_type to course_timetable_slots for A/B weeks
ALTER TABLE public.course_timetable_slots 
ADD COLUMN IF NOT EXISTS week_type TEXT NOT NULL DEFAULT 'both';

-- Add grading fields to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS written_weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS oral_weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS has_grading BOOLEAN DEFAULT true;

-- Add is_double_lesson to course_timetable_slots
ALTER TABLE public.course_timetable_slots 
ADD COLUMN IF NOT EXISTS is_double_lesson BOOLEAN DEFAULT false;

-- Add course_id reference to timetable_entries for linking personal schedule to courses
ALTER TABLE public.timetable_entries 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;