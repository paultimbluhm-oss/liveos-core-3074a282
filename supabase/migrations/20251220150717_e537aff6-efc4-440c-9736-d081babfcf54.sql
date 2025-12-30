-- Create absence_reason enum type
CREATE TYPE public.absence_reason AS ENUM ('sick', 'doctor', 'school_project', 'other');

-- Create absences table
CREATE TABLE public.absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours INTEGER NOT NULL CHECK (hours > 0 AND hours <= 12),
  reason absence_reason NOT NULL DEFAULT 'sick',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own absences"
ON public.absences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);