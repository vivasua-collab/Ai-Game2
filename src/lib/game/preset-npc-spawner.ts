/**
 * ============================================================================
 * PRESET NPC SPAWNER - Сервис спавна предустановленных NPC
 * ============================================================================
 * 
 * Загружает preset NPC из JSON-файлов и создаёт их в базе данных сессии.
 * 
 * ИСПРАВЛЕНО: Теперь также добавляет NPC в TruthSystem для AI!
 */

import { db } from '@/lib/db';
import { presetStorage } from '@/lib/generator/preset-storage';
import { presetNPCToDBData, type PresetNPC } from '@/types/preset-npc';
import { logInfo, logError, logDebug } from '@/lib/logger';
import { TruthSystem } from '@/lib/game/truth-system';
import { createNPCStateFromPresetNPC, type NPCState } from '@/lib/game/types/npc-state';

// ==================== КОНСТАНТЫ ====================

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;

// ==================== ТИПЫ ====================

export interface SpawnPresetNPCsOptions {
  sessionId: string;
  locationId: string;
  category?: string;           // Категория NPC (story, sect_elder, merchant, etc.)
  presetIds?: string[];        // Конкретные ID пресетов для спавна
  excludeIds?: string[];       // ID пресетов для исключения
  limit?: number;              // Максимальное количество
  randomize?: boolean;         // Случайный выбор из пресетов
}

