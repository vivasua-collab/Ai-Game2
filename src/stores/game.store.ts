/**
 * Game State Store
 * 
 * Zustand store for global game state.
 * Eliminates props drilling - components access state directly.
 * 
 * ARCHITECTURE: Server is the single source of truth!
 * The store only:
 * 1. Displays data from server responses
 * 2. Sends actions to server
 * 3. Receives updated state from server
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Character, Location, WorldTime, Message, GameState } from '@/types/game';
import { GameClientService } from '@/services/game-client.service';

// ==================== EXTENDED STATE ====================

interface GameStoreState extends GameState {
  // Actions
  startGame: (variant: 1|2|3, customConfig?: Record<string, unknown>, characterName?: string) => Promise<boolean>;
  loadGame: (sessionId: string) => Promise<boolean>;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  togglePause: () => Promise<void>;
  getSaves: () => Promise<Array<Record<string, unknown>>>;
  clearError: () => void;
  resetGame: () => void;
  saveAndExit: () => Promise<void>;
}

// ==================== INITIAL STATE ====================

const initialState: Omit<GameStoreState, keyof GameStoreActions> = {
  sessionId: null,
  isLoading: false,
  error: null,
  character: null,
  worldTime: null,
  location: null,
  messages: [],
  isPaused: true,
  daysSinceStart: 0,
};

type GameStoreActions = Pick<GameStoreState, 
  | 'startGame' | 'loadGame' | 'sendAction' | 'sendMessage' | 'togglePause' 
  | 'getSaves' | 'clearError' | 'resetGame' | 'saveAndExit'
>;

// ==================== STORE ====================

export const useGameStore = create<GameStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      startGame: async (variant, customConfig, characterName) => {
        set({ isLoading: true, error: null });
        try {
          const service = new GameClientService();
          const data = await service.startGame(variant, customConfig, characterName);
          if (!data.success) throw new Error(data.error || "Failed to start game");
          
          const { session, openingNarration } = data;
          set({
            sessionId: session.id as typeof initialState.sessionId,
            isLoading: false,
            error: null,
            character: session.character,
            worldTime: {
              year: session.worldYear,
              month: session.worldMonth,
              day: session.worldDay,
              hour: session.worldHour,
              minute: session.worldMinute,
              formatted: `${session.worldYear} Э.С.М., ${session.worldMonth} месяц, ${session.worldDay} день`,
              season: session.worldMonth <= 6 ? "тёплый" : "холодный",
            },
            location: session.character.currentLocation || null,
            messages: [{
              id: "opening" as typeof initialState.sessionId,
              type: "narration",
              sender: "narrator",
              content: openingNarration,
              createdAt: new Date().toISOString(),
            }],
            isPaused: session.isPaused,
            daysSinceStart: session.daysSinceStart,
          });
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Unknown error" });
          return false;
        }
      },

      loadGame: async (sessionId) => {
        set({ isLoading: true, error: null });
        try {
          const service = new GameClientService();
          const data = await service.loadGame(sessionId);
          if (!data.success) throw new Error(data.error || "Failed to load game");
          
          set({
            sessionId: sessionId as typeof initialState.sessionId,
            isLoading: false,
            error: null,
            character: data.session.character,
            worldTime: data.session.worldTime,
            location: data.session.character.currentLocation || null,
            messages: data.session.recentMessages,
            isPaused: data.session.isPaused,
            daysSinceStart: data.session.daysSinceStart,
          });
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Unknown error" });
          return false;
        }
      },

      sendAction: async (action, payload) => {
        const sessionId = get().sessionId;
        if (!sessionId) return;

        const playerMessage: Message = {
          id: `temp-${Date.now()}` as typeof initialState.sessionId,
          type: "player",
          sender: "player",
          content: action,
          createdAt: new Date().toISOString(),
        };

        set(state => ({ messages: [...state.messages, playerMessage], isLoading: true }));

        try {
          const service = new GameClientService();
          const data = await service.sendAction(sessionId, action, payload);
          if (!data.success) throw new Error(data.error || "Action failed");

          const aiMessage: Message = {
            id: `ai-${Date.now()}` as typeof initialState.sessionId,
            type: data.response.type,
            sender: "narrator",
            content: data.response.content,
            createdAt: new Date().toISOString(),
          };

          if (data.response.requiresRestart) {
            set({ ...initialState, messages: [aiMessage] } as GameStoreState);
            return;
          }

          set(state => ({
            messages: [...state.messages, aiMessage],
            isLoading: false,
            character: data.response.characterState && state.character
              ? { ...state.character, ...data.response.characterState }
              : state.character,
            worldTime: data.updatedTime ? {
              year: data.updatedTime.year,
              month: data.updatedTime.month,
              day: data.updatedTime.day,
              hour: data.updatedTime.hour,
              minute: data.updatedTime.minute,
              formatted: `${data.updatedTime.year} Э.С.М., ${data.updatedTime.month} месяц, ${data.updatedTime.day} день`,
              season: data.updatedTime.month <= 6 ? "тёплый" : "холодный",
            } : state.worldTime,
            daysSinceStart: data.updatedTime?.daysSinceStart ?? state.daysSinceStart,
          }));
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Unknown error" });
        }
      },

      sendMessage: async (message: string) => {
        return get().sendAction(message);
      },

      togglePause: async () => {
        const { sessionId, isPaused } = get();
        if (!sessionId) return;
        
        const service = new GameClientService();
        const result = await service.saveGame(sessionId, !isPaused);
        if (result.success) set({ isPaused: !isPaused });
      },

      getSaves: async () => {
        const service = new GameClientService();
        const data = await service.getSaves();
        return data.saves || [];
      },

      clearError: () => set({ error: null }),

      resetGame: () => set(initialState as GameStoreState),

      saveAndExit: async () => {
        const sessionId = get().sessionId;
        if (sessionId) {
          const service = new GameClientService();
          await service.saveGame(sessionId, true);
        }
        set(initialState as GameStoreState);
      },
    }),
    { name: 'game-store' }
  )
);

// ==================== SELECTORS ====================

/** Selector for character data - only re-renders when character changes */
export const useGameCharacter = () => useGameStore(s => s.character);

/** Selector for messages - only re-renders when messages change */
export const useGameMessages = () => useGameStore(s => s.messages);

/** Selector for world time */
export const useGameTime = () => useGameStore(s => s.worldTime);

/** Selector for current location */
export const useGameLocation = () => useGameStore(s => s.location);

/** Selector for loading state */
export const useGameLoading = () => useGameStore(s => s.isLoading);

/** Selector for paused state */
export const useGamePaused = () => useGameStore(s => s.isPaused);

/** Selector for session ID */
export const useGameSessionId = () => useGameStore(s => s.sessionId);

/** Selector for days since start */
export const useGameDaysSinceStart = () => useGameStore(s => s.daysSinceStart);

/** Selector for error state */
export const useGameError = () => useGameStore(s => s.error);

// ==================== ACTION HOOKS ====================

/** Hook for game actions - uses useShallow to prevent infinite loops */
export const useGameActions = () => useGameStore(
  useShallow(state => ({
    startGame: state.startGame,
    loadGame: state.loadGame,
    sendAction: state.sendAction,
    sendMessage: state.sendMessage,
    togglePause: state.togglePause,
    getSaves: state.getSaves,
    clearError: state.clearError,
    resetGame: state.resetGame,
    saveAndExit: state.saveAndExit,
  }))
);
