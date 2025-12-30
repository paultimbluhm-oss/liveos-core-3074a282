-- Add abbreviation/short name column to subjects table
ALTER TABLE public.subjects 
ADD COLUMN short_name text DEFAULT NULL;