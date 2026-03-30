/**
 * ============================================================================
 * СЕРВЕРНАЯ ИГРОВАЯ СИСТЕМА - ЭКСПОРТЫ
 * ============================================================================
 * 
 * Главный entry point для серверной игровой логики.
 * Все расчёты происходят ТОЛЬКО на сервере.
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

// Combat System
export * from './combat';
export * from './types';

// Re-export AI from existing location
export {
  SpinalServerController,
  createSpinalServerController,
  createSpinalSignal,
  createAttackSignal,
  createPlayerNearbySignal,
  BroadcastManager,
  getBroadcastManager,
  broadcastManager,
  NPCAIManager,
  getNPCAIManager,
  npcAIManager,
} from '../ai/server';
