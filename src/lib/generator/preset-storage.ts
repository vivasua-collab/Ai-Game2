/**
 * ============================================================================
 * СЕРВИС ХРАНЕНИЯ ПРЕСЕТОВ
 * ============================================================================
 * 
 * Сохраняет сгенерированные объекты в JSON-файлы.
 * 
 * Особенности:
 * - Система ID с префиксом и счётчиком
 * - Добавочная генерация (append mode)
 * - Контроль счётчиков при удалении
 * - Анализ размера файлов
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GeneratedTechnique } from './technique-generator';

// Каталог для хранения сгенерированных данных (отдельно от кода)
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
  counters: Record<string, number>;
}

export interface FileAnalysis {
  path: string;
  sizeBytes: number;
  objectCount: number;
  avgObjectSize: number;
  canAppend: boolean;  // true if < recommended max size
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalObjects: number;
  largestFile: FileAnalysis;
  recommendedMaxFileSize: number;  // 5 MB
  filesNeedingSplit: string[];
}

// Константы
const RECOMMENDED_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_SIZE_HARD_LIMIT = 10 * 1024 * 1024; // 10 MB hard limit
const MAX_OBJECTS_PER_FILE = 10000; // Рекомендуемый лимит объектов в файле

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
  
  /**
   * Генерация нового ID с инкрементом счётчика
   */
  generateId(prefix: string): string {
    const counter = (this.counters[prefix] || 0) + 1;
    this.counters[prefix] = counter;
    return `${prefix}_${counter.toString().padStart(6, '0')}`;
  }
  
  /**
   * Получить текущее значение счётчика
   */
  getCounter(prefix: string): number {
    return this.counters[prefix] || 0;
  }
  
  /**
   * Установить значение счётчика (для миграции)
   */
  setCounter(prefix: string, value: number): void {
    this.counters[prefix] = value;
  }
  
  /**
   * Сохранить счётчики в файл
   */
  async save(): Promise<void> {
    const data: IdCounters = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      counters: this.counters,
    };
    await fs.writeFile(this.countersPath, JSON.stringify(data, null, 2), 'utf-8');
  }
  
  /**
   * Сбросить все счётчики в 0
   */
  resetAll(): void {
    this.counters = {};
  }
  
  /**
   * Сбросить конкретный счётчик
   */
  reset(prefix: string): void {
    delete this.counters[prefix];
  }
  
  /**
   * Сохранить счётчики при очистке данных
   * (чтобы избежать дублирования ID при следующей генерации)
   */
  preserveCounters(): Record<string, number> {
    return { ...this.counters };
  }
  
  /**
   * Восстановить счётчики
   */
  restoreCounters(counters: Record<string, number>): void {
    this.counters = { ...counters };
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
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'techniques'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'formations'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'items'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'npcs'), { recursive: true });
      
      await this.idService.initialize();
    } catch (error) {
      console.error('[PresetStorage] Initialize error:', error);
    }
  }
  
  // ==================== ID SERVICE ====================
  
  generateId(prefix: string): string {
    return this.idService.generateId(prefix);
  }
  
  async saveCounters(): Promise<void> {
    await this.idService.save();
  }
  
  // ==================== ТЕХНИКИ ====================
  
  /**
   * Сохранить техники (с перезаписью или добавлением)
   */
  async saveTechniques(techniques: GeneratedTechnique[], mode: 'replace' | 'append' = 'replace'): Promise<{
    saved: number;
    appended: number;
    total: number;
  }> {
    let existing: GeneratedTechnique[] = [];
    let appended = 0;
    
    if (mode === 'append') {
      existing = await this.loadTechniques();
      appended = techniques.length;
    }
    
    const allTechniques = mode === 'append' 
      ? [...existing, ...techniques]
      : techniques;
    
    // Группируем по уровню
    const byLevel: Record<number, GeneratedTechnique[]> = {};
    
    for (const tech of allTechniques) {
      if (!byLevel[tech.level]) byLevel[tech.level] = [];
      byLevel[tech.level].push(tech);
    }
    
    // Проверяем размер файлов и при необходимости разбиваем
    for (const [level, techs] of Object.entries(byLevel)) {
      const levelNum = parseInt(level);
      
      // Если объектов слишком много для одного файла - разбиваем
      if (techs.length > MAX_OBJECTS_PER_FILE) {
        await this.saveTechniquesInChunks(levelNum, techs);
      } else {
        await this.saveTechniquesForLevel(levelNum, techs);
      }
      
      // Кэшируем
      for (const tech of techs) {
        this.techniqueCache.set(tech.id, tech);
      }
    }
    
    // Сохраняем счётчики
    await this.idService.save();
    
    // Обновляем манифест
    await this.updateManifest(allTechniques);
    
    return {
      saved: techniques.length,
      appended,
      total: allTechniques.length,
    };
  }
  
  /**
   * Сохранить техники для уровня в один файл
   */
  private async saveTechniquesForLevel(level: number, techniques: GeneratedTechnique[]): Promise<void> {
    const filePath = path.join(DATA_DIR, 'techniques', `level-${level}.json`);
    await fs.writeFile(filePath, JSON.stringify({
      version: '1.0',
      level,
      count: techniques.length,
      techniques,
    }, null, 2), 'utf-8');
  }
  
  /**
   * Сохранить техники в несколько файлов (для больших объёмов)
   */
  private async saveTechniquesInChunks(level: number, techniques: GeneratedTechnique[]): Promise<void> {
    const chunkCount = Math.ceil(techniques.length / MAX_OBJECTS_PER_FILE);
    
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      const start = chunk * MAX_OBJECTS_PER_FILE;
      const end = Math.min(start + MAX_OBJECTS_PER_FILE, techniques.length);
      const chunkTechniques = techniques.slice(start, end);
      
      const filePath = path.join(DATA_DIR, 'techniques', `level-${level}_part${chunk + 1}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        version: '1.0',
        level,
        part: chunk + 1,
        totalParts: chunkCount,
        count: chunkTechniques.length,
        techniques: chunkTechniques,
      }, null, 2), 'utf-8');
    }
    
    // Удаляем старый неразбитый файл если есть
    try {
      await fs.unlink(path.join(DATA_DIR, 'techniques', `level-${level}.json`));
    } catch {
      // Игнорируем ошибку если файла нет
    }
  }
  
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
      const files = await fs.readdir(techniquesDir);
      
      for (const file of files) {
        if (!file.endsWith('.json') || file === 'index.json') continue;
        
        const filePath = path.join(techniquesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        if (data.techniques) {
          techniques.push(...data.techniques);
          for (const tech of data.techniques) {
            this.techniqueCache.set(tech.id, tech);
          }
        }
      }
      
      this.loaded = true;
    } catch (error) {
      console.error('[PresetStorage] Load error:', error);
    }
    
    return techniques;
  }
  
  async getTechniquesByLevel(level: number): Promise<GeneratedTechnique[]> {
    const all = await this.loadTechniques();
    return all.filter(t => t.level === level);
  }
  
  async getTechniqueById(id: string): Promise<GeneratedTechnique | undefined> {
    if (this.techniqueCache.has(id)) {
      return this.techniqueCache.get(id);
    }
    
    await this.loadTechniques();
    return this.techniqueCache.get(id);
  }
  
  // ==================== ФОРМАЦИИ ====================
  
  async saveFormations(formations: unknown[], mode: 'replace' | 'append' = 'replace'): Promise<number> {
    const filePath = path.join(DATA_DIR, 'formations', 'all.json');
    let allFormations = formations;
    
    if (mode === 'append') {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const existing = JSON.parse(content);
        allFormations = [...existing.formations, ...formations];
      } catch {
        // Файл не существует
      }
    }
    
    await fs.writeFile(filePath, JSON.stringify({
      version: '1.0',
      count: allFormations.length,
      formations: allFormations,
    }, null, 2), 'utf-8');
    
    return allFormations.length;
  }
  
  // ==================== УДАЛЕНИЕ ====================
  
  /**
   * Полное удаление всех данных
   * @param preserveCounters - сохранить счётчики ID (рекомендуется)
   */
  async clearAll(preserveCounters: boolean = true): Promise<{
    deletedFiles: number;
    countersPreserved: boolean;
  }> {
    const preservedCounters = this.idService.preserveCounters();
    let deletedFiles = 0;
    
    // Удаляем файлы техник
    try {
      const techniquesDir = path.join(DATA_DIR, 'techniques');
      const files = await fs.readdir(techniquesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(techniquesDir, file));
          deletedFiles++;
        }
      }
    } catch {
      // Игнорируем
    }
    
    // Удаляем файлы формаций
    try {
      const formationsDir = path.join(DATA_DIR, 'formations');
      const files = await fs.readdir(formationsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(formationsDir, file));
          deletedFiles++;
        }
      }
    } catch {
      // Игнорируем
    }
    
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
    
    return {
      deletedFiles,
      countersPreserved: preserveCounters,
    };
  }
  
  // ==================== АНАЛИЗ ====================
  
  /**
   * Анализ размера файлов
   */
  async analyzeStorage(): Promise<StorageStats> {
    const files: FileAnalysis[] = [];
    let totalSize = 0;
    let totalObjects = 0;
    
    // Анализируем техники
    try {
      const techniquesDir = path.join(DATA_DIR, 'techniques');
      const fileList = await fs.readdir(techniquesDir);
      
      for (const file of fileList) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(techniquesDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const objectCount = data.techniques?.length || 0;
        
        files.push({
          path: filePath,
          sizeBytes: stats.size,
          objectCount,
          avgObjectSize: objectCount > 0 ? Math.round(stats.size / objectCount) : 0,
          canAppend: stats.size < RECOMMENDED_MAX_FILE_SIZE && objectCount < MAX_OBJECTS_PER_FILE,
        });
        
        totalSize += stats.size;
        totalObjects += objectCount;
      }
    } catch {
      // Игнорируем
    }
    
    // Находим самый большой файл
    const largest = files.reduce((max, f) => f.sizeBytes > max.sizeBytes ? f : max, files[0] || {
      path: '',
      sizeBytes: 0,
      objectCount: 0,
      avgObjectSize: 0,
      canAppend: true,
    });
    
    // Файлы, требующие разбиения
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
  
  /**
   * Анализ конкретного файла
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const objectCount = data.techniques?.length || data.formations?.length || 0;
      
      return {
        path: filePath,
        sizeBytes: stats.size,
        objectCount,
        avgObjectSize: objectCount > 0 ? Math.round(stats.size / objectCount) : 0,
        canAppend: stats.size < RECOMMENDED_MAX_FILE_SIZE && objectCount < MAX_OBJECTS_PER_FILE,
      };
    } catch {
      return null;
    }
  }
  
  // ==================== МАНИФЕСТ ====================
  
  private async updateManifest(techniques: GeneratedTechnique[]): Promise<void> {
    const byLevel: Record<number, number> = {};
    const byType: Record<string, number> = {};
    const byElement: Record<string, number> = {};
    
    for (const tech of techniques) {
      byLevel[tech.level] = (byLevel[tech.level] || 0) + 1;
      byType[tech.type] = (byType[tech.type] || 0) + 1;
      byElement[tech.element] = (byElement[tech.element] || 0) + 1;
    }
    
    const storageStats = await this.analyzeStorage();
    
    const manifest: PresetManifest = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      techniques: {
        total: techniques.length,
        byLevel,
        byType,
        byElement,
      },
      formations: {
        total: 0,
        byLevel: {},
      },
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
    this.loaded = false;
  }
}

export const presetStorage = new PresetStorageService();
