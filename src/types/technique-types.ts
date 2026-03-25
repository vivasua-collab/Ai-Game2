/**
 * ============================================================================
 * ЕДИНЫЕ ТИПЫ ТЕХНИК
 * ============================================================================
 * 
 * Единый источник истины для типов техник.
 * Все остальные файлы должны импортировать типы отсюда!
 * 
 * @see docs/checkpoints/checkpoint_03_20_technique_fix.md - Проблема #10, #11
 */

// ==================== ОСНОВНЫЕ ТИПЫ ТЕХНИК ====================

/**
 * Основной тип техники
 * 
 * Классификация:
 * - combat: Атакующие боевые техники (урон)
 * - defense: Защитные техники (щиты, блоки)
 * - cultivation: Техники культивации (пассивные, накопление Ци)
 * - support: Поддержка (баффы)
 * - movement: Перемещение (ускорение, телепортация)
 * - sensory: Восприятие (обнаружение, анализ)
 * - healing: Исцеление (восстановление HP)
 * - curse: Проклятия (дебаффы, длительные эффекты)
 * - poison: Отравления (DoT, яды)
 * - formation: Формации (массивы, ловушки)
 */
export type TechniqueType = 
  | "combat" 
  | "defense"
  | "cultivation" 
  | "support" 
  | "movement" 
  | "sensory" 
  | "healing"
  | "curse"
  | "poison"
  | "formation";

// ==================== ПОДТИПЫ БОЕВЫХ ТЕХНИК ====================

/**
 * Подтип атакующей техники (combat)
 * 
 * Ближний бой:
 * - melee_strike: Удар телом (руки/ноги) - высокая ёмкость
 * - melee_weapon: Удар оружием - средняя ёмкость
 * 
 * Дальний бой:
 * - ranged_projectile: Снаряд - низкая ёмкость
 * - ranged_beam: Луч - низкая ёмкость
 * - ranged_aoe: По площади - низкая ёмкость
 */
export type CombatSubtype = 
  | "melee_strike" 
  | "melee_weapon" 
  | "ranged_projectile" 
  | "ranged_beam" 
  | "ranged_aoe";

/**
 * @deprecated Используйте CombatSubtype
 * Алиас для обратной совместимости
 */
export type CombatTechniqueType = CombatSubtype;

// ==================== ПОДТИПЫ ЗАЩИТНЫХ ТЕХНИК ====================

/**
 * Подтип защитной техники (defense)
 */
export type DefenseSubtype =
  | "shield"       // Энергетический щит
  | "barrier"      // Стационарный барьер
  | "block"        // Активный блок
  | "dodge"        // Уклонение
  | "absorb"       // Поглощение урона
  | "reflect";     // Отражение урона

// ==================== ПОДТИПЫ ПРОКЛЯТИЙ ====================

/**
 * Подтип проклятия (curse)
 */
export type CurseSubtype = 
  | "combat"       // Боевое (секунды-минуты)
  | "ritual";      // Ритуальное (часы-месяцы)

/**
 * Тип эффекта проклятия
 */
export type CurseEffectType =
  | "weakness"         // Снижение силы
  | "slowness"         // Замедление
  | "blindness"        // Слепота
  | "silence"          // Блокировка техник
  | "confusion"        // Путаница
  | "fear"             // Страх
  | "exhaustion"       // Истощение
  | "qi_drain"         // Истощение Ци
  | "soul_burn"        // Жжение души (DoT)
  | "cultivation_block" // Блокировка культивации
  | "meridian_damage"   // Повреждение меридиан
  | "core_corruption"   // Разрушение ядра
  | "fate_binding"      // Связывание судьбы
  | "soul_seal";        // Печать души

// ==================== ПОДТИПЫ ОТРАВЛЕНИЙ ====================

/**
 * Подтип отравления (poison)
 */
export type PoisonSubtype = 
  | "body"         // Отравление тела
  | "qi";          // Отравление Ци

/**
 * Способ доставки яда
 */
export type PoisonDeliveryType =
  | "ingestion"       // Употребление
  | "contact"         // Контакт
  | "injection"       // Инъекция
  | "inhalation"      // Вдыхание
  | "technique"       // Через технику
  | "contaminated_qi"; // Заражённая Ци

// ==================== ЭЛЕМЕНТЫ ====================

/**
 * Элемент техники
 * 
 * 7 основных стихий + 1 специальная:
 * - fire, water, earth, air, lightning, void, neutral — для большинства техник
 * - poison — ТОЛЬКО для типа poison (ограниченная стихия)
 * 
 * Ограничения:
 * - healing → neutral ТОЛЬКО
 * - cultivation → neutral ТОЛЬКО
 * - poison → poison ТОЛЬКО
 */
