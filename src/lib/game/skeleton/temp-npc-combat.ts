/**
 * ============================================================================
 * TEMP NPC COMBAT - Боевая логика для временных NPC
 * ============================================================================
 * 
 * Реализует боевую систему для TempNPC через Event Bus.
 * Все взаимодействия с TruthSystem через шину событий.
 * 
 * Версия: 1.0.0
 */

import 'server-only';

import type { TempNPC, TempItem } from '@/types/temp-npc';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';

// ==================== ТИПЫ ====================

export interface TempNPCCombatResult {
  success: boolean;
  newHealth: number;
  maxHealth: number;
  isDead: boolean;
  isUnconscious: boolean;
  damage: number;
  loot?: TempItem[];
  xp?: number;
}

export interface TempNPCDamageParams {
  sessionId: string;
  npcId: string;
  damage: number;
  bodyPartId?: string;
  techniqueId?: string;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Проверка, является ли ID временным NPC
 */
export function isTempNPCId(targetId: string): boolean {
  return targetId.startsWith('TEMP_');
}

/**
 * Получение TempNPC для боя
 */
export function getTempNPCForCombat(
  sessionId: string,
  npcId: string
): TempNPC | null {
  if (!isTempNPCId(npcId)) {
    return null;
  }
  
  return sessionNPCManager.getNPC(sessionId, npcId);
}

/**
 * Применение урона к TempNPC
 * 
 * @param npc - NPC (будет модифицирован напрямую)
 * @param damage - Количество урона
 * @param bodyPartId - ID части тела (опционально)
 */
export function applyDamageToTempNPC(
  npc: TempNPC,
  damage: number,
  bodyPartId?: string
): TempNPCCombatResult {
  // Если указана часть тела
  if (bodyPartId && npc.bodyState.parts[bodyPartId]) {
    const part = npc.bodyState.parts[bodyPartId];
    part.health = Math.max(0, part.health - (damage / npc.bodyState.maxHealth * 100));
    
    // Обновляем статус части
    if (part.health <= 0) {
      part.status = part.isVital ? 'crippled' : 'severed';
    } else if (part.health < 30) {
      part.status = 'crippled';
    } else if (part.health < 70) {
      part.status = 'damaged';
    }
  }
  
  // Общий урон
  const oldHealth = npc.bodyState.health;
  npc.bodyState.health = Math.max(0, npc.bodyState.health - damage);
  
  // Пересчёт общего здоровья тела
  const totalHealth = Object.values(npc.bodyState.parts)
    .reduce((sum, part) => sum + part.health, 0) / Object.keys(npc.bodyState.parts).length;
  npc.bodyState.health = totalHealth;
  
  // Проверка смерти
  const isDead = npc.bodyState.health <= 0 || 
    (npc.bodyState.parts['head']?.status === 'severed') ||
    (npc.bodyState.parts['torso']?.status === 'severed');
  
  // Проверка бессознательного состояния
  const isUnconscious = !isDead && (
    npc.bodyState.health < 20 ||
    (npc.bodyState.parts['head']?.status === 'crippled')
  );
  
  npc.bodyState.isDead = isDead;
  npc.bodyState.isUnconscious = isUnconscious;
  
  return {
    success: true,
    newHealth: npc.bodyState.health,
    maxHealth: npc.bodyState.maxHealth,
    isDead,
    isUnconscious,
    damage,
  };
}

/**
 * Обработка смерти TempNPC
 * 
 * @param sessionId - ID сессии
 * @param npc - Умерший NPC
 * @returns Лут и XP
 */
export function handleTempNPCDeath(
  sessionId: string,
  npc: TempNPC
): { loot: TempItem[]; xp: number } {
  // Удаление через менеджер (генерирует лут и XP)
  const result = sessionNPCManager.removeNPC(sessionId, npc.id);
  
  return {
    loot: result?.loot ?? [],
    xp: result?.xp ?? Math.floor(npc.cultivation.level * 10),
  };
}

/**
 * Главный обработчик боя с TempNPC
 * 
 * Используется из combat handler'а Event Bus
 */
export async function handleTempNPCCombat(params: {
  sessionId: string;
  npcId: string;
  damage: number;
  techniqueId?: string;
  bodyPartId?: string;
}): Promise<TempNPCCombatResult> {
  const { sessionId, npcId, damage, bodyPartId } = params;
  
  // Получаем NPC
  const npc = getTempNPCForCombat(sessionId, npcId);
  
  if (!npc) {
    return {
      success: false,
      newHealth: 0,
      maxHealth: 100,
      isDead: false,
      isUnconscious: false,
      damage: 0,
    };
  }
  
  // Применяем урон
  const result = applyDamageToTempNPC(npc, damage, bodyPartId);
  
  if (result.isDead) {
    // Обрабатываем смерть
    const { loot, xp } = handleTempNPCDeath(sessionId, npc);
    result.loot = loot;
    result.xp = xp;
  } else {
    // Обновляем NPC в менеджере
    sessionNPCManager.updateNPC(sessionId, npc.id, npc);
  }
  
  return result;
}

// ==================== ЭКСПОРТ ДЛЯ EVENT BUS ====================

export default {
  isTempNPCId,
  getTempNPCForCombat,
  applyDamageToTempNPC,
  handleTempNPCDeath,
  handleTempNPCCombat,
};
