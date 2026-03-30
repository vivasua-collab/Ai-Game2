/**
 * Сервис чит-команд для тестирования
 *
 * Доступен только в development режиме или при включённом флаге.
 * Используется для быстрого тестирования механик без гринда.
 * 
 * Поддержка системы Grade (Матрёшка):
 * - Создание техник с grade из сгенерированных объектов
 */

import { db } from '@/lib/db';
import { generateTechniquePool, type TriggerType } from './technique-pool.service';
import { logInfo, logWarn } from '@/lib/logger';
import { type TechniqueGrade, type EquipmentGrade } from '@/types/grade';

// Флаг разрешения читов
const CHEATS_ENABLED = process.env.NODE_ENV === 'development' || process.env.ENABLE_CHEATS === 'true';

// Типы чит-команд
export type CheatCommand =
  | 'set_level'      // Установить уровень культивации
  | 'add_qi'         // Добавить Ци
  | 'set_qi'         // Установить Ци
  | 'add_stat'       // Добавить к характеристике
  | 'set_stat'       // Установить характеристику
  | 'add_fatigue'    // Добавить усталость
  | 'reset_fatigue'  // Сбросить усталость
  | 'give_technique' // Дать технику (по ID пресета)
  | 'gen_techniques' // Сгенерировать пул техник
  | 'add_insight'    // Добавить прозрение (qiUnderstanding)
  | 'breakthrough'   // Мгновенный прорыв
  | 'set_time'       // Установить время
  | 'add_resources'  // Добавить ресурсы
  | 'full_restore'   // Полное восстановление
  | 'god_mode'       // Бессмертие (много Ци, нет усталости)
  | 'add_qi_stone'   // Добавить Камень Ци в инвентарь
  ;

export interface CheatResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  updatedCharacter?: {
    id: string;
    cultivationLevel: number;
    cultivationSubLevel: number;
    currentQi: number;
    coreCapacity: number;
    accumulatedQi: number;
    qiUnderstanding: number;
    qiUnderstandingCap: number;
    fatigue: number;
    mentalFatigue: number | null;
    strength: number;
    agility: number;
    intelligence: number;
  };
}

/**
 * Проверка разрешения читов
 */
export function isCheatsEnabled(): boolean {
  return CHEATS_ENABLED;
}

/**
 * Выполнить чит-команду
 */
export async function executeCheat(
  command: CheatCommand,
  characterId: string,
  params: Record<string, unknown> = {}
): Promise<CheatResult> {
  if (!CHEATS_ENABLED) {
    return {
      success: false,
      message: '⛔ Читы отключены. Установите ENABLE_CHEATS=true или запустите в development режиме.',
    };
  }

  // Получаем персонажа
  const character = await db.character.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  try {
    let result: CheatResult;
    
    switch (command) {
      case 'set_level':
        result = await cheatSetLevel(characterId, params);
        break;

      case 'add_qi':
        result = await cheatAddQi(characterId, params);
        break;

      case 'set_qi':
        result = await cheatSetQi(characterId, params);
        break;

      case 'add_stat':
        result = await cheatAddStat(characterId, params);
        break;

      case 'set_stat':
        result = await cheatSetStat(characterId, params);
        break;

      case 'add_fatigue':
        result = await cheatAddFatigue(characterId, params);
        break;

      case 'reset_fatigue':
        result = await cheatResetFatigue(characterId);
        break;

      case 'give_technique':
        result = await cheatGiveTechnique(characterId, params);
        break;

      case 'gen_techniques':
        result = await cheatGenTechniques(characterId, params);
        break;

      case 'add_insight':
        result = await cheatAddInsight(characterId, params);
        break;

      case 'breakthrough':
        result = await cheatBreakthrough(characterId);
        break;

      case 'set_time':
        result = await cheatSetTime(characterId, params);
        break;

      case 'add_resources':
        result = await cheatAddResources(characterId, params);
        break;

      case 'full_restore':
        result = await cheatFullRestore(characterId);
        break;

      case 'god_mode':
        result = await cheatGodMode(characterId);
        break;

      case 'add_qi_stone':
        result = await cheatAddQiStone(characterId, params);
        break;

      default:
        return { success: false, message: `Неизвестная команда: ${command}` };
    }
    
    // Если команда успешна, получаем обновлённого персонажа для возврата
    // Это избегает N+1 в вызывающем коде
    if (result.success) {
      const updatedCharacter = await db.character.findUnique({
        where: { id: characterId },
        select: {
          id: true,
          cultivationLevel: true,
          cultivationSubLevel: true,
          currentQi: true,
          coreCapacity: true,
          accumulatedQi: true,
          qiUnderstanding: true,
          qiUnderstandingCap: true,
          fatigue: true,
          mentalFatigue: true,
          strength: true,
          agility: true,
          intelligence: true,
        },
      });
      
      if (updatedCharacter) {
        result.updatedCharacter = updatedCharacter;
      }
    }
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    await logWarn('CHEATS', `Cheat failed: ${command}`, { error: errorMsg, params });
    return { success: false, message: `Ошибка: ${errorMsg}` };
  }
}

