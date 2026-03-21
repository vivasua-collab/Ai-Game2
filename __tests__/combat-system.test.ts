import { describe, test, expect } from 'bun:test';
import { 
  calculateTechniqueCapacity,
  checkDestabilization,
  calculateQiDensity,
} from '@/lib/game/techniques';

describe('Combat System', () => {
  describe('Technique Capacity', () => {
    test('L1 technique with 0% mastery = 50', () => {
      expect(calculateTechniqueCapacity(1, 0)).toBe(50);
    });
    
    test('L1 technique with 100% mastery = 75', () => {
      expect(calculateTechniqueCapacity(1, 100)).toBe(75);
    });
    
    test('L5 technique with 50% mastery = 1000', () => {
      // 50 * 2^4 = 800, * (1 + 0.5 * 0.5) = 800 * 1.25 = 1000
      expect(calculateTechniqueCapacity(5, 50)).toBe(1000);
    });
    
    test('L9 technique with 100% mastery = 19200', () => {
      // 50 * 2^8 = 12800, * (1 + 0.5) = 12800 * 1.5 = 19200
      expect(calculateTechniqueCapacity(9, 100)).toBe(19200);
    });
    
    test('level is clamped to valid range', () => {
      expect(calculateTechniqueCapacity(0, 0)).toBe(50);  // 0 -> 1
      expect(calculateTechniqueCapacity(15, 0)).toBe(12800);  // 15 -> 9
    });
    
    test('mastery is clamped to valid range', () => {
      expect(calculateTechniqueCapacity(1, -10)).toBe(50);  // -10 -> 0
      expect(calculateTechniqueCapacity(1, 150)).toBe(75);  // 150 -> 100
    });
  });
  
  describe('Destabilization', () => {
    test('qiInput <= capacity - stable', () => {
      const result = checkDestabilization(40, 50);
      expect(result.isDestabilized).toBe(false);
      expect(result.effectiveQi).toBe(40);
      expect(result.backlashDamage).toBe(0);
    });
    
    test('qiInput > capacity * 1.1 - destabilized', () => {
      const result = checkDestabilization(100, 50);
      expect(result.isDestabilized).toBe(true);
      expect(result.effectiveQi).toBe(50);
      expect(result.backlashDamage).toBe(25);
    });
    
    test('qiInput within 10% margin - stable but capped', () => {
      const result = checkDestabilization(54, 50); // 108%
      expect(result.isDestabilized).toBe(false);
      expect(result.effectiveQi).toBe(50);
    });
    
    test('exact capacity - stable', () => {
      const result = checkDestabilization(50, 50);
      expect(result.isDestabilized).toBe(false);
      expect(result.effectiveQi).toBe(50);
      expect(result.efficiencyPercent).toBe(100);
    });
    
    test('large excess - capped efficiency', () => {
      const result = checkDestabilization(200, 50); // 4x capacity
      expect(result.isDestabilized).toBe(true);
      expect(result.efficiencyPercent).toBeGreaterThanOrEqual(50);
    });
  });
  
  describe('Qi Density', () => {
    test('L1 cultivator = 1', () => {
      expect(calculateQiDensity(1)).toBe(1);
    });
    
    test('L5 cultivator = 16', () => {
      expect(calculateQiDensity(5)).toBe(16);
    });
    
    test('L9 cultivator = 256', () => {
      expect(calculateQiDensity(9)).toBe(256);
    });
    
    test('level is clamped to valid range', () => {
      expect(calculateQiDensity(0)).toBe(1);   // 0 -> 1
      expect(calculateQiDensity(15)).toBe(256); // 15 -> 9
    });
    
    test('follows exponential growth pattern', () => {
      const densities = [1, 2, 4, 8, 16, 32, 64, 128, 256];
      for (let i = 0; i < densities.length; i++) {
        expect(calculateQiDensity(i + 1)).toBe(densities[i]);
      }
    });
  });
});

describe('TempNPC ID Recognition', () => {
  const isTempNPCId = (id: string) => id.startsWith('TEMP_');
  
  test('TEMP_ prefix recognized', () => {
    expect(isTempNPCId('TEMP_12345')).toBe(true);
    expect(isTempNPCId('TEMP_npc_beast_01')).toBe(true);
    expect(isTempNPCId('TEMP_abc123xyz')).toBe(true);
  });
  
  test('non-TEMP prefix not recognized', () => {
    expect(isTempNPCId('player_123')).toBe(false);
    expect(isTempNPCId('npc_456')).toBe(false);
    expect(isTempNPCId('temp_123')).toBe(false); // lowercase
    expect(isTempNPCId('TEMPORARY_123')).toBe(false);
  });
  
  test('empty and null cases', () => {
    expect(isTempNPCId('')).toBe(false);
  });
});
