"use client";

import { useState, useCallback, useEffect } from "react";

// Типы
export interface Character {
  id: string;
  name: string;
  age: number;
  cultivationLevel: number;
  cultivationSubLevel: number;
  currentQi: number;
  coreCapacity: number;
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;
  health: number;
  fatigue: number;
  mentalFatigue: number;
  hasAmnesia: boolean;
  knowsAboutSystem: boolean;
  sectRole: string | null;
  currentLocation?: Location;
  sect?: Sect;
}

export interface Location {
  id: string;
  name: string;
  distanceFromCenter: number;
  qiDensity: number;
  terrainType: string;
}

export interface Sect {
  id: string;
  name: string;
  description?: string;
  powerLevel: number;
}

export interface Message {
  id: string;
  type: string;
  sender: string | null;
  content: string;
  createdAt: string;
}

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formatted: string;
  season: string;
}

export interface GameState {
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isPaused: boolean;
  daysSinceStart: number;
}

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

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);

  // Начать новую игру
  const startGame = useCallback(
    async (variant: 1 | 2 | 3, customConfig?: Record<string, unknown>, characterName?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/game/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant, customConfig, characterName }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to start game");
        }

        const { session, openingNarration } = data;

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
          location: session.character.currentLocation,
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

  // Загрузить сохранение
  const loadGame = useCallback(async (sessionId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/game/state?sessionId=${sessionId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load game");
      }

      setState({
        sessionId,
        isLoading: false,
        error: null,
        character: data.session.character,
        worldTime: data.session.worldTime,
        location: data.session.character.currentLocation,
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

  // Отправить сообщение
  const sendMessage = useCallback(async (message: string) => {
    const sessionId = state.sessionId;
    if (!sessionId) return;

    // Добавляем сообщение игрока в UI сразу
    const playerMessage: Message = {
      id: `temp-${Date.now()}`,
      type: "player",
      sender: "player",
      content: message,
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
        body: JSON.stringify({ sessionId, message }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      // Добавляем ответ и обновляем состояние
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: data.response.type,
        sender: "narrator",
        content: data.response.content,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        // Обновляем персонажа если есть изменения
        const updatedCharacter = data.response.stateUpdate
          ? { ...prev.character!, ...data.response.stateUpdate }
          : prev.character;

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

  // Переключить паузу
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

  // Получить список сохранений
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

  // Очистить ошибку
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Сбросить игру
  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  // Сохранить и выйти
  const saveAndExit = useCallback(async () => {
    const sessionId = state.sessionId;
    if (!sessionId) {
      // Если нет сессии, просто сбрасываем
      setState(initialState);
      return;
    }

    try {
      // Сохраняем текущее состояние
      await fetch("/api/game/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          isPaused: true, // Ставим на паузу при выходе
        }),
      });
    } catch (error) {
      console.error("Save on exit error:", error);
    } finally {
      // В любом случае сбрасываем состояние
      setState(initialState);
    }
  }, [state.sessionId]);

  return {
    ...state,
    startGame,
    loadGame,
    sendMessage,
    togglePause,
    getSaves,
    clearError,
    resetGame,
    saveAndExit,
  };
}
