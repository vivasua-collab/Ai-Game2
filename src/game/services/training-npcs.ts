/**
 * ============================================================================
 * TRAINING NPC SYSTEM - Система тренировочных NPC
 * ============================================================================
 * 
 * Вынесено из PhaserGame.tsx для уменьшения размера файла.
 * 
 * Содержит:
 * - Загрузка NPC с сервера
 * - Создание спрайтов NPC
 * - Управление HP NPC
 * - Цвета и иконки по уровню/виду
 * 
 * Версия: 1.0.0
 */

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

/**
 * Тренировочный NPC
 */
export interface TrainingNPC {
  id: string;
  name: string;
  speciesId: string;
  roleId: string;
  level: number;
  subLevel: number;
  health: number;
  maxHealth: number;
  disposition: number;
  aggressionLevel: number;
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Container;
  isAggro: boolean;
}

// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Цвета по уровню культивации
 */
const LEVEL_COLORS: Record<number, number> = {
  1: 0x9ca3af, // Gray
  2: 0x22c55e, // Green
  3: 0x3b82f6, // Blue
  4: 0xa855f7, // Purple
  5: 0xf59e0b, // Amber
  6: 0xec4899, // Pink
  7: 0x06b6d4, // Cyan
  8: 0xfbbf24, // Gold
  9: 0xffffff, // White
};

/**
 * Иконки по виду существа
 */
const SPECIES_ICONS: Record<string, string> = {
  human: '👤',
  elf: '🧝',
  demon_humanoid: '👹',
  beastkin: '🐺',
  wolf: '🐺',
  tiger: '🐅',
  dragon_beast: '🐉',
  ghost: '👻',
  beast: '🐗',
  abberation: '👾',
  spirit: '✨',
};

// ============================================
// ФУНКЦИИ ПОДДЕРЖКИ
// ============================================

/**
 * Получить цвет по уровню
 */
export function getLevelColor(level: number): number {
  return LEVEL_COLORS[level] || LEVEL_COLORS[1];
}

/**
 * Получить иконку по виду существа
 */
export function getSpeciesIcon(speciesId: string): string {
  return SPECIES_ICONS[speciesId] || SPECIES_ICONS.human;
}

// ============================================
// ФУНКЦИИ УПРАВЛЕНИЯ NPC
// ============================================

/**
 * Обновить HP бар NPC
 */
export function updateTrainingNPCHPBar(
  npc: TrainingNPC, 
  hpBar: Phaser.GameObjects.Graphics
): void {
  hpBar.clear();
  const hpPercent = npc.health / npc.maxHealth;
  let color = 0x22c55e; // Green
  if (hpPercent < 0.25) color = 0xef4444; // Red
  else if (hpPercent < 0.5) color = 0xf97316; // Orange
  else if (hpPercent < 0.75) color = 0xeab308; // Yellow

  hpBar.fillStyle(color);
  hpBar.fillRect(-24, -54, 48 * hpPercent, 4);
}

/**
 * Создать спрайт тренировочного NPC
 */
export function createTrainingNPCSprite(
  scene: Phaser.Scene,
  npcData: {
    id: string;
    name: string;
    speciesId?: string;
    roleId?: string;
    level?: number;
    subLevel?: number;
    health?: number;
    disposition?: number;
    aggressionLevel?: number;
  },
  worldWidth: number,
  worldHeight: number,
  onAdd: (npc: TrainingNPC) => void
): TrainingNPC {
  // Random position around center
  const angle = Math.random() * Math.PI * 2;
  const distance = 200 + Math.random() * 300; // 200-500 pixels from center
  const x = worldWidth / 2 + Math.cos(angle) * distance;
  const y = worldHeight / 2 + Math.sin(angle) * distance;

  const container = scene.add.container(x, y);
  container.setDepth(5);

  // NPC body (enemy color based on level)
  const levelColor = getLevelColor(npcData.level || 1);

  // Outer aura
  const aura = scene.add.circle(0, 0, 35, levelColor, 0.15);
  container.add(aura);

  // Body
  const body = scene.add.circle(0, 0, 22, 0xff6b6b, 0.9);
  body.setStrokeStyle(3, levelColor);
  container.add(body);

  // Direction indicator
  const direction = scene.add.triangle(28, 0, 0, -8, 0, 8, 12, levelColor, 0.8);
  container.add(direction);

  // Icon based on species
  const icon = scene.add.text(0, 0, getSpeciesIcon(npcData.speciesId || 'human'), {
    fontSize: '18px',
  }).setOrigin(0.5);
  container.add(icon);

  // Name label
  const label = scene.add.text(0, 38, npcData.name, {
    fontSize: '11px',
    color: '#ffffff',
    fontFamily: 'Arial',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(label);

  // Level indicator
  const levelText = scene.add.text(0, 52, `Ур. ${npcData.level || 1}.${npcData.subLevel || 0}`, {
    fontSize: '9px',
    color: '#fbbf24',
    fontFamily: 'Arial',
  }).setOrigin(0.5);
  container.add(levelText);

  // HP bar background
  const hpBarBg = scene.add.graphics();
  hpBarBg.fillStyle(0x000000, 0.7);
  hpBarBg.fillRect(-25, -55, 50, 6);
  container.add(hpBarBg);

  // HP bar
  const hpBar = scene.add.graphics();
  container.add(hpBar);

  // Make interactive
  body.setInteractive({ useHandCursor: true });
  body.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.15, duration: 150 });
  });
  body.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 150 });
  });

  // Create NPC object
  const npc: TrainingNPC = {
    id: npcData.id,
    name: npcData.name,
    speciesId: npcData.speciesId || 'human',
    roleId: npcData.roleId || 'enemy',
    level: npcData.level || 1,
    subLevel: npcData.subLevel || 0,
    health: npcData.health || 100,
    maxHealth: npcData.health || 100,
    disposition: npcData.disposition || -50,
    aggressionLevel: npcData.aggressionLevel || 70,
    x,
    y,
    sprite: container,
    isAggro: (npcData.disposition || -50) < 0,
  };

  // Update HP bar
  updateTrainingNPCHPBar(npc, hpBar);

  // Add to callback
  onAdd(npc);

  // Pulsing animation
  scene.tweens.add({
    targets: aura,
    scale: { from: 1, to: 1.2 },
    alpha: { from: 0.15, to: 0.05 },
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return npc;
}

/**
 * Загрузить NPC для тренировочного полигона с сервера
 */
export async function loadTrainingNPCs(
  scene: Phaser.Scene,
  sessionId: string | null,
  playerLevel: number,
  worldWidth: number,
  worldHeight: number,
  onAdd: (npc: TrainingNPC) => void
): Promise<void> {
  if (!sessionId) {
    console.log('[TrainingNPC] No sessionId, skipping NPC load');
    return;
  }

  try {
    // Initialize NPCs for training ground via API
    const response = await fetch('/api/temp-npc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init',
        sessionId,
        locationId: 'training_ground',
        config: 'training_ground',
        playerLevel,
      }),
    });

    const data = await response.json();

    if (data.success && data.npcs) {
      console.log(`[TrainingNPC] Loaded ${data.npcs.length} NPCs`);

      // Create sprites for each NPC
      for (const npcData of data.npcs) {
        createTrainingNPCSprite(scene, npcData, worldWidth, worldHeight, onAdd);
      }
    } else {
      console.warn('[TrainingNPC] Failed to load NPCs:', data.error);
    }
  } catch (error) {
    console.error('[TrainingNPC] Error loading NPCs:', error);
  }
}
