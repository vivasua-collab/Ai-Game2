/**
 * ============================================================================
 * SPINAL AI - Main Export
 * ============================================================================
 * 
 * Spinal AI - быстрая рефлекторная система для NPC.
 * Работает синхронно на клиенте в Phaser update loop.
 * 
 * Использование:
 * ```typescript
 * import { createSpinalController } from '@/lib/game/ai/spinal';
 * 
 * // Создать контроллер с пресетом
 * const spinal = createSpinalController('npc_001', 'monster');
 * 
 * // В update loop Phaser:
 * function update(time: number, delta: number) {
 *   // Отправить сигнал
 *   spinal.receiveSignal({
 *     type: 'danger_nearby',
 *     intensity: 0.8,
 *     direction: { x: 1, y: 0 },
 *     timestamp: Date.now(),
 *   });
 *   
 *   // Обновить и получить действие
 *   const action = spinal.update(delta, bodyState);
 *   
 *   if (action) {
 *     executeAction(action);
 *   }
 * }
 * ```
 */

// Types
export * from './types';

// Controller
export {
  SpinalController,
  createSpinalController,
  setGlobalDebug,
  isGlobalDebugEnabled,
} from './spinal-controller';

// Reflexes
export {
  REFLEX_LIBRARY,
  BASE_REFLEXES,
  CULTIVATOR_REFLEXES,
  MONSTER_REFLEXES,
  PASSERBY_REFLEXES,
  GUARD_REFLEXES,
  createReflex,
  getReflex,
  getCategoryReflexes,
  getBaseReflexes,
  getCultivatorReflexes,
  getMonsterReflexes,
  getPasserbyReflexes,
  getGuardReflexes,
  createCustomReflex,
} from './reflexes';

// Presets
export * from './presets';

// Debug
export { SpinalDebugger, SpinalVisualDebug, setupBrowserDebugAPI } from './debug';
