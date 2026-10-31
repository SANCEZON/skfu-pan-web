import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type ReportRow = Database['public']['Tables']['reports']['Row']

export interface WeeklyAttendanceRecord {
  id: string
  status: string
  note?: string | null
  session_id: string
  student_id: string
  student_name?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  room?: string | null
  subject_name?: string | null
  teacher_name?: string | null
  reason_name?: string | null
}

export type Report = ReportRow & {
  schedule_sessions?: {
    date: string | null
    start_time: string | null
    end_time: string | null
    schedules?: {
      subject_id?: string | null
      teacher_id?: string | null
      subjects?: { name?: string | null } | null
      teachers?: { full_name?: string | null } | null
    } | null
  } | null
  date?: string | null
  start_time?: string | null
  end_time?: string | null
  subject_name?: string | null
  teacher_name?: string | null
}

const normalizeReport = (report: Report): Report => ({
  ...report,
  date: report.schedule_sessions?.date ?? report.date ?? null,
  start_time: report.schedule_sessions?.start_time ?? report.start_time ?? null,
  end_time: report.schedule_sessions?.end_time ?? report.end_time ?? null,
  subject_name:
    report.schedule_sessions?.schedules?.subjects?.name ?? report.subject_name ?? null,
  teacher_name:
    report.schedule_sessions?.schedules?.teachers?.full_name ?? report.teacher_name ?? null,
})

export async function getReports(filters?: {
  startDate?: string
  endDate?: string
  subjectId?: string
  teacherId?: string
}): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select(
      `
        *,
        schedule_sessions:schedule_sessions(
          date,
          start_time,
          end_time,
          schedules:schedules(
            subject_id,
            teacher_id,
            subjects:subjects(name),
            teachers:teachers(full_name)
          )
        )
      `
    )
    .order('created_at', { ascending: false })

  if (filters?.startDate) {
    query = query.gte('schedule_sessions.date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('schedule_sessions.date', filters.endDate)
  }
  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  let result = data || []

  if (filters?.subjectId) {
    result = result.filter(
      (report: any) => report.schedule_sessions?.schedules?.subject_id === filters.subjectId
    )
  }

  if (filters?.teacherId) {
    result = result.filter(
      (report: any) => report.schedule_sessions?.schedules?.teacher_id === filters.teacherId
    )
  }

  return result.map(normalizeReport)
}

export async function getReport(id: string): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      `
        *,
        schedule_sessions:schedule_sessions(
          date,
          start_time,
          end_time,
          schedules:schedules(
            subject_id,
            teacher_id,
            subjects:subjects(name),
            teachers:teachers(full_name)
          )
        )
      `
    )
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeReport(data as Report)
}

export async function createReport(data: { session_id: string; created_by: string }): Promise<Report> {
  const { data: inserted, error } = await supabase
    .from('reports')
    .insert(data)
    .select(
      `
        *,
        schedule_sessions:schedule_sessions(
          date,
          start_time,
          end_time,
          schedules:schedules(
            subject_id,
            teacher_id,
            subjects:subjects(name),
            teachers:teachers(full_name)
          )
        )
      `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeReport(inserted as Report)
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteAllReports(): Promise<number> {
  // First, get count of reports to delete
  const { count: initialCount, error: countError } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw new Error(`Ошибка при подсчете отчетов: ${countError.message}`)
  }

  const count = initialCount || 0

  if (count === 0) {
    return 0
  }

  // Delete all reports using RPC function for guaranteed deletion
  // This ensures all reports are physically deleted from the database
  const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_all_reports')

  if (rpcError) {
    // RPC function might not exist yet, use fallback method
    // Fallback: if RPC doesn't exist, use batch deletion
    // Delete in batches to handle large numbers of reports
    const BATCH_SIZE = 1000
    let deletedCount = 0
    let offset = 0

    while (true) {
      const { data: batch, error: fetchError } = await supabase
        .from('reports')
        .select('id')
        .range(offset, offset + BATCH_SIZE - 1)

      if (fetchError) {
        throw new Error(`Ошибка при получении отчетов: ${fetchError.message}`)
      }

      if (!batch || batch.length === 0) {
        break
      }

      const reportIds = batch.map((r) => r.id)
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .in('id', reportIds)

      if (deleteError) {
        throw new Error(`Ошибка при удалении отчетов: ${deleteError.message}`)
      }

      deletedCount += batch.length
      offset += BATCH_SIZE

      if (batch.length < BATCH_SIZE) {
        break
      }
    }

    // Verify deletion by checking count again
    const { count: remainingCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })

    if (remainingCount && remainingCount > 0) {
      throw new Error(`Не удалось удалить все отчеты. Осталось: ${remainingCount}`)
    }

    return deletedCount
  }

  // RPC function succeeded, verify deletion
  const { count: remainingCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })

  if (remainingCount && remainingCount > 0) {
    throw new Error(`Не удалось удалить все отчеты. Осталось: ${remainingCount}`)
  }

  // Return the count from RPC result or initial count
  return (rpcResult as number) || count
}

