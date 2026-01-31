
# Schulsystem Redesign - Jahrgang, Halbjahr & Klassen-Filter

## Status: Phase 1 Abgeschlossen

### Erledigte Aufgaben:
- [x] Datenbank-Migration: `year_semesters` Tabelle erstellt
- [x] Datenbank-Migration: `courses.semester_id` Spalte hinzugefuegt
- [x] Datenbank-Migration: `profiles.current_grade_level` + `profiles.current_semester` hinzugefuegt
- [x] Frontend: `useSchoolContext` Hook erstellt
- [x] Frontend: `SchoolFilterDropdowns` Komponente erstellt
- [x] Frontend: `Schule.tsx` mit Dropdowns im Header aktualisiert
- [x] Frontend: `CreateCourseDialog` mit semester_id Integration aktualisiert
- [x] Frontend: `types.ts` mit `YearSemester` Interface erweitert

## Analyse des aktuellen Systems

## Neue Struktur

Die neue Logik trennt:
- **Abi-Jahrgang** (z.B. "Abitur 2026") - bleibt als Grundstruktur
- **Klassenstufe** (1-13) - NEUES Dropdown im Header
- **Halbjahr** (1 oder 2) - NEUES Dropdown im Header  
- **Klasse** (z.B. "12a", "12b") - BESTEHENDES Dropdown im Header

### Datenmodell-Erweiterung

```text
+------------------+     +------------------+     +------------------+
|     schools      |     |   school_years   |     |     classes      |
+------------------+     +------------------+     +------------------+
| id               |---->| id               |---->| id               |
| name             |     | school_id        |     | school_year_id   |
| short_name       |     | name (Abi 2026)  |     | name (12a, 12b)  |
+------------------+     | year_number      |     +------------------+
                         +------------------+

                                 |
                                 v
                         +------------------+
                         |  year_semesters  |  <-- NEU
                         +------------------+
                         | id               |
                         | school_year_id   |
                         | grade_level (1-13)|
                         | semester (1 oder 2)|
                         | created_at       |
                         +------------------+
                                 |
                                 v
                         +------------------+
                         |     courses      |  <-- ERWEITERT
                         +------------------+
                         | id               |
                         | school_year_id   |
                         | semester_id      |  <-- NEU (FK zu year_semesters)
                         | class_id         |
                         | name             |
                         | ...              |
                         +------------------+
```

---

## UI-Aenderungen

### Header-Bereich mit Dropdowns

```text
+------------------------------------------------------------+
|  [HS]  [Jahrgang v]  [Halbjahr v]  [Klasse v]  [Settings]  |
+------------------------------------------------------------+
          |              |              |
          v              v              v
       12             1. HJ           12a
       11             2. HJ           12b
       10                             --
       ...
```

Alle drei Dropdowns kompakt nebeneinander:
- **Jahrgang**: 1-13 (Klassenstufe)
- **Halbjahr**: 1 oder 2
- **Klasse**: Verfuegbare Klassen (12a, 12b, etc.) oder "Alle"

### Technische Umsetzung der Dropdowns

Die Dropdowns werden als Select-Komponenten implementiert:

```typescript
// State fuer die Filter
const [selectedGradeLevel, setSelectedGradeLevel] = useState<number>(12);
const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
```

---

## Neue Datenbank-Tabelle: `year_semesters`

Diese Tabelle speichert die Kombination aus Klassenstufe + Halbjahr fuer jeden Abi-Jahrgang:

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primaerschluessel |
| school_year_id | UUID | FK zu school_years |
| grade_level | INTEGER | Klassenstufe (1-13) |
| semester | INTEGER | Halbjahr (1 oder 2) |
| created_at | TIMESTAMPTZ | Erstellungszeitpunkt |

**Unique Constraint**: (school_year_id, grade_level, semester)

---

## Erweiterung der `courses` Tabelle

Neue Spalte:

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| semester_id | UUID | FK zu year_semesters (optional) |

Wenn `semester_id` gesetzt ist, gehoert der Kurs zu einem spezifischen Jahrgang + Halbjahr.

---

## Logik-Aenderungen

### 1. Kurs-Erstellung

Beim Erstellen eines Kurses wird der aktuelle Jahrgang + Halbjahr automatisch zugeordnet:

