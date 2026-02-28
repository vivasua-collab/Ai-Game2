/**
 * ============================================================================
 * PHASER EVENT EMITTER - Интеграция Phaser с Event Bus
 * ============================================================================
 * 
 * Предоставляет удобный интерфейс для:
 * - Генерации игровых событий из Phaser сцен
 * - Выполнения визуальных команд от сервера
 * - Синхронизации состояния
 * 
 * Версия: 1.0.0
 * ============================================================================
 */

import Phaser from 'phaser';
import type { GameEvent, CombatDamageDealtEvent, TechniqueUseEvent } from '@/lib/game/events/game-events';
import type { VisualCommand } from '@/lib/game/events/visual-commands';
import {
  EVENT_TYPES,
  createEventBase,
} from '@/lib/game/events/game-events';

// ==================== ТИПЫ ====================

interface EventEmitterConfig {
  sessionId: string;
  characterId: string;
  sendEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => Promise<{ success: boolean; commands?: VisualCommand[] }>;
}

interface DamageDealtOptions {
  targetId: string;
  targetType: 'training_dummy' | 'enemy' | 'player' | 'object';
  techniqueId: string;
  targetPosition: { x: number; y: number };
  distance: number;
  rotation: number;
}

interface TechniqueUseOptions {
  techniqueId: string;
  position: { x: number; y: number };
  rotation: number;
  targetId?: string;
  targetType?: 'training_dummy' | 'enemy' | 'player' | 'object';
  distance?: number;
}

// ==================== КЛАСС ====================

/**
 * Phaser Event Emitter
 * 
 * Используется внутри Phaser сцен для отправки событий на сервер.
 */
export class PhaserEventEmitter {
  private sessionId: string;
  private characterId: string;
  private sendEventFn: (event: Omit<GameEvent, 'id' | 'timestamp'>) => Promise<{ success: boolean; commands?: VisualCommand[] }>;

  constructor(config: EventEmitterConfig) {
    this.sessionId = config.sessionId;
    this.characterId = config.characterId;
    this.sendEventFn = config.sendEvent;
  }

  // ==================== БОЕВЫЕ ИВЕНТЫ ====================

  /**
   * Отправить ивент нанесения урона
   */
  async sendDamageDealt(options: DamageDealtOptions): Promise<boolean> {
    const event: Omit<CombatDamageDealtEvent, 'id' | 'timestamp'> = {
      type: EVENT_TYPES.DAMAGE_DEALT,
      sessionId: this.sessionId,
      characterId: this.characterId,
      ...options,
    };

    try {
      const result = await this.sendEventFn(event);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send damage event:', error);
      return false;
    }
  }

  /**
   * Отправить ивент использования техники
   */
  async sendTechniqueUse(options: TechniqueUseOptions): Promise<boolean> {
    const event: Omit<TechniqueUseEvent, 'id' | 'timestamp'> = {
      type: EVENT_TYPES.TECHNIQUE_USE,
      sessionId: this.sessionId,
      characterId: this.characterId,
      ...options,
    };

    try {
      const result = await this.sendEventFn(event);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send technique event:', error);
      return false;
    }
  }

  /**
   * Начать зарядку техники
   */
  async sendTechniqueChargeStart(techniqueId: string, slotIndex: number): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.TECHNIQUE_CHARGE_START, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        techniqueId,
        slotIndex,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send charge start:', error);
      return false;
    }
  }

  /**
   * Отменить зарядку техники
   */
  async sendTechniqueChargeCancel(techniqueId: string, slotIndex: number): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.TECHNIQUE_CHARGE_CANCEL, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        techniqueId,
        slotIndex,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send charge cancel:', error);
      return false;
    }
  }

  // ==================== ДВИЖЕНИЕ ====================

  /**
   * Отправить ивент движения
   */
  async sendMovement(
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number },
    distanceMeters: number,
    durationMs: number
  ): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.MOVE, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        fromPosition,
        toPosition,
        distanceMeters,
        durationMs,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send movement:', error);
      return false;
    }
  }

  // ==================== ИНВЕНТАРЬ ====================

  /**
   * Использовать предмет
   */
  async sendInventoryUseItem(itemId: string, quantity: number = 1): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.USE_ITEM, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        itemId,
        quantity,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send use item:', error);
      return false;
    }
  }

  /**
   * Подобрать предмет
   */
  async sendItemPickup(
    worldItemId: string,
    itemType: string,
    position: { x: number; y: number }
  ): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.PICKUP_ITEM, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        worldItemId,
        itemType,
        position,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send pickup:', error);
      return false;
    }
  }

  // ==================== ОКРУЖЕНИЕ ====================

  /**
   * Войти в зону
   */
  async sendEnvironmentEnter(
    zoneId: string,
    zoneType: string,
    position: { x: number; y: number }
  ): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.ENTER, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        zoneId,
        zoneType,
        position,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send enter zone:', error);
      return false;
    }
  }

  /**
   * Взаимодействовать с объектом
   */
  async sendEnvironmentInteract(
    objectId: string,
    objectType: string,
    action: 'examine' | 'use' | 'open' | 'close' | 'talk' | 'take',
    position: { x: number; y: number }
  ): Promise<boolean> {
    const base = createEventBase(EVENT_TYPES.INTERACT, this.sessionId, this.characterId);
    
    try {
      const result = await this.sendEventFn({
        ...base,
        objectId,
        objectType,
        action,
        position,
      } as GameEvent);
      return result.success;
    } catch (error) {
      console.error('[PhaserEventEmitter] Failed to send interact:', error);
      return false;
    }
  }
}

// ==================== ВИЗУАЛЬНЫЕ КОМАНДЫ ====================

/**
 * Выполнить визуальную команду в Phaser сцене
 */