// ============================================
// РЕАЛИЗАЦИЯ КОМАНД
// ============================================

/**
 * Установить уровень культивации
 */
async function cheatSetLevel(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const level = Number(params.level) || 1;
  const subLevel = Number(params.subLevel) || 0;

  if (level < 1 || level > 9) {
    return { success: false, message: 'Уровень должен быть от 1 до 9' };
  }

  if (subLevel < 0 || subLevel > 9) {
    return { success: false, message: 'Под-уровень должен быть от 0 до 9' };
  }

  // Рассчитываем новую ёмкость ядра
  const baseCapacity = 1000;
  const totalLevels = (level - 1) * 10 + subLevel;
  const newCapacity = Math.floor(baseCapacity * Math.pow(1.1, totalLevels));

  await db.character.update({
    where: { id: characterId },
    data: {
      cultivationLevel: level,
      cultivationSubLevel: subLevel,
      coreCapacity: newCapacity,
    },
  });

  await logInfo('CHEATS', `Set level to ${level}.${subLevel} for character ${characterId}`);

  return {
    success: true,
    message: `✅ Уровень установлен: ${level}.${subLevel}, ёмкость ядра: ${newCapacity}`,
    data: { level, subLevel, coreCapacity: newCapacity },
  };
}

/**
 * Добавить Ци
 */
async function cheatAddQi(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const amount = Number(params.amount) || 100;

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { currentQi: true, coreCapacity: true },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  const newQi = Math.min(character.currentQi + amount, character.coreCapacity * 2);

  await db.character.update({
    where: { id: characterId },
    data: { currentQi: newQi },
  });

  return {
    success: true,
    message: `✅ Добавлено ${amount} Ци. Текущая: ${newQi}`,
    data: { qiChange: amount, currentQi: newQi },
  };
}

/**
 * Установить Ци
 */
async function cheatSetQi(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const amount = Number(params.amount) || 0;

  await db.character.update({
    where: { id: characterId },
    data: { currentQi: amount },
  });

  return {
    success: true,
    message: `✅ Ци установлена: ${amount}`,
    data: { currentQi: amount },
  };
}

/**
 * Добавить к характеристике
 */
async function cheatAddStat(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const stat = String(params.stat) as 'strength' | 'agility' | 'intelligence' | 'conductivity';
  const amount = Number(params.amount) || 1;

  const validStats = ['strength', 'agility', 'intelligence', 'conductivity'];
  if (!validStats.includes(stat)) {
    return { success: false, message: `Неверная характеристика. Доступные: ${validStats.join(', ')}` };
  }

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { strength: true, agility: true, intelligence: true, conductivity: true },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  const currentValue = character[stat] ?? 0;
  const newValue = currentValue + amount;

  await db.character.update({
    where: { id: characterId },
    data: { [stat]: newValue },
  });

  return {
    success: true,
    message: `✅ ${stat} +${amount} = ${newValue}`,
    data: { stat, oldValue: currentValue, newValue },
  };
}

/**
 * Установить характеристику
 */
async function cheatSetStat(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const stat = String(params.stat) as 'strength' | 'agility' | 'intelligence' | 'conductivity';
  const value = Number(params.value) || 10;

  const validStats = ['strength', 'agility', 'intelligence', 'conductivity'];
  if (!validStats.includes(stat)) {
    return { success: false, message: `Неверная характеристика. Доступные: ${validStats.join(', ')}` };
  }

  await db.character.update({
    where: { id: characterId },
    data: { [stat]: value },
  });

  return {
    success: true,
    message: `✅ ${stat} = ${value}`,
    data: { stat, value },
  };
}

