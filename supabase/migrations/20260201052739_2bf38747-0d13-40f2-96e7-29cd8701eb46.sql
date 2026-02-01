-- Create homework table for V2
CREATE TABLE public.v2_homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.v2_homework ENABLE ROW LEVEL SECURITY;

-- Policies: Jeder im Kurs kann Hausaufgaben sehen
CREATE POLICY "Users can view homework for their courses"
ON public.v2_homework
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.v2_course_members cm
    WHERE cm.course_id = v2_homework.course_id
    AND cm.user_id = auth.uid()
  )
);

-- Jeder im Kurs kann Hausaufgaben hinzufügen
CREATE POLICY "Users can create homework for their courses"
ON public.v2_homework
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.v2_course_members cm
    WHERE cm.course_id = v2_homework.course_id
    AND cm.user_id = auth.uid()
  )
);

-- Nur der Ersteller kann löschen
CREATE POLICY "Users can delete their own homework"
ON public.v2_homework
FOR DELETE
USING (auth.uid() = user_id);

-- Jeder kann als erledigt markieren
CREATE POLICY "Users can update homework completion"
ON public.v2_homework
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.v2_course_members cm
    WHERE cm.course_id = v2_homework.course_id
    AND cm.user_id = auth.uid()
  )
);