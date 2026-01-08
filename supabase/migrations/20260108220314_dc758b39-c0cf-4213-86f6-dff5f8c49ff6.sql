-- =============================================
-- FIX 1: Auto-create profile on user signup
-- =============================================

-- Function to create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, level, xp, streak_days)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    1,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users (runs after insert)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users that don't have one
INSERT INTO public.profiles (user_id, username, display_name, level, xp, streak_days)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', u.email),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  1,
  0,
  0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

-- =============================================
-- NEW SCHOOL SYSTEM: Schools > Years > Courses
-- =============================================

-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Users can create schools" ON public.schools FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their schools" ON public.schools FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their schools" ON public.schools FOR DELETE USING (auth.uid() = created_by);

-- School Years (Jahrgaenge)
CREATE TABLE IF NOT EXISTS public.school_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year_number INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view school years" ON public.school_years FOR SELECT USING (true);
CREATE POLICY "Users can create school years" ON public.school_years FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their school years" ON public.school_years FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their school years" ON public.school_years FOR DELETE USING (auth.uid() = created_by);

-- Courses (Kurse)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  teacher_name TEXT,
  color TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Users can create courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their courses" ON public.courses FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their courses" ON public.courses FOR DELETE USING (auth.uid() = created_by);

-- Course Members (Kursmitglieder)
CREATE TABLE IF NOT EXISTS public.course_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course members" ON public.course_members FOR SELECT USING (true);
CREATE POLICY "Users can join courses" ON public.course_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave courses" ON public.course_members FOR DELETE USING (auth.uid() = user_id);

-- Shared Homework (geteilte Hausaufgaben)
CREATE TABLE IF NOT EXISTS public.shared_homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium',
  shared_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view shared homework" ON public.shared_homework 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.course_members cm WHERE cm.course_id = shared_homework.course_id AND cm.user_id = auth.uid())
    OR shared_by = auth.uid()
  );
CREATE POLICY "Course members can share homework" ON public.shared_homework 
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (SELECT 1 FROM public.course_members cm WHERE cm.course_id = course_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Creators can update shared homework" ON public.shared_homework FOR UPDATE USING (auth.uid() = shared_by);
CREATE POLICY "Creators can delete shared homework" ON public.shared_homework FOR DELETE USING (auth.uid() = shared_by);

-- Shared Events (geteilte Termine)
CREATE TABLE IF NOT EXISTS public.shared_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'exam',
  shared_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view shared events" ON public.shared_events 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.course_members cm WHERE cm.course_id = shared_events.course_id AND cm.user_id = auth.uid())
    OR shared_by = auth.uid()
  );
CREATE POLICY "Course members can share events" ON public.shared_events 
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (SELECT 1 FROM public.course_members cm WHERE cm.course_id = course_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Creators can update shared events" ON public.shared_events FOR UPDATE USING (auth.uid() = shared_by);
CREATE POLICY "Creators can delete shared events" ON public.shared_events FOR DELETE USING (auth.uid() = shared_by);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_years_school_id ON public.school_years(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_school_year_id ON public.courses(school_year_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course_id ON public.course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_user_id ON public.course_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_homework_course_id ON public.shared_homework(course_id);
CREATE INDEX IF NOT EXISTS idx_shared_events_course_id ON public.shared_events(course_id);