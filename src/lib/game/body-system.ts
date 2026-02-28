/**
 * Система тела (Kenshi-style)
 * Двойная HP система, повреждения, состояния, регенерация
 */

import type {
  BodyPart,
  BodyPartType,
  BodyStructure,
  HeartProperties,
  LimbHP,
  LimbStatus,
  DamageResult,
  RegenerationResult,
  RegenerationParams,
  HUMAN_BODY_PART_HP,
  STRUCTURAL_HP_MULTIPLIER,
  MIN_LEVEL_FOR_HEART_ATTACK,
  MIN_LEVEL_FOR_LIMB_REGENERATION,
  HEART_VULNERABILITY_TORSO_THRESHOLD,
} from '@/types/body';

import {
  HUMAN_BODY_PART_HP as BASE_HP,
  STRUCTURAL_HP_MULTIPLIER as STRUCT_MULT,
  MIN_LEVEL_FOR_HEART_ATTACK as MIN_HEART_LVL,
  MIN_LEVEL_FOR_LIMB_REGENERATION as MIN_REGEN_LVL,
  HEART_VULNERABILITY_TORSO_THRESHOLD as HEART_TORSO_THRESH,
} from '@/types/body';

// ==================== КОНСТАНТЫ РЕГЕНЕРАЦИИ ====================

/**
 * Базовые скорости регенерации (HP/ТИК)
 */
export const REGENERATION_RATES = {
  base: {
    structural: 0.01,   // 0.01 HP/тик = 0.6 HP/час
    functional: 0.02,   // 0.02 HP/тик = 1.2 HP/час
  },
  
  /** Бонус от уровня культивации */
  cultivationMultiplier: 0.5,  // × (1 + level × 0.5)
  
  /** Множители состояния */
  stateMultipliers: {
    active: 1.0,
    resting: 2.0,
    sleeping: 3.0,
    meditation: 1.5,
  },
  
  /** Множители лечения */
  treatmentMultipliers: {
    medicine: 2.0,
    technique: 5.0,
    formation: 3.0,
  },
} as const;

/**
 * Скорости регенерации по уровню культивации (HP/ТИК)
 */
export function getRegenerationRateByLevel(level: number): { structural: number; functional: number } {
  const cultMult = 1 + level * REGENERATION_RATES.cultivationMultiplier;
  return {
    structural: REGENERATION_RATES.base.structural * cultMult,
    functional: REGENERATION_RATES.base.functional * cultMult,
  };
}

// ==================== ОПРЕДЕЛЕНИЕ СОСТОЯНИЯ ====================

/**
 * Определяет состояние конечности по HP
 */
export function getLimbStatus(hp: LimbHP): LimbStatus {
  // Отрублена
  if (hp.structural.current <= 0) {
    return 'severed';
  }
  
  const funcPercent = hp.functional.max > 0 
    ? hp.functional.current / hp.functional.max 
    : 0;
  const structPercent = hp.structural.max > 0 
    ? hp.structural.current / hp.structural.max 
    : 1; // Если структурной HP нет (сердце), считаем 100%
  
  // Парализована
  if (funcPercent === 0 && hp.structural.current > 0) {
    // Критическое состояние если структурная HP низкая
    if (structPercent <= 0.3) {
      return 'critical';
    }
    return 'paralyzed';
  }
  
  // Критическое
  if (structPercent <= 0.3 && structPercent > 0) {
    return 'critical';
  }
  
  // Изуродована
  if (funcPercent <= 0.5) {
    return 'crippled';
  }
  
  // Повреждена
  if (funcPercent <= 0.8) {
    return 'damaged';
  }
  
  // Здорова
  return 'healthy';
}

/**
 * Вычисляет эффективность конечности
 */
export function calculateEfficiency(status: LimbStatus): number {
  switch (status) {
    case 'healthy': return 100;
    case 'damaged': return 75;
    case 'crippled': return 30;
    case 'paralyzed': return 0;
    case 'critical': return 0;
    case 'severed': return 0;
    default: return 100;
  }
}

// ==================== СОЗДАНИЕ ЧАСТЕЙ ТЕЛА ====================

