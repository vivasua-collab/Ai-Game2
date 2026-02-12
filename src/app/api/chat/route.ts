import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGameResponse, initializeLLM, isLLMReady } from "@/lib/llm";
import { buildGameMasterPrompt } from "@/data/prompts/game-master";
import type { LLMMessage } from "@/lib/llm/types";
import { logError, logInfo, logWarn, logDebug, LogTimer } from "@/lib/logger";

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
- Усталость: ${session.character.fatigue}%

ЛОКАЦИЯ: ${session.character.currentLocationId || "Неизвестно"}
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
    if (gameResponse.stateUpdate) {
      try {
        await db.character.update({
          where: { id: session.characterId },
          data: {
            ...gameResponse.stateUpdate,
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        await logWarn("DATABASE", "Failed to update character state", {
          error: dbError instanceof Error ? dbError.message : "Unknown DB error",
          characterId: session.characterId,
        });
      }
    }

    // Продвигаем время если нужно
    if (gameResponse.timeAdvance) {
      const totalMinutes =
        (gameResponse.timeAdvance.days || 0) * 24 * 60 +
        (gameResponse.timeAdvance.hours || 0) * 60 +
        gameResponse.timeAdvance.minutes;

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
        } catch (dbError) {
          await logWarn("DATABASE", "Failed to update world time", {
            error: dbError instanceof Error ? dbError.message : "Unknown DB error",
            sessionId,
          });
        }
      }
    }

    await timer.end("INFO", { sessionId, success: true });
    
    return NextResponse.json({
      success: true,
      response: gameResponse,
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
