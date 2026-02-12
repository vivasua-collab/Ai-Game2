import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGameResponse, initializeLLM, isLLMReady } from "@/lib/llm";
import { buildGameMasterPrompt } from "@/data/prompts/game-master";
import type { LLMMessage } from "@/lib/llm/types";
import { logError, logInfo, logWarn, logDebug, LogTimer } from "@/lib/logger";
import {
  identifyRequestType,
  routeRequest,
  needsLLM,
  type RequestType,
} from "@/lib/game/request-router";
import {
  performMeditation,
  calculateQiAccumulationRate,
  attemptBreakthrough,
  calculatePassiveQiGain,
  type MeditationType,
} from "@/lib/game/qi-system";
import {
  calculateFatigueFromAction,
  calculateEfficiencyModifiers,
  type ActionType,
} from "@/lib/game/fatigue-system";

// Инициализируем LLM при первом запросе
let llmInitialized = false;

export async function POST(request: NextRequest) {
  const timer = new LogTimer("API", "Chat request");
  
  try {
    // Инициализируем LLM если ещё не сделали
    if (!llmInitialized) {
      try {
        initializeLLM();
        llmInitialized = true;
        await logInfo("SYSTEM", "LLM provider initialized successfully");
      } catch (initError) {
        await logError("LLM", "Failed to initialize LLM provider", {
          error: initError instanceof Error ? initError.message : "Unknown init error",
          stack: initError instanceof Error ? initError.stack : undefined,
        });
        return NextResponse.json(
          { 
            error: "LLM initialization failed", 
            message: initError instanceof Error ? initError.message : "Unknown initialization error",
            component: "LLM_PROVIDER",
          },
          { status: 503 }
        );
      }
    }

    // Проверяем готовность LLM
    if (!isLLMReady()) {
      await logWarn("LLM", "LLM provider not ready", {
        initialized: llmInitialized,
      });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      await logWarn("API", "Missing required parameters", { 
        hasSessionId: !!sessionId, 
        hasMessage: !!message,
        sessionId: sessionId || "missing",
      });
      return NextResponse.json(
        { error: "sessionId and message are required", component: "API_VALIDATION" },
        { status: 400 }
      );
    }

    await logDebug("API", "Chat request received", { sessionId, messageLength: message.length });

    // Получаем сессию и персонажа
    let session;
    try {
      session = await db.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          character: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 20, // Последние 20 сообщений для контекста
          },
        },
      });
    } catch (dbError) {
      await logError("DATABASE", "Failed to fetch game session", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        stack: dbError instanceof Error ? dbError.stack : undefined,
        sessionId,
        operation: "findUnique",
      });
      return NextResponse.json(
        { 
          error: "Database error", 
          message: dbError instanceof Error ? dbError.message : "Database operation failed",
          component: "DATABASE",
        },
        { status: 500 }
      );
    }

    if (!session) {
      await logWarn("API", "Session not found", { sessionId });
      return NextResponse.json(
        { error: "Session not found", component: "SESSION", sessionId },
        { status: 404 }
      );
    }

    if (!session.character) {
      await logError("GAME", "Session has no associated character", { sessionId });
      return NextResponse.json(
        { error: "Session has no character", component: "CHARACTER", sessionId },
        { status: 500 }
      );
    }

    // Получаем текущую локацию
    let location = null;
    if (session.character.currentLocationId) {
      try {
        location = await db.location.findUnique({
          where: { id: session.character.currentLocationId },
        });
      } catch (e) {
        await logWarn("DATABASE", "Failed to fetch location", { locationId: session.character.currentLocationId });
      }
    }

    // Определяем тип запроса через маршрутизатор
    const requestType = identifyRequestType(message);
    await logDebug("GAME", "Request identified", { requestType, message: message.substring(0, 50) });

    // Обрабатываем локальные запросы без LLM
    if (!needsLLM(message)) {
      const routing = routeRequest(message, session.character, location, null, []);
      await logInfo("GAME", "Local request processed", { requestType, useLLM: routing.useLLM });
      
      return NextResponse.json({
        success: true,
        response: {
          type: "system",
          content: formatLocalResponse(routing.localData, requestType),
          stateUpdate: null,
          timeAdvance: null,
        },
        updatedTime: null,
      });
    }

    // Проверка мира (--ПМ) - возвращаем текущее состояние без LLM расчётов
    if (message.trim().startsWith("--ПМ") || message.trim().toLowerCase().startsWith("--пм")) {
      const verifyResult = {
        character: {
          cultivationLevel: session.character.cultivationLevel,
          cultivationSubLevel: session.character.cultivationSubLevel,
          currentQi: session.character.currentQi,
          coreCapacity: session.character.coreCapacity,
          accumulatedQi: session.character.accumulatedQi,
          fatigue: session.character.fatigue,
          mentalFatigue: session.character.mentalFatigue || 0,
        },
        location: location ? {
          name: location.name,
          qiDensity: location.qiDensity,
          terrainType: location.terrainType,
        } : null,
        worldTime: {
          year: session.worldYear,
          month: session.worldMonth,
          day: session.worldDay,
          hour: session.worldHour,
          minute: session.worldMinute,
        },
      };
      
      return NextResponse.json({
        success: true,
        response: {
          type: "system",
          content: `📋 **Проверка мира --ПМ**\n\n` +
            `**Персонаж:**\n` +
            `- Уровень культивации: ${verifyResult.character.cultivationLevel}.${verifyResult.character.cultivationSubLevel}\n` +
            `- Ци: ${verifyResult.character.currentQi}/${verifyResult.character.coreCapacity}\n` +
            `- Накоплено для прорыва: ${verifyResult.character.accumulatedQi}\n` +
            `- Физ. усталость: ${verifyResult.character.fatigue}%\n` +
            `- Мент. усталость: ${verifyResult.character.mentalFatigue}%\n\n` +
            `**Локация:** ${verifyResult.location?.name || "Неизвестно"}\n` +
            (verifyResult.location ? `- Плотность Ци: ${verifyResult.location.qiDensity} ед/м³\n` : "") +
            `\n**Время:** ${verifyResult.worldTime.year} г., ${verifyResult.worldTime.month} мес., ${verifyResult.worldTime.day} д., ${verifyResult.worldTime.hour}:${verifyResult.worldTime.minute.toString().padStart(2, "0")}`,
          stateUpdate: null,
          timeAdvance: null,
        },
        updatedTime: null,
      });
    }

    // Определяем действие для механик
    let mechanicsUpdate: Record<string, unknown> = {};
    let timeAdvanceForMechanics = { minutes: 0 };

    // Обработка медитации - возвращаем результат БЕЗ LLM
    if (requestType === "cultivation") {
      const lowerMessage = message.toLowerCase();
      const isBreakthrough = /прорыв|breakthrough/.test(lowerMessage);
      const meditationMatch = lowerMessage.match(/(\d+)\s*(час|минут)/);
      
      let durationMinutes = 60; // дефолт 1 час
      if (meditationMatch) {
        const value = parseInt(meditationMatch[1]);
        const unit = meditationMatch[2];
        durationMinutes = unit === "час" ? value * 60 : value;
      }

      if (isBreakthrough) {
        // Попытка прорыва
        const result = attemptBreakthrough(session.character);
        if (result.success) {
          mechanicsUpdate = {
            cultivationLevel: result.newLevel,
            cultivationSubLevel: result.newSubLevel,
            coreCapacity: result.newCoreCapacity,
            accumulatedQi: session.character.accumulatedQi - result.qiConsumed,
            fatigue: Math.min(100, session.character.fatigue + result.fatigueGained.physical),
            mentalFatigue: Math.min(100, (session.character.mentalFatigue || 0) + result.fatigueGained.mental),
          };
        }
        timeAdvanceForMechanics.minutes = 30; // Прорыв занимает 30 минут
        
        // Обновляем БД
        await db.character.update({
          where: { id: session.characterId },
          data: { ...mechanicsUpdate, updatedAt: new Date() },
        });
        
        return NextResponse.json({
          success: true,
          response: {
            type: "narration",
            content: result.success 
              ? `⚡ ${result.message} Ёмкость ядра увеличена до ${result.newCoreCapacity}.`
              : `❌ ${result.message}`,
            stateUpdate: mechanicsUpdate,
            timeAdvance: { minutes: 30 },
          },
          updatedTime: null,
        });
      } else {
        // Накопление Ци
        const meditationType: MeditationType = "accumulation";
        const result = performMeditation(session.character, location, durationMinutes, meditationType);
        
        if (result.success) {
          mechanicsUpdate = {
            currentQi: Math.min(session.character.coreCapacity, session.character.currentQi + result.qiGained),
            fatigue: Math.min(100, session.character.fatigue + result.fatigueGained.physical),
            mentalFatigue: Math.min(100, (session.character.mentalFatigue || 0) + result.fatigueGained.mental),
          };
          timeAdvanceForMechanics.minutes = result.duration;
        }
        
        // Обновляем БД
        await db.character.update({
          where: { id: session.characterId },
          data: { ...mechanicsUpdate, updatedAt: new Date() },
        });
        
        // Сохраняем сообщение
        await db.message.create({
          data: {
            sessionId,
            type: "narration",
            sender: "narrator",
            content: `Медитация ${result.wasInterrupted ? "прервана" : "завершена"}. ` +
              `Накоплено Ци: +${result.qiGained} (теперь ${session.character.currentQi + result.qiGained}/${session.character.coreCapacity}). ` +
              `Время: ${result.duration} мин.`,
          },
        });
        
        return NextResponse.json({
          success: true,
          response: {
            type: "narration",
            content: result.wasInterrupted && result.interruptionReason
              ? `⚠️ ${result.interruptionReason}\n\nНакоплено Ци: +${result.qiGained} (теперь ${session.character.currentQi + result.qiGained}/${session.character.coreCapacity}).`
              : `🧘 Медитация завершена.\n\nНакоплено Ци: +${result.qiGained} (теперь ${session.character.currentQi + result.qiGained}/${session.character.coreCapacity}).\nВремя: ${result.duration} мин.`,
            stateUpdate: mechanicsUpdate,
            timeAdvance: { minutes: result.duration },
          },
          updatedTime: null,
        });
      }
    }

    // Обработка боя
    if (requestType === "combat") {
      const fatigueResult = calculateFatigueFromAction(session.character, "combat_light", 5);
      mechanicsUpdate = {
        fatigue: fatigueResult.physicalFatigue,
        mentalFatigue: fatigueResult.mentalFatigue,
      };
      timeAdvanceForMechanics.minutes = 5;
    }

    // Формируем системный промпт с текущим состоянием
    const worldContext = `
=== ТЕКУЩЕЕ СОСТОЯНИЕ ===
Дата: ${session.worldYear} год, ${session.worldMonth} месяц, ${session.worldDay} день
Время: ${session.worldHour}:${session.worldMinute.toString().padStart(2, "0")}
Дней с прибытия: ${session.daysSinceStart}

ПЕРСОНАЖ:
- Уровень культивации: ${session.character.cultivationLevel}.${session.character.cultivationSubLevel}
- Ци: ${session.character.currentQi}/${session.character.coreCapacity}
- Здоровье: ${session.character.health}%
- Физическая усталость: ${session.character.fatigue}%
- Ментальная усталость: ${session.character.mentalFatigue || 0}%

ЛОКАЦИЯ: ${location?.name || "Неизвестно"}
${location ? `- Плотность Ци: ${location.qiDensity} ед/м³` : ""}
`;

    const systemPrompt = buildGameMasterPrompt(worldContext);

    // Формируем историю сообщений
    const conversationHistory: LLMMessage[] = session.messages
      .reverse()
      .map((msg) => ({
        role: (msg.sender === "player" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      }));

    // Сохраняем сообщение игрока
    try {
      await db.message.create({
        data: {
          sessionId,
          type: "player",
          sender: "player",
          content: message,
        },
      });
    } catch (dbError) {
      await logError("DATABASE", "Failed to save player message", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        stack: dbError instanceof Error ? dbError.stack : undefined,
        sessionId,
        operation: "message.create",
      });
      // Продолжаем даже если не удалось сохранить
    }

    // Генерируем ответ
    let gameResponse;
    try {
      const llmTimer = new LogTimer("LLM", "Generate response", sessionId);
      gameResponse = await generateGameResponse(
        systemPrompt,
        message,
        conversationHistory
      );
      await llmTimer.end("INFO", { responseType: gameResponse.type });
    } catch (llmError) {
      await logError("LLM", "Failed to generate game response", {
        error: llmError instanceof Error ? llmError.message : "Unknown LLM error",
        stack: llmError instanceof Error ? llmError.stack : undefined,
        sessionId,
        messageLength: message.length,
        historyLength: conversationHistory.length,
      });
      return NextResponse.json(
        { 
          error: "LLM generation failed", 
          message: llmError instanceof Error ? llmError.message : "AI response generation failed",
          component: "LLM_GENERATION",
        },
        { status: 502 }
      );
    }

    // Сохраняем ответ
    try {
      await db.message.create({
        data: {
          sessionId,
          type: gameResponse.type,
          sender: "narrator",
          content: gameResponse.content,
          metadata: gameResponse.stateUpdate
            ? JSON.stringify(gameResponse.stateUpdate)
            : null,
        },
      });
    } catch (dbError) {
      await logWarn("DATABASE", "Failed to save narrator message", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        sessionId,
      });
      // Продолжаем даже если не удалось сохранить
    }

    // Обновляем состояние персонажа если нужно
    // Объединяем обновления от механик и от LLM (механики приоритетнее)
    const combinedStateUpdate = {
      ...gameResponse.stateUpdate,
      ...mechanicsUpdate,
    };
    
    if (Object.keys(combinedStateUpdate).length > 0) {
      try {
        await db.character.update({
          where: { id: session.characterId },
          data: {
            ...combinedStateUpdate,
            updatedAt: new Date(),
          },
        });
        await logDebug("GAME", "Character state updated", { 
          keys: Object.keys(combinedStateUpdate),
          hasMechanics: Object.keys(mechanicsUpdate).length > 0,
        });
      } catch (dbError) {
        await logWarn("DATABASE", "Failed to update character state", {
          error: dbError instanceof Error ? dbError.message : "Unknown DB error",
          characterId: session.characterId,
        });
      }
    }

    // Продвигаем время если нужно
    let updatedTime = null;
    
    // Объединяем продвижение времени от LLM и механик
    const totalMinutesFromLLM = gameResponse.timeAdvance
      ? (gameResponse.timeAdvance.days || 0) * 24 * 60 +
        (gameResponse.timeAdvance.hours || 0) * 60 +
        gameResponse.timeAdvance.minutes
      : 0;
    
    const totalMinutes = totalMinutesFromLLM + timeAdvanceForMechanics.minutes;

    if (totalMinutes > 0) {
      let newMinute = session.worldMinute + totalMinutes;
      let newHour = session.worldHour;
      let newDay = session.worldDay;
      let newMonth = session.worldMonth;
      let newYear = session.worldYear;
      let daysSinceStart = session.daysSinceStart;

      // Обрабатываем переполнение
      while (newMinute >= 60) {
        newMinute -= 60;
        newHour++;
      }

      while (newHour >= 24) {
        newHour -= 24;
        newDay++;
        daysSinceStart++;
      }

      while (newDay > 30) {
        newDay -= 30;
        newMonth++;
      }

      while (newMonth > 12) {
        newMonth -= 12;
        newYear++;
      }

      try {
        await db.gameSession.update({
          where: { id: sessionId },
          data: {
            worldMinute: newMinute,
            worldHour: newHour,
            worldDay: newDay,
            worldMonth: newMonth,
            worldYear: newYear,
            daysSinceStart,
            updatedAt: new Date(),
          },
        });
        
        // Сохраняем обновлённое время для ответа
        updatedTime = {
          year: newYear,
          month: newMonth,
          day: newDay,
          hour: newHour,
          minute: newMinute,
          daysSinceStart,
        };
      } catch (dbError) {
        await logWarn("DATABASE", "Failed to update world time", {
          error: dbError instanceof Error ? dbError.message : "Unknown DB error",
          sessionId,
        });
      }
    }

    await timer.end("INFO", { sessionId, success: true });
    
    return NextResponse.json({
      success: true,
      response: gameResponse,
      updatedTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.constructor.name : "UnknownError";
    
    await logError("API", "Chat API critical error", {
      error: errorMessage,
      errorType: errorName,
      stack: errorStack,
    });
    await timer.end("ERROR", { success: false, error: errorMessage });
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        component: "API_CRITICAL",
        errorType: errorName,
      },
      { status: 500 }
    );
  }
}

