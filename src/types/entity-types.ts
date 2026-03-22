/**
 * ============================================================================
 * ТИПЫ СУЩНОСТЕЙ (Entity Types)
 * ============================================================================
 * 
 * Базовые типы для иерархии классификации сущностей.
 * 
 * @see docs/soul-system.md — ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ
 * @see src/types/entity-types.ts — базовые типы
 * 
 * ============================================================================
 */

// ============================================
// УРОВЕНЬ 1: SoulType (ПЕРВИЧНЫЙ)
// ============================================

/**
 * Тип души — определяет структуру сущности
 * 
 * ИСТОЧНИК: docs/soul-system.md
 * 
 * - character: Разумные существа (organic body + core Qi + full mind)
 * - creature: Животные (organic body + core Qi + instinct mind)
 * - spirit: Духи (ethereal body + reservoir Qi + full mind)
 * - artifact: Разумные предметы (mineral body + reservoir Qi + simple mind)
 * - construct: Конструкты (construct body + reservoir Qi + simple mind)
 */
export type SoulType = 
  | 'character'  
  | 'creature'   
  | 'spirit'     
  | 'artifact'   
  | 'construct';

// ============================================
// УРОВЕНЬ 2: Morphology (ВТОРИЧНЫЙ)
// ============================================

/**
 * Морфология тела — внешняя форма
 * 
 * ИСТОЧНИК: docs/body_review.md
 */
export type BodyMorphology = 
  | 'humanoid'          // Двурукое двуногое (11 частей + сердце)
  | 'quadruped'         // Четвероногое (8 частей + сердце)
  | 'bird'              // Крылатое (6-7 частей)
  | 'serpentine'        // Змееподобное (6 частей + сегменты)
  | 'amorphous'         // Бесформенное (2 части: core + essence)
  | 'hybrid_centaur'    // Кентавр (человеческий торс + лошадиное тело)
  | 'hybrid_mermaid'    // Русалка (человеческий торс + рыбий хвост)
  | 'hybrid_harpy'      // Гарпия (крылья вместо рук)
  | 'hybrid_lamia';     // Ламия (человеческий торс + змеиное тело)

// ============================================
// МАТЕРИАЛ ТЕЛА
// ============================================

/**
 * Материал тела
 * 
 * ИСТОЧНИК: docs/soul-system.md
 */
export type BodyMaterial = 
  | 'organic'    // Органика (плоть) — базовый для character, creature
  | 'scaled'     // Чешуя — подтип organic для рептилий, драконов
  | 'ethereal'   // Эфир — для духов, бесплотных
  | 'mineral'    // Минерал — камень, кристалл
  | 'construct'  // Конструкт — сборное тело (разные материалы)
  | 'chaos';     // Хаос — аномалии, нестабильная материя

// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Характеристики материалов тела
 */
export const BODY_MATERIAL_CONFIG = {
  organic: {
    hardness: 3,
    damageReduction: 0,
    description: 'Органическая плоть',
  },
  scaled: {
    hardness: 6,
    damageReduction: 30,
    description: 'Чешуя — защита от физики',
  },
  ethereal: {
    hardness: 1,
    damageReduction: 70,
    description: 'Эфирная материя — уязвима к духовному урону',
  },
  mineral: {
    hardness: 8,
    damageReduction: 50,
    description: 'Камень/кристалл — очень твёрдый',
  },
  construct: {
    hardness: 5,
    damageReduction: 30,
    description: 'Сборное тело',
  },
  chaos: {
    hardness: 5,
    damageReduction: 0,  // Переменно!
    description: 'Хаотическая материя — непредсказуемо',
  },
} as const;

/**
 * Соответствие старой классификации (SpeciesType) → новой (SoulType)
 */
export const SPECIES_TYPE_TO_SOUL_TYPE: Record<string, SoulType> = {
  humanoid: 'character',
  beast: 'creature',
  spirit: 'spirit',
  hybrid: 'character',
  aberration: 'spirit',  // Большинство аберраций — spirit
  construct: 'construct',
} as const;

/**
 * Соответствие BodyTemplate → BodyMorphology
 */
export const BODY_TEMPLATE_TO_MORPHOLOGY: Record<string, BodyMorphology> = {
  humanoid: 'humanoid',
  beast_quadruped: 'quadruped',
  beast_bird: 'bird',
  beast_serpentine: 'serpentine',
  spirit: 'amorphous',
} as const;
