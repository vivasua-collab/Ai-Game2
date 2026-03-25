/**
 * ============================================================================
 * ОРКЕСТРАТОР ПОЛНОЙ ГЕНЕРАЦИИ NPC
 * ============================================================================
 * 
 * Объединяет все генераторы для создания NPC с:
 * - Техниками (по слотам)
 * - Формациями (1 с 5-го уровня, +1 каждые 2 уровня)
 * - Экипировкой (оружие, броня, аксессуары)
 * - Инвентарём (расходники)
 * 
 * ВАЖНО: Замеряет время генерации каждого компонента!
 */

import {
  generateNPC,
  type GeneratedNPC,
  type NPCGenerationContext,
  seededRandom,
} from './npc-generator';
// V2 Generator (актуальный)
import {
  generateTechniqueV2,
  type GeneratedTechniqueV2,
  type TechniqueType,
  type TechniqueElement,
} from './technique-generator-v2';

// Совместимость V1 ↔ V2
import { v2ToV1 } from './technique-compat';

// Тип для совместимости с TempNPC
import type { GeneratedTechnique } from './technique-generator';

// Алиас для совместимости
type Element = TechniqueElement;
import {
  generateFormation,
  type GeneratedFormation,
  type FormationType,
} from './formation-generator';
import {
  generateFullEquipmentForNPC,
  getWealthByRole,
  isCombatRole,
  type WealthLevel,
} from './equipment-generator';
import { calculateTechniqueSlots } from './lore-formulas';
import { getPrefixForTechniqueType } from './id-config';
import type { TempNPC, TempItem, TempEquipment } from '@/types/temp-npc';

// ==================== ТИПЫ ====================

/**
 * Результат полной генерации NPC
 */
export interface FullNPCGenerationResult {
  success: boolean;
  npc: TempNPC | null;
  techniques: GeneratedTechnique[];
  formations: GeneratedFormation[];
  equipment: TempEquipment;
  inventory: TempItem[];
  
  // Метрики времени (в миллисекундах)
  timing: {
    total: number;
    baseNPC: number;
    techniques: number;
    formations: number;
    equipment: number;
    inventory: number;
  };
  
  // Метаинформация
  meta: {
    cultivationLevel: number;
    techniqueSlots: number;
    formationCount: number;
    seed: number;
    generatedAt: string;
  };
  
  errors: string[];
}

/**
 * Контекст полной генерации
 */
export interface FullNPCGenerationContext extends NPCGenerationContext {
  // Дополнительные параметры
  forceFullEquipment?: boolean;    // Полная экипировка независимо от шансов
  forceAllTechniqueSlots?: boolean; // Заполнить все слоты техник
  preferredElements?: Element[];    // Предпочтительные элементы
  preferredTechniqueTypes?: TechniqueType[]; // Предпочтительные типы техник
}

// ==================== КОНСТАНТЫ ====================

/**
 * Количество формаций по уровню культивации
 * Правило: 1 формация с 5-го уровня, +1 каждые 2 уровня после 5-го
 * L1-4: 0 формаций
 * L5-6: 1 формация
 * L7-8: 2 формации
 * L9: 2 формации (или 3 если изменить правило)
 */
export function calculateFormationSlots(cultivationLevel: number): number {
  if (cultivationLevel < 5) return 0;
  // L5-6 = 1, L7-8 = 2, L9 = 2
  return Math.min(2, Math.floor((cultivationLevel - 4) / 2) + 1);
}

/**
 * Типы техник по умолчанию для разных ролей
 */
const DEFAULT_TECHNIQUE_TYPES: Record<string, TechniqueType[]> = {
  combat: ['combat', 'defense', 'movement'],
  support: ['healing', 'support', 'defense'],
  balanced: ['combat', 'defense', 'support', 'healing'],
};

/**
 * Элементы по умолчанию
 */
const DEFAULT_ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];

// ==================== СЧЁТЧИКИ ====================

let techniqueCounter = 1;
let formationCounter = 1;
let npcCounter = 1;

