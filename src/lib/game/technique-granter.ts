/**
 * Система выдачи техник при медитации
 * 
 * Правила:
 * - 1-я ДЛИННАЯ медитация (>= 4 часов): техника ближнего безоружного боя (melee_strike)
 * - 2-я ДЛИННАЯ медитация (>= 4 часов): дистанционная техника (ranged_projectile или ranged_aoe)
 * - После 2-й длинной медитации: техники больше не выдаются автоматически
 * 
 * ВАЖНО: Техники выдаются только за ДЛИННЫЕ медитации (>= 4 часов)!
 */

import { db } from "@/lib/db";
import { generatedObjectsLoader, type GeneratedTechnique } from "@/lib/generator/generated-objects-loader";
import { logInfo, logWarn } from "@/lib/logger";
import {
  getBaseCapacity,
  type TechniqueType as CapacityTechniqueType,
  type CombatSubtype,
} from '@/lib/constants/technique-capacity';

export interface TechniqueGrantResult {
  granted: boolean;
  technique?: {
    id: string;
    name: string;
    type: string;
    subtype?: string;
  };
  meditationNumber: number;
  message?: string;
}

/**
 * Выбрать технику ближнего безоружного боя (melee_strike)
 */
function selectMeleeStrikeTechnique(techniques: GeneratedTechnique[]): GeneratedTechnique | null {
  const meleeStrikeTechniques = techniques.filter(t => 
    t.type === 'combat' && 
    t.subtype === 'melee_strike' && 
    t.level === 1
  );
  
  if (meleeStrikeTechniques.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * meleeStrikeTechniques.length);
  return meleeStrikeTechniques[randomIndex];
}

/**
 * Выбрать дистанционную технику (ranged_projectile, ranged_beam или ranged_aoe)
 */
function selectRangedTechnique(techniques: GeneratedTechnique[]): GeneratedTechnique | null {
  const rangedTechniques = techniques.filter(t => 
    t.type === 'combat' && 
    (t.subtype === 'ranged_projectile' || t.subtype === 'ranged_beam' || t.subtype === 'ranged_aoe') && 
    t.level === 1
  );
  
  if (rangedTechniques.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * rangedTechniques.length);
  return rangedTechniques[randomIndex];
}

/**
 * Конвертировать GeneratedTechnique в формат для БД
 */
function convertGeneratedToDb(tech: GeneratedTechnique) {
  const effects: Record<string, unknown> = {};
  
  if (tech.computed.finalDamage > 0) {
    effects.damage = tech.computed.finalDamage;
  }
  
  if (tech.computed.finalRange > 0) {
    effects.range = tech.computed.finalRange;
  }
  
  // Определяем тип боя для combat техник
  if (tech.type === 'combat' && tech.subtype) {
    effects.combatType = tech.subtype;
    
    if (tech.subtype === 'melee_strike') {
      effects.contactRequired = true;
    }
  }
  
  // Активные эффекты
  if (tech.computed.activeEffects) {
    for (const effect of tech.computed.activeEffects) {
      effects[effect.type] = effect.value;
    }
  }
  
  // Затраты усталости
  let physicalFatigueCost = 2;
  let mentalFatigueCost = 1;
  
  // Рассчитываем базовую ёмкость из типа и подтипа
  const baseCapacity = tech.baseCapacity ?? getBaseCapacity(
    tech.type as CapacityTechniqueType,
    tech.subtype as CombatSubtype | undefined
  );
  
  return {
    name: tech.name,
    nameId: tech.id,
    description: tech.description,
    type: tech.type, // Сохраняем оригинальный тип: combat, cultivation, support и т.д.
    subtype: tech.subtype || null, // Сохраняем подтип отдельно: melee_strike, ranged_projectile и т.д.
    element: tech.element,
    rarity: tech.rarity,
    level: tech.level,
    minLevel: 1,
    maxLevel: 9,
    canEvolve: true,
    minCultivationLevel: 1,
    qiCost: tech.computed.finalQiCost,
    baseCapacity, // ВАЖНО: сохраняем базовую ёмкость
    physicalFatigueCost,
    mentalFatigueCost,
    statRequirements: null,
    statScaling: null,
    effects: Object.keys(effects).length > 0 ? JSON.stringify(effects) : null,
    source: "generated",
  };
}

/**
 * Проверить и выдать технику при медитации
 * 
 * @param characterId - ID персонажа
 * @param meditationCount - номер медитации (ДО инкремента)
 * @returns результат выдачи техники
 */
