/**
 * Technique Charging System
 * 
 * Handles the charging mechanics for Qi techniques in combat.
 * Charge time is based on Qi cost, conductivity, and mastery.
 */

import { calculateTotalConductivity } from '@/lib/game/conductivity-system';
import type { RangeData } from './combat-utils';
import type { Character } from '@/types/game';

/**
 * Техника в процессе зарядки
 * 
 * Время зарядки = qiCost / проводимость (секунды)
 * Бонусы: +5% скорость за уровень культивации, +1% за 1% мастерства
 */
export interface TechniqueCharging {
  id: string;                    // Уникальный ID зарядки
  techniqueId: string;           // ID техники
  slotIndex: number;             // Индекс слота (1-6)
  qiCost: number;                // Стоимость Ци
  startTime: number;             // Время начала зарядки (ms)
  chargeTime: number;            // Время зарядки (ms)
  progress: number;              // Прогресс 0-1
  techniqueData: {
    damage: number;
    range: number | RangeData;   // Поддержка зон урона
    type: string;
    element: string;
    qiCost: number;
    mastery?: number;
    coneAngle?: number;          // Угол конуса атаки
  };
  chargeBar?: Phaser.GameObjects.Graphics;  // Визуальный индикатор
  chargeText?: Phaser.GameObjects.Text;     // Текст времени
}

/**
 * Context needed for technique charging operations
 */
export interface ChargingContext {
  character: Character | null;
  chargingTechniques: TechniqueCharging[];
  chargeBars: Map<number, Phaser.GameObjects.Graphics>;
  chargeTexts: Map<number, Phaser.GameObjects.Text>;
}

/**
 * Calculate technique charge time based on Qi cost and conductivity
 * 
 * Formula: chargeTime = qiCost / effectiveSpeed
 * effectiveSpeed = conductivity × (1 + masteryBonus)
 * 
 * @param qiCost Qi cost of the technique
 * @param coreCapacity Character's core capacity
 * @param cultivationLevel Character's cultivation level
 * @param mastery Technique mastery (0-100%)
 * @param conductivityMeditations Number of conductivity meditations (default 0)
 * @returns Charge time in milliseconds
 */
export function calculateChargeTime(
  qiCost: number,
  coreCapacity: number,
  cultivationLevel: number = 1,
  mastery: number = 0,
  conductivityMeditations: number = 0
): number {
  // Используем ЕДИНУЮ функцию проводимости из conductivity-system.ts
  const totalConductivity = calculateTotalConductivity(
    coreCapacity,
    cultivationLevel,
    conductivityMeditations
  );
  
  // Base speed = conductivity Qi/second
  let effectiveSpeed = Math.max(0.1, totalConductivity);
  
  // Mastery bonus: +1% speed per 1% mastery
  const masteryBonus = 1 + mastery * 0.01;
  effectiveSpeed *= masteryBonus;
  
  // Charge time in milliseconds
  const chargeTimeMs = (qiCost / effectiveSpeed) * 1000;
  
  // Minimum 100ms (для баланса - минимум 0.1 секунды)
  return Math.max(100, chargeTimeMs);
}

/**
 * Get effective conductivity from character
 * Использует ЕДИНУЮ функцию проводимости из conductivity-system.ts
 */
export function getEffectiveConductivity(character: Character | null): number {
  if (!character) return 1.0;
  
  // Используем единую функцию проводимости
  return calculateTotalConductivity(
    character.coreCapacity,
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );
}

/**
 * Get core capacity from character (for charge time calculation)
 */
export function getCoreCapacity(character: Character | null): number {
  return character?.coreCapacity || 360;
}

/**
 * Get cultivation level from character
 */
export function getCultivationLevel(character: Character | null): number {
  return character?.cultivationLevel || 1;
}

/**
 * Check if a slot is already charging
 */
export function isSlotCharging(chargingTechniques: TechniqueCharging[], slotIndex: number): boolean {
  return chargingTechniques.some(ct => ct.slotIndex === slotIndex);
}

/**
 * Start charging a technique
 * 
 * @returns The new charging entry if started, null if already charging or invalid
 */
