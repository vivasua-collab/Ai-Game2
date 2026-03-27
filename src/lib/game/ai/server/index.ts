/**
 * ============================================================================
 * SERVER AI - Экспорты серверного AI
 * ============================================================================
 */

// Spinal Server Adapter
export {
  SpinalServerController,
  createSpinalServerController,
  createSpinalSignal,
  createAttackSignal,
  createPlayerNearbySignal,
} from './spinal-server';

// Broadcast Manager
export {
  BroadcastManager,
  getBroadcastManager,
  broadcastManager,
  type BroadcastEvent,
  type NPCActionEvent,
  type NPCSpawnEvent,
  type NPCDespawnEvent,
  type CombatHitEvent,
} from './broadcast-manager';

// NPC AI Manager
export {
  NPCAIManager,
  getNPCAIManager,
  npcAIManager,
} from './npc-ai-manager';
