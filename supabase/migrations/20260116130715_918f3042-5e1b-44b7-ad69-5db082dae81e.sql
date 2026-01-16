-- Make subject_id nullable for grades that come from courses
ALTER TABLE public.grades ALTER COLUMN subject_id DROP NOT NULL;