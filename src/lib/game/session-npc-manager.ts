/**
 * ============================================================================
 * SESSION NPC MANAGER - Менеджер временных NPC
 * ============================================================================
 * 
 * Управляет жизненным циклом временных NPC ("статистов"):
 * - Генерация при входе в локацию
 * - Хранение в памяти
 * - Удаление при выходе/смерти
 * - Система лута
 */

import {
  type TempNPC,
  type TempItem,
  type LocationNPCConfig,
  type SpeciesWeight,
  type RoleWeight,
  generateTempNPCId,
  generateTempItemId,
  LOCATION_NPC_PRESETS,
  isTempNPCId,
} from '@/types/temp-npc';
import {
  generateNPC,
  type GeneratedNPC,
  type NPCGenerationContext,
  seededRandom,
} from '@/lib/generator/npc-generator';
import { generatedObjectsLoader } from '@/lib/generator/generated-objects-loader';
import { getSpeciesByType, getAllSpecies } from '@/data/presets/species-presets';
import { getRolesByType, getAllRoles } from '@/data/presets/role-presets';
import type { SpeciesType } from '@/data/presets';

// ==================== SINGLETON ====================

let instance: SessionNPCManager | null = null;

/**
 * Получить глобальный инстанс менеджера
 */
export function getSessionNPCManager(): SessionNPCManager {
  if (!instance) {
    instance = new SessionNPCManager();
  }
  return instance;
}

// ==================== CLASS ====================

/**
 * Менеджер временных NPC для сессии
 * Хранит статистов в оперативной памяти
 */
export class SessionNPCManager {
  // Хранилище: sessionId -> locationId -> TempNPC[]
  private npcs: Map<string, Map<string, TempNPC[]>> = new Map();
  
  // Счётчик для генерации seed
  private counter: number = 0;
  
  constructor() {
    if (instance) {
      console.warn('[SessionNPCManager] Singleton already exists, returning existing instance');
      return instance;
    }
  }
  
  // ==================== PUBLIC METHODS ====================
  
  /**
   * Инициализация локации
   * Генерирует статистов при входе игрока
   */
  async initializeLocation(
    sessionId: string,
    locationId: string,
    config: LocationNPCConfig | string,
    playerLevel: number
  ): Promise<TempNPC[]> {
    // 1. Проверяем, уже инициализирована?
    const existing = this.getLocationNPCs(sessionId, locationId);
    if (existing.length > 0) {
      console.log(`[SessionNPCManager] Location ${locationId} already initialized with ${existing.length} NPCs`);
      return existing;
    }
    
    // 2. Получаем конфигурацию
    const npcConfig = typeof config === 'string' 
      ? LOCATION_NPC_PRESETS[config] || LOCATION_NPC_PRESETS.village
      : config;
    
    // 3. Рассчитываем количество
    const count = this.calculatePopulation(npcConfig);
    console.log(`[SessionNPCManager] Generating ${count} NPCs for location ${locationId}`);
    
    // 4. Генерируем N статистов
    const npcs: TempNPC[] = [];
    const baseSeed = Date.now();
    
    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i;
      const npc = await this.generateTempNPC(npcConfig, playerLevel, seed);
      npc.locationId = locationId;
      npcs.push(npc);
    }
    
    // 5. Сохраняем в память
    this.setLocationNPCs(sessionId, locationId, npcs);
    