export type TechniqueElement = 
  | "fire" 
  | "water" 
  | "earth" 
  | "air" 
  | "lightning" 
  | "void" 
  | "neutral"
  | "poison";

// ==================== УТИЛИТЫ ====================

/**
 * Все возможные подтипы техник
 */
export type TechniqueSubtype = 
  | CombatSubtype 
  | DefenseSubtype 
  | CurseSubtype 
  | PoisonSubtype;

/**
 * Проверяет, является ли тип техники активным (использует capacity)
 */
export function isActiveTechniqueType(type: TechniqueType): boolean {
  return type !== 'cultivation';
}

/**
 * Проверяет, является ли тип техники боевой слот
 */
export function isCombatSlotType(type: TechniqueType): boolean {
  return [
    'combat', 
    'defense', 
    'support', 
    'movement', 
    'sensory', 
    'healing',
    'curse',
    'poison'
  ].includes(type);
}

/**
 * Возвращает категорию UI для типа техники
 */
export type TechniqueUICategory = 'cultivation' | 'formations' | 'combat' | 'defense' | 'curse' | 'poison';

export function getTechniqueUICategory(type: TechniqueType): TechniqueUICategory {
  switch (type) {
    case 'cultivation': return 'cultivation';
    case 'formation': return 'formations';
    case 'defense': return 'defense';
    case 'curse': return 'curse';
    case 'poison': return 'poison';
    default: return 'combat';
  }
}

/**
 * Возвращает тип слота для техники
 */
export function getTechniqueSlotType(type: TechniqueType): 'cultivation' | 'combat' | 'curse' | null {
  switch (type) {
    case 'cultivation': return 'cultivation';
    case 'curse': return 'curse';
    case 'combat':
    case 'defense':
    case 'support':
    case 'movement':
    case 'sensory':
    case 'healing':
    case 'poison':
      return 'combat';
    default: return null;
  }
}

/**
 * Проверяет, можно ли использовать технику из меню
 */
export function canUseTechniqueFromMenu(type: TechniqueType): boolean {
  return type === 'formation';
}

/**
 * Проверяет, можно ли назначить технику в слот
 */
export function canAssignTechniqueToSlot(type: TechniqueType): boolean {
  return isCombatSlotType(type) || type === 'cultivation';
}

// ==================== ТИП АТАКИ ДЛЯ LEVEL SUPPRESSION ====================

/**
 * Тип атаки для расчёта подавления уровнем
 * 
 * - normal: Обычная атака без техники
 * - technique: Атака техникой (technique.level влияет)
 * - ultimate: Ultimate-техника (особый флаг isUltimate)
 * 
 * @see docs/body_armor.md - Секция 2.2 Таблица подавления
 */
export type AttackType = 'normal' | 'technique' | 'ultimate';

/**
 * Проверить, является ли техника ultimate
 * 
 * Ultimate-техники:
 * - Могут пробить защиту на 4+ уровней выше (10% урона)
 * - Полный иммунитет только при разнице 5+ уровней
 * - Редкие и мощные техники
 */
export function isUltimateTechnique(technique: { isUltimate?: boolean } | undefined): boolean {
  return technique?.isUltimate === true;
}

/**
 * Определить тип атаки для level suppression
 * 
 * @param hasTechnique - используется ли техника
 * @param technique - данные техники (для проверки isUltimate)
 * @returns тип атаки для таблицы подавления
 */
export function determineAttackType(
  hasTechnique: boolean,
  technique?: { isUltimate?: boolean }
): AttackType {
  if (!hasTechnique) {
    return 'normal';
  }
  
  if (isUltimateTechnique(technique)) {
    return 'ultimate';
  }
  
  return 'technique';
}

// ==================== ОГРАНИЧЕНИЯ СТИХИЙ ====================

/**
 * Основные стихии (доступны для большинства техник)
 */
export const MAIN_ELEMENTS: TechniqueElement[] = [
  'fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'
] as const;

/**
 * Получить допустимые стихии для типа техники
 * 
 * Правила:
 * - healing → neutral ТОЛЬКО
 * - cultivation → neutral ТОЛЬКО
 * - poison → poison ТОЛЬКО
 * - остальные → все основные стихии
 */
export function getAllowedElements(type: TechniqueType): TechniqueElement[] {
  switch (type) {
    case 'healing':
    case 'cultivation':
      return ['neutral'];
    case 'poison':
      return ['poison'];
    default:
      return [...MAIN_ELEMENTS];
  }
}

/**
 * Проверить допустимость стихии для типа техники
 */
export function isValidElementForType(
  type: TechniqueType, 
  element: TechniqueElement
): boolean {
  return getAllowedElements(type).includes(element);
}