/**
 * Добавить усталость
 */
async function cheatAddFatigue(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const physical = Number(params.physical) || 0;
  const mental = Number(params.mental) || 0;

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { fatigue: true, mentalFatigue: true },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  const newPhysical = Math.max(0, Math.min(100, character.fatigue + physical));
  const newMental = Math.max(0, Math.min(100, character.mentalFatigue + mental));

  await db.character.update({
    where: { id: characterId },
    data: { fatigue: newPhysical, mentalFatigue: newMental },
  });

  return {
    success: true,
    message: `✅ Усталость: физ.${newPhysical}%, мент.${newMental}%`,
    data: { physical: newPhysical, mental: newMental },
  };
}

/**
 * Сбросить усталость
 */
async function cheatResetFatigue(characterId: string): Promise<CheatResult> {
  await db.character.update({
    where: { id: characterId },
    data: { fatigue: 0, mentalFatigue: 0, health: 100 },
  });

  return {
    success: true,
    message: '✅ Усталость сброшена, здоровье восстановлено',
  };
}

/**
 * Дать технику по ID пресета или сгенерированного объекта
 */
async function cheatGiveTechnique(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const techniqueId = String(params.techniqueId);

  if (!techniqueId) {
    return { success: false, message: 'Укажите techniqueId' };
  }

  // Ищем технику в базе
  let technique = await db.technique.findFirst({
    where: {
      OR: [
        { id: techniqueId },
        { nameId: techniqueId },
        { name: techniqueId },
      ],
    },
  });

  // Если не нашли в базе - ищем в сгенерированных техниках
  if (!technique) {
    const { presetStorage } = await import('@/lib/generator/preset-storage');
    await presetStorage.initialize();
    
    // Ищем в сгенерированных техниках по ID
    const generatedTechnique = await presetStorage.getTechniqueById(techniqueId);
    
    if (generatedTechnique) {
      // Создаём технику в БД из сгенерированного объекта
      technique = await db.technique.create({
        data: {
          name: generatedTechnique.name,
          nameId: generatedTechnique.id,
          description: generatedTechnique.description,
          type: generatedTechnique.type,
          subtype: generatedTechnique.subtype ?? null,
          element: generatedTechnique.element,
          rarity: generatedTechnique.rarity,
          // Сохраняем grade (новая система Матрёшка)
          grade: generatedTechnique.grade as TechniqueGrade || null,
          level: generatedTechnique.level,
          minLevel: generatedTechnique.minCultivationLevel ?? 1,
          maxLevel: generatedTechnique.level + 3,
          canEvolve: true,
          minCultivationLevel: generatedTechnique.minCultivationLevel ?? 1,
          qiCost: generatedTechnique.computed.finalQiCost,
          physicalFatigueCost: 1 + generatedTechnique.level * 0.5,
          mentalFatigueCost: 1 + generatedTechnique.level * 0.3,
          statRequirements: generatedTechnique.statRequirements ? JSON.stringify(generatedTechnique.statRequirements) : null,
          statScaling: null,
          effects: JSON.stringify({
            damage: generatedTechnique.computed.finalDamage,
            range: generatedTechnique.computed.finalRange,
            duration: generatedTechnique.computed.finalDuration,
            activeEffects: generatedTechnique.computed.activeEffects,
            combatType: generatedTechnique.subtype,
            weaponType: generatedTechnique.weaponType,
          }),
          computedValues: JSON.stringify(generatedTechnique.computed),
          modifiers: JSON.stringify(generatedTechnique.modifiers),
          weaponType: generatedTechnique.weaponType ?? null,
          isRangedQi: generatedTechnique.isRangedQi ?? false,
          source: 'generated',
        },
      });
      
      await logInfo('CHEATS', `Created technique from generated: ${techniqueId} (grade: ${generatedTechnique.grade || 'none'})`);
    }
  }

  // Если не нашли в сгенерированных - ищем в пресетах
  if (!technique) {
    const { ALL_TECHNIQUE_PRESETS } = await import('@/data/presets/technique-presets');
    const preset = ALL_TECHNIQUE_PRESETS.find(t => t.id === techniqueId || t.name === techniqueId);

    if (preset) {
      technique = await db.technique.create({
        data: {
          name: preset.name,
          nameId: preset.id,
          description: preset.description,
          type: preset.techniqueType,
          element: preset.element,
          rarity: preset.rarity,
          level: preset.level,
          minLevel: preset.minLevel,
          maxLevel: preset.maxLevel,
          canEvolve: preset.canEvolve !== false,
          minCultivationLevel: preset.requirements?.cultivationLevel ?? 1,
          qiCost: preset.qiCost,
          physicalFatigueCost: preset.fatigueCost.physical,
          mentalFatigueCost: preset.fatigueCost.mental,
          statRequirements: preset.requirements?.stats ? JSON.stringify(preset.requirements.stats) : null,
          statScaling: preset.scaling ? JSON.stringify(preset.scaling) : null,
          effects: preset.effects ? JSON.stringify(preset.effects) : null,
          source: 'preset',
        },
      });
      
      await logInfo('CHEATS', `Created technique from preset: ${techniqueId}`);
    }
  }

  if (!technique) {
    return { success: false, message: `Техника "${techniqueId}" не найдена ни в пресетах, ни в сгенерированных объектах. Проверьте ID или сгенерируйте техники в Настройках → Генератор.` };
  }

  // Проверяем, не изучена ли уже
  const existing = await db.characterTechnique.findUnique({
    where: {
      characterId_techniqueId: {
        characterId,
        techniqueId: technique.id,
      },
    },
  });

  if (existing) {
    return { success: false, message: `Техника "${technique.name}" уже изучена` };
  }

  // Изучаем технику
  await db.characterTechnique.create({
    data: {
      characterId,
      techniqueId: technique.id,
      mastery: 0,
      learningProgress: 100,
      learningSource: 'preset',
    },
  });

  return {
    success: true,
    message: `✅ Изучена техника: ${technique.name} (${techniqueId})`,
    data: { techniqueId: technique.id, techniqueName: technique.name },
  };
}

