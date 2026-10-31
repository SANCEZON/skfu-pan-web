import { supabase } from '../lib/supabase'

export interface AutoDeleteResult {
  reports?: number
  attendance_records?: number
  activity_logs?: number
  notes?: number
}

export interface AutoDeleteSettings {
  reports: {
    enabled: boolean
    days: number
    criteria: 'created_at' | 'session_date'
  }
  attendance_records: {
    enabled: boolean
    days: number
    criteria: 'created_at' | 'session_date'
  }
  activity_logs: {
    enabled: boolean
    days: number
  }
  notes: {
    enabled: boolean
    days: number
  }
}

/**
 * Get auto-delete settings from the database
 */
export async function getAutoDeleteSettings(): Promise<AutoDeleteSettings> {
  const { data, error } = await supabase.from('settings').select('*')

  if (error) {
    throw new Error(`Ошибка при получении настроек: ${error.message}`)
  }

  const settingsMap: Record<string, string> = {}
  data?.forEach((setting) => {
    settingsMap[setting.key] = setting.value
  })

  return {
    reports: {
      enabled: settingsMap['auto_delete_reports_enabled'] === 'true',
      days: parseInt(settingsMap['auto_delete_reports_days'] || '90', 10),
      criteria: (settingsMap['auto_delete_reports_criteria'] || 'created_at') as 'created_at' | 'session_date',
    },
    attendance_records: {
      enabled: settingsMap['auto_delete_attendance_records_enabled'] === 'true',
      days: parseInt(settingsMap['auto_delete_attendance_records_days'] || '90', 10),
      criteria: (settingsMap['auto_delete_attendance_records_criteria'] || 'created_at') as 'created_at' | 'session_date',
    },
    activity_logs: {
      enabled: settingsMap['auto_delete_activity_logs_enabled'] === 'true',
      days: parseInt(settingsMap['auto_delete_activity_logs_days'] || '30', 10),
    },
    notes: {
      enabled: settingsMap['auto_delete_notes_enabled'] === 'true',
      days: parseInt(settingsMap['auto_delete_notes_days'] || '180', 10),
    },
  }
}

/**
 * Delete old reports
 */
export async function deleteOldReports(
  days: number,
  criteria: 'created_at' | 'session_date'
): Promise<number> {
  const { data, error } = await supabase.rpc('delete_old_reports', {
    p_days: days,
    p_criteria: criteria,
  })

  if (error) {
    throw new Error(`Ошибка при удалении отчётов: ${error.message}`)
  }

  return data || 0
}

/**
 * Delete old attendance records
 */
export async function deleteOldAttendanceRecords(
  days: number,
  criteria: 'created_at' | 'session_date'
): Promise<number> {
  const { data, error } = await supabase.rpc('delete_old_attendance_records', {
    p_days: days,
    p_criteria: criteria,
  })

  if (error) {
    throw new Error(`Ошибка при удалении записей посещаемости: ${error.message}`)
  }

  return data || 0
}

/**
 * Delete old activity logs
 */
export async function deleteOldActivityLogs(days: number): Promise<number> {
  const { data, error } = await supabase.rpc('delete_old_activity_logs', {
    p_days: days,
  })

  if (error) {
    throw new Error(`Ошибка при удалении логов активности: ${error.message}`)
  }

  return data || 0
}

/**
 * Delete old notes
 */
export async function deleteOldNotes(days: number): Promise<number> {
  const { data, error } = await supabase.rpc('delete_old_notes', {
    p_days: days,
  })

  if (error) {
    throw new Error(`Ошибка при удалении заметок: ${error.message}`)
  }

  return data || 0
}

/**
 * Run auto-delete based on current settings
 */
export async function runAutoDelete(): Promise<AutoDeleteResult> {
  const settings = await getAutoDeleteSettings()
  const result: AutoDeleteResult = {}

  // Delete old reports
  if (settings.reports.enabled) {
    try {
      result.reports = await deleteOldReports(settings.reports.days, settings.reports.criteria)
    } catch (error) {
      console.error('Error deleting reports:', error)
      result.reports = 0
    }
  }

  // Delete old attendance records
  if (settings.attendance_records.enabled) {
    try {
      result.attendance_records = await deleteOldAttendanceRecords(
        settings.attendance_records.days,
        settings.attendance_records.criteria
      )
    } catch (error) {
      console.error('Error deleting attendance records:', error)
      result.attendance_records = 0
    }
  }

  // Delete old activity logs
  if (settings.activity_logs.enabled) {
    try {
      result.activity_logs = await deleteOldActivityLogs(settings.activity_logs.days)
    } catch (error) {
      console.error('Error deleting activity logs:', error)
      result.activity_logs = 0
    }
  }

  // Delete old notes
  if (settings.notes.enabled) {
    try {
      result.notes = await deleteOldNotes(settings.notes.days)
    } catch (error) {
      console.error('Error deleting notes:', error)
      result.notes = 0
    }
  }

  // Update last run timestamp
  await supabase
    .from('settings')
    .upsert(
      {
        key: 'auto_delete_last_run',
        value: new Date().toISOString(),
        type: 'string',
      },
      { onConflict: 'key' }
    )

  return result
}


