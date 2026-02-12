import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGameResponse, initializeLLM } from "@/lib/llm";
import { buildGameMasterPrompt } from "@/data/prompts/game-master";
import type { LLMMessage } from "@/lib/llm/types";
import { logError, logInfo, logWarn, LogTimer } from "@/lib/logger";

// Инициализируем LLM при первом запросе
let llmInitialized = false;

export async function POST(request: NextRequest) {
  const timer = new LogTimer("API", "Chat request");
  
  try {
    // Инициализируем LLM если ещё не сделали
    if (!llmInitialized) {
      initializeLLM();
      llmInitialized = true;
      await logInfo("SYSTEM", "LLM initialized");
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      await logWarn("API", "Missing sessionId or message", { sessionId, hasMessage: !!message });
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
    }

    await logInfo("API", "Chat request received", { sessionId, messageLength: message.length });

    // Получаем сессию и персонажа
    const session = await db.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        character: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20, // Последние 20 сообщений для контекста
        },
      },
    });

    if (!session) {
      await logWarn("API", "Session not found", { sessionId });
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
    await db.message.create({
      data: {
        sessionId,
        type: "player",
        sender: "player",
        content: message,
      },
    });

    // Генерируем ответ
    const llmTimer = new LogTimer("LLM", "Generate response", sessionId);
    const gameResponse = await generateGameResponse(
      systemPrompt,
      message,
      conversationHistory
    );
    await llmTimer.end("INFO", { responseType: gameResponse.type });

    // Сохраняем ответ
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

    // Обновляем состояние персонажа если нужно
    if (gameResponse.stateUpdate) {
      await db.character.update({
        where: { id: session.characterId },
        data: {
          ...gameResponse.stateUpdate,
          updatedAt: new Date(),
        },
      });
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
      }
    }

    await timer.end("INFO", { sessionId, success: true });
    
    return NextResponse.json({
      success: true,
      response: gameResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logError("API", "Chat API error", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    await timer.end("ERROR", { success: false, error: errorMessage });
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
