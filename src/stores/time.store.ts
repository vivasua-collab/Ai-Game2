/**
 * Time Store
 *
 * Zustand store for tick timer system.
 * Single source of truth for game time state.
 *
 * FUNDAMENTAL RULE:
 *   1 TICK = 1 SECOND REAL TIME (FIXED, NEVER CHANGES)
 *   Variable: HOW MUCH GAME TIME passes per tick
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

// ==================== TYPES ====================

/** Tick Speed Identifier */
export type TickSpeedId =
  | 'superSuperSlow'
  | 'slow'
  | 'normal'
  | 'fast'
  | 'ultra';

/** Season type */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Time of day type */
export type TimeOfDay = 'night' | 'dawn' | 'morning' | 'day' | 'evening' | 'dusk';

/** Game Time Structure - Extended with year/month/season */
export interface GameTime {
  totalMinutes: number;    // Total game minutes since start
  year: number;            // Current year (starts at 1864)
  month: number;           // Current month (1-12)
  day: number;             // Current day (1-based)
  hour: number;            // Current hour (0-23)
  minute: number;          // Current minute (0-59)
  season: Season;          // Current season
}

/** Tick Speed Configuration */
export interface TickSpeedConfig {
  id: TickSpeedId;
  label: string;
  minutesPerTick: number;  // Game minutes per tick (can be fractional)
  description: string;
}

// ==================== SPEED CONFIGURATION ====================

/**
 * TICK SPEEDS
 *
 * 1 TICK = 1 SECOND REAL TIME (FIXED)
 * Variable: minutesPerTick = game minutes per tick
 */
export const TICK_SPEEDS: Record<TickSpeedId, TickSpeedConfig> = {
  superSuperSlow: {
    id: 'superSuperSlow',
    label: 'Бой',
    minutesPerTick: 0.25, // 15 seconds = 0.25 minutes
    description: '1 тик = 15 сек игрового времени (боевой режим)',
  },
  slow: {
    id: 'slow',
    label: 'Медленный',
    minutesPerTick: 0.5, // 30 seconds = 0.5 minutes (бывший "Точный")
    description: '1 тик = 30 сек игрового времени',
  },
  normal: {
    id: 'normal',
    label: 'Обычный',
    minutesPerTick: 1,
    description: '1 тик = 1 минута игрового времени',
  },
  fast: {
    id: 'fast',
    label: 'Быстрый',
    minutesPerTick: 5,
    description: '1 тик = 5 минут игрового времени',
  },
  ultra: {
    id: 'ultra',
    label: 'Медитация',
    minutesPerTick: 60, // 1 hour
    description: '1 тик = 1 час игрового времени (только для медитации)',
  },
};

// ==================== INITIAL STATE ====================

interface TimeStoreState {
  // State
  isPaused: boolean;
  isRunning: boolean;
  tickCount: number;
  speed: TickSpeedId;
  gameTime: GameTime;

  // Speed config (derived from speed)
  speeds: typeof TICK_SPEEDS;

  // Actions
  togglePause: () => void;
  setSpeed: (speed: TickSpeedId) => void;

  // Internal methods (used by tick-timer)
  _setRunning: (running: boolean) => void;
  _setPaused: (paused: boolean) => void;
  _incrementTick: () => void;
  _calculateGameTime: (totalMinutes: number) => Omit<GameTime, 'totalMinutes'>;
  _reset: () => void;
  
  // Sync from server (call when game loads)
  _initFromServer: (serverTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  }) => void;
}

const MINUTES_PER_DAY = 24 * 60; // 1440 minutes
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const START_YEAR = 1864; // Э.С.М. (Эра Свободного Мира)

const initialGameTime: GameTime = {
  totalMinutes: 360, // 6:00 AM on day 1
  year: START_YEAR,
  month: 1,
  day: 1,
  hour: 6,
  minute: 0,
  season: 'spring',
};

