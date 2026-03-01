/**
 * Time System - Система глобального времени (тиков)
 * 
 * 1 тик = 1 минута игрового времени
 * Время течёт только при активных действиях
 * Просмотр инвентаря, статуса ставит время на паузу
 */

import { TIME_CONSTANTS, ACTION_TICK_COSTS, PAUSE_ACTIONS } from './constants';

// ==================== ТИПЫ ====================

export interface WorldTime {
  year: number;
  month: number;      // 1-12
  day: number;        // 1-30
  hour: number;       // 0-23
  minute: number;     // 0-59
  totalMinutes: number; // Общее количество минут с начала игры
}

export interface TimeUpdateResult {
  time: WorldTime;
  ticksPassed: number;
  dayChanged: boolean;
  monthChanged: boolean;
  yearChanged: boolean;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Создать начальное время мира
 */
export function createInitialTime(): WorldTime {
  return {
    year: 1864,
    month: 1,
    day: 1,
    hour: 7,      // 7:00 утра
    minute: 0,
    totalMinutes: 0,
  };
}

/**
 * Добавить тики к времени
 * @param time Текущее время
 * @param ticks Количество тиков (минут)
 */
export function addTicks(time: WorldTime, ticks: number): TimeUpdateResult {
  const newTotalMinutes = time.totalMinutes + ticks;
  
  // Расчёт новых значений
  const totalDays = Math.floor(newTotalMinutes / TIME_CONSTANTS.MINUTES_PER_DAY);
  const remainingMinutes = newTotalMinutes % TIME_CONSTANTS.MINUTES_PER_DAY;
  
  const hour = Math.floor(remainingMinutes / TIME_CONSTANTS.MINUTES_PER_HOUR);
  const minute = remainingMinutes % TIME_CONSTANTS.MINUTES_PER_HOUR;
  
  // Расчёт даты (упрощённый: 30 дней в месяце)
  const year = time.year + Math.floor((time.month - 1 + totalDays) / 12);
  const month = ((time.month - 1 + totalDays) % 12) + 1;
  const day = (time.day + totalDays - 1) % 30 + 1;
  
  const newTime: WorldTime = {
    year,
    month,
    day,
    hour,
    minute,
    totalMinutes: newTotalMinutes,
  };
  
  return {
    time: newTime,
    ticksPassed: ticks,
    dayChanged: day !== time.day,
    monthChanged: month !== time.month,
    yearChanged: year !== time.year,
  };
}

/**
 * Добавить минуты к времени
 */
export function addMinutes(time: WorldTime, minutes: number): TimeUpdateResult {
  return addTicks(time, minutes);
}

/**
 * Добавить часы к времени
 */
export function addHours(time: WorldTime, hours: number): TimeUpdateResult {
  return addTicks(time, hours * TIME_CONSTANTS.MINUTES_PER_HOUR);
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Форматировать время для отображения
 */
export function formatTime(time: WorldTime): string {
  const hourStr = time.hour.toString().padStart(2, '0');
  const minStr = time.minute.toString().padStart(2, '0');
  return `${hourStr}:${minStr}`;
}

/**
 * Форматировать дату для отображения
 */
export function formatDate(time: WorldTime): string {
  return `${time.year} Э.С.М., ${time.month} месяц, ${time.day} день`;
}

/**
 * Форматировать полное время
 */
export function formatDateTime(time: WorldTime): string {
  return `${formatDate(time)}, ${formatTime(time)}`;
}

/**
 * Получить время суток
 */
export function getTimeOfDay(time: WorldTime): 'night' | 'dawn' | 'morning' | 'day' | 'evening' | 'dusk' {
  const hour = time.hour;
  
  if (hour >= 0 && hour < 5) return 'night';
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'dusk';
}

/**
 * Получить название времени суток
 */
export function getTimeOfDayName(time: WorldTime): string {
  const names: Record<string, string> = {
    night: 'Ночь',
    dawn: 'Рассвет',
    morning: 'Утро',
    day: 'День',
    evening: 'Вечер',
    dusk: 'Сумерки',
  };
  return names[getTimeOfDay(time)];
}

/**
 * Получить сезон
 */
export function getSeason(time: WorldTime): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (time.month >= 1 && time.month <= 3) return 'spring';
  if (time.month >= 4 && time.month <= 6) return 'summer';
  if (time.month >= 7 && time.month <= 9) return 'autumn';
  return 'winter';
}

/**
 * Получить название сезона
 */
export function getSeasonName(time: WorldTime): string {
  const names: Record<string, string> = {
    spring: 'Весна',
    summer: 'Лето',
    autumn: 'Осень',
    winter: 'Зима',
  };
  return names[getSeason(time)];
}

// ==================== ДЕЙСТВИЯ ====================

/**
 * Получить стоимость действия в тиках
 */
export function getActionTickCost(action: string): number {
  return ACTION_TICK_COSTS[action] ?? TIME_CONSTANTS.MIN_ACTION_TICKS;
}

/**
 * Проверить, ставит ли действие на паузу
 */
export function isPauseAction(action: string): boolean {
  return PAUSE_ACTIONS.includes(action as typeof PAUSE_ACTIONS[number]);
}

// ==================== КОНВЕРТАЦИЯ ====================

/**
 * Конвертировать минуты в тики (1:1)
 */
export function minutesToTicks(minutes: number): number {
  return minutes;
}

/**
 * Конвертировать часы в тики
 */
export function hoursToTicks(hours: number): number {
  return hours * TIME_CONSTANTS.MINUTES_PER_HOUR;
}

/**
 * Конвертировать тики в часы и минуты
 */
export function ticksToHoursMinutes(ticks: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(ticks / TIME_CONSTANTS.MINUTES_PER_HOUR),
    minutes: ticks % TIME_CONSTANTS.MINUTES_PER_HOUR,
  };
}

