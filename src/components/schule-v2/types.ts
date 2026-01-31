// Schule V2 Types - Komplett unabhängig von V1

export interface V2School {
  id: string;
  name: string;
  short_name: string | null;
  created_by: string;
  created_at: string;
}

export interface V2SchoolMembership {
  id: string;
  user_id: string;
  school_id: string;
  abitur_year: number;
  current_grade_level: number;
  current_semester: 1 | 2;
  current_class_name: 'A' | 'B' | 'C' | 'D';
  joined_at: string;
  school?: V2School;
}

export interface V2Course {
  id: string;
  school_id: string;
  grade_level: number;
  semester: 1 | 2;
  class_name: 'A' | 'B' | 'C' | 'D' | null; // null = Jahrgangskurs
  name: string;
  short_name: string | null;
  teacher_name: string | null;
  color: string | null;
  room: string | null;
  // Notentypen
  has_oral: boolean;
  has_written: boolean;
  has_practical: boolean;
  // Gewichtung
  oral_weight: number;
  written_weight: number;
  practical_weight: number;
  created_by: string;
  created_at: string;
  // Computed
  is_member?: boolean;
  member_count?: number;
}

export interface V2CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface V2TimetableSlot {
  id: string;
  course_id: string;
  day_of_week: number; // 1-5 (Mo-Fr)
  period: number; // 1-9
  room: string | null;
  week_type: 'both' | 'A' | 'B';
  is_double_lesson: boolean;
  created_at: string;
  // Joined
  course?: V2Course;
}

export interface V2Grade {
  id: string;
  user_id: string;
  course_id: string;
  grade_type: 'oral' | 'written' | 'practical' | 'semester';
  points: number; // 0-15
  date: string | null;
  description: string | null;
  semester: 1 | 2;
  created_at: string;
}

export interface V2Absence {
  id: string;
  user_id: string;
  course_id: string;
  timetable_slot_id: string | null;
  date: string;
  status: 'unexcused' | 'excused';
  is_eva: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2CourseFeedItem {
  id: string;
  course_id: string;
  type: 'homework' | 'info' | 'event';
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high';
  shared_by: string;
  created_at: string;
}

// Scope = aktueller Kontext
export interface V2Scope {
  school: V2School | null;
  gradeLevel: number;
  semester: 1 | 2;
  className: 'A' | 'B' | 'C' | 'D';
}

// Zeitraster für Stundenplan
export const PERIOD_TIMES: Record<number, { start: string; end: string; label: string }> = {
  1: { start: '08:00', end: '08:45', label: '1' },
  2: { start: '08:45', end: '09:30', label: '2' },
  3: { start: '09:50', end: '10:35', label: '3' },
  4: { start: '10:35', end: '11:20', label: '4' },
  5: { start: '11:40', end: '12:25', label: '5' },
  6: { start: '12:25', end: '13:10', label: '6' },
  7: { start: '13:10', end: '14:15', label: 'Pause' },
  8: { start: '14:15', end: '15:00', label: '8' },
  9: { start: '15:00', end: '15:45', label: '9' },
};

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;
export const CLASS_OPTIONS = ['A', 'B', 'C', 'D'] as const;
