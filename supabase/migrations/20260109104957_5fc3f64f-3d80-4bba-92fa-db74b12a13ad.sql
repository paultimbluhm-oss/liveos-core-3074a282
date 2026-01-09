-- Add room column to courses table for integration with timetable
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS room TEXT;

-- Create a predefined subjects table for each school
CREATE TABLE IF NOT EXISTS public.school_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(school_id, name)
);

-- Enable RLS
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all school subjects
CREATE POLICY "Anyone can view school subjects" 
ON public.school_subjects 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to create school subjects
CREATE POLICY "Authenticated users can create school subjects" 
ON public.school_subjects 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_subjects_school_id ON public.school_subjects(school_id);

-- Add user's selected school to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_school_year_id UUID REFERENCES public.school_years(id) ON DELETE SET NULL;