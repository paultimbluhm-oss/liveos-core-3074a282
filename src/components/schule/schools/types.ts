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

export interface Course {
  id: string;
  school_year_id: string;
  name: string;
  short_name: string | null;
  teacher_name: string | null;
  color: string | null;
  room: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
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