/**
 * Сгенерировать пул техник
 */
async function cheatGenTechniques(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const level = Number(params.level) || 1;
  const count = Number(params.count) || 5;
  const triggerType = (String(params.triggerType) || 'insight') as TriggerType;

  const result = await generateTechniquePool({
    characterId,
    targetLevel: level,
    triggerType,
    count,
  });

  if (!result.success) {
    return { success: false, message: result.error || 'Ошибка генерации' };
  }

  return {
    success: true,
    message: `✅ Сгенерировано ${result.techniques?.length || 0} техник уровня ${level}`,
    data: {
      poolId: result.poolId,
      techniques: result.techniques?.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        element: t.element,
        rarity: t.rarity,
      })),
    },
  };
}

/**
 * Добавить прозрение (qiUnderstanding)
 */
async function cheatAddInsight(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const amount = Number(params.amount) || 50;

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { qiUnderstanding: true, qiUnderstandingCap: true },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  const newValue = Math.min(character.qiUnderstanding + amount, character.qiUnderstandingCap);

  await db.character.update({
    where: { id: characterId },
    data: { qiUnderstanding: newValue },
  });

  return {
    success: true,
    message: `✅ Прозрение +${amount} = ${newValue}/${character.qiUnderstandingCap}`,
    data: { qiUnderstanding: newValue },
  };
}

/**
 * Мгновенный прорыв
 */
async function cheatBreakthrough(characterId: string): Promise<CheatResult> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: {
      cultivationLevel: true,
      cultivationSubLevel: true,
      coreCapacity: true,
      accumulatedQi: true,
    },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  // Определяем новый уровень
  let newLevel = character.cultivationLevel;
  let newSubLevel = character.cultivationSubLevel + 1;
  const isMajor = newSubLevel >= 10;

  if (isMajor) {
    newLevel = Math.min(9, newLevel + 1);
    newSubLevel = 0;
  }

  // Новая ёмкость ядра
  const newCapacity = Math.floor(character.coreCapacity * 1.1);

  await db.character.update({
    where: { id: characterId },
    data: {
      cultivationLevel: newLevel,
      cultivationSubLevel: newSubLevel,
      coreCapacity: newCapacity,
      accumulatedQi: 0,
      currentQi: 0,
    },
  });

  return {
    success: true,
    message: `✅ Прорыв! Уровень: ${newLevel}.${newSubLevel}, ёмкость: ${newCapacity}`,
    data: { level: newLevel, subLevel: newSubLevel, coreCapacity: newCapacity },
  };
}

