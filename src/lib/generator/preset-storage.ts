/**
 * ============================================================================
 * СЕРВИС ХРАНЕНИЯ ПРЕСЕТОВ v2.0
 * ============================================================================
 * 
 * Сохраняет сгенерированные объекты в JSON-файлы.
 * 
 * Особенности v2.0:
 * - Разделение файлов по типам и подтипам
 * - Избирательная очистка по типу/подтипу
 * - Новые префиксы ID (MS, MW, RG для combat)
 * - Категории оружия вместо конкретных типов
 * 
 * Структура:
 * presets/techniques/
 *   combat/
 *     melee-strike/level-{n}.json   (MS_ prefix)
 *     melee-weapon/level-{n}.json   (MW_ prefix)
 *     ranged/level-{n}.json         (RG_ prefix)
 *   defense/level-{n}.json          (DF_ prefix)
 *   healing/level-{n}.json          (HL_ prefix)
 *   ...
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GeneratedTechnique, TechniqueType, CombatSubtype } from './technique-generator';
import { 
  IdPrefix, 
  getPrefixForTechniqueType, 
  getIdPrefixConfig,
  COMBAT_SUBTYPE_PREFIX 
} from './id-config';

// Каталог для хранения сгенерированных данных
const DATA_DIR = path.join(process.cwd(), 'presets');

// ==================== ТИПЫ ====================

export interface PresetManifest {
  version: string;
  generatedAt: string;
  lastModifiedAt: string;
  techniques: {
    total: number;
    byLevel: Record<number, number>;
    byType: Record<string, number>;
    bySubtype: Record<string, number>;  // NEW: статистика по подтипам
    byElement: Record<string, number>;
  };
  formations: {
    total: number;
    byLevel: Record<number, number>;
  };
  items: {
    total: number;
  };
  npcs: {
    total: number;
  };
  fileSizeStats: {
    techniquesBytes: number;
    largestFileBytes: number;
    largestFileName: string;
  };
}

export interface IdCounters {
  version: string;
  updatedAt: string;
  counters: Record<IdPrefix, number>;
}

export interface FileAnalysis {
  path: string;
  sizeBytes: number;
  objectCount: number;
  avgObjectSize: number;
  canAppend: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalObjects: number;
  largestFile: FileAnalysis;
  recommendedMaxFileSize: number;
  filesNeedingSplit: string[];
}

export interface ClearResult {
  deletedFiles: number;
  deletedObjects: number;
  countersPreserved: boolean;
  clearedType?: TechniqueType;
  clearedSubtype?: CombatSubtype;
}

// Константы
const RECOMMENDED_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_OBJECTS_PER_FILE = 10000;

// ==================== МАППИНГИ ====================

/**
 * Маппинг типа техники к пути директории
 */
const TYPE_DIR_MAP: Record<TechniqueType, string> = {
  combat: 'combat',      // Специальная обработка по подтипам
  defense: 'defense',
  cultivation: 'cultivation',
  support: 'support',
  movement: 'movement',
  sensory: 'sensory',
  healing: 'healing',
  curse: 'curse',
  poison: 'poison',
};

/**
 * Маппинг подтипа combat к поддиректории
 */
const COMBAT_SUBTYPE_DIR_MAP: Record<CombatSubtype, string> = {
  melee_strike: 'melee-strike',
  melee_weapon: 'melee-weapon',
  ranged_projectile: 'ranged',
  ranged_beam: 'ranged',
  ranged_aoe: 'ranged',
};

/**
 * Получить путь к файлу для техники
 */
function getTechniqueFilePath(
  type: TechniqueType,
  level: number,
  combatSubtype?: CombatSubtype
): string {
  if (type === 'combat' && combatSubtype) {
    const subDir = COMBAT_SUBTYPE_DIR_MAP[combatSubtype];
    return path.join(DATA_DIR, 'techniques', 'combat', subDir, `level-${level}.json`);
  }
  
  const typeDir = TYPE_DIR_MAP[type];
  return path.join(DATA_DIR, 'techniques', typeDir, `level-${level}.json`);
}

/**
 * Получить путь к директории типа
 */
function getTypeDirPath(
  type: TechniqueType,
  combatSubtype?: CombatSubtype
): string {
  if (type === 'combat' && combatSubtype) {
    const subDir = COMBAT_SUBTYPE_DIR_MAP[combatSubtype];
    return path.join(DATA_DIR, 'techniques', 'combat', subDir);
  }
  
  const typeDir = TYPE_DIR_MAP[type];
  return path.join(DATA_DIR, 'techniques', typeDir);
}

// ==================== СЕРВИС ID ====================

class IdService {
  private counters: Record<string, number> = {};
  private countersPath: string;
  private initialized = false;
  
