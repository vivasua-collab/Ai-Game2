/**
 * ============================================================================
 * ENVIRONMENT MANAGER - Менеджер окружения для Phaser
 * ============================================================================
 * 
 * Управляет объектами окружения в сцене:
 * - Генерация текстур
 * - Создание спрайтов
 * - Физика столкновений
 * - Взаимодействие через Event Bus
 * 
 * Важно: используется только в контексте Phaser Scene (browser only)
 */

import type { 
  ObstaclePreset, 
  TreePreset, 
  OrePreset, 
  BuildingPartPreset,
  EnvironmentObjectState 
} from '@/types/environment';
import { generateEnvironmentId } from '@/types/environment';
import { 
  EnvironmentTextureGenerator,
  preloadEnvironmentSprites,
  createRockTexture,
  createTreeTexture,
  createOreTexture,
  createBuildingTexture 
} from './sprite-asset-loader';
import { eventBusClient } from '@/lib/game/event-bus/client';

// ==================== КОНСТАНТЫ ====================

const METERS_TO_PIXELS = 32;

// ==================== ИНТЕРФЕЙСЫ ====================

/**
 * Объект окружения в сцене
 */
interface EnvironmentObject {
  id: string;
  presetId: string;
  presetType: 'obstacle' | 'tree' | 'ore' | 'building';
  
  // Phaser объекты
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  hitbox?: Phaser.GameObjects.Graphics;
  healthBar?: Phaser.GameObjects.Graphics;
  
  // Состояние
  health: number;
  maxHealth: number;
  resourceAmount?: number;
  isOpen?: boolean;
  
  // Данные пресета
  preset: ObstaclePreset | TreePreset | OrePreset | BuildingPartPreset;
  isBlocking: boolean;
  
  // Seed для текстуры
  textureSeed: number;
}

/**
 * Конфигурация генерации для тестового полигона
 */
export interface TestPolygonConfig {
  // Размер области в метрах
  width: number;
  height: number;
  
  // Смещение от начала координат (в метрах) - для генерации вокруг центра мира
  offsetX?: number;
  offsetY?: number;
  
  // Количество объектов
  rocks: number;
  trees: number;
  ores: number;
  buildings: number;
  
  // Seed для детерминированной генерации
  seed?: number;
}

/**
 * Результат генерации
 */
export interface GenerationResult {
  rocks: EnvironmentObject[];
  trees: EnvironmentObject[];
  ores: EnvironmentObject[];
  buildings: EnvironmentObject[];
  totalObjects: number;
}

// ==================== КЛАСС МЕНЕДЖЕРА ====================

/**
 * Менеджер окружения для Phaser сцены
 */
export class EnvironmentManager {
  private scene: Phaser.Scene;
  private textureGenerator: EnvironmentTextureGenerator;
  
  // Объекты в сцене
  private objects: Map<string, EnvironmentObject> = new Map();
  
  // Группы для коллизий
  private obstacleGroup?: Phaser.GameObjects.Group;
  
  // Пресеты
  private obstaclePresets: ObstaclePreset[] = [];
  private treePresets: TreePreset[] = [];
  private orePresets: OrePreset[] = [];
  private buildingPresets: BuildingPartPreset[] = [];
  