/**
 * Установить время
 */
async function cheatSetTime(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const session = await db.gameSession.findFirst({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    return { success: false, message: 'Сессия не найдена' };
  }

  const updateData: Record<string, number> = {};

  if (params.hour !== undefined) updateData.worldHour = Number(params.hour);
  if (params.day !== undefined) updateData.worldDay = Number(params.day);
  if (params.month !== undefined) updateData.worldMonth = Number(params.month);
  if (params.year !== undefined) updateData.worldYear = Number(params.year);

  await db.gameSession.update({
    where: { id: session.id },
    data: updateData,
  });

  return {
    success: true,
    message: `✅ Время обновлено`,
    data: updateData,
  };
}

/**
 * Добавить ресурсы
 */
async function cheatAddResources(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const points = Number(params.points) || 0;
  const stones = Number(params.stones) || 0;

  const character = await db.character.update({
    where: { id: characterId },
    data: {
      contributionPoints: { increment: points },
      spiritStones: { increment: stones },
    },
  });

  return {
    success: true,
    message: `✅ Ресурсы: +${points} ОВ, +${stones} камней`,
    data: {
      contributionPoints: character.contributionPoints,
      spiritStones: character.spiritStones,
    },
  };
}

/**
 * Полное восстановление
 */
async function cheatFullRestore(characterId: string): Promise<CheatResult> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { coreCapacity: true },
  });

  if (!character) {
    return { success: false, message: 'Персонаж не найден' };
  }

  await db.character.update({
    where: { id: characterId },
    data: {
      currentQi: character.coreCapacity,
      health: 100,
      fatigue: 0,
      mentalFatigue: 0,
    },
  });

  return {
    success: true,
    message: '✅ Полное восстановление: Ци, здоровье, усталость сброшены',
  };
}

/**
 * God Mode
 */
async function cheatGodMode(characterId: string): Promise<CheatResult> {
  await db.character.update({
    where: { id: characterId },
    data: {
      currentQi: 99999,
      coreCapacity: 99999,
      health: 999,
      fatigue: 0,
      mentalFatigue: 0,
      strength: 100,
      agility: 100,
      intelligence: 100,
      conductivity: 100,
      qiUnderstanding: 9999,
      qiUnderstandingCap: 9999,
    },
  });

  return {
    success: true,
    message: '✨ GOD MODE активирован: бесконечная Ци, максимальные статы',
  };
}

/**
 * Добавить Камень Ци в инвентарь
 */
