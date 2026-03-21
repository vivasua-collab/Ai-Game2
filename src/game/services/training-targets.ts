/**
 * ============================================================================
 * TRAINING TARGET SYSTEM - Система тренировочных чучел
 * ============================================================================
 * 
 * Вынесено из PhaserGame.tsx для уменьшения размера файла.
 * 
 * Содержит:
 * - Создание текстур чучела
 * - Управление HP чучела
 * - Отображение урона
 * - Обновление HP баров
 * 
 * Версия: 1.0.0
 */

// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Цвета для отображения урона по типу
 */
export const DAMAGE_COLORS: Record<string, string> = {
  normal: '#FFFFFF',
  critical: '#FF4444',
  fire: '#FF8844',
  water: '#4488FF',
  earth: '#886644',
  air: '#CCCCCC',
  lightning: '#FFFF44',
  void: '#9944FF',
  healing: '#44FF44',
};

/**
 * Радиус хитбокса чучела в пикселях
 */
export const TARGET_HITBOX_RADIUS = 22;

/**
 * Размеры чучела
 */
export const TARGET_WIDTH = 48;
export const TARGET_HEIGHT = 80;

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

/**
 * Тренировочное чучело
 */
export interface TrainingTarget {
  id: string;
  x: number;
  y: number;
  centerY: number; // Центр торса для hit detection
  hitboxRadius: number;
  hp: number;
  maxHp: number;
  sprite: Phaser.GameObjects.Container | null;
  hpBar: Phaser.GameObjects.Graphics | null;
  hitboxCircle: Phaser.GameObjects.Graphics | null;
  lastHitTime: number;
}

/**
 * Всплывающее число урона
 */
export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  type: string;
  text: Phaser.GameObjects.Text;
  createdAt: number;
}

// ============================================
// ФУНКЦИИ СОЗДАНИЯ ТЕКСТУР
// ============================================

/**
 * Создать текстуру тренировочного чучела
 * Соломенное чучело с деревянной основой
 */
export function createTargetTexture(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const width = TARGET_WIDTH;
  const height = TARGET_HEIGHT;

  // === WOODEN POST BASE ===
  graphics.fillStyle(0x5c4033);
  graphics.fillRect(width / 2 - 5, height * 0.6, 10, height * 0.4);

  // Base platform
  graphics.fillStyle(0x4a3728);
  graphics.fillEllipse(width / 2, height * 0.95, 30, 8);

  // === STRAW BODY ===
  // Main body (straw bundle)
  graphics.fillStyle(0xdaa520);
  graphics.fillEllipse(width / 2, height * 0.45, 22, 28);

  // Straw texture lines
  graphics.lineStyle(1, 0xb8860b);
  for (let i = 0; i < 5; i++) {
    const y = height * 0.3 + i * 6;
    graphics.beginPath();
    graphics.moveTo(width / 2 - 18, y);
    graphics.lineTo(width / 2 + 18, y);
    graphics.strokePath();
  }

  // === HEAD ===
  graphics.fillStyle(0xdeb887);
  graphics.fillCircle(width / 2, height * 0.18, 12);

  // Face markings (target circles)
  graphics.lineStyle(2, 0x8b0000);
  graphics.beginPath();
  graphics.arc(width / 2, height * 0.18, 6, 0, Math.PI * 2);
  graphics.strokePath();

  graphics.lineStyle(1, 0x8b0000);
  graphics.beginPath();
  graphics.arc(width / 2, height * 0.18, 3, 0, Math.PI * 2);
  graphics.strokePath();

  // === ARMS (horizontal bar) ===
  graphics.fillStyle(0x5c4033);
  graphics.fillRect(width / 2 - 24, height * 0.4, 48, 6);

  // Arm end caps
  graphics.fillStyle(0x8b4513);
  graphics.fillCircle(width / 2 - 24, height * 0.43, 5);
  graphics.fillCircle(width / 2 + 24, height * 0.43, 5);

  // === VITAL POINT MARKERS ===
  // Head vital point
  graphics.fillStyle(0xff4444);
  graphics.fillCircle(width / 2, height * 0.18, 2);

  // Chest vital point
  graphics.fillStyle(0xff4444);
  graphics.fillCircle(width / 2, height * 0.4, 2);

  // === WORN/USED EFFECTS ===
  // Some straw pieces sticking out
  graphics.lineStyle(2, 0xdaa520);
  graphics.beginPath();
  graphics.moveTo(width / 2 - 10, height * 0.35);
  graphics.lineTo(width / 2 - 15, height * 0.28);
  graphics.strokePath();

  graphics.beginPath();
  graphics.moveTo(width / 2 + 8, height * 0.5);
  graphics.lineTo(width / 2 + 14, height * 0.55);
  graphics.strokePath();

  graphics.generateTexture('target', width, height);
  graphics.destroy();
}

// ============================================
// ФУНКЦИИ УПРАВЛЕНИЯ ЧУЧЕЛОМ
// ============================================

/**
 * Создать тренировочное чучело
 */