/**
 * Создаёт LimbHP для части тела
 */
export function createLimbHP(functionalMax: number, structuralMax: number): LimbHP {
  return {
    functional: {
      max: functionalMax,
      current: functionalMax,
    },
    structural: {
      max: structuralMax,
      current: structuralMax,
    },
  };
}

/**
 * Создаёт часть тела
 */
export function createBodyPart(
  type: BodyPartType,
  id: string,
  name: string,
  options?: {
    parent?: string;
    children?: string[];
    functions?: BodyPart['functions'];
    armor?: number;
    hitboxRadius?: number;
  }
): BodyPart {
  const hpConfig = BASE_HP[type] || BASE_HP['special'];
  const hp = createLimbHP(hpConfig.functional, hpConfig.structural);
  
  return {
    id,
    name,
    type,
    hp,
    status: getLimbStatus(hp),
    functions: options?.functions || [],
    efficiency: 100,
    armor: options?.armor || 0,
    damageThreshold: hpConfig.structural, // Порог = структурная HP
    hitboxRadius: options?.hitboxRadius || 0.1,
    parent: options?.parent,
    children: options?.children,
  };
}

/**
 * Создаёт сердце
 */
export function createHeart(): HeartProperties {
  const hpConfig = BASE_HP['heart'];
  return {
    hp: {
      max: hpConfig.functional,
      current: hpConfig.functional,
    },
    vulnerable: false,
    efficiency: 100,
  };
}

/**
 * Создаёт структуру тела человека
 */
export function createHumanBody(characterId: string): BodyStructure {
  const parts = new Map<string, BodyPart>();
  
  // Голова
  parts.set('head', createBodyPart('head', 'head', 'Голова', {
    functions: ['sensory', 'breathing', 'qi_channel'],
    hitboxRadius: 0.15,
    children: ['left_eye', 'right_eye', 'left_ear', 'right_ear'],
  }));
  
  // Торс
  parts.set('torso', createBodyPart('torso', 'torso', 'Торс', {
    functions: ['circulation', 'digestion', 'qi_channel'],
    hitboxRadius: 0.30,
    children: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
  }));
  
  // Руки
  parts.set('left_arm', createBodyPart('arm', 'left_arm', 'Левая рука', {
    parent: 'torso',
    functions: ['manipulation', 'attack', 'qi_channel'],
    hitboxRadius: 0.08,
    children: ['left_hand'],
  }));
  
  parts.set('right_arm', createBodyPart('arm', 'right_arm', 'Правая рука', {
    parent: 'torso',
    functions: ['manipulation', 'attack', 'qi_channel'],
    hitboxRadius: 0.08,
    children: ['right_hand'],
  }));
  
  // Кисти
  parts.set('left_hand', createBodyPart('hand', 'left_hand', 'Левая кисть', {
    parent: 'left_arm',
    functions: ['manipulation', 'attack'],
    hitboxRadius: 0.05,
  }));
  
  parts.set('right_hand', createBodyPart('hand', 'right_hand', 'Правая кисть', {
    parent: 'right_arm',
    functions: ['manipulation', 'attack'],
    hitboxRadius: 0.05,
  }));
  
  // Ноги
  parts.set('left_leg', createBodyPart('leg', 'left_leg', 'Левая нога', {
    parent: 'torso',
    functions: ['movement', 'qi_channel'],
    hitboxRadius: 0.10,
    children: ['left_foot'],
  }));
  
  parts.set('right_leg', createBodyPart('leg', 'right_leg', 'Правая нога', {
    parent: 'torso',
    functions: ['movement', 'qi_channel'],
    hitboxRadius: 0.10,
    children: ['right_foot'],
  }));
  
  // Стопы
  parts.set('left_foot', createBodyPart('foot', 'left_foot', 'Левая стопа', {
    parent: 'left_leg',
    functions: ['movement'],
    hitboxRadius: 0.05,
  }));
  
  parts.set('right_foot', createBodyPart('foot', 'right_foot', 'Правая стопа', {
    parent: 'right_leg',
    functions: ['movement'],
    hitboxRadius: 0.05,
  }));
  
  // Глаза
  parts.set('left_eye', createBodyPart('eye', 'left_eye', 'Левый глаз', {
    parent: 'head',
    functions: ['sensory'],
    hitboxRadius: 0.02,
  }));
  
  parts.set('right_eye', createBodyPart('eye', 'right_eye', 'Правый глаз', {
    parent: 'head',
    functions: ['sensory'],
    hitboxRadius: 0.02,
  }));
  
  // Уши
  parts.set('left_ear', createBodyPart('ear', 'left_ear', 'Левое ухо', {
    parent: 'head',
    functions: ['sensory'],
    hitboxRadius: 0.03,
  }));
  
  parts.set('right_ear', createBodyPart('ear', 'right_ear', 'Правое ухо', {
    parent: 'head',
    functions: ['sensory'],
    hitboxRadius: 0.03,
  }));
  
  return {
    characterId,
    parts,
    heart: createHeart(),
    overallHealth: 100,
    activeBleeds: [],
    activeAttachments: [],
    isDead: false,
  };
}

