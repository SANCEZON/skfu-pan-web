import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database.types'

export type ActivityAction =
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'attendance_updated'

export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

interface LogEntry {
  userId: string
  action: ActivityAction
  entityType: string
  entityId?: string | null
  details?: Json
}

export async function logActivity(entry: LogEntry): Promise<void> {
  if (!entry.userId) return

  const { error } = await supabase.from('activity_logs').insert({
    user_id: entry.userId,
    action_type: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId || null,
    details: entry.details || null,
  })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}
