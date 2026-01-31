-- ================================================
-- SCHULE V2 - Komplett neues Schema
-- ================================================

-- 1. Schulen (V2)
CREATE TABLE public.v2_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_schools_select" ON public.v2_schools
  FOR SELECT USING (true);

CREATE POLICY "v2_schools_insert" ON public.v2_schools
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "v2_schools_update" ON public.v2_schools
  FOR UPDATE USING (auth.uid() = created_by);

-- 2. Schüler-Schule Zuordnung (1:1 pro User)
CREATE TABLE public.v2_school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.v2_schools(id) ON DELETE CASCADE,
  abitur_year INTEGER NOT NULL,
  current_grade_level INTEGER NOT NULL DEFAULT 12 CHECK (current_grade_level >= 1 AND current_grade_level <= 13),
  current_semester INTEGER NOT NULL DEFAULT 1 CHECK (current_semester IN (1, 2)),
  current_class_name TEXT NOT NULL DEFAULT 'A' CHECK (current_class_name IN ('A', 'B', 'C', 'D')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_school_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_memberships_select" ON public.v2_school_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "v2_memberships_insert" ON public.v2_school_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "v2_memberships_update" ON public.v2_school_memberships
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Kurse (immer an Scope gebunden)
CREATE TABLE public.v2_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.v2_schools(id) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 13),
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  class_name TEXT CHECK (class_name IN ('A', 'B', 'C', 'D')), -- NULL = Jahrgangskurs
  name TEXT NOT NULL,
  short_name TEXT,
  teacher_name TEXT,
  color TEXT DEFAULT '#6366f1',
  room TEXT,
  -- Notentypen
  has_oral BOOLEAN NOT NULL DEFAULT true,
  has_written BOOLEAN NOT NULL DEFAULT true,
  has_practical BOOLEAN NOT NULL DEFAULT false,
  -- Gewichtung (in Prozent, Summe = 100)
  oral_weight INTEGER NOT NULL DEFAULT 40,
  written_weight INTEGER NOT NULL DEFAULT 60,
  practical_weight INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_courses_select" ON public.v2_courses
  FOR SELECT USING (true);

CREATE POLICY "v2_courses_insert" ON public.v2_courses
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "v2_courses_update" ON public.v2_courses
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "v2_courses_delete" ON public.v2_courses
  FOR DELETE USING (auth.uid() = created_by);

-- 4. Kurs-Mitgliedschaften
CREATE TABLE public.v2_course_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.v2_course_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_course_members_select" ON public.v2_course_members
  FOR SELECT USING (true);

CREATE POLICY "v2_course_members_insert" ON public.v2_course_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "v2_course_members_delete" ON public.v2_course_members
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Stundenplan-Slots (pro Kurs)
CREATE TABLE public.v2_timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 5),
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 9),
  room TEXT,
  week_type TEXT NOT NULL DEFAULT 'both' CHECK (week_type IN ('both', 'A', 'B')),
  is_double_lesson BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_slots_select" ON public.v2_timetable_slots
  FOR SELECT USING (true);

CREATE POLICY "v2_slots_insert" ON public.v2_timetable_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v2_courses 
      WHERE id = course_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "v2_slots_delete" ON public.v2_timetable_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.v2_courses 
      WHERE id = course_id AND created_by = auth.uid()
    )
  );

-- 6. Noten (privat pro User)
CREATE TABLE public.v2_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  grade_type TEXT NOT NULL CHECK (grade_type IN ('oral', 'written', 'practical')),
  points INTEGER NOT NULL CHECK (points >= 0 AND points <= 15),
  date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_grades_select" ON public.v2_grades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "v2_grades_insert" ON public.v2_grades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "v2_grades_update" ON public.v2_grades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "v2_grades_delete" ON public.v2_grades
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Fehlzeiten (privat pro User, wochenbezogen)
CREATE TABLE public.v2_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  timetable_slot_id UUID REFERENCES public.v2_timetable_slots(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unexcused' CHECK (status IN ('unexcused', 'excused')),
  is_eva BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_absences_select" ON public.v2_absences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "v2_absences_insert" ON public.v2_absences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "v2_absences_update" ON public.v2_absences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "v2_absences_delete" ON public.v2_absences
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Kurs-Feed (Hausaufgaben/Infos)
CREATE TABLE public.v2_course_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.v2_courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('homework', 'info', 'event')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  shared_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.v2_course_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_feed_select" ON public.v2_course_feed
  FOR SELECT USING (true);

CREATE POLICY "v2_feed_insert" ON public.v2_course_feed
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "v2_feed_update" ON public.v2_course_feed
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "v2_feed_delete" ON public.v2_course_feed
  FOR DELETE USING (auth.uid() = shared_by);

-- Indizes für Performance
CREATE INDEX idx_v2_courses_scope ON public.v2_courses(school_id, grade_level, semester, class_name);
CREATE INDEX idx_v2_course_members_user ON public.v2_course_members(user_id);
CREATE INDEX idx_v2_grades_user_course ON public.v2_grades(user_id, course_id);
CREATE INDEX idx_v2_absences_user_date ON public.v2_absences(user_id, date);
CREATE INDEX idx_v2_timetable_course ON public.v2_timetable_slots(course_id);