// ==================== ПРИМЕНЕНИЕ УРОНА ====================

/**
 * Применяет урон к конечности
 */
export function applyDamageToLimb(
  part: BodyPart,
  damage: number,
  options?: {
    armor?: number;
    penetration?: number;
    isHeart?: boolean;
  }
): DamageResult {
  const previousStatus = part.status;
  
  // Расчёт эффективного урона
  const armor = options?.armor ?? part.armor;
  const penetration = options?.penetration ?? 0;
  const effectiveArmor = Math.max(0, armor - penetration);
  let effectiveDamage = Math.max(0, damage - effectiveArmor);
  
  // Порог урона
  if (effectiveDamage < part.damageThreshold * 0.1) {
    effectiveDamage = 0;
  }
  
  let functionalDamage = 0;
  let structuralDamage = 0;
  let severed = false;
  let fatal = false;
  
  // Сердце - только функциональная HP
  if (options?.isHeart || part.type === 'heart') {
    functionalDamage = Math.min(effectiveDamage, part.hp.functional.current);
    part.hp.functional.current -= functionalDamage;
    
    // Смерть при HP сердца = 0
    if (part.hp.functional.current <= 0) {
      fatal = true;
    }
  } else {
    // Обычная конечность - сначала функциональная, потом структурная
    
    // 1. Урон в функциональную HP
    if (part.hp.functional.current > 0 && effectiveDamage > 0) {
      functionalDamage = Math.min(effectiveDamage, part.hp.functional.current);
      part.hp.functional.current -= functionalDamage;
      effectiveDamage -= functionalDamage;
    }
    
    // 2. Остаток в структурную HP
    if (part.hp.structural.current > 0 && effectiveDamage > 0) {
      structuralDamage = Math.min(effectiveDamage, part.hp.structural.current);
      part.hp.structural.current -= structuralDamage;
      effectiveDamage -= structuralDamage;
    }
    
    // 3. Проверка отрубания
    if (part.hp.structural.current <= 0 && previousStatus !== 'severed') {
      severed = true;
      
      // Голова или торс = смерть
      if (part.type === 'head' || part.type === 'torso') {
        fatal = true;
      }
    }
  }
  
  // Обновление состояния
  part.status = getLimbStatus(part.hp);
  part.efficiency = calculateEfficiency(part.status);
  
  return {
    partId: part.id,
    totalDamage: functionalDamage + structuralDamage,
    functionalDamage,
    structuralDamage,
    previousStatus,
    newStatus: part.status,
    bleeding: null, // Заполняется в bleeding-system
    severed,
    fatal,
  };
}

/**
 * Применяет урон к сердцу
 */
export function applyDamageToHeart(
  heart: HeartProperties,
  damage: number
): { damage: number; fatal: boolean; efficiency: number } {
  const effectiveDamage = Math.min(damage, heart.hp.current);
  heart.hp.current -= effectiveDamage;
  
  // Расчёт эффективности
  const hpPercent = heart.hp.current / heart.hp.max;
  if (hpPercent >= 0.5) {
    heart.efficiency = 100;
  } else if (hpPercent >= 0.25) {
    heart.efficiency = 50; // Сниженная циркуляция
  } else {
    heart.efficiency = 0; // Критическое состояние
  }
  
  return {
    damage: effectiveDamage,
    fatal: heart.hp.current <= 0,
    efficiency: heart.efficiency,
  };
}

