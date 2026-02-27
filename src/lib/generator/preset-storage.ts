/**
 * Сервис хранения пресетов
 * Сохраняет сгенерированные объекты в JSON-файлы
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GeneratedTechnique } from './technique-generator';

const DATA_DIR = path.join(process.cwd(), 'data', 'presets');

export interface PresetManifest {
  version: string;
  generatedAt: string;
  techniques: {
    total: number;
    byLevel: Record<number, number>;
    byType: Record<string, number>;
    byElement: Record<string, number>;
  };
  items: {
    total: number;
  };
  npcs: {
    total: number;
  };
}

export class PresetStorageService {
  private cache = new Map<string, GeneratedTechnique>();
  private loaded = false;

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'techniques'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'items'), { recursive: true });
      await fs.mkdir(path.join(DATA_DIR, 'npcs'), { recursive: true });
    } catch (error) {
      console.error('[PresetStorage] Initialize error:', error);
    }
  }

  async saveTechniques(techniques: GeneratedTechnique[]): Promise<void> {
    // Группируем по уровню
    const byLevel: Record<number, GeneratedTechnique[]> = {};
    
    for (const tech of techniques) {
      if (!byLevel[tech.level]) byLevel[tech.level] = [];
      byLevel[tech.level].push(tech);
    }
    
    // Сохраняем каждый уровень в отдельный файл
    for (const [level, techs] of Object.entries(byLevel)) {
      const filePath = path.join(DATA_DIR, 'techniques', `level-${level}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        version: '1.0',
        level: parseInt(level),
        count: techs.length,
        techniques: techs,
      }, null, 2), 'utf-8');
      
      // Кэшируем
      for (const tech of techs) {
        this.cache.set(tech.id, tech);
      }
    }
    
    // Обновляем манифест
    await this.updateManifest(techniques);
  }

  async loadTechniques(): Promise<GeneratedTechnique[]> {
    if (this.loaded) {
      return Array.from(this.cache.values());
    }
    
    const techniques: GeneratedTechnique[] = [];
    
    try {
      for (let level = 1; level <= 9; level++) {
        const filePath = path.join(DATA_DIR, 'techniques', `level-${level}.json`);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.techniques) {
            techniques.push(...data.techniques);
            for (const tech of data.techniques) {
              this.cache.set(tech.id, tech);
            }
          }
        } catch {
          // Файл не существует
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
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    await this.loadTechniques();
    return this.cache.get(id);
  }

  private async updateManifest(techniques: GeneratedTechnique[]): Promise<void> {
    const byLevel: Record<number, number> = {};
    const byType: Record<string, number> = {};
    const byElement: Record<string, number> = {};
    
    for (const tech of techniques) {
      byLevel[tech.level] = (byLevel[tech.level] || 0) + 1;
      byType[tech.type] = (byType[tech.type] || 0) + 1;
      byElement[tech.element] = (byElement[tech.element] || 0) + 1;
    }
    
    const manifest: PresetManifest = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      techniques: {
        total: techniques.length,
        byLevel,
        byType,
        byElement,
      },
      items: { total: 0 },
      npcs: { total: 0 },
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
    this.cache.clear();
    this.loaded = false;
  }
}

export const presetStorage = new PresetStorageService();
