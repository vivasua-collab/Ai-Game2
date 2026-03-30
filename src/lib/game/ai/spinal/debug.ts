/**
 * ============================================================================
 * SPINAL AI - Debug Tools
 * ============================================================================
 * 
 * Инструменты для отладки Spinal AI.
 * 
 * Использование:
 * ```typescript
 * import { SpinalDebugger } from '@/lib/game/ai/spinal/debug';
 * 
 * // Включить отладку
 * SpinalDebugger.setEnabled(true);
 * 
 * // Получить состояние NPC
 * const state = SpinalDebugger.getNPCState('npc_001');
 * console.log(state);
 * ```
 */

import type { SpinalDebugInfo, SpinalSignal, SpinalAction, SpinalReflex } from './types';

// ==================== GLOBAL DEBUG STATE ====================

interface GlobalDebugState {
  enabled: boolean;
  npcStates: Map<string, SpinalDebugInfo>;
  signalLog: Array<{ npcId: string; signal: SpinalSignal; timestamp: number }>;
  actionLog: Array<{ npcId: string; action: SpinalAction; timestamp: number }>;
}

const debugState: GlobalDebugState = {
  enabled: false,
  npcStates: new Map(),
  signalLog: [],
  actionLog: [],
};

// ==================== SPINAL DEBUGGER ====================

export class SpinalDebugger {
  // === Глобальное управление ===
  
