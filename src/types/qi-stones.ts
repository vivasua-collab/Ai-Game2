/**
 * ============================================================================
 * КАМНИ ЦИ (Qi Stones) - Кристаллизованная энергия Ци
 * ============================================================================
 * 
 * Камни Ци - это материализованная энергия Ци, используемая как:
 * - Валюта (низкокачественные камни)
 * - Расходники для восстановления Ци (средние)
 * - Материал для культивации (высококачественные)
 * - Артефакты (легендарные)
 * 
 * Согласно документации (qi_stone.md):
 * - Плотность кристалла: 1024 ед/см³
 * - Минимальный камень: 1000 ед. Ци
 * - Шаг качества: *10
 * - Максимум: 10,000,000 ед. Ци
 * 
 * Размеры камней (из документации):
 * - Осколок (Shard): ~1 см³ = 1024 ед Ци → округляем до 1000
 * - Фрагмент (Fragment): ~10 см³ = 10240 ед Ци → округляем до 10000
 * - Камень (Stone): ~100 см³ = 102400 ед Ци → округляем до 100000
 * - Кристалл (Crystal): ~1000 см³ = 1024000 ед Ци → округляем до 1000000
 * - Сердце (Heart): ~10000 см³ = 10240000 ед Ци → округляем до 10000000
 * - Ядро (Core): ~100000 см³ = 102400000 ед Ци → округляем до 100000000
 */

import type { InventoryItem, ItemRarity, ItemCategory } from './inventory';

// ==================== ТИПЫ ====================

/** Качество камня Ци */
export type QiStoneQuality = 
  | 'shard'     // Осколок - 1,000 Ци
  | 'fragment'  // Фрагмент - 10,000 Ци
  | 'stone'     // Камень - 100,000 Ци
  | 'crystal'   // Кристалл - 1,000,000 Ци
  | 'heart'     // Сердце - 10,000,000 Ци
  | 'core';     // Ядро - 100,000,000 Ци

/** Определение камня Ци */
export interface QiStoneDefinition {
  quality: QiStoneQuality;
  name: string;
  nameId: string;
  description: string;
  rarity: ItemRarity;
  icon: string;
  
  // Энергетические свойства
  qiContent: number;        // Количество Ци в камне (ед.)
  qiQuality: number;        // Качество Ци (множитель 1.0-2.0)
  absorptionTime: number;   // Время поглощения (секунды)
  
  // Физические свойства (по документации)
  volumeCm3: number;        // Объём в см³
  weight: number;           // Вес в кг
  size: { width: number; height: number }; // Размер в слотах инвентаря
  
  // Стоимость
  value: number;            // Базовая стоимость в дух. камнях
  
  // Эффекты при использовании
  effects: {
    qiRestore: number;      // Восстановление Ци
    purityBonus?: number;   // Бонус к чистоте ядра (%)
    conductivityBonus?: number; // Временный бонус к проводимости
  };
  
  // Стакаемость
  maxStack: number;
}

// ==================== КОНСТАНТЫ ====================

/** 
 * Плотность Ци в кристалле: 1024 ед/см³ (из документации)
 */
export const QI_CRYSTAL_DENSITY = 1024;

/**
 * Определения всех типов камней Ци
 * Согласно документации: минимальная Ци = 1000, шаг *10
 */
