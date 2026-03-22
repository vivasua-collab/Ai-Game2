/**
 * ============================================================================
 * NPC DAMAGE CALCULATOR - Расчёт урона от NPC к игроку
 * ============================================================================
 * 
 * Реализует "равноценную" систему урона: NPC используют те же формулы,
 * что и игрок.
 * 
 * Формула урона:
 * damage = effectiveQi × qiDensity × statMultiplier × masteryMultiplier
 * 
 * Где:
 * - effectiveQi = Qi, вложенное в атаку
 * - qiDensity = 2^(cultivationLevel - 1)
 * - statMultiplier = от характеристик NPC
 * - masteryMultiplier = до +30% при мастерстве
 * 
 * @see docs/NPC_COMBAT_INTERACTIONS.md - Фаза 2.2
 * @see docs/combat-system-v2.md - Формулы урона
 * 
 * Версия: 1.0.0
 */

import {
  calculateStatScalingByType,
} from './combat-system';
import type { CombatTechniqueType } from '@/types/game';

// ==================== ТИПЫ ====================

export interface NPCCombatStats {
  cultivationLevel: number;
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;
  currentQi: number;
}

export interface NPCTechniqueData {
  id: string;
  name?: string;
  combatType?: string;
  qiCost?: number;
  baseDamage?: number;
  element?: string;
}

export interface PlayerDefenseStats {
  armor: number;
  conductivity: number;
  health: number;
  maxHealth: number;
  // Буфер меридианов - поглощает до 30% урона
  meridianBuffer?: number;
  // Сопротивления
  resistances?: {
    fire?: number;
    water?: number;
    earth?: number;
    air?: number;
    lightning?: number;
    void?: number;
    physical?: number;
  };
}

export interface DamageResult {
  damage: number;
  qiSpent: number;
  effectiveQi: number;
  qiDensity: number;
  statMultiplier: number;
  masteryMultiplier: number;
  conductivityBonus: number;
  armorReduction: number;
  bufferAbsorbed: number;
  isCritical?: boolean;
  damageType: string;
}

