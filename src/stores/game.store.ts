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
import { useShallow } from 'zustand/shallow';
import type { Character, Location, WorldTime, Message, GameState, InventoryItem, CharacterTechnique, CharacterSkill } from '@/types/game';
import { asMessageId } from '@/types/branded';
import { GameClientService } from '@/services/game-client.service';

// ==================== EXTENDED STATE ====================

interface GameStoreState extends GameState {
  // Actions
  startGame: (variant: 1|2|3, customConfig?: Record<string, unknown>, characterName?: string) => Promise<boolean>;
  loadGame: (sessionId: string) => Promise<boolean>;
  loadState: () => Promise<void>;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  togglePause: () => Promise<void>;
  getSaves: () => Promise<Array<Record<string, unknown>>>;
  clearError: () => void;
  resetGame: () => void;
  saveAndExit: () => Promise<void>;
  // Новые actions
  loadInventory: () => Promise<void>;
  loadTechniques: () => Promise<void>;
  loadSkills: () => Promise<void>;
  consumeItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  setInputFromClick: (text: string) => void;
  clickedInput: string | null;
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
  inventory: [],
  techniques: [],
  skills: [],
  clickedInput: null,
};

type GameStoreActions = Pick<GameStoreState, 
  | 'startGame' | 'loadGame' | 'loadState' | 'sendAction' | 'sendMessage' | 'togglePause' 
  | 'getSaves' | 'clearError' | 'resetGame' | 'saveAndExit'
  | 'loadInventory' | 'loadTechniques' | 'loadSkills' | 'consumeItem' | 'setInputFromClick'
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
              id: asMessageId("opening"),
              type: "narration",
              sender: "narrator",
              content: openingNarration,
              createdAt: new Date().toISOString(),
            }],
            isPaused: session.isPaused,
            daysSinceStart: session.daysSinceStart,
          });
          
          // Загружаем техники и навыки после старта
          const characterId = session.character?.id;
          if (characterId) {
            // Загружаем техники
            try {
              const techResponse = await fetch(`/api/character/data?characterId=${characterId}&type=techniques`);
              const techData = await techResponse.json();
              if (techData.success) {
                set({ techniques: techData.techniques });
              }
            } catch {
              console.error('Failed to load techniques after start');
            }
            
            // Загружаем навыки
            try {
              const skillResponse = await fetch(`/api/character/data?characterId=${characterId}&type=skills`);
              const skillData = await skillResponse.json();
              if (skillData.success) {
                set({ skills: skillData.skills });
              }
            } catch {
              console.error('Failed to load skills after start');
            }
            
            // Загружаем инвентарь
            try {
              const invResponse = await fetch(`/api/inventory?characterId=${characterId}`);
              const invData = await invResponse.json();
              if (invData.success) {
                set({ inventory: invData.inventory });
              }
            } catch {
              console.error('Failed to load inventory after start');
            }
          }
          
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
          
          // Загружаем техники после загрузки игры
          const characterId = data.session.character?.id;
          if (characterId) {
            try {
              const techResponse = await fetch(`/api/character/data?characterId=${characterId}&type=techniques`);
              const techData = await techResponse.json();
              if (techData.success) {
                set({ techniques: techData.techniques });
              }
            } catch {
              console.error('Failed to load techniques on loadGame');
            }
          }
          
          return true;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Unknown error" });
          return false;
        }
      },

      loadState: async () => {
        const sessionId = get().sessionId;
        const character = get().character;
        if (!sessionId || !character) return;
        
        try {
          // Загружаем обновлённые данные персонажа и времени
          const response = await fetch(`/api/game/state?sessionId=${sessionId}`);
          const data = await response.json();
          
          if (data.success && data.session) {
            const updates: Partial<GameStoreState> = {};
            
            // Character is inside session
            if (data.session.character) {
              updates.character = data.session.character;
            }
            
            if (data.session.worldTime) {
              updates.worldTime = data.session.worldTime;
            }
            
            if (data.session.daysSinceStart !== undefined) {
              updates.daysSinceStart = data.session.daysSinceStart;
            }
            
            if (Object.keys(updates).length > 0) {
              set(updates);
            }
          }
        } catch (error) {
          console.error('Failed to load state:', error);
        }
      },

      sendAction: async (action, payload) => {
        const sessionId = get().sessionId;
        if (!sessionId) return;

        const playerMessage: Message = {
          id: asMessageId(`temp-${Date.now()}`),
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
            id: asMessageId(`ai-${Date.now()}`),
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

      resetGame: () => {
        // Unload session from TruthSystem before reset
        const sessionId = get().sessionId;
        if (sessionId) {
          // Fire and forget - don't wait for response
          fetch('/api/game/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, reason: 'reset' }),
          }).catch(e => console.error('Failed to end session on reset:', e));
        }
        set(initialState as GameStoreState);
      },

      saveAndExit: async () => {
        const sessionId = get().sessionId;
        if (sessionId) {
          const service = new GameClientService();
          await service.saveGame(sessionId, true);
        }
        set(initialState as GameStoreState);
      },

      // Новые actions
      loadInventory: async () => {
        const character = get().character;
        if (!character) return;
        
        try {
          const response = await fetch(`/api/inventory?characterId=${character.id}`);
          const data = await response.json();
          if (data.success) {
            set({ inventory: data.inventory });
          }
        } catch (error) {
          console.error('Failed to load inventory:', error);
        }
      },

      loadTechniques: async () => {
        const character = get().character;
        if (!character) return;
        
        try {
          const response = await fetch(`/api/character/data?characterId=${character.id}&type=techniques`);
          const data = await response.json();
          if (data.success) {
            set({ techniques: data.techniques });
          }
        } catch (error) {
          console.error('Failed to load techniques:', error);
        }
      },

      loadSkills: async () => {
        const character = get().character;
        if (!character) return;
        
        try {
          const response = await fetch(`/api/character/data?characterId=${character.id}&type=skills`);
          const data = await response.json();
          if (data.success) {
            set({ skills: data.skills });
          }
        } catch (error) {
          console.error('Failed to load skills:', error);
        }
      },

      consumeItem: async (itemId: string) => {
        const character = get().character;
        if (!character) return { success: false, message: 'Нет персонажа' };
        
        try {
          const response = await fetch('/api/inventory/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId: character.id, itemId }),
          });
          const result = await response.json();
          
          if (result.success) {
            // Обновляем инвентарь
            set(state => ({
              inventory: result.quantityLeft > 0 
                ? state.inventory.map(item => 
                    item.id === itemId 
                      ? { ...item, quantity: result.quantityLeft }
                      : item
                  )
                : state.inventory.filter(item => item.id !== itemId),
              // Обновляем персонажа если есть изменения
              character: result.effects && state.character
                ? {
                    ...state.character,
                    currentQi: state.character.currentQi + (result.effects.qiChange || 0),
                    health: Math.min(100, state.character.health + (result.effects.healthChange || 0)),
                    fatigue: Math.max(0, state.character.fatigue + (result.effects.fatigueChange || 0)),
                    mentalFatigue: Math.max(0, state.character.mentalFatigue + (result.effects.mentalFatigueChange || 0)),
                  }
                : state.character,
            }));
          }
          
          return { success: result.success, message: result.message };
        } catch (error) {
          return { success: false, message: 'Ошибка использования' };
        }
      },

      setInputFromClick: (text: string) => {
        set({ clickedInput: text });
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

/** Selector for inventory */
export const useGameInventory = () => useGameStore(s => s.inventory);

/** Selector for techniques */
export const useGameTechniques = () => useGameStore(s => s.techniques);

/** Selector for skills */
export const useGameSkills = () => useGameStore(s => s.skills);

/** Selector for clicked input */
export const useClickedInput = () => useGameStore(s => s.clickedInput);

// ==================== ACTION HOOKS ====================

/** Hook for game actions - uses useShallow to prevent infinite loops */
export const useGameActions = () => useGameStore(
  useShallow(state => ({
    startGame: state.startGame,
    loadGame: state.loadGame,
    loadState: state.loadState,
    sendAction: state.sendAction,
    sendMessage: state.sendMessage,
    togglePause: state.togglePause,
    getSaves: state.getSaves,
    clearError: state.clearError,
    resetGame: state.resetGame,
    saveAndExit: state.saveAndExit,
    loadInventory: state.loadInventory,
    loadTechniques: state.loadTechniques,
    loadSkills: state.loadSkills,
    consumeItem: state.consumeItem,
    setInputFromClick: state.setInputFromClick,
  }))
);
