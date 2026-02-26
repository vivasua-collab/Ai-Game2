/**
 * Game Client Service
 * 
 * Handles all API calls for game actions.
 * Used by useGame hook - keeps hook focused on state management only.
 * 
 * This service runs on the client side and communicates with the server APIs.
 */

import type { Character, WorldTime, Message } from '@/types/game';

// ==================== RESPONSE TYPES ====================

export interface StartGameResponse {
  success: boolean;
  error?: string;
  session: {
    id: string;
    character: Character;
    worldYear: number;
    worldMonth: number;
    worldDay: number;
    worldHour: number;
    worldMinute: number;
    isPaused: boolean;
    daysSinceStart: number;
  };
  openingNarration: string;
}

export interface LoadGameResponse {
  success: boolean;
  error?: string;
  session: {
    character: Character;
    worldTime: WorldTime;
    recentMessages: Message[];
    isPaused: boolean;
    daysSinceStart: number;
  };
}

export interface ActionResponse {
  success: boolean;
  error?: string;
  response: {
    type: string;
    content: string;
    characterState?: Partial<Character>;
    timeAdvance?: {
      minutes?: number;
      hours?: number;
      days?: number;
    };
    requiresRestart?: boolean;
    interruption?: {
      event: unknown;
      options: unknown[];
    };
  };
  updatedTime?: WorldTime & { daysSinceStart: number };
}

export interface SaveData {
  id: string;
  characterName: string;
  cultivationLevel: number;
  worldTime: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== GAME CLIENT SERVICE ====================

/**
 * Game Client Service
 * Provides methods for all game API calls
 */
export class GameClientService {
  /**
   * Start a new game
   * @param variant - Game variant (1, 2, or 3)
   * @param customConfig - Optional custom configuration
   * @param characterName - Optional character name
   */
  async startGame(
    variant: 1 | 2 | 3,
    customConfig?: Record<string, unknown>,
    characterName?: string
  ): Promise<StartGameResponse> {
    const response = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant, customConfig, characterName }),
    });
    return response.json();
  }

  /**
   * Load an existing game session
   * @param sessionId - Session ID to load
   */
  async loadGame(sessionId: string): Promise<LoadGameResponse> {
    const response = await fetch(`/api/game/state?sessionId=${sessionId}`);
    return response.json();
  }

  /**
   * Send a game action
   * @param sessionId - Current session ID
   * @param action - Action message
   * @param payload - Optional additional payload
   */
  async sendAction(
    sessionId: string,
    action: string,
    payload?: Record<string, unknown>
  ): Promise<ActionResponse> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: action, ...payload }),
    });
    return response.json();
  }

  /**
   * Save game state
   * @param sessionId - Session ID to save
   * @param isPaused - Pause state
   */
  async saveGame(sessionId: string, isPaused: boolean): Promise<{ success: boolean; error?: string }> {
    const response = await fetch('/api/game/save', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, isPaused }),
    });
    return response.json();
  }

  /**
   * Get list of saved games
   */
  async getSaves(): Promise<{ success: boolean; saves?: SaveData[]; error?: string }> {
    const response = await fetch('/api/game/save');
    return response.json();
  }

  /**
   * Delete a saved game
   * @param sessionId - Session ID to delete
   */
  async deleteSave(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`/api/game/save?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
    return response.json();
  }
}

// Singleton instance for convenience
export const gameClient = new GameClientService();
