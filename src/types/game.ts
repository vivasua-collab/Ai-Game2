/**
 * Общие типы игры
 * Единый источник типов для фронтенда и бэкенда
 */

import type { SessionId, CharacterId, LocationId, MessageId, SectId } from './branded';

// ==================== ПЕРСОНАЖ ====================

export interface Character {
  id: CharacterId;
  name: string;
  age: number;
  
  // Культивация
  cultivationLevel: number;      // Основной уровень (1-9)
  cultivationSubLevel: number;   // Под-уровень (0-9)
  
  // Ядро и Ци
  coreCapacity: number;          // Ёмкость ядра (ед)
  coreQuality: number;           // Качество ядра
  currentQi: number;             // Текущее количество Ци
  accumulatedQi: number;         // Накопленная для прорыва Ци
  
  // Характеристики
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;          // Проводимость меридиан (ед/сек)
  
  // Физиология
  health: number;                // Здоровье (%)
  fatigue: number;               // Физическая усталость (%)
  mentalFatigue: number;         // Ментальная усталость (%)
  
  // Память и система
  hasAmnesia: boolean;
  knowsAboutSystem: boolean;
  
  // Принадлежность
  sectRole: string | null;
  currentLocationId?: LocationId;
  currentLocation?: Location;
  sectId?: SectId;
  sect?: Sect;
  
  // Навыки культивации (JSON)
  cultivationSkills?: Record<string, number>;
  
  // Понимание Ци (система прозрения)
  qiUnderstanding?: number;
  qiUnderstandingCap?: number;
  
  // Медитации на проводимость (МедП)
  conductivityMeditations?: number;
  
  // Множители
  fatigueRecoveryMultiplier?: number;
  
  // Ресурсы
  contributionPoints?: number;
  spiritStones?: number;
  
  // Навыки
  skills?: Record<string, number>;
}

// ==================== ЛОКАЦИЯ ====================

export interface Location {
  id: LocationId;
  name: string;
  distanceFromCenter: number;
  qiDensity: number;
  terrainType: string;
  // Новые поля для системы карты
  locationType?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  z?: number;
  qiFlowRate?: number;
  description?: string;
}

// ==================== СЕКТА ====================

export interface Sect {
  id: SectId;
  name: string;
  description?: string;
  powerLevel: number;
}

// ==================== ВРЕМЯ МИРА ====================

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formatted: string;
  season: string;
}

// ==================== СООБЩЕНИЯ ====================

export interface Message {
  id: MessageId;
  type: string;
  sender: string | null;
  content: string;
  createdAt: string;
}

// ==================== ИГРОВОЕ СОСТОЯНИЕ ====================

export interface GameState {
  sessionId: SessionId | null;
  isLoading: boolean;
  error: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isPaused: boolean;
  daysSinceStart: number;
  // Новые поля
  inventory: InventoryItem[];
  techniques: CharacterTechnique[];
  skills: CharacterSkill[];
}

// ==================== ТИПЫ ДЕЙСТВИЙ ====================

export type GameActionType = 
  | 'message'           // Обычное сообщение/действие
  | 'meditation'        // Медитация
  | 'breakthrough'      // Попытка прорыва
  | 'combat'            // Бой
  | 'travel'            // Путешествие
  | 'status'            // Запрос статуса
  | 'techniques'        // Запрос техник
  | 'inventory'         // Запрос инвентаря
  | 'location'          // Запрос локации
  | 'world_restart';    // Перезапуск мира

export interface GameAction {
  type: GameActionType;
  payload?: Record<string, unknown>;
}

// ==================== ОТВЕТ СЕРВЕРА ====================

export interface ServerResponse {
  success: boolean;
  error?: string;
  response: {
    type: string;
    content: string;
    
    // Обновлённое состояние персонажа (сервер - источник истины!)
    characterState?: Partial<Character>;
    
    // Обновление времени
    timeAdvance?: {
      minutes?: number;
      hours?: number;
      days?: number;
    };
    
    // Специальные флаги
    requiresRestart?: boolean;
    interruption?: {
      event: unknown;
      options: unknown[];
    };
  };
  updatedTime?: WorldTime & { daysSinceStart: number };
}