export async function getWeeklyAttendanceReport(
  startDate: string,
  endDate: string
): Promise<WeeklyAttendanceRecord[]> {
  console.log('Fetching weekly report:', { startDate, endDate })
  
  // First, check if we can access schedule_sessions at all
  const { data: allSessionsTest, error: testError } = await supabase
    .from('schedule_sessions')
    .select('id, date')
    .limit(5)
  
  if (testError) {
    console.error('Error accessing schedule_sessions (RLS issue?):', testError)
    console.error('Error details:', {
      code: testError.code,
      message: testError.message,
      details: testError.details,
      hint: testError.hint
    })
  } else {
    console.log('Can access schedule_sessions. Sample sessions:', allSessionsTest?.length || 0)
    if (allSessionsTest && allSessionsTest.length > 0) {
      console.log('Sample dates:', allSessionsTest.map((s: any) => s.date))
    }
  }
  
  // Get all sessions in the date range
  const { data: sessions, error: sessionsError } = await supabase
    .from('schedule_sessions')
    .select(
      `
        id,
        date,
        start_time,
        end_time,
        room,
        schedules:schedules(
          subjects:subjects(name),
          teachers:teachers(full_name)
        )
      `
    )
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError)
    console.error('Error details:', {
      code: sessionsError.code,
      message: sessionsError.message,
      details: sessionsError.details,
      hint: sessionsError.hint
    })
    throw new Error(sessionsError.message)
  }

  console.log('Found sessions in range:', sessions?.length || 0)
  if (sessions && sessions.length > 0) {
    console.log('Session dates:', sessions.map((s: any) => s.date))
  } else {
    console.log('No sessions found in date range. Checking if there are any sessions at all...')
    // Check if there are any sessions in the database
    const { count } = await supabase
      .from('schedule_sessions')
      .select('*', { count: 'exact', head: true })
    console.log('Total sessions in database:', count || 0)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found in date range')
    return []
  }

  // Get all attendance records for these sessions, filtering only absent students
  const sessionIds = sessions.map((s: any) => s.id)
  
  if (sessionIds.length === 0) {
    return []
  }

  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance_records')
    .select(
      `
        id,
        status,
        note,
        student_id,
        reason_id,
        session_id,
        students:students(full_name),
        absence_reasons:absence_reasons(name)
      `
    )
    .in('session_id', sessionIds)
    .neq('status', 'present') // Only get absent, late, sick, vacation records

  if (attendanceError) {
    console.error('Error fetching attendance records:', attendanceError)
    throw new Error(attendanceError.message)
  }

  console.log('Found attendance records:', attendanceRecords?.length || 0)

  // Combine sessions with attendance records
  const records: WeeklyAttendanceRecord[] = []
  const attendanceMap = new Map<string, any[]>()
  
  // Group attendance records by session_id
  attendanceRecords?.forEach((record: any) => {
    if (!attendanceMap.has(record.session_id)) {
      attendanceMap.set(record.session_id, [])
    }
    attendanceMap.get(record.session_id)!.push(record)
  })

  // Build final records
  sessions.forEach((session: any) => {
    const recordsForSession = attendanceMap.get(session.id) || []
    
    recordsForSession.forEach((record: any) => {
      records.push({
        id: record.id,
        status: record.status,
        note: record.note,
        session_id: session.id,
        student_id: record.student_id,
        student_name: record.students?.full_name || null,
        session_date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        room: session.room,
        subject_name: session.schedules?.subjects?.name || null,
        teacher_name: session.schedules?.teachers?.full_name || null,
        reason_name: record.absence_reasons?.name || null,
      })
    })
  })

  console.log('Total records returned:', records.length)
  return records
}

/**
 * Удаляет все записи посещаемости (отсутствия) за указанный период
 * Удаляет только записи со статусом отличным от 'present'
 */
export async function clearWeeklyAttendanceReport(
  startDate: string,
  endDate: string
): Promise<number> {
  // Получаем все сессии за период
  const { data: sessions, error: sessionsError } = await supabase
    .from('schedule_sessions')
    .select('id')
    .gte('date', startDate)
    .lte('date', endDate)

  if (sessionsError) {
    throw new Error(`Ошибка при получении сессий: ${sessionsError.message}`)
  }

  if (!sessions || sessions.length === 0) {
    return 0
  }

  const sessionIds = sessions.map((s) => s.id)

  // Получаем все attendance_records для этих сессий (только отсутствия)
  const { data: attendanceRecords, error: fetchError } = await supabase
    .from('attendance_records')
    .select('id')
    .in('session_id', sessionIds)
    .neq('status', 'present')

  if (fetchError) {
    throw new Error(`Ошибка при получении записей посещаемости: ${fetchError.message}`)
  }

  if (!attendanceRecords || attendanceRecords.length === 0) {
    return 0
  }

  const recordIds = attendanceRecords.map((r) => r.id)

  // Удаляем все записи посещаемости
  const { error: deleteError } = await supabase
    .from('attendance_records')
    .delete()
    .in('id', recordIds)

  if (deleteError) {
    throw new Error(`Ошибка при удалении записей посещаемости: ${deleteError.message}`)
  }

  // Также удаляем связанные отчёты
  const { data: reports, error: reportsFetchError } = await supabase
    .from('reports')
    .select('id')
    .in('session_id', sessionIds)

  if (reportsFetchError) {
    console.warn('Ошибка при получении отчётов:', reportsFetchError.message)
  } else if (reports && reports.length > 0) {
    const reportIds = reports.map((r) => r.id)
    const { error: reportsDeleteError } = await supabase
      .from('reports')
      .delete()
      .in('id', reportIds)

    if (reportsDeleteError) {
      console.warn('Ошибка при удалении отчётов:', reportsDeleteError.message)
    }
  }

  return recordIds.length
}
