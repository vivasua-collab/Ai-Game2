import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildSectStartPrompt,
  buildRandomStartPrompt,
  buildCustomStartPrompt,
} from "@/data/prompts/game-master";
import { generateGameResponse, initializeLLM } from "@/lib/llm";
import { calculateBaseConductivity } from "@/data/cultivation-levels";
import { logError, logInfo, LogTimer } from "@/lib/logger";

// Инициализируем LLM
let llmInitialized = false;

interface StartGameRequest {
  variant: 1 | 2 | 3; // 1=секта, 2=случайный, 3=кастомный
  customConfig?: {
    location?: string;
    age?: number;
    coreCapacity?: number;
    knowsAboutSystem?: boolean;
    startQi?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
  };
}

// Генерация имени секты
function generateSectName(): string {
  const prefixes = [
    "Падающий",
    "Восходящий",
    "Скрытый",
    "Белый",
    "Чёрный",
    "Алый",
    "Лазурный",
    "Золотой",
    "Серебряный",
    "Нефритовый",
    "Небесный",
    "Тенистый",
    "Громовой",
    "Огненный",
    "Ледяной",
  ];

  const suffixes = [
    "Лотос",
    "Дракон",
    "Феникс",
    "Тигр",
    "Меч",
    "Пик",
    "Облако",
    "Путь",
    "Поток",
    "Клинок",
    "Сад",
    "Храм",
    "Долина",
    "Гора",
    "Роща",
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix} ${suffix}`;
}

// Генерация имени NPC
function generateNPCName(): string {
  const firstNames = [
    "Ли",
    "Ван",
    "Чжан",
    "Чэнь",
    "Лю",
    "Ян",
    "Чжао",
    "Хуан",
    "Чжоу",
    "У",
    "Сю",
    "Сунь",
    "Ма",
    "Чжу",
    "Ху",
  ];

  const lastNames = [
    "Вэй",
    "Фэн",
    "Юнь",
    "Лун",
    "Мин",
    "Хуа",
    "Цин",
    "Бай",
    "Сяо",
    "Тянь",
    "Линь",
    "Цзян",
    "Шань",
    "Хай",
    "Юй",
  ];

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${first} ${last}`;
}