// ==================== ТИПЫ ДЛЯ РАСЧЁТОВ ====================

export interface BreakthroughRequirements {
  requiredFills: number;      // Сколько заполнений нужно
  currentFills: number;       // Сколько уже накоплено
  fillsNeeded: number;        // Сколько ещё осталось
  requiredQi: number;         // Сколько Ци нужно
  currentAccumulated: number; // Сколько накоплено
  canAttempt: boolean;
}

export interface BreakthroughResult {
  success: boolean;
  newLevel: number;
  newSubLevel: number;
  newCoreCapacity: number;
  newConductivity?: number;  // Новая проводимость после прорыва
  qiConsumed: number;
  fatigueGained: { physical: number; mental: number };
  message: string;
}

export interface MeditationResult {
  success: boolean;
  qiGained: number;
  accumulatedQiGained: number;
  coreWasFilled: boolean;
  duration: number;
  wasInterrupted: boolean;
  interruptionReason?: string;
  fatigueGained: {
    physical: number;
    mental: number;
  };
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

export interface QiRates {
  coreGeneration: number;       // Ци/секунду от ядра
  environmentalAbsorption: number; // Ци/секунду из среды
  total: number;                // Суммарно
}

// ==================== ИНВЕНТАРЬ ====================

export interface InventoryItem {
  id: string;
  name: string;
  nameId?: string;
  description?: string;
  type: "material" | "artifact" | "consumable" | "equipment" | "spirit_stone";
  rarity?: "common" | "uncommon" | "rare" | "legendary";
  icon?: string;
  quantity: number;
  isConsumable: boolean;
  useAction?: string;
  durability?: number;
  maxDurability?: number;
  qiCharge?: number;
  maxQiCharge?: number;
  effects?: Record<string, number>;
  properties?: Record<string, unknown>;
}

// ==================== ТЕХНИКИ ====================

/**
 * Тип боевой техники
 */
export type CombatTechniqueType = 
  // === БЛИЖНИЙ БОЙ ===
  | "melee_strike"       // Контактный удар (без оружия)
  | "melee_weapon"       // Усиление оружия / удар с оружием
  // === ДАЛЬНИЙ БОЙ ===
  | "ranged_projectile"  // Снаряд
  | "ranged_beam"        // Луч
  | "ranged_aoe";        // Область

/**
 * Подтип защитной техники
 */
export type DefenseSubtype =
  | "shield"       // Энергетический щит
  | "barrier"      // Стационарный барьер
  | "block"        // Активный блок
  | "dodge"        // Уклонение
  | "absorb"       // Поглощение урона
  | "reflect";     // Отражение урона

/**
 * Подтип проклятия
 */
export type CurseSubtype =
  | "combat"       // Боевое (секунды-минуты)
  | "ritual";      // Ритуальное (часы-месяцы)

/**
 * Подтип отравления
 */
export type PoisonSubtype =
  | "body"         // Отравление тела
  | "qi";          // Отравление Ци

/**
 * Тип эффекта проклятия
 */
export type CurseEffectType =
  | "weakness"       // Снижение силы
  | "slowness"       // Замедление
  | "blindness"      // Слепота
  | "silence"        // Блокировка техник
  | "confusion"      // Путаница
  | "fear"           // Страх
  | "exhaustion"     // Истощение
  | "qi_drain"       // Истощение Ци
  | "soul_burn"      // Жжение души (DoT)
  | "cultivation_block" // Блокировка культивации
  | "meridian_damage"   // Повреждение меридиан
  | "core_corruption"   // Разрушение ядра
  | "fate_binding"      // Связывание судьбы
  | "soul_seal";        // Печать души

/**
 * Тип эффекта отравления
 */
export type PoisonDeliveryType =
  | "ingestion"    // Употребление
  | "contact"      // Контакт
  | "injection"    // Инъекция
  | "inhalation"   // Вдыхание
  | "technique"    // Через технику
  | "contaminated_qi"; // Заражённая Ци

/**
 * Параметры дальности для боевых техник
 */
export interface CombatRange {
  fullDamage: number;   // Дальность полного урона (м)
  halfDamage: number;   // Дальность 50% урона (м)
  max: number;          // Максимальная дальность (м) - после урон = 0
}

/**
 * Элементальный эффект
 */
export interface ElementalEffect {
  type: "fire" | "water" | "earth" | "air" | "lightning" | "void" | "neutral";
  damagePerTurn?: number;  // Урон за ход (DoT)
  duration: number;        // Длительность эффекта
}

/**
 * Эффекты боевой техники
 */
export interface CombatTechniqueEffects {
  damage: number;              // Базовый урон
  combatType: CombatTechniqueType;
  range?: CombatRange;         // Дальность (для ranged)
  contactRequired?: boolean;   // Требует контакта с целью
  aoeRadius?: number;          // Радиус AOE (м)
  duration?: number;           // Длительность баффа (мин)
  elementalEffect?: ElementalEffect;
  dodgeChance?: number;        // Шанс уклонения (для projectile)
  penetration?: number;        // Пробитие защиты (%)
}

/**
 * Основной тип техники
 */
export type TechniqueType = 
  | "combat"       // Атакующие боевые техники
  | "defense"      // Защитные техники (новое)
  | "cultivation"  // Техники культивации
  | "support"      // Поддержка (баффы)
  | "movement"     // Перемещение
  | "sensory"      // Восприятие
  | "healing"      // Исцеление
  | "curse"        // Проклятия (новое)
  | "poison"       // Отравления (новое)
  | "formation";   // Формации

/**
 * Флаги использования техник
 */
export type TechniqueUsageFlag = 
  | 'cultivation'  // Техника культивации - используется через слот при медитации
  | 'formation'    // Формация - можно использовать из меню
  | 'combat'       // Боевая техника - используется через слоты быстрого доступа
  | 'defense'      // Защитная техника - боевой слот
  | 'support'      // Поддержка - боевой слот
  | 'movement'     // Перемещение - боевой слот
  | 'sensory'      // Восприятие - боевой слот
  | 'healing'      // Исцеление - боевой слот
  | 'curse'        // Проклятие - отдельный слот
  | 'poison';      // Отравление - боевой слот

/**
 * Категория техники для UI
 */
export type TechniqueUICategory = 'cultivation' | 'formations' | 'combat' | 'defense' | 'curse' | 'poison';

/**
 * Определяет категорию UI для типа техники
 */
export function getTechniqueUICategory(type: string): TechniqueUICategory {
  if (type === 'cultivation') return 'cultivation';
  if (type === 'formation') return 'formations';
  if (type === 'defense') return 'defense';
  if (type === 'curse') return 'curse';
  if (type === 'poison') return 'poison';
  return 'combat'; // combat, support, movement, sensory, healing
}

/**
 * Проверяет, можно ли использовать технику из меню
 * (только формации можно использовать напрямую)
 */
export function canUseTechniqueFromMenu(type: string): boolean {
  return type === 'formation';
}

/**
 * Проверяет, можно ли назначить технику в слот
 */
export function canAssignTechniqueToSlot(type: string): boolean {
  return type === 'cultivation' || 
         type === 'combat' || 
         type === 'defense' || 
         type === 'support' || 
         type === 'movement' || 
         type === 'sensory' || 
         type === 'healing' ||
         type === 'curse' ||
         type === 'poison';
}

/**
 * Возвращает тип слота для техники
 */
export function getTechniqueSlotType(type: string): 'cultivation' | 'combat' | 'curse' | null {
  if (type === 'cultivation') return 'cultivation';
  if (type === 'curse') return 'curse';
  if (['combat', 'defense', 'support', 'movement', 'sensory', 'healing', 'poison'].includes(type)) return 'combat';
  return null;
}

export interface Technique {
  id: string;
  name: string;
  description: string;
  type: TechniqueType;
  subtype?: CombatTechniqueType | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: "fire" | "water" | "earth" | "air" | "lightning" | "void" | "neutral";
  rarity: "common" | "uncommon" | "rare" | "legendary";
  level: number;
  minLevel: number;
  maxLevel: number;
  qiCost: number;
  fatigueCost: { physical: number; mental: number };
  minCultivationLevel: number;
  