```typescript
// Beim Kurs erstellen
const createCourse = async (courseData) => {
  // Hole oder erstelle das semester_id fuer die aktuelle Auswahl
  const semesterId = await getOrCreateSemester(
    selectedSchoolYearId, 
    selectedGradeLevel, 
    selectedSemester
  );
  
  await supabase.from('courses').insert({
    ...courseData,
    school_year_id: selectedSchoolYearId,
    semester_id: semesterId,
    class_id: selectedClassFilter || null,
  });
};
```

### 2. Kurs-Filterung

Kurse werden nach Jahrgang + Halbjahr + Klasse gefiltert:

```typescript
const fetchCourses = async () => {
  // Hole das passende semester_id
  const { data: semester } = await supabase
    .from('year_semesters')
    .select('id')
    .eq('school_year_id', selectedYearId)
    .eq('grade_level', selectedGradeLevel)
    .eq('semester', selectedSemester)
    .maybeSingle();
  
  if (!semester) {
    setCourses([]);
    return;
  }
  
  let query = supabase
    .from('courses')
    .select('*')
    .eq('semester_id', semester.id);
  
  if (selectedClassFilter) {
    query = query.or(`class_id.eq.${selectedClassFilter},class_id.is.null`);
  }
  
  const { data } = await query;
  setCourses(data || []);
};
```

### 3. Stundenplan

Der Stundenplan zeigt nur Kurse des aktuellen Jahrgangs + Halbjahrs:

- Beim Wechsel des Halbjahrs aendert sich der Stundenplan
- Kurs-Mitgliedschaften bleiben erhalten (User ist weiterhin Mitglied)
- Aber die `timetable_entries` werden nach semester_id gefiltert

---

## Profil-Erweiterung

Neue Spalten in `profiles`:

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| current_grade_level | INTEGER | Aktuelle Klassenstufe (1-13) |
| current_semester | INTEGER | Aktuelles Halbjahr (1 oder 2) |

---

## Dateistruktur-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| **Datenbank** | |
| Migration | `year_semesters` Tabelle erstellen |
| Migration | `courses.semester_id` hinzufuegen |
| Migration | `profiles.current_grade_level` + `profiles.current_semester` hinzufuegen |
| **Frontend** | |
| `src/pages/Schule.tsx` | Header mit 3 Dropdowns, Filterlogik |
| `src/components/schule/schools/SchoolSettingsDialog.tsx` | Jahrgang/Halbjahr-Einstellungen |
| `src/components/schule/schools/CreateCourseDialog.tsx` | semester_id beim Erstellen setzen |
| `src/components/schule/schools/types.ts` | Neue Typen hinzufuegen |

---

## Migrations-SQL

```sql
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
```

---

## Visuelle Darstellung des neuen Headers

```text
+------------------------------------------------------------------+
| [HS]         [12 v]    [1. HJ v]    [12a v]         [Settings]   |
|  ^             ^          ^           ^                ^          |
| Schul-     Jahrgang    Halbjahr    Klasse         Einstellungen  |
| kuerzel    (1-13)      (1/2)       (optional)                    |
+------------------------------------------------------------------+
```

Mobile-optimiert mit kompakten Select-Komponenten.

---

## Workflow fuer Admin (Kurs erstellen)

1. Admin waehlt oben: Jahrgang 12, Halbjahr 1, Klasse 12a
2. Klickt auf "+ Kurs"
3. Traegt Kurs-Daten ein (Name, Lehrer, Zeiten)
4. Kurs wird automatisch dem Jahrgang 12 / 1. Halbjahr / Klasse 12a zugeordnet
5. Alle Schueler mit Jahrgang 12 + 1. Halbjahr + Klasse 12a sehen diesen Kurs

## Workflow fuer Schueler (Kurs beitreten)

1. Schueler stellt ein: Jahrgang 12, Halbjahr 1, Klasse 12a
2. Sieht alle verfuegbaren Kurse fuer diese Kombination
3. Tritt Kursen bei
4. Stundenplan wird automatisch aktualisiert
5. Bei Wechsel auf Halbjahr 2: Muss neue Kurse waehlen

---

## Zusammenfassung

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Struktur | Schule > Abi-Jahrgang > Klasse | Schule > Abi-Jahrgang + Jahrgang/Halbjahr/Klasse Filter |
| Kurse | Pro Abi-Jahrgang | Pro Abi-Jahrgang + Jahrgang + Halbjahr |
| Stundenplan | Individuell, aber nicht halbjahr-getrennt | Individuell + halbjahr-spezifisch |
| Filter | Nur Klasse | Jahrgang + Halbjahr + Klasse |
| Klassen | Optional | Optional, als Filter |
