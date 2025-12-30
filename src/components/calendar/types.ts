export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_visible: boolean;
  is_default: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  calendar_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  calendar?: Calendar | null;
}

export interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  room: string | null;
  teacher_short: string;
  subject_id: string | null;
  week_type: string | null;
  subject?: {
    name: string;
    short_name: string | null;
  } | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  priority: string | null;
}

export type ViewType = 'week' | 'month' | 'day';

export const LESSON_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:45', end: '09:30' },
  3: { start: '09:50', end: '10:35' },
  4: { start: '10:35', end: '11:20' },
  5: { start: '11:40', end: '12:25' },
  6: { start: '12:25', end: '13:10' },
  7: { start: '14:15', end: '15:00' },
  8: { start: '15:00', end: '15:45' },
  9: { start: '15:45', end: '16:30' },
  10: { start: '16:30', end: '17:15' },
};

export const DEFAULT_CALENDAR_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];
