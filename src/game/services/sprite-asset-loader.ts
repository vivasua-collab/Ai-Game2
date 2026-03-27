/**
 * ============================================================================
 * SPRITE ASSET LOADER - Загрузчик AI-сгенерированных спрайтов
 * ============================================================================
 * 
 * Загружает качественные спрайты окружения, сгенерированные через AI:
 * - Деревья (дуб, сосна, бамбук, сакура, ива, мёртвое дерево)
 * - Камни (маленький, средний, большой)
 * - Рудные камни (железо, медь, золото, духовный камень, нефрит)
 */

import type { 
  ObstaclePreset, 
  TreePreset, 
  OrePreset, 
  BuildingPartPreset 
} from '@/types/environment';

// Константы
const METERS_TO_PIXELS = 32;
const SPRITE_BASE_PATH = '/sprites/environment';

// ==================== МАППИНГ СПРАЙТОВ ====================

/**
 * Маппинг типов деревьев к файлам спрайтов
 */
const TREE_SPRITE_MAP: Record<string, string> = {
  'oak': 'tree_oak',
  'pine': 'tree_pine',
  'bamboo': 'tree_bamboo',
  'cherry_blossom': 'tree_cherry',
  'willow': 'tree_willow',
  'dead_tree': 'tree_dead',
  'spirit_tree': 'tree_cherry', // Используем сакуру как основу
  // Алиасы
  'maple': 'tree_oak',
  'birch': 'tree_oak',
  'cedar': 'tree_pine',
  'ancient': 'tree_oak',
};

/**
 * Маппинг типов камней к файлам спрайтов
 */
const ROCK_SPRITE_MAP: Record<string, string> = {
  'small': 'rock_small',
  'medium': 'rock_medium',
  'large': 'rock_large',
  'boulder': 'rock_large',
  'mountain_rock': 'rock_mountain',
  // Алиасы по размеру
  'tiny': 'rock_small',
  'huge': 'rock_large',
};

/**
 * Маппинг типов руд к файлам спрайтов
 */
const ORE_SPRITE_MAP: Record<string, string> = {
  'iron': 'ore_iron',
  'copper': 'ore_copper',
  'gold': 'ore_gold',
  'spirit_stone': 'ore_spirit',
  'jade': 'ore_jade',
  // Алиасы
  'silver': 'ore_gold',
  'crystal': 'ore_spirit',
  'qi_stone': 'ore_spirit',
};

// ==================== ЗАГРУЗКА СПРАЙТОВ ====================

/**
 * Состояние загрузки спрайтов
 */
const loadedSprites: Set<string> = new Set();
const loadingPromises: Map<string, Promise<void>> = new Map();

/**
 * Загрузить спрайт в Phaser через fetch и canvas
 * 
 * ВАЖНО: Phaser scene.load.image() работает ТОЛЬКО в preload() методе сцены!
 * Для загрузки вне preload() используем fetch + canvas подход.
 */
async function loadSprite(
  scene: Phaser.Scene,
  spriteName: string
): Promise<void> {
  const key = `sprite_${spriteName}`;
  
  // Уже загружен
  if (loadedSprites.has(key) || scene.textures.exists(key)) {
    loadedSprites.add(key);
    return;
  }
  
  // Уже загружается
  if (loadingPromises.has(key)) {
    return loadingPromises.get(key);
  }
  
  const promise = new Promise<void>((resolve) => {
    const path = `${SPRITE_BASE_PATH}/${spriteName}.png`;
    
    // Загружаем изображение через fetch
    fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        return createImageBitmap(blob);
      })
      .then(imageBitmap => {
        // Создаём canvas и рисуем изображение
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imageBitmap, 0, 0);
        
        // Добавляем текстуру в Phaser
        scene.textures.addCanvas(key, canvas);
        loadedSprites.add(key);
        loadingPromises.delete(key);
        
        console.log(`[SpriteLoader] Loaded: ${spriteName} (${canvas.width}x${canvas.height})`);
        resolve();
      })
      .catch(error => {
        loadingPromises.delete(key);
        console.warn(`[SpriteLoader] Failed to load sprite: ${spriteName}`, error.message);
        resolve(); // Не блокируем при ошибке
      });
  });
  
  loadingPromises.set(key, promise);
  return promise;
}

/**
 * Предзагрузить все спрайты окружения
 */
