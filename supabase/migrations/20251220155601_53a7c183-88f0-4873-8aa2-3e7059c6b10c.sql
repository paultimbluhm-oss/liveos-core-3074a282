-- Add teacher and room columns to subjects table
ALTER TABLE public.subjects 
ADD COLUMN teacher_short text DEFAULT NULL,
ADD COLUMN room text DEFAULT NULL;