async function cheatAddQiStone(characterId: string, params: Record<string, unknown>): Promise<CheatResult> {
  const { createQiStoneItem, QI_STONE_DEFINITIONS, QiStoneQuality } = await import('@/types/qi-stones');
  
  const quality = (String(params.quality) || 'stone') as QiStoneQuality;
  const quantity = Number(params.quantity) || 1;
  
  // Валидация качества
  const validQualities = Object.keys(QI_STONE_DEFINITIONS) as QiStoneQuality[];
  if (!validQualities.includes(quality)) {
    return { 
      success: false, 
      message: `Неверное качество. Доступные: ${validQualities.join(', ')}` 
    };
  }
  
  const def = QI_STONE_DEFINITIONS[quality];
  const itemData = createQiStoneItem(quality, quantity);
  
  try {
    // Ищем существующий стак
    const existingItem = await db.inventoryItem.findFirst({
      where: {
        characterId,
        nameId: itemData.nameId,
        location: 'inventory',
        quantity: { lt: def.maxStack },
      },
    });
    
    let item;
    
    if (existingItem) {
      // Увеличиваем количество в существующем стаке
      const newQuantity = Math.min(
        existingItem.quantity + quantity,
        def.maxStack
      );
      
      item = await db.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          weight: def.weight * newQuantity,
        },
      });
      
      await logInfo('CHEATS', `Updated Qi Stone stack: ${itemData.name} x${newQuantity}`);
    } else {
      // Находим свободную позицию
      const existingItems = await db.inventoryItem.findMany({
        where: { characterId, location: 'inventory' },
        select: { posX: true, posY: true, sizeWidth: true, sizeHeight: true },
      });
      
      const occupied = new Set<string>();
      for (const i of existingItems) {
        if (i.posX !== null && i.posY !== null) {
          for (let dx = 0; dx < (i.sizeWidth || 1); dx++) {
            for (let dy = 0; dy < (i.sizeHeight || 1); dy++) {
              occupied.add(`${i.posX + dx},${i.posY + dy}`);
            }
          }
        }
      }
      
      // Ищем свободное место (7x7 сетка)
      let posX = 0;
      let posY = 0;
      
      outer:
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          if (!occupied.has(`${x},${y}`)) {
            posX = x;
            posY = y;
            break outer;
          }
        }
      }
      
      // Создаём новый предмет
      item = await db.inventoryItem.create({
        data: {
          characterId,
          name: itemData.name,
          nameId: itemData.nameId,
          description: itemData.description,
          type: itemData.type,
          category: itemData.category,
          rarity: itemData.rarity,
          icon: itemData.icon,
          quantity: itemData.quantity,
          maxStack: itemData.maxStack,
          stackable: true,
          sizeWidth: itemData.size.width,
          sizeHeight: itemData.size.height,
          weight: def.weight * quantity,
          posX,
          posY,
          location: 'inventory',
          isConsumable: true,
          stats: JSON.stringify(itemData.stats || {}),
          effects: JSON.stringify(itemData.consumable || {}),
          value: itemData.value,
          currency: 'spirit_stones',
        },
      });
      
      await logInfo('CHEATS', `Created Qi Stone: ${itemData.name} x${quantity} at (${posX}, ${posY})`);
    }
    
    return {
      success: true,
      message: `✅ Добавлен ${itemData.name} x${quantity} в инвентарь`,
      data: {
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    await logWarn('CHEATS', 'Failed to add Qi Stone', { error: errorMsg, params });
    return { success: false, message: `Ошибка добавления камня Ци: ${errorMsg}` };
  }
}

// ============================================
// СПРАВКА ПО КОМАНДАМ
// ============================================

export const CHEAT_COMMANDS_HELP = `
📖 ЧИТ-КОМАНДЫ ДЛЯ ТЕСТИРОВАНИЯ

⚠️ Доступны только в development режиме!

=== УРОВЕНЬ КУЛЬТИВАЦИИ ===
set_level {level: 1-9, subLevel: 0-9}
  Пример: set_level {level: 5, subLevel: 3}
  → Уровень 5.3, пересчитывается ёмкость ядра

breakthrough
  → Мгновенный прорыв на следующий под-уровень

=== ЦИ ===
add_qi {amount: 100}
  → Добавить Ци

set_qi {amount: 0}
  → Установить точное значение Ци

full_restore
  → Восстановить Ци до максимума, сбросить усталость

=== ХАРАКТЕРИСТИКИ ===
add_stat {stat: "strength", amount: 5}
  → Добавить к характеристике

set_stat {stat: "intelligence", value: 50}
  → Установить характеристику

  Доступные статы: strength, agility, intelligence, conductivity

=== УСТАЛОСТЬ ===
add_fatigue {physical: 20, mental: 10}
  → Добавить усталость

reset_fatigue
  → Сбросить усталость и восстановить здоровье

=== ТЕХНИКИ ===
give_technique {techniqueId: "fire-palm"}
  → Изучить технику по ID или названию

gen_techniques {level: 2, count: 5}
  → Сгенерировать пул техник через LLM

=== ПРОЗРЕНИЕ ===
add_insight {amount: 50}
  → Добавить очки прозрения

=== ВРЕМЯ ===
set_time {hour: 12, day: 15}
  → Установить игровое время

=== РЕСУРСЫ ===
add_resources {points: 100, stones: 50}
  → Добавить очки вклада и духовные камни

add_qi_stone {quality: "stone", quantity: 1}
  → Добавить Камень Ци в инвентарь
  Доступные качества: shard, fragment, stone, crystal, heart, core

=== GOD MODE ===
god_mode
  → Максимальные статы, бесконечная Ци, бессмертие
`;