/**
 * Форматировать длительность в тиках для отображения
 */
export function formatDuration(ticks: number): string {
  const { hours, minutes } = ticksToHoursMinutes(ticks);
  
  if (hours === 0) {
    return `${minutes} мин`;
  }
  if (minutes === 0) {
    return `${hours} ч`;
  }
  return `${hours} ч ${minutes} мин`;
}

// ==================== МЕДИТАЦИЯ ====================

/**
 * Валидация времени медитации
 * @param ticks Время в тиках
 */
export function validateMeditationTime(ticks: number): { valid: boolean; error?: string } {
  if (ticks < TIME_CONSTANTS.MIN_MEDITATION_TICKS) {
    return { 
      valid: false, 
      error: `Минимальное время медитации: ${TIME_CONSTANTS.MIN_MEDITATION_TICKS} минут` 
    };
  }
  if (ticks > TIME_CONSTANTS.MAX_MEDITATION_TICKS) {
    return { 
      valid: false, 
      error: `Максимальное время медитации: ${TIME_CONSTANTS.MAX_MEDITATION_TICKS / 60} часов` 
    };
  }
  if (ticks % TIME_CONSTANTS.MEDITATION_TICK_STEP !== 0) {
    return { 
      valid: false, 
      error: `Время медитации должно быть кратно ${TIME_CONSTANTS.MEDITATION_TICK_STEP} минутам` 
    };
  }
  return { valid: true };
}

/**
 * Округлить время медитации до дискретного значения (30 минут)
 */
export function roundMeditationTime(ticks: number): number {
  const rounded = Math.round(ticks / TIME_CONSTANTS.MEDITATION_TICK_STEP) * TIME_CONSTANTS.MEDITATION_TICK_STEP;
  return Math.max(TIME_CONSTANTS.MIN_MEDITATION_TICKS, 
         Math.min(TIME_CONSTANTS.MAX_MEDITATION_TICKS, rounded));
}
