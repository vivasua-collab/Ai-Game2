"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  applyQiDelta, 
  type QiDelta,
  type QiCalculationResult 
} from "@/lib/game/qi-client";

// Типы
export interface Character {
  id: string;
  name: string;
  age: number;
  cultivationLevel: number;
  cultivationSubLevel: number;
  currentQi: number;
  coreCapacity: number;
  accumulatedQi: number;       // Накопленная Ци для прорыва
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
  skills?: Record<string, number>;  // Навыки: { "deep_meditation": 3, ... }
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

// Локальное состояние Ци (приоритет над сервером)
export interface LocalQiState {
  currentQi: number;
  lastUpdate: number;
  pendingDelta: number;
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
  localQi: LocalQiState | null; // Локальное состояние Ци
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
  localQi: null,
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
          // Инициализируем локальное состояние Ци
          localQi: {
            currentQi: session.character.currentQi,
            lastUpdate: Date.now(),
            pendingDelta: 0,
          },
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
        // Инициализируем локальное состояние Ци из сохранения
        localQi: {
          currentQi: data.session.character.currentQi,
          lastUpdate: Date.now(),
          pendingDelta: 0,
        },
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

      // === ПРОВЕРКА ПЕРЕЗАПУСКА МИРА ===
      if (data.response.requiresRestart) {
        // Сбрасываем состояние и возвращаем на старт
        setState({
          ...initialState,
          messages: [aiMessage],
        });
        return;
      }

      setState((prev) => {
        // === ЛОКАЛЬНЫЙ РАСЧЁТ ЦИ ===
        // Приоритет: локальное состояние > данные от сервера
        let updatedLocalQi = prev.localQi;
        let qiChangeMessage = "";
        let accumulatedQiGained = 0;
        
        if (data.response.qiDelta && prev.localQi && prev.character) {
          const qiDelta: QiDelta = data.response.qiDelta;
          const result = applyQiDelta(
            prev.localQi.currentQi,
            qiDelta,
            prev.character.coreCapacity,
            qiDelta.isBreakthrough || false
          );
          
          updatedLocalQi = {
            currentQi: result.newQi,
            lastUpdate: Date.now(),
            pendingDelta: 0,
          };
          
          // Если ядро было заполнено - сохраняем прирост accumulatedQi
          if (qiDelta.accumulatedGain) {
            accumulatedQiGained = qiDelta.accumulatedGain;
          }
          
          // Формируем сообщение об изменении Ци
          if (result.qiGained > 0) {
            // Положительное изменение
            if (qiDelta.accumulatedGain) {
              // Ядро заполнено! Показываем прогресс прорыва
              const newAccumulated = (prev.character?.accumulatedQi || 0) + qiDelta.accumulatedGain;
              const currentFills = Math.floor(newAccumulated / prev.character!.coreCapacity);
              const requiredFills = prev.character!.cultivationLevel * 10 + prev.character!.cultivationSubLevel;
              qiChangeMessage = `\n\n⚡ Ядро заполнено! Прогресс: ${currentFills}/${requiredFills} заполнений\n⚠️ Потратьте Ци чтобы продолжить!`;
            } else {
              qiChangeMessage = `\n\n⚡ Ци: +${result.qiGained}`;
              if (result.overflow > 0) {
                qiChangeMessage += ` (${result.overflow} рассеялось в среду)`;
              }
            }
          } else if (qiDelta.qiChange < 0) {
            // Отрицательное изменение (затраты)
            qiChangeMessage = `\n\n⚡ Ци: ${qiDelta.qiChange}`;
          }
        }
        
        // Обновляем персонажа с локальным значением Ци
        let updatedCharacter = prev.character ? { ...prev.character } : null;
        
        if (updatedCharacter) {
          // Используем ЛОКАЛЬНОЕ значение Ци (приоритет!)
          if (updatedLocalQi) {
            updatedCharacter.currentQi = updatedLocalQi.currentQi;
          }
          
          // Обновляем accumulatedQi если был прирост
          if (accumulatedQiGained > 0) {
            updatedCharacter.accumulatedQi = (updatedCharacter.accumulatedQi || 0) + accumulatedQiGained;
          }
          
          // Применяем изменение усталости (может быть + или -)
          if (data.response.fatigueDelta) {
            // fatigueDelta может быть отрицательным (медитация снимает) или положительным (бой добавляет)
            updatedCharacter.fatigue = Math.max(0, Math.min(100, 
              (updatedCharacter.fatigue || 0) + (data.response.fatigueDelta.physical || 0)
            ));
            updatedCharacter.mentalFatigue = Math.max(0, Math.min(100,
              (updatedCharacter.mentalFatigue || 0) + (data.response.fatigueDelta.mental || 0)
            ));
          }
          
          // Совместимость со старым форматом stateUpdate
          if (data.response.stateUpdate) {
            // НЕ перезаписываем currentQi из stateUpdate если есть qiDelta!
            const { currentQi, ...otherUpdates } = data.response.stateUpdate;
            updatedCharacter = { ...updatedCharacter, ...otherUpdates };
          }
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

        // Добавляем информацию о Ци в контент если есть изменения
        const finalContent = data.response.content + qiChangeMessage;

        return {
          ...prev,
          messages: [...prev.messages, { ...aiMessage, content: finalContent }],
          isLoading: false,
          character: updatedCharacter,
          worldTime: updatedWorldTime,
          daysSinceStart: updatedDaysSinceStart,
          localQi: updatedLocalQi,
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
