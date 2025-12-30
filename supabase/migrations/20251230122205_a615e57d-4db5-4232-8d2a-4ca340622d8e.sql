-- Add missing columns to boredom_activities
ALTER TABLE public.boredom_activities ADD COLUMN IF NOT EXISTS is_productive BOOLEAN DEFAULT false;

-- Add missing columns to activity_skills
ALTER TABLE public.activity_skills ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'value';
ALTER TABLE public.activity_skills ADD COLUMN IF NOT EXISTS xp_per_improvement INTEGER DEFAULT 1;

-- Update ideas table with missing columns
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS topic TEXT;

-- Update optimizations table with missing columns
ALTER TABLE public.optimizations ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.optimizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update balance_history with missing columns
ALTER TABLE public.balance_history ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 0;
ALTER TABLE public.balance_history ADD COLUMN IF NOT EXISTS accounts_balance NUMERIC DEFAULT 0;
ALTER TABLE public.balance_history ADD COLUMN IF NOT EXISTS investments_balance NUMERIC DEFAULT 0;

-- Update loans table to match expected structure
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS person_name TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS loan_type TEXT DEFAULT 'borrowed';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS category TEXT;

-- Create technical_terms table
CREATE TABLE public.technical_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  term TEXT NOT NULL,
  simple_term TEXT,
  explanation TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own technical terms" 
ON public.technical_terms 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create lesson_absences table
CREATE TABLE public.lesson_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  period INTEGER NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  excused BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lesson absences" 
ON public.lesson_absences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add missing columns to timetable_entries
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS teacher_short TEXT;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS subject_short TEXT;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS notes TEXT;