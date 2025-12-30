-- Create journal entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Physical factors
  sleep_hours INTEGER CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  nutrition_quality INTEGER CHECK (nutrition_quality >= 1 AND nutrition_quality <= 5),
  hydration_liters NUMERIC CHECK (hydration_liters >= 0 AND hydration_liters <= 10),
  exercise_minutes INTEGER CHECK (exercise_minutes >= 0),
  exercise_type TEXT,
  -- Mental/emotional factors
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  -- Social factors
  social_interactions INTEGER CHECK (social_interactions >= 0),
  quality_time_minutes INTEGER CHECK (quality_time_minutes >= 0),
  -- Gratitude
  gratitude_1 TEXT,
  gratitude_2 TEXT,
  gratitude_3 TEXT,
  -- Notes
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own journal entries"
ON public.journal_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();