  constructor() {
    this.countersPath = path.join(DATA_DIR, 'counters.json');
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const content = await fs.readFile(this.countersPath, 'utf-8');
      const data: IdCounters = JSON.parse(content);
      this.counters = data.counters || {};
    } catch {
      this.counters = {};
    }
    
    this.initialized = true;
  }
  
  generateId(prefix: IdPrefix): string {
    const counter = (this.counters[prefix] || 0) + 1;
    this.counters[prefix] = counter;
    return `${prefix}_${counter.toString().padStart(6, '0')}`;
  }
  
  getCounter(prefix: IdPrefix): number {
    return this.counters[prefix] || 0;
  }
  
  setCounter(prefix: IdPrefix, value: number): void {
    this.counters[prefix] = value;
  }
  
  async save(): Promise<void> {
    const data: IdCounters = {
      version: '2.0',
      updatedAt: new Date().toISOString(),
      counters: this.counters as Record<IdPrefix, number>,
    };
    await fs.writeFile(this.countersPath, JSON.stringify(data, null, 2), 'utf-8');
  }
  
  resetAll(): void {
    this.counters = {};
  }
  
  reset(prefix: IdPrefix): void {
    delete this.counters[prefix];
  }
  
  preserveCounters(): Record<string, number> {
    return { ...this.counters };
  }
  
  restoreCounters(counters: Record<string, number>): void {
    this.counters = { ...counters };
  }
  
  /**
   * Сбросить счётчики для конкретного типа/подтипа
   */
  resetTypeCounters(type: TechniqueType, combatSubtype?: CombatSubtype): void {
    if (type === 'combat') {
      if (combatSubtype) {
        // Сбросить конкретный подтип
        const prefix = COMBAT_SUBTYPE_PREFIX[combatSubtype];
        this.reset(prefix);
      } else {
        // Сбросить все combat префиксы
        this.reset('MS');
        this.reset('MW');
        this.reset('RG');
        this.reset('TC'); // Легаси
      }
    } else {
      // Сбросить префикс типа
      const prefix = getPrefixForTechniqueType(type);
      this.reset(prefix);
    }
  }
}

// ==================== СЕРВИС ХРАНЕНИЯ ====================

export class PresetStorageService {
  private techniqueCache = new Map<string, GeneratedTechnique>();
  private formationCache = new Map<string, unknown>();
  private loaded = false;
  private idService: IdService;
  
  constructor() {
    this.idService = new IdService();
  }
  
  async initialize(): Promise<void> {
    try {
      // Создаём базовые директории
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'formations'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'items'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'npcs'), { recursive: true });
      
      // Создаём структуру для техник
      await this.createTechniqueDirectories();
      