    return npcs;
  }
  
  /**
   * Получить всех NPC в локации
   */
  getLocationNPCs(sessionId: string, locationId: string): TempNPC[] {
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return [];
    
    return sessionMap.get(locationId) || [];
  }
  
  /**
   * Получить конкретного NPC
   */
  getNPC(sessionId: string, npcId: string): TempNPC | null {
    // Если это не временный NPC, возвращаем null
    if (!isTempNPCId(npcId)) return null;
    
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return null;
    
    for (const [, npcs] of sessionMap) {
      const npc = npcs.find(n => n.id === npcId);
      if (npc) return npc;
    }
    
    return null;
  }
  
  /**
   * Получить всех NPC в сессии
   */
  getAllSessionNPCs(sessionId: string): TempNPC[] {
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return [];
    
    const allNPCs: TempNPC[] = [];
    for (const npcs of sessionMap.values()) {
      allNPCs.push(...npcs);
    }
    
    return allNPCs;
  }
  
  /**
   * Обновить NPC
   */
  updateNPC(sessionId: string, npcId: string, updates: Partial<TempNPC>): TempNPC | null {
    const npc = this.getNPC(sessionId, npcId);
    if (!npc) return null;
    
    Object.assign(npc, updates);
    return npc;
  }
  
  /**
   * Удалить мёртвого NPC и вернуть лут
   */
  removeNPC(sessionId: string, npcId: string): { loot: TempItem[]; xp: number } | null {
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return null;
    
    for (const [locationId, npcs] of sessionMap) {
      const index = npcs.findIndex(n => n.id === npcId);
      if (index !== -1) {
        const npc = npcs[index];
        
        // Собираем лут
        const loot = this.generateLoot(npc);
        
        // Рассчитываем XP
        const xp = this.calculateXP(npc);
        
        // Удаляем NPC
        npcs.splice(index, 1);
        
        console.log(`[SessionNPCManager] Removed NPC ${npcId}, loot: ${loot.length} items, XP: ${xp}`);
        
        return { loot, xp };
      }
    }
    
    return null;
  }
  
  /**
   * Очистка локации при выходе
   */
  clearLocation(sessionId: string, locationId: string): number {
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return 0;
    
    const npcs = sessionMap.get(locationId) || [];
    const count = npcs.length;
    
    sessionMap.delete(locationId);
    
    console.log(`[SessionNPCManager] Cleared location ${locationId}, removed ${count} NPCs`);
    
    return count;
  }
  
  /**
   * Полная очистка сессии
   */
  clearSession(sessionId: string): number {
    const sessionMap = this.npcs.get(sessionId);
    if (!sessionMap) return 0;
    
    let count = 0;
    for (const npcs of sessionMap.values()) {
      count += npcs.length;
    }
    
    this.npcs.delete(sessionId);
    
    console.log(`[SessionNPCManager] Cleared session ${sessionId}, removed ${count} NPCs`);
    
    return count;
  }
  
  /**
   * Статистика менеджера
   */
  getStats(): {
    sessions: number;
    totalNPCs: number;
    byLocation: Record<string, number>;
  } {
    let totalNPCs = 0;
    const byLocation: Record<string, number> = {};
    
    for (const [sessionId, sessionMap] of this.npcs) {
      for (const [locationId, npcs] of sessionMap) {
        totalNPCs += npcs.length;
        byLocation[`${sessionId}:${locationId}`] = npcs.length;
      }
    }
    
    return {
      sessions: this.npcs.size,
      totalNPCs,
      byLocation,
    };
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Генерация временного NPC
   */
  private async generateTempNPC(
    config: LocationNPCConfig,
    playerLevel: number,
    seed: number
  ): Promise<TempNPC> {
    const rng = seededRandom(seed);
    
    // 1. Выбор вида по весам
    const speciesType = this.weightedRandom(config.allowedSpecies, rng);
    
    // 2. Выбор роли по весам
    const roleType = this.weightedRandom(config.allowedRoles, rng);
    
    // 3. Генерация уровня
    const level = this.generateLevel(config.levelRange, playerLevel, rng);
    
    // 4. Генерация через существующий генератор
    const context: NPCGenerationContext = {
      speciesType,
      roleType,
      cultivationLevel: level,
      seed: seed,
    };
    
    const baseNPC = generateNPC(context);
    
    // 5. Генерация экипировки
    const equipment = await this.generateEquipment(baseNPC, rng);
    
    // 6. Генерация быстрых слотов
    const quickSlots = await this.generateQuickSlots(baseNPC, rng);
    
    // 7. Расчёт личности
    const personality = this.generatePersonality(baseNPC, config, rng);
    
    // 8. Создание TempNPC
    const tempNPC: TempNPC = {
      id: generateTempNPCId(),
      isTemporary: true,
      speciesId: baseNPC.speciesId,
      speciesType: speciesType,
      roleId: baseNPC.roleId,
      name: baseNPC.name,
      gender: baseNPC.gender,
      age: baseNPC.age,
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
      },
      bodyState: this.convertBodyState(baseNPC.bodyState),
      equipment,
      quickSlots,
      techniques: baseNPC.techniques,
      personality,
      resources: {
        spiritStones: baseNPC.resources.spiritStones,
        contributionPoints: baseNPC.resources.contributionPoints,
      },
      locationId: '',
      generatedAt: Date.now(),
      seed,
    };
    
    return tempNPC;
  }
  
  /**
   * Рассчитать количество статистов
   */
  private calculatePopulation(config: LocationNPCConfig): number {
    const { min, max } = config.population;
    return Math.floor(min + Math.random() * (max - min + 1));
  }
  
  /**
   * Выбор по весам
   */
  private weightedRandom<T extends string>(
    items: Array<{ type: T; weight: number }>,
    rng: () => number
  ): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = rng() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.type;
      }
    }
    
    return items[items.length - 1].type;
  }
  
  /**
   * Генерация уровня
   */
  private generateLevel(
    levelRange: LocationNPCConfig['levelRange'],
    playerLevel: number,
    rng: () => number
  ): number {
    let min = levelRange.min;
    let max = levelRange.max;
    
    // Если есть relativeToPlayer, корректируем диапазон
    if (levelRange.relativeToPlayer) {
      min = Math.max(1, playerLevel - levelRange.relativeToPlayer);
      max = Math.min(9, playerLevel + levelRange.relativeToPlayer);
    }
    
    return Math.floor(min + rng() * (max - min + 1));
  }
  
  /**
   * Генерация экипировки
   */
  private async generateEquipment(
    npc: GeneratedNPC,
    rng: () => number
  ): Promise<TempNPC['equipment']> {
    const equipment: TempNPC['equipment'] = {};
    
    // Пытаемся загрузить сгенерированные предметы
    try {
      const weapons = await generatedObjectsLoader.loadObjects('weapons');
      const armors = await generatedObjectsLoader.loadObjects('armor');
      
      // Фильтруем по уровню
      const suitableWeapons = weapons.filter(w => {
        const itemLevel = (w as any).level || 1;
        const reqLevel = (w as any).requirements?.cultivationLevel || 1;
        return itemLevel <= npc.cultivation.level && reqLevel <= npc.cultivation.level;
      });
      
      const suitableArmors = armors.filter(a => {
        const itemLevel = (a as any).level || 1;
        const reqLevel = (a as any).requirements?.cultivationLevel || 1;
        return itemLevel <= npc.cultivation.level && reqLevel <= npc.cultivation.level;
      });
      
      // Случайный выбор
      if (suitableWeapons.length > 0 && rng() > 0.3) {
        const weapon = suitableWeapons[Math.floor(rng() * suitableWeapons.length)] as any;
        equipment.weapon = this.toTempItem(weapon, 'weapon');
      }
      
      if (suitableArmors.length > 0 && rng() > 0.4) {
        const armor = suitableArmors[Math.floor(rng() * suitableArmors.length)] as any;
        equipment.armor = this.toTempItem(armor, 'armor');
      }
    } catch (error) {
      console.warn('[SessionNPCManager] Could not load generated items, skipping equipment');
    }
    
    return equipment;
  }
  
  /**
   * Генерация быстрых слотов
   */
  private async generateQuickSlots(
    npc: GeneratedNPC,
    rng: () => number
  ): Promise<(TempItem | null)[]> {
    const slots: (TempItem | null)[] = [];
    const slotCount = Math.floor(1 + rng() * 3); // 1-3 слота
    
    try {
      const consumables = await generatedObjectsLoader.loadObjects('consumables');
      
      const suitable = consumables.filter(c => {
        const itemLevel = (c as any).level || 1;
        const reqLevel = (c as any).requirements?.cultivationLevel || 1;
        return itemLevel <= npc.cultivation.level && reqLevel <= npc.cultivation.level;
      });
      
      for (let i = 0; i < slotCount; i++) {
        if (suitable.length > 0 && rng() > 0.3) {
          const item = suitable[Math.floor(rng() * suitable.length)] as any;
          slots.push(this.toTempItem(item, 'consumable'));
        } else {
          slots.push(null);
        }
      }
    } catch (error) {
      console.warn('[SessionNPCManager] Could not load consumables');
    }
    
    return slots;
  }
  
  /**
   * Конвертация в TempItem
   */
  private toTempItem(item: any, type: TempItem['type']): TempItem {
    return {
      id: item.id || generateTempItemId(),
      name: item.name || 'Unknown Item',
      nameId: item.id,
      type,
      category: item.category || type,
      rarity: item.rarity || 'common',
      icon: item.icon,
      stats: {
        damage: item.stats?.damage,
        defense: item.stats?.defense,
        qiBonus: item.stats?.qiBonus,
        healthBonus: item.stats?.healthBonus,
        fatigueReduction: item.stats?.fatigueReduction,
      },
      effects: item.effects,
      charges: item.charges || 1,
      maxCharges: item.maxCharges || item.charges || 1,
      value: item.value,
      requirements: item.requirements,
    };
  }
  
  /**
   * Генерация личности
   */
  private generatePersonality(
    npc: GeneratedNPC,
    config: LocationNPCConfig,
    rng: () => number
  ): TempNPC['personality'] {
    // Базовое отношение из конфига
    const baseDisposition = config.behavior.defaultDisposition;
    
    // Добавляем случайность (-20 до +20)
    const disposition = Math.max(-100, Math.min(100, baseDisposition + (rng() * 40 - 20)));
    
    // Агрессия зависит от роли
    const aggressionLevel = this.calculateAggression(npc.roleId, config, rng);
    
    // Порог бегства (20-50%)
    const fleeThreshold = 20 + rng() * 30;
    
    // Возможность разговора/торговли
    const canTalk = npc.speciesId !== 'beast' && aggressionLevel < 70;
    const canTrade = canTalk && ['merchant', 'innkeeper', 'alchemist', 'blacksmith'].includes(npc.roleId);
    
    return {
      disposition,
      aggressionLevel,
      fleeThreshold,
      canTalk,
      canTrade,
      traits: npc.personality.traits,
      motivation: npc.personality.motivation,
      dominantEmotion: npc.personality.dominantEmotion,
    };
  }
  
  /**
   * Расчёт агрессии
   */
  private calculateAggression(
    roleId: string,
    config: LocationNPCConfig,
    rng: () => number
  ): number {
    // Монстры очень агрессивны
    if (config.monsters?.aggressionOverride) {
      return config.monsters.aggressionOverride;
    }
    
    // Боевые роли агрессивнее
    const combatRoles = ['bandit', 'mercenary', 'assassin', 'cultist', 'warrior', 'guard_combat'];
    if (combatRoles.includes(roleId)) {
      return 60 + rng() * 30; // 60-90
    }
    
    // Остальные роли
    return 10 + rng() * 30; // 10-40
  }
  
  /**
   * Конвертация BodyState
   */
  private convertBodyState(bodyState: any): TempNPC['bodyState'] {
    return {
      health: 100,
      maxHealth: 100,
      parts: bodyState?.parts || {},
      isDead: bodyState?.isDead || false,
      isUnconscious: false,
      activeEffects: [],
    };
  }
  
  /**
   * Генерация лута
   */
  private generateLoot(npc: TempNPC): TempItem[] {
    const loot: TempItem[] = [];
    
    // Духовные камни
    if (npc.resources.spiritStones > 0) {
      const dropAmount = Math.floor(npc.resources.spiritStones * (0.5 + Math.random() * 0.5));
      if (dropAmount > 0) {
        loot.push({
          id: generateTempItemId(),
          name: 'Духовный камень',
          type: 'material',
          category: 'material_essence',
          rarity: 'common',
          stats: {},
          charges: dropAmount,
          maxCharges: dropAmount,
          value: dropAmount,
        });
      }
    }
    
    // Экипировка (с шансом)
    if (npc.equipment.weapon && Math.random() > 0.7) {
      loot.push(npc.equipment.weapon);
    }
    if (npc.equipment.armor && Math.random() > 0.8) {
      loot.push(npc.equipment.armor);
    }
    
    // Быстрые слоты
    for (const item of npc.quickSlots) {
      if (item && Math.random() > 0.5) {
        loot.push(item);
      }
    }
    
    return loot;
  }
  
  /**
   * Расчёт опыта за убийство
   */
  private calculateXP(npc: TempNPC): number {
    const baseXP = 10 * npc.cultivation.level;
    const subLevelBonus = npc.cultivation.subLevel * 2;
    const qualityBonus = npc.cultivation.coreQuality / 20;
    
    return Math.floor(baseXP + subLevelBonus + qualityBonus);
  }
  
  /**
   * Сохранение NPC в память
   */
  private setLocationNPCs(sessionId: string, locationId: string, npcs: TempNPC[]): void {
    if (!this.npcs.has(sessionId)) {
      this.npcs.set(sessionId, new Map());
    }
    
    this.npcs.get(sessionId)!.set(locationId, npcs);
  }
}

// ==================== EXPORT SINGLETON ====================

export const sessionNPCManager = getSessionNPCManager();
