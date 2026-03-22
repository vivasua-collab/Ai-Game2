/**
 * ============================================================================
 * СИСТЕМА СЛАБОСТЕЙ И СОПРОТИВЛЕНИЙ (Weakness & Resistance System)
 * ============================================================================
 * 
 * Определяет уязвимости и стойкости видов к различным типам урона,
 * материалам и эффектам.
 * 
 * @see docs/body_monsters.md — документация видов
 * @see docs/elements-system.md — система стихий
 * 
 * ============================================================================
 */

// ============================================
// ТИПЫ СЛАБОСТЕЙ
// ============================================

/**
 * Категория слабости/сопротивления
 */
export type WeaknessCategory = 
  | 'material'      // Материал оружия (iron, silver)
  | 'element'       // Стихийный урон (fire, water)
  | 'damage_type'   // Тип урона (physical, magical)
  | 'condition'     // Состояния (poison, disease)
  | 'special';      // Особые (moon_deprivation, dragon_slayer)

/**
 * Материал оружия
 * 
 * ВАЖНО: Различие между железом и сталью!
 * - iron / cold_iron — традиционная слабость фейри/эльфов
 * - steel — обработанное железо, НЕ влияет на эльфов
 * - silver — слабость оборотней и зверолюдов
 */
export type WeaponMaterial = 
  | 'iron'          // Обычное железо
  | 'cold_iron'     // Холодное железо (кузнечная ковка)
  | 'steel'         // Сталь (обработанное железо)
  | 'silver'        // Чистое серебро
  | 'silver_coated' // Посеребрённое оружие
  | 'bronze'        // Бронза
  | 'copper'        // Медь
  | 'gold'          // Золото
  | 'wood'          // Дерево
  | 'bone'          // Кость
  | 'stone'         // Камень
  | 'crystal'       // Кристалл
  | 'qi_stone';     // Камень Ци

/**
 * Тип урона
 */
export type DamageType = 
  | 'physical'      // Физический урон
  | 'qi'            // Урон техниками Ци
  | 'elemental'     // Стихийный урон
  | 'true_damage';  // Чистый урон (игнорирует броню)

/**
 * Стихийный тип (из elements-system.md)
 */
export type ElementType = 
  | 'fire' 
  | 'water' 
  | 'earth' 
  | 'air' 
  | 'lightning' 
  | 'void' 
  | 'neutral' 
  | 'poison'
  | 'holy'          // Святой урон
  | 'dark';         // Тёмный урон

/**
 * Условие применения слабости
 */
export interface WeaknessCondition {
  /** Материал оружия */
  weaponMaterial?: WeaponMaterial[];
  /** Тип урона */
  damageType?: DamageType[];
  /** Стихия */
  element?: ElementType[];
  /** Временное условие (например, "полнолуние") */
  timeCondition?: string;
  /** Специальное условие */
  specialCondition?: string;
}

// ============================================
// ОПРЕДЕЛЕНИЕ СЛАБОСТИ
// ============================================

/**
 * Полное определение слабости
 */
export interface WeaknessDefinition {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  // === КАТЕГОРИЯ ===
  category: WeaknessCategory;
  
  // === МЕХАНИКА ===
  /** Множитель урона (1.5 = +50% урона) */
  damageMultiplier: number;
  /** Бонус урона (добавляется к базовому) */
  bonusDamage?: number;
  /** Игнорирует броню? */
  bypassArmor?: boolean;
  /** Блокирует регенерацию? */
  blockRegeneration?: boolean;
  
  // === УСЛОВИЯ ===
  conditions: WeaknessCondition;
  
  // === ПРИМЕНЕНИЕ ===
  /** Виды, к которым применяется */
  speciesIds: string[];
  
  // === ЭФФЕКТЫ ===
  /** Дополнительные эффекты при попадании */
  additionalEffects?: {
    condition?: string;      // Накладываемое состояние
    duration?: number;       // Длительность
    chance?: number;         // Шанс (%)
  };
  
