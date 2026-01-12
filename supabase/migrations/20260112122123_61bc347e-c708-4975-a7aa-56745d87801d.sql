-- Create classes table (within school years)
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Policies for classes
CREATE POLICY "Users can view classes in their school years"
ON public.classes FOR SELECT
USING (true);

CREATE POLICY "Users can create classes"
ON public.classes FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update classes"
ON public.classes FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete classes"
ON public.classes FOR DELETE
USING (auth.uid() = created_by);

-- Create class_members table
CREATE TABLE public.class_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, user_id)
);

-- Enable RLS
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Policies for class_members
CREATE POLICY "Users can view class members"
ON public.class_members FOR SELECT
USING (true);

CREATE POLICY "Users can join classes"
ON public.class_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave classes"
ON public.class_members FOR DELETE
USING (auth.uid() = user_id);

-- Add class_id to courses (courses belong to classes now)
ALTER TABLE public.courses ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Create course_timetable_slots (a course can have multiple slots)
CREATE TABLE public.course_timetable_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 4),
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 12),
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, day_of_week, period)
);

-- Enable RLS
ALTER TABLE public.course_timetable_slots ENABLE ROW LEVEL SECURITY;

-- Policies for course_timetable_slots
CREATE POLICY "Users can view course slots"
ON public.course_timetable_slots FOR SELECT
USING (true);

CREATE POLICY "Course creators can manage slots"
ON public.course_timetable_slots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Course creators can update slots"
ON public.course_timetable_slots FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Course creators can delete slots"
ON public.course_timetable_slots FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

-- Add selected_class_id to profiles
ALTER TABLE public.profiles ADD COLUMN selected_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_classes_school_year_id ON public.classes(school_year_id);
CREATE INDEX idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX idx_class_members_user_id ON public.class_members(user_id);
CREATE INDEX idx_courses_class_id ON public.courses(class_id);
CREATE INDEX idx_course_timetable_slots_course_id ON public.course_timetable_slots(course_id);