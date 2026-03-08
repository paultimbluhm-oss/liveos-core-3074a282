
-- First update existing lk entries
UPDATE public.v2_abi_course_settings SET course_type = 'gk' WHERE course_type = 'lk';

-- Now drop old and add new constraint
ALTER TABLE public.v2_abi_course_settings DROP CONSTRAINT IF EXISTS v2_abi_course_settings_course_type_check;
ALTER TABLE public.v2_abi_course_settings ADD CONSTRAINT v2_abi_course_settings_course_type_check 
  CHECK (course_type IN ('p1', 'p2', 'p3', 'p4', 'p5', 'gk', 'abgewaehlt'));

-- Add column for estimated exam points (Block II)
ALTER TABLE public.v2_abi_course_settings ADD COLUMN IF NOT EXISTS exam_points integer DEFAULT NULL;
