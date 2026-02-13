/**
 * Главный сервис игры
 * Оркестрирует все игровые действия
 */

import type { Character, Location, WorldTime, Message } from "@/types/game";
import type { ICharacterRepository } from "@/repositories/ICharacterRepository";
import type { ISessionRepository, SessionWithContext } from "@/repositories/ISessionRepository";
import { MeditationService } from "./MeditationService";
import { identifyRequestType, routeRequest, needsLLM } from "@/lib/game/request-router";
import { generateGameResponse } from "@/lib/llm";
import { buildGameMasterPrompt } from "@/data/prompts/game-master";
import type { LLMMessage } from "@/lib/llm/types";
import { logError, logInfo, logDebug } from "@/lib/logger";

export interface GameActionResult {
  success: boolean;
  error?: string;
  response: {
    type: string;
    content: string;
    characterState?: Partial<Character>;
    timeAdvance?: { minutes?: number; hours?: number; days?: number };
    requiresRestart?: boolean;
  };
  updatedTime?: WorldTime & { daysSinceStart: number };
}

export class GameService {
  private meditationService: MeditationService;

  constructor(
    private characterRepo: ICharacterRepository,
    private sessionRepo: ISessionRepository
  ) {
    this.meditationService = new MeditationService(characterRepo);
  }

  /**
   * Обработка сообщения от игрока
   */
  async processMessage(
    sessionId: string,
    message: string
  ): Promise<GameActionResult> {
    // Получаем контекст сессии
    const context = await this.sessionRepo.findByIdWithContext(sessionId);
    if (!context) {
      return this.errorResponse("Session not found", 404);
    }

    // Определяем тип действия
    const actionType = identifyRequestType(message);

    // Маршрутизация по типу действия
    switch (actionType) {
      case "cultivation":
        return this.handleCultivation(context, message);

      case "status":
      case "techniques":
      case "inventory":
      case "stats":
      case "location_info":
        return this.handleLocalRequest(context, message, actionType);

      default:
        return this.handleNarration(context, message);
    }
  }

  /**
   * Обработка культивации (медитация/прорыв)
   */
  private async handleCultivation(
    context: SessionWithContext,
    message: string
  ): Promise<GameActionResult> {
    const lowerMessage = message.toLowerCase();
    const isBreakthrough = /прорыв|breakthrough/.test(lowerMessage);
    const meditationMatch = lowerMessage.match(/(\d+)\s*(час|минут)/);

    let durationMinutes = 60;
    if (meditationMatch) {
      const value = parseInt(meditationMatch[1]);
      const unit = meditationMatch[2];
      durationMinutes = unit === "час" ? value * 60 : value;
    }

    if (isBreakthrough) {
      const result = await this.meditationService.handleBreakthrough(context.character);

      return {
        success: true,
        response: {
          type: "narration",
          content: result.content,
          characterState: result.characterState,
          timeAdvance: result.timeAdvance,
        },
      };
    }

    // Медитация
    const result = await this.meditationService.handleMeditation(
      context.character,
      context.location,
      context.worldTime,
      durationMinutes
    );

    return {
      success: true,
      response: {
        type: result.wasInterrupted ? "interruption" : "narration",
        content: result.content,
        characterState: result.characterState,
        timeAdvance: result.timeAdvance,
        interruption: result.interruption,
      },
    };
  }

  /**
   * Обработка локальных запросов (без LLM)
   */
  private handleLocalRequest(
    context: SessionWithContext,
    message: string,
    actionType: string
  ): GameActionResult {
    const routing = routeRequest(
      message,
      context.character,
      context.location,
      context.worldTime,
      []
    );

    // Форматируем ответ
    const content = this.formatLocalResponse(routing.localData, actionType);

    return {
      success: true,
      response: {
        type: "system",
        content,
      },
    };
  }

