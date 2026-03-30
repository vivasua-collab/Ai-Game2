/**
 * ============================================================================
 * WAVE MANAGER - Система волн для Training Ground
 * ============================================================================
 * 
 * Управляет волнами врагов в Training Ground.
 * 
 * Версия: 1.0.0
 */

import { EventBus } from '@/lib/game/event-bus';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import type { SpeciesType } from '@/data/presets';
import type { TempNPC, TempItem } from '@/types/temp-npc';
import { TRAINING_GROUND_CONFIG } from '@/types/temp-npc';

// ==================== ТИПЫ ====================

export interface WaveConfig {
  waveNumber: number;
  npcCount: number;
  levelBonus: number;  // Бонус к уровню NPC
  speciesWeights: Partial<Record<SpeciesType, number>>;
}

export interface WaveState {
  currentWave: number;
  activeNPCs: string[];
  isWaveActive: boolean;
  waveStartTime: number;
  npcsKilled: number;
  totalXP: number;
  totalLoot: number;
}

// ==================== КОНСТАНТЫ ====================

const DEFAULT_SPECIES_WEIGHTS: Record<SpeciesType, number> = {
  beast: 60,
  humanoid: 30,
  aberration: 10,
};

const DEFAULT_WAVE_CONFIG: WaveConfig = {
  waveNumber: 1,
  npcCount: 3,
  levelBonus: 0,
  speciesWeights: DEFAULT_SPECIES_WEIGHTS,
};

// ==================== КЛАСС ====================

export class WaveManager {
  private state: WaveState = {
    currentWave: 0,
    activeNPCs: [],
    isWaveActive: false,
    waveStartTime: 0,
    npcsKilled: 0,
    totalXP: 0,
    totalLoot: 0,
  };
  
  /**
   * Начать следующую волну
   */
  startNextWave(sessionId: string): void {
    this.state.currentWave++;
    this.state.isWaveActive = true;
    this.state.waveStartTime = Date.now();
    this.state.npcsKilled = 0;
    this.state.totalXP = 0;
    this.state.totalLoot = 0;
    
    const waveConfig = this.getWaveConfig(this.state.currentWave);
    
    // Генерация NPC для волны
    for (let i = 0; i < waveConfig.npcCount; i++) {
      const npc = sessionNPCManager.generateTempNPC(sessionId, {
        level: Math.min(9, 1 + waveConfig.levelBonus + Math.floor(Math.random() * 3)),
        speciesType: this.selectSpecies(waveConfig.speciesWeights),
      });
      
      if (npc) {
        this.state.activeNPCs.push(npc.id);
      }
    }
    
    // Уведомление о начале волны через Event Bus
    EventBus.emit('wave:started', {
      waveNumber: this.state.currentWave,
      npcCount: waveConfig.npcCount,
    });
    
    console.log(`[WaveManager] Started wave ${this.state.currentWave} with ${waveConfig.npcCount} NPCs`);
  }
  
  /**
   * Конфигурация волны
   */
  private getWaveConfig(wave: number): WaveConfig {
    return {
      waveNumber: wave,
      npcCount: Math.min(10, 3 + wave),  // 3 + wave, max 10
      levelBonus: Math.floor(wave / 2),  // +1 уровень каждые 2 волны
      speciesWeights: {
        beast: Math.max(20, 60 - wave * 2),
        humanoid: Math.min(40, 30 + wave),
        aberration: Math.min(20, 10 + wave),
      },
    };
  }
  
  /**
   * Выбор species по весам
   */
  private selectSpecies(weights: Partial<Record<SpeciesType, number>>): SpeciesType {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (const [species, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return species as SpeciesType;
    }
    
    return 'beast';
  }
  
  /**
   * Проверка завершения волны
   */
  checkWaveComplete(): boolean {
    if (!this.state.isWaveActive) return true;
    
    // Все NPC мертвы?
    const allDead = this.state.activeNPCs.length === 0;
    
    if (allDead) {
      this.state.isWaveActive = false;
      
      // Эмит событи завершения волны
      EventBus.emit('wave:complete', {
        waveNumber: this.state.currentWave,
      });
      
      console.log(`[WaveManager] Wave ${this.state.currentWave} complete!`);
    }
    
    return allDead;
  }
  
  /**
   * Уведомление о смерти NPC
   */
  notifyNPCDeath(npcId: string): void {
    const index = this.state.activeNPCs.indexOf(npcId);
    if (index > -1) {
      this.state.activeNPCs.splice(index, 1);
      this.state.npcsKilled++;
    }
    
    this.checkWaveComplete();
  }
  
  /**
   * Сброс менеджера волн
   */
  reset(): void {
    this.state = {
      currentWave: 0,
      activeNPCs: [],
      isWaveActive: false,
      waveStartTime: 0,
      npcsKilled: 0,
      totalXP: 0,
      totalLoot: 0,
    };
    console.log('[WaveManager] Reset');
  }
  
  /**
   * Добавить XP и лут
   */
  addXP(xp: number): void {
    this.state.totalXP += xp;
  }
  
  /**
   * Добавить лут
   */
  addLoot(loot: TempItem[]): void {
    this.state.totalLoot += loot.length;
  }
  
  /**
   * Получить текущее состояние волны
   */
  getWaveState(): WaveState {
    return { ...this.state };
  }
}

// ==================== SINGLETON ====================

export const waveManager = new WaveManager();
