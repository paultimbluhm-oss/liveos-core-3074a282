
-- Add habit_type column to habits table
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS habit_type text NOT NULL DEFAULT 'check';

-- Add value column to habit_completions table (for count habits)
ALTER TABLE public.habit_completions ADD COLUMN IF NOT EXISTS value integer NULL;
