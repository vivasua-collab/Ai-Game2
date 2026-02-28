/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ID ПРЕФИКСОВ
 * ============================================================================
 * 
 * Определяет префиксы ID для всех типов генерируемых объектов.
 * 
 * Система ID: PREFIX_NNNNNN
 * - MS_000001 — melee_strike (удар телом)
 * - MW_000042 — melee_weapon (оружейная техника)
 * - RG_000123 — ranged (дальняя атака)
 * - DF_000007 — defense (защитная)
 */

import { TechniqueType, CombatSubtype } from './technique-generator';

// ==================== ТИПЫ ====================

export type IdPrefix = 
  // Атакующие техники (разделены по подтипам)
  | 'MS'  // Melee Strike — удар телом
  | 'MW'  // Melee Weapon — оружейная техника
  | 'RG'  // Ranged — дальняя атака
  // Остальные типы техник
  | 'DF'  // Defense — защитная
  | 'CU'  // Cultivation — культивация
  | 'SP'  // Support — поддержка
  | 'MV'  // Movement — перемещение
  | 'SN'  // Sensory — восприятие
  | 'HL'  // Healing — исцеление
  | 'CR'  // Curse — проклятие
  | 'PN'  // Poison — яд
  // Прочие объекты
  | 'FM'  // Formation — формация
  | 'IT'  // Item — предмет
  | 'NP'  // NPC — неигровой персонаж
  // Легаси (для совместимости)
  | 'TC'; // Technique Combat — старый префикс атакующих

// ==================== КОНФИГУРАЦИЯ ====================

/**
 * Информация о префиксе ID
 */
export interface IdPrefixConfig {
  prefix: IdPrefix;
  name: string;
  nameEn: string;
  description: string;
  /** Тип техники (если применимо) */
  techniqueType?: TechniqueType;
  /** Подтип техники (если применимо) */
  combatSubtype?: CombatSubtype;
  /** Является ли устаревшим */
  isLegacy?: boolean;
}

/**
 * Полная конфигурация префиксов
 */
export const ID_PREFIX_CONFIG: Record<IdPrefix, IdPrefixConfig> = {
  // === АТАКУЮЩИЕ ТЕХНИКИ ===
  MS: {
    prefix: 'MS',
    name: 'Удар телом',
    nameEn: 'Melee Strike',
    description: 'Техники усиления тела для ближнего боя',
    techniqueType: 'combat',
    combatSubtype: 'melee_strike',
  },
  MW: {
    prefix: 'MW',
    name: 'Оружейная техника',
    nameEn: 'Melee Weapon',
    description: 'Техники с использованием оружия',
    techniqueType: 'combat',
    combatSubtype: 'melee_weapon',
  },
  RG: {
    prefix: 'RG',
    name: 'Дальняя атака',
    nameEn: 'Ranged',
    description: 'Дистанционные техники (снаряд, луч, область)',
    techniqueType: 'combat',
  },
  
  // === ОСТАЛЬНЫЕ ТИПЫ ===
  DF: {
    prefix: 'DF',
    name: 'Защитная техника',
    nameEn: 'Defense',
    description: 'Щиты, барьеры, уклонения',
    techniqueType: 'defense',
  },
  CU: {
    prefix: 'CU',
    name: 'Культивация',
    nameEn: 'Cultivation',
    description: 'Техники медитации и развития',
    techniqueType: 'cultivation',
  },
  SP: {
    prefix: 'SP',
    name: 'Поддержка',
    nameEn: 'Support',
    description: 'Баффы и усиления',
    techniqueType: 'support',
  },
  MV: {
    prefix: 'MV',
    name: 'Перемещение',
    nameEn: 'Movement',
    description: 'Техники движения',
    techniqueType: 'movement',
  },
  SN: {
    prefix: 'SN',
    name: 'Восприятие',
    nameEn: 'Sensory',
    description: 'Техники обнаружения',
    techniqueType: 'sensory',
  },
  HL: {
    prefix: 'HL',
    name: 'Исцеление',
    nameEn: 'Healing',
    description: 'Лечебные техники',
    techniqueType: 'healing',
  },
  CR: {
    prefix: 'CR',
    name: 'Проклятие',
    nameEn: 'Curse',
    description: 'Ослабляющие техники',
    techniqueType: 'curse',
  },
  PN: {
    prefix: 'PN',
    name: 'Яд',
    nameEn: 'Poison',
    description: 'Отравляющие техники',
    techniqueType: 'poison',
  },
  
  // === ПРОЧИЕ ОБЪЕКТЫ ===
  FM: {
    prefix: 'FM',
    name: 'Формация',
    nameEn: 'Formation',
    description: 'Боевые формации',
  },
  IT: {
    prefix: 'IT',
    name: 'Предмет',
    nameEn: 'Item',
    description: 'Предметы экипировки',
  },
  NP: {
    prefix: 'NP',
    name: 'NPC',
    nameEn: 'Non-Player Character',
    description: 'Неигровые персонажи',
  },
  
  // === ЛЕГАСИ ===
  TC: {
    prefix: 'TC',
    name: 'Боевая техника (устар.)',
    nameEn: 'Combat Technique (legacy)',
    description: 'Устаревший префикс для всех атакующих техник',
    isLegacy: true,
  },
};

