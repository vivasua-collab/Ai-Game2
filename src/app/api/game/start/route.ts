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
import { generatedObjectsLoader, type GeneratedTechnique } from "@/lib/generator/generated-objects-loader";
import { generatePositionAtDistance, generatePositionInRange } from "@/lib/game/world-coordinates";
import { 
  validateRequestSize, 
  payloadTooLargeResponse, 
  REQUEST_SIZE_LIMITS 
} from "@/lib/request-size-validator";
import { TruthSystem } from "@/lib/game/truth-system";
import { spawnStoryNPCs } from "@/lib/game/preset-npc-spawner";

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

/**
 * Выбрать стартовые техники для персонажа
 * Выбирает одну технику ближнего безоружного боя (melee_strike) и одну дистанционную (ranged)
 * 
 * ВАЖНО: В текущей версии старт БЕЗ техник!
 * Техники выдаются после первых 2 медитаций.
 */
export function selectStartTechniques(techniques: GeneratedTechnique[]): GeneratedTechnique[] {
  const selected: GeneratedTechnique[] = [];
  
  // 1. Техника ближнего безоружного боя (melee_strike)
  const meleeStrikeTechniques = techniques.filter(t => 
    t.type === 'combat' && 
    t.subtype === 'melee_strike' && 
    t.level === 1
  );
  
  if (meleeStrikeTechniques.length > 0) {
    const randomIndex = Math.floor(Math.random() * meleeStrikeTechniques.length);
    selected.push(meleeStrikeTechniques[randomIndex]);
  }
  
  // 2. Дистанционная техника (ranged_projectile или ranged_aoe)
  const rangedTechniques = techniques.filter(t => 
    t.type === 'combat' && 
    (t.subtype === 'ranged_projectile' || t.subtype === 'ranged_aoe') && 
    t.level === 1
  );
  
  if (rangedTechniques.length > 0) {
    const randomIndex = Math.floor(Math.random() * rangedTechniques.length);
    selected.push(rangedTechniques[randomIndex]);
  }
  
  return selected;
}

/**
 * Конвертировать GeneratedTechnique в формат для БД
 * Правильно обрабатывает все поля включая activeEffects
 */