export async function checkAndGrantTechnique(
  characterId: string,
  meditationCount: number
): Promise<TechniqueGrantResult> {
  // Проверяем номер медитации
  const nextMeditationNumber = meditationCount + 1;
  
  console.log(`[TechniqueGranter] checkAndGrantTechnique called: meditationCount=${meditationCount}, nextMeditationNumber=${nextMeditationNumber}`);
  
  // Выдаём техники только на 1-й и 2-й медитации
  if (nextMeditationNumber > 2) {
    console.log(`[TechniqueGranter] Meditation number ${nextMeditationNumber} > 2, skipping`);
    return { granted: false, meditationNumber: nextMeditationNumber };
  }
  
  // Загружаем техники
  const { objects: allTechniques } = await generatedObjectsLoader.loadTechniques();
  
  console.log(`[TechniqueGranter] Loaded ${allTechniques.length} techniques`);
  
  if (allTechniques.length === 0) {
    await logWarn("GAME", "No techniques available for granting");
    return { granted: false, meditationNumber: nextMeditationNumber };
  }
  
  // Логируем доступные combat техники для отладки
  const combatTechniques = allTechniques.filter(t => t.type === 'combat');
  console.log(`[TechniqueGranter] Combat techniques: ${combatTechniques.length}`);
  const subtypes = [...new Set(combatTechniques.map(t => t.subtype))];
  console.log(`[TechniqueGranter] Combat subtypes available: ${JSON.stringify(subtypes)}`);
  
  // Выбираем технику в зависимости от номера медитации
  let selectedTechnique: GeneratedTechnique | null = null;
  let techniqueType = "";
  
  if (nextMeditationNumber === 1) {
    selectedTechnique = selectMeleeStrikeTechnique(allTechniques);
    techniqueType = "ближнего безоружного боя";
    console.log(`[TechniqueGranter] Looking for melee_strike techniques...`);
  } else if (nextMeditationNumber === 2) {
    selectedTechnique = selectRangedTechnique(allTechniques);
    techniqueType = "дистанционную";
    console.log(`[TechniqueGranter] Looking for ranged techniques...`);
  }
  
  if (!selectedTechnique) {
    await logWarn("GAME", `No ${techniqueType} technique found for granting`);
    console.log(`[TechniqueGranter] No ${techniqueType} technique found!`);
    return { granted: false, meditationNumber: nextMeditationNumber };
  }
  
  console.log(`[TechniqueGranter] Selected technique: ${selectedTechnique.name} (${selectedTechnique.id})`);
  
  try {
    // Проверяем, существует ли уже такая техника в БД
    let technique = await db.technique.findUnique({
      where: { nameId: selectedTechnique.id }
    });
    
    // Если техники нет в БД - создаём
    if (!technique) {
      technique = await db.technique.create({
        data: convertGeneratedToDb(selectedTechnique)
      });
    }
    
    // Проверяем, есть ли у персонажа уже эта техника
    const existingCharacterTechnique = await db.characterTechnique.findUnique({
      where: {
        characterId_techniqueId: {
          characterId,
          techniqueId: technique.id
        }
      }
    });
    
    if (existingCharacterTechnique) {
      return { 
        granted: false, 
        meditationNumber: nextMeditationNumber,
        message: `Техника "${technique.name}" уже изучена`
      };
    }
    
    // Создаём связь персонаж-техника
    await db.characterTechnique.create({
      data: {
        characterId,
        techniqueId: technique.id,
        mastery: 0,
        learningProgress: 100,
        learningSource: "meditation_grant",
      }
    });
    
    await logInfo("GAME", `Technique granted via meditation`, {
      characterId,
      techniqueId: technique.id,
      techniqueName: technique.name,
      meditationNumber: nextMeditationNumber
    });
    
    const message = nextMeditationNumber === 1
      ? `🌀 Во время первой глубокой медитации (4+ часа) в сознании всплыла техника ближнего боя: **${technique.name}**!\n\nЭто базовый удар, который не требует оружия.`
      : `💠 Вторая глубокая медитация открыла тебе дистанционную технику: **${technique.name}**!\n\nТеперь ты можешь атаковать противников на расстоянии.`;
    
    return {
      granted: true,
      technique: {
        id: technique.id,
        name: technique.name,
        type: technique.type,
        subtype: selectedTechnique.subtype
      },
      meditationNumber: nextMeditationNumber,
      message
    };
    
  } catch (error) {
    await logWarn("GAME", `Failed to grant technique: ${error}`);
    return { granted: false, meditationNumber: nextMeditationNumber };
  }
}
