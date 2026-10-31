import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type StudentRow = Database['public']['Tables']['students']['Row']
type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']

export type PublicStudent = StudentRow

export type PublicAbsenceRecord = AttendanceRow & {
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  room?: string | null
  subject_name?: string | null
  teacher_name?: string | null
  reason_name?: string | null
  reason_code?: string | null
}

/**
 * Search students by name (only active students)
 */
export async function searchStudentsByName(query: string): Promise<PublicStudent[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  const searchTerm = `%${query.trim()}%`

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('status', 'active')
    .ilike('full_name', searchTerm)
    .order('full_name', { ascending: true })
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Get all absence records for a student with full session and subject information
 */
export async function getStudentAbsences(studentId: string): Promise<PublicAbsenceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(
      `
        *,
        schedule_sessions:schedule_sessions(
          date,
          start_time,
          end_time,
          room,
          schedules:schedules(
            subjects:subjects(name),
            teachers:teachers(full_name)
          )
        ),
        absence_reasons(name, code)
      `
    )
    .eq('student_id', studentId)
    .in('status', ['absent', 'late', 'vacation', 'sick'])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  // Normalize the nested data structure
  return (
    data?.map((record: any) => ({
      ...record,
      session_date: record.schedule_sessions?.date || null,
      start_time: record.schedule_sessions?.start_time || null,
      end_time: record.schedule_sessions?.end_time || null,
      room: record.schedule_sessions?.room || null,
      subject_name: record.schedule_sessions?.schedules?.subjects?.name || null,
      teacher_name: record.schedule_sessions?.schedules?.teachers?.full_name || null,
      reason_name: record.absence_reasons?.name || null,
      reason_code: record.absence_reasons?.code || null,
    })) || []
  )
}

export interface LeaderboardEntry {
  student_id: string
  student_name: string
  group_id: string | null
  absences_count: number
}

/**
 * Get leaderboard of students by absences
 * @param mode - 'most' for most absences, 'least' for least absences (best attendance)
 * @param limit - Maximum number of entries to return (default: 50)
 */
export async function getLeaderboard(
  mode: 'most' | 'least' = 'most',
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  // Get all active students first
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, full_name, group_id')
    .eq('status', 'active')

  if (studentsError) {
    throw new Error(`Ошибка при получении студентов: ${studentsError.message}`)
  }

  if (!students || students.length === 0) {
    return []
  }

  const studentIds = students.map((s) => s.id)

  // Get all absence records for active students
  const { data: absences, error: absencesError } = await supabase
    .from('attendance_records')
    .select('student_id')
    .in('student_id', studentIds)
    .in('status', ['absent', 'late', 'vacation', 'sick'])

  if (absencesError) {
    throw new Error(`Ошибка при получении записей посещаемости: ${absencesError.message}`)
  }

  // Count absences per student
  const absencesCount = new Map<string, number>()
  students.forEach((student) => {
    absencesCount.set(student.id, 0)
  })

  absences?.forEach((absence) => {
    const current = absencesCount.get(absence.student_id) || 0
    absencesCount.set(absence.student_id, current + 1)
  })

  // Create leaderboard entries
  const leaderboard: LeaderboardEntry[] = students.map((student) => ({
    student_id: student.id,
    student_name: student.full_name,
    group_id: student.group_id,
    absences_count: absencesCount.get(student.id) || 0,
  }))

  // Sort based on mode
  if (mode === 'most') {
    leaderboard.sort((a, b) => b.absences_count - a.absences_count)
  } else {
    leaderboard.sort((a, b) => a.absences_count - b.absences_count)
  }

  // Return limited results
  return leaderboard.slice(0, limit)
}

