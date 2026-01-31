# Schule-V2 - Implementierungsplan

## Übersicht

Komplett neue Schulseite, unabhängig von der bestehenden Schule-Seite.

---

## Phase 1: Datenbank-Schema

### Neue Tabellen (mit Prefix `v2_` zur Trennung)

```sql
-- 1. Schulen
v2_schools (
  id, name, short_name, created_by, created_at
)

-- 2. Schüler-Schule Zuordnung (1:1)
v2_school_memberships (
  id, user_id UNIQUE, school_id, abitur_year, 
  current_grade_level, current_semester, current_class_name,
  joined_at
)

-- 3. Kurse (immer an Scope gebunden)
v2_courses (
  id, school_id, grade_level, semester, class_name (nullable für Jahrgangskurse),
  name, short_name, teacher_name, color, room,
  has_oral, has_written, has_practical,
  oral_weight, written_weight, practical_weight,
  created_by, created_at
)

-- 4. Kurs-Mitgliedschaften
v2_course_members (
  id, course_id, user_id, role, joined_at
)

-- 5. Stundenplan-Slots (pro Kurs)
v2_timetable_slots (
  id, course_id, day_of_week, period, room, week_type,
  is_double_lesson, created_at
)

-- 6. Noten (privat pro User)
v2_grades (
  id, user_id, course_id, 
  grade_type (oral/written/practical),
  points, date, description, created_at
)

-- 7. Fehlzeiten (privat pro User, wochenbezogen)
v2_absences (
  id, user_id, course_id, timetable_slot_id,
  date, status (unexcused/excused), 
  is_eva, notes, created_at, updated_at
)

-- 8. Hausaufgaben/Feed (pro Kurs, geteilt)
v2_course_feed (
  id, course_id, type (homework/info/event),
  title, description, due_date, priority,
  shared_by, created_at
)
```

---

## Phase 2: Frontend-Struktur

### Seite & Routing
- `/schule-v2` → SchuleV2.tsx
- Sidebar-Eintrag hinzufügen

### Komponenten-Baum
```
src/components/schule-v2/
├── SchuleV2Page.tsx          // Hauptseite
├── context/
│   └── SchoolV2Context.tsx   // Scope-State (Jahrgang/Halbjahr/Klasse)
├── setup/
│   ├── SchoolJoinDialog.tsx  // Schule beitreten/erstellen
│   └── AbiturYearSelect.tsx  // Abi-Jahr auswählen
├── header/
│   ├── ScopeSelector.tsx     // Jahrgang/Halbjahr/Klasse Dropdowns
│   └── StatsHeader.tsx       // Stunden + Durchschnitt
├── timetable/
│   ├── WeekTimetable.tsx     // Wochenansicht mit Swipe
│   ├── TimetableSlot.tsx     // Einzelne Stunde
│   └── SlotActions.tsx       // EVA/Fehlzeit markieren
├── courses/
│   ├── CoursesList.tsx       // Kursliste im Scope
│   ├── CourseCard.tsx        // Kurs-Karte
│   ├── CreateCourseDialog.tsx // Kurs erstellen
│   └── JoinCourseDialog.tsx  // Kurs beitreten
├── course-detail/
│   ├── CourseDetailSheet.tsx // Drawer für Kursdetails
│   ├── CourseFeed.tsx        // Hausaufgaben/Infos
│   ├── CourseGrades.tsx      // Notenübersicht
│   └── AddGradeDialog.tsx    // Note hinzufügen
└── grades/
    ├── GradesSummary.tsx     // Schnitt-Berechnung
    └── GradeItem.tsx         // Einzelne Note
```

---

## Phase 3: Kernfunktionen

### 3.1 Scope-Logik
- Context speichert: school_id, grade_level, semester, class_name
- Jeder Wechsel triggert Daten-Reload
- Scope wird in v2_school_memberships persistiert

### 3.2 Stundenplan
- Wochenansicht (Mo-Fr)
- Perioden: 1-6, Pause, 8-9
- Swipe zwischen Wochen (mobile)
- Klick auf Slot → CourseDetailSheet

### 3.3 Kurse
- Erstellung im aktuellen Scope
- Toggle: Klassenkurs vs. Jahrgangskurs
- Beitritt zu existierenden Kursen
- Mitgliedschaft steuert Sichtbarkeit im eigenen Plan

### 3.4 Noten
- Typen: mündlich, schriftlich, (optional) Praxis
- Gewichtung bei Kurserstellung festgelegt
- Berechnung:
  - Halbjahresnote = gewichteter Schnitt der Typen
  - Halbjahresschnitt = Schnitt aller Kursnoten
  - Jahresschnitt = (HJ1 + HJ2) / 2

### 3.5 Fehlzeiten
- Pro Stunde/Datum
- Status: entschuldigt / unentschuldigt
- EVA-Markierung
- Nachträgliche Änderung möglich

---

## Phase 4: UI/UX

### Mobile-First
- Swipe-Navigation für Wochen
- Bottom Sheet für Kursdetails
- Kompakte Header-Selects

### Desktop
- Gleiche Logik, breiteres Layout
- Sidebar bleibt, Content expandiert

---

## Reihenfolge der Implementierung

1. ✅ Plan erstellen
2. [ ] Datenbank-Migration
3. [ ] Context & Hooks (SchoolV2Context, useSchoolV2Scope)
4. [ ] Hauptseite + Routing
5. [ ] Setup-Flow (Schule erstellen/beitreten)
6. [ ] Scope-Header
7. [ ] Stundenplan (Wochenansicht)
8. [ ] Kursliste + Erstellung
9. [ ] Kurs-Detail-Sheet
10. [ ] Notenmanagement
11. [ ] Fehlzeiten
