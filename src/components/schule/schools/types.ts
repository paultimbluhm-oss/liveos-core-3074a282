export interface School {
  id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface SchoolYear {
  id: string;
  school_id: string;
  name: string;
  year_number: number | null;
  created_by: string;
  created_at: string;
}

export interface Class {
  id: string;
  school_year_id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface ClassMember {
  id: string;
  class_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
}

export interface Course {
  id: string;
  school_year_id: string;
  class_id: string | null;
  name: string;
  short_name: string | null;
  teacher_name: string | null;
  color: string | null;
  room: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  // Grading fields
  has_grading?: boolean;
  written_weight?: number;
  oral_weight?: number;
}

export interface CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
}

export interface CourseTimetableSlot {
  id: string;
  course_id: string;
  day_of_week: number;
  period: number;
  room: string | null;
  week_type: string;
  is_double_lesson: boolean;
  created_at: string;
}

export interface SharedHomework {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  shared_by: string;
  created_at: string;
  sharer_profile?: {
    username: string | null;
    display_name: string | null;
  };
}

export interface SharedEvent {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  shared_by: string;
  created_at: string;
  sharer_profile?: {
    username: string | null;
    display_name: string | null;
  };
}