  // Требования к характеристикам (для изучения)
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Масштабирование от характеристик
  statScaling?: {
    strength?: number;      // +X% эффекта за единицу силы выше 10
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Вычисленные значения (для сгенерированных техник)
  computed?: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    finalDuration: number;
    activeEffects?: Array<{
      type: string;
      value: number;
      duration?: number;
    }>;
  };
  
  // Модификаторы (для сгенерированных техник)
  modifiers?: {
    effects?: Record<string, boolean>;
    effectValues?: Record<string, number>;
    penalties?: Record<string, number>;
    bonuses?: Record<string, number>;
  };
  
  // Дополнительные поля для combat техник
  weaponType?: string;           // Тип оружия (для melee_weapon)
  damageFalloff?: CombatRange;   // Затухание урона (для ranged)
  isRangedQi?: boolean;          // Дальний удар Ци (для легендарных weapon)
  
  effects?: {
    damage?: number;
    healing?: number;
    qiRegen?: number;
    qiRegenPercent?: number;  // Процент к поглощению Ци (для техник культивации)
    unnoticeability?: number; // Процент снижения шанса прерывания
    castSpeed?: number;       // Скорость каста
    duration?: number;
    distance?: number;
    range?: number;           // Дальность техники
    statModifiers?: Record<string, number>;
    // === БОЕВЫЕ ТЕХНИКИ ===
    combatType?: CombatTechniqueType;     // Тип боевой техники
    contactRequired?: boolean;             // Требует контакта
    aoeRadius?: number;                    // Радиус AOE
    elementalEffect?: ElementalEffect;     // Элементальный эффект
    dodgeChance?: number;                  // Шанс уклонения
    penetration?: number;                  // Пробитие защиты
    // === ЗАЩИТНЫЕ ТЕХНИКИ ===
    damageReduction?: number;   // Снижение урона (%)
    blockChance?: number;       // Шанс блока (%)
    durability?: number;        // Прочность блока
    shieldHP?: number;          // Здоровье щита
    regeneration?: number;      // Регенерация щита/ход
    qiDrainPerHit?: number;     // Расход Ци при попадании
    counterBonus?: number;      // Бонус к контратаке (%)
    // Legacy
    isContact?: boolean;        // Контактная техника (устарело)
  };
}

export interface CharacterTechnique {
  id: string;
  techniqueId: string;
  technique: Technique;
  mastery: number;         // 0-100%
  quickSlot: number | null; // 0 = культивация, 1-12 = боевой слот, null = не назначен
  learningProgress: number; // 0-100%
  learningSource: string;
}

// ==================== СЛОТЫ ТЕХНИК ====================

/**
 * Базовое количество боевых слотов
 * Уровень 1 = 3 слота
 * Уровень 2 = 4 слота
 * Уровень N = 3 + (N-1) слотов
 */
export const BASE_COMBAT_SLOTS = 3;

/**
 * Возвращает количество боевых слотов для уровня культивации
 * Уровень 1 = 3 слота, Уровень 2 = 4 слота и т.д.
 */
export function getCombatSlotsCount(cultivationLevel: number): number {
  return BASE_COMBAT_SLOTS + Math.max(0, cultivationLevel - 1);
}

/**
 * Создаёт структуру слотов техник
 */
export function createTechniqueSlots(cultivationLevel: number): TechniqueSlots {
  const combatSlotCount = getCombatSlotsCount(cultivationLevel);
  return {
    cultivationSlot: null,
    combatSlots: Array(combatSlotCount).fill(null),
  };
}

/**
 * Слоты для быстрых техник
 */
export interface TechniqueSlots {
  cultivationSlot: string | null;     // ID техники культивации
  combatSlots: (string | null)[];     // Динамические боевые слоты
}

// ==================== НАВЫКИ КУЛЬТИВАЦИИ ====================

export interface CultivationSkillData {
  id: string;
  name: string;
  nameRu?: string;
  description: string;
  maxLevel: number;
  effects: {
    qiAbsorptionBonus?: number;
    meditationSpeedBonus?: number;
    interruptionModifier?: number;
    fatigueReliefBonus?: number;
    dangerDetectionRange?: number;
  };
  prerequisites?: {
    cultivationLevel?: number;
    skills?: string[];
  };
}

export interface CharacterSkill {
  skillId: string;
  level: number;
  skill?: CultivationSkillData;
}
