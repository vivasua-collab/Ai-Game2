/**
 * ============================================================================
 * ПРЕСЕТЫ ДЕРЕВЬЕВ - Tree Presets
 * ============================================================================
 * 
 * Деревья как ресурсы древесины и элементы окружения.
 * Разные типы дают разное количество и качество древесины.
 */

import type { TreePreset } from '@/types/environment';

/**
 * Пресеты деревьев
 */
export const TREE_PRESETS: TreePreset[] = [
  // ==================== ХВОЙНЫЕ ====================
  {
    id: 'pine_01',
    name: 'Сосна',
    nameEn: 'Pine',
    description: 'Обычная сосна с конической кроной. Источник мягкой древесины.',
    
    type: 'pine',
    category: 'resource',
    rarity: 'common',
    
    trunkWidth: 0.3,
    trunkHeight: 3.0,
    canopyRadius: 1.5,
    
    resource: {
      type: 'wood',
      yieldMin: 30,
      yieldMax: 50,
      quality: 'low',
      requiredTool: 'axe',
      respawnTime: 1440,
    },
    
    isBlocking: true,
    providesCover: true,
    coverBonus: 0.2,
    
    visual: {
      trunkColor: 0x5c4033,
      trunkHighlight: 0x8b6914,
      canopyColor: 0x228b22,
      canopyHighlight: 0x32cd32,
      hasLeaves: false,
      leafDensity: 0.9,
    },
    
    health: 300,
    defense: 20,
    
    isSpiritual: false,
  },
  
  {
    id: 'pine_snow_01',
    name: 'Снежная сосна',
    nameEn: 'Snow Pine',
    description: 'Сосна, растущая в горах. Древесина более плотная.',
    
    type: 'pine',
    category: 'resource',
    rarity: 'uncommon',
    
    trunkWidth: 0.35,
    trunkHeight: 4.0,
    canopyRadius: 2.0,
    
    resource: {
      type: 'wood',
      yieldMin: 40,
      yieldMax: 70,
      quality: 'medium',
      requiredTool: 'axe',
      respawnTime: 2160,
    },
    
    isBlocking: true,
    providesCover: true,
    coverBonus: 0.3,
    
    visual: {
      trunkColor: 0x4a3728,
      trunkHighlight: 0x6b5344,
      canopyColor: 0x1a5f1a,
      canopyHighlight: 0x2d8b2d,
      hasLeaves: false,
      leafDensity: 0.95,
    },
    
    health: 400,
    defense: 25,
    
    isSpiritual: false,
  },
  
  // ==================== ЛИСТВЕННЫЕ ====================
  {
    id: 'oak_01',
    name: 'Дуб',
    nameEn: 'Oak',
    description: 'Могучий дуб с широкой кроной. Даёт качественную древесину.',
    
    type: 'oak',
    category: 'resource',
    rarity: 'uncommon',
    
    trunkWidth: 0.5,
    trunkHeight: 4.0,
    canopyRadius: 3.0,
    
    resource: {
      type: 'wood',
      yieldMin: 80,
      yieldMax: 120,
      quality: 'high',
      requiredTool: 'axe',
      respawnTime: 2880,
    },
    
    isBlocking: true,
    providesCover: true,
    coverBonus: 0.35,
    
    visual: {
      trunkColor: 0x4a3728,
      trunkHighlight: 0x6b5344,
      canopyColor: 0x2d5a27,
      canopyHighlight: 0x3d8b3d,
      hasLeaves: true,
      leafDensity: 0.85,
    },
    
    health: 600,
    defense: 30,
    
    isSpiritual: false,
  },
  
  {
    id: 'willow_01',
    name: 'Ива',
    nameEn: 'Willow',
    description: 'Плакучая ива у воды. Гибкая древесина для плетения.',
    
    type: 'willow',
    category: 'resource',
    rarity: 'common',
    
    trunkWidth: 0.25,
    trunkHeight: 3.5,
    canopyRadius: 2.5,
    
    resource: {
      type: 'wood',
      yieldMin: 20,
      yieldMax: 40,
      quality: 'low',
      requiredTool: 'axe',
      respawnTime: 720,
    },
    
    isBlocking: false,  // Можно пройти сквозь ветви
    providesCover: true,
    coverBonus: 0.15,
    
    visual: {
      trunkColor: 0x5c4033,
      trunkHighlight: 0x7a5a4a,
      canopyColor: 0x4a7a4a,
      canopyHighlight: 0x6b8e6b,
      hasLeaves: true,
      leafDensity: 0.6,
    },
    
    health: 150,
    defense: 10,
    
    isSpiritual: false,
  },
  
  // ==================== БАМБУК ====================
  {
    id: 'bamboo_01',
    name: 'Бамбук',
    nameEn: 'Bamboo',
    description: 'Быстрорастущий бамбук. Лёгкий и прочный материал.',
    
    type: 'bamboo',
    category: 'resource',
    rarity: 'common',
    
    trunkWidth: 0.1,
    trunkHeight: 5.0,
    canopyRadius: 0.5,
    
    resource: {
      type: 'wood',
      yieldMin: 15,
      yieldMax: 25,
      quality: 'medium',
      requiredTool: 'hands',
      respawnTime: 480,
    },
    
    isBlocking: false,
    providesCover: true,
    coverBonus: 0.1,
    
    visual: {
      trunkColor: 0x90a955,
      trunkHighlight: 0xb8c95a,
      canopyColor: 0x6b8e23,
      canopyHighlight: 0x8bb347,
      hasLeaves: true,
      leafDensity: 0.3,
    },
    
    health: 50,
    defense: 5,
    
    isSpiritual: false,
  },
  
  // ==================== ДУХОВНЫЕ ====================
  {
    id: 'spirit_tree_01',
    name: 'Духовное дерево',
    nameEn: 'Spirit Tree',
    description: 'Древнее дерево, впитавшее духовную энергию. Нельзя рубить обычным топором.',
    
    type: 'spirit_tree',
    category: 'resource',
    rarity: 'legendary',
    
    trunkWidth: 1.0,
    trunkHeight: 8.0,
    canopyRadius: 5.0,
    
    resource: {
      type: 'wood',
      yieldMin: 200,
      yieldMax: 400,
      quality: 'high',
      requiredTool: 'hands',  // Только специальные инструменты
      respawnTime: 0,  // Не респаунится
    },
    
    isBlocking: true,
    providesCover: true,
    coverBonus: 0.5,
    
    visual: {
      trunkColor: 0x8b5cf6,
      trunkHighlight: 0xa78bfa,
      canopyColor: 0x4ade80,
      canopyHighlight: 0x86efac,
      hasLeaves: true,
      leafDensity: 0.7,
    },
    
    health: 5000,
    defense: 200,
    
    isSpiritual: true,
    qiRegenBonus: 0.2,  // +20% к регенерации Ци рядом
  },
  
  // ==================== МЁРТВЫЕ ====================
  {
    id: 'dead_tree_01',
    name: 'Сухое дерево',
    nameEn: 'Dead Tree',
    description: 'Мёртвое дерево. Можно использовать как дрова или укрытие.',
    
    type: 'dead_tree',
    category: 'obstacle',
    rarity: 'common',
    
    trunkWidth: 0.3,
    trunkHeight: 2.5,
    canopyRadius: 0,
    
    resource: {
      type: 'wood',
      yieldMin: 10,
      yieldMax: 20,
      quality: 'low',
      requiredTool: 'hands',
      respawnTime: 0,
    },
    
    isBlocking: false,
    providesCover: true,
    coverBonus: 0.15,
    
    visual: {
      trunkColor: 0x4a3c2a,
      trunkHighlight: 0x5c4a3a,
      canopyColor: 0x2d1f0a,
      canopyHighlight: 0x3d281a,
      hasLeaves: false,
      leafDensity: 0,
    },
    
    health: 100,
    defense: 5,
    
    isSpiritual: false,
  },
];

