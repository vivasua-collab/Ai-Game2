import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Location as PrismaLocation, Sect as PrismaSect } from "@prisma/client";
import { generateGameResponse, initializeLLM, isLLMReady } from "@/lib/llm";
import { buildGameMasterPrompt } from "@/data/prompts/game-master";
import type { LLMMessage } from "@/lib/llm/types";
import { parseCommand } from "@/lib/llm/types";
import { logError, logInfo, logWarn, logDebug, LogTimer } from "@/lib/logger";
import {
  identifyRequestType,
  routeRequest,
  needsLLM,
  type RequestType,
} from "@/lib/game/request-router";
import {
  performMeditation,
  attemptBreakthrough,
} from "@/lib/game/qi-system";
import { calculateBreakthroughRequirements } from "@/lib/game/qi-shared";
import { getQiUnderstandingCap } from "@/lib/game/qi-insight";
import {
  calculateFatigueFromAction,
  calculateEfficiencyModifiers,
  type ActionType,
} from "@/lib/game/fatigue-system";
import {
  checkMeditationInterruption,
  generateInterruptionPrompt,
  getLocationDangerLevel,
  calculateInterruptionChance,
} from "@/lib/game/meditation-interruption";
import {
  sendMessageSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";
import { executeCheat, isCheatsEnabled, type CheatCommand } from "@/services/cheats.service";

// ==================== HELPER FUNCTIONS ====================

/**
 * Вычисляет обновлённое время на основе текущего и смещения в минутах
 * Используется для синхронизации времени между сервером и клиентом
 */
function calculateUpdatedTime(
  session: { worldYear: number; worldMonth: number; worldDay: number; worldHour: number; worldMinute: number; daysSinceStart: number },
  minutesToAdd: number
): { year: number; month: number; day: number; hour: number; minute: number; daysSinceStart: number } {
  let newMinute = session.worldMinute + minutesToAdd;
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

  return {
    year: newYear,
    month: newMonth,
    day: newDay,
    hour: newHour,
    minute: newMinute,
    daysSinceStart,
  };
}

// Инициализируем LLM при первом запросе
let llmInitialized = false;

export async function POST(request: NextRequest) {
  const timer = new LogTimer("API", "Chat request");
  
  // Инициализируем переменные для механик
  let mechanicsUpdate: Record<string, unknown> = {};
  const timeAdvanceForMechanics = { minutes: 0 };
  
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
    
    // Zod validation
    const validation = validateOrError(sendMessageSchema, body);
    if (!validation.success) {
      await logWarn("API", "Validation failed", { 
        error: validation.error,
        body: { sessionId: body.sessionId ? 'present' : 'missing', messageLength: body.message?.length || 0 },
      });
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }
    
    const { sessionId, message } = validation.data;

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
    let location: PrismaLocation | null = null;
    if (session.character.currentLocationId) {
      try {
        location = await db.location.findUnique({
          where: { id: session.character.currentLocationId },
        });
      } catch (e) {
        await logWarn("DATABASE", "Failed to fetch location", { locationId: session.character.currentLocationId });
      }
    }

    // === ОБРАБОТКА ЧИТ-КОМАНД ===
    const parsedCommand = parseCommand(message);
    if (parsedCommand.type === "cheat") {
      if (!isCheatsEnabled()) {
        return NextResponse.json({
          success: false,
          response: {
            type: "system",
            content: "⛔ Читы отключены. Установите NODE_ENV=development или ENABLE_CHEATS=true",
          },
        });
      }

      const cheatResult = await executeCheat(
        parsedCommand.cheatCommand as CheatCommand,
        session.character.id,
        parsedCommand.cheatParams || {}
      );

      // Получаем обновлённого персонажа
      const updatedCharacter = await db.character.findUnique({
        where: { id: session.character.id },
      });

      return NextResponse.json({
        success: cheatResult.success,
        response: {
          type: "system",
          content: cheatResult.message,
          characterState: updatedCharacter,
          cheatData: cheatResult.data,
        },
        updatedTime: {
          year: session.worldYear,
          month: session.worldMonth,
          day: session.worldDay,
          hour: session.worldHour,
          minute: session.worldMinute,
          daysSinceStart: session.daysSinceStart,
        },
      });
    }

    // Определяем тип запроса через маршрутизатор
    const requestType = identifyRequestType(message);
    await logDebug("GAME", "Request identified", { requestType, message: message.substring(0, 50) });

    // === ОБРАБОТКА ОТВЕТОВ НА ПРЕРЫВАНИЕ МЕДИТАЦИИ ===
    // Игрок может выбрать: ignore, confront, hide
    const lowerMessage = message.toLowerCase().trim();
    const isInterruptionResponse = 
      lowerMessage === "проигнорировать" || 
      lowerMessage === "1" ||
      lowerMessage === "встать и встретить" || 
      lowerMessage === "2" ||
      lowerMessage === "скрыться" || 
      lowerMessage === "3" ||
      lowerMessage.includes("игнорир") ||
      lowerMessage.includes("встретить") ||
      lowerMessage.includes("скрыть");
    
    if (isInterruptionResponse) {
      // Получаем последнее сообщение о прерывании из истории
      const lastInterruption = session.messages.find(m => 
        m.type === "narration" && 
        m.content && 
        m.content.includes("Медитация прервана")
      );
      
      if (lastInterruption) {
        let responseContent = "";
        let mechanicsUpdate: Record<string, unknown> = {};
        let timeMinutes = 10;
        
        if (lowerMessage.includes("игнорир") || lowerMessage === "1") {
          // Игнорировать - риск низкий, но может быть последствия
          responseContent = `🙏 Ты пытаешься игнорировать происходящее и продолжить медитацию...`;
          timeMinutes = 30;
        } else if (lowerMessage.includes("встретить") || lowerMessage === "2") {
          // Встать и встретить
          mechanicsUpdate = {
            fatigue: Math.min(100, session.character.fatigue + 5),
          };
          responseContent = `⚡ Ты резко встаёшь, готовый к действию!`;
          timeMinutes = 15;
        } else if (lowerMessage.includes("скрыть") || lowerMessage === "3") {
          // Скрыться
          responseContent = `🌿 Ты бесшумно скрываешься в укрытии...`;
          timeMinutes = 10;
        }
        
        if (Object.keys(mechanicsUpdate).length > 0) {
          await db.character.update({
            where: { id: session.characterId },
            data: { ...mechanicsUpdate, updatedAt: new Date() },
          });
        }
        
        return NextResponse.json({
          success: true,
          response: {
            type: "narration",
            content: responseContent + `\n\n*Опиши что происходит дальше через LLM...*`,
            characterState: mechanicsUpdate,
            timeAdvance: { minutes: timeMinutes },
          },
          updatedTime: calculateUpdatedTime(session, timeMinutes),
        });
      }
    }

    // === МЕДИТАЦИЯ И ПРОРЫВ - ОБРАБАТЫВАЕМ ЛОКАЛЬНО БЕЗ LLM ===
    // Это должно быть ПЕРЕД проверкой needsLLM
    if (requestType === "cultivation") {
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
          // Обновляем qiUnderstandingCap для нового уровня
          const newQiUnderstandingCap = getQiUnderstandingCap(result.newLevel);
          
          mechanicsUpdate = {
            cultivationLevel: result.newLevel,
            cultivationSubLevel: result.newSubLevel,
            coreCapacity: result.newCoreCapacity,
            accumulatedQi: Math.max(0, session.character.accumulatedQi - result.qiConsumed),
            fatigue: Math.min(100, Math.max(0, session.character.fatigue + result.fatigueGained.physical)),
            mentalFatigue: Math.min(100, Math.max(0, (session.character.mentalFatigue || 0) + result.fatigueGained.mental)),
            qiUnderstandingCap: newQiUnderstandingCap,
          };
        }
        timeAdvanceForMechanics.minutes = 30;
        
        await db.character.update({
          where: { id: session.characterId },
          data: { ...mechanicsUpdate, updatedAt: new Date() },
        });
        
        // Получаем обновлённого персонажа из БД
        const updatedCharacter = await db.character.findUnique({
          where: { id: session.characterId },
        });
        
        // Формируем сообщение о прорыве с информацией о понимании Ци
        let breakthroughMessage = result.success 
          ? `${result.message}\n\n💎 Ёмкость ядра: ${result.newCoreCapacity}\n⚡ Накопленная Ци: ${updatedCharacter?.accumulatedQi || 0}`
          : `❌ ${result.message}`;
        
        if (result.success && updatedCharacter) {
          const qiProgress = Math.round((updatedCharacter.qiUnderstanding / updatedCharacter.qiUnderstandingCap) * 100);
          breakthroughMessage += `\n\n🧠 Понимание Ци: ${updatedCharacter.qiUnderstanding}/${updatedCharacter.qiUnderstandingCap} (${qiProgress}%)`;
          
          if (result.newLevel >= 5) {
            breakthroughMessage += `\n✨ Доступно прозрение!`;
          }
        }
        
        return NextResponse.json({
          success: true,
          response: {
            type: "narration",
            content: breakthroughMessage,
            characterState: mechanicsUpdate,
            timeAdvance: { minutes: 30 },
          },
          updatedTime: calculateUpdatedTime(session, 30),
        });
      } else {
        // Накопление Ци через медитацию
        const meditationType = "accumulation" as const;
        
        // === ПРОВЕРКА ПРЕРЫВАНИЯ МЕДИТАЦИИ ===
        const worldTime = {
          year: session.worldYear,
          month: session.worldMonth,
          day: session.worldDay,
          hour: session.worldHour,
          minute: session.worldMinute,
          formatted: "",
          season: session.worldMonth <= 6 ? "тёплый" : "холодный",
        };
        
        const interruptionCheck = checkMeditationInterruption(
          session.character,
          location,
          worldTime,
          durationMinutes
        );
        
        await logDebug("GAME", "Meditation interruption check", {
          baseChance: interruptionCheck.baseChance,
          finalChance: interruptionCheck.finalChance,
          interrupted: interruptionCheck.interrupted,
        });
        
        if (interruptionCheck.interrupted && interruptionCheck.event) {
          // === ПРЕРЫВАНИЕ МЕДИТАЦИИ ===
          const event = interruptionCheck.event;
          const interruptedMinutes = interruptionCheck.checkHour * 60;
          
          // Рассчитываем Qi за время до прерывания
          const partialResult = performMeditation(
            session.character,
            location,
            interruptedMinutes,
            meditationType
          );
          
          // Обновляем персонажа
          const mechanicsUpdate: Record<string, unknown> = {
            currentQi: session.character.currentQi + partialResult.qiGained,
            fatigue: Math.max(0, session.character.fatigue - partialResult.fatigueGained.physical),
            mentalFatigue: Math.max(0, (session.character.mentalFatigue || 0) - partialResult.fatigueGained.mental),
          };
          
          await db.character.update({
            where: { id: session.characterId },
            data: { ...mechanicsUpdate, updatedAt: new Date() },
          });
          
          // Генерируем описание события через LLM
          const interruptionPrompt = generateInterruptionPrompt(
            event,
            session.character,
            location,
            interruptionCheck.checkHour
          );
          
          let eventDescription = event.description;
          try {
            const llmResponse = await generateGameResponse(
              buildGameMasterPrompt("Кратко опиши сцену прерывания медитации."),
              interruptionPrompt,
              []
            );
            eventDescription = llmResponse.content;
          } catch {
            // Используем дефолтное описание
          }
          
          // Формируем ответ с опциями
          const options: Array<{ id: string; label: string; risk: string }> = [];
          if (event.canIgnore) {
            options.push({ id: "ignore", label: "Проигнорировать", risk: "низкий" });
          }
          options.push({ id: "confront", label: "Встать и встретить", risk: "средний" });
          if (event.canHide) {
            options.push({ id: "hide", label: "Скрыться", risk: "низкий" });
          }
          
          const responseContent = `⚠️ **Медитация прервана!** (${interruptionCheck.checkHour} час)\n\n` +
            `🎯 **${event.type === "creature" ? "🐺" : event.type === "person" ? "👤" : event.type === "spirit" ? "👻" : event.type === "phenomenon" ? "🌀" : "✨"} ${event.description}**\n\n` +
            `${eventDescription}\n\n` +
            `📊 Шанс прерывания: ${Math.round(interruptionCheck.finalChance * 100)}%\n` +
            `⚡ Накоплено до прерывания: +${partialResult.qiGained} Ци\n\n` +
            `**Действия:**\n` +
            options.map((o, i) => `${i + 1}. ${o.label} (риск: ${o.risk})`).join("\n");
          
          return NextResponse.json({
            success: true,
            response: {
              type: "interruption",
              content: responseContent,
              characterState: mechanicsUpdate,
              timeAdvance: { minutes: interruptedMinutes },
              interruption: {
                event: event,
                options: options,
              },
            },
            updatedTime: calculateUpdatedTime(session, interruptedMinutes),
          });
        }
        
        // === ОБЫЧНАЯ МЕДИТАЦИЯ (без прерывания) ===
        const result = performMeditation(session.character, location, durationMinutes, meditationType);
        
        if (result.success) {
          mechanicsUpdate = {
            // Медитация СНИМАЕТ усталость (отдых)
            fatigue: Math.max(0, session.character.fatigue - result.fatigueGained.physical),
            mentalFatigue: Math.max(0, (session.character.mentalFatigue || 0) - result.fatigueGained.mental),
          };
          
          if (result.coreWasFilled) {
            mechanicsUpdate.currentQi = session.character.coreCapacity;
            mechanicsUpdate.accumulatedQi = session.character.accumulatedQi + result.accumulatedQiGained;
          } else {
            mechanicsUpdate.currentQi = session.character.currentQi + result.qiGained;
          }
        }
        
        await db.character.update({
          where: { id: session.characterId },
          data: { ...mechanicsUpdate, updatedAt: new Date() },
        });
        
        const breakdownText = result.breakdown 
          ? `\n  • Ядро: +${result.breakdown.coreGeneration}\n  • Среда: +${result.breakdown.environmentalAbsorption}`
          : "";
        
        // Информация о безопасности
        const locationDanger = getLocationDangerLevel(location);
        const safetyInfo = interruptionCheck.finalChance < 0.1 
          ? "\n🛡️ Безопасное место для медитации."
          : interruptionCheck.finalChance < 0.3
            ? "\n⚠️ Есть риск прерывания."
            : "\n⚠️ Опасное место! Высокий риск прерывания.";
        
        let responseContent = "";
        if (!result.success) {
          responseContent = `❌ ${result.interruptionReason}`;
        } else if (result.coreWasFilled) {
          const newAccumulated = session.character.accumulatedQi + result.accumulatedQiGained;
          const currentFills = Math.floor(newAccumulated / session.character.coreCapacity);
          const requiredFills = session.character.cultivationLevel * 10 + session.character.cultivationSubLevel;
          const fillsNeeded = Math.max(0, requiredFills - currentFills);
          responseContent = `⚡ **Ядро заполнено!**\n\n📊 Прогресс: ${currentFills}/${requiredFills} заполнений\n🔄 Осталось: ${fillsNeeded}\n\n⚠️ **Потратьте Ци (техники, бой) чтобы продолжить!**${breakdownText}\n⏱️ Время: ${result.duration} мин.\n😌 Усталость снижена.${safetyInfo}`;
        } else {
          responseContent = `🧘 Медитация завершена.\n\n⚡ Накоплено Ци: +${result.qiGained}${breakdownText}\n  Ядро: ${session.character.currentQi + result.qiGained}/${session.character.coreCapacity}\n😌 Усталость снижена.\n⏱️ Время: ${result.duration} мин.${safetyInfo}`;
        }
        
        return NextResponse.json({
          success: true,
          response: {
            type: "narration",
            content: responseContent,
            characterState: mechanicsUpdate,
            timeAdvance: { minutes: result.duration },
          },
          updatedTime: calculateUpdatedTime(session, result.duration),
        });
      }
    }

    // Обрабатываем локальные запросы без LLM
    if (!needsLLM(message)) {
      const routing = routeRequest(message, session.character, location, null, []);
      await logInfo("GAME", "Local request processed", { requestType, useLLM: routing.useLLM });
      
      return NextResponse.json({
        success: true,
        response: {
          type: "system",
          content: formatLocalResponse(routing.localData, requestType),
          characterState: null,
          timeAdvance: null,
        },
        updatedTime: null,
      });
    }

    // Проверка мира (--ПМ) - возвращаем текущее состояние без LLM расчётов
    if (message.trim().startsWith("--ПМ") || message.trim().toLowerCase().startsWith("--пм")) {
      const currentFills = Math.floor(session.character.accumulatedQi / session.character.coreCapacity);
      const requiredFills = session.character.cultivationLevel * 10 + session.character.cultivationSubLevel;
      
      const verifyResult = {
        character: {
          cultivationLevel: session.character.cultivationLevel,
          cultivationSubLevel: session.character.cultivationSubLevel,
          currentQi: session.character.currentQi,
          coreCapacity: session.character.coreCapacity,
          accumulatedQi: session.character.accumulatedQi,
          fillsProgress: `${currentFills}/${requiredFills}`, // Прогресс прорыва
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
            `- Накоплено для прорыва: ${verifyResult.character.accumulatedQi} (${verifyResult.character.fillsProgress} заполнений)\n` +
            `- Физ. усталость: ${verifyResult.character.fatigue}%\n` +
            `- Мент. усталость: ${verifyResult.character.mentalFatigue}%\n\n` +
            `**Локация:** ${verifyResult.location?.name || "Неизвестно"}\n` +
            (verifyResult.location ? `- Плотность Ци: ${verifyResult.location.qiDensity} ед/м³\n` : "") +
            `\n**Время:** ${verifyResult.worldTime.year} г., ${verifyResult.worldTime.month} мес., ${verifyResult.worldTime.day} д., ${verifyResult.worldTime.hour}:${verifyResult.worldTime.minute.toString().padStart(2, "0")}`,
          characterState: null,
          timeAdvance: null,
        },
        updatedTime: null,
      });
    }

    // === КОМАНДА ПЕРЕЗАПУСКА МИРА ===
    if (message.trim().toLowerCase() === "-- перезапуск мира!") {
      await logInfo("GAME", "World restart requested", { sessionId });
      
      /**
       * Стратегия удаления мира:
       * 
       * Порядок важен из-за FK связей без onDelete: Cascade:
       * 1. NPC (ссылается на Sect, Location)
       * 2. Sect (ссылается на Location)
       * 3. CharacterTechnique (ссылается на Character)
       * 4. InventoryItem (ссылается на Character)
       * 
       * Остальное удалится каскадом при удалении GameSession:
       * - Message (onDelete: Cascade)
       * - WorldEvent (onDelete: Cascade)
       * - Location (onDelete: Cascade)
       * - Character (onDelete: Cascade)
       * 
       * ВАЖНО: Character нельзя удалять явно - он удалится каскадом!
       */
      try {
        await db.$transaction([
          // 1. Сначала зависимые от Sect и Location
          db.nPC.deleteMany({ where: { sessionId } }),
          // 2. Sect ссылается на Location
          db.sect.deleteMany({ where: { sessionId } }),
          // 3. Техники персонажа (CharacterTechnique)
          db.characterTechnique.deleteMany({ 
            where: { characterId: session.characterId } 
          }),
          // 4. Инвентарь персонажа
          db.inventoryItem.deleteMany({ 
            where: { characterId: session.characterId } 
          }),
          // 5. Root-сущность - всё остальное удалится каскадом:
          // - Message, WorldEvent, Location, Character
          db.gameSession.delete({ where: { id: sessionId } }),
        ]);
        
        await logInfo("GAME", "World deleted successfully", { sessionId });
      } catch (dbError) {
        await logError("DATABASE", "Failed to delete world", {
          error: dbError instanceof Error ? dbError.message : "Unknown",
          sessionId,
        });
        return NextResponse.json({
          success: false,
          response: {
            type: "error",
            content: "❌ Ошибка при удалении мира. Попробуйте ещё раз.",
          },
        });
      }
      
      return NextResponse.json({
        success: true,
        response: {
          type: "system",
          content: "🔄 **Мир удалён!**\n\nНажмите кнопку \"Подтвердить\" для создания нового мира.",
          requiresRestart: true, // Сигнал клиенту для перезапуска
        },
        updatedTime: null,
      });
    }

    // Обработка боя
    if (requestType === "combat") {
      const fatigueResult = calculateFatigueFromAction(session.character, "combat_light", 5);
      const mechanicsUpdate = {
        fatigue: fatigueResult.physicalFatigue,
        mentalFatigue: fatigueResult.mentalFatigue,
      };
      // Бой увеличивает усталость
      await db.character.update({
        where: { id: session.characterId },
        data: { ...mechanicsUpdate, updatedAt: new Date() },
      });
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
    let updatedTime: unknown = null;
    
    // Объединяем продвижение времени от LLM и механик
    const totalMinutesFromLLM = gameResponse.timeAdvance
      ? (gameResponse.timeAdvance.days || 0) * 24 * 60 +
        (gameResponse.timeAdvance.hours || 0) * 60 +
        gameResponse.timeAdvance.minutes
      : 0;
    
    let totalMinutes = totalMinutesFromLLM + timeAdvanceForMechanics.minutes;
    
    // Если LLM не вернул время и это не локальный обработчик - добавляем дефолтное время
    // Любое действие занимает минимум 3 минуты
    if (totalMinutes === 0 && requestType !== "cultivation" && needsLLM(message)) {
      totalMinutes = 5; // Дефолт: 5 минут на любое действие
    }

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
      const str = typeof stats?.strength === 'number' ? stats.strength.toFixed(2) : "N/A";
      const agi = typeof stats?.agility === 'number' ? stats.agility.toFixed(2) : "N/A";
      const int = typeof stats?.intelligence === 'number' ? stats.intelligence.toFixed(2) : "N/A";
      const cond = typeof stats?.conductivity === 'number' ? stats.conductivity.toFixed(2) : "N/A";
      return `📈 **Характеристики**

💪 Сила: ${str}
🏃 Ловкость: ${agi}
🧠 Интеллект: ${int}
⚡ Проводимость: ${cond} ед/сек

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