export async function preloadEnvironmentSprites(scene: Phaser.Scene): Promise<void> {
  const allSprites = [
    ...Object.values(TREE_SPRITE_MAP),
    ...Object.values(ROCK_SPRITE_MAP),
    ...Object.values(ORE_SPRITE_MAP),
  ];
  
  const uniqueSprites = [...new Set(allSprites)];
  
  console.log(`[SpriteLoader] Preloading ${uniqueSprites.length} sprites...`);
  
  // Загружаем по 3 за раз
  const batchSize = 3;
  for (let i = 0; i < uniqueSprites.length; i += batchSize) {
    const batch = uniqueSprites.slice(i, i + batchSize);
    await Promise.all(batch.map(sprite => loadSprite(scene, sprite)));
  }
  
  console.log(`[SpriteLoader] Preloaded ${loadedSprites.size} sprites`);
}

// ==================== СОЗДАНИЕ ТЕКСТУР ====================

/**
 * Создать текстуру дерева из AI спрайта
 */
export function createTreeTexture(
  scene: Phaser.Scene,
  preset: TreePreset,
  seed: number = Math.random() * 10000
): string {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return key;
  
  // Получаем имя файла спрайта
  const spriteName = TREE_SPRITE_MAP[preset.type] || TREE_SPRITE_MAP['oak'];
  const spriteKey = `sprite_${spriteName}`;
  
  // Если спрайт загружен, создаём текстуру
  if (scene.textures.exists(spriteKey)) {
    const texture = scene.textures.get(spriteKey);
    
    // Масштабируем под размер пресета
    const targetWidth = preset.canopyRadius * 2 * METERS_TO_PIXELS;
    const sourceWidth = texture.source[0].width;
    
    // Создаём canvas с правильным размером
    const canvas = document.createElement('canvas');
    const width = Math.max(64, Math.round(targetWidth));
    const height = Math.max(64, Math.round(targetWidth * 1.5)); // Деревья выше чем шире
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    
    // Рисуем спрайт с масштабированием
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Центрируем спрайт
    const drawWidth = width;
    const drawHeight = height;
    const drawX = 0;
    const drawY = 0;
    
    // Получаем источник изображения (HTMLImageElement или HTMLCanvasElement)
    const sourceImage = texture.source[0].image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
    
    if (sourceImage) {
      ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
    }
    
    // Добавляем вариативность через оттенок (если духовное дерево)
    if (preset.isSpiritual) {
      // Добавляем свечение
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
      );
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    scene.textures.addCanvas(key, canvas);
    console.log(`[SpriteLoader] Created tree texture: ${key} from ${spriteKey}`);
  } else {
    // Fallback - создаём плейсхолдер
    console.warn(`[SpriteLoader] Sprite not loaded: ${spriteKey}, using placeholder`);
    createPlaceholderTexture(scene, key, preset.canopyRadius * 2 * METERS_TO_PIXELS, 'tree');
  }
  
  return key;
}

/**
 * Создать текстуру камня из AI спрайта
 */
export function createRockTexture(
  scene: Phaser.Scene,
  preset: ObstaclePreset,
  seed: number = Math.random() * 10000
): string {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return key;
  
  // Определяем размер камня
  const avgSize = (preset.width + preset.height) / 2;
  let sizeCategory = 'medium';
  if (avgSize < 1.5) sizeCategory = 'small';
  else if (avgSize > 3) sizeCategory = 'large';
  
  const spriteName = ROCK_SPRITE_MAP[sizeCategory] || ROCK_SPRITE_MAP['medium'];
  const spriteKey = `sprite_${spriteName}`;
  
  if (scene.textures.exists(spriteKey)) {
    const texture = scene.textures.get(spriteKey);
    
    const targetSize = Math.max(preset.width, preset.height) * METERS_TO_PIXELS;
    
    const canvas = document.createElement('canvas');
    const size = Math.max(32, Math.round(targetSize));
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const sourceImage = texture.source[0].image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
    
    if (sourceImage) {
      ctx.drawImage(sourceImage, 0, 0, size, size);
    }
    
    scene.textures.addCanvas(key, canvas);
    console.log(`[SpriteLoader] Created rock texture: ${key} from ${spriteKey}`);
  } else {
    console.warn(`[SpriteLoader] Sprite not loaded: ${spriteKey}, using placeholder`);
    createPlaceholderTexture(scene, key, preset.width * METERS_TO_PIXELS, 'rock');
  }
  
  return key;
}

/**
 * Создать текстуру рудного камня из AI спрайта
 */
