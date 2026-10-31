/**
 * Utility functions for working with 2-week schedule cycles
 */

/**
 * Calculates which week (1 or 2) we are currently in based on the cycle start date
 * @param startDate - The date when the schedule cycle started
 * @param currentDate - The current date (defaults to today)
 * @returns 1 or 2 indicating the current week in the cycle
 */
export function calculateCurrentWeek(
  startDate: Date,
  currentDate: Date = new Date()
): 1 | 2 {
  // Calculate the difference in days
  const diffTime = currentDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Calculate which week we're in (0-indexed, then add 1)
  // Week 1: days 0-6, 14-20, 28-34, etc.
  // Week 2: days 7-13, 21-27, 35-41, etc.
  const weeksSinceStart = Math.floor(diffDays / 7)
  const weekNumber = (weeksSinceStart % 2) + 1

  return weekNumber as 1 | 2
}

/**
 * Gets the date of the next occurrence of a specific week
 * @param startDate - The date when the schedule cycle started
 * @param weekNumber - The week number (1 or 2) we want to find
 * @param currentDate - The current date (defaults to today)
 * @returns The date when the specified week will next occur
 */
export function getNextWeekDate(
  startDate: Date,
  weekNumber: 1 | 2,
  currentDate: Date = new Date()
): Date {
  const currentWeek = calculateCurrentWeek(startDate, currentDate)
  const diffTime = currentDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weeksSinceStart = Math.floor(diffDays / 7)

  let targetWeek = weeksSinceStart
  if (currentWeek !== weekNumber) {
    // If we're not in the target week, go to next occurrence
    targetWeek = weeksSinceStart + 1
  } else {
    // If we're already in the target week, stay in it
    targetWeek = weeksSinceStart
  }

  // Calculate the date
  const targetDate = new Date(startDate)
  targetDate.setDate(targetDate.getDate() + targetWeek * 7)

  return targetDate
}

/**
 * Gets all dates for a specific week within a date range
 * @param startDate - The date when the schedule cycle started
 * @param weekNumber - The week number (1 or 2)
 * @param rangeStart - Start of the date range
 * @param rangeEnd - End of the date range
 * @returns Array of dates when the specified week occurs
 */
export function getWeekDatesInRange(
  startDate: Date,
  weekNumber: 1 | 2,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = []
  // let currentDate = new Date(rangeStart) // Не используется

  // Calculate which week the start date is in
  const startWeek = calculateCurrentWeek(startDate, rangeStart)
  
  // Find the first occurrence of the target week
  let firstWeekDate = new Date(rangeStart)
  if (startWeek !== weekNumber) {
    // Move to the next occurrence of target week
    const daysToAdd = weekNumber === 1 ? (startWeek === 2 ? 7 : 0) : (startWeek === 1 ? 7 : 0)
    firstWeekDate.setDate(firstWeekDate.getDate() + daysToAdd)
  }

  // Generate dates for all occurrences of the target week in the range
  while (firstWeekDate <= rangeEnd) {
    // Get Monday of this week
    const weekStart = new Date(firstWeekDate)
    const dayOfWeek = weekStart.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday = 1
    weekStart.setDate(weekStart.getDate() + diff)

    // Add all 7 days of this week that fall within the range
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      if (date >= rangeStart && date <= rangeEnd) {
        dates.push(date)
      }
    }

    // Move to next occurrence (2 weeks later)
    firstWeekDate.setDate(firstWeekDate.getDate() + 14)
  }

  return dates
}