/**
 * Проверяет доступность сердца для атаки
 */
export function isHeartVulnerable(
  attackerLevel: number,
  torsoStructuralPercent: number
): boolean {
  return attackerLevel >= MIN_HEART_LVL && torsoStructuralPercent < HEART_TORSO_THRESH;
}

// ==================== РЕГЕНЕРАЦИЯ ====================

/**
 * Вычисляет скорость регенерации
 */
export function calculateRegenerationRate(
  params: RegenerationParams
): { structuralRate: number; functionalRate: number } {
  const { cultivationLevel, state, modifiers } = params;
  
  // Базовая скорость
  const baseRates = getRegenerationRateByLevel(cultivationLevel);
  
  // Множитель состояния
  const stateMult = REGENERATION_RATES.stateMultipliers[state];
  
  // Множители лечения
  let treatmentMult = 1;
  if (modifiers.medicine) {
    treatmentMult += modifiers.medicine * REGENERATION_RATES.treatmentMultipliers.medicine;
  }
  if (modifiers.technique) {
    treatmentMult += modifiers.technique * REGENERATION_RATES.treatmentMultipliers.technique;
  }
  if (modifiers.formation) {
    treatmentMult += modifiers.formation * REGENERATION_RATES.treatmentMultipliers.formation;
  }
  
  return {
    structuralRate: baseRates.structural * stateMult * treatmentMult,
    functionalRate: baseRates.functional * stateMult * treatmentMult,
  };
}

/**
 * Применяет регенерацию к конечности
 */
export function regenerateLimb(
  part: BodyPart,
  params: RegenerationParams
): RegenerationResult {
  const rates = calculateRegenerationRate(params);
  
  let structuralRegenerated = 0;
  let functionalRegenerated = 0;
  let qiConsumed = 0;
  
  // Сначала регенерируем структурную HP
  if (part.hp.structural.current < part.hp.structural.max) {
    const missingStructural = part.hp.structural.max - part.hp.structural.current;
    structuralRegenerated = Math.min(rates.structuralRate, missingStructural);
    part.hp.structural.current += structuralRegenerated;
    
    // Расход Ци (0.1 Ци за HP)
    qiConsumed += structuralRegenerated * 0.1;
  }
  
  // Функциональная HP только если структурная > 50%
  const structPercent = part.hp.structural.max > 0 
    ? part.hp.structural.current / part.hp.structural.max 
    : 1;
  
  if (structPercent >= 0.5 && part.hp.functional.current < part.hp.functional.max) {
    const missingFunctional = part.hp.functional.max - part.hp.functional.current;
    functionalRegenerated = Math.min(rates.functionalRate, missingFunctional);
    part.hp.functional.current += functionalRegenerated;
    
    // Расход Ци (0.05 Ци за HP)
    qiConsumed += functionalRegenerated * 0.05;
  }
  
  // Обновление состояния
  part.status = getLimbStatus(part.hp);
  part.efficiency = calculateEfficiency(part.status);
  
  return {
    partId: part.id,
    structuralRegenerated,
    functionalRegenerated,
    newStatus: part.status,
    qiConsumed: Math.ceil(qiConsumed),
  };
}

/**
 * Проверяет возможность регенерации отрубленной конечности
 */
export function canRegenerateSeveredLimb(
  cultivationLevel: number,
  hasRegenerationPractice: boolean,
  hasFormation: boolean
): { canRegenerate: boolean; reason?: string } {
  if (cultivationLevel < MIN_REGEN_LVL) {
    return {
      canRegenerate: false,
      reason: `Требуется уровень культивации ${MIN_REGEN_LVL}+`,
    };
  }
  
  if (!hasRegenerationPractice && !hasFormation) {
    return {
      canRegenerate: false,
      reason: 'Требуется практика регенерации или формация',
    };
  }
  
  return { canRegenerate: true };
}

// ==================== КАСКАДНЫЕ ЭФФЕКТЫ ====================

