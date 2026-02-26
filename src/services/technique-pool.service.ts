/**
 * Сервис пула техник
 *
 * Управляет генерацией, хранением и выбором техник:
 * - Генерация пула из нескольких техник (экономия токенов)
 * - Хранение неиспользованных техник
 * - Выбор техники игроком
 * - Автоматическое пополнение при прорыве
 * - Интеграция с системой прозрения (qi-insight)
 */

import { db } from '@/lib/db';
import type { Technique, TechniqueType, TechniqueElement, TechniqueRarity } from '@/lib/game/techniques';
import { validateNewTechnique, generateTechniqueId } from '@/lib/game/techniques';
import { getLLMManager } from '@/lib/llm';
import { buildTechniqueGenerationPrompt } from '@/prompts';
import { logInfo, logError, logWarn } from '@/lib/logger';
import {
  addQiUnderstanding,
  calculateQiUnderstandingGain,
  type CharacterForInsight,
  type InsightResult,
} from '@/lib/game/qi-insight';
import {
  ALL_TECHNIQUE_PRESETS,
  type TechniquePreset,
} from '@/data/presets/technique-presets';

// Типы
export type TriggerType = 'breakthrough' | 'insight' | 'scroll' | 'npc';

export interface TechniquePoolResult {
  success: boolean;
  poolId?: string;
  techniques?: Technique[];
  error?: string;
}

export interface TechniqueSelectionResult {
  success: boolean;
  technique?: Technique;
  learnedId?: string;
  remaining?: number;
  error?: string;
  insight?: InsightResult; // Результат прозрения при изучении
}

// Размер пула по умолчанию
const DEFAULT_POOL_SIZE = 5;

// Редкости по уровню культивации
const RARITY_BY_LEVEL: Record<number, TechniqueRarity[]> = {
  1: ['common', 'common', 'common', 'uncommon'],
  2: ['common', 'uncommon', 'uncommon', 'rare'],
  3: ['uncommon', 'uncommon', 'rare', 'rare'],
  4: ['uncommon', 'rare', 'rare', 'legendary'],
  5: ['rare', 'rare', 'rare', 'legendary'],
  6: ['rare', 'legendary', 'legendary', 'legendary'],
  7: ['legendary', 'legendary', 'legendary', 'legendary'],
  8: ['legendary'],
  9: ['legendary'],
};

// Типы техник для разнообразия
const TECHNIQUE_TYPES: TechniqueType[] = ['combat', 'support', 'movement', 'sensory', 'healing'];

// Элементы
const ELEMENTS: TechniqueElement[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];

/**
 * Генерация пула техник через LLM с fallback на пресеты
 */
export async function generateTechniquePool(options: {
  characterId: string;
  targetLevel: number;
  triggerType: TriggerType;
  count?: number;
  preferredType?: TechniqueType;
  preferredElement?: TechniqueElement;
}): Promise<TechniquePoolResult> {
  const {
    characterId,
    targetLevel,
    triggerType,
    count = DEFAULT_POOL_SIZE,
    preferredType,
    preferredElement,
  } = options;

  try {
    // Получаем персонажа для контекста
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return { success: false, error: 'Персонаж не найден' };
    }

    // Определяем редкости для этого уровня
    const rarities = RARITY_BY_LEVEL[targetLevel] || RARITY_BY_LEVEL[1];

    // === ПОПЫТКА ГЕНЕРАЦИИ ЧЕРЕЗ LLM ===
    let techniques: Technique[] = [];
    let usedLLM = false;

    try {
      // Формируем промпт для генерации
      const prompt = buildTechniqueGenerationPrompt({
        type: preferredType || 'combat',
        element: preferredElement || 'neutral',
        level: targetLevel,
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
        count,
        characterContext: {
          cultivationLevel: character.cultivationLevel,
          intelligence: character.intelligence,
          conductivity: character.conductivity,
          strength: character.strength,
          agility: character.agility,
        },
      });

      // Генерируем через LLM
      const llm = getLLMManager();
      const response = await llm.generate(prompt, []);

      // Парсим результат
      techniques = parseLLMResponse(response.content);
      
      if (techniques.length > 0) {
        usedLLM = true;
        await logInfo('TECHNIQUE_POOL', `LLM generated ${techniques.length} techniques`);
      }
    } catch (llmError) {
      await logWarn('TECHNIQUE_POOL', 'LLM generation failed, using fallback presets', {
        error: llmError instanceof Error ? llmError.message : String(llmError)
      });
    }

    // === FALLBACK: ИСПОЛЬЗУЕМ ПРЕСЕТЫ ===
    if (techniques.length === 0) {
      techniques = generateFallbackTechniques(targetLevel, count, preferredType, preferredElement);
      await logInfo('TECHNIQUE_POOL', `Using ${techniques.length} fallback techniques from presets`);
    }

    if (techniques.length === 0) {
      return { success: false, error: 'Не удалось сгенерировать техники' };
    }

    // Валидируем и балансируем
    const validatedTechniques = techniques.map(t => balanceTechnique(t, targetLevel));

    // Создаём пул в БД
    const pool = await db.techniquePool.create({
      data: {
        characterId,
        targetLevel,
        triggerType,
        techniques: {
          create: validatedTechniques.map(t => ({
            techniqueData: JSON.stringify(t),
            isRevealed: false,
            isSelected: false,
          })),
        },
      },
      include: {
        techniques: true,
      },
    });

    await logInfo('TECHNIQUE_POOL', `Generated pool ${pool.id} with ${validatedTechniques.length} techniques for character ${characterId} (${usedLLM ? 'LLM' : 'fallback'})`);

    return {
      success: true,
      poolId: pool.id,
      techniques: validatedTechniques,
    };
  } catch (error) {
    await logError('TECHNIQUE_POOL', 'Failed to generate technique pool', { error: error instanceof Error ? error : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка генерации',
    };
  }
}