export function convertGeneratedToDb(tech: GeneratedTechnique) {
  // Извлекаем эффекты из computed
  const effects: Record<string, unknown> = {};
  
  // Базовые параметры
  if (tech.computed.finalDamage > 0) {
    effects.damage = tech.computed.finalDamage;
  }
  
  if (tech.computed.finalRange > 0) {
    effects.range = tech.computed.finalRange;
  }
  
  // Определяем тип боя для combat техник
  if (tech.type === 'combat') {
    if (tech.subtype === 'melee_strike') {
      effects.combatType = 'melee_strike';
      effects.contactRequired = true;
    } else if (tech.subtype === 'melee_weapon') {
      effects.combatType = 'melee_weapon';
    } else if (tech.subtype === 'ranged_projectile') {
      effects.combatType = 'ranged_projectile';
    } else if (tech.subtype === 'ranged_aoe') {
      effects.combatType = 'ranged_aoe';
    }
  }
  
  // Активные эффекты (щит, DoT, баффы и т.д.)
  for (const effect of tech.computed.activeEffects) {
    effects[effect.type] = effect.value;
  }
  
  // Определяем затраты усталости на основе типа
  let physicalFatigueCost = 0;
  let mentalFatigueCost = 0;
  
  if (tech.type === 'combat') {
    physicalFatigueCost = 2;
    mentalFatigueCost = 1;
  } else if (tech.type === 'cultivation') {
    physicalFatigueCost = 0;
    mentalFatigueCost = 1;
  } else if (tech.type === 'defense') {
    physicalFatigueCost = 1;
    mentalFatigueCost = 2;
  } else if (tech.type === 'healing') {
    physicalFatigueCost = 1;
    mentalFatigueCost = 3;
  } else {
    mentalFatigueCost = 2;
  }
  
  return {
    name: tech.name,
    nameId: tech.id,
    description: tech.description,
    type: tech.type,           // Сохраняем оригинальный тип (combat, cultivation, etc.)
    subtype: tech.subtype || null, // Сохраняем подтип (melee_strike, ranged_aoe, etc.)
    element: tech.element,
    rarity: tech.rarity,
    grade: tech.grade || null, // Сохраняем grade из V2 генератора
    level: tech.level,
    minLevel: 1,
    maxLevel: 9,
    canEvolve: true,
    minCultivationLevel: 1,
    qiCost: tech.computed.finalQiCost,
    physicalFatigueCost,
    mentalFatigueCost,
    statRequirements: null,
    statScaling: null,
    effects: Object.keys(effects).length > 0 ? JSON.stringify(effects) : null,
    source: "generated",
  };
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
    // Пытаемся инициализировать LLM, но НЕ блокируем старт если не удалось
    if (!llmInitialized) {
      try {
        initializeLLM();
        llmInitialized = true;
        await logInfo("SYSTEM", "LLM provider initialized for game start");
      } catch (initError) {
        const errorMsg = initError instanceof Error ? initError.message : "Unknown init error";
        await logWarn("LLM", `LLM initialization skipped: ${errorMsg} - game will start without LLM`);
        // НЕ возвращаем ошибку! Игра должна стартовать без LLM
      }
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

        // NOTE: NPC создаются через spawnStoryNPCs ниже (5 случайных из 20 пресетов)
        // Старый код создания главы секты и старейшин удалён
      }

      // 6. ТЕХНИКИ НА СТАРТЕ НЕ ВЫДАЮТСЯ!
      // Персонаж начинает "с пустыми карманами".
      // Первые 2 медитации дадут по 1 технике:
      // - 1-я медитация: техника ближнего безоружного боя (melee_strike)
      // - 2-я медитация: дистанционная техника (ranged)
      // 
      // Это реализовано в API медитации, а не здесь.

      return { character, session, location, sect };
    });

    await logDebug("DATABASE", "Game entities created atomically", { 
      sessionId: dbResult.session.id,
      characterId: dbResult.character.id,
      locationId: dbResult.location.id,
    });

    // === ОЖИДАНИЕ LLM РЕЗУЛЬТАТА (уже запущен параллельно) ===
    const gameResponse = await llmPromise;

    // Генерируем дефолтный текст если LLM не сработал
    const defaultNarration = `Первые лучи солнца пробиваются сквозь щели в палатке. Ты просыпаешься на жёсткой циновке среди других кандидатов секты "${startConfig.sectName}".

Вчера ты прошёл пробуждение ядра, и сегодня твой первый день испытаний. Вокруг тебя просыпаются такие же юноши и девушки - кто-то нервничает, кто-то уверен в себе.

Ты чувствуешь слабое покалывание в области даньтянь - пробуждённое ядро пусто, но готово накапливать Ци.`;

    const narrationText = gameResponse?.content || defaultNarration;

    // Сохраняем первое сообщение
    await db.message.create({
      data: {
        sessionId: dbResult.session.id,
        type: "narration",
        sender: "narrator",
        content: narrationText,
      },
    }).catch(e => logWarn("DATABASE", "Failed to save opening narration", { error: String(e) }));

    // Получаем полную сессию ВСЕГДА (независимо от LLM)
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

    // === СПАВН СЮЖЕТНЫХ NPC В ТЕСТОВУЮ ЛОКАЦИЮ ===
    // Спавним 5 тестовых сюжетных NPC в стартовую локацию
    try {
      await logInfo("GAME", "Starting NPC spawn", {
        sessionId: dbResult.session.id,
        locationId: dbResult.location.id,
        locationName: dbResult.location.name
      });
      
      const storyNPCs = await spawnStoryNPCs(dbResult.session.id, dbResult.location.id);
      
      await logInfo("GAME", "Story NPCs spawned successfully", { 
        count: storyNPCs.length,
        sessionId: dbResult.session.id,
        locationId: dbResult.location.id,
        npcNames: storyNPCs.map(n => n.name)
      });
    } catch (spawnError) {
      // Не критично, если спавн NPC не удался
      await logError("GAME", "Failed to spawn story NPCs", { 
        error: spawnError instanceof Error ? spawnError.message : String(spawnError),
        stack: spawnError instanceof Error ? spawnError.stack : undefined
      });
    }

    await timer.end("INFO", { sessionId: dbResult.session.id, variant, success: true });
    await logInfo("GAME", "Game started successfully", {
      sessionId: dbResult.session.id,
      variant,
      characterId: dbResult.character.id,
    });

    return NextResponse.json({
      success: true,
      session: fullSession,
      openingNarration: narrationText,
      ...( !gameResponse && { warning: "LLM generation failed, using default narration" } ),
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
