/**
 * ============================================================================
 * ЗАГРУЗЧИК СГЕНЕРИРОВАННЫХ ОБЪЕКТОВ
 * ============================================================================
 * 
 * Загружает сгенерированные объекты из файлов в папке presets/
 * и предоставляет их для использования в игре.
 * 
 * Поддерживаемые типы:
 * - Техники (presets/techniques/)
 * - Формации (presets/formations/)
 * - Предметы (presets/items/)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ==================== ТИПЫ ====================

export interface GeneratedTechnique {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: string;
  subtype?: string;
  element: string;
  level: number;
  rarity: string;
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    activeEffects: Array<{ type: string; value: number }>;
  };
  meta?: {
    seed: number;
    generatedAt: string;
    generatorVersion: string;
  };
}

export interface GeneratedFormation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: 'defensive' | 'offensive' | 'support' | 'special';
  shape: string;
  level: number;
  rarity: string;
  positions: Array<{
    x: number;
    y: number;
    role: 'leader' | 'core' | 'support' | 'auxiliary';
  }>;
  effects: Record<string, number>;
  requirements: {
    minParticipants: number;
    maxParticipants: number;
    minCultivationLevel: number;
  };
  qiCostPerMinute: number;
  setupTime: number;
}

export interface GeneratedItem {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  type: string;
  category: string;
  rarity: string;
  icon: string;
  sizeWidth: number;
  sizeHeight: number;
  stats?: Record<string, number>;
  effects?: Array<{ type: string; value: number; duration?: number }>;
  requirements?: Record<string, number>;
  value: number;
  currency: string;
}

export interface LoadedObjects<T> {
  objects: T[];
  total: number;
  loadedAt: string;
}

// ==================== КОНСТАНТЫ ====================

const PRESETS_DIR = path.join(process.cwd(), 'presets');
const TECHNIQUES_DIR = path.join(PRESETS_DIR, 'techniques');
const FORMATIONS_DIR = path.join(PRESETS_DIR, 'formations');
const ITEMS_DIR = path.join(PRESETS_DIR, 'items');

// ==================== КЛАСС ЗАГРУЗЧИКА ====================

class GeneratedObjectsLoader {
  private techniquesCache: GeneratedTechnique[] | null = null;
  private formationsCache: GeneratedFormation[] | null = null;
  private itemsCache: GeneratedItem[] | null = null;
  private lastLoadTime = 0;
  private cacheTTL = 60000; // 1 минута

  /**
   * Сбросить кэш
   */
  clearCache(): void {
    this.techniquesCache = null;
    this.formationsCache = null;
    this.itemsCache = null;
    this.lastLoadTime = 0;
  }

  /**
   * Проверить актуальность кэша
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastLoadTime < this.cacheTTL;
  }

  // ==================== ТЕХНИКИ ====================

  /**
   * Загрузить все техники из файлов
   */
  async loadTechniques(forceReload = false): Promise<LoadedObjects<GeneratedTechnique>> {
    if (!forceReload && this.techniquesCache && this.isCacheValid()) {
      return {
        objects: this.techniquesCache,
        total: this.techniquesCache.length,
        loadedAt: new Date(this.lastLoadTime).toISOString(),
      };
    }

    const techniques: GeneratedTechnique[] = [];

    try {
      await this.loadTechniquesRecursive(TECHNIQUES_DIR, techniques);
      this.techniquesCache = techniques;
      this.lastLoadTime = Date.now();
    } catch (error) {
      console.error('[GeneratedObjectsLoader] Failed to load techniques:', error);
    }

    return {
      objects: techniques,
      total: techniques.length,
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Рекурсивная загрузка техник
   */
  private async loadTechniquesRecursive(dirPath: string, techniques: GeneratedTechnique[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.loadTechniquesRecursive(fullPath, techniques);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);

            if (data.techniques && Array.isArray(data.techniques)) {
              techniques.push(...data.techniques);
            }
          } catch (parseError) {
            console.warn(`[GeneratedObjectsLoader] Failed to parse ${fullPath}:`, parseError);
          }
        }
      }
    } catch {
      // Директория не существует
    }
  }

  /**
   * Получить техники по фильтрам
   */
  async getTechniques(filters?: {
    type?: string;
    subtype?: string;
    element?: string;
    level?: number;
    rarity?: string;
  }): Promise<GeneratedTechnique[]> {
    const { objects: techniques } = await this.loadTechniques();

    return techniques.filter(t => {
      if (filters?.type && t.type !== filters.type) return false;
      if (filters?.subtype && t.subtype !== filters.subtype) return false;
      if (filters?.element && t.element !== filters.element) return false;
      if (filters?.level && t.level !== filters.level) return false;
      if (filters?.rarity && t.rarity !== filters.rarity) return false;
      return true;
    });
  }

  /**
   * Получить технику по ID
   */
  async getTechniqueById(id: string): Promise<GeneratedTechnique | undefined> {
    const { objects: techniques } = await this.loadTechniques();
    return techniques.find(t => t.id === id);
  }

  // ==================== ФОРМАЦИИ ====================

  /**
   * Загрузить все формации
   */
  async loadFormations(forceReload = false): Promise<LoadedObjects<GeneratedFormation>> {
    if (!forceReload && this.formationsCache && this.isCacheValid()) {
      return {
        objects: this.formationsCache,
        total: this.formationsCache.length,
        loadedAt: new Date(this.lastLoadTime).toISOString(),
      };
    }

    const formations: GeneratedFormation[] = [];

    try {
      const filePath = path.join(FORMATIONS_DIR, 'all.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.formations && Array.isArray(data.formations)) {
        formations.push(...data.formations);
      }

      this.formationsCache = formations;
      this.lastLoadTime = Date.now();
    } catch {
      // Файл не существует
    }

    return {
      objects: formations,
      total: formations.length,
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Получить формации по фильтрам
   */
  async getFormations(filters?: {
    type?: string;
    level?: number;
    rarity?: string;
  }): Promise<GeneratedFormation[]> {
    const { objects: formations } = await this.loadFormations();

    return formations.filter(f => {
      if (filters?.type && f.type !== filters.type) return false;
      if (filters?.level && f.level !== filters.level) return false;
      if (filters?.rarity && f.rarity !== filters.rarity) return false;
      return true;
    });
  }

  /**
   * Получить формацию по ID
   */
  async getFormationById(id: string): Promise<GeneratedFormation | undefined> {
    const { objects: formations } = await this.loadFormations();
    return formations.find(f => f.id === id);
  }

  // ==================== ПРЕДМЕТЫ ====================

  /**
   * Загрузить все предметы
   */
  async loadItems(forceReload = false): Promise<LoadedObjects<GeneratedItem>> {
    if (!forceReload && this.itemsCache && this.isCacheValid()) {
      return {
        objects: this.itemsCache,
        total: this.itemsCache.length,
        loadedAt: new Date(this.lastLoadTime).toISOString(),
      };
    }

    const items: GeneratedItem[] = [];

    try {
      const entries = await fs.readdir(ITEMS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const filePath = path.join(ITEMS_DIR, entry.name);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            if (data.items && Array.isArray(data.items)) {
              items.push(...data.items);
            }
          } catch (parseError) {
            console.warn(`[GeneratedObjectsLoader] Failed to parse item file:`, parseError);
          }
        }
      }

      this.itemsCache = items;
      this.lastLoadTime = Date.now();
    } catch {
      // Директория не существует
    }

    return {
      objects: items,
      total: items.length,
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Получить предметы по фильтрам
   */
  async getItems(filters?: {
    type?: string;
    category?: string;
    rarity?: string;
  }): Promise<GeneratedItem[]> {
    const { objects: items } = await this.loadItems();

    return items.filter(i => {
      if (filters?.type && i.type !== filters.type) return false;
      if (filters?.category && i.category !== filters.category) return false;
      if (filters?.rarity && i.rarity !== filters.rarity) return false;
      return true;
    });
  }

  /**
   * Получить предмет по ID
   */
  async getItemById(id: string): Promise<GeneratedItem | undefined> {
    const { objects: items } = await this.loadItems();
    return items.find(i => i.id === id);
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Получить статистику по всем объектам
   */
  async getStats(): Promise<{
    techniques: { total: number; byType: Record<string, number>; byLevel: Record<number, number> };
    formations: { total: number; byType: Record<string, number>; byLevel: Record<number, number> };
    items: { total: number; byType: Record<string, number> };
  }> {
    const [techResult, formResult, itemsResult] = await Promise.all([
      this.loadTechniques(),
      this.loadFormations(),
      this.loadItems(),
    ]);

    // Статистика техник
    const techByType: Record<string, number> = {};
    const techByLevel: Record<number, number> = {};
    for (const t of techResult.objects) {
      techByType[t.type] = (techByType[t.type] || 0) + 1;
      techByLevel[t.level] = (techByLevel[t.level] || 0) + 1;
    }

    // Статистика формаций
    const formByType: Record<string, number> = {};
    const formByLevel: Record<number, number> = {};
    for (const f of formResult.objects) {
      formByType[f.type] = (formByType[f.type] || 0) + 1;
      formByLevel[f.level] = (formByLevel[f.level] || 0) + 1;
    }

    // Статистика предметов
    const itemsByType: Record<string, number> = {};
    for (const i of itemsResult.objects) {
      itemsByType[i.type] = (itemsByType[i.type] || 0) + 1;
    }

    return {
      techniques: { total: techResult.total, byType: techByType, byLevel: techByLevel },
      formations: { total: formResult.total, byType: formByType, byLevel: formByLevel },
      items: { total: itemsResult.total, byType: itemsByType },
    };
  }
}

// ==================== ЭКСПОРТ СИНГЛТОНА ====================

export const generatedObjectsLoader = new GeneratedObjectsLoader();