/**
 * Генерация fallback техник из пресетов
 */
function generateFallbackTechniques(
  targetLevel: number,
  count: number,
  preferredType?: TechniqueType,
  preferredElement?: TechniqueElement
): Technique[] {
  // Фильтруем пресеты по уровню
  const availablePresets = ALL_TECHNIQUE_PRESETS.filter(preset => {
    // Проверяем требования уровня культивации
    const reqLevel = preset.requirements?.cultivationLevel || 1;
    if (reqLevel > targetLevel + 1) return false; // Не более чем на 1 уровень выше
    if (preset.level > targetLevel + 2) return false; // Техника не слишком высокого уровня
    return true;
  });

  if (availablePresets.length === 0) {
    // Если ничего не подошло - берём базовые техники
    const basicPresets = ALL_TECHNIQUE_PRESETS.filter(p => p.category === 'basic');
    return selectAndConvertPresets(basicPresets, count, preferredType, preferredElement);
  }

  return selectAndConvertPresets(availablePresets, count, preferredType, preferredElement);
}

/**
 * Выбрать и конвертировать пресеты в техники
 */
function selectAndConvertPresets(
  presets: TechniquePreset[],
  count: number,
  preferredType?: TechniqueType,
  preferredElement?: TechniqueElement
): Technique[] {
  // Сортируем по предпочтениям
  const sorted = [...presets].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Предпочтительный тип
    if (preferredType && a.techniqueType === preferredType) scoreA += 2;
    if (preferredType && b.techniqueType === preferredType) scoreB += 2;
    
    // Предпочтительный элемент
    if (preferredElement && a.element === preferredElement) scoreA += 1;
    if (preferredElement && b.element === preferredElement) scoreB += 1;
    
    return scoreB - scoreA;
  });

  // Берём случайные из топ-кандидатов
  const topCandidates = sorted.slice(0, Math.min(sorted.length, count * 2));
  const shuffled = topCandidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Конвертируем пресеты в техники
  return selected.map(preset => presetToTechnique(preset));
}

/**
 * Конвертировать пресет в технику
 */
function presetToTechnique(preset: TechniquePreset): Technique {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    type: preset.techniqueType,
    element: preset.element,
    rarity: preset.rarity,
    level: preset.level,
    minCultivationLevel: preset.minCultivationLevel || preset.requirements?.cultivationLevel || 1,
    qiCost: preset.qiCost,
    fatigueCost: preset.fatigueCost,
    statRequirements: preset.statRequirements,
    statScaling: preset.scaling,
    effects: preset.effects || {},
    masteryProgress: 0,
    masteryBonus: preset.masteryBonus,
    source: 'preset',
    createdAt: new Date(),
  };
}

/**
 * Парсинг ответа LLM
 */
