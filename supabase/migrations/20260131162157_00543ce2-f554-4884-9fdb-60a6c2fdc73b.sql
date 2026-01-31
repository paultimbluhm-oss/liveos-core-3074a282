-- Add semester column to v2_grades table
ALTER TABLE public.v2_grades 
ADD COLUMN IF NOT EXISTS semester INTEGER NOT NULL DEFAULT 1 CHECK (semester IN (1, 2));

-- Update grade_type check constraint to include 'semester' type
ALTER TABLE public.v2_grades DROP CONSTRAINT IF EXISTS v2_grades_grade_type_check;
ALTER TABLE public.v2_grades ADD CONSTRAINT v2_grades_grade_type_check 
  CHECK (grade_type IN ('oral', 'written', 'practical', 'semester'));