export function createTarget(
  scene: Phaser.Scene, 
  x: number, 
  y: number, 
  id: string,
  maxHp: number = 1000
): TrainingTarget {
  const container = scene.add.container(x, y);
  container.setDepth(5);

  // Target sprite (texture is 48x80, anchor at bottom center)
  const sprite = scene.add.image(0, -40, 'target').setOrigin(0.5, 1);
  container.add(sprite);

  // HP bar background
  const hpBarBg = scene.add.graphics();
  hpBarBg.fillStyle(0x000000, 0.7);
  hpBarBg.fillRect(-25, -100, 50, 8);
  container.add(hpBarBg);

  // HP bar
  const hpBar = scene.add.graphics();
  container.add(hpBar);

  // Target label
  const label = scene.add.text(0, -115, '🎯 Соломенное чучело', {
    fontSize: '11px',
    color: '#fbbf24',
    fontFamily: 'Arial',
  }).setOrigin(0.5);
  container.add(label);

  // Calculate the center of the figure (torso area)
  // Sprite is at (0, -40) with origin (0.5, 1), texture is 80px tall
  // Bottom of sprite at y - 40, top at y - 120
  // Center of torso (straw body) is around 45% from top = y - 40 - 80*0.55 ≈ y - 84
  // But for visual center, we use y - 60 (torso area)
  const centerY = y - 60;

  // Visual hitbox indicator (debug/tactical view)
  const hitboxCircle = scene.add.graphics();
  hitboxCircle.lineStyle(1, 0x00ff00, 0.4); // Green, semi-transparent
  hitboxCircle.strokeCircle(0, -60, TARGET_HITBOX_RADIUS); // Centered at torso
  container.add(hitboxCircle);

  const target: TrainingTarget = {
    id,
    x,
    y,
    centerY,
    hitboxRadius: TARGET_HITBOX_RADIUS,
    hp: maxHp,
    maxHp,
    sprite: container,
    hpBar,
    hitboxCircle,
    lastHitTime: 0,
  };

  updateTargetHpBar(target);

  // Make interactive
  sprite.setInteractive();
  sprite.on('pointerdown', () => {
    // Visual feedback
    scene.tweens.add({
      targets: container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
    });
  });

  return target;
}

/**
 * Обновить HP бар чучела
 */
export function updateTargetHpBar(target: TrainingTarget): void {
  if (!target.hpBar) return;

  target.hpBar.clear();

  const hpPercent = target.hp / target.maxHp;
  const barWidth = 48 * hpPercent;

  // Color based on HP
  let color = 0x22c55e; // Green
  if (hpPercent < 0.25) color = 0xef4444; // Red
  else if (hpPercent < 0.5) color = 0xf97316; // Orange
  else if (hpPercent < 0.75) color = 0xeab308; // Yellow

  target.hpBar.fillStyle(color);
  target.hpBar.fillRect(-24, -99, barWidth, 6);
}

/**
 * Показать всплывающее число урона
 */
export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  type: string = 'normal',
  damageNumbers: DamageNumber[]
): DamageNumber[] {
  const color = DAMAGE_COLORS[type] || DAMAGE_COLORS.normal;
  const isCrit = type === 'critical';
  const isHeal = type === 'healing';

  const text = scene.add.text(x, y, damage.toString(), {
    fontSize: isCrit ? '24px' : '18px',
    fontFamily: 'Arial',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(200);

  const damageNum: DamageNumber = {
    id: `dmg_${Date.now()}_${Math.random()}`,
    x,
    y,
    damage,
    type,
    text,
    createdAt: Date.now(),
  };

  const updatedNumbers = [...damageNumbers, damageNum];

  // Animate: float up and fade
  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    scale: isCrit ? 1.8 : (isHeal ? 1.0 : 1.3),
    duration: 1200,
    ease: 'Power2',
    onComplete: () => {
      text.destroy();
    },
  });

  return updatedNumbers;
}

/**
 * Нанести урон чучелу
 */
export function damageTarget(
  scene: Phaser.Scene,
  target: TrainingTarget,
  damage: number,
  type: string = 'normal',
  damageNumbers: DamageNumber[]
): { target: TrainingTarget; damageNumbers: DamageNumber[] } {
  target.hp = Math.max(0, target.hp - damage);
  target.lastHitTime = Date.now();

  // Update HP bar
  updateTargetHpBar(target);

  // Show damage number at target center (centerY = torso area)
  const updatedNumbers = showDamageNumber(
    scene, 
    target.x, 
    target.centerY, 
    damage, 
    type,
    damageNumbers
  );

  // Flash effect
  if (target.sprite) {
    const sprite = target.sprite.getAt(0) as Phaser.GameObjects.Image;
    if (sprite && sprite.setTint) {
      sprite.setTint(0xff4444);
      scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          sprite.clearTint();
          sprite.setAlpha(1);
        },
      });
    }
  }

  // Reset if destroyed
  if (target.hp <= 0) {
    scene.time.delayedCall(500, () => {
      target.hp = target.maxHp;
      updateTargetHpBar(target);
      showDamageNumber(scene, target.x, target.centerY, target.maxHp, 'healing', []);
      
      // Respawn message
      if (target.sprite) {
        const label = target.sprite.getAt(3) as Phaser.GameObjects.Text;
        if (label) {
          const originalText = '🎯 Соломенное чучело';
          label.setText('✅ Восстановлено!');
          label.setColor('#22c55e');
          scene.time.delayedCall(1500, () => {
            label.setText(originalText);
            label.setColor('#fbbf24');
          });
        }
      }
    });
  }

  return { target, damageNumbers: updatedNumbers };
}

/**
 * Очистить массив чисел урона (удалить старые)
 */
export function cleanupDamageNumbers(
  damageNumbers: DamageNumber[],
  maxAge: number = 2000
): DamageNumber[] {
  const now = Date.now();
  return damageNumbers.filter(d => now - d.createdAt < maxAge);
}