  // === ОТОБРАЖЕНИЕ ===
  icon?: string;
  color?: string;
  
  // === ЛОР ===
  loreReason: string;
}

/**
 * Полное определение сопротивления
 */
export interface ResistanceDefinition {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  // === КАТЕГОРИЯ ===
  category: WeaknessCategory;
  
  // === МЕХАНИКА ===
  /** Снижение урона (%) */
  damageReduction: number;
  /** Множитель урона (0.5 = -50% урона) */
  damageMultiplier: number;
  /** Иммунитет? */
  immunity?: boolean;
  /** Максимальный урон */
  maxDamageCap?: number;
  
  // === УСЛОВИЯ ===
  conditions?: WeaknessCondition;
  
  // === ПРИМЕНЕНИЕ ===
  speciesIds: string[];
  
  // === ОТОБРАЖЕНИЕ ===
  icon?: string;
  color?: string;
  
  // === ЛОР ===
  loreReason: string;
}

// ============================================
// АКТИВНАЯ СЛАБОСТЬ/СОПРОТИВЛЕНИЕ
// ============================================

/**
 * Активная слабость на сущности
 */
export interface ActiveWeakness {
  definitionId: string;
  source: 'species' | 'technique' | 'condition' | 'equipment';
  sourceId?: string;
}

/**
 * Активное сопротивление на сущности
 */
export interface ActiveResistance {
  definitionId: string;
  source: 'species' | 'technique' | 'condition' | 'equipment';
  sourceId?: string;
  value?: number;  // Переопределённое значение
}

// ============================================
// РЕЗУЛЬТАТ РАСЧЁТА
// ============================================

/**
 * Результат расчёта слабости
 */
export interface WeaknessCalculationResult {
  /** Базовый урон */
  baseDamage: number;
  /** Множитель от слабостей */
  weaknessMultiplier: number;
  /** Дополнительный урон от слабостей */
  bonusDamage: number;
  /** Итоговый урон */
  finalDamage: number;
  /** Активные слабости */
  activeWeaknesses: string[];
  /** Эффекты */
  additionalEffects: Array<{
    condition: string;
    duration: number;
    chance: number;
  }>;
}

/**
 * Результат расчёта сопротивления
 */
export interface ResistanceCalculationResult {
  /** Базовый урон */
  baseDamage: number;
  /** Снижение урона (%) */
  reduction: number;
  /** Итоговый урон */
  finalDamage: number;
  /** Активные сопротивления */
  activeResistances: string[];
  /** Иммунитет? */
  isImmune: boolean;
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Проверка, является ли материал "железом" для слабости эльфов
 * 
 * ВАЖНО: Только чистое железо и холодное железо!
 * Сталь (steel) НЕ является слабостью эльфов.
 */
export function isIronForElfWeakness(material: WeaponMaterial): boolean {
  return material === 'iron' || material === 'cold_iron';
}

/**
 * Проверка, является ли материал "серебром" для слабости оборотней
 */
export function isSilverForWerewolfWeakness(material: WeaponMaterial): boolean {
  return material === 'silver' || material === 'silver_coated';
}

/**
 * Получить множитель урона от слабостей
 */
export function calculateWeaknessMultiplier(
  weaknesses: WeaknessDefinition[],
  weaponMaterial?: WeaponMaterial,
  damageType?: DamageType,
  element?: ElementType
): number {
  let multiplier = 1.0;
  
  for (const weakness of weaknesses) {
    const { conditions } = weakness;
    
    // Проверка материала оружия
    if (weaponMaterial && conditions.weaponMaterial?.includes(weaponMaterial)) {
      multiplier *= weakness.damageMultiplier;
    }
    
    // Проверка типа урона
    if (damageType && conditions.damageType?.includes(damageType)) {
      multiplier *= weakness.damageMultiplier;
    }
    
    // Проверка стихии
    if (element && conditions.element?.includes(element)) {
      multiplier *= weakness.damageMultiplier;
    }
  }
  
  return multiplier;
}