export function resetAllCounters(): void {
  techniqueCounter = 1;
  formationCounter = 1;
  npcCounter = 1;
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

/**
 * Полная генерация NPC со всеми компонентами
 * 
 * @param context Контекст генерации
 * @returns Результат с NPC, предметами и метриками времени
 */
export function generateFullNPC(
  context: FullNPCGenerationContext
): FullNPCGenerationResult {
  const startTime = performance.now();
  const errors: string[] = [];
  
  const timing = {
    total: 0,
    baseNPC: 0,
    techniques: 0,
    formations: 0,
    equipment: 0,
    inventory: 0,
  };
  
  // Результаты
  let tempNPC: TempNPC | null = null;
  const techniques: GeneratedTechnique[] = [];
  const formations: GeneratedFormation[] = [];
  let equipment: TempEquipment = {};
  const inventory: TempItem[] = [];
  
  try {
    // ========== 1. Базовый NPC ==========
    const baseNPCStart = performance.now();
    
    const seed = context.seed ?? Date.now();
    const baseNPC = generateNPC({ ...context, seed });
    
    timing.baseNPC = performance.now() - baseNPCStart;
    
    // ========== 2. Генерация техник ==========
    const techniquesStart = performance.now();
    
    const techniqueSlots = calculateTechniqueSlots(baseNPC.cultivation.level);
    const techniqueTypes = context.preferredTechniqueTypes || 
      DEFAULT_TECHNIQUE_TYPES['balanced'];
    const elements = context.preferredElements || DEFAULT_ELEMENTS;
    
    for (let i = 0; i < techniqueSlots; i++) {
      try {
        const type = techniqueTypes[i % techniqueTypes.length];
        const element = elements[i % elements.length];
        const prefix = getPrefixForTechniqueType(type, 'melee_strike');
        const id = `${prefix}_${(techniqueCounter++).toString().padStart(6, '0')}`;
        
        // V2: Генерируем технику через новый генератор
        const techniqueV2 = generateTechniqueV2({
          id,
          type,
          element,
          level: baseNPC.cultivation.level,
          seed: seed + i * 1000,
          combatSubtype: type === 'combat' ? 'melee_strike' : undefined,
        });
        
        // Конвертируем V2 → V1 для совместимости с TempNPC.techniqueData
        const technique = v2ToV1(techniqueV2);
        techniques.push(technique);
      } catch (e) {
        errors.push(`Failed to generate technique ${i}: ${e}`);
      }
    }
    
    timing.techniques = performance.now() - techniquesStart;
    
    // ========== 3. Генерация формаций ==========
    const formationsStart = performance.now();
    
    const formationSlots = calculateFormationSlots(baseNPC.cultivation.level);
    const formationTypes: FormationType[] = ['defensive', 'offensive', 'support', 'special'];
    
    for (let i = 0; i < formationSlots; i++) {
      try {
        const type = formationTypes[i % formationTypes.length];
        const id = `FM_${(formationCounter++).toString().padStart(6, '0')}`;
        
        const formation = generateFormation(
          id,
          type,
          Math.min(5, Math.ceil(baseNPC.cultivation.level / 2)), // Уровень формации = половина уровня культивации
          seed + i * 2000
        );
        
        formations.push(formation);
      } catch (e) {
        errors.push(`Failed to generate formation ${i}: ${e}`);
      }
    }
    
    timing.formations = performance.now() - formationsStart;
    
    // ========== 4. Создание TempNPC ==========
    tempNPC = convertToTempNPC(baseNPC, techniques, formations);
    
    // ========== 5. Генерация экипировки ==========
    const equipmentStart = performance.now();
    
    const rng = seededRandom(seed);
    generateFullEquipmentForNPC(tempNPC, rng);
    
    equipment = { ...tempNPC.equipment };
    
    timing.equipment = performance.now() - equipmentStart;
    
    // ========== 6. Инвентарь уже в tempNPC ==========
    const inventoryStart = performance.now();
    
    if (tempNPC.quickSlots) {
      for (const slot of tempNPC.quickSlots) {
        if (slot) inventory.push(slot);
      }
    }
    
    timing.inventory = performance.now() - inventoryStart;
    
  } catch (e) {
    errors.push(`Critical error: ${e}`);
  }
  
  timing.total = performance.now() - startTime;
  
  return {
    success: errors.length === 0 && tempNPC !== null,
    npc: tempNPC,
    techniques,
    formations,
    equipment,
    inventory,
    timing,
    meta: {
      cultivationLevel: context.cultivationLevel as number || 1,
      techniqueSlots: calculateTechniqueSlots(context.cultivationLevel as number || 1),
      formationCount: calculateFormationSlots(context.cultivationLevel as number || 1),
      seed: context.seed ?? Date.now(),
      generatedAt: new Date().toISOString(),
    },
    errors,
  };
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Конвертация GeneratedNPC + техники + формации в TempNPC
 */
function convertToTempNPC(
  baseNPC: GeneratedNPC,
  techniques: GeneratedTechnique[],
  formations: GeneratedFormation[]
): TempNPC {
  return {
    id: baseNPC.id,
    name: baseNPC.name,
    title: baseNPC.title,
    age: baseNPC.age,
    gender: baseNPC.gender,
    
    speciesId: baseNPC.speciesId,
    roleId: baseNPC.roleId,
    
    stats: baseNPC.stats,
    
    cultivation: {
      level: baseNPC.cultivation.level,
      subLevel: baseNPC.cultivation.subLevel,
      coreCapacity: baseNPC.cultivation.coreCapacity,
      currentQi: baseNPC.cultivation.currentQi,
      coreQuality: baseNPC.cultivation.coreQuality,
      baseVolume: baseNPC.cultivation.baseVolume,
      qiDensity: baseNPC.cultivation.qiDensity,
      meridianConductivity: baseNPC.cultivation.meridianConductivity,
      meridianBuffer: baseNPC.cultivation.meridianBuffer,
    },
    
    bodyState: baseNPC.bodyState,
    
    personality: baseNPC.personality,
    
    // Техники как ID
    techniques: techniques.map(t => t.id),
    techniqueData: techniques,
    
    // Формации как ID
    formations: formations.map(f => f.id),
    formationData: formations,
    
    // Экипировка (будет заполнена позже)
    equipment: {},
    
    // Инвентарь (будет заполнен позже)
    quickSlots: [null, null, null, null],
    
    resources: baseNPC.resources,
    
    generationMeta: baseNPC.generationMeta,
  };
}

/**
 * Массовая генерация NPC для тестирования производительности
 */
export function generateMultipleFullNPCs(
  count: number,
  context: FullNPCGenerationContext
): {
  results: FullNPCGenerationResult[];
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
} {
  const results: FullNPCGenerationResult[] = [];
  const times: number[] = [];
  const globalStart = performance.now();
  
  for (let i = 0; i < count; i++) {
    const result = generateFullNPC({
      ...context,
      seed: (context.seed ?? Date.now()) + i,
    });
    results.push(result);
    times.push(result.timing.total);
  }
  
  const totalTime = performance.now() - globalStart;
  
  return {
    results,
    totalTime,
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

/**
 * Тест скорости генерации для конкретного уровня
 */
export function benchmarkGenerationForLevel(
  level: number,
  iterations: number = 10
): {
  level: number;
  iterations: number;
  totalMs: number;
  averageMs: number;
  minMs: number;
  maxMs: number;
  components: {
    baseNPC: { avg: number; min: number; max: number };
    techniques: { avg: number; min: number; max: number };
    formations: { avg: number; min: number; max: number };
    equipment: { avg: number; min: number; max: number };
    inventory: { avg: number; min: number; max: number };
  };
  techniqueCount: number;
  formationCount: number;
} {
  const times = {
    total: [] as number[],
    baseNPC: [] as number[],
    techniques: [] as number[],
    formations: [] as number[],
    equipment: [] as number[],
    inventory: [] as number[],
  };
  
  let techniqueCount = 0;
  let formationCount = 0;
  
  for (let i = 0; i < iterations; i++) {
    const result = generateFullNPC({
      cultivationLevel: level,
      seed: Date.now() + i * 10000,
    });
    
    times.total.push(result.timing.total);
    times.baseNPC.push(result.timing.baseNPC);
    times.techniques.push(result.timing.techniques);
    times.formations.push(result.timing.formations);
    times.equipment.push(result.timing.equipment);
    times.inventory.push(result.timing.inventory);
    
    if (i === 0) {
      techniqueCount = result.techniques.length;
      formationCount = result.formations.length;
    }
  }
  
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = (arr: number[]) => Math.min(...arr);
  const max = (arr: number[]) => Math.max(...arr);
  
  return {
    level,
    iterations,
    totalMs: times.total.reduce((a, b) => a + b, 0),
    averageMs: avg(times.total),
    minMs: min(times.total),
    maxMs: max(times.total),
    components: {
      baseNPC: { avg: avg(times.baseNPC), min: min(times.baseNPC), max: max(times.baseNPC) },
      techniques: { avg: avg(times.techniques), min: min(times.techniques), max: max(times.techniques) },
      formations: { avg: avg(times.formations), min: min(times.formations), max: max(times.formations) },
      equipment: { avg: avg(times.equipment), min: min(times.equipment), max: max(times.equipment) },
      inventory: { avg: avg(times.inventory), min: min(times.inventory), max: max(times.inventory) },
    },
    techniqueCount,
    formationCount,
  };
}

// ==================== ЭКСПОРТ УТИЛИТ ====================

export { calculateTechniqueSlots };
