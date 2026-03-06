/**
 * ============================================================================
 * ENVIRONMENT TEXTURE GENERATOR - Генератор текстур окружения
 * ============================================================================
 * 
 * Программная генерация текстур для объектов окружения:
 * - Камни (разные размеры и типы)
 * - Деревья (разные породы)
 * - Рудные камни (с прожилками и свечением)
 * - Деревянные строения (стены, двери, окна)
 * 
 * Важно: используется только в контексте Phaser Scene (browser only)
 * 
 * @updated 2026-03-06 14:00 UTC
 */

import type { 
  ObstaclePreset, 
  TreePreset, 
  OrePreset, 
  BuildingPartPreset 
} from '@/types/environment';

// Константы
const METERS_TO_PIXELS = 32;

// ==================== УТИЛИТЫ ====================

/**
 * Конвертация hex в CSS цвет
 */
function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * Конвертация hex в RGBA
 */
function hexToRgba(hex: number, alpha: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Случайное число в диапазоне
 */
function rand(min: number, max: number, seed?: number): number {
  if (seed !== undefined) {
    // Детерминированный случайный генератор
    const x = Math.sin(seed) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }
  return min + Math.random() * (max - min);
}

// ==================== КАМНИ ====================

/**
 * Создать текстуру камня
 */
export function createRockTexture(
  scene: Phaser.Scene,
  preset: ObstaclePreset,
  seed: number = Math.random() * 10000
): void {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return;
  
  const width = preset.width * METERS_TO_PIXELS;
  const height = preset.height * METERS_TO_PIXELS;
  
  const canvas = document.createElement('canvas');
  canvas.width = width + 16;
  canvas.height = height + 16;
  const ctx = canvas.getContext('2d')!;
  
  // Очищаем canvas для прозрачного фона
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  const { visual } = preset;
  
  // Тень
  ctx.fillStyle = hexToRgba(visual.shadowColor, 0.4);
  drawRockShape(ctx, cx + 3, cy + 3, width, height, visual.shape, seed);
  ctx.fill();
  
  // Основная форма
  ctx.fillStyle = hexToCss(visual.baseColor);
  drawRockShape(ctx, cx, cy, width, height, visual.shape, seed);
  ctx.fill();
  
  // Текстура
  if (visual.texture === 'rough') {
    drawRoughTexture(ctx, cx, cy, width, height, visual.baseColor, seed);
  } else if (visual.texture === 'crystalline') {
    drawCrystallineTexture(ctx, cx, cy, width, height, visual.baseColor, seed);
  }
  
  // Блики
  ctx.fillStyle = hexToRgba(visual.highlightColor, 0.6);
  drawRockHighlight(ctx, cx, cy, width, height, visual.shape, seed);
  
  // Контур
  ctx.strokeStyle = hexToRgba(visual.shadowColor, 0.8);
  ctx.lineWidth = 2;
  drawRockShape(ctx, cx, cy, width, height, visual.shape, seed);
  ctx.stroke();
  
  // Добавляем текстуру в Phaser
  scene.textures.addCanvas(key, canvas);
}

/**
 * Нарисовать форму камня
 */
function drawRockShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  shape: 'circle' | 'irregular' | 'angular',
  seed: number
): void {
  ctx.beginPath();
  
  if (shape === 'circle') {
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (shape === 'irregular') {
    // Неровная форма
    const points = 12;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusX = (width / 2) * (0.85 + rand(0, 0.3, seed + i) * 0.15);
      const radiusY = (height / 2) * (0.85 + rand(0, 0.3, seed + i + 100) * 0.15);
      const x = cx + Math.cos(angle) * radiusX;
      const y = cy + Math.sin(angle) * radiusY;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    // Угловатая форма
    const points = 6 + Math.floor(rand(0, 3, seed));
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusX = (width / 2) * (0.7 + rand(0, 0.6, seed + i) * 0.3);
      const radiusY = (height / 2) * (0.7 + rand(0, 0.6, seed + i + 50) * 0.3);
      const x = cx + Math.cos(angle) * radiusX;
      const y = cy + Math.sin(angle) * radiusY;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

/**
 * Нарисовать блики на камне
 */
function drawRockHighlight(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  shape: 'circle' | 'irregular' | 'angular',
  seed: number
): void {
  // Верхний блик
  ctx.beginPath();
  ctx.ellipse(
    cx - width * 0.15,
    cy - height * 0.2,
    width * 0.2,
    height * 0.15,
    0, 0, Math.PI * 2
  );
  ctx.fill();
  
  // Малые блики
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(
      cx + rand(-0.2, 0.1, seed + i * 10) * width,
      cy + rand(-0.3, -0.1, seed + i * 10 + 5) * height,
      rand(2, 5, seed + i * 10 + 10),
      0, Math.PI * 2
    );
    ctx.fill();
  }
}

/**
 * Шершавая текстура
 */
function drawRoughTexture(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  baseColor: number,
  seed: number
): void {
  for (let i = 0; i < 20; i++) {
    const x = cx + rand(-0.4, 0.4, seed + i) * width;
    const y = cy + rand(-0.4, 0.4, seed + i + 50) * height;
    const size = rand(1, 4, seed + i + 100);
    
    ctx.fillStyle = hexToRgba(baseColor, rand(0.1, 0.3, seed + i + 150));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Кристаллическая текстура
 */
function drawCrystallineTexture(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  baseColor: number,
  seed: number
): void {
  for (let i = 0; i < 8; i++) {
    const x = cx + rand(-0.3, 0.3, seed + i) * width;
    const y = cy + rand(-0.3, 0.3, seed + i + 50) * height;
    const angle = rand(0, Math.PI, seed + i + 100);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.strokeStyle = hexToRgba(baseColor, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rand(5, 15, seed + i + 150), 0);
    ctx.lineTo(rand(5, 15, seed + i + 200), 0);
    ctx.stroke();
    
    ctx.restore();
  }
}

// ==================== ДЕРЕВЬЯ ====================

/**
 * Создать текстуру дерева
 */
export function createTreeTexture(
  scene: Phaser.Scene,
  preset: TreePreset,
  seed: number = Math.random() * 10000
): void {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return;
  
  const trunkW = preset.trunkWidth * METERS_TO_PIXELS;
  const trunkH = preset.trunkHeight * METERS_TO_PIXELS;
  const canopyR = preset.canopyRadius * METERS_TO_PIXELS;
  
  const width = Math.max(trunkW, canopyR * 2) + 20;
  const height = trunkH + canopyR + 20;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Очищаем canvas для прозрачного фона
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cx = width / 2;
  const trunkTop = height - 10;
  const trunkBottom = trunkTop - trunkH;
  const canopyCenterY = trunkBottom - canopyR * 0.3;
  
  const { visual } = preset;
  
  // Тень от кроны
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx + 5, canopyCenterY + 5, canopyR, canopyR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Крона (за стволом)
  if (preset.type === 'pine') {
    drawPineCanopy(ctx, cx, canopyCenterY, canopyR, trunkH, visual, seed);
  } else if (preset.type === 'bamboo') {
    drawBambooCanopy(ctx, cx, canopyCenterY, canopyR, visual, seed);
  } else if (preset.type === 'willow') {
    drawWillowCanopy(ctx, cx, canopyCenterY, canopyR, visual, seed);
  } else if (preset.type === 'dead_tree') {
    // Без кроны
  } else {
    drawRoundCanopy(ctx, cx, canopyCenterY, canopyR, visual, seed);
  }
  
  // Ствол
  drawTrunk(ctx, cx, trunkBottom, trunkH, trunkW, visual, preset.type, seed);
  
  // Духовное свечение
  if (preset.isSpiritual) {
    drawSpiritGlow(ctx, cx, canopyCenterY, canopyR * 1.5, visual.canopyColor);
  }
  
  scene.textures.addCanvas(key, canvas);
}

/**
 * Нарисовать ствол
 */
function drawTrunk(
  ctx: CanvasRenderingContext2D,
  cx: number, bottom: number,
  height: number, width: number,
  visual: TreePreset['visual'],
  type: TreeType,
  seed: number
): void {
  const top = bottom - height;
  
  // Основной ствол
  ctx.fillStyle = hexToCss(visual.trunkColor);
  
  if (type === 'bamboo') {
    // Бамбук - сегменты
    const segments = 5;
    const segHeight = height / segments;
    
    for (let i = 0; i < segments; i++) {
      const y = bottom - i * segHeight;
      const segWidth = width * (1 - i * 0.05);
      
      ctx.fillStyle = hexToCss(visual.trunkColor);
      ctx.fillRect(cx - segWidth / 2, y - segHeight, segWidth, segHeight);
      
      // Узел
      ctx.fillStyle = hexToCss(visual.trunkHighlight);
      ctx.fillRect(cx - segWidth / 2 - 2, y - 3, segWidth + 4, 6);
    }
  } else {
    // Обычный ствол (сужается к верху)
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, bottom);
    ctx.lineTo(cx - width * 0.3, top);
    ctx.lineTo(cx + width * 0.3, top);
    ctx.lineTo(cx + width / 2, bottom);
    ctx.closePath();
    ctx.fill();
    
    // Блик на стволе
    ctx.fillStyle = hexToRgba(visual.trunkHighlight, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.1, bottom);
    ctx.lineTo(cx - width * 0.15, top);
    ctx.lineTo(cx + width * 0.1, top);
    ctx.lineTo(cx + width * 0.05, bottom);
    ctx.closePath();
    ctx.fill();
    
    // Кора - текстура
    ctx.strokeStyle = hexToRgba(visual.trunkColor, 0.3);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = bottom - rand(0.1, 0.9, seed + i) * height;
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.3, y);
      ctx.lineTo(cx + width * 0.2, y - 5);
      ctx.stroke();
    }
  }
}

type TreeType = TreePreset['type'];

/**
 * Сосновая крона (коническая)
 */
function drawPineCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  trunkH: number,
  visual: TreePreset['visual'],
  seed: number
): void {
  const layers = 4;
  
  for (let i = 0; i < layers; i++) {
    const layerY = cy + radius * 0.3 + i * (radius * 0.4);
    const layerWidth = radius * (1.5 - i * 0.25);
    const layerHeight = radius * 0.6;
    
    // Слой иголок
    ctx.fillStyle = hexToCss(visual.canopyColor);
    ctx.beginPath();
    ctx.moveTo(cx, layerY - layerHeight);
    ctx.lineTo(cx - layerWidth, layerY);
    ctx.lineTo(cx + layerWidth, layerY);
    ctx.closePath();
    ctx.fill();
    
    // Блики
    ctx.fillStyle = hexToRgba(visual.canopyHighlight, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx, layerY - layerHeight * 0.8);
    ctx.lineTo(cx - layerWidth * 0.3, layerY - layerHeight * 0.2);
    ctx.lineTo(cx + layerWidth * 0.2, layerY - layerHeight * 0.3);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Бамбуковая крона (листья)
 */
function drawBambooCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  visual: TreePreset['visual'],
  seed: number
): void {
  const leaves = 8;
  
  for (let i = 0; i < leaves; i++) {
    const angle = (i / leaves) * Math.PI * 2 + rand(-0.2, 0.2, seed + i);
    const length = radius * rand(0.8, 1.2, seed + i + 10);
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    // Лист
    ctx.fillStyle = hexToCss(visual.canopyColor);
    ctx.beginPath();
    ctx.ellipse(length * 0.6, 0, length * 0.6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Блик
    ctx.fillStyle = hexToRgba(visual.canopyHighlight, 0.4);
    ctx.beginPath();
    ctx.ellipse(length * 0.5, -1, length * 0.3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * Плакучая ива
 */
function drawWillowCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  visual: TreePreset['visual'],
  seed: number
): void {
  // Основная крона
  ctx.fillStyle = hexToCss(visual.canopyColor);
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Свисающие ветви
  const branches = 12;
  for (let i = 0; i < branches; i++) {
    const angle = (i / branches) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius * 0.8;
    const y = cy + Math.sin(angle) * radius * 0.5;
    const length = radius * rand(0.8, 1.5, seed + i);
    
    ctx.strokeStyle = hexToCss(visual.canopyColor);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + rand(-10, 10, seed + i + 10),
      y + length * 0.5,
      x + rand(-15, 15, seed + i + 20),
      y + length
    );
    ctx.stroke();
  }
}

/**
 * Округлая крона (дуб, обычное дерево)
 */
function drawRoundCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  visual: TreePreset['visual'],
  seed: number
): void {
  // Несколько наложенных кругов для объёма
  const blobs = 5;
  
  for (let i = 0; i < blobs; i++) {
    const angle = (i / blobs) * Math.PI * 2;
    const dist = radius * 0.4;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist * 0.6;
    const r = radius * rand(0.6, 0.9, seed + i);
    
    ctx.fillStyle = hexToCss(visual.canopyColor);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Центральный блик
  ctx.fillStyle = hexToRgba(visual.canopyHighlight, 0.4);
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.2, cy - radius * 0.2, radius * 0.4, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Духовное свечение
 */
function drawSpiritGlow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  color: number
): void {
  // Внешнее свечение
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, hexToRgba(color, 0.3));
  gradient.addColorStop(0.5, hexToRgba(color, 0.15));
  gradient.addColorStop(1, hexToRgba(color, 0));
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Частицы Ци
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = radius * 0.6;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    
    ctx.fillStyle = hexToRgba(color, 0.6);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==================== РУДЫ ====================

/**
 * Создать текстуру рудного камня
 */
export function createOreTexture(
  scene: Phaser.Scene,
  preset: OrePreset,
  seed: number = Math.random() * 10000
): void {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return;
  
  const width = preset.width * METERS_TO_PIXELS;
  const height = preset.height * METERS_TO_PIXELS;
  
  const canvas = document.createElement('canvas');
  canvas.width = width + 20;
  canvas.height = height + 20;
  const ctx = canvas.getContext('2d')!;
  
  // Очищаем canvas для прозрачного фона
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  const { visual } = preset;
  
  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  drawRockShape(ctx, cx + 3, cy + 3, width, height, 'irregular', seed);
  ctx.fill();
  
  // Камень-основа
  ctx.fillStyle = hexToCss(visual.baseColor);
  drawRockShape(ctx, cx, cy, width, height, 'angular', seed);
  ctx.fill();
  
  // Рудные прожилки
  drawOreVeins(ctx, cx, cy, width, height, visual.veinColor, seed);
  
  // Блики на камне
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.15, cy - height * 0.2, width * 0.15, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Свечение (для особых руд)
  if (visual.glowColor && visual.glowIntensity) {
    drawOreGlow(ctx, cx, cy, width, height, visual.glowColor, visual.glowIntensity);
  }
  
  // Контур
  ctx.strokeStyle = hexToRgba(visual.baseColor, 0.5);
  ctx.lineWidth = 2;
  drawRockShape(ctx, cx, cy, width, height, 'angular', seed);
  ctx.stroke();
  
  scene.textures.addCanvas(key, canvas);
}

/**
 * Нарисовать рудные прожилки
 */
function drawOreVeins(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  veinColor: number,
  seed: number
): void {
  const veins = 5 + Math.floor(rand(0, 4, seed));
  
  for (let i = 0; i < veins; i++) {
    const startX = cx + rand(-0.4, 0.4, seed + i) * width;
    const startY = cy + rand(-0.4, 0.4, seed + i + 10) * height;
    const length = rand(10, 25, seed + i + 20);
    const angle = rand(0, Math.PI * 2, seed + i + 30);
    
    ctx.strokeStyle = hexToCss(veinColor);
    ctx.lineWidth = rand(2, 5, seed + i + 40);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Извилистая линия
    let x = startX;
    let y = startY;
    for (let j = 0; j < 3; j++) {
      x += Math.cos(angle + rand(-0.5, 0.5, seed + i + j * 10)) * length / 3;
      y += Math.sin(angle + rand(-0.5, 0.5, seed + i + j * 10 + 5)) * length / 3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Блик на прожилке
    ctx.strokeStyle = hexToRgba(veinColor, 0.5);
    ctx.lineWidth = rand(1, 2, seed + i + 50);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length * 0.5, startY + Math.sin(angle) * length * 0.5);
    ctx.stroke();
  }
}

/**
 * Свечение руды
 */
function drawOreGlow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  glowColor: number,
  intensity: number
): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8);
  gradient.addColorStop(0, hexToRgba(glowColor, intensity * 0.5));
  gradient.addColorStop(0.5, hexToRgba(glowColor, intensity * 0.2));
  gradient.addColorStop(1, hexToRgba(glowColor, 0));
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(width, height) * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

// ==================== СТРОЕНИЯ ====================

/**
 * Создать текстуру деревянного строения
 */
export function createBuildingTexture(
  scene: Phaser.Scene,
  preset: BuildingPartPreset,
  seed: number = Math.random() * 10000
): void {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return;
  
  const width = preset.width * METERS_TO_PIXELS;
  const height = preset.height * METERS_TO_PIXELS;
  const depth = preset.depth * METERS_TO_PIXELS;
  
  const canvas = document.createElement('canvas');
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext('2d')!;
  
  // Очищаем canvas для прозрачного фона
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  const { visual, type, properties } = preset;
  
  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - width / 2 + 4, cy - height / 2 + 4, width, height);
  
  // Основа
  ctx.fillStyle = hexToCss(visual.primaryColor);
  ctx.fillRect(cx - width / 2, cy - height / 2, width, height);
  
  // Паттерн
  if (visual.pattern === 'planks') {
    drawPlanksPattern(ctx, cx, cy, width, height, visual, seed);
  } else if (visual.pattern === 'logs') {
    drawLogsPattern(ctx, cx, cy, width, height, visual, seed);
  } else if (visual.pattern === 'thatch') {
    drawThatchPattern(ctx, cx, cy, width, height, visual, seed);
  }
  
  // Особые элементы
  if (type === 'door_wooden') {
    drawDoorDetails(ctx, cx, cy, width, height, visual);
  } else if (type === 'window_wooden') {
    drawWindowDetails(ctx, cx, cy, width, height, visual);
  } else if (type === 'gate_wooden') {
    drawGateDetails(ctx, cx, cy, width, height, visual);
  }
  
  // Рамка
  ctx.strokeStyle = hexToCss(visual.borderColor);
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - width / 2, cy - height / 2, width, height);
  
  scene.textures.addCanvas(key, canvas);
}

