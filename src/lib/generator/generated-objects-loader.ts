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
 * 
 * АВТОГЕНЕРАЦИЯ:
 * Если при загрузке техники не найдены, автоматически генерируется
 * 10 техник каждого типа (combat, defense, cultivation, support, movement, sensory, healing, curse, poison)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  generateTechnique,
  type TechniqueType,
  type GeneratedTechnique as GenTechnique,
} from './technique-generator';
import { getPrefixForTechniqueType, type IdPrefix } from './id-config';

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
  private isGenerating = false; // Флаг для предотвращения повторной генерации

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
   * Если техники отсутствуют - автоматически генерирует 10 техник каждого типа
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
      
      // АВТОГЕНЕРАЦИЯ: если техник нет - генерируем
      if (techniques.length === 0 && !this.isGenerating) {
        console.log('[GeneratedObjectsLoader] No techniques found, auto-generating...');
        const generatedTechniques = await this.autoGenerateTechniques();
        techniques.push(...generatedTechniques);
      }
      
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
   * Автогенерация техник при отсутствии файлов
   * Генерирует техники для уровня 1:
   * - combat: 30 техник (10 melee_strike, 10 ranged_beam, 10 melee_weapon)
   * - другие типы: по 10 техник каждого типа
   */
  private async autoGenerateTechniques(): Promise<GeneratedTechnique[]> {
    if (this.isGenerating) {
      console.log('[GeneratedObjectsLoader] Already generating, waiting...');
      return [];
    }
    
    this.isGenerating = true;
    const allTechniques: GeneratedTechnique[] = [];
    
    try {
      const elements = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'] as const;
      let counter = 1;
      
      // ========== COMBAT ТЕХНИКИ ==========
      // Генерируем 10 техник каждого подтипа
      // Все подтипы: melee_strike, melee_weapon, ranged_projectile, ranged_beam, ranged_aoe
      const combatSubtypes: Array<'melee_strike' | 'melee_weapon' | 'ranged_projectile' | 'ranged_beam' | 'ranged_aoe'> = [
        'melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'
      ];
      
      for (const subtype of combatSubtypes) {
        console.log(`[GeneratedObjectsLoader] Generating 10 combat/${subtype} techniques...`);
        
        for (let i = 0; i < 10; i++) {
          const element = elements[i % elements.length];
          const prefix = getPrefixForTechniqueType('combat');
          const id = `${prefix}_${(counter++).toString().padStart(6, '0')}`;
          
          try {
            const technique = generateTechnique(
              id,
              'combat',
              element,
              1, // level
              Date.now() + counter, // seed
              { combatSubtype: subtype } // ЯВНО указываем подтип!
            );
            
            const genTechnique = this.convertToGenerated(technique);
            allTechniques.push(genTechnique);
          } catch (genError) {
            console.warn(`[GeneratedObjectsLoader] Failed to generate technique ${id}:`, genError);
          }
        }
      }
      
      // ========== ДРУГИЕ ТИПЫ ТЕХНИК ==========
      const otherTypes: TechniqueType[] = [
        'defense', 'cultivation', 'support', 
        'movement', 'sensory', 'healing', 'curse', 'poison'
      ];
      
      for (const type of otherTypes) {
        console.log(`[GeneratedObjectsLoader] Generating 10 ${type} techniques...`);
        
        for (let i = 0; i < 10; i++) {
          const element = elements[i % elements.length];
          const prefix = getPrefixForTechniqueType(type);
          const id = `${prefix}_${(counter++).toString().padStart(6, '0')}`;
          
          try {
            const technique = generateTechnique(
              id,
              type,
              element,
              1, // level
              Date.now() + counter // seed
            );
            
            const genTechnique = this.convertToGenerated(technique);
            allTechniques.push(genTechnique);
          } catch (genError) {
            console.warn(`[GeneratedObjectsLoader] Failed to generate technique ${id}:`, genError);
          }
        }
      }
      
      // Сохраняем сгенерированные техники в файлы
      if (allTechniques.length > 0) {
        await this.saveAutoGeneratedTechniques(allTechniques);
        console.log(`[GeneratedObjectsLoader] Auto-generated ${allTechniques.length} techniques`);
      }
      
    } catch (error) {
      console.error('[GeneratedObjectsLoader] Auto-generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
    
    return allTechniques;
  }

  /**
   * Конвертировать GeneratedTechnique из генератора в формат для сохранения
   */
  private convertToGenerated(technique: any): GeneratedTechnique {
    return {
      id: technique.id,
      name: technique.name,
      nameEn: technique.nameEn,
      description: technique.description,
      type: technique.type,
      subtype: technique.subtype,
      element: technique.element,
      level: technique.level,
      rarity: technique.rarity,
      computed: {
        finalDamage: technique.computed?.finalDamage || 0,
        finalQiCost: technique.computed?.finalQiCost || 0,
        finalRange: technique.computed?.finalRange || 0,
        activeEffects: technique.computed?.activeEffects || [],
      },
      meta: technique.meta,
    };
  }

  /**
   * Сохранить автосгенерированные техники в файлы
   */
  private async saveAutoGeneratedTechniques(techniques: GeneratedTechnique[]): Promise<void> {
    // Группируем по типу и подтипу
    const grouped = new Map<string, GeneratedTechnique[]>();
    
    for (const tech of techniques) {
      const key = tech.subtype 
        ? `${tech.type}/${tech.subtype}`
        : tech.type;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(tech);
    }
    
    // Создаём директории и сохраняем
    for (const [key, techs] of grouped.entries()) {
      const [type, subtype] = key.split('/');
      let filePath: string;
      
      if (subtype && type === 'combat') {
        // Для combat подтипов используем соответствующие папки
        // melee_strike -> combat/melee-strike
        // melee_weapon -> combat/melee-weapon
        // ranged_projectile, ranged_beam, ranged_aoe -> combat/ranged
        const subDir = subtype === 'melee_strike' ? 'melee-strike'
                     : subtype === 'melee_weapon' ? 'melee-weapon'
                     : 'ranged'; // ranged_projectile, ranged_beam, ranged_aoe
        filePath = path.join(TECHNIQUES_DIR, 'combat', subDir, 'level-1.json');
      } else {
        filePath = path.join(TECHNIQUES_DIR, type, 'level-1.json');
      }
      
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({
          version: '2.0',
          type,
          subtype: subtype || null,
          level: 1,
          count: techs.length,
          techniques: techs,
          autoGenerated: true,
          generatedAt: new Date().toISOString(),
        }, null, 2), 'utf-8');
        console.log(`[GeneratedObjectsLoader] Saved ${techs.length} techniques to ${filePath}`);
      } catch (saveError) {
        console.error(`[GeneratedObjectsLoader] Failed to save ${filePath}:`, saveError);
      }
    }
    
    // Обновляем манифест
    await this.updateManifest(techniques);
  }

  /**
   * Обновить манифест после автогенерации
   */
  private async updateManifest(techniques: GeneratedTechnique[]): Promise<void> {
    const manifestPath = path.join(PRESETS_DIR, 'manifest.json');
    
    const byType: Record<string, number> = {};
    const byLevel: Record<number, number> = {};
    const byElement: Record<string, number> = {};
    
    for (const tech of techniques) {
      byType[tech.type] = (byType[tech.type] || 0) + 1;
      byLevel[tech.level] = (byLevel[tech.level] || 0) + 1;
      byElement[tech.element] = (byElement[tech.element] || 0) + 1;
    }
    
    const manifest = {
      version: '2.0',
      generatedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      techniques: {
        total: techniques.length,
        byLevel,
        byType,
        byElement,
      },
      formations: { total: 0, byLevel: {}, byType: {} },
      items: { total: 0 },
      npcs: { total: 0 },
      autoGenerated: true,
    };
    
    try {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {
      // Игнорируем ошибки записи манифеста
    }
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

  // ==================== УНИВЕРСАЛЬНЫЙ ЗАГРУЗЧИК ====================

  /**
   * Загрузить объекты по типу (для NPC генератора)
   * @param type - тип объектов: 'techniques', 'formations', 'items', 'consumables', 'weapons', 'armor', 'accessories'
   */
  async loadObjects(type: string): Promise<GeneratedItem[]> {
    // Если запрашивают расходники, загружаем из items/consumable.json
    if (type === 'consumables') {
      const { objects: items } = await this.loadItems();
      return items.filter(i => i.type === 'consumable');
    }

    // Если запрашивают оружие
    if (type === 'weapons') {
      const { objects: items } = await this.loadItems();
      return items.filter(i => i.type === 'weapon');
    }

    // Если запрашивают броню
    if (type === 'armor') {
      const { objects: items } = await this.loadItems();
      return items.filter(i => i.type === 'armor');
    }

    // Если запрашивают аксессуары
    if (type === 'accessories') {
      const { objects: items } = await this.loadItems();
      return items.filter(i => i.type === 'accessory');
    }

    // По умолчанию загружаем все предметы
    if (type === 'items') {
      const { objects: items } = await this.loadItems();
      return items;
    }

    // Если запрашивают техники или формации - возвращаем пустой массив
    // (они имеют другую структуру)
    return [];
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