  // Флаги
  private isInitialized = false;
  private showDebugHitboxes = false;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.textureGenerator = new EnvironmentTextureGenerator(scene);
  }
  
  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  
  /**
   * Инициализировать менеджер с пресетами
   */
  async initialize(
    obstacles: ObstaclePreset[],
    trees: TreePreset[],
    ores: OrePreset[],
    buildings: BuildingPartPreset[]
  ): Promise<void> {
    this.obstaclePresets = obstacles;
    this.treePresets = trees;
    this.orePresets = ores;
    this.buildingPresets = buildings;
    
    // Создаём группу для препятствий
    this.obstacleGroup = this.scene.add.group();
    
    // Предзагружаем AI-сгенерированные спрайты
    await this.textureGenerator.preload();
    
    // Генерируем текстуры для всех пресетов
    this.textureGenerator.generateAll(obstacles, trees, ores, buildings);
    
    this.isInitialized = true;
    console.log('[EnvironmentManager] Initialized with', {
      obstacles: obstacles.length,
      trees: trees.length,
      ores: ores.length,
      buildings: buildings.length,
    });
  }
  
  // ==================== ГЕНЕРАЦИЯ ОБЪЕКТОВ ====================
  
  /**
   * Сгенерировать окружение для тестового полигона
   */
  generateTestPolygon(config: TestPolygonConfig): GenerationResult {
    if (!this.isInitialized) {
      console.error('[EnvironmentManager] Not initialized!');
      return { rocks: [], trees: [], ores: [], buildings: [], totalObjects: 0 };
    }
    
    const seed = config.seed || Date.now();
    const rng = this.createSeededRandom(seed);
    
    const rocks: EnvironmentObject[] = [];
    const trees: EnvironmentObject[] = [];
    const ores: EnvironmentObject[] = [];
    const buildings: EnvironmentObject[] = [];
    
    // Смещение от начала координат (если указано)
    const offsetX = config.offsetX || 0;
    const offsetY = config.offsetY || 0;
    
    // Центр области генерации - свободная зона для игрока
    const centerX = config.width / 2 + offsetX;
    const centerY = config.height / 2 + offsetY;
    const safeRadius = 15; // 15 метров от центра
    
    // Генерируем камни
    for (let i = 0; i < config.rocks; i++) {
      const preset = this.obstaclePresets[Math.floor(rng() * this.obstaclePresets.length)];
      const pos = this.getRandomPosition(config.width, config.height, centerX, centerY, safeRadius, rng, offsetX, offsetY);
      
      const obj = this.createObstacle(preset, pos.x, pos.y, rng());
      if (obj) rocks.push(obj);
    }
    
    // Генерируем деревья
    for (let i = 0; i < config.trees; i++) {
      const preset = this.treePresets[Math.floor(rng() * this.treePresets.length)];
      const pos = this.getRandomPosition(config.width, config.height, centerX, centerY, safeRadius, rng, offsetX, offsetY);
      
      const obj = this.createTree(preset, pos.x, pos.y, rng());
      if (obj) trees.push(obj);
    }
    
    // Генерируем руды (меньше, реже)
    for (let i = 0; i < config.ores; i++) {
      const preset = this.orePresets[Math.floor(rng() * this.orePresets.length)];
      const pos = this.getRandomPosition(config.width, config.height, centerX, centerY, safeRadius, rng, offsetX, offsetY);
      
      const obj = this.createOre(preset, pos.x, pos.y, rng());
      if (obj) ores.push(obj);
    }
    
    // Генерируем строения
    for (let i = 0; i < config.buildings; i++) {
      const preset = this.buildingPresets[Math.floor(rng() * this.buildingPresets.length)];
      const pos = this.getRandomPosition(config.width, config.height, centerX, centerY, safeRadius + 10, rng, offsetX, offsetY);
      
      const obj = this.createBuilding(preset, pos.x, pos.y, rng());
      if (obj) buildings.push(obj);
    }
    
    const result: GenerationResult = {
      rocks,
      trees,
      ores,
      buildings,
      totalObjects: rocks.length + trees.length + ores.length + buildings.length,
    };
    
    console.log('[EnvironmentManager] Generated test polygon:', result);
    return result;
  }
  
  /**
   * Создать детерминированный генератор случайных чисел
   */
  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }
  
  /**
   * Получить случайную позицию с исключением безопасной зоны
   */
  private getRandomPosition(
    width: number,
    height: number,
    excludeX: number,
    excludeY: number,
    excludeRadius: number,
    rng: () => number,
    offsetX: number = 0,
    offsetY: number = 0
  ): { x: number; y: number } {
    let x: number;
    let y: number;
    let attempts = 0;
    
    do {
      x = rng() * width + offsetX;
      y = rng() * height + offsetY;
      attempts++;
    } while (
      Math.sqrt((x - excludeX) ** 2 + (y - excludeY) ** 2) < excludeRadius &&
      attempts < 100
    );
    
    return { x, y };
  }
  
  // ==================== СОЗДАНИЕ ОБЪЕКТОВ ====================
  
  /**
   * Создать препятствие (камень)
   */
  private createObstacle(
    preset: ObstaclePreset,
    xMeters: number,
    yMeters: number,
    seed: number
  ): EnvironmentObject | null {
    const id = generateEnvironmentId('obstacle', preset.id);
    const textureKey = `env_${preset.id}_${seed}`;
    
    // Конвертируем в пиксели
    const x = xMeters * METERS_TO_PIXELS;
    const y = yMeters * METERS_TO_PIXELS;
    
    // Создаём текстуру если нет
    if (!this.scene.textures.exists(textureKey)) {
      createRockTexture(this.scene, preset, seed);
    }
    
    // Создаём спрайт
    const sprite = this.scene.add.sprite(x, y, textureKey);
    sprite.setDepth(3);
    sprite.setData('environmentId', id);
    
    // Добавляем в группу препятствий
    if (this.obstacleGroup && preset.isBlocking) {
      this.obstacleGroup.add(sprite);
    }
    
    // Создаём объект
    const obj: EnvironmentObject = {
      id,
      presetId: preset.id,
      presetType: 'obstacle',
      sprite,
      health: preset.health,
      maxHealth: preset.health,
      preset,
      isBlocking: preset.isBlocking,
      textureSeed: seed,
    };
    
    // Делаем интерактивным
    this.setupInteraction(obj);
    
    // Добавляем в карту
    this.objects.set(id, obj);
    
    return obj;
  }
  
  /**
   * Создать дерево
   */
  private createTree(
    preset: TreePreset,
    xMeters: number,
    yMeters: number,
    seed: number
  ): EnvironmentObject | null {
    const id = generateEnvironmentId('tree', preset.id);
    const textureKey = `env_${preset.id}_${seed}`;
    
    // Конвертируем в пиксели
    const x = xMeters * METERS_TO_PIXELS;
    const y = yMeters * METERS_TO_PIXELS;
    
    // Создаём текстуру если нет
    if (!this.scene.textures.exists(textureKey)) {
      createTreeTexture(this.scene, preset, seed);
    }
    
    // Создаём спрайт
    const sprite = this.scene.add.sprite(x, y, textureKey);
    sprite.setDepth(4); // Выше камней
    sprite.setData('environmentId', id);
    
    // Создаём объект
    const obj: EnvironmentObject = {
      id,
      presetId: preset.id,
      presetType: 'tree',
      sprite,
      health: preset.health,
      maxHealth: preset.health,
      resourceAmount: preset.resource.yieldMin + Math.floor(Math.random() * (preset.resource.yieldMax - preset.resource.yieldMin)),
      preset,
      isBlocking: preset.isBlocking,
      textureSeed: seed,
    };
    
    // Делаем интерактивным
    this.setupInteraction(obj);
    
    // Добавляем в карту
    this.objects.set(id, obj);
    
    return obj;
  }
  
  /**
   * Создать рудный камень
   */
  private createOre(
    preset: OrePreset,
    xMeters: number,
    yMeters: number,
    seed: number
  ): EnvironmentObject | null {
    const id = generateEnvironmentId('ore', preset.id);
    const textureKey = `env_${preset.id}_${seed}`;
    
    // Конвертируем в пиксели
    const x = xMeters * METERS_TO_PIXELS;
    const y = yMeters * METERS_TO_PIXELS;
    
    // Создаём текстуру если нет
    if (!this.scene.textures.exists(textureKey)) {
      createOreTexture(this.scene, preset, seed);
    }
    
    // Создаём спрайт
    const sprite = this.scene.add.sprite(x, y, textureKey);
    sprite.setDepth(3);
    sprite.setData('environmentId', id);
    
    // Создаём объект
    const obj: EnvironmentObject = {
      id,
      presetId: preset.id,
      presetType: 'ore',
      sprite,
      health: preset.health,
      maxHealth: preset.health,
      resourceAmount: preset.resource.yieldMin + Math.floor(Math.random() * (preset.resource.yieldMax - preset.resource.yieldMin)),
      preset,
      isBlocking: preset.isBlocking,
      textureSeed: seed,
    };
    
    // Делаем интерактивным
    this.setupInteraction(obj);
    
    // Добавляем в карту
    this.objects.set(id, obj);
    
    return obj;
  }
  
  /**
   * Создать строение
   */
  private createBuilding(
    preset: BuildingPartPreset,
    xMeters: number,
    yMeters: number,
    seed: number
  ): EnvironmentObject | null {
    const id = generateEnvironmentId('building', preset.id);
    const textureKey = `env_${preset.id}_${seed}`;
    
    // Конвертируем в пиксели
    const x = xMeters * METERS_TO_PIXELS;
    const y = yMeters * METERS_TO_PIXELS;
    
    // Создаём текстуру если нет
    if (!this.scene.textures.exists(textureKey)) {
      createBuildingTexture(this.scene, preset, seed);
    }
    
    // Создаём спрайт
    const sprite = this.scene.add.sprite(x, y, textureKey);
    sprite.setDepth(2);
    sprite.setData('environmentId', id);
    
    // Добавляем в группу препятствий если непроходимое
    if (this.obstacleGroup && !preset.properties.isPassable) {
      this.obstacleGroup.add(sprite);
    }
    
    // Создаём объект
    const obj: EnvironmentObject = {
      id,
      presetId: preset.id,
      presetType: 'building',
      sprite,
      health: preset.health,
      maxHealth: preset.health,
      isOpen: preset.initialState === 'open',
      preset,
      isBlocking: !preset.properties.isPassable,
      textureSeed: seed,
    };
    
    // Делаем интерактивным
    this.setupInteraction(obj);
    
    // Добавляем в карту
    this.objects.set(id, obj);
    
    return obj;
  }
  
  // ==================== ВЗАИМОДЕЙСТВИЕ ====================
  
  /**
   * Настроить интерактивность объекта
   */
  private setupInteraction(obj: EnvironmentObject): void {
    const sprite = obj.sprite as Phaser.GameObjects.Sprite;
    
    sprite.setInteractive();
    
    // Hover эффект
    sprite.on('pointerover', () => {
      sprite.setTint(0xdddddd);
      this.showTooltip(obj);
    });
    
    sprite.on('pointerout', () => {
      sprite.clearTint();
      this.hideTooltip();
    });
    
    // Клик - взаимодействие
    sprite.on('pointerdown', () => {
      this.interactWithObject(obj);
    });
  }
  
  /**
   * Показать подсказку
   */
  private showTooltip(obj: EnvironmentObject): void {
    // Можно реализовать через React компонент
    // или через Phaser текст
  }
  
  /**
   * Скрыть подсказку
   */
  private hideTooltip(): void {
    // Скрываем подсказку
  }
  
  /**
   * Взаимодействовать с объектом через Event Bus
   */
  private async interactWithObject(obj: EnvironmentObject): Promise<void> {
    const objectType = obj.presetType === 'obstacle' ? 'rock' : obj.presetType;
    
    try {
      const result = await eventBusClient.interactWithEnvironment(
        obj.id,
        objectType as 'rock' | 'tree' | 'ore' | 'building',
        'examine'
      );
      
      if (result.success && result.data?.result) {
        // Показываем результат
        console.log('[Environment] Interaction result:', result.data);
        
        // Обновляем состояние если нужно
        if (result.data.result.damage) {
          this.applyDamage(obj, result.data.result.damage);
        }
        
        if (result.data.result.isOpen !== undefined) {
          obj.isOpen = result.data.result.isOpen;
        }
      }
    } catch (error) {
      console.error('[Environment] Interaction failed:', error);
    }
  }
  
  /**
   * Применить урон к объекту
   */
  applyDamage(obj: EnvironmentObject, damage: number): void {
    obj.health = Math.max(0, obj.health - damage);
    
    // Визуальный эффект
    if (obj.sprite) {
      const sprite = obj.sprite as Phaser.GameObjects.Sprite;
      sprite.setTint(0xff6666);
      
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          sprite.clearTint();
          sprite.setAlpha(1);
        },
      });
      
      // Показать число урона
      this.showDamageNumber(obj.sprite.x, obj.sprite.y - 20, damage);
    }
    
    // Удалить если уничтожен
    if (obj.health <= 0) {
      this.destroyObject(obj);
    }
  }
  
  /**
   * Показать число урона
   */
  private showDamageNumber(x: number, y: number, damage: number): void {
    const text = this.scene.add.text(x, y, damage.toString(), {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }
  
  /**
   * Уничтожить объект
   */
  private destroyObject(obj: EnvironmentObject): void {
    // Эффект разрушения
    if (obj.sprite) {
      this.scene.tweens.add({
        targets: obj.sprite,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => {
          obj.sprite.destroy();
        },
      });
    }
    
    // Удаляем из карты
    this.objects.delete(obj.id);
  }
  
  // ==================== ФИЗИКА ====================
  
  /**
   * Получить группу препятствий для физики
   */
  getObstacleGroup(): Phaser.GameObjects.Group | undefined {
    return this.obstacleGroup;
  }
  
  /**
   * Получить все блокирующие объекты
   */
  getBlockingObjects(): EnvironmentObject[] {
    return Array.from(this.objects.values()).filter(obj => obj.isBlocking);
  }
  
  /**
   * Проверить столкновение в точке
   */
  checkCollisionAt(xPixels: number, yPixels: number, radius: number = 20): EnvironmentObject | null {
    for (const obj of this.objects.values()) {
      if (!obj.isBlocking) continue;
      
      const dx = obj.sprite.x - xPixels;
      const dy = obj.sprite.y - yPixels;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Простой радиальный тест
      const objRadius = 30; // Можно вычислять из пресета
      
      if (distance < radius + objRadius) {
        return obj;
      }
    }
    
    return null;
  }
  
  // ==================== ОТЛАДКА ====================
  
  /**
   * Показать хитбоксы (для отладки)
   */
  toggleDebugHitboxes(): void {
    this.showDebugHitboxes = !this.showDebugHitboxes;
    
    this.objects.forEach(obj => {
      if (this.showDebugHitboxes && obj.isBlocking) {
        // Показываем хитбокс
        const hitbox = this.scene.add.circle(
          obj.sprite.x,
          obj.sprite.y,
          30,
          0x00ff00,
          0.2
        );
        hitbox.setStrokeStyle(1, 0x00ff00, 0.5);
        obj.hitbox = hitbox as unknown as Phaser.GameObjects.Graphics;
      } else if (obj.hitbox) {
        obj.hitbox.destroy();
        obj.hitbox = undefined;
      }
    });
  }
  
  // ==================== ОЧИСТКА ====================
  
  /**
   * Очистить все объекты
   */
  cleanup(): void {
    this.objects.forEach(obj => {
      if (obj.sprite) obj.sprite.destroy();
      if (obj.hitbox) obj.hitbox.destroy();
      if (obj.healthBar) obj.healthBar.destroy();
    });
    
    this.objects.clear();
    
    if (this.obstacleGroup) {
      this.obstacleGroup.clear(true, true);
    }
    
    this.textureGenerator.cleanup();
    
    console.log('[EnvironmentManager] Cleaned up');
  }
  
  // ==================== ГЕТТЕРЫ ====================
  
  /**
   * Получить объект по ID
   */
  getObject(id: string): EnvironmentObject | undefined {
    return this.objects.get(id);
  }
  
  /**
   * Получить все объекты
   */
  getAllObjects(): EnvironmentObject[] {
    return Array.from(this.objects.values());
  }
  
  /**
   * Получить количество объектов
   */
  getObjectCount(): number {
    return this.objects.size;
  }
}

// ==================== ЭКСПОРТ УТИЛИТ ====================

/**
 * Создать конфигурацию по умолчанию для тестового полигона
 */
export function createDefaultTestPolygonConfig(): TestPolygonConfig {
  return {
    width: 60,      // 60 метров
    height: 60,     // 60 метров
    rocks: 15,      // 15 камней
    trees: 20,      // 20 деревьев
    ores: 8,        // 8 рудных камней
    buildings: 6,   // 6 строений
    seed: Date.now(),
  };
}
