-- Create timetable_entries table
CREATE TABLE public.timetable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 5),
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 12),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_short TEXT NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, period)
);

-- Enable RLS
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own timetable"
ON public.timetable_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create lesson_absences table (granular absences per lesson)
CREATE TABLE public.lesson_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  reason public.absence_reason NOT NULL DEFAULT 'sick',
  excused BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, timetable_entry_id)
);

-- Enable RLS
ALTER TABLE public.lesson_absences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own lesson absences"
ON public.lesson_absences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);