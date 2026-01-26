-- Create table for date-specific timetable overrides (EVA, Ferien, etc.)
CREATE TABLE public.timetable_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  period INTEGER NOT NULL,
  override_type TEXT NOT NULL, -- 'eva', 'vacation', 'cancelled', 'substitute'
  label TEXT, -- Custom label like "EVA" or vacation name
  color TEXT, -- Optional custom color
  original_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timetable_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own overrides" 
ON public.timetable_overrides 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own overrides" 
ON public.timetable_overrides 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides" 
ON public.timetable_overrides 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides" 
ON public.timetable_overrides 
FOR DELETE 
USING (auth.uid() = user_id);

-- Index for fast lookup by user and date
CREATE INDEX idx_timetable_overrides_user_date ON public.timetable_overrides(user_id, date);

-- Unique constraint to prevent duplicate overrides for same slot
CREATE UNIQUE INDEX idx_timetable_overrides_unique_slot ON public.timetable_overrides(user_id, date, period);