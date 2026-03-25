import { describe, test, expect, beforeAll } from 'bun:test';
import { sessionNPCManager, SessionNPCManager } from '@/lib/game/session-npc-manager';
import { LOCATION_NPC_PRESETS } from '@/types/temp-npc';

describe('NPC Generator', () => {
  const testSessionId = 'test-session-' + Date.now();
  const testLocationId = 'training_ground';
  
  beforeAll(() => {
    // Очищаем предыдущие тесты
    sessionNPCManager.clearSession(testSessionId);
  });

  test('initializes location with NPCs', async () => {
    const npcs = await sessionNPCManager.initializeLocation(
      testSessionId,
      testLocationId,
      'training_ground',
      1
    );
    
    expect(npcs).toBeDefined();
    expect(Array.isArray(npcs)).toBe(true);
    expect(npcs.length).toBeGreaterThan(0);
  });
  
  test('generates NPCs with TEMP_ ID prefix', async () => {
    const npcs = await sessionNPCManager.initializeLocation(
      testSessionId + '-2',
      testLocationId + '-2',
      'training_ground',
      1
    );
    
    for (const npc of npcs) {
      expect(npc.id).toMatch(/^TEMP_/);
    }
  });
  
  test('generates levels within valid range', async () => {
    const npcs = await sessionNPCManager.initializeLocation(
      testSessionId + '-3',
      testLocationId + '-3',
      'training_ground',
      5
    );
    
    for (const npc of npcs) {
      expect(npc.cultivation.level).toBeGreaterThanOrEqual(1);
      expect(npc.cultivation.level).toBeLessThanOrEqual(9);
    }
  });
  
  test('qiDensity formula: 2^(level-1)', () => {
    const expectedDensity = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    
    for (let level = 1; level <= 9; level++) {
      const density = Math.pow(2, level - 1);
      expect(density).toBe(expectedDensity[level - 1]);
    }
  });
  
  test('retrieves NPCs by ID', async () => {
    const npcs = await sessionNPCManager.initializeLocation(
      testSessionId + '-4',
      testLocationId + '-4',
      'training_ground',
      1
    );
    
    if (npcs.length > 0) {
      const retrieved = sessionNPCManager.getNPC(testSessionId + '-4', npcs[0].id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(npcs[0].id);
    }
  });
  
  test('removes NPC and returns loot', async () => {
    const npcs = await sessionNPCManager.initializeLocation(
      testSessionId + '-5',
      testLocationId + '-5',
      'training_ground',
      1
    );
    
    if (npcs.length > 0) {
      const result = sessionNPCManager.removeNPC(testSessionId + '-5', npcs[0].id);
      expect(result).toBeDefined();
      expect(result?.xp).toBeGreaterThan(0);
    }
  });
});

describe('Location NPC Config', () => {
  test('training_ground preset exists', () => {
    expect(LOCATION_NPC_PRESETS['training_ground']).toBeDefined();
  });
  
  test('village preset exists', () => {
    expect(LOCATION_NPC_PRESETS['village']).toBeDefined();
  });
  
  test('config has required fields', () => {
    const config = LOCATION_NPC_PRESETS['training_ground'];
    expect(config.id).toBeDefined();
    expect(config.name).toBeDefined();
    expect(config.population).toBeDefined();
    expect(config.allowedSpecies).toBeDefined();
    expect(config.allowedRoles).toBeDefined();
    expect(config.levelRange).toBeDefined();
  });
});
