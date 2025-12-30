-- Add category column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN category text DEFAULT 'hauptspeise';