function parseLLMResponse(content: string): Technique[] {
  try {
    // Ищем JSON массив
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in LLM response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item, index) => ({
      id: generateTechniqueId(item.name || `technique_${index}`),
      name: item.name || `Техника ${index + 1}`,
      description: item.description || 'Без описания',
      type: item.type || 'combat',
      element: item.element || 'neutral',
      rarity: item.rarity || 'common',
      level: item.level || 1,
      minCultivationLevel: item.minCultivationLevel || 1,
      qiCost: item.qiCost || 10,
      fatigueCost: {
        physical: item.fatigueCost?.physical || item.physicalFatigueCost || 2,
        mental: item.fatigueCost?.mental || item.mentalFatigueCost || 1,
      },
      statRequirements: item.statRequirements || undefined,
      statScaling: item.statScaling || undefined,
      effects: item.effects || {},
      masteryProgress: 0,
      masteryBonus: 0.3,
      source: 'created' as const,
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    return [];
  }
}

/**
 * Балансировка техники
 */
function balanceTechnique(technique: Technique, level: number): Technique {
  // Ограничиваем qiCost по формуле
  const minCost = level * 5;
  const maxCost = level * 20;
  technique.qiCost = Math.max(minCost, Math.min(maxCost, technique.qiCost));

  // Ограничиваем эффекты
  const maxDamage = level * 20 + 10;
  const maxHealing = level * 15 + 10;

  if (technique.effects.damage) {
    technique.effects.damage = Math.min(maxDamage, technique.effects.damage);
  }
  if (technique.effects.healing) {
    technique.effects.healing = Math.min(maxHealing, technique.effects.healing);
  }

  // Валидация элемента
  if (!ELEMENTS.includes(technique.element)) {
    technique.element = 'neutral';
  }

  // Валидация типа
  if (!TECHNIQUE_TYPES.includes(technique.type)) {
    technique.type = 'combat';
  }

  // Валидация редкости
  const validRarities: TechniqueRarity[] = ['common', 'uncommon', 'rare', 'legendary'];
  if (!validRarities.includes(technique.rarity)) {
    technique.rarity = 'common';
  }

  // Устанавливаем уровень
  technique.level = level;
  technique.minCultivationLevel = Math.max(1, level - 1);

  return technique;
}

/**
 * Получить активный пул для персонажа
 */
export async function getActivePool(characterId: string): Promise<{
  poolId: string;
  techniques: Array<{
    id: string;
    technique: Technique;
    isRevealed: boolean;
    isSelected: boolean;
  }>;
} | null> {
  const pool = await db.techniquePool.findFirst({
    where: {
      characterId,
      isConsumed: false,
    },
    include: {
      techniques: {
        where: { isSelected: false },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!pool || pool.techniques.length === 0) {
    return null;
  }

  return {
    poolId: pool.id,
    techniques: pool.techniques.map(t => ({
      id: t.id,
      technique: JSON.parse(t.techniqueData) as Technique,
      isRevealed: t.isRevealed,
      isSelected: t.isSelected,
    })),
  };
}

/**
 * Раскрыть технику в пуле (показать описание)
 */
export async function revealTechnique(poolItemId: string): Promise<Technique | null> {
  const item = await db.techniquePoolItem.update({
    where: { id: poolItemId },
    data: { isRevealed: true },
  });

  return JSON.parse(item.techniqueData) as Technique;
}

/**
 * Выбрать технику из пула
 */
export async function selectTechniqueFromPool(
  poolItemId: string,
  characterId: string
): Promise<TechniqueSelectionResult> {
  try {
    // Получаем элемент пула
    const poolItem = await db.techniquePoolItem.findUnique({
      where: { id: poolItemId },
      include: { pool: true },
    });

    if (!poolItem || poolItem.pool.characterId !== characterId) {
      return { success: false, error: 'Техника не найдена' };
    }

    if (poolItem.isSelected) {
      return { success: false, error: 'Техника уже выбрана' };
    }

    const technique: Technique = JSON.parse(poolItem.techniqueData);

    // Валидация
    const validation = validateNewTechnique(technique);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Создаём технику в каталоге
    const createdTechnique = await db.technique.create({
      data: {
        name: technique.name,
        nameId: technique.id,
        description: technique.description,
        type: technique.type,
        element: technique.element,
        rarity: technique.rarity,
        level: technique.level,
        minCultivationLevel: technique.minCultivationLevel,
        qiCost: technique.qiCost,
        physicalFatigueCost: technique.fatigueCost.physical,
        mentalFatigueCost: technique.fatigueCost.mental,
        statRequirements: technique.statRequirements ? JSON.stringify(technique.statRequirements) : null,
        statScaling: technique.statScaling ? JSON.stringify(technique.statScaling) : null,
        effects: technique.effects ? JSON.stringify(technique.effects) : null,
        source: 'created',
      },
    });

    // Создаём изученную технику
    const learnedTechnique = await db.characterTechnique.create({
      data: {
        characterId,
        techniqueId: createdTechnique.id,
        mastery: 0,
        learningProgress: 100,
        learningSource: poolItem.pool.triggerType,
      },
    });

    // === ИНТЕГРАЦИЯ С СИСТЕМОЙ ПРОЗРЕНИЯ ===
    // Получаем персонажа для обновления понимания Ци
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    let insightResult: InsightResult | undefined;

    if (character) {
      // Формируем данные для системы прозрения
      const characterForInsight: CharacterForInsight = {
        id: character.id,
        cultivationLevel: character.cultivationLevel,
        qiUnderstanding: character.qiUnderstanding,
        qiUnderstandingCap: character.qiUnderstandingCap,
        intelligence: character.intelligence,
        conductivity: character.conductivity,
        cultivationSkills: character.cultivationSkills as Record<string, number> || {},
      };

      // Рассчитываем прирост понимания от изучения техники
      const qiGain = calculateQiUnderstandingGain(technique.level);
      
      // Проверяем прозрение
      insightResult = addQiUnderstanding(characterForInsight, qiGain);

      // Обновляем понимание Ци персонажа
      await db.character.update({
        where: { id: characterId },
        data: {
          qiUnderstanding: insightResult.newQiUnderstanding,
          qiUnderstandingCap: character.qiUnderstandingCap, // Cap не меняется
        },
      });

      // Если прозрение сработало - создаём технику прозрения
      if (insightResult.triggered && insightResult.newTechnique) {
        const insightTechnique = insightResult.newTechnique;
        
        await logInfo('INSIGHT', `Character ${characterId} achieved insight! New technique: ${insightTechnique.name}`);

        // Создаём технику прозрения в каталоге
        await db.technique.create({
          data: {
            name: insightTechnique.name,
            nameId: generateTechniqueId(insightTechnique.name),
            description: insightTechnique.description,
            type: insightTechnique.type,
            element: insightTechnique.element,
            rarity: 'rare', // Техники прозрения всегда редкие
            level: insightTechnique.level,
            minCultivationLevel: Math.max(1, insightTechnique.level - 1),
            qiCost: insightTechnique.level * 10,
            physicalFatigueCost: 3,
            mentalFatigueCost: 5,
            effects: { source: 'insight' },
            source: 'insight',
          },
        });

        // Добавляем технику прозрения персонажу
        await db.characterTechnique.create({
          data: {
            characterId,
            techniqueId: (await db.technique.findFirst({
              where: { name: insightTechnique.name },
              orderBy: { createdAt: 'desc' },
            }))!.id,
            mastery: 0,
            learningProgress: 100,
            learningSource: 'insight',
          },
        });
      }
    }

    // Отмечаем как выбранную
    await db.techniquePoolItem.update({
      where: { id: poolItemId },
      data: {
        isSelected: true,
        learnedTechniqueId: learnedTechnique.id,
      },
    });

    // Проверяем, остались ли невыбранные техники
    const remaining = await db.techniquePoolItem.count({
      where: {
        poolId: poolItem.poolId,
        isSelected: false,
      },
    });

    // Если все выбраны - помечаем пул как потреблённый
    if (remaining === 0) {
      await db.techniquePool.update({
        where: { id: poolItem.poolId },
        data: { isConsumed: true },
      });
    }

    await logInfo('TECHNIQUE_POOL', `Character ${characterId} selected technique ${technique.name} from pool`);

    return {
      success: true,
      technique,
      learnedId: learnedTechnique.id,
      remaining,
      insight: insightResult,
    };
  } catch (error) {
    await logError('TECHNIQUE_POOL', 'Failed to select technique', { error: error instanceof Error ? error : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка выбора',
    };
  }
}

/**
 * Очистка старых пулов (старше 30 дней)
 */
export async function cleanupOldPools(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db.techniquePool.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
      isConsumed: true,
    },
  });

  return result.count;
}

/**
 * Проверка и автогенерация пула при прорыве
 */
export async function checkAndGenerateOnBreakthrough(
  characterId: string,
  newLevel: number
): Promise<TechniquePoolResult | null> {
  // Проверяем, есть ли уже активный пул
  const existingPool = await getActivePool(characterId);

  if (existingPool) {
    return null; // Уже есть активный пул
  }

  // Генерируем новый пул для нового уровня
  return generateTechniquePool({
    characterId,
    targetLevel: newLevel,
    triggerType: 'breakthrough',
    count: DEFAULT_POOL_SIZE,
  });
}
