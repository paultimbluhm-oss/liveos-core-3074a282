-- 1. Neue Tabelle year_semesters
CREATE TABLE year_semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 13),
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_year_id, grade_level, semester)
);

-- 2. RLS fuer year_semesters
ALTER TABLE year_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "year_semesters_select" ON year_semesters
  FOR SELECT USING (true);

CREATE POLICY "year_semesters_insert" ON year_semesters
  FOR INSERT WITH CHECK (true);

-- 3. courses.semester_id hinzufuegen
ALTER TABLE courses ADD COLUMN semester_id UUID REFERENCES year_semesters(id);

-- 4. profiles erweitern
ALTER TABLE profiles ADD COLUMN current_grade_level INTEGER DEFAULT 12;
ALTER TABLE profiles ADD COLUMN current_semester INTEGER DEFAULT 1;