const initialState = {
  isPaused: true,        // Game starts paused
  isRunning: false,      // Timer not running
  tickCount: 0,
  speed: 'normal' as TickSpeedId,
  gameTime: initialGameTime,
  speeds: TICK_SPEEDS,
};

// ==================== STORE ====================

export const useTimeStore = create<TimeStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // === PUBLIC ACTIONS ===

      togglePause: () => {
        const { isPaused } = get();
        set({ isPaused: !isPaused });
        console.log(`[TimeStore] Pause toggled: ${!isPaused}`);
      },

      setSpeed: (speed: TickSpeedId) => {
        if (!TICK_SPEEDS[speed]) {
          console.error(`[TimeStore] Invalid speed: ${speed}`);
          return;
        }
        set({ speed });
        console.log(`[TimeStore] Speed changed to: ${speed} (${TICK_SPEEDS[speed].description})`);
      },

      // === INTERNAL METHODS (for tick-timer) ===

      _setRunning: (running: boolean) => {
        set({ isRunning: running });
      },

      _setPaused: (paused: boolean) => {
        set({ isPaused: paused });
      },

      _incrementTick: () => {
        const state = get();
        const speedConfig = state.speeds[state.speed];
        const minutesPerTick = speedConfig.minutesPerTick;

        const newTotalMinutes = state.gameTime.totalMinutes + minutesPerTick;
        const newGameTime = get()._calculateGameTime(newTotalMinutes);

        set({
          tickCount: state.tickCount + 1,
          gameTime: {
            ...newGameTime,
            totalMinutes: newTotalMinutes,
          },
        });
      },

      _calculateGameTime: (totalMinutes: number) => {
        // Total days since start
        const totalDays = Math.floor(totalMinutes / MINUTES_PER_DAY);
        
        // Year calculation
        const yearsPassed = Math.floor(totalDays / (DAYS_PER_MONTH * MONTHS_PER_YEAR));
        const year = START_YEAR + yearsPassed;
        
        // Days into current year
        const daysIntoYear = totalDays % (DAYS_PER_MONTH * MONTHS_PER_YEAR);
        
        // Month (1-12)
        const month = Math.floor(daysIntoYear / DAYS_PER_MONTH) + 1;
        
        // Day in month (1-30)
        const day = (daysIntoYear % DAYS_PER_MONTH) + 1;
        
        // Time within day
        const minutesInDay = totalMinutes % MINUTES_PER_DAY;
        const hour = Math.floor(minutesInDay / 60);
        const minute = Math.floor(minutesInDay % 60);
        
        // Season based on month
        const season: Season = 
          month <= 3 ? 'spring' : 
          month <= 6 ? 'summer' : 
          month <= 9 ? 'autumn' : 'winter';

        return { year, month, day, hour, minute, season };
      },

      _reset: () => {
        set(initialState);
        console.log('[TimeStore] Reset to initial state');
      },

      _initFromServer: (serverTime: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
      }) => {
        // Calculate total minutes from server time
        const totalMinutes = serverTime.hour * 60 + serverTime.minute;
        
        // Determine season from month
        const season: Season = 
          serverTime.month <= 3 ? 'spring' : 
          serverTime.month <= 6 ? 'summer' : 
          serverTime.month <= 9 ? 'autumn' : 'winter';

        set({
          gameTime: {
            totalMinutes,
            year: serverTime.year,
            month: serverTime.month,
            day: serverTime.day,
            hour: serverTime.hour,
            minute: serverTime.minute,
            season,
          },
        });
        
        console.log(
          `[TimeStore] Initialized from server: ${serverTime.year}/${serverTime.month}/${serverTime.day} ` +
          `${String(serverTime.hour).padStart(2, '0')}:${String(serverTime.minute).padStart(2, '0')}`
        );
      },
    }),
    { name: 'time-store' }
  )
);

// ==================== SELECTORS ====================

