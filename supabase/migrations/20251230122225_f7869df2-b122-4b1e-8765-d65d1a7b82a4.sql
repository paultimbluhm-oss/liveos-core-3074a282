-- Add missing columns to loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS loan_date DATE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT false;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS returned_date DATE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS return_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Add missing columns to lesson_absences
ALTER TABLE public.lesson_absences ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lesson_absences ADD COLUMN IF NOT EXISTS timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL;

-- Add missing columns to timetable_entries
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS week_type TEXT DEFAULT 'both';

-- Add deadline to school_projects
ALTER TABLE public.school_projects ADD COLUMN IF NOT EXISTS deadline DATE;

-- Create school_tasks table
CREATE TABLE public.school_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'reminder',
  person_name TEXT,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own school tasks" 
ON public.school_tasks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create custom_holidays table
CREATE TABLE public.custom_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom holidays" 
ON public.custom_holidays 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);