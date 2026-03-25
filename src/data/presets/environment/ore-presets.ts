/**
 * ============================================================================
 * ПРЕСЕТЫ РУД - Ore Presets
 * ============================================================================
 * 
 * Рудные жилы как источники ресурсов.
 * Требуют инструменты и определённый уровень культивации для добычи.
 */

import type { OrePreset } from '@/types/environment';

/**
 * Пресеты рудных жил
 */
export const ORE_PRESETS: OrePreset[] = [
  // ==================== ОБЫЧНЫЕ РУДЫ ====================
  {
    id: 'iron_ore_01',
    name: 'Железная руда',
    nameEn: 'Iron Ore',
    description: 'Залежи железной руды. Базовый материал для кузнечного дела.',
    
    type: 'iron_ore',
    category: 'resource',
    rarity: 'common',
    
    size: 'medium',
    width: 1.0,
    height: 0.8,
    
    resource: {
      type: 'ore',
      oreType: 'iron_ore',
      yieldMin: 5,
      yieldMax: 15,
      quality: 'low',
      requiredTool: 'pickaxe',
      requiredLevel: 0,
      respawnTime: 2880,  // 2 дня
    },
    
    isBlocking: true,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x4a4a4a,
      veinColor: 0x8b4513,
    },
    
    health: 800,
    defense: 60,
  },
  
  {
    id: 'copper_ore_01',
    name: 'Медная руда',
    nameEn: 'Copper Ore',
    description: 'Залежи медной руды. Мягкий металл для простых изделий.',
    
    type: 'copper_ore',
    category: 'resource',
    rarity: 'common',
    
    size: 'small',
    width: 0.7,
    height: 0.5,
    
    resource: {
      type: 'ore',
      oreType: 'copper_ore',
      yieldMin: 3,
      yieldMax: 10,
      quality: 'low',
      requiredTool: 'pickaxe',
      requiredLevel: 0,
      respawnTime: 1440,
    },
    
    isBlocking: true,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x3d3d3d,
      veinColor: 0xb87333,
    },
    
    health: 500,
    defense: 40,
  },
  
  {
    id: 'silver_ore_01',
    name: 'Серебряная руда',
    nameEn: 'Silver Ore',
    description: 'Залежи серебра. Используется для проводников и украшений.',
    
    type: 'silver_ore',
    category: 'resource',
    rarity: 'uncommon',
    
    size: 'small',
    width: 0.6,
    height: 0.5,
    
    resource: {
      type: 'ore',
      oreType: 'silver_ore',
      yieldMin: 2,
      yieldMax: 6,
      quality: 'medium',
      requiredTool: 'pickaxe',
      requiredLevel: 1,
      respawnTime: 4320,
    },
    
    isBlocking: true,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x4a4a4a,
      veinColor: 0xc0c0c0,
      glowColor: 0xe8e8e8,
      glowIntensity: 0.3,
    },
    
    health: 1000,
    defense: 70,
  },
  
  // ==================== РЕДКИЕ РУДЫ ====================
  {
    id: 'gold_ore_01',
    name: 'Золотая руда',
    nameEn: 'Gold Ore',
    description: 'Залежи золота. Редкий металл для артефактов.',
    
    type: 'gold_ore',
    category: 'resource',
    rarity: 'rare',
    
    size: 'small',
    width: 0.5,
    height: 0.4,
    
    resource: {
      type: 'ore',
      oreType: 'gold_ore',
      yieldMin: 1,
      yieldMax: 4,
      quality: 'high',
      requiredTool: 'pickaxe',
      requiredLevel: 2,
      respawnTime: 7200,
    },
    
    isBlocking: true,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x3d3d3d,
      veinColor: 0xffd700,
      glowColor: 0xffec8b,
      glowIntensity: 0.5,
    },
    
    health: 1500,
    defense: 80,
  },
  
  {
    id: 'jade_ore_01',
    name: 'Нефритовая жила',
    nameEn: 'Jade Vein',
    description: 'Залежи нефрита. Материал для духовных артефактов.',
    
    type: 'jade_ore',
    category: 'resource',
    rarity: 'rare',
    
    size: 'medium',
    width: 1.2,
    height: 0.8,
    
    resource: {
      type: 'ore',
      oreType: 'jade_ore',
      yieldMin: 2,
      yieldMax: 8,
      quality: 'high',
      requiredTool: 'pickaxe',
      requiredLevel: 3,
      respawnTime: 8640,
    },
    
    isBlocking: true,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x2d5a3d,
      veinColor: 0x50c878,
      glowColor: 0x7fffd4,
      glowIntensity: 0.4,
    },
    
    health: 2000,
    defense: 100,
  },
  
  // ==================== ДУХОВНЫЕ РУДЫ ====================
  {
    id: 'spirit_ore_01',
    name: 'Духовная руда',
    nameEn: 'Spirit Ore',
    description: 'Руда, впитавшая духовную энергию. Для создания артефактов культиватора.',
    
    type: 'spirit_ore',
    category: 'resource',
    rarity: 'legendary',
    
    size: 'small',
    width: 0.4,
    height: 0.3,
    
    resource: {
      type: 'ore',
      oreType: 'spirit_ore',
      yieldMin: 1,
      yieldMax: 3,
      quality: 'high',
      requiredTool: 'pickaxe',
      requiredLevel: 4,
      respawnTime: 14400,
    },
    
    isBlocking: false,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x1e1b4b,
      veinColor: 0x8b5cf6,
      glowColor: 0xa78bfa,
      glowIntensity: 0.8,
    },
    
    health: 3000,
    defense: 150,
  },
  
  {
    id: 'crystal_qi_01',
    name: 'Кристалл Ци',
    nameEn: 'Qi Crystal',
    description: 'Кристаллизованная духовная энергия. Можно собрать без инструментов.',
    
    type: 'crystal',
    category: 'resource',
    rarity: 'legendary',
    
    size: 'small',
    width: 0.3,
    height: 0.4,
    
    resource: {
      type: 'ore',
      oreType: 'crystal',
      yieldMin: 1,
      yieldMax: 2,
      quality: 'high',
      requiredTool: 'hands',
      requiredLevel: 5,
      respawnTime: 21600,
    },
    
    isBlocking: false,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x0f172a,
      veinColor: 0x4ade80,
      glowColor: 0x22c55e,
      glowIntensity: 1.0,
    },
    
    health: 500,
    defense: 50,
  },
];

