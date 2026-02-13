import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildSectStartPrompt,
  buildRandomStartPrompt,
  buildCustomStartPrompt,
} from "@/data/prompts/game-master";
import { generateGameResponse, initializeLLM, isLLMReady } from "@/lib/llm";
import { calculateBaseConductivity } from "@/data/cultivation-levels";
import { logError, logInfo, logWarn, logDebug, LogTimer } from "@/lib/logger";
import { 
  StartGameRequestSchema,
  formatValidationErrors,
  type StartGameRequest 
} from "@/validation";

// Инициализируем LLM
let llmInitialized = false;

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
    // Инициализируем LLM
    if (!llmInitialized) {
      try {
        initializeLLM();
        llmInitialized = true;
        await logInfo("SYSTEM", "LLM provider initialized for game start");
      } catch (initError) {
        const errorMsg = initError instanceof Error ? initError.message : "Unknown init error";
        await logError("LLM", `Failed to initialize LLM provider: ${errorMsg}`, {
          error: errorMsg,
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
      await logWarn("LLM", "LLM provider not ready for game start");
    }

    // === ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ ===
    const body = await request.json();
    const parseResult = StartGameRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      await logWarn("API", "Validation failed", { errors });
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: errors,
        },
        { status: 400 }
      );
    }
    
    const { variant, characterName, customConfig } = parseResult.data;

    // Определяем текстовый тип старта
    const startType = variant === 1 ? "sect" : variant === 2 ? "random" : "custom";
    const startTypeLabel = variant === 1 ? "Секта" : variant === 2 ? "Свободный старт" : "Кастомный";

    await logInfo("GAME", "Starting new game", {
      variant,
      startType,
      characterName: characterName || "Безымянный",
      hasCustomConfig: !!customConfig,
      customConfig: customConfig ? {
        location: customConfig.location || "default",
        age: customConfig.age || 16,
        coreCapacity: customConfig.coreCapacity || 1000,
      } : null,
    });

    // Определяем параметры старта
    const startConfig = {
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
    
    // Генерируем ID и имя мира
    const worldId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const worldName = startConfig.sectName 
      ? `Мир секты "${startConfig.sectName}"` 
      : variant === 2 
        ? "Дикие земли" 
        : "Неизвестный мир";

    await logDebug("GAME", "Start config calculated", {
      startConfig: {
        locationName: startConfig.locationName,
        qiDensity: startConfig.qiDensity,
        coreCapacity: startConfig.coreCapacity,
        conductivity,
        worldId,
        worldName,
      },
    });

    // Создаём персонажа (без локации - добавим позже)
    let character;
    try {
      character = await db.character.create({
        data: {
          name: characterName || "Безымянный",
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
      await logDebug("DATABASE", "Character created", { characterId: character.id, name: character.name });
    } catch (dbError) {
      const errorMsg = dbError instanceof Error ? dbError.message : "Unknown DB error";
      
      // Проверяем, нужна ли миграция БД
      const needsMigration = errorMsg.includes("Unknown argument") || errorMsg.includes("Did you mean");
      
      await logError("DATABASE", `Failed to create character: ${errorMsg}`, {
        error: errorMsg,
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "character.create",
        needsMigration,
        startConfig: {
          age: startConfig.age,
          coreCapacity: startConfig.coreCapacity,
        },
      });
      
      return NextResponse.json(
        { 
          error: needsMigration 
            ? "Database schema outdated. Run: bun run db:push" 
            : "Database error: Failed to create character", 
          message: errorMsg,
          component: "DATABASE_CHARACTER",
          needsMigration,
        },
        { status: 500 }
      );
    }

    // Создаём сессию игры (сначала сессия, т.к. Location требует sessionId)
    let session;
    try {
      session = await db.gameSession.create({
        data: {
          worldId,
          worldName,
          startVariant: variant,
          startType,
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
      await logDebug("DATABASE", "Game session created", { 
        sessionId: session.id, 
        worldId,
        worldName,
        startType,
      });
    } catch (dbError) {
      const errorMsg = dbError instanceof Error ? dbError.message : "Unknown DB error";
      await logError("DATABASE", `Failed to create game session: ${errorMsg}`, {
        error: errorMsg,
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "gameSession.create",
        characterId: character.id,
      });
      // Откатываем создание персонажа
      await db.character.delete({ where: { id: character.id } });
      return NextResponse.json(
        { 
          error: "Database error: Failed to create game session", 
          message: errorMsg,
          component: "DATABASE_SESSION",
        },
        { status: 500 }
      );
    }

    // Создаём начальную локацию (теперь можем привязать к сессии)
    let location;
    try {
      location = await db.location.create({
        data: {
          name: startConfig.locationName,
          distanceFromCenter: startConfig.distanceFromCenter,
          qiDensity: startConfig.qiDensity,
          qiFlowRate: Math.floor(startConfig.qiDensity / 10),
          terrainType: variant === 1 ? "mountains" : "plains",
          sessionId: session.id,
        },
      });
      await logDebug("DATABASE", "Location created", { locationId: location.id, name: location.name });
    } catch (dbError) {
      const errorMsg = dbError instanceof Error ? dbError.message : "Unknown DB error";
      await logError("DATABASE", `Failed to create location: ${errorMsg}`, {
        error: errorMsg,
        stack: dbError instanceof Error ? dbError.stack : undefined,
        operation: "location.create",
        locationData: {
          name: startConfig.locationName,
          distanceFromCenter: startConfig.distanceFromCenter,
          qiDensity: startConfig.qiDensity,
          sessionId: session.id,
        },
      });
      // Откатываем создание сессии и персонажа
      await db.gameSession.delete({ where: { id: session.id } });
      await db.character.delete({ where: { id: character.id } });
      return NextResponse.json(
        { 
          error: "Database error: Failed to create location", 
          message: errorMsg,
          component: "DATABASE_LOCATION",
        },
        { status: 500 }
      );
    }

    // Обновляем персонажа с локацией
    try {
      await db.character.update({
        where: { id: character.id },
        data: { currentLocationId: location.id },
      });
    } catch (dbError) {
      await logWarn("DATABASE", "Failed to update character location", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        characterId: character.id,
        locationId: location.id,
      });
    }

    // Создаём секту если нужно (вариант 1)
    if (variant === 1 && startConfig.sectName) {
      try {
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
        
        await logDebug("DATABASE", "Sect and NPCs created", { 
          sectId: sect.id, 
          sectName: sect.name,
          npcCount: 4, // 1 leader + 3 elders
        });
      } catch (dbError) {
        await logWarn("DATABASE", "Failed to create sect or NPCs", {
          error: dbError instanceof Error ? dbError.message : "Unknown DB error",
          stack: dbError instanceof Error ? dbError.stack : undefined,
          sessionId: session.id,
        });
        // Продолжаем без секты
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

    let gameResponse;
    try {
      const llmTimer = new LogTimer("LLM", "Generate opening narration", session.id);
      gameResponse = await generateGameResponse(
        systemPrompt,
        "Начни игру. Опиши момент пробуждения ГГ.",
        []
      );
      await llmTimer.end("INFO", { contentLength: gameResponse.content.length });
    } catch (llmError) {
      const errorMsg = llmError instanceof Error ? llmError.message : "Unknown LLM error";
      await logError("LLM", `Failed to generate opening narration: ${errorMsg}`, {
        error: errorMsg,
        stack: llmError instanceof Error ? llmError.stack : undefined,
        sessionId: session.id,
        variant,
      });
      // Не откатываем - сессия создана, просто возвращаем ошибку
      return NextResponse.json(
        { 
          error: "LLM generation failed: Could not generate opening narration", 
          message: errorMsg,
          component: "LLM_GENERATION",
          sessionId: session.id, // Возвращаем ID созданной сессии
        },
        { status: 502 }
      );
    }

    // Сохраняем первое сообщение
    try {
      await db.message.create({
        data: {
          sessionId: session.id,
          type: "narration",
          sender: "narrator",
          content: gameResponse.content,
        },
      });
    } catch (dbError) {
      await logWarn("DATABASE", "Failed to save opening narration", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        sessionId: session.id,
      });
    }

    // Обновляем локацию с привязкой к сессии
    try {
      await db.location.update({
        where: { id: location.id },
        data: { sessionId: session.id },
      });
    } catch (dbError) {
      await logWarn("DATABASE", "Failed to link location to session", {
        error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        locationId: location.id,
        sessionId: session.id,
      });
    }

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
      locationName: startConfig.locationName,
    });

    return NextResponse.json({
      success: true,
      session: fullSession,
      openingNarration: gameResponse.content,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.constructor.name : "UnknownError";
    
    await logError("GAME", `Start game critical error: ${errorMessage}`, {
      error: errorMessage,
      errorType: errorName,
      stack: errorStack,
    });
    await timer.end("ERROR", { success: false, error: errorMessage });
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        component: "GAME_CRITICAL",
        errorType: errorName,
      },
      { status: 500 }
    );
  }
}