/**
 * Обновляет дочерние части при потере родителя
 */
export function updateChildrenOnParentLoss(
  body: BodyStructure,
  parentId: string
): BodyPart[] {
  const affectedParts: BodyPart[] = [];
  const parent = body.parts.get(parentId);
  
  if (!parent || !parent.children) {
    return affectedParts;
  }
  
  // Рекурсивно отключаем всех детей
  function disableChildren(partId: string) {
    const part = body.parts.get(partId);
    if (!part) return;
    
    // Если родитель отрублен, дети тоже "отключаются"
    if (part.status !== 'severed') {
      part.efficiency = 0;
      part.status = 'paralyzed';
      affectedParts.push(part);
    }
    
    // Рекурсия
    if (part.children) {
      part.children.forEach(disableChildren);
    }
  }
  
  parent.children.forEach(disableChildren);
  
  return affectedParts;
}

/**
 * Проверяет смерть персонажа
 */
export function checkDeath(body: BodyStructure): { isDead: boolean; reason?: string } {
  // Сердце уничтожено
  if (body.heart.hp.current <= 0) {
    return { isDead: true, reason: 'Разрушено сердце' };
  }
  
  // Голова отрублена
  const head = body.parts.get('head');
  if (head && head.status === 'severed') {
    return { isDead: true, reason: 'Обезглавлен' };
  }
  
  // Торс уничтожен
  const torso = body.parts.get('torso');
  if (torso && torso.status === 'severed') {
    return { isDead: true, reason: 'Уничтожен торс' };
  }
  
  return { isDead: false };
}

// ==================== УТИЛИТЫ ====================

/**
 * Вычисляет общее здоровье тела
 */
export function calculateOverallHealth(body: BodyStructure): number {
  let totalHP = 0;
  let maxHP = 0;
  
  body.parts.forEach(part => {
    if (part.status !== 'severed') {
      totalHP += part.hp.functional.current + part.hp.structural.current;
      maxHP += part.hp.functional.max + part.hp.structural.max;
    }
  });
  
  // Добавляем сердце
  totalHP += body.heart.hp.current;
  maxHP += body.heart.hp.max;
  
  return maxHP > 0 ? Math.round((totalHP / maxHP) * 100) : 0;
}

/**
 * Получает все повреждённые части тела
 */
export function getDamagedParts(body: BodyStructure): BodyPart[] {
  const damaged: BodyPart[] = [];
  
  body.parts.forEach(part => {
    if (['damaged', 'crippled', 'paralyzed', 'critical'].includes(part.status)) {
      damaged.push(part);
    }
  });
  
  return damaged;
}

/**
 * Получает все отрубленные части тела
 */
export function getSeveredParts(body: BodyStructure): BodyPart[] {
  const severed: BodyPart[] = [];
  
  body.parts.forEach(part => {
    if (part.status === 'severed') {
      severed.push(part);
    }
  });
  
  return severed;
}

/**
 * Сериализует BodyStructure для хранения
 */
export function serializeBody(body: BodyStructure): string {
  const serializedParts: Record<string, BodyPart> = {};
  body.parts.forEach((part, id) => {
    serializedParts[id] = part;
  });
  
  return JSON.stringify({
    characterId: body.characterId,
    parts: serializedParts,
    heart: body.heart,
    activeBleeds: body.activeBleeds,
    activeAttachments: body.activeAttachments,
    isDead: body.isDead,
    deathReason: body.deathReason,
  });
}

/**
 * Десериализует BodyStructure из хранилища
 */
export function deserializeBody(data: string): BodyStructure {
  const parsed = JSON.parse(data);
  const parts = new Map<string, BodyPart>();
  
  Object.entries(parsed.parts).forEach(([id, part]) => {
    parts.set(id, part as BodyPart);
  });
  
  return {
    characterId: parsed.characterId,
    parts,
    heart: parsed.heart,
    overallHealth: 100, // Вычисляется
    activeBleeds: parsed.activeBleeds || [],
    activeAttachments: parsed.activeAttachments || [],
    isDead: parsed.isDead || false,
    deathReason: parsed.deathReason,
  };
}