export interface SpawnedPresetNPC {
  id: string;                  // ID в базе данных
  presetId: string;            // ID пресета
  name: string;
  title?: string;
  locationId: string;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Спавнит preset NPC в указанную локацию
 */
export async function spawnPresetNPCs(
  options: SpawnPresetNPCsOptions
): Promise<SpawnedPresetNPC[]> {
  const { sessionId, locationId, category, presetIds, excludeIds, limit } = options;
  
  console.log('[PRESET_SPAWNER] Starting spawn with options:', {
    sessionId, locationId, category, presetIds, excludeIds, limit
  });
  
  try {
    // 1. Загружаем пресеты
    let presetNPCs = await presetStorage.loadPresetNPCs();
    
    console.log('[PRESET_SPAWNER] Loaded preset NPCs:', presetNPCs.length);
    
    await logDebug('PRESET_SPAWNER', `Loaded ${presetNPCs.length} preset NPCs`);
    
    // 2. Фильтруем по категории
    if (category) {
      presetNPCs = presetNPCs.filter(npc => 
        (npc as PresetNPC).category === category
      );
      console.log('[PRESET_SPAWNER] After category filter:', presetNPCs.length);
    }
    
    // 3. Фильтруем по конкретным ID
    if (presetIds && presetIds.length > 0) {
      presetNPCs = presetNPCs.filter(npc =>
        presetIds.includes((npc as PresetNPC).id)
      );
    }
    
    // 4. Исключаем указанные ID
    if (excludeIds && excludeIds.length > 0) {
      presetNPCs = presetNPCs.filter(npc =>
        !excludeIds.includes((npc as PresetNPC).id)
      );
    }
    
    // 5. Случайный выбор (перемешивание)
    if (options.randomize) {
      // Fisher-Yates shuffle
      for (let i = presetNPCs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [presetNPCs[i], presetNPCs[j]] = [presetNPCs[j], presetNPCs[i]];
      }
    }
    
    // 6. Ограничиваем количество
    if (limit && limit > 0) {
      presetNPCs = presetNPCs.slice(0, limit);
    }
    
    if (presetNPCs.length === 0) {
      console.log('[PRESET_SPAWNER] No preset NPCs to spawn after filtering');
      await logInfo('PRESET_SPAWNER', 'No preset NPCs to spawn', { options });
      return [];
    }
    
    console.log('[PRESET_SPAWNER] After all filters:', presetNPCs.length, 'presets to spawn');
    
    // 6. Проверяем, не существуют ли уже эти NPC в сессии
    const existingNPCs = await db.nPC.findMany({
      where: {
        sessionId,
        presetId: { in: presetNPCs.map(n => (n as PresetNPC).id) },
      },
      select: { presetId: true },
    });
    
    console.log('[PRESET_SPAWNER] Existing NPCs in session:', existingNPCs.length);
    
    const existingPresetIds = new Set(existingNPCs.map(n => n.presetId));
    const newPresetNPCs = presetNPCs.filter(npc => 
      !existingPresetIds.has((npc as PresetNPC).id)
    );
    
    console.log('[PRESET_SPAWNER] New presets to create:', newPresetNPCs.length);
    
    if (newPresetNPCs.length === 0) {
      await logInfo('PRESET_SPAWNER', 'All preset NPCs already spawned', { 
        count: existingNPCs.length 
      });
      return existingNPCs.map(n => ({
        id: n.id,
        presetId: n.presetId!,
        name: 'Existing',
        locationId,
      }));
    }
    
    // 7. Создаём NPC в базе
    const createdNPCs: SpawnedPresetNPC[] = [];
    
    // Получаем TruthSystem для добавления NPC
    const truthSystem = TruthSystem.getInstance();
    
    for (const presetData of newPresetNPCs) {
      const preset = presetData as PresetNPC;
      
      console.log('[PRESET_SPAWNER] Creating NPC:', preset.name, 'presetId:', preset.id);
      
      try {
        // === ГЕНЕРАЦИЯ ПОЗИЦИИ ===
        // NPC должны быть БЛИЗКО к игроку для активации AI!
        // Игрок появляется в центре (800, 600), NPCs в радиусе 100-250 пикселей
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 150;  // 100-250 пикселей от центра
        const centerX = WORLD_WIDTH / 2;   // 800
        const centerY = WORLD_HEIGHT / 2;  // 600
        const positionX = Math.round(centerX + Math.cos(angle) * distance);
        const positionY = Math.round(centerY + Math.sin(angle) * distance);
        
        const dbData = presetNPCToDBData(preset, sessionId, locationId);
        
        console.log('[PRESET_SPAWNER] DB data prepared:', {
          name: dbData.name,
          cultivationLevel: dbData.cultivationLevel,
          sessionId: dbData.sessionId,
          locationId: dbData.locationId,
          position: `(${positionX}, ${positionY})`
        });
        
        const dbNPC = await db.nPC.create({
          data: dbData,
        });
        
        console.log('[PRESET_SPAWNER] NPC created successfully:', dbNPC.id);
        
        // === ДОБАВЛЕНИЕ В TRUTH SYSTEM ===
        // Создаём NPCState для AI
        const npcState = createNPCStateFromPresetNPC({
          id: dbNPC.id,
          presetId: preset.id,
          name: preset.name,
          speciesId: preset.speciesId || 'human',
          speciesType: preset.speciesType || 'human',
          roleId: preset.roleId || 'civilian',
          cultivation: {
            level: preset.cultivation?.level ?? 1,
            subLevel: preset.cultivation?.subLevel ?? 0,
            currentQi: preset.cultivation?.currentQi ?? 100,
            coreCapacity: preset.cultivation?.coreCapacity ?? 100,
          },
          position: { x: positionX, y: positionY },
          locationId: locationId,
          stats: preset.stats,
          personality: {
            disposition: preset.relations?.defaultPlayerDisposition ?? 0,
            aggressionLevel: preset.roleId?.includes('guard') || preset.roleId?.includes('monster') ? 60 : 10,
          },
        });
        
        // Добавляем в TruthSystem
        truthSystem.addNPC(sessionId, npcState);
        console.log('[PRESET_SPAWNER] NPC added to TruthSystem:', dbNPC.id, 'at position', `(${positionX}, ${positionY})`);
        
        createdNPCs.push({
          id: dbNPC.id,
          presetId: preset.id,
          name: preset.name,
          title: preset.title,
          locationId,
        });
        
        await logDebug('PRESET_SPAWNER', `Spawned preset NPC: ${preset.name}`, {
          presetId: preset.id,
          dbId: dbNPC.id,
          position: { x: positionX, y: positionY },
        });
      } catch (createError) {
        const errorDetails = {
          message: createError instanceof Error ? createError.message : String(createError),
          name: createError instanceof Error ? createError.name : 'Unknown',
          stack: createError instanceof Error ? createError.stack : undefined,
          // @ts-expect-error Prisma error has code property
          code: createError?.code || 'unknown',
          // @ts-expect-error Prisma error has meta property
          meta: createError?.meta || {},
          presetId: preset.id,
          npcName: preset.name,
        };
        console.error('[PRESET_SPAWNER] FAILED to create NPC:', preset.name, {
          errorName: createError instanceof Error ? createError.name : 'Unknown',
          errorMessage: createError instanceof Error ? createError.message : String(createError),
          // @ts-expect-error Prisma error properties
          code: createError?.code,
          meta: createError?.meta,
        });
        await logError('PRESET_SPAWNER', `Failed to spawn NPC ${preset.id}`, errorDetails);
      }
    }
    
    await logInfo('PRESET_SPAWNER', `Spawned ${createdNPCs.length} preset NPCs`, {
      sessionId,
      locationId,
      category,
    });
    
    return createdNPCs;
  } catch (error) {
    await logError('PRESET_SPAWNER', 'Failed to spawn preset NPCs', {
      error: error instanceof Error ? error.message : String(error),
      options,
    });
    return [];
  }
}

/**
 * Спавнит сюжетные NPC в указанную локацию
 * Выбирает случайных 5 из всех доступных preset NPC
 */
export async function spawnStoryNPCs(
  sessionId: string,
  locationId: string
): Promise<SpawnedPresetNPC[]> {
  return spawnPresetNPCs({
    sessionId,
    locationId,
    category: 'story',
    limit: 5,           // Только 5 NPC
    randomize: true,    // Случайный выбор из 20
  });
}

/**
 * Получает список всех доступных preset NPC
 */
export async function getAvailablePresetNPCs(): Promise<PresetNPC[]> {
  const npcs = await presetStorage.loadPresetNPCs();
  return npcs as PresetNPC[];
}

/**
 * Получает preset NPC по ID
 */
export async function getPresetNPC(presetId: string): Promise<PresetNPC | null> {
  const npc = await presetStorage.getPresetNPCById(presetId);
  return npc as PresetNPC | null;
}

/**
 * Получает preset NPC по категории
 */
export async function getPresetNPCsByCategory(category: string): Promise<PresetNPC[]> {
  const npcs = await presetStorage.loadPresetNPCsByCategory(category);
  return npcs as PresetNPC[];
}