export function createOreTexture(
  scene: Phaser.Scene,
  preset: OrePreset,
  seed: number = Math.random() * 10000
): string {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return key;
  
  // Определяем тип руды по названию или ID
  let oreType = 'iron';
  const idLower = preset.id.toLowerCase();
  const nameLower = preset.name.toLowerCase();
  
  if (idLower.includes('gold') || nameLower.includes('золот')) oreType = 'gold';
  else if (idLower.includes('copper') || nameLower.includes('мед')) oreType = 'copper';
  else if (idLower.includes('spirit') || idLower.includes('qi') || nameLower.includes('дух')) oreType = 'spirit_stone';
  else if (idLower.includes('jade') || nameLower.includes('нефрит')) oreType = 'jade';
  
  const spriteName = ORE_SPRITE_MAP[oreType] || ORE_SPRITE_MAP['iron'];
  const spriteKey = `sprite_${spriteName}`;
  
  if (scene.textures.exists(spriteKey)) {
    const texture = scene.textures.get(spriteKey);
    
    const targetSize = Math.max(preset.width, preset.height) * METERS_TO_PIXELS;
    
    const canvas = document.createElement('canvas');
    const size = Math.max(32, Math.round(targetSize));
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const sourceImage = texture.source[0].image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
    
    if (sourceImage) {
      ctx.drawImage(sourceImage, 0, 0, size, size);
    }
    
    // Добавляем свечение для духовных камней
    if (oreType === 'spirit_stone') {
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
      );
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    scene.textures.addCanvas(key, canvas);
    console.log(`[SpriteLoader] Created ore texture: ${key} from ${spriteKey}`);
  } else {
    console.warn(`[SpriteLoader] Sprite not loaded: ${spriteKey}, using placeholder`);
    createPlaceholderTexture(scene, key, preset.width * METERS_TO_PIXELS, 'ore');
  }
  
  return key;
}

/**
 * Создать текстуру строения
 */
export function createBuildingTexture(
  scene: Phaser.Scene,
  preset: BuildingPartPreset,
  seed: number = Math.random() * 10000
): string {
  const key = `env_${preset.id}_${seed}`;
  
  if (scene.textures.exists(key)) return key;
  
  // Для строений пока используем плейсхолдер (можно добавить спрайты позже)
  console.log(`[SpriteLoader] Creating building placeholder: ${key}`);
  createPlaceholderTexture(scene, key, preset.width * METERS_TO_PIXELS, 'building');
  
  return key;
}

/**
 * Создать плейсхолдер текстуру
 */
function createPlaceholderTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  type: 'tree' | 'rock' | 'ore' | 'building'
): void {
  const canvas = document.createElement('canvas');
  const s = Math.max(32, Math.round(size));
  canvas.width = s;
  canvas.height = s;
  
  const ctx = canvas.getContext('2d')!;
  
  // Цвета по типу
  const colors: Record<string, string> = {
    tree: '#2d5a27',
    rock: '#666666',
    ore: '#8b7355',
    building: '#8b4513',
  };
  
  const color = colors[type] || '#888888';
  
  // Заливка
  ctx.fillStyle = color;
  ctx.beginPath();
  
  if (type === 'tree') {
    // Круглая крона
    ctx.arc(s / 2, s / 2, s / 3, 0, Math.PI * 2);
  } else if (type === 'rock' || type === 'ore') {
    // Неровный камень
    ctx.moveTo(s * 0.2, s * 0.8);
    ctx.lineTo(s * 0.3, s * 0.2);
    ctx.lineTo(s * 0.7, s * 0.1);
    ctx.lineTo(s * 0.85, s * 0.5);
    ctx.lineTo(s * 0.8, s * 0.9);
    ctx.closePath();
  } else {
    // Квадрат
    ctx.rect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
  }
  
  ctx.fill();
  
  // Контур
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Для руды добавляем прожилки
  if (type === 'ore') {
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.7);
    ctx.lineTo(s * 0.5, s * 0.3);
    ctx.lineTo(s * 0.7, s * 0.5);
    ctx.stroke();
  }
  
  scene.textures.addCanvas(key, canvas);
}

// ==================== ЭКСПОРТ КЛАССА ====================

/**
 * Менеджер текстур окружения
 */
export class EnvironmentTextureGenerator {
  private scene: Phaser.Scene;
  private generatedTextures: Set<string> = new Set();
  private preloaded: boolean = false;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Предзагрузить все спрайты
   */
  async preload(): Promise<void> {
    if (this.preloaded) return;
    
    await preloadEnvironmentSprites(this.scene);
    this.preloaded = true;
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
      const key = createRockTexture(this.scene, preset, seed);
      this.generatedTextures.add(key);
    });
    
    trees.forEach(preset => {
      const seed = Math.random() * 10000;
      const key = createTreeTexture(this.scene, preset, seed);
      this.generatedTextures.add(key);
    });
    
    ores.forEach(preset => {
      const seed = Math.random() * 10000;
      const key = createOreTexture(this.scene, preset, seed);
      this.generatedTextures.add(key);
    });
    
    buildings.forEach(preset => {
      const seed = Math.random() * 10000;
      const key = createBuildingTexture(this.scene, preset, seed);
      this.generatedTextures.add(key);
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