export function executeVisualCommand(scene: Phaser.Scene, command: VisualCommand): void {
  const { type, data } = command as { type: string; data: Record<string, unknown> };

  switch (type) {
    case 'visual:show_damage':
      showDamageInScene(scene, data as Parameters<typeof showDamageInScene>[1]);
      break;

    case 'visual:show_effect':
      showEffectInScene(scene, data as Parameters<typeof showEffectInScene>[1]);
      break;

    case 'visual:show_beam':
      showBeamInScene(scene, data as Parameters<typeof showBeamInScene>[1]);
      break;

    case 'visual:show_aoe':
      showAoeInScene(scene, data as Parameters<typeof showAoeInScene>[1]);
      break;

    case 'visual:update_hp_bar':
      // Обновление HP бара - делегируется UI
      console.log('[PhaserEventEmitter] Update HP bar:', data);
      break;

    case 'camera:shake':
      const shakeData = data as { intensity: number; duration: number };
      scene.cameras.main.shake(shakeData.duration, shakeData.intensity);
      break;

    default:
      console.warn('[PhaserEventEmitter] Unknown command type:', type);
  }
}

// ==================== ХЕЛПЕРЫ ДЛЯ СЦЕН ====================

/**
 * Показать урон в сцене
 */
function showDamageInScene(
  scene: Phaser.Scene,
  data: { x: number; y: number; damage: number; element?: string; isCritical?: boolean; multiplier?: number }
): void {
  const { x, y, damage, element = 'neutral', isCritical = false } = data;

  // Цвет по элементу
  const colors: Record<string, string> = {
    fire: '#ff6622',
    water: '#4488ff',
    earth: '#886622',
    air: '#aaccff',
    lightning: '#ffff00',
    void: '#9944ff',
    neutral: '#ffffff',
  };

  const color = colors[element] || colors.neutral;

  // Текст урона
  const text = scene.add.text(x, y - 50, damage.toString(), {
    fontSize: isCritical ? '28px' : '20px',
    fontFamily: 'Arial',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(200);

  // Анимация
  scene.tweens.add({
    targets: text,
    y: y - 100,
    alpha: 0,
    scale: isCritical ? 1.5 : 1.2,
    duration: 1200,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

/**
 * Показать эффект в сцене
 */
function showEffectInScene(
  scene: Phaser.Scene,
  data: { x: number; y: number; effectType: string; element?: string; duration?: number; radius?: number }
): void {
  const { x, y, effectType, element = 'neutral', duration = 400, radius = 50 } = data;

  const graphics = scene.add.graphics();
  graphics.setDepth(15);

  // Цвет по элементу
  const colors: Record<string, number> = {
    fire: 0xff6622,
    water: 0x4488ff,
    earth: 0x886622,
    air: 0xaaccff,
    lightning: 0xffff00,
    void: 0x9944ff,
    neutral: 0x4ade80,
  };

  const color = colors[element] || colors.neutral;

  switch (effectType) {
    case 'impact':
      graphics.fillStyle(color, 0.7);
      graphics.fillCircle(x, y, radius / 2);
      break;

    case 'aura':
      graphics.lineStyle(2, color, 0.5);
      graphics.strokeCircle(x, y, radius);
      break;

    case 'explosion':
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(x, y, radius);
      break;
  }

  // Анимация исчезновения
  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    duration,
    onComplete: () => graphics.destroy(),
  });
}

/**
 * Показать луч в сцене
 */
function showBeamInScene(
  scene: Phaser.Scene,
  data: { startX: number; startY: number; endX: number; endY: number; element?: string; width?: number; duration?: number }
): void {
  const { startX, startY, endX, endY, element = 'neutral', width = 4, duration = 400 } = data;

  const graphics = scene.add.graphics();
  graphics.setDepth(15);

  const colors: Record<string, number> = {
    fire: 0xff6622,
    water: 0x4488ff,
    earth: 0x886622,
    air: 0xaaccff,
    lightning: 0xffff00,
    void: 0x9944ff,
    neutral: 0x4ade80,
  };

  const color = colors[element] || colors.neutral;

  // Основной луч
  graphics.lineStyle(width, color, 0.9);
  graphics.beginPath();
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);
  graphics.strokePath();

  // Свечение
  graphics.lineStyle(width * 2, color, 0.3);
  graphics.beginPath();
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);
  graphics.strokePath();

  // Точка удара
  const impact = scene.add.circle(endX, endY, 10, color, 0.7);
  impact.setDepth(16);

  // Анимация
  scene.tweens.add({
    targets: [graphics, impact],
    alpha: 0,
    duration,
    onComplete: () => {
      graphics.destroy();
      impact.destroy();
    },
  });
}

/**
 * Показать AOE в сцене
 */
function showAoeInScene(
  scene: Phaser.Scene,
  data: { x: number; y: number; radius: number; element?: string; duration?: number }
): void {
  const { x, y, radius, element = 'neutral', duration = 400 } = data;

  const graphics = scene.add.graphics();
  graphics.setDepth(15);

  const colors: Record<string, number> = {
    fire: 0xff6622,
    water: 0x4488ff,
    earth: 0x886622,
    air: 0xaaccff,
    lightning: 0xffff00,
    void: 0x9944ff,
    neutral: 0x4ade80,
  };

  const color = colors[element] || colors.neutral;

  // AOE круг
  graphics.fillStyle(color, 0.35);
  graphics.fillCircle(x, y, radius);

  // Граница
  graphics.lineStyle(1, color, 0.5);
  graphics.strokeCircle(x, y, radius);

  // Анимация
  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    duration,
    onComplete: () => graphics.destroy(),
  });
}

export default PhaserEventEmitter;
