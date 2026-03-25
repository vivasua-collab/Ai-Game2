/**
 * Тесты для generateAIFromNPC()
 * 
 * Проверяет корректность генерации AI конфигурации для NPC
 */

import { describe, it, expect } from 'bun:test';
import { generateAIFromNPC, applyAIConfigToNPC, type AIGenerationResult } from './session-npc-manager';
import type { TempNPC } from '@/types/temp-npc';

// ==================== TEST DATA ====================

const createMockNPC = (overrides: Partial<TempNPC> = {}): TempNPC => ({
  id: 'temp_test_001',
  isTemporary: true,
  speciesId: 'human',
  speciesType: 'human',
  roleId: 'guard',
  soulType: 'mortal',
  controller: 'ai',
  mind: 'full',
  name: 'Test Guard',
  gender: 'male',
  age: 25,
  stats: {
    strength: 12,
    agility: 14,
    intelligence: 10,
    vitality: 11,
  },
  cultivation: {
    level: 2,
    subLevel: 3,
    coreCapacity: 100,
    currentQi: 80,
    coreQuality: 50,
    baseVolume: 100,
    qiDensity: 1.0,
    meridianConductivity: 1.0,
  },
  bodyState: {
    health: 100,
    maxHealth: 100,
    parts: {},
    isDead: false,
    isUnconscious: false,
    activeEffects: [],
    material: 'organic',
    morphology: 'humanoid',
  },
  equipment: {
    weapon: null,
    armor: null,
    accessories: [],
  },
  quickSlots: [],
  techniques: [],
  personality: {
    disposition: -20,
    aggressionLevel: 60,
    fleeThreshold: 25,
    canTalk: true,
    canTrade: false,
    traits: ['alert'],
    motivation: 'protect',
    dominantEmotion: 'vigilant',
  },
  resources: {
    spiritStones: 50,
    contributionPoints: 0,
  },
  collision: { radius: 15, height: 180, weight: 70 },
  interactionZones: { talk: 50, trade: 40, agro: 200, flee: 150, perception: 300 },
  locationId: 'test_location',
  generatedAt: Date.now(),
  seed: 12345,
  ...overrides,
});

// ==================== TESTS ====================

describe('generateAIFromNPC', () => {
  
  it('should generate aiConfig with correct agroRadius', () => {
    const npc = createMockNPC();
    const result = generateAIFromNPC(npc);
    
    expect(result.aiConfig.agroRadius).toBeGreaterThan(0);
    expect(result.aiConfig.agroRadius).toBe(npc.interactionZones.agro);
  });
  
  it('should generate collision config based on species', () => {
    const npc = createMockNPC({ speciesId: 'human' });
    const result = generateAIFromNPC(npc);
    
    expect(result.collision.radius).toBeGreaterThan(0);
    expect(result.collision.height).toBeGreaterThan(0);
    expect(result.collision.weight).toBeGreaterThan(0);
  });
  
  it('should generate interactionZones based on role', () => {
    const npc = createMockNPC({ roleId: 'guard' });
    const result = generateAIFromNPC(npc);
    
    expect(result.interactionZones.perception).toBeGreaterThan(0);
    expect(result.interactionZones.agro).toBeGreaterThan(0);
  });
  
  it('should calculate patrolRadius for guards', () => {
    const guardNPC = createMockNPC({ roleId: 'guard_patrol' });
    const result = generateAIFromNPC(guardNPC);
    
    expect(result.aiConfig.patrolRadius).toBe(200);
  });
  
  it('should calculate patrolRadius for monsters', () => {
    const monsterNPC = createMockNPC({ speciesType: 'beast', roleId: 'monster' });
    const result = generateAIFromNPC(monsterNPC);
    
    expect(result.aiConfig.patrolRadius).toBe(150);
  });
  
  it('should calculate chaseSpeed based on agility', () => {
    const fastNPC = createMockNPC({ stats: { strength: 10, agility: 20, intelligence: 10, vitality: 10 } });
    const slowNPC = createMockNPC({ stats: { strength: 10, agility: 5, intelligence: 10, vitality: 10 } });
    
    const fastResult = generateAIFromNPC(fastNPC);
    const slowResult = generateAIFromNPC(slowNPC);
    
    expect(fastResult.aiConfig.chaseSpeed).toBeGreaterThan(slowResult.aiConfig.chaseSpeed);
  });
  
  it('should apply speed multiplier for beasts', () => {
    const beastNPC = createMockNPC({ speciesType: 'beast' });
    const result = generateAIFromNPC(beastNPC);
    
    // Beasts should be 1.2x faster
    expect(result.aiConfig.chaseSpeed).toBeGreaterThan(150);
  });
  
  it('should apply speed multiplier for spirits', () => {
    const spiritNPC = createMockNPC({ speciesType: 'spirit' });
    const result = generateAIFromNPC(spiritNPC);
    
    // Spirits should be 1.4x faster
    expect(result.aiConfig.chaseSpeed).toBeGreaterThan(180);
  });
  
  it('should use fleeThreshold from personality', () => {
    const npc = createMockNPC({ 
      personality: { 
        ...createMockNPC().personality, 
        fleeThreshold: 35 
      } 
    });
    const result = generateAIFromNPC(npc);
    
    expect(result.aiConfig.fleeThreshold).toBe(35);
  });
  
  it('should return all three config objects', () => {
    const npc = createMockNPC();
    const result = generateAIFromNPC(npc);
    
    expect(result).toHaveProperty('aiConfig');
    expect(result).toHaveProperty('collision');
    expect(result).toHaveProperty('interactionZones');
  });
});

describe('applyAIConfigToNPC', () => {
  
  it('should apply aiConfig to NPC', () => {
    const npc = createMockNPC();
    const result = applyAIConfigToNPC(npc);
    
    expect(result.aiConfig).toBeDefined();
    expect(result.aiConfig?.agroRadius).toBeGreaterThan(0);
  });
  
  it('should apply collision to NPC', () => {
    const npc = createMockNPC();
    const result = applyAIConfigToNPC(npc);
    
    expect(result.collision).toBeDefined();
    expect(result.collision.radius).toBeGreaterThan(0);
  });
  
  it('should apply interactionZones to NPC', () => {
    const npc = createMockNPC();
    const result = applyAIConfigToNPC(npc);
    
    expect(result.interactionZones).toBeDefined();
    expect(result.interactionZones.perception).toBeGreaterThan(0);
  });
  
  it('should mutate original NPC object', () => {
    const npc = createMockNPC();
    const originalId = npc.id;
    
    applyAIConfigToNPC(npc);
    
    expect(npc.id).toBe(originalId);
    expect(npc.aiConfig).toBeDefined();
  });
});

describe('Edge Cases', () => {
  
  it('should handle missing personality gracefully', () => {
    const npc = createMockNPC({ 
      personality: undefined as any 
    });
    
    // Should not throw
    expect(() => generateAIFromNPC(npc)).not.toThrow();
  });
  
  it('should handle missing cultivation gracefully', () => {
    const npc = createMockNPC({ 
      cultivation: undefined as any 
    });
    
    // Should not throw
    expect(() => generateAIFromNPC(npc)).not.toThrow();
  });
  
  it('should handle missing stats gracefully', () => {
    const npc = createMockNPC({ 
      stats: undefined as any 
    });
    
    // Should not throw
    expect(() => generateAIFromNPC(npc)).not.toThrow();
  });
});
