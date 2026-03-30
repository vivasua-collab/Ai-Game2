/**
 * Time utilities for world time management
 * 
 * Used for calculating updated world time based on minutes passed
 * 
 * ВАЖНО: Время работает через систему тиков (1 тик = 1 минута)
 * Боевые техники используют реальное время для зарядки
 */

// ==================== ТИПЫ ====================

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  daysSinceStart: number;
}

/**
 * Интерфейс сессии с мировым временем
 * Соответствует полям GameSession из Prisma
 */
export interface SessionTime {
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  worldHour: number;
  worldMinute: number;
  daysSinceStart: number;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Вычисляет обновлённое время на основе текущего и смещения в минутах
 * Используется для синхронизации времени между сервером и клиентом
 * 
 * Правила времени мира:
 * - 1 час = 60 минут
 * - 1 день = 24 часа
 * - 1 месяц = 30 дней
 * - 1 год = 12 месяцев
 * 
 * @param session - Текущая сессия с мировым временем
 * @param minutesToAdd - Минуты для добавления (тика)
 * @returns Обновлённое мировое время
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

  // Обрабатываем переполнение минут
  while (newMinute >= 60) {
    newMinute -= 60;
    newHour++;
  }

  // Обрабатываем переполнение часов
  while (newHour >= 24) {
    newHour -= 24;
    newDay++;
    daysSinceStart++;
  }

  // Обрабатываем переполнение дней
  while (newDay > 30) {
    newDay -= 30;
    newMonth++;
  }

  // Обрабатываем переполнение месяцев
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
 * Calculates updated world time with detailed tracking
 * Used for time-intensive operations like travel, cultivation
 * 
 * @deprecated Используйте calculateUpdatedTime
 */
export function calculateUpdatedTimeDetailed(
  session: SessionTime,
  minutesToAdd: number
): WorldTime & { dayChanged: boolean; monthChanged: boolean; yearChanged: boolean } {
  const result = calculateUpdatedTime(session, minutesToAdd);
  
  return {
    ...result,
    dayChanged: result.day !== session.worldDay,
    monthChanged: result.month !== session.worldMonth,
    yearChanged: result.year !== session.worldYear,
  };
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Converts world time to a formatted string
 */
export function formatWorldTime(time: WorldTime): string {
  return `${time.year} г., ${time.month} мес., ${time.day} д., ${time.hour}:${time.minute.toString().padStart(2, "0")}`;
}

/**
 * Formats world time in Russian style
 */
export function formatWorldTimeRu(time: WorldTime): string {
  return `${time.year} Э.С.М., ${time.month} месяц, ${time.day} день, ${time.hour}:${time.minute.toString().padStart(2, "0")}`;
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

// ==================== ВРЕМЯ СУТОК ====================

/**
 * Get time of day from hour
 */
export function getTimeOfDay(hour: number): 'night' | 'dawn' | 'morning' | 'day' | 'evening' | 'dusk' {
  if (hour >= 0 && hour < 5) return 'night';
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'dusk';
}

/**
 * Get time of day name in Russian
 */
export function getTimeOfDayName(hour: number): string {
  const names: Record<string, string> = {
    night: 'Ночь',
    dawn: 'Рассвет',
    morning: 'Утро',
    day: 'День',
    evening: 'Вечер',
    dusk: 'Сумерки',
  };
  return names[getTimeOfDay(hour)];
}

/**
 * Get season from month
 */
export function getSeason(month: number): 'warm' | 'cold' {
  return month <= 6 ? 'warm' : 'cold';
}

/**
 * Get season name in Russian
 */
export function getSeasonName(month: number): string {
  return month <= 6 ? 'тёплый' : 'холодный';
}
