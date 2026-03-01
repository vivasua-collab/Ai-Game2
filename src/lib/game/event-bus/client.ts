/**
 * ============================================================================
 * EVENT BUS CLIENT - Клиент для отправки событий через шину
 * ============================================================================
 * 
 * Используется в Phaser для отправки событий на сервер.
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../events/game-events';

// ==================== ТИПЫ ====================

export interface EventResponse<T = unknown> {
  success: boolean;
  eventId: string;
  error?: string;
  commands: unknown[];
  data?: T;
  changes?: {
    character?: {
      currentQi?: number;
      fatigue?: number;
      mentalFatigue?: number;
    };
  };
  message?: string;
}

export interface TechniqueUseResponse {
  canUse: boolean;
  techniqueName?: string;
  techniqueType?: string;
  element?: string;
  baseDamage?: number;
  damageMultiplier?: number;
  finalDamage?: number;
  masteryBonus?: number;
  conductivityBonus?: number;
  mastery?: number;
  qiSpent?: number;
  currentQi?: number;
  range?: number | { fullDamage?: number; halfDamage?: number; max?: number };
  reason?: string;
}

// ==================== КЛАСС КЛИЕНТА ====================

/**
 * Клиент для отправки событий через Event Bus
 */
export class EventBusClient {
  private sessionId: string | null = null;
  private characterId: string | null = null;
  private eventIdCounter = 0;

  /**
   * Инициализация клиента
   */
  initialize(sessionId: string, characterId: string): void {
    this.sessionId = sessionId;
    this.characterId = characterId;
  }

  /**
   * Отправить событие через шину
   */
  async sendEvent<T = unknown>(
    type: string,
    data: Record<string, unknown>
  ): Promise<EventResponse<T>> {
    if (!this.sessionId || !this.characterId) {
      return {
        success: false,
        eventId: 'error',
        error: 'EventBus not initialized',
        commands: [],
      };
    }

    const eventId = `evt_${Date.now()}_${++this.eventIdCounter}`;

    const event: GameEvent = {
      id: eventId,
      type,
      sessionId: this.sessionId,
      characterId: this.characterId,
      timestamp: Date.now(),
      ...data,
    };

    try {
      const response = await fetch('/api/game/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      const result = await response.json();
      return result as EventResponse<T>;

    } catch (error) {
      console.error('[EventBusClient] Error sending event:', error);
      return {
        success: false,
        eventId,
        error: error instanceof Error ? error.message : 'Network error',
        commands: [],
      };
    }
  }

  /**
   * Использовать технику
   * 
   * Поток:
   * 1. Проверка Qi локально (в движке)
   * 2. Отправка события technique:use
   * 3. Сервер проверяет технику в БД
   * 4. Сервер списывает Qi через TruthSystem
   * 5. Возвращает: canUse, damageMultiplier, currentQi
   */
  async useTechnique(
    techniqueId: string,
    position?: { x: number; y: number }
  ): Promise<EventResponse<TechniqueUseResponse>> {
    return this.sendEvent<TechniqueUseResponse>('technique:use', {
      techniqueId,
      position,
    });
  }

  /**
   * Сообщить о нанесении урона
   */
  async reportDamageDealt(
    targetId: string,
    targetType: string,
    techniqueId: string,
    targetPosition: { x: number; y: number },
    distance: number,
    rotation: number,
    damageMultiplier?: number
  ): Promise<EventResponse> {
    return this.sendEvent('combat:damage_dealt', {
      targetId,
      targetType,
      techniqueId,
      targetPosition,
      distance,
      rotation,
      damageMultiplier,
    });
  }

  /**
   * Начать зарядку техники
   */
  async startCharging(techniqueId: string): Promise<EventResponse> {
    return this.sendEvent('technique:charge_start', { techniqueId });
  }

  /**
   * Отменить зарядку
   */
  async cancelCharging(): Promise<EventResponse> {
    return this.sendEvent('technique:charge_cancel', {});
  }

  /**
   * Очистить состояние клиента
   */
  reset(): void {
    this.sessionId = null;
    this.characterId = null;
    this.eventIdCounter = 0;
  }
}

// ==================== SINGLETON ====================

/**
 * Глобальный клиент шины для использования в Phaser
 */
export const eventBusClient = new EventBusClient();

export default eventBusClient;