export async function POST(request: NextRequest) {
  const timer = new LogTimer("API", "Start game request");
  
  try {
    if (!llmInitialized) {
      initializeLLM();
      llmInitialized = true;
    }

    const body: StartGameRequest = await request.json();
    const { variant, customConfig } = body;

    await logInfo("GAME", "Starting new game", {
      variant,
      hasCustomConfig: !!customConfig,
    });

    // Определяем параметры старта
    let startConfig = {
      age: 16,
      coreCapacity: 1000,
      knowsAboutSystem: false,
      hasAmnesia: true,
      locationName: "",
      qiDensity: 20,
      distanceFromCenter: 99000,
      sectName: "",
      sectRole: "candidate" as string | null,
    };

    // Настройки для разных вариантов
    if (variant === 1) {
      // Секта
      startConfig.sectName = generateSectName();
      startConfig.locationName = `Секта "${startConfig.sectName}" - Зона кандидатов`;
      startConfig.qiDensity = 20;
      startConfig.distanceFromCenter = 99000;
      startConfig.knowsAboutSystem = false;
      startConfig.hasAmnesia = true;
      startConfig.sectRole = "candidate";
    } else if (variant === 2) {
      // Случайная область
      startConfig.distanceFromCenter = Math.floor(Math.random() * 80000) + 10000;
      startConfig.locationName = "Неизвестная местность";
      startConfig.qiDensity = Math.floor(Math.random() * 80) + 20;
      startConfig.knowsAboutSystem = true;
      startConfig.hasAmnesia = false;
      startConfig.sectRole = null;
    } else if (variant === 3 && customConfig) {
      // Кастомный старт
      startConfig.age = customConfig.age || 16;
      startConfig.coreCapacity = customConfig.coreCapacity || 1000;
      startConfig.knowsAboutSystem = customConfig.knowsAboutSystem || false;
      startConfig.hasAmnesia = !customConfig.knowsAboutSystem;
      startConfig.locationName = customConfig.location || "Неизвестная местность";
      startConfig.distanceFromCenter = Math.floor(Math.random() * 90000) + 1000;
    }

    // Рассчитываем проводимость
    const conductivity = calculateBaseConductivity(startConfig.coreCapacity);

    // Создаём персонажа
    const character = await db.character.create({
      data: {
        age: startConfig.age,
        coreCapacity: startConfig.coreCapacity,
        currentQi: 0,
        accumulatedQi: 0,
        cultivationLevel: 1,
        cultivationSubLevel: 0,
        strength: customConfig?.strength || 10.0,
        agility: customConfig?.agility || 10.0,
        intelligence: customConfig?.intelligence || 10.0,
        conductivity,
        health: 100.0,
        fatigue: 0.0,
        hasAmnesia: startConfig.hasAmnesia,
        knowsAboutSystem: startConfig.knowsAboutSystem,
        sectRole: startConfig.sectRole,
      },
    });

    // Создаём начальную локацию
    const location = await db.location.create({
      data: {
        name: startConfig.locationName,
        distanceFromCenter: startConfig.distanceFromCenter,
        qiDensity: startConfig.qiDensity,
        qiFlowRate: Math.floor(startConfig.qiDensity / 10),
        terrainType: variant === 1 ? "mountains" : "plains",
      },
    });

    // Обновляем персонажа с локацией
    await db.character.update({
      where: { id: character.id },
      data: { currentLocationId: location.id },
    });

    // Создаём сессию игры
    const session = await db.gameSession.create({
      data: {
        startVariant: variant,
        worldYear: 1864,
        worldMonth: 1, // Первый месяц тёплого сезона
        worldDay: 1,
        worldHour: 7, // 7:00 утра
        worldMinute: 0,
        daysSinceStart: 0,
        isPaused: true,
        worldState: JSON.stringify({
          startConfig,
          events: [],
        }),
        characterId: character.id,
      },
    });

    // Создаём секту если нужно (вариант 1)
    if (variant === 1 && startConfig.sectName) {
      const sect = await db.sect.create({
        data: {
          name: startConfig.sectName,
          description: `Секта культивации, расположенная на окраине обитаемых земель.`,
          powerLevel: 6.2,
          locationId: location.id,
          sessionId: session.id,
          resources: JSON.stringify({
            spiritStones: 50000,
            herbs: 1000,
            techniques: 20,
          }),
        },
      });

      // Привязываем персонажа к секте
      await db.character.update({
        where: { id: character.id },
        data: { sectId: sect.id },
      });

      // Создаём NPC для секты
      // Глава секты (уровень 6.5)
      await db.nPC.create({
        data: {
          name: generateNPCName(),
          title: "Глава секты",
          age: 150 + Math.floor(Math.random() * 100),
          cultivationLevel: 6,
          cultivationSubLevel: 5,
          coreCapacity: 50000,
          currentQi: 45000,
          strength: 35.0,
          agility: 32.0,
          intelligence: 28.0,
          conductivity: 138.9,
          personality: JSON.stringify({ traits: ["мудрый", "строгий", "справедливый"] }),
          disposition: 0,
          sectId: sect.id,
          locationId: location.id,
          role: "sect_leader",
          sessionId: session.id,
        },
      });

      // Старейшины (3 шт, уровни 6.1-6.4)
      for (let i = 0; i < 3; i++) {
        await db.nPC.create({
          data: {
            name: generateNPCName(),
            title: "Старейшина",
            age: 100 + Math.floor(Math.random() * 80),
            cultivationLevel: 6,
            cultivationSubLevel: 1 + Math.floor(Math.random() * 3),
            coreCapacity: 30000 + Math.floor(Math.random() * 20000),
            currentQi: 25000 + Math.floor(Math.random() * 15000),
            strength: 25.0 + Math.random() * 10,
            agility: 23.0 + Math.random() * 10,
            intelligence: 20.0 + Math.random() * 10,
            conductivity: 80 + Math.random() * 40,
            personality: JSON.stringify({
              traits: ["опытный", "осторожный"],
            }),
            disposition: Math.random() * 20 - 10,
            sectId: sect.id,
            locationId: location.id,
            role: "elder",
            sessionId: session.id,
          },
        });
      }
    }

    // Генерируем открывающее повествование
    let systemPrompt: string;
    if (variant === 1) {
      systemPrompt = buildSectStartPrompt();
    } else if (variant === 2) {
      systemPrompt = buildRandomStartPrompt();
    } else {
      systemPrompt = buildCustomStartPrompt({
        location: customConfig?.location,
        age: customConfig?.age,
        coreCapacity: customConfig?.coreCapacity,
        knowsAboutSystem: customConfig?.knowsAboutSystem,
      });
    }

    const llmTimer = new LogTimer("LLM", "Generate opening narration", session.id);
    const gameResponse = await generateGameResponse(
      systemPrompt,
      "Начни игру. Опиши момент пробуждения ГГ.",
      []
    );
    await llmTimer.end("INFO", { contentLength: gameResponse.content.length });

    // Сохраняем первое сообщение
    await db.message.create({
      data: {
        sessionId: session.id,
        type: "narration",
        sender: "narrator",
        content: gameResponse.content,
      },
    });

    // Обновляем локацию с привязкой к сессии
    await db.location.update({
      where: { id: location.id },
      data: { sessionId: session.id },
    });

    // Возвращаем все данные
    const fullSession = await db.gameSession.findUnique({
      where: { id: session.id },
      include: {
        character: {
          include: { currentLocation: true, sect: true },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    await timer.end("INFO", { sessionId: session.id, variant, success: true });
    await logInfo("GAME", "Game started successfully", {
      sessionId: session.id,
      variant,
      characterId: character.id,
    });

    return NextResponse.json({
      success: true,
      session: fullSession,
      openingNarration: gameResponse.content,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logError("GAME", "Start game error", {
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
