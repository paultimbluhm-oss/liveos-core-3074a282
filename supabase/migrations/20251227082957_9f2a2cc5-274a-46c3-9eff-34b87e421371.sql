-- Add measurement columns to activity_skills
ALTER TABLE public.activity_skills 
ADD COLUMN measurement_type text DEFAULT 'completion',
ADD COLUMN best_value numeric DEFAULT NULL,
ADD COLUMN xp_per_improvement integer DEFAULT 15;

-- Create table for tracking skill entries/attempts
CREATE TABLE public.skill_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id uuid NOT NULL REFERENCES public.activity_skills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value numeric NOT NULL,
  xp_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own skill entries"
ON public.skill_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add comment for measurement types
COMMENT ON COLUMN public.activity_skills.measurement_type IS 'completion, time_fastest, time_duration, count';