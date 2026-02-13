/**
 * Общие типы игры
 * Единый источник типов для фронтенда и бэкенда
 */

import type { SessionId, CharacterId, LocationId, MessageId, SectId } from './branded';

// ==================== ПЕРСОНАЖ ====================

export interface Character {
  id: CharacterId;
  name: string;
  age: number;
  
  // Культивация
  cultivationLevel: number;      // Основной уровень (1-9)
  cultivationSubLevel: number;   // Под-уровень (0-9)
  
  // Ядро и Ци
  coreCapacity: number;          // Ёмкость ядра (ед)
  coreQuality: number;           // Качество ядра
  currentQi: number;             // Текущее количество Ци
  accumulatedQi: number;         // Накопленная для прорыва Ци
  
  // Характеристики
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;          // Проводимость меридиан (ед/сек)
  
  // Физиология
  health: number;                // Здоровье (%)
  fatigue: number;               // Физическая усталость (%)
  mentalFatigue: number;         // Ментальная усталость (%)
  
  // Память и система
  hasAmnesia: boolean;
  knowsAboutSystem: boolean;
  
  // Принадлежность
  sectRole: string | null;
  currentLocationId?: LocationId;
  currentLocation?: Location;
  sectId?: SectId;
  sect?: Sect;
  
  // Навыки
  skills?: Record<string, number>;
}

// ==================== ЛОКАЦИЯ ====================

export interface Location {
  id: LocationId;
  name: string;
  distanceFromCenter: number;
  qiDensity: number;
  terrainType: string;
}

// ==================== СЕКТА ====================

export interface Sect {
  id: SectId;
  name: string;
  description?: string;
  powerLevel: number;
}

// ==================== ВРЕМЯ МИРА ====================

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formatted: string;
  season: string;
}

// ==================== СООБЩЕНИЯ ====================

export interface Message {
  id: MessageId;
  type: string;
  sender: string | null;
  content: string;
  createdAt: string;
}

// ==================== ИГРОВОЕ СОСТОЯНИЕ ====================

export interface GameState {
  sessionId: SessionId | null;
  isLoading: boolean;
  error: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isPaused: boolean;
  daysSinceStart: number;
}

// ==================== ТИПЫ ДЕЙСТВИЙ ====================

export type GameActionType = 
  | 'message'           // Обычное сообщение/действие
  | 'meditation'        // Медитация
  | 'breakthrough'      // Попытка прорыва
  | 'combat'            // Бой
  | 'travel'            // Путешествие
  | 'status'            // Запрос статуса
  | 'techniques'        // Запрос техник
  | 'inventory'         // Запрос инвентаря
  | 'location'          // Запрос локации
  | 'world_restart';    // Перезапуск мира

export interface GameAction {
  type: GameActionType;
  payload?: Record<string, unknown>;
}

// ==================== ОТВЕТ СЕРВЕРА ====================

export interface ServerResponse {
  success: boolean;
  error?: string;
  response: {
    type: string;
    content: string;
    
    // Обновлённое состояние персонажа (сервер - источник истины!)
    characterState?: Partial<Character>;
    
    // Обновление времени
    timeAdvance?: {
      minutes?: number;
      hours?: number;
      days?: number;
    };
    
    // Специальные флаги
    requiresRestart?: boolean;
    interruption?: {
      event: unknown;
      options: unknown[];
    };
  };
  updatedTime?: WorldTime & { daysSinceStart: number };
}

// ==================== ТИПЫ ДЛЯ РАСЧЁТОВ ====================

export interface BreakthroughRequirements {
  requiredFills: number;      // Сколько заполнений нужно
  currentFills: number;       // Сколько уже накоплено
  fillsNeeded: number;        // Сколько ещё осталось
  requiredQi: number;         // Сколько Ци нужно
  currentAccumulated: number; // Сколько накоплено
  canAttempt: boolean;
}

export interface BreakthroughResult {
  success: boolean;
  newLevel: number;
  newSubLevel: number;
  newCoreCapacity: number;
  qiConsumed: number;
  fatigueGained: { physical: number; mental: number };
  message: string;
}

export interface MeditationResult {
  success: boolean;
  qiGained: number;
  accumulatedQiGained: number;
  coreWasFilled: boolean;
  duration: number;
  wasInterrupted: boolean;
  interruptionReason?: string;
  fatigueGained: {
    physical: number;
    mental: number;
  };
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

export interface QiRates {
  coreGeneration: number;       // Ци/секунду от ядра
  environmentalAbsorption: number; // Ци/секунду из среды
  total: number;                // Суммарно
}
