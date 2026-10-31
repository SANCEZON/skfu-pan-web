import { format, addDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'
import { calculateCurrentWeek } from '../utils/scheduleCycle'

type ScheduleRow = Database['public']['Tables']['schedules']['Row']
type ScheduleSessionRow = Database['public']['Tables']['schedule_sessions']['Row']

export type Schedule = ScheduleRow & {
  subjects?: Database['public']['Tables']['subjects']['Row']
  teachers?: Database['public']['Tables']['teachers']['Row']
}
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
export type ScheduleUpdate = Database['public']['Tables']['schedules']['Update']

export type ScheduleSession = ScheduleSessionRow & {
  schedules?: Schedule
  subject_name?: string | null
  teacher_name?: string | null
  subject_id?: string | null
  teacher_id?: string | null
}
export type ScheduleSessionInsert = Database['public']['Tables']['schedule_sessions']['Insert']

export async function getSchedules(weekNumber?: 1 | 2): Promise<Schedule[]> {
  let query = supabase
    .from('schedules')
    .select(
      `
        *,
        subjects:subjects(*),
        teachers:teachers(*)
      `
    )
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (weekNumber) {
    query = query.eq('week_number', weekNumber)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (
    data?.map((session: any) => ({
      ...session,
      subject_name: session.schedules?.subjects?.name || null,
      teacher_name: session.schedules?.teachers?.full_name || null,
      subject_id: session.schedules?.subject_id || null,
      teacher_id: session.schedules?.teacher_id || null,
    })) || []
  )
}

export const getSchedulesByWeek = getSchedules

export async function createSchedule(schedule: ScheduleInsert): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select(
      `
        *,
        subjects:subjects(*),
        teachers:teachers(*)
      `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    ...data,
    subject_name: data.schedules?.subjects?.name || null,
    teacher_name: data.schedules?.teachers?.full_name || null,
    subject_id: data.schedules?.subject_id || null,
    teacher_id: data.schedules?.teacher_id || null,
  }
}

export async function getScheduleSessions(startDate: string, endDate: string): Promise<ScheduleSession[]> {
  const { data, error } = await supabase
    .from('schedule_sessions')
    .select(
      `
        *,
        schedules:schedules(
          *,
          subjects:subjects(*),
          teachers:teachers(*)
        )
      `
    )
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  // Normalize data: extract subject_name and teacher_name from nested objects
  return (
    data?.map((session: any) => ({
      ...session,
      subject_name: session.schedules?.subjects?.name || null,
      teacher_name: session.schedules?.teachers?.full_name || null,
      subject_id: session.schedules?.subject_id || null,
      teacher_id: session.schedules?.teacher_id || null,
    })) || []
  )
}

export async function createScheduleSession(session: ScheduleSessionInsert): Promise<ScheduleSession> {
  const { data, error } = await supabase
    .from('schedule_sessions')
    .insert(session)
    .select(
      `
        *,
        schedules:schedules(
          *,
          subjects:subjects(*),
          teachers:teachers(*)
        )
      `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function generateSessionsForSchedule(
  scheduleId: string,
  startDate: Date,
  endDate: Date
): Promise<ScheduleSession[]> {
  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (error || !schedule) {
    throw new Error(error?.message || 'Расписание не найдено')
  }

  const sessions: ScheduleSessionInsert[] = []
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek === schedule.day_of_week) {
      if (schedule.week_number && schedule.schedule_start_date) {
        const weekNumber = calculateCurrentWeek(new Date(schedule.schedule_start_date), currentDate)
        if (weekNumber !== schedule.week_number) {
          currentDate = addDays(currentDate, 1)
          continue
        }
      }

      sessions.push({
        schedule_id: schedule.id,
        date: format(currentDate, 'yyyy-MM-dd'),
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        room: schedule.room,
        is_cancelled: false,
      })
    }
    currentDate = addDays(currentDate, 1)
  }

  if (!sessions.length) {
    return []
  }

  const insertResult = await supabase
    .from('schedule_sessions')
    .insert(sessions)
    .select(
      `
        *,
        schedules:schedules(
          *,
          subjects:subjects(*),
          teachers:teachers(*)
        )
      `
    )

  if (insertResult.error) {
    throw new Error(insertResult.error.message)
  }

  return (
    insertResult.data?.map((session: any) => ({
      ...session,
      subject_name: session.schedules?.subjects?.name || null,
      teacher_name: session.schedules?.teachers?.full_name || null,
      subject_id: session.schedules?.subject_id || null,
      teacher_id: session.schedules?.teacher_id || null,
    })) || []
  )
}

export async function updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select(
      `
        *,
        subjects:subjects(*),
        teachers:teachers(*)
      `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export function getCurrentWeekNumber(scheduleStartDate: Date | string | null): 1 | 2 {
  if (!scheduleStartDate) return 1
  const startDate = typeof scheduleStartDate === 'string' ? new Date(scheduleStartDate) : scheduleStartDate
  return calculateCurrentWeek(startDate)
}

/**
 * Delete all schedule sessions
 * This will also delete related attendance_records and reports due to CASCADE
 */
export async function deleteAllScheduleSessions(): Promise<number> {
  // First, get count of sessions
  const { count: initialCount, error: countError } = await supabase
    .from('schedule_sessions')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw new Error(`Ошибка при подсчете сессий: ${countError.message}`)
  }

  const count = initialCount || 0

  if (count === 0) {
    return 0
  }

  // Get all session IDs
  const { data: sessions, error: fetchError } = await supabase
    .from('schedule_sessions')
    .select('id')

  if (fetchError) {
    throw new Error(`Ошибка при получении сессий: ${fetchError.message}`)
  }

  if (!sessions || sessions.length === 0) {
    return 0
  }

  const sessionIds = sessions.map((s) => s.id)

  // Delete all sessions in batches
  const BATCH_SIZE = 1000
  let deletedCount = 0
  let offset = 0

  while (offset < sessionIds.length) {
    const batch = sessionIds.slice(offset, offset + BATCH_SIZE)
    const { error: deleteError } = await supabase
      .from('schedule_sessions')
      .delete()
      .in('id', batch)

    if (deleteError) {
      throw new Error(`Ошибка при удалении сессий: ${deleteError.message}`)
    }

    deletedCount += batch.length
    offset += BATCH_SIZE
  }

  // Verify deletion
  const { count: remainingCount } = await supabase
    .from('schedule_sessions')
    .select('*', { count: 'exact', head: true })

  if (remainingCount && remainingCount > 0) {
    throw new Error(`Не удалось удалить все сессии. Осталось: ${remainingCount}`)
  }

  return deletedCount
}