export const QI_STONE_DEFINITIONS: Record<QiStoneQuality, QiStoneDefinition> = {
  shard: {
    quality: 'shard',
    name: 'Осколок Ци',
    nameId: 'qi_stone_shard',
    description: 'Маленький осколок кристаллизованной Ци. Используется как мелкая валюта среди культиваторов. Размер ~1 см³.',
    rarity: 'common',
    icon: '💎',
    qiContent: 1000,
    qiQuality: 0.5,
    absorptionTime: 2,
    volumeCm3: 1,
    weight: 0.01,
    size: { width: 1, height: 1 },
    value: 1,
    effects: {
      qiRestore: 1000,
    },
    maxStack: 100,
  },
  fragment: {
    quality: 'fragment',
    name: 'Фрагмент Ци',
    nameId: 'qi_stone_fragment',
    description: 'Небольшой фрагмент кристалла Ци. Содержит достаточно энергии для базовых техник. Размер ~10 см³.',
    rarity: 'uncommon',
    icon: '💠',
    qiContent: 10000,
    qiQuality: 0.7,
    absorptionTime: 5,
    volumeCm3: 10,
    weight: 0.05,
    size: { width: 1, height: 1 },
    value: 10,
    effects: {
      qiRestore: 10000,
    },
    maxStack: 50,
  },
  stone: {
    quality: 'stone',
    name: 'Камень Ци',
    nameId: 'qi_stone_stone',
    description: 'Полноценный камень Ци. Стандартная валюта среди культиваторов. Размер ~100 см³.',
    rarity: 'rare',
    icon: '🔷',
    qiContent: 100000,
    qiQuality: 1.0,
    absorptionTime: 15,
    volumeCm3: 100,
    weight: 0.1,
    size: { width: 1, height: 1 },
    value: 100,
    effects: {
      qiRestore: 100000,
      conductivityBonus: 0.01,
    },
    maxStack: 20,
  },
  crystal: {
    quality: 'crystal',
    name: 'Кристалл Ци',
    nameId: 'qi_stone_crystal',
    description: 'Высококачественный кристалл Ци. Используется для серьёзной культивации и создания артефактов. Размер ~1000 см³.',
    rarity: 'epic',
    icon: '✴️',
    qiContent: 1000000,
    qiQuality: 1.3,
    absorptionTime: 45,
    volumeCm3: 1000,
    weight: 0.3,
    size: { width: 1, height: 1 },
    value: 1000,
    effects: {
      qiRestore: 1000000,
      purityBonus: 0.1,
      conductivityBonus: 0.05,
    },
    maxStack: 10,
  },
  heart: {
    quality: 'heart',
    name: 'Сердце Ци',
    nameId: 'qi_stone_heart',
    description: 'Легендарный кристалл, пульсирующий чистой энергией. Экстремально ценен для прорывов. Размер ~10000 см³.',
    rarity: 'legendary',
    icon: '❇️',
    qiContent: 10000000,
    qiQuality: 1.6,
    absorptionTime: 120,
    volumeCm3: 10000,
    weight: 0.5,
    size: { width: 2, height: 2 },
    value: 10000,
    effects: {
      qiRestore: 10000000,
      purityBonus: 0.5,
      conductivityBonus: 0.1,
    },
    maxStack: 5,
  },
  core: {
    quality: 'core',
    name: 'Ядро Ци',
    nameId: 'qi_stone_core',
    description: 'Мифическое ядро чистейшей Ци. Сказывают, что такие создают только древние мастера на пике культивации. Размер ~100000 см³.',
    rarity: 'mythic',
    icon: '⚡',
    qiContent: 100000000,
    qiQuality: 2.0,
    absorptionTime: 300,
    volumeCm3: 100000,
    weight: 1.0,
    size: { width: 2, height: 2 },
    value: 100000,
    effects: {
      qiRestore: 100000000,
      purityBonus: 2.0,
      conductivityBonus: 0.3,
    },
    maxStack: 1,
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить определение камня Ци по качеству
 */
export function getQiStoneDefinition(quality: QiStoneQuality): QiStoneDefinition {
  return QI_STONE_DEFINITIONS[quality];
}

/**
 * Создать предмет инвентаря из камня Ци
 */
export function createQiStoneItem(
  quality: QiStoneQuality,
  quantity: number = 1
): Omit<InventoryItem, 'id' | 'position' | 'isEquipped' | 'isBound' | 'isQuestItem'> {
  const def = getQiStoneDefinition(quality);
  
  return {
    name: def.name,
    nameId: def.nameId,
    description: def.description,
    type: 'material_qi_stone',
    category: 'material' as ItemCategory,
    rarity: def.rarity,
    icon: def.icon,
    size: def.size,
    stackable: true,
    maxStack: def.maxStack,
    quantity: Math.min(quantity, def.maxStack),
    weight: def.weight,
    value: def.value,
    currency: 'spirit_stones',
    isConsumable: true,
    consumable: {
      effect: {
        type: 'qi',
        value: def.effects.qiRestore,
      },
    },
    stats: {
      qiBonus: def.effects.qiRestore,
      conductivity: def.effects.conductivityBonus,
    },
  };
}

/**
 * Получить камень Ци по редкости
 */
export function getQiStoneByRarity(rarity: ItemRarity): QiStoneDefinition | null {
  for (const def of Object.values(QI_STONE_DEFINITIONS)) {
    if (def.rarity === rarity) {
      return def;
    }
  }
  return null;
}

/**
 * Рассчитать стоимость набора камней Ци
 */
export function calculateQiStonesValue(stones: { quality: QiStoneQuality; quantity: number }[]): number {
  return stones.reduce((total, { quality, quantity }) => {
    const def = getQiStoneDefinition(quality);
    return total + def.value * quantity;
  }, 0);
}

/**
 * Конвертировать количество Ци в оптимальный набор камней
 */
export function convertQiToStones(qiAmount: number): { quality: QiStoneQuality; quantity: number }[] {
  const result: { quality: QiStoneQuality; quantity: number }[] = [];
  let remaining = qiAmount;
  
  // Идём от самых крупных к самым мелким
  const qualities: QiStoneQuality[] = ['core', 'heart', 'crystal', 'stone', 'fragment', 'shard'];
  
  for (const quality of qualities) {
    const def = getQiStoneDefinition(quality);
    if (remaining >= def.qiContent) {
      const count = Math.floor(remaining / def.qiContent);
      if (count > 0) {
        result.push({ quality, quantity: count });
        remaining -= count * def.qiContent;
      }
    }
  }
  
  return result;
}

/**
 * Определить тип камня по количеству Ци
 */
export function getQiStoneQualityByQiAmount(qiAmount: number): QiStoneQuality {
  if (qiAmount >= 100000000) return 'core';
  if (qiAmount >= 10000000) return 'heart';
  if (qiAmount >= 1000000) return 'crystal';
  if (qiAmount >= 100000) return 'stone';
  if (qiAmount >= 10000) return 'fragment';
  return 'shard';
}

/**
 * Рассчитать объём камня Ци по количеству Ци
 * Плотность: 1024 ед/см³
 */
export function calculateQiStoneVolume(qiAmount: number): number {
  return qiAmount / QI_CRYSTAL_DENSITY;
}

/**
 * Форматирование количества Ци для отображения
 */
export function formatQiAmount(qiAmount: number): string {
  if (qiAmount >= 1000000000) {
    return `${(qiAmount / 1000000000).toFixed(1)}B`;
  }
  if (qiAmount >= 1000000) {
    return `${(qiAmount / 1000000).toFixed(1)}M`;
  }
  if (qiAmount >= 1000) {
    return `${(qiAmount / 1000).toFixed(1)}K`;
  }
  return qiAmount.toString();
}

export default QI_STONE_DEFINITIONS;
