import { addDays, startOfWeek, subWeeks, format } from 'date-fns'
import { ru } from 'date-fns/locale'

export interface WeekRange {
  startDate: Date
  endDate: Date
  start: string
  end: string
  label: string
  displayRange: string
}

function toDateString(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * offset: 0 - current week, 1 - previous week, -1 - next week
 */
export function getWeekRange(offset = 0): WeekRange {
  const today = new Date()
  const baseStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const startDate =
    offset === 0 ? baseStart : offset > 0 ? subWeeks(baseStart, offset) : addDays(baseStart, Math.abs(offset) * 7)
  const endDate = addDays(startDate, 5) // Monday -> Saturday

  const label =
    offset === 0
      ? 'Эта неделя'
      : offset === 1
      ? 'Прошлая неделя'
      : offset > 1
      ? `${offset} нед. назад`
      : 'Следующая неделя'

  const displayRange = `${format(startDate, 'd MMM', { locale: ru })} – ${format(endDate, 'd MMM yyyy', {
    locale: ru,
  })}`

  return {
    startDate,
    endDate,
    start: toDateString(startDate),
    end: toDateString(endDate),
    label,
    displayRange,
  }
}

export function getWeekRangeByDate(date: Date): WeekRange {
  const startDate = startOfWeek(date, { weekStartsOn: 1 })
  const endDate = addDays(startDate, 5)
  const displayRange = `${format(startDate, 'd MMM', { locale: ru })} – ${format(endDate, 'd MMM yyyy', {
    locale: ru,
  })}`
  return {
    startDate,
    endDate,
    start: toDateString(startDate),
    end: toDateString(endDate),
    label: displayRange,
    displayRange,
  }
}

export function getCurrentWeekRange() {
  return getWeekRange(0)
}

export function getPreviousWeekRange() {
  return getWeekRange(1)
}

