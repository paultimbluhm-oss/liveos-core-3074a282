export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          created_at: string
          date: string
          excused: boolean | null
          id: string
          periods: number[] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          excused?: boolean | null
          id?: string
          periods?: number[] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          excused?: boolean | null
          id?: string
          periods?: number[] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_type: string
          balance: number | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type: string
          balance?: number | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achievement_type: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      active_time_tracker: {
        Row: {
          category_id: string
          created_at: string
          id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_skills: {
        Row: {
          activity_id: string
          best_value: number | null
          completed: boolean | null
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          measurement_type: string | null
          name: string
          order_index: number | null
          unit: string | null
          user_id: string
          xp_per_improvement: number | null
          xp_reward: number | null
        }
        Insert: {
          activity_id: string
          best_value?: number | null
          completed?: boolean | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          measurement_type?: string | null
          name: string
          order_index?: number | null
          unit?: string | null
          user_id: string
          xp_per_improvement?: number | null
          xp_reward?: number | null
        }
        Update: {
          activity_id?: string
          best_value?: number | null
          completed?: boolean | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          measurement_type?: string | null
          name?: string
          order_index?: number | null
          unit?: string | null
          user_id?: string
          xp_per_improvement?: number | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_skills_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "boredom_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_history: {
        Row: {
          account_id: string | null
          accounts_balance: number | null
          balance: number
          created_at: string
          date: string
          id: string
          investments_balance: number | null
          total_balance: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          accounts_balance?: number | null
          balance: number
          created_at?: string
          date?: string
          id?: string
          investments_balance?: number | null
          total_balance?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          accounts_balance?: number | null
          balance?: number
          created_at?: string
          date?: string
          id?: string
          investments_balance?: number | null
          total_balance?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      boredom_activities: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_productive: boolean | null
          name: string
          total_xp_earned: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_productive?: boolean | null
          name: string
          total_xp_earned?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_productive?: boolean | null
          name?: string
          total_xp_earned?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          calendar_id: string | null
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          location: string | null
          recurrence_rule: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          calendar_id?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          calendar_id?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_visible: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_visible?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_visible?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          current_value: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          challenged_id: string
          challenger_id: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          start_date: string
          status: string
          target_value: number | null
          title: string
          winner_id: string | null
        }
        Insert: {
          challenge_type: string
          challenged_id: string
          challenger_id: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number | null
          title: string
          winner_id?: string | null
        }
        Update: {
          challenge_type?: string
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number | null
          title?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          completed: boolean | null
          content: string
          created_at: string | null
          id: string
          order_index: number | null
          section_id: string | null
          user_id: string
        }
        Insert: {
          checklist_id: string
          completed?: boolean | null
          content: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          section_id?: string | null
          user_id: string
        }
        Update: {
          checklist_id?: string
          completed?: boolean | null
          content?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          section_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "checklist_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_sections: {
        Row: {
          checklist_id: string
          created_at: string | null
          id: string
          name: string
          order_index: number | null
          user_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          id?: string
          name: string
          order_index?: number | null
          user_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_sections_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          school_year_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          school_year_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          school_year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_connections: {
        Row: {
          created_at: string
          description: string | null
          from_contact_id: string
          id: string
          relationship_type: string
          to_contact_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_contact_id: string
          id?: string
          relationship_type: string
          to_contact_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          from_contact_id?: string
          id?: string
          relationship_type?: string
          to_contact_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_connections_from_contact_id_fkey"
            columns: ["from_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_connections_to_contact_id_fkey"
            columns: ["to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          status: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      course_members: {
        Row: {
          course_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_timetable_slots: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          id: string
          is_double_lesson: boolean | null
          period: number
          room: string | null
          week_type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          id?: string
          is_double_lesson?: boolean | null
          period: number
          room?: string | null
          week_type?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_double_lesson?: boolean | null
          period?: number
          room?: string | null
          week_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_timetable_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          class_id: string | null
          color: string | null
          created_at: string
          created_by: string
          has_grading: boolean | null
          id: string
          name: string
          oral_weight: number | null
          room: string | null
          school_year_id: string
          semester_id: string | null
          short_name: string | null
          teacher_name: string | null
          written_weight: number | null
        }
        Insert: {
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          has_grading?: boolean | null
          id?: string
          name: string
          oral_weight?: number | null
          room?: string | null
          school_year_id: string
          semester_id?: string | null
          short_name?: string | null
          teacher_name?: string | null
          written_weight?: number | null
        }
        Update: {
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          has_grading?: boolean | null
          id?: string
          name?: string
          oral_weight?: number | null
          room?: string | null
          school_year_id?: string
          semester_id?: string | null
          short_name?: string | null
          teacher_name?: string | null
          written_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "year_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_holidays: {
        Row: {
          color: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_config: {
        Row: {
          created_at: string
          hidden_widgets: string[]
          id: string
          updated_at: string
          user_id: string
          widget_order: string[]
        }
        Insert: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          updated_at?: string
          user_id: string
          widget_order?: string[]
        }
        Update: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          updated_at?: string
          user_id?: string
          widget_order?: string[]
        }
        Relationships: []
      }
      friend_privacy_settings: {
        Row: {
          created_at: string
          id: string
          share_finance: boolean
          share_grades: boolean
          share_habits: boolean
          share_level: boolean
          share_streak: boolean
          share_tasks: boolean
          share_xp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_finance?: boolean
          share_grades?: boolean
          share_habits?: boolean
          share_level?: boolean
          share_streak?: boolean
          share_tasks?: boolean
          share_xp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_finance?: boolean
          share_grades?: boolean
          share_habits?: boolean
          share_level?: boolean
          share_streak?: boolean
          share_tasks?: boolean
          share_xp?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_streaks: {
        Row: {
          created_at: string
          current_streak: number
          friendship_id: string
          id: string
          last_both_active_date: string | null
          longest_streak: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          friendship_id: string
          id?: string
          last_both_active_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          friendship_id?: string
          id?: string
          last_both_active_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_streaks_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: true
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      gift_ideas: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          price: number | null
          purchased: boolean | null
          purchased_date: string | null
          recipient_id: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price?: number | null
          purchased?: boolean | null
          purchased_date?: string | null
          recipient_id: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price?: number | null
          purchased?: boolean | null
          purchased_date?: string | null
          recipient_id?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_ideas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_ideas_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "gift_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_recipients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grade_color_settings: {
        Row: {
          created_at: string
          green_min: number
          id: string
          updated_at: string
          user_id: string
          yellow_min: number
        }
        Insert: {
          created_at?: string
          green_min?: number
          id?: string
          updated_at?: string
          user_id: string
          yellow_min?: number
        }
        Update: {
          created_at?: string
          green_min?: number
          id?: string
          updated_at?: string
          user_id?: string
          yellow_min?: number
        }
        Relationships: []
      }
      grades: {
        Row: {
          course_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          grade_type: string
          id: string
          points: number
          subject_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          grade_type: string
          id?: string
          points: number
          subject_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          grade_type?: string
          id?: string
          points?: number
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string | null
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string | null
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string | null
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      health_completions: {
        Row: {
          completed_date: string
          created_at: string
          health_item_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          health_item_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          health_item_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_completions_health_item_id_fkey"
            columns: ["health_item_id"]
            isOneToOne: false
            referencedRelation: "health_items"
            referencedColumns: ["id"]
          },
        ]
      }
      health_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          priority: string | null
          subject_id: string
          title: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          priority?: string | null
          subject_id: string
          title: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          priority?: string | null
          subject_id?: string
          title?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          investment_type: string
          name: string
          purchase_date: string | null
          purchase_price: number
          quantity: number
          source_account_id: string | null
          symbol: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          investment_type: string
          name: string
          purchase_date?: string | null
          purchase_price: number
          quantity: number
          source_account_id?: string | null
          symbol?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          investment_type?: string
          name?: string
          purchase_date?: string | null
          purchase_price?: number
          quantity?: number
          source_account_id?: string | null
          symbol?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          accomplishment_feeling: number | null
          autonomy_feeling: number | null
          best_moment: string | null
          connection_quality: number | null
          created_at: string | null
          energy_level: number | null
          entry_date: string
          exercise_minutes: number | null
          flow_experiences: number | null
          gratitude_1: string | null
          gratitude_2: string | null
          gratitude_3: string | null
          helped_others: boolean | null
          id: string
          mood_rating: number | null
          notes: string | null
          progress_made: number | null
          purpose_feeling: number | null
          quality_time_minutes: number | null
          social_interactions: number | null
          stress_level: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accomplishment_feeling?: number | null
          autonomy_feeling?: number | null
          best_moment?: string | null
          connection_quality?: number | null
          created_at?: string | null
          energy_level?: number | null
          entry_date?: string
          exercise_minutes?: number | null
          flow_experiences?: number | null
          gratitude_1?: string | null
          gratitude_2?: string | null
          gratitude_3?: string | null
          helped_others?: boolean | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          progress_made?: number | null
          purpose_feeling?: number | null
          quality_time_minutes?: number | null
          social_interactions?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accomplishment_feeling?: number | null
          autonomy_feeling?: number | null
          best_moment?: string | null
          connection_quality?: number | null
          created_at?: string | null
          energy_level?: number | null
          entry_date?: string
          exercise_minutes?: number | null
          flow_experiences?: number | null
          gratitude_1?: string | null
          gratitude_2?: string | null
          gratitude_3?: string | null
          helped_others?: boolean | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          progress_made?: number | null
          purpose_feeling?: number | null
          quality_time_minutes?: number | null
          social_interactions?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lesson_absences: {
        Row: {
          created_at: string
          date: string
          description: string | null
          excused: boolean | null
          id: string
          period: number | null
          reason: string | null
          subject_id: string | null
          timetable_entry_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          excused?: boolean | null
          id?: string
          period?: number | null
          reason?: string | null
          subject_id?: string | null
          timetable_entry_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          excused?: boolean | null
          id?: string
          period?: number | null
          reason?: string | null
          subject_id?: string | null
          timetable_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_absences_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_absences_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lifetime_events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          is_milestone: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_milestone?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_milestone?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lifetime_goals: {
        Row: {
          category: string
          created_at: string
          day_of_week: number | null
          id: string
          points_per_minute: number | null
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          points_per_minute?: number | null
          target_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          points_per_minute?: number | null
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string
          interest_rate: number | null
          is_paid: boolean | null
          is_returned: boolean | null
          lender_name: string
          loan_date: string | null
          loan_type: string | null
          monthly_payment: number | null
          notes: string | null
          original_amount: number
          paid_date: string | null
          person_name: string | null
          remaining_amount: number
          return_account_id: string | null
          returned_date: string | null
          source_account_id: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_paid?: boolean | null
          is_returned?: boolean | null
          lender_name: string
          loan_date?: string | null
          loan_type?: string | null
          monthly_payment?: number | null
          notes?: string | null
          original_amount: number
          paid_date?: string | null
          person_name?: string | null
          remaining_amount: number
          return_account_id?: string | null
          returned_date?: string | null
          source_account_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_paid?: boolean | null
          is_returned?: boolean | null
          lender_name?: string
          loan_date?: string | null
          loan_type?: string | null
          monthly_payment?: number | null
          notes?: string | null
          original_amount?: number
          paid_date?: string | null
          person_name?: string | null
          remaining_amount?: number
          return_account_id?: string | null
          returned_date?: string | null
          source_account_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_return_account_id_fkey"
            columns: ["return_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log: {
        Row: {
          created_at: string
          id: string
          meal_date: string
          meal_type: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_rules: {
        Row: {
          created_at: string
          description: string | null
          frequency_type: string
          id: string
          is_active: boolean | null
          order_index: number | null
          rule_type: string | null
          target_count: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency_type?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          rule_type?: string | null
          target_count?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency_type?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          rule_type?: string | null
          target_count?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      optimizations: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string | null
          description: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date?: string | null
          description: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          description?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_time_entries: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          hours: number | null
          id: string
          minutes: number
          order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          minutes?: number
          order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          minutes?: number
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_time_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          end_date: string | null
          expenses: number | null
          id: string
          location: string | null
          notes: string | null
          priority: string | null
          revenue: number | null
          start_date: string | null
          status: string | null
          time_spent_hours: number | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          expenses?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          priority?: string | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          time_spent_hours?: number | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          expenses?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          priority?: string | null
          revenue?: number | null
          start_date?: string | null
          status?: string | null
          time_spent_hours?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_grade_level: number | null
          current_semester: number | null
          display_name: string | null
          id: string
          last_active_date: string | null
          level: number | null
          selected_class_id: string | null
          selected_class_name: string | null
          selected_school_id: string | null
          selected_school_year_id: string | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_grade_level?: number | null
          current_semester?: number | null
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          selected_class_id?: string | null
          selected_class_name?: string | null
          selected_school_id?: string | null
          selected_school_year_id?: string | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_grade_level?: number | null
          current_semester?: number | null
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          selected_class_id?: string | null
          selected_class_name?: string | null
          selected_school_id?: string | null
          selected_school_year_id?: string | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_class_id_fkey"
            columns: ["selected_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_selected_school_id_fkey"
            columns: ["selected_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_selected_school_year_id_fkey"
            columns: ["selected_school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          amount: number | null
          id: string
          name: string
          order_index: number | null
          recipe_id: string
          unit: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          id?: string
          name: string
          order_index?: number | null
          recipe_id: string
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          id?: string
          name?: string
          order_index?: number | null
          recipe_id?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_nutrition_rules: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          rule_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          rule_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          rule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_nutrition_rules_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_nutrition_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "nutrition_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          id: string
          instruction: string
          recipe_id: string
          step_number: number
          user_id: string
        }
        Insert: {
          id?: string
          instruction: string
          recipe_id: string
          step_number: number
          user_id: string
        }
        Update: {
          id?: string
          instruction?: string
          recipe_id?: string
          step_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string | null
          cook_time_minutes: number | null
          created_at: string | null
          description: string | null
          health_rating: number | null
          id: string
          name: string
          prep_time_minutes: number | null
          servings: number | null
          taste_rating: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          health_rating?: number | null
          id?: string
          name: string
          prep_time_minutes?: number | null
          servings?: number | null
          taste_rating?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          health_rating?: number | null
          id?: string
          name?: string
          prep_time_minutes?: number | null
          servings?: number | null
          taste_rating?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          investment_id: string | null
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          next_execution_date: string
          source_account_id: string | null
          target_account_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          investment_id?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          next_execution_date: string
          source_account_id?: string | null
          target_account_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          investment_id?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          next_execution_date?: string
          source_account_id?: string | null
          target_account_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      school_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          subject_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_projects: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          due_date: string | null
          grade: number | null
          id: string
          priority: string | null
          status: string | null
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          due_date?: string | null
          grade?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          subject_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          due_date?: string | null
          grade?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_projects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subjects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          school_id: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          school_id: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          school_id?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tasks: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          person_name: string | null
          task_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          person_name?: string | null
          task_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          person_name?: string | null
          task_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      school_years: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          school_id: string
          year_number: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          school_id: string
          year_number?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          school_id?: string
          year_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      shared_events: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          shared_by: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          shared_by: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          shared_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_homework: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          priority: string | null
          shared_by: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          priority?: string | null
          shared_by: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: string | null
          shared_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_homework_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_entries: {
        Row: {
          created_at: string
          date: string | null
          id: string
          skill_id: string
          user_id: string
          value: number
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          skill_id: string
          user_id: string
          value: number
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          skill_id?: string
          user_id?: string
          value?: number
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_entries_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "activity_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          grade_year: number
          id: string
          name: string
          oral_weight: number | null
          room: string | null
          short_name: string | null
          teacher_short: string | null
          user_id: string
          written_weight: number | null
        }
        Insert: {
          created_at?: string | null
          grade_year: number
          id?: string
          name: string
          oral_weight?: number | null
          room?: string | null
          short_name?: string | null
          teacher_short?: string | null
          user_id: string
          written_weight?: number | null
        }
        Update: {
          created_at?: string | null
          grade_year?: number
          id?: string
          name?: string
          oral_weight?: number | null
          room?: string | null
          short_name?: string | null
          teacher_short?: string | null
          user_id?: string
          written_weight?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          title: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          title: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          title?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      technical_terms: {
        Row: {
          category: string | null
          created_at: string
          explanation: string
          id: string
          notes: string | null
          simple_term: string | null
          term: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          explanation: string
          id?: string
          notes?: string | null
          simple_term?: string | null
          term: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          explanation?: string
          id?: string
          notes?: string | null
          simple_term?: string | null
          term?: string
          user_id?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          category: string | null
          created_at: string
          definition: string
          id: string
          notes: string | null
          term: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          definition: string
          id?: string
          notes?: string | null
          term: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          definition?: string
          id?: string
          notes?: string | null
          term?: string
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          category: string
          created_at: string | null
          entry_date: string
          id: string
          minutes: number
          notes: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          entry_date?: string
          id?: string
          minutes?: number
          notes?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          minutes?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          course_id: string | null
          created_at: string
          day_of_week: number
          id: string
          is_free: boolean | null
          notes: string | null
          period: number
          room: string | null
          subject_id: string | null
          subject_short: string | null
          teacher_short: string | null
          user_id: string
          week_type: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_free?: boolean | null
          notes?: string | null
          period: number
          room?: string | null
          subject_id?: string | null
          subject_short?: string | null
          teacher_short?: string | null
          user_id: string
          week_type?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_free?: boolean | null
          notes?: string | null
          period?: number
          room?: string | null
          subject_id?: string | null
          subject_short?: string | null
          teacher_short?: string | null
          user_id?: string
          week_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_overrides: {
        Row: {
          color: string | null
          created_at: string
          date: string
          id: string
          label: string | null
          notes: string | null
          original_course_id: string | null
          override_type: string
          period: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          date: string
          id?: string
          label?: string | null
          notes?: string | null
          original_course_id?: string | null
          override_type: string
          period: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          date?: string
          id?: string
          label?: string | null
          notes?: string | null
          original_course_id?: string | null
          override_type?: string
          period?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_overrides_original_course_id_fkey"
            columns: ["original_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_absences: {
        Row: {
          course_id: string
          created_at: string
          date: string
          id: string
          is_eva: boolean
          notes: string | null
          status: string
          timetable_slot_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          date: string
          id?: string
          is_eva?: boolean
          notes?: string | null
          status?: string
          timetable_slot_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string
          id?: string
          is_eva?: boolean
          notes?: string | null
          status?: string
          timetable_slot_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_absences_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_absences_timetable_slot_id_fkey"
            columns: ["timetable_slot_id"]
            isOneToOne: false
            referencedRelation: "v2_timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_accounts: {
        Row: {
          account_type: string
          balance: number
          color: string | null
          created_at: string | null
          currency: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type: string
          balance?: number
          color?: string | null
          created_at?: string | null
          currency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number
          color?: string | null
          created_at?: string | null
          currency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      v2_automations: {
        Row: {
          account_id: string | null
          amount: number
          automation_type: string
          category_id: string | null
          created_at: string | null
          currency: string
          execution_day: number
          id: string
          interval_type: string
          investment_id: string | null
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          next_execution_date: string | null
          note: string | null
          to_account_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          automation_type: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          execution_day: number
          id?: string
          interval_type: string
          investment_id?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          next_execution_date?: string | null
          note?: string | null
          to_account_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          automation_type?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          execution_day?: number
          id?: string
          interval_type?: string
          investment_id?: string | null
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          next_execution_date?: string | null
          note?: string | null
          to_account_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_automations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_automations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v2_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_automations_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "v2_investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_automations_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_cash_denominations: {
        Row: {
          account_id: string
          created_at: string | null
          denomination: number
          id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          denomination: number
          id?: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          denomination?: number
          id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_cash_denominations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      v2_companies: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_companies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v2_company_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_company_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          order_index: number | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          user_id?: string
        }
        Relationships: []
      }
      v2_company_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v2_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_company_relations: {
        Row: {
          created_at: string
          description: string | null
          from_company_id: string
          id: string
          relation_type: string
          to_company_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_company_id: string
          id?: string
          relation_type: string
          to_company_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          from_company_id?: string
          id?: string
          relation_type?: string
          to_company_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_company_relations_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "v2_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_company_relations_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "v2_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_course_feed: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          shared_by: string
          title: string
          type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          shared_by: string
          title: string
          type: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          shared_by?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_course_feed_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_course_members: {
        Row: {
          course_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_course_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_courses: {
        Row: {
          class_name: string | null
          color: string | null
          created_at: string
          created_by: string
          grade_level: number
          has_oral: boolean
          has_practical: boolean
          has_written: boolean
          id: string
          name: string
          oral_weight: number
          practical_weight: number
          room: string | null
          school_id: string
          semester: number
          short_name: string | null
          teacher_name: string | null
          written_weight: number
        }
        Insert: {
          class_name?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          grade_level: number
          has_oral?: boolean
          has_practical?: boolean
          has_written?: boolean
          id?: string
          name: string
          oral_weight?: number
          practical_weight?: number
          room?: string | null
          school_id: string
          semester: number
          short_name?: string | null
          teacher_name?: string | null
          written_weight?: number
        }
        Update: {
          class_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          grade_level?: number
          has_oral?: boolean
          has_practical?: boolean
          has_written?: boolean
          id?: string
          name?: string
          oral_weight?: number
          practical_weight?: number
          room?: string | null
          school_id?: string
          semester?: number
          short_name?: string | null
          teacher_name?: string | null
          written_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v2_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_daily_snapshots: {
        Row: {
          account_balances: Json
          created_at: string | null
          date: string
          eur_usd_rate: number | null
          expenses_eur: number
          id: string
          income_eur: number
          net_worth_eur: number
          total_accounts_eur: number
          total_investments_eur: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_balances?: Json
          created_at?: string | null
          date: string
          eur_usd_rate?: number | null
          expenses_eur?: number
          id?: string
          income_eur?: number
          net_worth_eur?: number
          total_accounts_eur?: number
          total_investments_eur?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_balances?: Json
          created_at?: string | null
          date?: string
          eur_usd_rate?: number | null
          expenses_eur?: number
          id?: string
          income_eur?: number
          net_worth_eur?: number
          total_accounts_eur?: number
          total_investments_eur?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      v2_external_savings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expected_date: string | null
          id: string
          is_received: boolean
          name: string
          note: string | null
          received_account_id: string | null
          received_date: string | null
          source_person: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          is_received?: boolean
          name: string
          note?: string | null
          received_account_id?: string | null
          received_date?: string | null
          source_person: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          is_received?: boolean
          name?: string
          note?: string | null
          received_account_id?: string | null
          received_date?: string | null
          source_person?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_external_savings_received_account_id_fkey"
            columns: ["received_account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_grades: {
        Row: {
          course_id: string
          created_at: string
          date: string | null
          description: string | null
          grade_type: string
          id: string
          points: number
          semester: number
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          date?: string | null
          description?: string | null
          grade_type: string
          id?: string
          points: number
          semester?: number
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string | null
          description?: string | null
          grade_type?: string
          id?: string
          points?: number
          semester?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_homework: {
        Row: {
          completed: boolean | null
          course_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          course_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_homework_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_homework_completions: {
        Row: {
          completed_at: string
          homework_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          homework_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          homework_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_homework_completions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "v2_homework"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_investments: {
        Row: {
          asset_type: string
          avg_purchase_price: number
          created_at: string | null
          currency: string
          current_price: number | null
          current_price_updated_at: string | null
          id: string
          is_active: boolean | null
          name: string
          quantity: number
          symbol: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_type: string
          avg_purchase_price?: number
          created_at?: string | null
          currency?: string
          current_price?: number | null
          current_price_updated_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quantity?: number
          symbol?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_type?: string
          avg_purchase_price?: number
          created_at?: string | null
          currency?: string
          current_price?: number | null
          current_price_updated_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quantity?: number
          symbol?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      v2_material_assets: {
        Row: {
          category: string | null
          created_at: string | null
          current_value: number | null
          id: string
          name: string
          note: string | null
          purchase_date: string | null
          purchase_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          name: string
          note?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          name?: string
          note?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      v2_school_memberships: {
        Row: {
          abitur_year: number
          current_class_name: string
          current_grade_level: number
          current_semester: number
          id: string
          joined_at: string
          school_id: string
          user_id: string
        }
        Insert: {
          abitur_year: number
          current_class_name?: string
          current_grade_level?: number
          current_semester?: number
          id?: string
          joined_at?: string
          school_id: string
          user_id: string
        }
        Update: {
          abitur_year?: number
          current_class_name?: string
          current_grade_level?: number
          current_semester?: number
          id?: string
          joined_at?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v2_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_schools: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      v2_timetable_slots: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          id: string
          is_double_lesson: boolean
          period: number
          room: string | null
          week_type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          id?: string
          is_double_lesson?: boolean
          period: number
          room?: string | null
          week_type?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_double_lesson?: boolean
          period?: number
          room?: string | null
          week_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_timetable_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v2_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_transactions: {
        Row: {
          account_id: string | null
          amount: number
          automation_id: string | null
          category_id: string | null
          created_at: string | null
          currency: string
          date: string
          execution_id: string | null
          id: string
          investment_id: string | null
          note: string | null
          time: string | null
          to_account_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          automation_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          execution_id?: string | null
          id?: string
          investment_id?: string | null
          note?: string | null
          time?: string | null
          to_account_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          automation_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          execution_id?: string | null
          id?: string
          investment_id?: string | null
          note?: string | null
          time?: string | null
          to_account_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v2_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "v2_investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "v2_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_vocab_languages: {
        Row: {
          created_at: string
          id: string
          source_lang: string
          target_lang: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_lang?: string
          target_lang: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_lang?: string
          target_lang?: string
          user_id?: string
        }
        Relationships: []
      }
      v2_vocab_progress: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          last_reviewed: string | null
          mastered: boolean
          set_id: string
          user_id: string
          word_id: string
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean
          set_id: string
          user_id: string
          word_id: string
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean
          set_id?: string
          user_id?: string
          word_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_vocab_progress_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "v2_vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_vocab_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "v2_vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_vocab_sets: {
        Row: {
          created_at: string
          high_score_mc: number
          high_score_type: number
          id: string
          language_id: string
          name: string
          set_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          high_score_mc?: number
          high_score_type?: number
          id?: string
          language_id: string
          name: string
          set_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          high_score_mc?: number
          high_score_type?: number
          id?: string
          language_id?: string
          name?: string
          set_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_vocab_sets_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "v2_vocab_languages"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_vocab_words: {
        Row: {
          created_at: string
          id: string
          set_id: string
          source_word: string
          target_word: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          set_id: string
          source_word: string
          target_word: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          set_id?: string
          source_word?: string
          target_word?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_vocab_words_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "v2_vocab_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      year_semesters: {
        Row: {
          created_at: string
          grade_level: number
          id: string
          school_id: string | null
          school_year_id: string
          semester: number
        }
        Insert: {
          created_at?: string
          grade_level: number
          id?: string
          school_id?: string | null
          school_year_id: string
          semester: number
        }
        Update: {
          created_at?: string
          grade_level?: number
          id?: string
          school_id?: string | null
          school_year_id?: string
          semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "year_semesters_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_semesters_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "rejected" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      friendship_status: ["pending", "accepted", "rejected", "blocked"],
    },
  },
} as const
