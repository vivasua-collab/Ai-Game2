/**
 * Хук управления игровым состоянием
 * 
 * АРХИТЕКТУРА: Сервер - единственный источник истины!
 * 
 * Клиент ТОЛЬКО:
 * 1. Отображает данные от сервера
 * 2. Отправляет действия на сервер
 * 3. Получает обновлённое состояние от сервера
 * 
 * Все расчёты происходят НА СЕРВЕРЕ!
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import type { Character, Location, WorldTime, Message, GameState } from "@/types/game";

// ==================== ИНИЦИАЛЬНОЕ СОСТОЯНИЕ ====================

const initialState: GameState = {
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

// ==================== ТИПЫ ДЛЯ API ====================

interface StartGameResponse {
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

interface LoadGameResponse {
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

interface ActionResponse {
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

// ==================== ХУК ====================

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);

  // ==================== НАЧАТЬ НОВУЮ ИГРУ ====================
  
  const startGame = useCallback(
    async (variant: 1 | 2 | 3, customConfig?: Record<string, unknown>, characterName?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/game/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant, customConfig, characterName }),
        });

        const data: StartGameResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to start game");
        }

        const { session, openingNarration } = data;

        // Формируем состояние ИЗ ОТВЕТА СЕРВЕРА
        setState({
          sessionId: session.id,
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
          messages: [
            {
              id: "opening",
              type: "narration",
              sender: "narrator",
              content: openingNarration,
              createdAt: new Date().toISOString(),
            },
          ],
          isPaused: session.isPaused,
          daysSinceStart: session.daysSinceStart,
        });

        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
        return false;
      }
    },
    []
  );

  // ==================== ЗАГРУЗИТЬ СОХРАНЕНИЕ ====================
  
  const loadGame = useCallback(async (sessionId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/game/state?sessionId=${sessionId}`);
      const data: LoadGameResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load game");
      }

      // Формируем состояние ИЗ ОТВЕТА СЕРВЕРА
      setState({
        sessionId,
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
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return false;
    }
  }, []);

  // ==================== ОТПРАВИТЬ ДЕЙСТВИЕ ====================
  
  const sendAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    const sessionId = state.sessionId;
    if (!sessionId) return;

    // Добавляем сообщение игрока в UI сразу
    const playerMessage: Message = {
      id: `temp-${Date.now()}`,
      type: "player",
      sender: "player",
      content: action,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, playerMessage],
      isLoading: true,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: action, ...payload }),
      });

      const data: ActionResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Action failed");
      }

      // Добавляем ответ
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: data.response.type,
        sender: "narrator",
        content: data.response.content,
        createdAt: new Date().toISOString(),
      };

      // === ПРОВЕРКА ПЕРЕЗАПУСКА МИРА ===
      if (data.response.requiresRestart) {
        setState({
          ...initialState,
          messages: [aiMessage],
        });
        return;
      }

      // === ОБНОВЛЯЕМ СОСТОЯНИЕ ИЗ ОТВЕТА СЕРВЕРА ===
      setState((prev) => {
        // Обновляем персонажа если сервер прислал изменения
        let updatedCharacter = prev.character;
        if (data.response.characterState && prev.character) {
          updatedCharacter = {
            ...prev.character,
            ...data.response.characterState,
          };
        }

        // Обновляем время если оно изменилось
        let updatedWorldTime = prev.worldTime;
        let updatedDaysSinceStart = prev.daysSinceStart;
        
        if (data.updatedTime) {
          updatedWorldTime = {
            year: data.updatedTime.year,
            month: data.updatedTime.month,
            day: data.updatedTime.day,
            hour: data.updatedTime.hour,
            minute: data.updatedTime.minute,
            formatted: `${data.updatedTime.year} Э.С.М., ${data.updatedTime.month} месяц, ${data.updatedTime.day} день`,
            season: data.updatedTime.month <= 6 ? "тёплый" : "холодный",
          };
          updatedDaysSinceStart = data.updatedTime.daysSinceStart;
        }

        return {
          ...prev,
          messages: [...prev.messages, aiMessage],
          isLoading: false,
          character: updatedCharacter,
          worldTime: updatedWorldTime,
          daysSinceStart: updatedDaysSinceStart,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [state.sessionId]);

  // ==================== УСТАРЕВШИЙ МЕТОД (для совместимости) ====================
  
  const sendMessage = useCallback(async (message: string) => {
    return sendAction(message);
  }, [sendAction]);

  // ==================== ПАУЗА ====================
  
  const togglePause = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await fetch("/api/game/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          isPaused: !state.isPaused,
        }),
      });

      setState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
    } catch (error) {
      console.error("Toggle pause error:", error);
    }
  }, [state.sessionId, state.isPaused]);

  // ==================== СОХРАНЕНИЯ ====================
  
  const getSaves = useCallback(async () => {
    try {
      const response = await fetch("/api/game/save");
      const data = await response.json();
      return data.saves || [];
    } catch (error) {
      console.error("Get saves error:", error);
      return [];
    }
  }, []);

  // ==================== ОЧИСТКА ОШИБКИ ====================
  
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ==================== СБРОС ИГРЫ ====================
  
  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  // ==================== СОХРАНИТЬ И ВЫЙТИ ====================
  
  const saveAndExit = useCallback(async () => {
    const sessionId = state.sessionId;
    if (!sessionId) {
      setState(initialState);
      return;
    }

    try {
      await fetch("/api/game/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          isPaused: true,
        }),
      });
    } catch (error) {
      console.error("Save on exit error:", error);
    } finally {
      setState(initialState);
    }
  }, [state.sessionId]);

  return {
    ...state,
    startGame,
    loadGame,
    sendMessage,
    sendAction,
    togglePause,
    getSaves,
    clearError,
    resetGame,
    saveAndExit,
  };
}

// ==================== ЭКСПОРТ ТИПОВ ====================

export type { Character, Location, WorldTime, Message, GameState };