export interface NPCAttackParams {
  npc: NPCCombatStats;
  technique: NPCTechniqueData | null;
  target: PlayerDefenseStats;
  isCritical?: boolean;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовое мастерство NPC (50% = +15% к урону)
 */
const NPC_BASE_MASTERY = 50;

/**
 * Максимальное мастерство NPC (100% = +30% к урону)
 */
const NPC_MAX_MASTERY = 100;

/**
 * Бонус от проводимости NPC (до +20%)
 */
const CONDUCTIVITY_BONUS_CAP = 0.20;

/**
 * Поглощение бронёй (%)
 */
const ARMOR_ABSORPTION_RATE = 0.5;

/**
 * Максимальное поглощение буфера меридианов (%)
 */
const MERIDIAN_BUFFER_RATE = 0.30;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Рассчитать урон от NPC к игроку
 * 
 * Использует те же формулы, что и игрок:
 * 1. qiDensity = 2^(cultivationLevel - 1)
 * 2. statMultiplier от характеристик
 * 3. masteryMultiplier до +30%
 * 4. conductivityBonus до +20%
 * 5. armorReduction
 * 6. meridianBuffer
 */
export function calculateDamageFromNPC(params: NPCAttackParams): DamageResult {
  const { npc, technique, target, isCritical = false } = params;
  
  // === 1. РАСЧЁТ QI ДЛЯ АТАКИ ===
  const qiSpent = calculateNPCQiSpent(npc.currentQi, technique?.qiCost);
  
  // === 2. КАЧЕСТВО ЦИ NPC ===
  // qiDensity = 2^(cultivationLevel - 1)
  const qiDensity = calculateQiDensity(npc.cultivationLevel);
  
  // === 3. ЭФФЕКТИВНОЕ ЦИ ===
  // NPC не страдает от дестабилизации
  const effectiveQi = qiSpent;
  
  // === 4. БАЗОВЫЙ ЭФФЕКТ = ЦИ × КАЧЕСТВО ===
  let effect = effectiveQi * qiDensity;
  
  // === 5. МАСШТАБИРОВАНИЕ ОТ ХАРАКТЕРИСТИК ===
  let statMultiplier = 1.0;
  
  if (technique?.combatType) {
    // Используем формулу от типа техники
    statMultiplier = calculateStatScalingByType(
      {
        strength: npc.strength,
        agility: npc.agility,
        intelligence: npc.intelligence,
        conductivity: npc.conductivity,
        // Дополнительные поля для соответствия типу
        cultivationLevel: npc.cultivationLevel,
      } as any,
      technique.combatType as CombatTechniqueType
    );
  } else {
    // Базовая атака — масштабирование от силы
    statMultiplier = 1 + Math.max(0, npc.strength - 10) * 0.05;
  }
  
  effect *= statMultiplier;
  
  // === 6. БОНУС ОТ МАСТЕРСТВА ===
  // NPC имеет базовое мастерство 50% (+15% к урону)
  const mastery = technique ? NPC_BASE_MASTERY : 0;
  const masteryMultiplier = 1 + (mastery / 100) * 0.3;
  effect *= masteryMultiplier;
  
  // === 7. БОНУС ОТ ПРОВОДИМОСТИ ===
  // До +20% при высокой проводимости
  const conductivityBonus = Math.min(
    CONDUCTIVITY_BONUS_CAP,
    (npc.conductivity / 100) * CONDUCTIVITY_BONUS_CAP
  );
  effect *= (1 + conductivityBonus);
  
  // === 8. КРИТИЧЕСКИЙ УДАР ===
  if (isCritical) {
    effect *= 1.5;
  }
  
  // === 9. ПОГЛОЩЕНИЕ БРОНЁЙ ===
  // armorReduction = armor × 50%
  const armorReduction = target.armor * ARMOR_ABSORPTION_RATE;
  let finalDamage = Math.max(1, effect - armorReduction);
  
  // === 10. БУФЕР МЕРИДИАНОВ ===
  // До 30% урона может быть поглощено
  let bufferAbsorbed = 0;
  if (target.meridianBuffer && target.meridianBuffer > 0) {
    const maxAbsorb = finalDamage * MERIDIAN_BUFFER_RATE;
    bufferAbsorbed = Math.min(target.meridianBuffer, maxAbsorb);
    finalDamage -= bufferAbsorbed;
  }
  
  // === 11. СОПРОТИВЛЕНИЯ ===
  // Элементальные сопротивления
  if (technique?.element && target.resistances) {
    const resistance = target.resistances[technique.element as keyof typeof target.resistances] ?? 0;
    finalDamage *= (1 - resistance / 100);
  }
  
  return {
    damage: Math.floor(finalDamage),
    qiSpent,
    effectiveQi,
    qiDensity,
    statMultiplier,
    masteryMultiplier,
    conductivityBonus,
    armorReduction,
    bufferAbsorbed,
    isCritical,
    damageType: technique?.element ?? 'physical',
  };
}

/**
 * Рассчитать Qi, которое NPC готов потратить
 */
export function calculateNPCQiSpent(
  npcCurrentQi: number,
  techniqueQiCost?: number
): number {
  if (techniqueQiCost) {
    return techniqueQiCost;
  }
  // Базовая атака — 5-10% от текущего Qi
  const percent = 5 + Math.random() * 5;
  return Math.floor(npcCurrentQi * percent / 100);
}

/**
 * Рассчитать качество Ци (qiDensity)
 * 
 * Формула: qiDensity = 2^(cultivationLevel - 1)
 * 
 * Уровень 1: 1
 * Уровень 2: 2
 * Уровень 3: 4
 * Уровень 4: 8
 * ...
 * Уровень 9: 256
 */
export function calculateQiDensity(cultivationLevel: number): number {
  const level = Math.max(1, Math.min(9, cultivationLevel));
  return Math.pow(2, level - 1);
}

/**
 * Проверка критического удара NPC
 * 
 * Шанс зависит от ловкости NPC:
 * - Базовый: 5%
 * - +0.5% за каждую единицу ловкости выше 10
 * - Максимум: 25%
 */
export function checkNPCCritical(
  npcAgility: number,
  techniqueBonus: number = 0
): boolean {
  const agilityBonus = Math.max(0, npcAgility - 10) * 0.5;
  const critChance = Math.min(25, 5 + agilityBonus + techniqueBonus);
  return Math.random() * 100 < critChance;
}

/**
 * Рассчитать HP NPC по уровню культивации
 * 
 * Базовая формула: 100 × (1 + level × 0.5) + vitality × 5
 */
export function calculateNPCMaxHP(
  cultivationLevel: number,
  vitality: number
): number {
  const levelMult = 1 + cultivationLevel * 0.5;
  return Math.floor(100 * levelMult + vitality * 5);
}

/**
 * Определить тип атаки NPC по его характеристикам
 */
export function determineNPCAttackType(
  npc: NPCCombatStats,
  technique: NPCTechniqueData | null
): 'melee' | 'ranged' | 'technique' {
  if (technique) {
    return 'technique';
  }
  
  // Сильные NPC предпочитают melee
  if (npc.strength > npc.agility && npc.strength > npc.intelligence) {
    return 'melee';
  }
  
  // Ловкие NPC могут атаковать издалека
  if (npc.agility > npc.intelligence) {
    return 'ranged';
  }
  
  // Интеллектуальные используют техники
  return 'technique';
}

/**
 * Получить эффективную дальность атаки NPC
 */
export function getNPCAttackRange(
  npc: NPCCombatStats,
  technique: NPCTechniqueData | null
): number {
  if (technique) {
    // TODO: Получить дальность из данных техники
    return 10; // метров
  }
  
  // Melee: 2м
  // Ranged: зависит от ловкости
  const baseRange = npc.strength > npc.agility ? 2 : 5;
  const agilityBonus = Math.max(0, npc.agility - 10) * 0.2;
  
  return baseRange + agilityBonus;
}

// ==================== ЭКСПОРТ ПО УМОЛЧАНИЮ ====================

export default {
  calculateDamageFromNPC,
  calculateNPCQiSpent,
  calculateQiDensity,
  checkNPCCritical,
  calculateNPCMaxHP,
  determineNPCAttackType,
  getNPCAttackRange,
};
