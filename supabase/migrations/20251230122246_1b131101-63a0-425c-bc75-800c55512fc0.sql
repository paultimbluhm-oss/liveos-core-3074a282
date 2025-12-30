-- Make period nullable in lesson_absences since it may be derived from timetable_entry
ALTER TABLE public.lesson_absences ALTER COLUMN period DROP NOT NULL;

-- Add missing columns to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS calendar_id UUID;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create calendars table
CREATE TABLE public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_visible BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendars" 
ON public.calendars 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add foreign key reference to calendar_events
ALTER TABLE public.calendar_events 
ADD CONSTRAINT calendar_events_calendar_id_fkey 
FOREIGN KEY (calendar_id) REFERENCES public.calendars(id) ON DELETE SET NULL;