  /**
   * Включить/выключить отладку
   */
  static setEnabled(enabled: boolean): void {
    debugState.enabled = enabled;
    console.log(`[SpinalDebugger] Debug ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Проверить, включена ли отладка
   */
  static isEnabled(): boolean {
    return debugState.enabled;
  }
  
  // === Состояние NPC ===
  
  /**
   * Обновить состояние NPC
   */
  static updateNPCState(npcId: string, info: SpinalDebugInfo): void {
    debugState.npcStates.set(npcId, info);
  }
  
  /**
   * Получить состояние NPC
   */
  static getNPCState(npcId: string): SpinalDebugInfo | undefined {
    return debugState.npcStates.get(npcId);
  }
  
  /**
   * Получить все состояния NPC
   */
  static getAllNPCStates(): Map<string, SpinalDebugInfo> {
    return new Map(debugState.npcStates);
  }
  
  /**
   * Очистить состояния NPC
   */
  static clearNPCStates(): void {
    debugState.npcStates.clear();
  }
  
  // === Логирование ===
  
  /**
   * Залогировать сигнал
   */
  static logSignal(npcId: string, signal: SpinalSignal): void {
    if (!debugState.enabled) return;
    
    debugState.signalLog.push({
      npcId,
      signal,
      timestamp: Date.now(),
    });
    
    // Ограничиваем размер лога
    if (debugState.signalLog.length > 100) {
      debugState.signalLog.shift();
    }
    
    console.log(`[SpinalAI:${npcId}] Signal: ${signal.type}, intensity: ${signal.intensity.toFixed(2)}, direction: ${signal.direction ? `(${signal.direction.x.toFixed(2)}, ${signal.direction.y.toFixed(2)})` : 'none'}`);
  }
  
  /**
   * Залогировать действие
   */
  static logAction(npcId: string, action: SpinalAction): void {
    if (!debugState.enabled) return;
    
    debugState.actionLog.push({
      npcId,
      action,
      timestamp: Date.now(),
    });
    
    // Ограничиваем размер лога
    if (debugState.actionLog.length > 100) {
      debugState.actionLog.shift();
    }
    
    console.log(`[SpinalAI:${npcId}] Action: ${action.type}, reflex: ${action.sourceReflex}, priority: ${action.priority}`);
  }
  
  /**
   * Получить лог сигналов
   */
  static getSignalLog(): typeof debugState.signalLog {
    return [...debugState.signalLog];
  }
  
  /**
   * Получить лог действий
   */
  static getActionLog(): typeof debugState.actionLog {
    return [...debugState.actionLog];
  }
  
  /**
   * Очистить логи
   */
  static clearLogs(): void {
    debugState.signalLog = [];
    debugState.actionLog = [];
  }
  
  // === Статистика ===
  
  /**
   * Получить статистику
   */
  static getStats(): {
    npcCount: number;
    totalSignals: number;
    totalActions: number;
    avgUpdateTime: number;
  } {
    let totalTime = 0;
    let count = 0;
    
    for (const info of debugState.npcStates.values()) {
      totalTime += info.avgUpdateTime;
      count++;
    }
    
    return {
      npcCount: debugState.npcStates.size,
      totalSignals: debugState.signalLog.length,
      totalActions: debugState.actionLog.length,
      avgUpdateTime: count > 0 ? totalTime / count : 0,
    };
  }
  
  // === Отчёты ===
  
  /**
   * Напечатать отчёт
   */
  static printReport(): void {
    console.log('\n========== SPINAL AI DEBUG REPORT ==========');
    
    const stats = this.getStats();
    console.log(`NPCs tracked: ${stats.npcCount}`);
    console.log(`Total signals: ${stats.totalSignals}`);
    console.log(`Total actions: ${stats.totalActions}`);
    console.log(`Avg update time: ${stats.avgUpdateTime.toFixed(3)}ms`);
    
    console.log('\n--- NPC States ---');
    for (const [npcId, info] of debugState.npcStates) {
      console.log(`  ${npcId}: currentReflex=${info.currentReflex || 'none'}, queue=${info.signalQueue}, avgTime=${info.avgUpdateTime.toFixed(3)}ms`);
    }
    
    console.log('\n--- Last 5 Actions ---');
    const lastActions = debugState.actionLog.slice(-5);
    for (const { npcId, action } of lastActions) {
      console.log(`  ${npcId}: ${action.type} (from ${action.sourceReflex})`);
    }
    
    console.log('\n--- Last 5 Signals ---');
    const lastSignals = debugState.signalLog.slice(-5);
    for (const { npcId, signal } of lastSignals) {
      console.log(`  ${npcId}: ${signal.type} (${signal.intensity.toFixed(2)})`);
    }
    
    console.log('============================================\n');
  }
}

// ==================== BROWSER DEBUG API ====================

/**
 * Установить глобальный API для отладки в браузере
 * 
 * В консоли браузера:
 * window.spinalDebug.getNPCState('npc_001')
 * window.spinalDebug.printReport()
 */
export function setupBrowserDebugAPI(): void {
  if (typeof window === 'undefined') return;
  
  (window as any).spinalDebug = {
    enable: () => SpinalDebugger.setEnabled(true),
    disable: () => SpinalDebugger.setEnabled(false),
    getNPCState: (npcId: string) => SpinalDebugger.getNPCState(npcId),
    getAllNPCStates: () => SpinalDebugger.getAllNPCStates(),
    getStats: () => SpinalDebugger.getStats(),
    printReport: () => SpinalDebugger.printReport(),
    clearLogs: () => SpinalDebugger.clearLogs(),
    
    // Симуляция сигналов
    simulateSignal: (npcId: string, type: string, intensity: number) => {
      console.log(`[SpinalDebug] Simulating signal: ${type} (${intensity}) for ${npcId}`);
      // Это требует доступа к SpinalController, который хранится в NPCSprite
      // В реальном использовании нужно отправлять через события Phaser
    },
  };
  
  console.log('[SpinalDebugger] Browser API installed. Use window.spinalDebug');
}

// ==================== VISUAL DEBUG (Phaser) ====================

/**
 * Класс для визуальной отладки в Phaser
 */
export class SpinalVisualDebug {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene | null = null;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000); // Поверх всего
  }
  
  /**
   * Нарисовать состояние NPC
   */
  drawNPCState(
    x: number,
    y: number,
    info: SpinalDebugInfo,
    reflexes: SpinalReflex[]
  ): void {
    if (!this.graphics) return;
    
    const g = this.graphics;
    
    // Текущий рефлекс
    if (info.currentReflex) {
      g.lineStyle(2, 0x00ff00);
      g.strokeCircle(x, y, 35);
      
      // Текст с названием рефлекса
      // (для текста нужен отдельный GameObject)
    }
    
    // Очередь сигналов
    if (info.signalQueue > 0) {
      g.fillStyle(0xff0000, 0.5);
      g.fillCircle(x + 30, y - 30, 5 + info.signalQueue);
    }
    
    // Время обновления (красный если > 1мс)
    if (info.avgUpdateTime > 1) {
      g.lineStyle(2, 0xff0000);
      g.strokeRect(x - 25, y + 40, 50, 10);
    }
  }
  
  /**
   * Нарисовать направление угрозы
   */
  drawThreatDirection(
    x: number,
    y: number,
    direction: { x: number; y: number }
  ): void {
    if (!this.graphics) return;
    
    const length = 30;
    this.graphics.lineStyle(2, 0xff6600);
    this.graphics.lineBetween(
      x, y,
      x + direction.x * length,
      y + direction.y * length
    );
  }
  
  /**
   * Очистить графику
   */
  clear(): void {
    this.graphics?.clear();
  }
  
  /**
   * Уничтожить
   */
  destroy(): void {
    this.graphics?.destroy();
    this.graphics = null;
    this.scene = null;
  }
}
