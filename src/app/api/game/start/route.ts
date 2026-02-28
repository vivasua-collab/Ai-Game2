import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildSectStartPrompt,
  buildRandomStartPrompt,
  buildCustomStartPrompt,
} from "@/data/prompts/game-master";
import { generateGameResponse, initializeLLM, isLLMReady } from "@/lib/llm";
import { getBaseConductivity } from "@/lib/game/conductivity-system";
import { logError, logInfo, logWarn, logDebug, LogTimer } from "@/lib/logger";
import {
  startGameSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";
import { BASIC_TECHNIQUES } from "@/data/presets/technique-presets";
import { BASIC_FORMATIONS } from "@/data/presets/formation-presets";
import { generatePositionAtDistance, generatePositionInRange } from "@/lib/game/world-coordinates";
import { 
  validateRequestSize, 
  payloadTooLargeResponse, 
  REQUEST_SIZE_LIMITS 
} from "@/lib/request-size-validator";
import { TruthSystem } from "@/lib/game/truth-system";

// Инициализируем LLM
let llmInitialized = false;

// Генерация имени секты
function generateSectName(): string {
  const prefixes = [
    "Падающий", "Восходящий", "Скрытый", "Белый", "Чёрный",
    "Алый", "Лазурный", "Золотой", "Серебряный", "Нефритовый",
    "Небесный", "Тенистый", "Громовой", "Огненный", "Ледяной",
  ];

  const suffixes = [
    "Лотос", "Дракон", "Феникс", "Тигр", "Меч",
    "Пик", "Облако", "Путь", "Поток", "Клинок",
    "Сад", "Храм", "Долина", "Гора", "Роща",
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
}

// Генерация имени NPC
function generateNPCName(): string {
  const firstNames = ["Ли", "Ван", "Чжан", "Чэнь", "Лю", "Ян", "Чжао", "Хуан", "Чжоу", "У", "Сю", "Сунь", "Ма", "Чжу", "Ху"];
  const lastNames = ["Вэй", "Фэн", "Юнь", "Лун", "Мин", "Хуа", "Цин", "Бай", "Сяо", "Тянь", "Линь", "Цзян", "Шань", "Хай", "Юй"];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

export async function POST(request: NextRequest) {
  const timer = new LogTimer("API", "Start game request");
  
  // === REQUEST SIZE VALIDATION ===
  const sizeValidation = validateRequestSize(request, REQUEST_SIZE_LIMITS.GAME_START);
  if (!sizeValidation.valid) {
    await logWarn("API", "Request too large", { 
      contentLength: sizeValidation.contentLength,
      maxSize: sizeValidation.maxSize 
    });
    return payloadTooLargeResponse(sizeValidation.contentLength, sizeValidation.maxSize);
  }
  
  try {
    // Инициализируем LLM
    if (!llmInitialized) {
      try {
        initializeLLM();
        llmInitialized = true;
        await logInfo("SYSTEM", "LLM provider initialized for game start");
      } catch (initError) {
        const errorMsg = initError instanceof Error ? initError.message : "Unknown init error";
        await logError("LLM", `Failed to initialize LLM provider: ${errorMsg}`, {});
        return NextResponse.json(
          { error: "LLM initialization failed", message: errorMsg, component: "LLM_PROVIDER" },
          { status: 503 }
        );
      }
    }

    if (!isLLMReady()) {
      await logWarn("LLM", "LLM provider not ready for game start");
    }

    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(startGameSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { variant, characterName, customConfig } = validation.data;

    const startType = variant === 1 ? "sect" : variant === 2 ? "random" : "custom";
    await logInfo("GAME", "Starting new game", { variant, startType, characterName: characterName || "Безымянный" });

    // === НАСТРОЙКИ СТАРТА ===
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

    // Функция расчёта плотности Ци по градиенту
    // Центр мира (0) = 50, край (100000) = 20
    const calculateQiDensity = (distance: number): number => {
      const maxDensity = 50;
      const minDensity = 20;
      const maxDistance = 100000;
      const density = maxDensity - (distance / maxDistance) * (maxDensity - minDensity);
      return Math.round(density);
    };

    if (variant === 1) {
      startConfig.sectName = generateSectName();
      startConfig.locationName = `Секта "${startConfig.sectName}" - Зона кандидатов`;
      startConfig.qiDensity = calculateQiDensity(startConfig.distanceFromCenter); // ~23 на краю
      startConfig.distanceFromCenter = 99000;
    } else if (variant === 2) {
      startConfig.distanceFromCenter = Math.floor(Math.random() * 80000) + 10000;
      startConfig.locationName = "Неизвестная местность";
      startConfig.qiDensity = calculateQiDensity(startConfig.distanceFromCenter); // Градиент
      startConfig.knowsAboutSystem = true;
      startConfig.hasAmnesia = false;
      startConfig.sectRole = null;
    } else if (variant === 3 && customConfig) {
      startConfig.age = customConfig.age || 16;
      startConfig.coreCapacity = customConfig.coreCapacity || 1000;
      startConfig.knowsAboutSystem = customConfig.knowsAboutSystem || false;
      startConfig.hasAmnesia = !customConfig.knowsAboutSystem;
      startConfig.locationName = customConfig.location || "Неизвестная местность";
      startConfig.distanceFromCenter = Math.floor(Math.random() * 90000) + 1000;
      startConfig.qiDensity = calculateQiDensity(startConfig.distanceFromCenter);
    }

    const conductivity = getBaseConductivity(startConfig.coreCapacity);
    const worldId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const worldName = startConfig.sectName 
      ? `Мир секты "${startConfig.sectName}"` 
      : variant === 2 ? "Дикие земли" : "Неизвестный мир";

    // === ПОДГОТОВКА ПРОМПТА И ПАРАЛЛЕЛЬНЫЙ ЗАПУСК ===
    // Готовим промпт параллельно с транзакцией БД
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

    // Запускаем LLM генерацию параллельно с созданием сущностей в БД
    const llmPromise = generateGameResponse(systemPrompt, "Начни игру. Опиши момент пробуждения ГГ. Кратко, 2-3 предложения.", [])
      .catch(err => {
        logError("LLM", `LLM generation failed: ${err}`, {});
        return null;
      });

    // === АТОМАРНОЕ СОЗДАНИЕ В ТРАНЗАКЦИИ ===
    const dbResult = await db.$transaction(async (tx) => {
      // 1. Создаём персонажа
      const character = await tx.character.create({
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

      // 2. Создаём сессию
      const session = await tx.gameSession.create({
        data: {
          worldId,
          worldName,
          startVariant: variant,
          startType,
          worldYear: 1864,
          worldMonth: 1,
          worldDay: 1,
          worldHour: 7,
          worldMinute: 0,
          daysSinceStart: 0,
          isPaused: true,
          worldState: JSON.stringify({ startConfig, events: [] }),
          characterId: character.id,
        },
      });

      // 3. Создаём локацию с вычисленными координатами
      // Генерируем позицию на основе distanceFromCenter
      const startPos = variant === 1 
        ? generatePositionAtDistance(startConfig.distanceFromCenter, 500, 1500) // Секта в горах
        : generatePositionInRange(10000, 90000, 0, 100); // Случайное место
      
      const location = await tx.location.create({
        data: {
          name: startConfig.locationName,
          x: startPos.x,
          y: startPos.y,
          z: startPos.z,
          distanceFromCenter: startConfig.distanceFromCenter,
          qiDensity: startConfig.qiDensity,
          qiFlowRate: Math.floor(startConfig.qiDensity / 10),
          terrainType: variant === 1 ? "mountains" : "plains",
          locationType: "area",
          sessionId: session.id,
        },
      });

      // 3.5. Создаём дополнительные локации с градиентом плотности Ци (20-50)
      const additionalLocations = [
        { name: "Глубокие земли", distance: 5000, terrain: "forest" },
        { name: "Срединные равнины", distance: 25000, terrain: "plains" },
        { name: "Внутренние холмы", distance: 45000, terrain: "hills" },
        { name: "Пограничные земли", distance: 65000, terrain: "plains" },
        { name: "Внешние пустоши", distance: 85000, terrain: "wasteland" },
      ];

      for (const loc of additionalLocations) {
        const pos = generatePositionAtDistance(loc.distance, 0, 100);
        const density = calculateQiDensity(loc.distance);
        await tx.location.create({
          data: {
            name: loc.name,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            distanceFromCenter: loc.distance,
            qiDensity: density,
            qiFlowRate: Math.floor(density / 10),
            terrainType: loc.terrain,
            locationType: "area",
            sessionId: session.id,
          },
        });
      }

      // 4. Обновляем персонажа с локацией
      await tx.character.update({
        where: { id: character.id },
        data: { currentLocationId: location.id },
      });

      // 5. Создаём секту и NPC для варианта 1
      type SectType = { id: string; name: string; [key: string]: unknown };
      let sect: SectType | null = null;
      if (variant === 1 && startConfig.sectName) {
        sect = await tx.sect.create({
          data: {
            name: startConfig.sectName,
            description: `Секта культивации, расположенная на окраине обитаемых земель.`,
            powerLevel: 6.2,
            locationId: location.id,
            sessionId: session.id,
            resources: JSON.stringify({ spiritStones: 50000, herbs: 1000, techniques: 20 }),
          },
        });

        await tx.character.update({
          where: { id: character.id },
          data: { sectId: sect.id },
        });

        // Глава секты
        await tx.nPC.create({
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

        // Старейшины
        for (let i = 0; i < 3; i++) {
          await tx.nPC.create({
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
              personality: JSON.stringify({ traits: ["опытный", "осторожный"] }),
              disposition: Math.random() * 20 - 10,
              sectId: sect.id,
              locationId: location.id,
              role: "elder",
              sessionId: session.id,
            },
          });
        }
      }

      // 6. Создаём базовые техники и формации для персонажа (ОПТИМИЗИРОВАНО)
      // Вместо 20 запросов (upsert + create для каждого) делаем 2-3 запроса
      
      const allPresets = [...BASIC_TECHNIQUES, ...BASIC_FORMATIONS];
      const presetNameIds = allPresets.map(p => p.id);
      
      // Получаем существующие техники ОДНИМ запросом
      const existingTechniques = await tx.technique.findMany({
        where: { nameId: { in: presetNameIds } },
        select: { id: true, nameId: true }
      });
      
      const existingNameIds = new Set(existingTechniques.map(t => t.nameId));
      const techniqueIdMap = new Map(existingTechniques.map(t => [t.nameId, t.id]));
      
      // Определяем какие техники нужно создать
      const techniquesToCreate = allPresets.filter(p => !existingNameIds.has(p.id));
      
      if (techniquesToCreate.length > 0) {
        // Пакетное создание техник (вместо цикла upsert)
        await tx.technique.createMany({
          data: techniquesToCreate.map(preset => {
            const isFormation = 'formationType' in preset;
            return {
              name: preset.name,
              nameId: preset.id,
              description: preset.description,
              type: isFormation ? 'formation' : preset.techniqueType,
              element: isFormation ? 'neutral' : preset.element,
              rarity: preset.rarity,
              level: preset.level || 1,
              minLevel: preset.minLevel || 1,
              maxLevel: preset.maxLevel || (isFormation ? (preset as any).qualityLevels : 9),
              canEvolve: preset.canEvolve ?? true,
              minCultivationLevel: preset.minCultivationLevel || 1,
              qiCost: preset.qiCost || 0,
              physicalFatigueCost: (preset as any).fatigueCost?.physical || 0,
              mentalFatigueCost: (preset as any).fatigueCost?.mental || (isFormation ? 5 : 0),
              statRequirements: (preset as any).statRequirements ? JSON.stringify((preset as any).statRequirements) : null,
              statScaling: (preset as any).scaling ? JSON.stringify((preset as any).scaling) : null,
              effects: preset.effects ? JSON.stringify(preset.effects) : 
                       isFormation ? JSON.stringify({
                         formationType: (preset as any).formationType,
                         formationEffects: (preset as any).formationEffects,
                         setupTime: (preset as any).setupTime,
                         duration: (preset as any).duration,
                         difficulty: (preset as any).difficulty,
                       }) : null,
              source: "preset",
            };
          }),
          skipDuplicates: true,
        });
        
        // Получаем ID созданных техник
        const newTechniques = await tx.technique.findMany({
          where: { nameId: { in: techniquesToCreate.map(p => p.id) } },
          select: { id: true, nameId: true }
        });
        
        newTechniques.forEach(t => techniqueIdMap.set(t.nameId, t.id));
      }
      
      // Пакетное создание связей персонаж-техника
      const characterTechniquesData = allPresets.map(preset => {
        const techniqueId = techniqueIdMap.get(preset.id);
        if (!techniqueId) return null;
        
        return {
          characterId: character.id,
          techniqueId,
          mastery: 0,
          learningProgress: 100,
          learningSource: "preset",
        };
      }).filter(Boolean) as Array<{
        characterId: string;
        techniqueId: string;
        mastery: number;
        learningProgress: number;
        learningSource: string;
      }>;
      
      await tx.characterTechnique.createMany({
        data: characterTechniquesData,
        skipDuplicates: true,
      });

      return { character, session, location, sect };
    });

    await logDebug("DATABASE", "Game entities created atomically", { 
      sessionId: dbResult.session.id,
      characterId: dbResult.character.id,
      locationId: dbResult.location.id,
    });

    // === ОЖИДАНИЕ LLM РЕЗУЛЬТАТА (уже запущен параллельно) ===
    const gameResponse = await llmPromise;
    
    if (!gameResponse) {
      // LLM не смог сгенерировать, возвращаем с дефолтным текстом
      return NextResponse.json({
        success: true,
        session: { id: dbResult.session.id, worldId: dbResult.session.worldId },
        openingNarration: "Вы пробуждаетесь в новом мире... (LLM недоступен)",
        warning: "LLM generation failed",
      });
    }

    // Сохраняем первое сообщение
    await db.message.create({
      data: {
        sessionId: dbResult.session.id,
        type: "narration",
        sender: "narrator",
        content: gameResponse.content,
      },
    }).catch(e => logWarn("DATABASE", "Failed to save opening narration", { error: String(e) }));

    // Получаем полную сессию
    const fullSession = await db.gameSession.findUnique({
      where: { id: dbResult.session.id },
      include: {
        character: { include: { currentLocation: true, sect: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // === ЗАГРУЗКА В TRUTH SYSTEM ===
    // Загружаем созданную сессию в память (ПАМЯТЬ ПЕРВИЧНА!)
    const truthSystem = TruthSystem.getInstance();
    await truthSystem.loadSession(dbResult.session.id);
    await logDebug("SYSTEM", "Session loaded into TruthSystem", { sessionId: dbResult.session.id });

    await timer.end("INFO", { sessionId: dbResult.session.id, variant, success: true });
    await logInfo("GAME", "Game started successfully", {
      sessionId: dbResult.session.id,
      variant,
      characterId: dbResult.character.id,
    });

    return NextResponse.json({
      success: true,
      session: fullSession,
      openingNarration: gameResponse.content,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logError("GAME", `Start game critical error: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });
    await timer.end("ERROR", { success: false, error: errorMessage });
    
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage, component: "GAME_CRITICAL" },
      { status: 500 }
    );
  }
}
