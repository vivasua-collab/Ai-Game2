/**
 * ============================================================================
 * API СПАВНА NPC
 * ============================================================================
 * 
 * Unified API для спавна обоих типов NPC:
 * - Preset NPC (предустановленные персонажи)
 * - Generated NPC (временные статисты)
 * 
 * Endpoints:
 * - POST {action: 'spawn', ...} - спавн NPC в локацию
 * - GET ?action=list&sessionId&locationId - список NPC в локации
 * - GET ?action=get&sessionId&npcId - данные конкретного NPC
 * - POST {action: 'remove', sessionId, npcId} - удалить NPC
 * - GET ?action=presets - список доступных пресетов
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { presetStorage } from '@/lib/generator/preset-storage';
import { spawnPresetNPCs, spawnStoryNPCs } from '@/lib/game/preset-npc-spawner';
import { 
  tempNPCToClient, 
  isTempNPCId,
  type TempNPC 
} from '@/types/temp-npc';
import {
  isPresetNPCId,
  presetNPCToDBData,
  presetNPCToClient,
  type PresetNPC,
  type PresetNPCClientView,
} from '@/types/preset-npc';

// ==================== TYPES ====================

/**
 * Union type для клиентского представления NPC
 */
type NPCClientView = (PresetNPCClientView & { isPreset: true }) | (ReturnType<typeof tempNPCToClient> & { isPreset: false });

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const sessionId = searchParams.get('sessionId');
  const locationId = searchParams.get('locationId');
  const npcId = searchParams.get('npcId');

  try {
    switch (action) {
      case 'list': {
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId is required',
          }, { status: 400 });
        }
        
        const npcs: NPCClientView[] = [];
        
        // 1. Загружаем preset NPC из БД
        const dbNpcs = await db.nPC.findMany({
          where: locationId ? { sessionId, locationId } : { sessionId },
        });
        
        for (const dbNpc of dbNpcs) {
          npcs.push({
            id: dbNpc.id,
            isPreset: true as const,
            name: dbNpc.name,
            title: dbNpc.title || undefined,
            age: dbNpc.age,
            gender: 'male' as const,
            speciesId: 'human',
            roleId: dbNpc.role || 'unknown',
            stats: {
              strength: dbNpc.strength,
              agility: dbNpc.agility,
              intelligence: dbNpc.intelligence,
              conductivity: dbNpc.conductivity,
            },
            cultivation: {
              level: dbNpc.cultivationLevel,
              subLevel: dbNpc.cultivationSubLevel,
              coreCapacity: dbNpc.coreCapacity,
              currentQi: dbNpc.currentQi,
            },
            personality: {
              traits: [],
              motivation: dbNpc.motivation || '',
            },
            sectId: dbNpc.sectId || undefined,
            sectRole: dbNpc.role || undefined,
            equipment: {},
            techniques: [],
            importance: 'normal',
            tags: [],
          });
        }
        
        // 2. Загружаем generated NPC из памяти
        const tempNpcs = locationId
          ? sessionNPCManager.getLocationNPCs(sessionId, locationId)
          : sessionNPCManager.getAllSessionNPCs(sessionId);
        
        for (const tempNpc of tempNpcs) {
          const clientView = tempNPCToClient(tempNpc);
          npcs.push({ ...clientView, isPreset: false as const });
        }
        
        return NextResponse.json({
          success: true,
          npcs,
          total: npcs.length,
          breakdown: {
            preset: npcs.filter(n => n.isPreset).length,
            generated: npcs.filter(n => !n.isPreset).length,
          },
        });
      }
      
      case 'get': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        if (isTempNPCId(npcId)) {
          const npc = sessionNPCManager.getNPC(sessionId, npcId);
          
          if (!npc) {
            return NextResponse.json({
              success: false,
              error: 'NPC not found',
            }, { status: 404 });
          }
          
          return NextResponse.json({
            success: true,
            npc: tempNPCToClient(npc),
            type: 'generated',
          });
        } else {
          const dbNpc = await db.nPC.findFirst({
            where: { id: npcId, sessionId },
          });
          
          if (!dbNpc) {
            return NextResponse.json({
              success: false,
              error: 'NPC not found',
            }, { status: 404 });
          }
          
          return NextResponse.json({
            success: true,
            npc: {
              id: dbNpc.id,
              isPreset: true,
              name: dbNpc.name,
              title: dbNpc.title,
              age: dbNpc.age,
              gender: 'male' as const,
              speciesId: 'human',
              roleId: dbNpc.role || 'unknown',
              stats: {
                strength: dbNpc.strength,
                agility: dbNpc.agility,
                intelligence: dbNpc.intelligence,
                conductivity: dbNpc.conductivity,
              },
              cultivation: {
                level: dbNpc.cultivationLevel,
                subLevel: dbNpc.cultivationSubLevel,
                coreCapacity: dbNpc.coreCapacity,
                currentQi: dbNpc.currentQi,
              },
              personality: {
                traits: [],
                motivation: dbNpc.motivation || '',
              },
              sectId: dbNpc.sectId || undefined,
              sectRole: dbNpc.role || undefined,
              equipment: {},
              techniques: [],
              importance: 'normal',
              tags: [],
            },
            type: 'preset',
          });
        }
      }
      
      case 'presets': {
        const categories = await presetStorage.getPresetNPCCategories();
        const allPresets = await presetStorage.loadPresetNPCs();

        // Возвращаем ПОЛНЫЕ данные preset NPC
        const presetsWithFullData = allPresets.map(p => {
          const preset = p as unknown as PresetNPC;
          return presetNPCToClient(preset);
        });

        return NextResponse.json({
          success: true,
          categories,
          presets: presetsWithFullData,
          total: allPresets.length,
        });
      }
      
      case 'stats': {
        const tempStats = sessionNPCManager.getStats();
        const categories = await presetStorage.getPresetNPCCategories();
        
        return NextResponse.json({
          success: true,
          tempNPCs: tempStats,
          presetCategories: categories,
        });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: list, get, presets, stats',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[NPC Spawn API] GET Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, locationId, npcId, presetId, generateConfig, updates } = body;

    switch (action) {
      case 'spawn': {
        if (!sessionId || !locationId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and locationId are required',
          }, { status: 400 });
        }
        
        if (presetId) {
          return await spawnPresetNPC(sessionId, locationId, presetId);
        } else if (generateConfig) {
          return await spawnGeneratedNPC(sessionId, locationId, generateConfig);
        } else {
          return NextResponse.json({
            success: false,
            error: 'Either presetId or generateConfig is required',
          }, { status: 400 });
        }
      }
      
      case 'spawn_story_npcs': {
        if (!sessionId || !locationId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and locationId are required',
          }, { status: 400 });
        }
        
        const spawned = await spawnStoryNPCs(sessionId, locationId);
        
        return NextResponse.json({
          success: true,
          type: 'preset',
          npcs: spawned,
          total: spawned.length,
          message: `Spawned ${spawned.length} story NPCs`,
        });
      }
      
      case 'spawn_all_presets': {
        if (!sessionId || !locationId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and locationId are required',
          }, { status: 400 });
        }
        
        const body2 = body as { category?: string; presetIds?: string[] };
        const spawned = await spawnPresetNPCs({
          sessionId,
          locationId,
          category: body2.category,
          presetIds: body2.presetIds,
        });
        
        return NextResponse.json({
          success: true,
          type: 'preset',
          npcs: spawned,
          total: spawned.length,
          message: `Spawned ${spawned.length} preset NPCs`,
        });
      }
      
      case 'remove': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        if (isTempNPCId(npcId)) {
          const result = sessionNPCManager.removeNPC(sessionId, npcId);
          
          if (!result) {
            return NextResponse.json({
              success: false,
              error: 'NPC not found',
            }, { status: 404 });
          }
          
          return NextResponse.json({
            success: true,
            type: 'generated',
            loot: result.loot,
            xp: result.xp,
            message: `NPC removed, dropped ${result.loot.length} items, ${result.xp} XP`,
          });
        } else {
          const deleted = await db.nPC.deleteMany({
            where: { id: npcId, sessionId },
          });
          
          if (deleted.count === 0) {
            return NextResponse.json({
              success: false,
              error: 'NPC not found',
            }, { status: 404 });
          }
          
          return NextResponse.json({
            success: true,
            type: 'preset',
            message: 'NPC removed from database',
          });
        }
      }
      
      case 'update': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        if (isTempNPCId(npcId)) {
          const npc = sessionNPCManager.updateNPC(sessionId, npcId, updates || {});
          
          if (!npc) {
            return NextResponse.json({
              success: false,
              error: 'NPC not found',
            }, { status: 404 });
          }
          
          return NextResponse.json({
            success: true,
            npc: tempNPCToClient(npc),
            type: 'generated',
          });
        } else {
          const updated = await db.nPC.update({
            where: { id: npcId },
            data: updates,
          });
          
          return NextResponse.json({
            success: true,
            npc: {
              id: updated.id,
              name: updated.name,
              title: updated.title,
            },
            type: 'preset',
          });
        }
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: spawn, spawn_story_npcs, spawn_all_presets, remove, update',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[NPC Spawn API] POST Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ==================== HELPER FUNCTIONS ====================