// Функция форматирования локальных ответов
function formatLocalResponse(data: unknown, requestType: RequestType): string {
  if (!data) return "Данные не найдены";
  
  const response = data as Record<string, unknown>;
  
  switch (requestType) {
    case "status": {
      const char = response.character as Record<string, unknown>;
      const time = response.worldTime as Record<string, unknown> | null;
      return `📊 **Статус персонажа**

🧘 Культивация: ${char?.cultivation || "N/A"}
⚡ Ци: ${char?.qi ? `${(char.qi as Record<string, unknown>)?.current}/${(char.qi as Record<string, unknown>)?.max} (${(char.qi as Record<string, unknown>)?.percent}%)` : "N/A"}
❤️ Здоровье: ${char?.health || "N/A"}%
😫 Физ. усталость: ${char?.fatigue || "N/A"}%
🧠 Мент. усталость: ${char?.mentalFatigue || 0}%
🎂 Возраст: ${char?.age || "N/A"} лет

${time ? `📅 ${time.year} Э.С.М., ${time.month} месяц, ${time.day} день, ${time.time}` : ""}`;
    }
    
    case "techniques": {
      const techniques = response.techniques as Array<Record<string, unknown>> | undefined;
      return `📚 **Изученные техники** (${response.count || 0})

${techniques && techniques.length > 0 
  ? techniques.map((t, i) => `${i + 1}. **${t.name}** (${t.type}, ${t.element}) - Ци: ${t.qiCost}, Мастерство: ${t.mastery}%`).join("\n")
  : "Нет изученных техник"}`;
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
Ёмкость: ${core?.capacity || "N/A"} ед.
Текущая Ци: ${core?.currentQi || "N/A"}
Накоплено для прорыва: ${core?.accumulatedQi || "N/A"}`;
    }
    
    case "location": {
      const loc = response.location as Record<string, unknown> | undefined;
      return `📍 **Локация**

Название: ${loc?.name || "Неизвестно"}
Тип местности: ${loc?.terrainType || "N/A"}
Плотность Ци: ${loc?.qiDensity || "N/A"} ед/м³
Расстояние от центра: ${loc?.distanceFromCenter || "N/A"} км`;
    }
    
    case "inventory": {
      return `🎒 **Инвентарь**

${(response.items as Array<Record<string, unknown>>)?.length > 0 
  ? (response.items as Array<Record<string, unknown>>).map((item, i) => `${i + 1}. ${item.name} x${item.quantity}`).join("\n")
  : (response.message as string) || "Инвентарь пуст"}`;
    }
    
    default:
      return JSON.stringify(data, null, 2);
  }
}