  /**
   * Обработка повествования через LLM
   */
  private async handleNarration(
    context: SessionWithContext,
    message: string
  ): Promise<GameActionResult> {
    // Проверка мира
    if (message.trim().startsWith("--ПМ") || message.trim().toLowerCase().startsWith("--пм")) {
      return this.handleWorldCheck(context);
    }

    // Перезапуск мира
    if (message.trim().toLowerCase() === "-- перезапуск мира!") {
      return this.handleWorldRestart(context.id);
    }

    // Формируем контекст для LLM
    const worldContext = this.buildWorldContext(context);
    const systemPrompt = buildGameMasterPrompt(worldContext);

    // История сообщений
    const conversationHistory: LLMMessage[] = context.messages
      .slice(0, 20)
      .reverse()
      .map((msg) => ({
        role: (msg.sender === "player" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      }));

    // Сохраняем сообщение игрока
    await this.sessionRepo.addMessage(context.id, {
      type: "player",
      sender: "player",
      content: message,
    });

    try {
      // Генерируем ответ
      const gameResponse = await generateGameResponse(
        systemPrompt,
        message,
        conversationHistory
      );

      // Сохраняем ответ
      await this.sessionRepo.addMessage(context.id, {
        type: gameResponse.type,
        sender: "narrator",
        content: gameResponse.content,
      });

      // Обновляем состояние персонажа если нужно
      if (gameResponse.stateUpdate && Object.keys(gameResponse.stateUpdate).length > 0) {
        await this.characterRepo.update(
          context.character.id,
          gameResponse.stateUpdate as Partial<Character>
        );
      }

      // Продвигаем время
      let updatedTime = null;
      if (gameResponse.timeAdvance) {
        updatedTime = await this.advanceTime(context, gameResponse.timeAdvance);
      }

      return {
        success: true,
        response: {
          type: gameResponse.type,
          content: gameResponse.content,
          characterState: gameResponse.stateUpdate as Partial<Character>,
          timeAdvance: gameResponse.timeAdvance,
        },
        updatedTime: updatedTime || undefined,
      };
    } catch (error) {
      await logError("LLM", "Failed to generate narration", {
        error: error instanceof Error ? error.message : "Unknown",
        sessionId: context.id,
      });
      return this.errorResponse("LLM generation failed", 502);
    }
  }

  /**
   * Проверка мира (--ПМ)
   */
  private handleWorldCheck(context: SessionWithContext): GameActionResult {
    const currentFills = Math.floor(
      context.character.accumulatedQi / context.character.coreCapacity
    );
    const requiredFills =
      context.character.cultivationLevel * 10 + context.character.cultivationSubLevel;

    const content = `📋 **Проверка мира --ПМ**\n\n` +
      `**Персонаж:**\n` +
      `- Уровень культивации: ${context.character.cultivationLevel}.${context.character.cultivationSubLevel}\n` +
      `- Ци: ${context.character.currentQi}/${context.character.coreCapacity}\n` +
      `- Накоплено для прорыва: ${context.character.accumulatedQi} (${currentFills}/${requiredFills} заполнений)\n` +
      `- Физ. усталость: ${context.character.fatigue}%\n` +
      `- Мент. усталость: ${context.character.mentalFatigue}%\n\n` +
      `**Локация:** ${context.location?.name || "Неизвестно"}\n` +
      (context.location ? `- Плотность Ци: ${context.location.qiDensity} ед/м³\n` : "") +
      `\n**Время:** ${context.worldTime.year} г., ${context.worldTime.month} мес., ${context.worldTime.day} д., ${context.worldTime.hour}:${context.worldTime.minute.toString().padStart(2, "0")}`;

    return {
      success: true,
      response: {
        type: "system",
        content,
      },
    };
  }

  /**
   * Перезапуск мира
   */
  private async handleWorldRestart(sessionId: string): Promise<GameActionResult> {
    try {
      await this.sessionRepo.deleteWithRelations(sessionId);
      await logInfo("GAME", "World deleted successfully", { sessionId });

      return {
        success: true,
        response: {
          type: "system",
          content: "🔄 **Мир удалён!**\n\nНажмите кнопку для создания нового мира.",
          requiresRestart: true,
        },
      };
    } catch (error) {
      await logError("DATABASE", "Failed to delete world", {
        error: error instanceof Error ? error.message : "Unknown",
        sessionId,
      });
      return this.errorResponse("Failed to delete world", 500);
    }
  }

  /**
   * Продвижение времени
   */
  private async advanceTime(
    context: SessionWithContext,
    timeAdvance: { minutes?: number; hours?: number; days?: number }
  ): Promise<WorldTime & { daysSinceStart: number }> {
    const totalMinutes =
      (timeAdvance.days || 0) * 24 * 60 +
      (timeAdvance.hours || 0) * 60 +
      (timeAdvance.minutes || 0);

    if (totalMinutes <= 0) {
      return { ...context.worldTime, daysSinceStart: context.daysSinceStart };
    }

    let { minute, hour, day, month, year } = {
      minute: context.worldTime.minute + totalMinutes,
      hour: context.worldTime.hour,
      day: context.worldTime.day,
      month: context.worldTime.month,
      year: context.worldTime.year,
    };
    let daysSinceStart = context.daysSinceStart;

    // Обработка переполнения
    while (minute >= 60) {
      minute -= 60;
      hour++;
    }
    while (hour >= 24) {
      hour -= 24;
      day++;
      daysSinceStart++;
    }
    while (day > 30) {
      day -= 30;
      month++;
    }
    while (month > 12) {
      month -= 12;
      year++;
    }

    // Обновляем в БД
    await this.sessionRepo.updateTime(context.id, {
      year,
      month,
      day,
      hour,
      minute,
      daysSinceStart,
    });

    return {
      year,
      month,
      day,
      hour,
      minute,
      formatted: `${year} Э.С.М., ${month} мес., ${day} дн.`,
      season: month <= 6 ? "тёплый" : "холодный",
      daysSinceStart,
    };
  }

  /**
   * Формирование контекста мира
   */
  private buildWorldContext(context: SessionWithContext): string {
    return `
=== ТЕКУЩЕЕ СОСТОЯНИЕ ===
Дата: ${context.worldTime.year} год, ${context.worldTime.month} месяц, ${context.worldTime.day} день
Время: ${context.worldTime.hour}:${context.worldTime.minute.toString().padStart(2, "0")}
Дней с прибытия: ${context.daysSinceStart}

ПЕРСОНАЖ:
- Уровень культивации: ${context.character.cultivationLevel}.${context.character.cultivationSubLevel}
- Ци: ${context.character.currentQi}/${context.character.coreCapacity}
- Здоровье: ${context.character.health}%
- Физическая усталость: ${context.character.fatigue}%
- Ментальная усталость: ${context.character.mentalFatigue}%

ЛОКАЦИЯ: ${context.location?.name || "Неизвестно"}
${context.location ? `- Плотность Ци: ${context.location.qiDensity} ед/м³` : ""}
`;
  }

  /**
   * Форматирование локального ответа
   */
  private formatLocalResponse(data: unknown, requestType: string): string {
    if (!data) return "Данные не найдены";

    const response = data as Record<string, unknown>;

    switch (requestType) {
      case "status": {
        const char = response.character as Record<string, unknown>;
        const time = response.worldTime as Record<string, unknown> | null;
        return `📊 **Статус персонажа**

🧘 Культивация: ${char?.cultivation || "N/A"}
⚡ Ци: ${char?.qi ? `${(char.qi as Record<string, unknown>)?.current}/${(char.qi as Record<string, unknown>)?.max}` : "N/A"}
❤️ Здоровье: ${char?.health || "N/A"}%
😫 Физ. усталость: ${char?.fatigue || "N/A"}%
🧠 Мент. усталость: ${char?.mentalFatigue || 0}%

${time ? `📅 ${time.year} Э.С.М.` : ""}`;
      }

      case "stats": {
        const stats = response.stats as Record<string, unknown> | undefined;
        const core = response.core as Record<string, unknown> | undefined;
        return `📈 **Характеристики**

💪 Сила: ${stats?.strength?.toFixed(2) || "N/A"}
🏃 Ловкость: ${stats?.agility?.toFixed(2) || "N/A"}
🧠 Интеллект: ${stats?.intelligence?.toFixed(2) || "N/A"}
⚡ Проводимость: ${stats?.conductivity?.toFixed(2) || "N/A"} ед/сек

💎 **Ядро**
Ёмкость: ${core?.capacity || "N/A"} ед.`;
      }

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Формирование ответа с ошибкой
   */
  private errorResponse(error: string, status: number): GameActionResult {
    return {
      success: false,
      error,
      response: {
        type: "error",
        content: `❌ ${error}`,
      },
    };
  }
}
