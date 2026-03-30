/**
 * ============================================================================
 * SPINAL AI - Controller
 * ============================================================================
 * 
 * Главный контроллер для классической (rules-based) Spinal AI.
 * Работает синхронно на клиенте в Phaser update loop.
 * 
 * Требования производительности:
 * - update() должен выполняться за < 1мс
 * - Нет HTTP запросов
 * - Нет async/await
 * 
 * @see docs/NPC_AI_NEUROTHEORY.md
 */

import type {
  SpinalSignal,
  SpinalAction,
  SpinalReflex,
  SpinalBodyState,
  SpinalPresetType,
  SpinalDebugInfo,
  ISpinalController,
} from './types';
import { SPINAL_CONSTANTS } from './types';
import { REFLEX_LIBRARY, createReflex } from './reflexes';
import { getPreset } from './presets';

// ==================== CONTROLLER CLASS ====================

/**
 * SpinalController - клиентский рефлекторный AI
 * 
 * Архитектура:
 * 1. Сигналы поступают через receiveSignal()
 * 2. Сигналы помещаются в очередь
 * 3. update() обрабатывает очередь и возвращает действие
 * 4. Действие выполняется в Phaser
 */
export class SpinalController implements ISpinalController {
  // === Идентификация ===
  private npcId: string;
  
  // === Рефлексы ===
  private reflexes: SpinalReflex[] = [];
  private currentReflex: SpinalReflex | null = null;
  
  // === Сигналы ===
  private signalQueue: SpinalSignal[] = [];
  
  // === Параметры ===
  private intensityModifier: number = 1.0;
  private speedModifier: number = 1.0;
  private sensitivity: number = 1.0;
  
  // === Отладка ===
  private debugEnabled: boolean = false;
  private updateCount: number = 0;
  private totalUpdateTime: number = 0;
  private lastSignal: SpinalSignal | null = null;
  private lastAction: SpinalAction | null = null;
  
  // === Текущее действие ===
  private currentAction: SpinalAction | null = null;
  private actionEndTime: number = 0;