/**
 * Получить пресет дерева по ID
 */
export function getTreePreset(id: string): TreePreset | undefined {
  return TREE_PRESETS.find(preset => preset.id === id);
}

/**
 * Получить пресеты по типу
 */
export function getTreePresetsByType(type: TreePreset['type']): TreePreset[] {
  return TREE_PRESETS.filter(preset => preset.type === type);
}

/**
 * Получить духовные деревья
 */
export function getSpiritualTrees(): TreePreset[] {
  return TREE_PRESETS.filter(preset => preset.isSpiritual);
}

/**
 * Получить деревья, дающие укрытие
 */
export function getTreesWithCover(): TreePreset[] {
  return TREE_PRESETS.filter(preset => preset.providesCover);
}

/**
 * Весовые коэффициенты для случайной генерации
 */
export const TREE_SPAWN_WEIGHTS: Record<TreePreset['type'], number> = {
  pine: 30,
  oak: 20,
  bamboo: 25,
  willow: 10,
  spirit_tree: 1,
  dead_tree: 14,
};

/**
 * Выбрать случайный пресет дерева с учётом весов
 */
export function selectRandomTreePreset(random: number): TreePreset {
  const totalWeight = Object.values(TREE_SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
  let threshold = random * totalWeight;
  
  for (const [type, weight] of Object.entries(TREE_SPAWN_WEIGHTS)) {
    threshold -= weight;
    if (threshold <= 0) {
      const presetsOfType = getTreePresetsByType(type as TreePreset['type']);
      if (presetsOfType.length > 0) {
        return presetsOfType[Math.floor(Math.random() * presetsOfType.length)];
      }
    }
  }
  
  return TREE_PRESETS[0];
}

/**
 * Деревья по биомам
 */
export const TREES_BY_BIOME = {
  plains: ['pine_01', 'oak_01', 'dead_tree_01'],
  forest: ['pine_01', 'oak_01', 'willow_01', 'bamboo_01'],
  mountains: ['pine_snow_01', 'dead_tree_01'],
  swamp: ['willow_01', 'dead_tree_01', 'bamboo_01'],
  desert: ['dead_tree_01'],
  spirit_ground: ['spirit_tree_01'],
};
