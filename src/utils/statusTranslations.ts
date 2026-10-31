export type AttendanceStatus = 'present' | 'absent' | 'late' | 'vacation' | 'sick'

export function translateStatus(status: AttendanceStatus | string): string {
  const translations: Record<string, string> = {
    present: 'Присутствует',
    absent: 'Отсутствует',
    late: 'Опоздание',
    vacation: 'Отпуск',
    sick: 'Болезнь',
  }
  
  return translations[status] || status
}

