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
      grades: {
        Row: {
          created_at: string | null
          date: string | null
          description: string | null
          grade_type: string
          id: string
          points: number
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          grade_type: string
          id?: string
          points: number
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          grade_type?: string
          id?: string
          points?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
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
          id: string
          last_active_date: string | null
          level: number | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          xp?: number | null
        }
        Relationships: []
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
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
