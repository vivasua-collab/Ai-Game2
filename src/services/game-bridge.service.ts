/**
 * GameBridge - Communication bridge between Phaser and React/API
 * 
 * Singleton service that handles:
 * - API calls from Phaser scenes
 * - State synchronization between Phaser and React
 * - Scene navigation events
 * 
 * Note: Phaser types are minimal to avoid SSR issues.
 * Full Phaser is loaded dynamically on client only.
 */

// Minimal Phaser types (avoid importing Phaser for SSR)
interface PhaserGame {
  events: {
    emit: (event: string, data?: unknown) => void;
  };
  scene: {
    start: (name: string, data?: object) => void;
  };
}

// Types
interface Location {
  id: string;
  name: string;
  terrainType?: string | null;
  x?: number | null;
  y?: number | null;
  description?: string | null;
}

interface Character {
  id: string;
  name: string;
  level: number;
  subLevel: number;
  currentQi: number;
  coreCapacity: number;
  health: number;
  maxHealth: number;
}

interface NPC {
  id: string;
  name: string;
  type: string;
}

interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerQi: number;
  playerMaxQi: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: 'player' | 'enemy';
  log: string[];
}

interface CombatResult {
  damage?: number;
  combatEnd?: boolean;
  victory?: boolean;
  loot?: unknown;
}

type GameEventType = 
  | 'scene-change'
  | 'state-updated'
  | 'chat-toggle'
  | 'narrative-generated'
  | 'combat-start'
  | 'combat-end';

interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

class GameBridgeImpl {
  private static instance: GameBridgeImpl;
  private phaserGame: PhaserGame | null = null;
  private sessionId: string | null = null;
  private eventListeners: Map<GameEventType, Set<(data: unknown) => void>> = new Map();
  
  private constructor() {}
  
  static getInstance(): GameBridgeImpl {
    if (!this.instance) {
      this.instance = new GameBridgeImpl();
    }
    return this.instance;
  }
  
  // ============ Game Management ============
  
  setGame(game: PhaserGame): void {
    this.phaserGame = game;
  }
  
  getGame(): PhaserGame | null {
    return this.phaserGame;
  }
  
  setSessionId(id: string): void {
    this.sessionId = id;
  }
  
  getSessionId(): string | null {
    return this.sessionId;
  }
  
  // ============ Event System ============
  
  on(event: GameEventType, callback: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
  
  emit(event: GameEventType, data?: unknown): void {
    this.eventListeners.get(event)?.forEach(callback => callback(data));
    
    // Also emit to Phaser game
    if (this.phaserGame) {
      this.phaserGame.events.emit(event, data);
    }
  }
  
  // ============ Scene Navigation ============
  
  goToScene(sceneName: string, data?: object): void {
    if (this.phaserGame) {
      this.phaserGame.scene.start(sceneName, data);
      this.emit('scene-change', { scene: sceneName, data });
    }
  }
  
  // ============ API Calls ============
  
  async getLocations(): Promise<Location[]> {
    try {
      const response = await fetch('/api/map');
      const data = await response.json();
      return data.locations || [];
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      return [];
    }
  }
  
  async getLocation(id: string): Promise<Location | null> {
    try {
      const response = await fetch(`/api/map?locationId=${id}`);
      const data = await response.json();
      return data.location || null;
    } catch (error) {
      console.error('Failed to fetch location:', error);
      return null;
    }
  }
  
  async getCharacter(): Promise<Character | null> {
    try {
      const response = await fetch('/api/game/state');
      const data = await response.json();
      return data.character || null;
    } catch (error) {
      console.error('Failed to fetch character:', error);
      return null;
    }
  }
  
  async getNPCs(locationId: string): Promise<NPC[]> {
    // TODO: Implement NPC API endpoint
    // For now return empty array
    return [];
  }
  
  async sendAction(action: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message: action,
        }),
      });
      
      const data = await response.json();
      this.emit('narrative-generated', data);
      
      return data.response?.content || '';
    } catch (error) {
      console.error('Failed to send action:', error);
      return '';
    }
  }
  
  setCurrentLocation(locationId: string): void {
    // Store current location for reference
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentLocationId', locationId);
    }
    this.emit('state-updated', { currentLocation: locationId });
  }
  
  getCurrentLocation(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('currentLocationId');
    }
    return null;
  }
  
  // ============ Chat Toggle ============
  
  toggleChat(): void {
    this.emit('chat-toggle');
  }
  
  // ============ Combat System ============
  
  async initCombat(enemyId: string): Promise<CombatState> {
    // TODO: Implement combat API
    // Return default state for now
    return {
      playerHp: 100,
      playerMaxHp: 100,
      playerQi: 50,
      playerMaxQi: 100,
      enemyHp: 80,
      enemyMaxHp: 80,
      turn: 'player',
      log: [],
    };
  }
  
  async executeCombatAction(action: string): Promise<CombatResult> {
    // TODO: Implement combat action API
    return {
      damage: 10,
      combatEnd: false,
    };
  }
  
  async getEnemyAction(): Promise<CombatResult> {
    // TODO: Implement enemy action API
    return {
      damage: 5,
      combatEnd: false,
    };
  }
  
  // ============ Cleanup ============
  
  destroy(): void {
    this.eventListeners.clear();
    this.phaserGame = null;
    this.sessionId = null;
  }
}

// Export singleton instance
export const GameBridge = GameBridgeImpl;
export type { Location, Character, NPC, CombatState, CombatResult, GameEventType, GameEvent };
