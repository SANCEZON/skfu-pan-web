import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']
type AttendanceInsert = Database['public']['Tables']['attendance_records']['Insert']
type AbsenceReasonRow = Database['public']['Tables']['absence_reasons']['Row']

export type AttendanceRecord = AttendanceRow & {
  student_name?: string | null
  reason_name?: string | null
  reason_code?: string | null
}

export type AttendanceRecordInsert = AttendanceInsert
export type AbsenceReason = AbsenceReasonRow

export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(
      `
        *,
        students:students(full_name),
        absence_reasons(name, code)
      `
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    data?.map((record: any) => ({
      ...record,
      student_name: record.students?.full_name || null,
      reason_name: record.absence_reasons?.name || null,
      reason_code: record.absence_reasons?.code || null,
    })) || []
  )
}

export async function upsertAttendanceRecord(record: AttendanceRecordInsert): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(record, { onConflict: 'session_id,student_id' })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function bulkUpsertAttendanceRecords(records: AttendanceRecordInsert[]): Promise<AttendanceRecord[]> {
  if (!records.length) return []

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'session_id,student_id' })
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getAbsenceReasons(): Promise<AbsenceReason[]> {
  const { data, error } = await supabase
    .from('absence_reasons')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Delete all absence records (non-present) for a specific student
 * This will delete all records where status is not 'present'
 */
export async function deleteStudentAbsences(studentId: string): Promise<number> {
  // First, get count of absence records
  const { count: initialCount, error: countError } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('status', ['absent', 'late', 'vacation', 'sick'])

  if (countError) {
    throw new Error(`Ошибка при подсчете пропусков: ${countError.message}`)
  }

  const count = initialCount || 0

  if (count === 0) {
    return 0
  }

  // Delete all absence records for this student
  const { error: deleteError } = await supabase
    .from('attendance_records')
    .delete()
    .eq('student_id', studentId)
    .in('status', ['absent', 'late', 'vacation', 'sick'])

  if (deleteError) {
    throw new Error(`Ошибка при удалении пропусков: ${deleteError.message}`)
  }

  // Verify deletion
  const { count: remainingCount } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('status', ['absent', 'late', 'vacation', 'sick'])

  if (remainingCount && remainingCount > 0) {
    throw new Error(`Не удалось удалить все пропуски. Осталось: ${remainingCount}`)
  }

  return count
}
