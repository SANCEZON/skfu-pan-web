export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          full_name: string
          telegram: string | null
          phone: string | null
          status: 'active' | 'expelled'
          group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          telegram?: string | null
          phone?: string | null
          status?: 'active' | 'expelled'
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          telegram?: string | null
          phone?: string | null
          status?: 'active' | 'expelled'
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          name: string
          code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          created_at?: string
        }
      }
      teacher_subjects: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          subject_id: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          subject_id?: string
          created_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          subject_id: string
          teacher_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          type: 'lecture' | 'lab' | 'practice'
          is_recurring: boolean
          start_date: string | null
          end_date: string | null
          week_number: number | null
          schedule_start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          teacher_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          type?: 'lecture' | 'lab' | 'practice'
          is_recurring?: boolean
          start_date?: string | null
          end_date?: string | null
          week_number?: number | null
          schedule_start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          teacher_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          room?: string | null
          type?: 'lecture' | 'lab' | 'practice'
          is_recurring?: boolean
          start_date?: string | null
          end_date?: string | null
          week_number?: number | null
          schedule_start_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule_sessions: {
        Row: {
          id: string
          schedule_id: string | null
          date: string
          start_time: string
          end_time: string
          room: string | null
          is_cancelled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id?: string | null
          date: string
          start_time: string
          end_time: string
          room?: string | null
          is_cancelled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          room?: string | null
          is_cancelled?: boolean
          created_at?: string
        }
      }
      absence_reasons: {
        Row: {
          id: string
          name: string
          code: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          is_active?: boolean
          created_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          session_id: string
          student_id: string
          status: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
          reason_id: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          student_id: string
          status?: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
          reason_id?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          student_id?: string
          status?: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
          reason_id?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          session_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action_type: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          key: string
          value: string
          type: 'string' | 'number' | 'boolean' | 'json'
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          type?: 'string' | 'number' | 'boolean' | 'json'
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          type?: 'string' | 'number' | 'boolean' | 'json'
          created_at?: string
          updated_at?: string
        }
      }
      user_invitations: {
        Row: {
          id: string
          email: string
          token: string
          status: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired'
          created_by: string | null
          approved_by: string | null
          note: string | null
          expires_at: string | null
          used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          token: string
          status?: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired'
          created_by?: string | null
          approved_by?: string | null
          note?: string | null
          expires_at?: string | null
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          token?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired'
          created_by?: string | null
          approved_by?: string | null
          note?: string | null
          expires_at?: string | null
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          status: 'pending' | 'approved' | 'rejected'
          invitation_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          full_name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          invitation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          invitation_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      approval_logs: {
        Row: {
          id: string
          invitation_id: string | null
          target_email: string
          action: 'invited' | 'approved' | 'rejected' | 'revoked'
          acted_by: string | null
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invitation_id?: string | null
          target_email: string
          action: 'invited' | 'approved' | 'rejected' | 'revoked'
          acted_by?: string | null
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string | null
          target_email?: string
          action?: 'invited' | 'approved' | 'rejected' | 'revoked'
          acted_by?: string | null
          details?: string | null
          created_at?: string
        }
      }
    }
  }
}