/** Selector for pause state */
export const useTimePaused = () => useTimeStore(s => s.isPaused);

/** Selector for running state */
export const useTimeRunning = () => useTimeStore(s => s.isRunning);

/** Selector for tick count */
export const useTickCount = () => useTimeStore(s => s.tickCount);

/** Selector for current speed */
export const useTimeSpeed = () => useTimeStore(s => s.speed);

/** Selector for game time */
export const useGameTime = () => useTimeStore(s => s.gameTime);

/** Selector for speed config */
export const useTimeSpeedConfig = () => {
  const speed = useTimeStore(s => s.speed);
  const speeds = useTimeStore(s => s.speeds);
  return speeds[speed];
};

/** Selector for formatted game time */
export const useFormattedGameTime = () => {
  const gameTime = useTimeStore(s => s.gameTime);
  return formatGameDateTime(gameTime);
};

// ==================== ACTION HOOKS ====================

/** Hook for time actions */
export const useTimeActions = () => useTimeStore(
  useShallow(state => ({
    togglePause: state.togglePause,
    setSpeed: state.setSpeed,
    _setRunning: state._setRunning,
    _setPaused: state._setPaused,
    _incrementTick: state._incrementTick,
    _reset: state._reset,
  }))
);

// ==================== UTILITY FUNCTIONS ====================

/** Format game time to string */
export function formatGameTime(gameTime: GameTime): string {
  return formatGameDateTime(gameTime);
}

/** Get time difference in minutes */
export function getTimeDiffInMinutes(time1: GameTime, time2: GameTime): number {
  return Math.abs(time1.totalMinutes - time2.totalMinutes);
}

/** Convert real seconds to game minutes at given speed */
export function realSecondsToGameMinutes(seconds: number, speed: TickSpeedId): number {
  const config = TICK_SPEEDS[speed];
  // 1 tick = 1 second real time = minutesPerTick game minutes
  return seconds * config.minutesPerTick;
}

// ==================== TIME UTILITIES (from time-system.ts) ====================

/** Get time of day from hour */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 0 && hour < 5) return 'night';
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'dusk';
}

/** Get time of day name in Russian */
export function getTimeOfDayName(hour: number): string {
  const names: Record<TimeOfDay, string> = {
    night: 'Ночь',
    dawn: 'Рассвет',
    morning: 'Утро',
    day: 'День',
    evening: 'Вечер',
    dusk: 'Сумерки',
  };
  return names[getTimeOfDay(hour)];
}

/** Get season from month */
export function getSeasonFromMonth(month: number): Season {
  if (month <= 3) return 'spring';
  if (month <= 6) return 'summer';
  if (month <= 9) return 'autumn';
  return 'winter';
}

/** Get season name in Russian */
export function getSeasonName(season: Season): string {
  const names: Record<Season, string> = {
    spring: 'Весна',
    summer: 'Лето',
    autumn: 'Осень',
    winter: 'Зима',
  };
  return names[season];
}

/** Format time as HH:MM */
export function formatTimeOnly(gameTime: GameTime): string {
  const hourStr = String(gameTime.hour).padStart(2, '0');
  const minStr = String(gameTime.minute).padStart(2, '0');
  return `${hourStr}:${minStr}`;
}

/** Format date as "1864 Э.С.М., 3 месяц, 15 день" */
export function formatDateOnly(gameTime: GameTime): string {
  return `${gameTime.year} Э.С.М., ${gameTime.month} месяц, ${gameTime.day} день`;
}

/** Format full datetime */
export function formatGameDateTime(gameTime: GameTime): string {
  return `${formatDateOnly(gameTime)}, ${formatTimeOnly(gameTime)}`;
}

/** Format with season and time of day */
export function formatGameTimeWithSeason(gameTime: GameTime): string {
  const timeOfDay = getTimeOfDayName(gameTime.hour);
  const season = getSeasonName(gameTime.season);
  return `${season} • ${timeOfDay}`;
}
