
-- Course Events (Klassenarbeiten, Vokabeltests, besondere Termine)
CREATE TABLE public.v2_course_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('vocab_test', 'exam', 'abi_exam', 'absence', 'other')),
  date DATE NOT NULL,
  period INTEGER,
  topic TEXT,
  weight_percent INTEGER DEFAULT 0,
  notes TEXT,
  -- Absence-specific fields
  absence_status TEXT CHECK (absence_status IN ('excused', 'unexcused')),
  is_eva BOOLEAN DEFAULT false,
  timetable_slot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_course_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_course_events_select" ON public.v2_course_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "v2_course_events_insert" ON public.v2_course_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "v2_course_events_update" ON public.v2_course_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "v2_course_events_delete" ON public.v2_course_events
  FOR DELETE USING (auth.uid() = user_id);
