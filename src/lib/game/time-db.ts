/**
 * Time Database Utilities
 * 
 * Functions for updating world time in the database.
 * Synchronized with the tick-based time system.
 */

import { db } from '@/lib/db';
import { TIME_CONSTANTS } from './constants';
import type { WorldTime } from './time-system';

/**
 * Convert GameSession time fields to WorldTime object
 */
export function sessionToTime(session: {
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  worldHour: number;
  worldMinute: number;
}): WorldTime {
  // Calculate totalMinutes from session start
  // This is an approximation - for accurate tracking we should store totalMinutes
  const totalMinutes = 
    (session.worldHour * TIME_CONSTANTS.MINUTES_PER_HOUR) + 
    session.worldMinute;
  
  return {
    year: session.worldYear,
    month: session.worldMonth,
    day: session.worldDay,
    hour: session.worldHour,
    minute: session.worldMinute,
    totalMinutes,
  };
}

/**
 * Advance world time by given ticks (minutes)
 * Updates the GameSession in database
 * 
 * @param sessionId Game session ID
 * @param ticks Number of ticks (minutes) to advance
 * @returns Updated time information
 */
export async function advanceWorldTime(
  sessionId: string,
  ticks: number
): Promise<{
  success: boolean;
  previousTime: WorldTime;
  newTime: WorldTime;
  ticksAdvanced: number;
  dayChanged: boolean;
}> {
  // Get current session
  const session = await db.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      worldYear: true,
      worldMonth: true,
      worldDay: true,
      worldHour: true,
      worldMinute: true,
      daysSinceStart: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const previousTime = sessionToTime(session);
  
  // Calculate new time
  let newMinute = session.worldMinute + ticks;
  let newHour = session.worldHour;
  let newDay = session.worldDay;
  let newMonth = session.worldMonth;
  let newYear = session.worldYear;
  let additionalDays = 0;

  // Handle minute overflow
  while (newMinute >= TIME_CONSTANTS.MINUTES_PER_HOUR) {
    newMinute -= TIME_CONSTANTS.MINUTES_PER_HOUR;
    newHour++;
  }

  // Handle hour overflow
  while (newHour >= TIME_CONSTANTS.HOURS_PER_DAY) {
    newHour -= TIME_CONSTANTS.HOURS_PER_DAY;
    newDay++;
    additionalDays++;
  }

  // Handle day overflow (simplified: 30 days per month)
  while (newDay > 30) {
    newDay -= 30;
    newMonth++;
  }

  // Handle month overflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }

  // Calculate totalMinutes for the new time
  const newTotalMinutes = previousTime.totalMinutes + ticks;

  const newTime: WorldTime = {
    year: newYear,
    month: newMonth,
    day: newDay,
    hour: newHour,
    minute: newMinute,
    totalMinutes: newTotalMinutes,
  };

  // Update session in database
  await db.gameSession.update({
    where: { id: sessionId },
    data: {
      worldYear: newYear,
      worldMonth: newMonth,
      worldDay: newDay,
      worldHour: newHour,
      worldMinute: newMinute,
      daysSinceStart: session.daysSinceStart + additionalDays,
    },
  });

  return {
    success: true,
    previousTime,
    newTime,
    ticksAdvanced: ticks,
    dayChanged: newDay !== session.worldDay || additionalDays > 0,
  };
}

/**
 * Get current world time from session
 */
export async function getWorldTime(sessionId: string): Promise<WorldTime | null> {
  const session = await db.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      worldYear: true,
      worldMonth: true,
      worldDay: true,
      worldHour: true,
      worldMinute: true,
    },
  });

  if (!session) return null;
  return sessionToTime(session);
}

/**
 * Format time for API response
 */
export function formatWorldTimeForResponse(time: WorldTime) {
  return {
    year: time.year,
    month: time.month,
    day: time.day,
    hour: time.hour,
    minute: time.minute,
    formatted: `${time.year} Э.С.М., ${time.month} месяц, ${time.day} день, ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
    season: time.month <= 6 ? 'тёплый' : 'холодный',
  };
}
