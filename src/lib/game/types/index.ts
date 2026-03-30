/**
 * ============================================================================
 * GAME TYPES - Экспорт типов для серверного AI
 * ============================================================================
 */

// NPC State
export type {
  NPCActionType,
  NPCAction,
  SpinalAIState,
  NPCState,
} from './npc-state';

export {
  createNPCStateFromTempNPC,
  createEmptyNPCState,
} from './npc-state';

// World State
export type {
  WorldTimeState,
  WorldEventType,
  WorldEvent,
  LocationState,
  PlayerWorldState,
  WorldState,
} from './world-state';

export {
  createInitialWorldTime,
  createWorldEvent,
  createInitialWorldState,
  createLocationState,
  createPlayerWorldState,
  getNPCsInLocation,
  getPlayersInLocation,
  addWorldEvent,
  cleanupOldEvents,
  serializeWorldState,
  deserializeWorldState,
} from './world-state';