export function startTechniqueCharging(
  scene: Phaser.Scene,
  ctx: ChargingContext,
  slotIndex: number,
  techniqueId: string,
  techniqueData: {
    damage: number;
    range: number;
    type: string;
    element: string;
    qiCost: number;
    mastery?: number;
  },
  playerX: number,
  playerY: number
): TechniqueCharging | null {
  // Check if already charging this slot
  if (isSlotCharging(ctx.chargingTechniques, slotIndex)) {
    // Show "Already charging" message
    const msgText = scene.add.text(playerX, playerY - 60, 'Уже заряжается...', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    scene.tweens.add({
      targets: msgText,
      y: playerY - 80,
      alpha: 0,
      duration: 1000,
      onComplete: () => msgText.destroy(),
    });
    return null;
  }
  
  // Check Qi availability
  const currentQi = ctx.character?.currentQi || 0;
  if (techniqueData.qiCost > 0 && currentQi < techniqueData.qiCost) {
    // Show "Not enough Qi" message
    const noQiText = scene.add.text(playerX, playerY - 60, `Недостаточно Ци! Нужно: ${techniqueData.qiCost}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    scene.tweens.add({
      targets: noQiText,
      y: playerY - 90,
      alpha: 0,
      duration: 1500,
      onComplete: () => noQiText.destroy(),
    });
    return null;
  }
  
  // Calculate charge time using coreCapacity and conductivity meditations
  const coreCapacity = getCoreCapacity(ctx.character);
  const cultivationLevel = getCultivationLevel(ctx.character);
  const mastery = techniqueData.mastery || 0;
  const conductivityMeditations = ctx.character?.conductivityMeditations || 0;
  const chargeTime = calculateChargeTime(techniqueData.qiCost, coreCapacity, cultivationLevel, mastery, conductivityMeditations);
  
  // Create charge bar for this slot (will be updated in update loop)
  const chargeBar = scene.add.graphics();
  chargeBar.setDepth(150);
  ctx.chargeBars.set(slotIndex, chargeBar);
  
  // Create charge text
  const chargeText = scene.add.text(0, 0, '', {
    fontSize: '10px',
    fontFamily: 'Arial',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 1,
  }).setOrigin(0.5).setDepth(151);
  ctx.chargeTexts.set(slotIndex, chargeText);
  
  // Create charging entry
  const charging: TechniqueCharging = {
    id: `charge_${slotIndex}_${Date.now()}`,
    techniqueId,
    slotIndex,
    qiCost: techniqueData.qiCost,
    startTime: Date.now(),
    chargeTime,
    progress: 0,
    techniqueData: {
      ...techniqueData,
      qiCost: techniqueData.qiCost,
    },
    chargeBar,
    chargeText,
  };
  
  // Show charging started message
  const chargeSeconds = (chargeTime / 1000).toFixed(1);
  const startText = scene.add.text(playerX, playerY - 50, `⚡ Зарядка: ${chargeSeconds}с`, {
    fontSize: '12px',
    fontFamily: 'Arial',
    color: '#4ade80',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(200);
  
  scene.tweens.add({
    targets: startText,
    y: playerY - 70,
    alpha: 0,
    duration: 1000,
    onComplete: () => startText.destroy(),
  });
  
  return charging;
}

/**
 * Update all charging techniques
 * Returns techniques that finished charging this frame
 */
export function updateChargingTechniques(
  scene: Phaser.Scene,
  chargingTechniques: TechniqueCharging[]
): TechniqueCharging[] {
  const now = Date.now();
  const finished: TechniqueCharging[] = [];
  
  for (const charging of chargingTechniques) {
    const elapsed = now - charging.startTime;
    charging.progress = Math.min(1, elapsed / charging.chargeTime);
    
    // Update visual charge bar
    if (charging.chargeBar) {
      charging.chargeBar.clear();
      
      // Background
      charging.chargeBar.fillStyle(0x000000, 0.7);
      charging.chargeBar.fillRect(-20, -8, 40, 6);
      
      // Progress
      const progressColor = charging.progress >= 1 ? 0x4ade80 : 0xfbbf24;
      charging.chargeBar.fillStyle(progressColor, 1);
      charging.chargeBar.fillRect(-20, -8, 40 * charging.progress, 6);
    }
    
    // Update charge text
    if (charging.chargeText) {
      const remaining = Math.max(0, (charging.chargeTime - elapsed) / 1000);
      if (charging.progress >= 1) {
        charging.chargeText.setText('ГОТОВО!');
        charging.chargeText.setColor('#4ade80');
      } else {
        charging.chargeText.setText(`${remaining.toFixed(1)}с`);
      }
    }
    
    // Check if finished
    if (charging.progress >= 1) {
      finished.push(charging);
    }
  }
  
  return finished;
}

/**
 * Cancel charging for a slot
 */
export function cancelCharging(
  chargingTechniques: TechniqueCharging[],
  chargeBars: Map<number, Phaser.GameObjects.Graphics>,
  chargeTexts: Map<number, Phaser.GameObjects.Text>,
  slotIndex: number
): TechniqueCharging[] {
  const charging = chargingTechniques.find(ct => ct.slotIndex === slotIndex);
  if (charging) {
    if (charging.chargeBar) {
      charging.chargeBar.destroy();
      chargeBars.delete(slotIndex);
    }
    if (charging.chargeText) {
      charging.chargeText.destroy();
      chargeTexts.delete(slotIndex);
    }
    return chargingTechniques.filter(ct => ct.slotIndex !== slotIndex);
  }
  return chargingTechniques;
}

/**
 * Get charging progress for a slot (0-1, or 0 if not charging)
 */
export function getChargingProgress(chargingTechniques: TechniqueCharging[], slotIndex: number): number {
  const charging = chargingTechniques.find(ct => ct.slotIndex === slotIndex);
  return charging?.progress || 0;
}