      await this.idService.initialize();
    } catch (error) {
      console.error('[PresetStorage] Initialize error:', error);
    }
  }
  
  /**
   * Создать структуру директорий для техник
   */
  private async createTechniqueDirectories(): Promise<void> {
    // Combat подтипы
    const combatSubdirs = ['melee-strike', 'melee-weapon', 'ranged'];
    for (const subDir of combatSubdirs) {
      await fs.mkdir(path.join(DATA_DIR, 'techniques', 'combat', subDir), { recursive: true });
    }
    
    // Остальные типы
    const otherTypes: TechniqueType[] = ['defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse', 'poison'];
    for (const type of otherTypes) {
      await fs.mkdir(path.join(DATA_DIR, 'techniques', type), { recursive: true });
    }
  }
  
  // ==================== ID SERVICE ====================
  
  generateId(prefix: IdPrefix): string {
    return this.idService.generateId(prefix);
  }
  
  async saveCounters(): Promise<void> {
    await this.idService.save();
  }
  
  // ==================== ТЕХНИКИ: СОХРАНЕНИЕ ====================
  
  /**
   * Сохранить техники (с перезаписью или добавлением)
   */
  async saveTechniques(
    techniques: GeneratedTechnique[],
    mode: 'replace' | 'append' = 'replace'
  ): Promise<{
    saved: number;
    appended: number;
    total: number;
  }> {
    // Группируем по типу/подтипу и уровню
    const grouped = this.groupTechniques(techniques);
    
    let saved = 0;
    let appended = 0;
    
    for (const [key, techs] of Object.entries(grouped)) {
      const [type, subtypeStr, levelStr] = key.split('|');
      const level = parseInt(levelStr);
      const combatSubtype = subtypeStr !== 'null' ? subtypeStr as CombatSubtype : undefined;
      
      let existing: GeneratedTechnique[] = [];
      
      if (mode === 'append') {
        existing = await this.loadTechniquesFromPath(type as TechniqueType, level, combatSubtype);
        appended += techs.length;
      }
      
      const allTechniques = mode === 'append' 
        ? [...existing, ...techs]
        : techs;
      
      await this.saveTechniquesToFile(type as TechniqueType, level, allTechniques, combatSubtype);
      saved += techs.length;
      
      // Кэшируем
      for (const tech of allTechniques) {
        this.techniqueCache.set(tech.id, tech);
      }
    }
    
    await this.idService.save();
    await this.updateManifest();
    
    return { saved, appended, total: this.techniqueCache.size };
  }
  
  /**
   * Группировка техник для сохранения
   */
  private groupTechniques(techniques: GeneratedTechnique[]): Record<string, GeneratedTechnique[]> {
    const grouped: Record<string, GeneratedTechnique[]> = {};
    
    for (const tech of techniques) {
      const key = `${tech.type}|${tech.subtype || 'null'}|${tech.level}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tech);
    }
    
    return grouped;
  }
  
  /**
   * Сохранить техники в файл
   */
  private async saveTechniquesToFile(
    type: TechniqueType,
    level: number,
    techniques: GeneratedTechnique[],
    combatSubtype?: CombatSubtype
  ): Promise<void> {
    const filePath = getTechniqueFilePath(type, level, combatSubtype);
    const dirPath = path.dirname(filePath);
    
    await fs.mkdir(dirPath, { recursive: true });
    
    const prefix = getPrefixForTechniqueType(type, combatSubtype);
    const prefixConfig = getIdPrefixConfig(prefix);
    
    await fs.writeFile(filePath, JSON.stringify({
      version: '2.0',
      type,
      subtype: combatSubtype || null,
      prefix,
      prefixName: prefixConfig?.name || prefix,
      level,
      count: techniques.length,
      techniques,
    }, null, 2), 'utf-8');
  }
  
  // ==================== ТЕХНИКИ: ЗАГРУЗКА ====================
  
  /**
   * Загрузить все техники
   */
  async loadTechniques(): Promise<GeneratedTechnique[]> {
    if (this.loaded) {
      return Array.from(this.techniqueCache.values());
    }
    
    const techniques: GeneratedTechnique[] = [];
    
    try {
      const techniquesDir = path.join(DATA_DIR, 'techniques');
      await this.loadTechniquesRecursive(techniquesDir, techniques);
      this.loaded = true;
    } catch (error) {
      console.error('[PresetStorage] Load error:', error);
    }
    
    return techniques;
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
          const content = await fs.readFile(fullPath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.techniques && Array.isArray(data.techniques)) {
            techniques.push(...data.techniques);
            for (const tech of data.techniques) {
              this.techniqueCache.set(tech.id, tech);
            }
          }
        }
      }
    } catch {
      // Игнорируем ошибки чтения директорий
    }
  }
  
  /**
   * Загрузить техники по типу
   */
  async loadTechniquesByType(type: TechniqueType): Promise<GeneratedTechnique[]> {
    await this.loadTechniques();
    return Array.from(this.techniqueCache.values()).filter(t => t.type === type);
  }
  
  /**
   * Загрузить техники по подтипу combat
   */
  async loadTechniquesBySubtype(subtype: CombatSubtype): Promise<GeneratedTechnique[]> {
    await this.loadTechniques();
    return Array.from(this.techniqueCache.values()).filter(
      t => t.type === 'combat' && t.subtype === subtype
    );
  }
  
  /**
   * Загрузить техники из конкретного пути
   */
  private async loadTechniquesFromPath(
    type: TechniqueType,
    level: number,
    combatSubtype?: CombatSubtype
  ): Promise<GeneratedTechnique[]> {
    const filePath = getTechniqueFilePath(type, level, combatSubtype);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.techniques || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Загрузить техники по уровню
   */
  async getTechniquesByLevel(level: number): Promise<GeneratedTechnique[]> {
    await this.loadTechniques();
    return Array.from(this.techniqueCache.values()).filter(t => t.level === level);
  }
  
  /**
   * Получить технику по ID
   */
  async getTechniqueById(id: string): Promise<GeneratedTechnique | undefined> {
    if (this.techniqueCache.has(id)) {
      return this.techniqueCache.get(id);
    }
    
    await this.loadTechniques();
    return this.techniqueCache.get(id);
  }
  
  // ==================== ОЧИСТКА ====================
  
  /**
   * Полное удаление всех данных
   */
  async clearAll(preserveCounters: boolean = true): Promise<ClearResult> {
    const preservedCounters = this.idService.preserveCounters();
    let deletedFiles = 0;
    let deletedObjects = 0;
    
    // Удаляем все техники
    const techniquesDir = path.join(DATA_DIR, 'techniques');
    const result = await this.deleteDirectoryRecursive(techniquesDir);
    deletedFiles += result.files;
    deletedObjects += result.objects;
    
    // Удаляем формации
    const formationsDir = path.join(DATA_DIR, 'formations');
    const formationsResult = await this.deleteDirectoryRecursive(formationsDir);
    deletedFiles += formationsResult.files;
    deletedObjects += formationsResult.objects;
    
    // Удаляем манифест
    try {
      await fs.unlink(path.join(DATA_DIR, 'manifest.json'));
      deletedFiles++;
    } catch {
      // Игнорируем
    }
    
    // Очищаем кэш
    this.techniqueCache.clear();
    this.formationCache.clear();
    this.loaded = false;
    
    // Восстанавливаем или сбрасываем счётчики
    if (preserveCounters) {
      this.idService.restoreCounters(preservedCounters);
    } else {
      this.idService.resetAll();
    }
    
    await this.idService.save();
    await this.createTechniqueDirectories();
    
    return {
      deletedFiles,
      deletedObjects,
      countersPreserved: preserveCounters,
    };
  }
  
  /**
   * Очистка по типу техник
   */
  async clearByType(type: TechniqueType, preserveCounters: boolean = true): Promise<ClearResult> {
    const preservedCounters = this.idService.preserveCounters();
    let deletedFiles = 0;
    let deletedObjects = 0;
    
    if (type === 'combat') {
      // Для combat удаляем все подтипы
      const combatSubdirs = ['melee-strike', 'melee-weapon', 'ranged'];
      for (const subDir of combatSubdirs) {
        const dirPath = path.join(DATA_DIR, 'techniques', 'combat', subDir);
        const result = await this.deleteDirectoryRecursive(dirPath);
        deletedFiles += result.files;
        deletedObjects += result.objects;
      }
    } else {
      // Для других типов
      const dirPath = getTypeDirPath(type);
      const result = await this.deleteDirectoryRecursive(dirPath);
      deletedFiles += result.files;
      deletedObjects += result.objects;
    }
    
    // Удаляем из кэша
    for (const [id, tech] of this.techniqueCache.entries()) {
      if (tech.type === type) {
        this.techniqueCache.delete(id);
      }
    }
    
    // Управление счётчиками
    if (preserveCounters) {
      this.idService.restoreCounters(preservedCounters);
    } else {
      this.idService.resetTypeCounters(type);
    }
    
    await this.idService.save();
    await this.createTechniqueDirectories();
    await this.updateManifest();
    
    return {
      deletedFiles,
      deletedObjects,
      countersPreserved: preserveCounters,
      clearedType: type,
    };
  }
  
  /**
   * Очистка по подтипу combat
   */
  async clearBySubtype(
    subtype: CombatSubtype,
    preserveCounters: boolean = true
  ): Promise<ClearResult> {
    const preservedCounters = this.idService.preserveCounters();
    
    const dirPath = getTypeDirPath('combat', subtype);
    const result = await this.deleteDirectoryRecursive(dirPath);
    
    // Удаляем из кэша
    for (const [id, tech] of this.techniqueCache.entries()) {
      if (tech.type === 'combat' && tech.subtype === subtype) {
        this.techniqueCache.delete(id);
      }
    }
    
    // Управление счётчиками
    if (preserveCounters) {
      this.idService.restoreCounters(preservedCounters);
    } else {
      this.idService.resetTypeCounters('combat', subtype);
    }
    
    await this.idService.save();
    await fs.mkdir(dirPath, { recursive: true });
    await this.updateManifest();
    
    return {
      deletedFiles: result.files,
      deletedObjects: result.objects,
      countersPreserved: preserveCounters,
      clearedSubtype: subtype,
    };
  }
  
  /**
   * Рекурсивное удаление директории
   */
  private async deleteDirectoryRecursive(dirPath: string): Promise<{ files: number; objects: number }> {
    let files = 0;
    let objects = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const result = await this.deleteDirectoryRecursive(fullPath);
          files += result.files;
          objects += result.objects;
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            objects += data.techniques?.length || data.formations?.length || 0;
          } catch {
            // Игнорируем
          }
          
          await fs.unlink(fullPath);
          files++;
        }
      }
    } catch {
      // Игнорируем
    }
    
    return { files, objects };
  }
  
  // ==================== ФОРМАЦИИ ====================

  /**
   * Сохранить формации по типам
   */
  async saveFormations(formations: unknown[], mode: 'replace' | 'append' = 'replace'): Promise<number> {
    // Группируем по типу (defensive, offensive, support, special)
    const grouped = this.groupFormations(formations);
    let totalSaved = 0;

    for (const [type, typeFormations] of Object.entries(grouped)) {
      const filePath = path.join(DATA_DIR, 'formations', `${type}.json`);
      let allFormations = typeFormations;

      if (mode === 'append') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const existing = JSON.parse(content);
          allFormations = [...existing.formations, ...typeFormations];
        } catch {
          // Файл не существует
        }
      }

      await fs.writeFile(filePath, JSON.stringify({
        version: '2.0',
        type,
        count: allFormations.length,
        formations: allFormations,
      }, null, 2), 'utf-8');

      totalSaved += typeFormations.length;

      // Кэшируем
      for (const form of allFormations) {
        this.formationCache.set((form as { id: string }).id, form);
      }
    }

    return totalSaved;
  }

  /**
   * Группировка формаций по типу
   */
  private groupFormations(formations: unknown[]): Record<string, unknown[]> {
    const grouped: Record<string, unknown[]> = {};

    for (const form of formations) {
      const type = (form as { type: string }).type || 'defensive';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(form);
    }

    return grouped;
  }

  /**
   * Загрузить все формации
   */
  async loadFormations(): Promise<unknown[]> {
    if (this.formationCache.size > 0) {
      return Array.from(this.formationCache.values());
    }

    const formations: unknown[] = [];

    try {
      const formationsDir = path.join(DATA_DIR, 'formations');
      const entries = await fs.readdir(formationsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(formationsDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);

          if (data.formations && Array.isArray(data.formations)) {
            formations.push(...data.formations);
            for (const form of data.formations) {
              this.formationCache.set((form as { id: string }).id, form);
            }
          }
        }
      }
    } catch {
      // Игнорируем ошибки
    }

    return formations;
  }

  /**
   * Загрузить формации по типу
   */
  async loadFormationsByType(type: string): Promise<unknown[]> {
    const filePath = path.join(DATA_DIR, 'formations', `${type}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.formations || [];
    } catch {
      return [];
    }
  }

  /**
   * Очистить формации (все или по типу)
   */
  async clearFormations(type?: string): Promise<{ deletedFiles: number; deletedObjects: number }> {
    let deletedFiles = 0;
    let deletedObjects = 0;

    if (type) {
      // Удаляем конкретный тип
      const filePath = path.join(DATA_DIR, 'formations', `${type}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        deletedObjects = data.formations?.length || 0;
        await fs.unlink(filePath);
        deletedFiles = 1;
      } catch {
        // Файл не существует
      }
    } else {
      // Удаляем все формации
      const formationsDir = path.join(DATA_DIR, 'formations');
      const result = await this.deleteDirectoryRecursive(formationsDir);
      deletedFiles = result.files;
      deletedObjects = result.objects;

      // Пересоздаём пустую директорию
      await fs.mkdir(formationsDir, { recursive: true });
    }

    // Очищаем кэш
    this.formationCache.clear();

    return { deletedFiles, deletedObjects };
  }
  
  // ==================== ПРЕДМЕТЫ (ITEMS) ====================
  
  /**
   * Типы предметов для сохранения
   */
  private itemCache = new Map<string, unknown>();
  
  /**
   * Сохранить предметы по типу
   */
  async saveItems(
    items: Array<{ id: string; type: string; [key: string]: unknown }>,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<{ saved: number; total: number }> {
    // Группируем по типу
    const grouped = this.groupItems(items);
    
    let saved = 0;
    
    for (const [type, typeItems] of Object.entries(grouped)) {
      const filePath = path.join(DATA_DIR, 'items', `${type}.json`);
      let allItems = typeItems;
      
      if (mode === 'append') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const existing = JSON.parse(content);
          allItems = [...existing.items, ...typeItems];
        } catch {
          // Файл не существует
        }
      }
      
      await fs.writeFile(filePath, JSON.stringify({
        version: '2.0',
        type,
        count: allItems.length,
        items: allItems,
      }, null, 2), 'utf-8');
      
      saved += typeItems.length;
      
      // Кэшируем
      for (const item of allItems) {
        this.itemCache.set(item.id as string, item);
      }
    }
    
    await this.idService.save();
    
    return { saved, total: this.itemCache.size };
  }
  
  /**
   * Группировка предметов по типу
   */
  private groupItems(items: Array<{ id: string; type: string; [key: string]: unknown }>): Record<string, Array<{ id: string; type: string; [key: string]: unknown }>> {
    const grouped: Record<string, Array<{ id: string; type: string; [key: string]: unknown }>> = {};
    
    for (const item of items) {
      const type = item.type || 'misc';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    }
    
    return grouped;
  }
  
  /**
   * Загрузить все предметы
   */
  async loadItems(): Promise<Array<{ id: string; type: string; [key: string]: unknown }>> {
    if (this.itemCache.size > 0) {
      return Array.from(this.itemCache.values()) as Array<{ id: string; type: string; [key: string]: unknown }>;
    }
    
    const items: Array<{ id: string; type: string; [key: string]: unknown }> = [];
    
    try {
      const itemsDir = path.join(DATA_DIR, 'items');
      const entries = await fs.readdir(itemsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(itemsDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.items && Array.isArray(data.items)) {
            items.push(...data.items);
            for (const item of data.items) {
              this.itemCache.set(item.id, item);
            }
          }
        }
      }
    } catch {
      // Игнорируем ошибки
    }
    
    return items;
  }
  
  // ==================== NPC ====================
  
  /**
   * Кэш NPC
   */
  private npcCache = new Map<string, unknown>();
  
  /**
   * Сохранить NPC по типу
   */
  async saveNPCs(
    npcs: Array<{ id: string; speciesId?: string; roleId?: string; [key: string]: unknown }>,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<{ saved: number; total: number }> {
    // Группируем по speciesType
    const grouped = this.groupNPCs(npcs);
    
    let saved = 0;
    
    for (const [type, typeNpcs] of Object.entries(grouped)) {
      const filePath = path.join(DATA_DIR, 'npcs', `${type}.json`);
      let allNpcs = typeNpcs;
      
      if (mode === 'append') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const existing = JSON.parse(content);
          // Deduplicate: remove NPCs with same ID from existing before appending
          const existingIds = new Set(typeNpcs.map(n => n.id));
          const filteredExisting = (existing.npcs || []).filter(
            (n: { id: string }) => !existingIds.has(n.id)
          );
          allNpcs = [...filteredExisting, ...typeNpcs];
        } catch {
          // Файл не существует
        }
      }
      
      await fs.writeFile(filePath, JSON.stringify({
        version: '2.0',
        type,
        count: allNpcs.length,
        npcs: allNpcs,
      }, null, 2), 'utf-8');
      
      saved += typeNpcs.length;
      
      // Кэшируем
      for (const npc of allNpcs) {
        this.npcCache.set((npc as { id: string }).id, npc);
      }
    }
    
    await this.idService.save();
    await this.updateManifest();
    
    return { saved, total: this.npcCache.size };
  }
  
  /**
   * Группировка NPC по speciesType
   */
  private groupNPCs(npcs: Array<{ id: string; speciesId?: string; [key: string]: unknown }>): Record<string, Array<{ id: string; speciesId?: string; [key: string]: unknown }>> {
    const grouped: Record<string, Array<{ id: string; speciesId?: string; [key: string]: unknown }>> = {};
    
    for (const npc of npcs) {
      const type = npc.speciesId || 'unknown';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(npc);
    }
    
    return grouped;
  }
  
  /**
   * Загрузить всех NPC
   */
  async loadNPCs(): Promise<Array<{ id: string; type?: string; [key: string]: unknown }>> {
    if (this.npcCache.size > 0) {
      return Array.from(this.npcCache.values()) as Array<{ id: string; type?: string; [key: string]: unknown }>;
    }
    
    const npcs: Array<{ id: string; type?: string; [key: string]: unknown }> = [];
    
    try {
      const npcsDir = path.join(DATA_DIR, 'npcs');
      const entries = await fs.readdir(npcsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(npcsDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.npcs && Array.isArray(data.npcs)) {
            npcs.push(...data.npcs);
            for (const npc of data.npcs) {
              this.npcCache.set(npc.id, npc);
            }
          }
        }
      }
    } catch {
      // Игнорируем ошибки
    }
    
    return npcs;
  }
  
  /**
   * Загрузить NPC по типу (speciesType)
   */
  async loadNPCsByType(type: string): Promise<Array<{ id: string; [key: string]: unknown }>> {
    const filePath = path.join(DATA_DIR, 'npcs', `${type}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.npcs || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Очистить NPC (все или по типу)
   */
  async clearNPCs(type?: string): Promise<{ deletedFiles: number; deletedObjects: number }> {
    let deletedFiles = 0;
    let deletedObjects = 0;
    
    if (type) {
      // Удаляем конкретный тип
      const filePath = path.join(DATA_DIR, 'npcs', `${type}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        deletedObjects = data.npcs?.length || 0;
        await fs.rm(filePath);
        deletedFiles = 1;
      } catch {
        // Файл не существует
      }
    } else {
      // Удаляем всех NPC
      const npcsDir = path.join(DATA_DIR, 'npcs');
      const result = await this.deleteDirectoryRecursive(npcsDir);
      deletedFiles = result.files;
      deletedObjects = result.objects;
      
      // Пересоздаём пустую директорию
      await fs.mkdir(npcsDir, { recursive: true });
    }
    
    // Очищаем кэш
    this.npcCache.clear();
    
    return { deletedFiles, deletedObjects };
  }
  
  // ==================== PRESET NPC ====================
  
  /**
   * Кэш preset NPC
   */
  private presetNpcCache = new Map<string, unknown>();
  
  /**
   * Сохранить preset NPC
   */
  async savePresetNPCs(
    npcs: Array<{ id: string; category?: string; [key: string]: unknown }>,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<{ saved: number; total: number }> {
    // Группируем по категории
    const grouped = this.groupPresetNPCs(npcs);
    
    let saved = 0;
    
    // Создаём директорию для preset NPC
    const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
    await fs.mkdir(presetDir, { recursive: true });
    
    for (const [category, categoryNpcs] of Object.entries(grouped)) {
      const filePath = path.join(presetDir, `${category}.json`);
      let allNpcs = categoryNpcs;
      
      if (mode === 'append') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const existing = JSON.parse(content);
          const existingIds = new Set(categoryNpcs.map(n => n.id));
          const filteredExisting = (existing.npcs || []).filter(
            (n: { id: string }) => !existingIds.has(n.id)
          );
          allNpcs = [...filteredExisting, ...categoryNpcs];
        } catch {
          // Файл не существует
        }
      }
      
      await fs.writeFile(filePath, JSON.stringify({
        version: '2.0',
        category,
        count: allNpcs.length,
        npcs: allNpcs,
      }, null, 2), 'utf-8');
      
      saved += categoryNpcs.length;
      
      // Кэшируем
      for (const npc of allNpcs) {
        this.presetNpcCache.set((npc as { id: string }).id, npc);
      }
    }
    
    await this.updateManifest();
    
    return { saved, total: this.presetNpcCache.size };
  }
  
  /**
   * Группировка preset NPC по категории
   */
  private groupPresetNPCs(npcs: Array<{ id: string; category?: string; [key: string]: unknown }>): Record<string, Array<{ id: string; category?: string; [key: string]: unknown }>> {
    const grouped: Record<string, Array<{ id: string; category?: string; [key: string]: unknown }>> = {};
    
    for (const npc of npcs) {
      const category = npc.category || 'misc';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(npc);
    }
    
    return grouped;
  }
  
  /**
   * Загрузить все preset NPC
   */
  async loadPresetNPCs(): Promise<Array<{ id: string; [key: string]: unknown }>> {
    if (this.presetNpcCache.size > 0) {
      return Array.from(this.presetNpcCache.values()) as Array<{ id: string; [key: string]: unknown }>;
    }
    
    const npcs: Array<{ id: string; [key: string]: unknown }> = [];
    
    try {
      const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
      console.log('[PresetStorage] Loading preset NPCs from:', presetDir);
      
      const entries = await fs.readdir(presetDir, { withFileTypes: true });
      console.log('[PresetStorage] Found entries:', entries.length, entries.map(e => e.name));
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(presetDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          console.log('[PresetStorage] Loaded file:', entry.name, 'with', data.npcs?.length || 0, 'NPCs');
          
          if (data.npcs && Array.isArray(data.npcs)) {
            npcs.push(...data.npcs);
            for (const npc of data.npcs) {
              this.presetNpcCache.set(npc.id, npc);
            }
          }
        }
      }
    } catch (error) {
      console.error('[PresetStorage] ERROR loading preset NPCs:', error);
      // Игнорируем ошибки
    }
    
    console.log('[PresetStorage] Total preset NPCs loaded:', npcs.length);
    
    return npcs;
  }
  
  /**
   * Загрузить preset NPC по категории
   */
  async loadPresetNPCsByCategory(category: string): Promise<Array<{ id: string; [key: string]: unknown }>> {
    const filePath = path.join(DATA_DIR, 'npcs', 'preset', `${category}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.npcs || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Получить preset NPC по ID
   */
  async getPresetNPCById(id: string): Promise<{ id: string; [key: string]: unknown } | undefined> {
    if (this.presetNpcCache.has(id)) {
      return this.presetNpcCache.get(id) as { id: string; [key: string]: unknown };
    }
    
    await this.loadPresetNPCs();
    return this.presetNpcCache.get(id) as { id: string; [key: string]: unknown } | undefined;
  }
  
  /**
   * Очистить preset NPC (все или по категории)
   */
  async clearPresetNPCs(category?: string): Promise<{ deletedFiles: number; deletedObjects: number }> {
    let deletedFiles = 0;
    let deletedObjects = 0;
    
    const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
    
    if (category) {
      const filePath = path.join(presetDir, `${category}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        deletedObjects = data.npcs?.length || 0;
        await fs.rm(filePath);
        deletedFiles = 1;
      } catch {
        // Файл не существует
      }
    } else {
      const result = await this.deleteDirectoryRecursive(presetDir);
      deletedFiles = result.files;
      deletedObjects = result.objects;
      
      // Пересоздаём пустую директорию
      await fs.mkdir(presetDir, { recursive: true });
    }
    
    // Очищаем кэш
    this.presetNpcCache.clear();
    
    return { deletedFiles, deletedObjects };
  }
  
  /**
   * Получить список категорий preset NPC
   */
  async getPresetNPCCategories(): Promise<string[]> {
    const categories: string[] = [];
    
    try {
      const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
      const entries = await fs.readdir(presetDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          categories.push(entry.name.replace('.json', ''));
        }
      }
    } catch {
      // Игнорируем ошибки
    }
    
    return categories;
  }
  
  // ==================== АНАЛИЗ ====================
  
  async analyzeStorage(): Promise<StorageStats> {
    const files: FileAnalysis[] = [];
    let totalSize = 0;
    let totalObjects = 0;
    
    await this.analyzeDirectoryRecursive(path.join(DATA_DIR, 'techniques'), files);
    
    for (const f of files) {
      totalSize += f.sizeBytes;
      totalObjects += f.objectCount;
    }
    
    const largest = files.reduce((max, f) => f.sizeBytes > max.sizeBytes ? f : max, files[0] || {
      path: '',
      sizeBytes: 0,
      objectCount: 0,
      avgObjectSize: 0,
      canAppend: true,
    });
    
    const needsSplit = files
      .filter(f => f.sizeBytes > RECOMMENDED_MAX_FILE_SIZE || f.objectCount > MAX_OBJECTS_PER_FILE)
      .map(f => f.path);
    
    return {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      totalObjects,
      largestFile: largest,
      recommendedMaxFileSize: RECOMMENDED_MAX_FILE_SIZE,
      filesNeedingSplit: needsSplit,
    };
  }
  
  private async analyzeDirectoryRecursive(dirPath: string, files: FileAnalysis[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.analyzeDirectoryRecursive(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const data = JSON.parse(content);
          const objectCount = data.techniques?.length || data.formations?.length || 0;
          
          files.push({
            path: fullPath,
            sizeBytes: stats.size,
            objectCount,
            avgObjectSize: objectCount > 0 ? Math.round(stats.size / objectCount) : 0,
            canAppend: stats.size < RECOMMENDED_MAX_FILE_SIZE && objectCount < MAX_OBJECTS_PER_FILE,
          });
        }
      }
    } catch {
      // Игнорируем
    }
  }
  
  // ==================== МАНИФЕСТ ====================
  
  private async updateManifest(): Promise<void> {
    const techniques = await this.loadTechniques();
    
    const byLevel: Record<number, number> = {};
    const byType: Record<string, number> = {};
    const bySubtype: Record<string, number> = {};
    const byElement: Record<string, number> = {};
    
    for (const tech of techniques) {
      byLevel[tech.level] = (byLevel[tech.level] || 0) + 1;
      byType[tech.type] = (byType[tech.type] || 0) + 1;
      
      if (tech.subtype) {
        bySubtype[tech.subtype] = (bySubtype[tech.subtype] || 0) + 1;
      }
      
      byElement[tech.element] = (byElement[tech.element] || 0) + 1;
    }
    
    const storageStats = await this.analyzeStorage();
    
    const manifest: PresetManifest = {
      version: '2.0',
      generatedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      techniques: {
        total: techniques.length,
        byLevel,
        byType,
        bySubtype,
        byElement,
      },
      formations: { total: 0, byLevel: {} },
      items: { total: 0 },
      npcs: { total: 0 },
      fileSizeStats: {
        techniquesBytes: storageStats.totalSizeBytes,
        largestFileBytes: storageStats.largestFile.sizeBytes,
        largestFileName: storageStats.largestFile.path,
      },
    };
    
    const manifestPath = path.join(DATA_DIR, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
  
  async getManifest(): Promise<PresetManifest | null> {
    try {
      const manifestPath = path.join(DATA_DIR, 'manifest.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  async hasGeneratedPresets(): Promise<boolean> {
    try {
      const manifest = await this.getManifest();
      return manifest !== null && manifest.techniques.total > 0;
    } catch {
      return false;
    }
  }
  
  clearCache(): void {
    this.techniqueCache.clear();
    this.formationCache.clear();
    this.itemCache.clear();
    this.npcCache.clear();
    this.loaded = false;
  }
}

// Экспорт синглтона
export const presetStorage = new PresetStorageService();