  constructor(npcId: string, preset?: SpinalPresetType) {
    this.npcId = npcId;
    
    if (preset) {
      this.loadPreset(preset);
    }
    
    if (this.debugEnabled) {
      console.log(`[SpinalController] Created for NPC ${npcId} with preset ${preset || 'none'}`);
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Приём сигнала от Phaser
   * Сигналы добавляются в очередь для обработки в update()
   */
  receiveSignal(signal: SpinalSignal): void {
    // Проверка лимита очереди
    if (this.signalQueue.length >= SPINAL_CONSTANTS.MAX_SIGNAL_QUEUE) {
      // Удаляем самый старый сигнал
      this.signalQueue.shift();
    }
    
    // Применяем модификаторы
    const modifiedSignal: SpinalSignal = {
      ...signal,
      intensity: signal.intensity * this.intensityModifier * this.sensitivity,
    };
    
    this.signalQueue.push(modifiedSignal);
    this.lastSignal = modifiedSignal;
    
    if (this.debugEnabled) {
      console.log(`[SpinalController:${this.npcId}] Signal received: ${signal.type}, intensity: ${modifiedSignal.intensity.toFixed(2)}`);
    }
  }

  /**
   * Обновление каждый кадр
   * ВАЖНО: Должно выполняться за < 1мс
   */
  update(deltaMs: number, state: SpinalBodyState): SpinalAction | null {
    const startTime = this.debugEnabled ? performance.now() : 0;
    
    this.updateCount++;
    
    // 1. Проверяем, выполняется ли текущее действие
    if (this.currentAction && Date.now() < this.actionEndTime) {
      return null; // Продолжаем текущее действие
    }
    
    // 2. Очищаем старые сигналы
    this.cleanupOldSignals();
    
    // 3. Если нет сигналов - нет действий
    if (this.signalQueue.length === 0) {
      return null;
    }
    
    // 4. Находим лучший рефлекс для текущих сигналов
    const action = this.findBestReflex(state);
    
    if (action) {
      this.currentAction = action;
      this.actionEndTime = Date.now() + (action.params.duration || 200);
      this.lastAction = action;
      
      if (this.debugEnabled) {
        const elapsed = performance.now() - startTime;
        console.log(`[SpinalController:${this.npcId}] Action: ${action.type}, reflex: ${action.sourceReflex}, time: ${elapsed.toFixed(3)}ms`);
      }
    }
    
    // Отладка производительности
    if (this.debugEnabled) {
      const elapsed = performance.now() - startTime;
      this.totalUpdateTime += elapsed;
      
      if (elapsed > SPINAL_CONSTANTS.MAX_UPDATE_TIME_MS) {
        console.warn(`[SpinalController:${this.npcId}] update() took ${elapsed.toFixed(3)}ms (max: ${SPINAL_CONSTANTS.MAX_UPDATE_TIME_MS}ms)`);
      }
    }
    
    return action;
  }

  /**
   * Загрузка пресета
   */
  loadPreset(presetType: SpinalPresetType): void {
    const preset = getPreset(presetType);
    
    if (!preset) {
      console.warn(`[SpinalController] Unknown preset: ${presetType}`);
      return;
    }
    
    // Копируем рефлексы из пресета
    this.reflexes = preset.reflexes.map(r => ({ ...r }));
    
    // Применяем глобальные модификаторы
    this.intensityModifier = preset.globalIntensityModifier;
    this.speedModifier = preset.globalSpeedModifier;
    this.sensitivity = preset.sensitivity;
    
    if (this.debugEnabled) {
      console.log(`[SpinalController:${this.npcId}] Loaded preset: ${preset.name} with ${this.reflexes.length} reflexes`);
    }
  }

  /**
   * Добавление рефлекса
   */
  addReflex(reflex: SpinalReflex): void {
    // Проверяем, нет ли уже такого рефлекса
    const existingIndex = this.reflexes.findIndex(r => r.id === reflex.id);
    
    if (existingIndex >= 0) {
      // Заменяем существующий
      this.reflexes[existingIndex] = reflex;
    } else {
      // Добавляем новый
      this.reflexes.push(reflex);
    }
    
    // Сортируем по приоритету
    this.reflexes.sort((a, b) => b.priority - a.priority);
    
    if (this.debugEnabled) {
      console.log(`[SpinalController:${this.npcId}] Added reflex: ${reflex.id}, priority: ${reflex.priority}`);
    }
  }

  /**
   * Удаление рефлекса
   */
  removeReflex(reflexId: string): void {
    this.reflexes = this.reflexes.filter(r => r.id !== reflexId);
    
    if (this.debugEnabled) {
      console.log(`[SpinalController:${this.npcId}] Removed reflex: ${reflexId}`);
    }
  }

  /**
   * Получить текущий активный рефлекс
   */
  getCurrentReflex(): string | null {
    return this.currentReflex?.id || null;
  }

  /**
   * Получить информацию для отладки
   */
  getDebugInfo(): SpinalDebugInfo {
    return {
      npcId: this.npcId,
      currentReflex: this.currentReflex?.id || null,
      lastSignal: this.lastSignal,
      lastAction: this.lastAction,
      signalQueue: this.signalQueue.length,
      updateCount: this.updateCount,
      avgUpdateTime: this.updateCount > 0 ? this.totalUpdateTime / this.updateCount : 0,
    };
  }

  /**
   * Включить/выключить отладку
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Удаление старых сигналов
   */
  private cleanupOldSignals(): void {
    const now = Date.now();
    this.signalQueue = this.signalQueue.filter(
      s => now - s.timestamp < SPINAL_CONSTANTS.SIGNAL_LIFETIME_MS
    );
  }

  /**
   * Найти лучший рефлекс для текущих сигналов
   */
  private findBestReflex(state: SpinalBodyState): SpinalAction | null {
    let bestReflex: SpinalReflex | null = null;
    let bestSignal: SpinalSignal | null = null;
    
    const now = Date.now();
    
    // Проходим по всем рефлексам (они уже отсортированы по приоритету)
    for (const reflex of this.reflexes) {
      // Проверяем кулдаун
      if (reflex.lastTriggered && now - reflex.lastTriggered < reflex.cooldown) {
        continue;
      }
      
      // Проверяем условия состояния
      if (reflex.requiresNotInState) {
        // TODO: Добавить проверку состояний
      }
      
      // Проверяем Qi
      if (reflex.requiresQi && (state.qi || 0) < reflex.requiresQi) {
        continue;
      }
      
      // Ищем подходящий сигнал
      for (const signal of this.signalQueue) {
        if (this.matchesTrigger(signal, reflex.trigger)) {
          bestReflex = reflex;
          bestSignal = signal;
          break; // Берем первый подходящий (рефлексы отсортированы по приоритету)
        }
      }
      
      if (bestReflex) break;
    }
    
    if (!bestReflex || !bestSignal) {
      return null;
    }
    
    // Создаём действие
    const action = this.createAction(bestReflex, bestSignal, state);
    
    // Обновляем время последнего срабатывания
    bestReflex.lastTriggered = now;
    
    // Очищаем обработанный сигнал
    this.signalQueue = this.signalQueue.filter(s => s !== bestSignal);
    
    return action;
  }

  /**
   * Проверка соответствия сигнала триггеру
   */
  private matchesTrigger(signal: SpinalSignal, trigger: SpinalReflex['trigger']): boolean {
    if (signal.type !== trigger.signalType) {
      return false;
    }
    
    if (signal.intensity < trigger.minIntensity) {
      return false;
    }
    
    if (trigger.maxIntensity !== undefined && signal.intensity > trigger.maxIntensity) {
      return false;
    }
    
    return true;
  }

  /**
   * Создание действия из рефлекса и сигнала
   */
  private createAction(
    reflex: SpinalReflex,
    signal: SpinalSignal,
    state: SpinalBodyState
  ): SpinalAction {
    // Базовые параметры
    const params = {
      direction: signal.direction || { x: 0, y: 0 },
      speed: SPINAL_CONSTANTS.DODGE_SPEED * this.speedModifier,
      duration: SPINAL_CONSTANTS.DODGE_DURATION,
      distance: SPINAL_CONSTANTS.DODGE_DISTANCE,
    };
    
    // Модифицируем скорость
    if (reflex.speedModifier) {
      params.speed *= reflex.speedModifier;
    }
    
    // Определяем направление уклонения
    if (signal.direction) {
      // Уклонение ПЕРПЕНДИКУЛЯРНО направлению угрозы
      const perpX = -signal.direction.y;
      const perpY = signal.direction.x;
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      
      // Случайно выбираем сторону
      const side = Math.random() > 0.5 ? 1 : -1;
      params.direction = {
        x: perpX / len * side,
        y: perpY / len * side,
      };
    }
    
    // Специфичные параметры для разных действий
    switch (reflex.action) {
      case 'flinch':
        params.duration = SPINAL_CONSTANTS.FLINCH_DURATION;
        params.speed = 0; // Flinch не двигает
        break;
        
      case 'step_back':
        params.speed = SPINAL_CONSTANTS.STEP_BACK_SPEED * this.speedModifier;
        params.distance = SPINAL_CONSTANTS.STEP_BACK_DISTANCE;
        // Направление - от угрозы
        if (signal.direction) {
          params.direction = {
            x: -signal.direction.x,
            y: -signal.direction.y,
          };
        }
        break;
        
      case 'qi_shield':
        params.qiCost = SPINAL_CONSTANTS.QI_SHIELD_COST;
        params.duration = 500; // 500мс щит
        break;
        
      case 'freeze':
        params.speed = 0;
        params.duration = 1000; // 1с замерзание
        break;
        
      case 'flee':
        params.speed = 200 * this.speedModifier;
        params.distance = 150;
        // Направление - от угрозы
        if (signal.direction) {
          params.direction = {
            x: -signal.direction.x,
            y: -signal.direction.y,
          };
        }
        break;
    }
    
    this.currentReflex = reflex;
    
    return {
      type: reflex.action,
      params,
      priority: reflex.priority,
      timestamp: Date.now(),
      sourceReflex: reflex.id,
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.signalQueue = [];
    this.currentReflex = null;
    this.currentAction = null;
    this.lastSignal = null;
    this.lastAction = null;
    
    // Сброс кулдаунов рефлексов
    for (const reflex of this.reflexes) {
      reflex.lastTriggered = undefined;
    }
    
    if (this.debugEnabled) {
      console.log(`[SpinalController:${this.npcId}] Reset`);
    }
  }
}

// ==================== FACTORY ====================

/**
 * Создать SpinalController с пресетом
 */
export function createSpinalController(npcId: string, preset?: SpinalPresetType): SpinalController {
  return new SpinalController(npcId, preset);
}

// ==================== GLOBAL DEBUG ====================

let globalDebugEnabled = false;

/**
 * Включить глобальную отладку
 */
export function setGlobalDebug(enabled: boolean): void {
  globalDebugEnabled = enabled;
}

/**
 * Проверить глобальную отладку
 */
export function isGlobalDebugEnabled(): boolean {
  return globalDebugEnabled;
}