/**
 * Паттерн досок
 */
function drawPlanksPattern(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual'],
  seed: number
): void {
  const plankCount = Math.floor(height / 12);
  const plankHeight = height / plankCount;
  
  for (let i = 0; i < plankCount; i++) {
    const y = cy - height / 2 + i * plankHeight;
    
    // Доска
    ctx.fillStyle = i % 2 === 0 
      ? hexToCss(visual.primaryColor) 
      : hexToCss(visual.secondaryColor);
    ctx.fillRect(cx - width / 2, y, width, plankHeight - 1);
    
    // Текстура дерева
    ctx.strokeStyle = hexToRgba(visual.primaryColor, 0.3);
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, y + rand(2, plankHeight - 2, seed + i + j));
      ctx.lineTo(cx + width / 2, y + rand(2, plankHeight - 2, seed + i + j + 10));
      ctx.stroke();
    }
  }
}

/**
 * Паттерн бревен
 */
function drawLogsPattern(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual'],
  seed: number
): void {
  const logCount = Math.floor(height / 20);
  const logHeight = height / logCount;
  
  for (let i = 0; i < logCount; i++) {
    const y = cy - height / 2 + i * logHeight;
    
    // Бревно
    ctx.fillStyle = hexToCss(visual.primaryColor);
    ctx.fillRect(cx - width / 2, y, width, logHeight - 2);
    
    // Торцы бревна
    ctx.fillStyle = hexToCss(visual.secondaryColor);
    ctx.beginPath();
    ctx.arc(cx - width / 2 + 5, y + logHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + width / 2 - 5, y + logHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Кольца на торцах
    ctx.strokeStyle = hexToRgba(visual.borderColor, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - width / 2 + 5, y + logHeight / 2, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + width / 2 - 5, y + logHeight / 2, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Паттерн соломы
 */
function drawThatchPattern(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual'],
  seed: number
): void {
  // Основа
  ctx.fillStyle = hexToCss(visual.primaryColor);
  ctx.fillRect(cx - width / 2, cy - height / 2, width, height);
  
  // Соломинки
  const strawCount = 40;
  for (let i = 0; i < strawCount; i++) {
    const x = cx - width / 2 + rand(0, width, seed + i);
    const y = cy - height / 2 + rand(0, height, seed + i + 10);
    const length = rand(8, 20, seed + i + 20);
    const angle = rand(-0.3, 0.3, seed + i + 30);
    
    ctx.strokeStyle = hexToRgba(
      i % 2 === 0 ? visual.primaryColor : visual.secondaryColor,
      0.7
    );
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
}

/**
 * Детали двери
 */
function drawDoorDetails(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual']
): void {
  // Ручка
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(cx + width * 0.3, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Рама двери (внутренняя)
  ctx.strokeStyle = hexToCss(visual.borderColor);
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - width / 2 + 5, cy - height / 2 + 5, width - 10, height - 10);
  
  // Перекладины
  ctx.strokeStyle = hexToCss(visual.borderColor);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2 + 5, cy - height * 0.2);
  ctx.lineTo(cx + width / 2 - 5, cy - height * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - width / 2 + 5, cy + height * 0.2);
  ctx.lineTo(cx + width / 2 - 5, cy + height * 0.2);
  ctx.stroke();
}

/**
 * Детали окна
 */
function drawWindowDetails(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual']
): void {
  // Стекло (затемнённое)
  ctx.fillStyle = 'rgba(100, 150, 200, 0.3)';
  ctx.fillRect(cx - width / 2 + 5, cy - height / 2 + 5, width - 10, height - 10);
  
  // Рама
  ctx.strokeStyle = hexToCss(visual.borderColor);
  ctx.lineWidth = 2;
  
  // Вертикальная перекладина
  ctx.beginPath();
  ctx.moveTo(cx, cy - height / 2 + 5);
  ctx.lineTo(cx, cy + height / 2 - 5);
  ctx.stroke();
  
  // Горизонтальная перекладина
  ctx.beginPath();
  ctx.moveTo(cx - width / 2 + 5, cy);
  ctx.lineTo(cx + width / 2 - 5, cy);
  ctx.stroke();
  
  // Ставни по бокам
  ctx.fillStyle = hexToCss(visual.secondaryColor);
  ctx.fillRect(cx - width / 2 - 10, cy - height / 2, 8, height);
  ctx.fillRect(cx + width / 2 + 2, cy - height / 2, 8, height);
}

/**
 * Детали ворот
 */
function drawGateDetails(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  visual: BuildingPartPreset['visual']
): void {
  // Две створки
  ctx.strokeStyle = hexToCss(visual.borderColor);
  ctx.lineWidth = 3;
  
  // Вертикальная линия посередине
  ctx.beginPath();
  ctx.moveTo(cx, cy - height / 2);
  ctx.lineTo(cx, cy + height / 2);
  ctx.stroke();
  
  // X-образные перекладины на каждой створке
  ctx.lineWidth = 2;
  
  // Левая створка
  ctx.beginPath();
  ctx.moveTo(cx - width / 2 + 5, cy - height / 2 + 5);
  ctx.lineTo(cx - 5, cy + height / 2 - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - width / 2 + 5, cy + height / 2 - 5);
  ctx.lineTo(cx - 5, cy - height / 2 + 5);
  ctx.stroke();
  
  // Правая створка
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy - height / 2 + 5);
  ctx.lineTo(cx + width / 2 - 5, cy + height / 2 - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy + height / 2 - 5);
  ctx.lineTo(cx + width / 2 - 5, cy - height / 2 + 5);
  ctx.stroke();
  
  // Засов
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(cx - 8, cy - 3, 16, 6);
}

// ==================== ЭКСПОРТ КЛАССА ====================

/**
 * Менеджер текстур окружения
 */
export class EnvironmentTextureGenerator {
  private scene: Phaser.Scene;
  private generatedTextures: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Генерировать все текстуры для пресетов
   */
  generateAll(
    obstacles: ObstaclePreset[],
    trees: TreePreset[],
    ores: OrePreset[],
    buildings: BuildingPartPreset[]
  ): void {
    obstacles.forEach(preset => {
      const seed = Math.random() * 10000;
      createRockTexture(this.scene, preset, seed);
      this.generatedTextures.add(`env_${preset.id}_${seed}`);
    });
    
    trees.forEach(preset => {
      const seed = Math.random() * 10000;
      createTreeTexture(this.scene, preset, seed);
      this.generatedTextures.add(`env_${preset.id}_${seed}`);
    });
    
    ores.forEach(preset => {
      const seed = Math.random() * 10000;
      createOreTexture(this.scene, preset, seed);
      this.generatedTextures.add(`env_${preset.id}_${seed}`);
    });
    
    buildings.forEach(preset => {
      const seed = Math.random() * 10000;
      createBuildingTexture(this.scene, preset, seed);
      this.generatedTextures.add(`env_${preset.id}_${seed}`);
    });
  }
  
  /**
   * Получить ключ текстуры для пресета
   */
  getTextureKey(presetId: string, seed: number): string {
    return `env_${presetId}_${seed}`;
  }
  
  /**
   * Проверить, загружена ли текстура
   */
  isTextureLoaded(key: string): boolean {
    return this.scene.textures.exists(key);
  }
  
  /**
   * Очистить сгенерированные текстуры
   */
  cleanup(): void {
    this.generatedTextures.forEach(key => {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    });
    this.generatedTextures.clear();
  }
}