async function spawnPresetNPC(
  sessionId: string,
  locationId: string,
  presetId: string
): Promise<NextResponse> {
  const presetData = await presetStorage.getPresetNPCById(presetId);
  
  if (!presetData) {
    return NextResponse.json({
      success: false,
      error: `Preset NPC not found: ${presetId}`,
    }, { status: 404 });
  }
  
  // Safely cast preset data
  const preset = presetData as unknown as PresetNPC;
  
  const existing = await db.nPC.findFirst({
    where: { 
      sessionId, 
      name: preset.name,
    },
  });
  
  if (existing) {
    return NextResponse.json({
      success: false,
      error: 'NPC already spawned in this session',
      existingNPC: {
        id: existing.id,
        name: existing.name,
        locationId: existing.locationId,
      },
    }, { status: 400 });
  }
  
  const dbData = presetNPCToDBData(preset, sessionId, locationId);
  
  const dbNpc = await db.nPC.create({
    data: dbData,
  });
  
  return NextResponse.json({
    success: true,
    type: 'preset',
    npcs: [presetNPCToClient({ ...preset, id: dbNpc.id })],
    message: `Spawned preset NPC: ${preset.name}`,
  });
}

async function spawnGeneratedNPC(
  sessionId: string,
  locationId: string,
  config: {
    count?: number;
    speciesType?: string;
    roleType?: string;
    levelRange?: { min: number; max: number };
    locationPreset?: string;
    playerLevel?: number;
  }
): Promise<NextResponse> {
  const count = Math.min(10, Math.max(1, config.count || 1));
  const playerLevel = config.playerLevel || 1;
  
  if (config.locationPreset) {
    const npcs = await sessionNPCManager.initializeLocation(
      sessionId,
      locationId,
      config.locationPreset,
      playerLevel
    );
    
    return NextResponse.json({
      success: true,
      type: 'generated',
      npcs: npcs.map(tempNPCToClient),
      total: npcs.length,
      message: `Generated ${npcs.length} temporary NPCs using ${config.locationPreset} preset`,
    });
  }
  
  const npcs: TempNPC[] = [];
  
  for (let i = 0; i < count; i++) {
    const tempNpcs = await sessionNPCManager.initializeLocation(
      sessionId,
      locationId,
      {
        id: 'custom',
        name: 'Custom',
        population: { min: 1, max: 1 },
        allowedSpecies: [
          { type: (config.speciesType as any) || 'humanoid', weight: 100 },
        ],
        allowedRoles: [
          { type: (config.roleType as any) || 'social', weight: 100 },
        ],
        levelRange: config.levelRange || { min: 1, max: 3 },
        behavior: { defaultDisposition: 50 },
        loot: { dropRate: 0.2, dropFromEquipment: true, dropFromQuickSlots: true },
      },
      playerLevel
    );
    
    npcs.push(...tempNpcs);
  }
  
  return NextResponse.json({
    success: true,
    type: 'generated',
    npcs: npcs.map(tempNPCToClient),
    total: npcs.length,
    message: `Generated ${npcs.length} temporary NPCs`,
  });
}