/**
 * Получить пресет руды по ID
 */
export function getOrePreset(id: string): OrePreset | undefined {
  return ORE_PRESETS.find(preset => preset.id === id);
}

/**
 * Получить пресеты по типу
 */
export function getOrePresetsByType(type: OrePreset['type']): OrePreset[] {
  return ORE_PRESETS.filter(preset => preset.type === type);
}

/**
 * Получить руды по уровню требования
 */
export function getOreByRequiredLevel(level: number): OrePreset[] {
  return ORE_PRESETS.filter(preset => preset.resource.requiredLevel <= level);
}

/**
 * Получить руды со свечением
 */
export function getGlowingOres(): OrePreset[] {
  return ORE_PRESETS.filter(preset => preset.visual.glowColor !== undefined);
}

/**
 * Весовые коэффициенты для случайной генерации
 */
export const ORE_SPAWN_WEIGHTS: Record<OrePreset['type'], number> = {
  iron_ore: 35,
  copper_ore: 30,
  silver_ore: 15,
  gold_ore: 8,
  jade_ore: 6,
  spirit_ore: 4,
  crystal: 2,
};

/**
 * Выбрать случайный пресет руды с учётом весов
 */
export function selectRandomOrePreset(random: number): OrePreset {
  const totalWeight = Object.values(ORE_SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
  let threshold = random * totalWeight;
  
  for (const [type, weight] of Object.entries(ORE_SPAWN_WEIGHTS)) {
    threshold -= weight;
    if (threshold <= 0) {
      const presetsOfType = getOrePresetsByType(type as OrePreset['type']);
      if (presetsOfType.length > 0) {
        return presetsOfType[Math.floor(Math.random() * presetsOfType.length)];
      }
    }
  }
  
  return ORE_PRESETS[0];
}

/**
 * Руды по глубине
 */
export const ORE_BY_DEPTH = {
  surface: ['copper_ore_01', 'iron_ore_01'],
  shallow: ['iron_ore_01', 'silver_ore_01'],
  medium: ['silver_ore_01', 'gold_ore_01', 'jade_ore_01'],
  deep: ['gold_ore_01', 'jade_ore_01', 'spirit_ore_01'],
  core: ['spirit_ore_01', 'crystal_qi_01'],
};
