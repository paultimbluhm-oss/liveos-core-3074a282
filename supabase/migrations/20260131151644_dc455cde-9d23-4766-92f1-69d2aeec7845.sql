-- ===================================================================
-- SCHULSYSTEM REDESIGN: Scope-basiertes Datenmodell
-- Scope = (Schule, Jahrgangsstufe, Halbjahr, Klasse A-D)
-- ===================================================================

-- 1. Erweitere year_semesters um school_id fuer direkte Zuordnung
-- Diese Tabelle existiert bereits, wir fuegen nur school_id hinzu
ALTER TABLE year_semesters ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- 2. Neue Tabelle: scope_timetable_entries (Stundenplan pro Scope, nicht pro User)
-- Nur fuer globale Klassenstundenplaene (optional, falls gewuenscht)
-- Die eigentlichen User-Stundenplaene bleiben in timetable_entries

-- 3. Aktualisiere courses Tabelle fuer striktere Scope-Bindung
-- class_id NULL = Jahrgangskurs (gilt fuer alle Klassen A-D im Scope)
-- class_id NOT NULL = Klassenkurs (gilt nur fuer diese Klasse)

-- 4. Stelle sicher dass profiles die Scope-Felder hat
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_class_name TEXT DEFAULT 'A';

-- 5. Erstelle Index fuer schnellere Scope-Abfragen
CREATE INDEX IF NOT EXISTS idx_courses_scope ON courses(school_year_id, semester_id, class_id);
CREATE INDEX IF NOT EXISTS idx_year_semesters_scope ON year_semesters(school_year_id, grade_level, semester);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_user ON timetable_entries(user_id, course_id);

-- 6. Fuege school_id zu year_semesters hinzu fuer direkte Zuordnung
-- (Update bestehende Eintraege)
UPDATE year_semesters ys
SET school_id = sy.school_id
FROM school_years sy
WHERE ys.school_year_id = sy.id AND ys.school_id IS NULL;

-- 7. RLS Policies fuer year_semesters aktualisieren (falls noch nicht vorhanden)
-- Die Tabelle hat bereits RLS enabled

-- Stelle sicher dass die Policies existieren
DO $$ 
BEGIN
  -- Select Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'year_semesters' AND policyname = 'year_semesters_select'
  ) THEN
    CREATE POLICY "year_semesters_select" ON year_semesters FOR SELECT USING (true);
  END IF;
  
  -- Insert Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'year_semesters' AND policyname = 'year_semesters_insert'
  ) THEN
    CREATE POLICY "year_semesters_insert" ON year_semesters FOR INSERT WITH CHECK (true);
  END IF;
  
  -- Delete Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'year_semesters' AND policyname = 'year_semesters_delete'
  ) THEN
    CREATE POLICY "year_semesters_delete" ON year_semesters FOR DELETE USING (true);
  END IF;
END $$;