// ==================== УТИЛИТЫ ====================

/**
 * Маппинг типов техник к префиксам
 */
export const TECHNIQUE_TYPE_PREFIX: Record<TechniqueType, IdPrefix> = {
  combat: 'MS', // По умолчанию, будет переопределён по подтипу
  defense: 'DF',
  cultivation: 'CU',
  support: 'SP',
  movement: 'MV',
  sensory: 'SN',
  healing: 'HL',
  curse: 'CR',
  poison: 'PN',
};

/**
 * Маппинг подтипов атакующих техник к префиксам
 */
export const COMBAT_SUBTYPE_PREFIX: Record<CombatSubtype, IdPrefix> = {
  melee_strike: 'MS',
  melee_weapon: 'MW',
  ranged_projectile: 'RG',
  ranged_beam: 'RG',
  ranged_aoe: 'RG',
};

/**
 * Получить префикс для типа техники
 */
export function getPrefixForTechniqueType(
  type: TechniqueType,
  combatSubtype?: CombatSubtype
): IdPrefix {
  // Для атакующих техник определяем по подтипу
  if (type === 'combat' && combatSubtype) {
    return COMBAT_SUBTYPE_PREFIX[combatSubtype] || 'MS';
  }
  
  return TECHNIQUE_TYPE_PREFIX[type] || 'MS';
}

/**
 * Получить конфигурацию префикса
 */
export function getIdPrefixConfig(prefix: IdPrefix): IdPrefixConfig {
  return ID_PREFIX_CONFIG[prefix];
}

/**
 * Получить список всех префиксов для UI
 */
export function getIdPrefixList(): IdPrefixConfig[] {
  return Object.values(ID_PREFIX_CONFIG).filter(c => !c.isLegacy);
}

/**
 * Получить список префиксов атакующих техник
 */
export function getCombatPrefixes(): IdPrefix[] {
  return ['MS', 'MW', 'RG'];
}

/**
 * Проверить, является ли префикс атакующим
 */
export function isCombatPrefix(prefix: IdPrefix): boolean {
  return getCombatPrefixes().includes(prefix);
}

/**
 * Сгенерировать ID
 */
export function generateId(prefix: IdPrefix, counter: number): string {
  return `${prefix}_${counter.toString().padStart(6, '0')}`;
}

/**
 * Парсинг ID
 */
export function parseId(id: string): { prefix: IdPrefix; counter: number } | null {
  const match = id.match(/^([A-Z]{2})_(\d{6})$/);
  if (!match) return null;
  
  const prefix = match[1] as IdPrefix;
  const counter = parseInt(match[2], 10);
  
  if (!ID_PREFIX_CONFIG[prefix]) return null;
  
  return { prefix, counter };
}

/**
 * Получить тип техники по префиксу
 */
export function getTechniqueTypeByPrefix(prefix: IdPrefix): TechniqueType | null {
  const config = ID_PREFIX_CONFIG[prefix];
  return config?.techniqueType || null;
}

/**
 * Получить подтип атакующей техники по префиксу
 */
export function getCombatSubtypeByPrefix(prefix: IdPrefix): CombatSubtype | null {
  const config = ID_PREFIX_CONFIG[prefix];
  return config?.combatSubtype || null;
}

/**
 * Список всех валидных префиксов
 */
export const VALID_PREFIXES: IdPrefix[] = Object.keys(ID_PREFIX_CONFIG) as IdPrefix[];
