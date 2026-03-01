/**
 * Time utilities for world time management
 * 
 * Used for calculating updated world time based on minutes passed
 */

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  daysSinceStart: number;
}

export interface SessionTime {
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  worldHour: number;
  worldMinute: number;
  daysSinceStart: number;
}

/**
 * Calculates updated world time based on current time and minutes to add
 * Handles overflow for minutes, hours, days, and months
 * 
 * @param session - Current session with world time
 * @param minutesToAdd - Minutes to advance
 * @returns Updated world time
 */
export function calculateUpdatedTime(
  session: SessionTime,
  minutesToAdd: number
): WorldTime {
  let newMinute = session.worldMinute + minutesToAdd;
  let newHour = session.worldHour;
  let newDay = session.worldDay;
  let newMonth = session.worldMonth;
  let newYear = session.worldYear;
  let daysSinceStart = session.daysSinceStart;

  // Handle overflow
  while (newMinute >= 60) {
    newMinute -= 60;
    newHour++;
  }

  while (newHour >= 24) {
    newHour -= 24;
    newDay++;
    daysSinceStart++;
  }

  while (newDay > 30) {
    newDay -= 30;
    newMonth++;
  }

  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }

  return {
    year: newYear,
    month: newMonth,
    day: newDay,
    hour: newHour,
    minute: newMinute,
    daysSinceStart,
  };
}

/**
 * Converts world time to a formatted string
 */
export function formatWorldTime(time: WorldTime): string {
  return `${time.year} г., ${time.month} мес., ${time.day} д., ${time.hour}:${time.minute.toString().padStart(2, "0")}`;
}

/**
 * Calculates total minutes from time components
 */
export function timeToMinutes(time: Partial<WorldTime>): number {
  const days = time.daysSinceStart || 0;
  const hours = time.hour || 0;
  const minutes = time.minute || 0;
  
  return days * 24 * 60 + hours * 60 + minutes;
}

/**
 * Calculates time advance from LLM response
 */
export function calculateTimeAdvance(
  timeAdvance: { days?: number; hours?: number; minutes?: number } | null,
  mechanicsMinutes: number
): number {
  const llmMinutes = timeAdvance
    ? (timeAdvance.days || 0) * 24 * 60 +
      (timeAdvance.hours || 0) * 60 +
      (timeAdvance.minutes || 0)
    : 0;
  
  return llmMinutes + mechanicsMinutes;
}
