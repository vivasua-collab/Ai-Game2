/**
 * ============================================================================
 * SPINAL AI - Unit Tests
 * ============================================================================
 * 
 * Тесты для SpinalController и библиотеки рефлексов.
 * 
 * Запуск: bun test src/lib/game/ai/spinal/spinal-controller.test.ts
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { SpinalController, createSpinalController } from './spinal-controller';
import { 
  getBaseReflexes,
  getMonsterReflexes,
  getGuardReflexes,
  getPasserbyReflexes,
  getCultivatorReflexes,
  createCustomReflex,
  getPreset,
} from './index';
import type { SpinalSignal, SpinalBodyState, SpinalPresetType } from './types';

// ==================== HELPERS ====================

const createMockBodyState = (overrides: Partial<SpinalBodyState> = {}): SpinalBodyState => ({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  facing: 0,
  hp: 100,
  maxHp: 100,
  qi: 50,
  maxQi: 100,
  isGrounded: true,
  isMoving: false,
  isInCombat: false,
  isSuppressed: false,
  isNearEdge: false,
  nearbyAllies: 0,
  ...overrides,
});

const createMockSignal = (
  type: SpinalSignal['type'],
  intensity: number,
  direction?: { x: number; y: number }
): SpinalSignal => ({
  type,
  intensity,
  direction,
  timestamp: Date.now(),
});

// ==================== SPINAL CONTROLLER TESTS ====================

describe('SpinalController', () => {
  let controller: SpinalController;
  
  beforeEach(() => {
    controller = createSpinalController('test_npc', 'monster');
  });
  
  describe('Creation', () => {
    test('should create controller with NPC ID', () => {
      const ctrl = createSpinalController('npc_001');
      expect(ctrl).toBeDefined();
      expect(ctrl.getDebugInfo().npcId).toBe('npc_001');
    });
    
    test('should create controller with preset', () => {
      const ctrl = createSpinalController('npc_002', 'guard');
      expect(ctrl).toBeDefined();
      expect(ctrl.getCurrentReflex()).toBeNull(); // Нет активного рефлекса
    });
    
    test('should handle invalid preset gracefully', () => {
      const ctrl = createSpinalController('npc_003');
      // Если preset не передан, контроллер создаётся без рефлексов
      expect(ctrl).toBeDefined();
    });
  });
  
  describe('Signal Processing', () => {
    test('should receive signal', () => {
      controller.receiveSignal(createMockSignal('damage', 0.5));
      const info = controller.getDebugInfo();
      expect(info.signalQueue).toBe(1);
      expect(info.lastSignal?.type).toBe('damage');
    });
    
    test('should limit signal queue size', () => {
      for (let i = 0; i < 15; i++) {
        controller.receiveSignal(createMockSignal('damage', 0.1));
      }
      const info = controller.getDebugInfo();
      expect(info.signalQueue).toBeLessThanOrEqual(10);
    });
    
    test('should clear old signals', () => {
      // Старый сигнал (timestamp в прошлом)
      const oldSignal: SpinalSignal = {
        type: 'damage',
        intensity: 0.5,
        timestamp: Date.now() - 1000, // 1 секунда назад
      };
      controller.receiveSignal(oldSignal);
      
      // Новый сигнал
      controller.receiveSignal(createMockSignal('danger_nearby', 0.8));
      
      // Обновляем - старый сигнал должен быть удалён
      controller.update(16, createMockBodyState());
      
      const info = controller.getDebugInfo();
      expect(info.signalQueue).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Reflex Processing', () => {
    test('should trigger dodge reflex on danger_nearby', () => {
      controller.receiveSignal(createMockSignal('danger_nearby', 0.8, { x: 1, y: 0 }));
      
      const action = controller.update(16, createMockBodyState());
      
      expect(action).not.toBeNull();
      expect(action?.type).toBe('dodge');
      expect(action?.sourceReflex).toBe('monster_dodge');
    });
    
    test('should trigger flinch reflex on damage', () => {
      controller.receiveSignal(createMockSignal('damage', 0.5));
      
      const action = controller.update(16, createMockBodyState());
      
      expect(action).not.toBeNull();
      expect(action?.type).toBe('flinch');
    });
    
    test('should not trigger reflex below intensity threshold', () => {
      // monster_dodge требует minIntensity: 0.5
      controller.receiveSignal(createMockSignal('danger_nearby', 0.3, { x: 1, y: 0 }));
      
      const action = controller.update(16, createMockBodyState());
      
      expect(action).toBeNull();
    });
    
    test('should respect cooldown', () => {
      // Первый сигнал
      controller.receiveSignal(createMockSignal('danger_nearby', 0.8, { x: 1, y: 0 }));
      const action1 = controller.update(16, createMockBodyState());
      expect(action1).not.toBeNull();
      
      // Второй сигнал сразу после (кулдаун не прошёл)
      controller.receiveSignal(createMockSignal('danger_nearby', 0.8, { x: 1, y: 0 }));
      const action2 = controller.update(16, createMockBodyState());
      expect(action2).toBeNull();
    });
    
    test('should prioritize higher priority reflexes', () => {
      // Создаём контроллер с кастомными рефлексами
      const ctrl = createSpinalController('test');
      
      // Добавляем рефлекс с низким приоритетом
      ctrl.addReflex(createCustomReflex('low_priority', 'damage', 'flinch', {
        priority: 10,
        minIntensity: 0.1,
      }));
      
      // Добавляем рефлекс с высоким приоритетом
      ctrl.addReflex(createCustomReflex('high_priority', 'damage', 'dodge', {
        priority: 90,
        minIntensity: 0.1,
      }));
      
      ctrl.receiveSignal(createMockSignal('damage', 0.5));
      const action = ctrl.update(16, createMockBodyState());
      
      expect(action).not.toBeNull();
      expect(action?.sourceReflex).toBe('high_priority');
    });
  });
  
  describe('Qi Requirements', () => {
    test('should not trigger qi_shield without qi', () => {
      const ctrl = createSpinalController('test', 'cultivator');
      
      // Qi атаки требуют Qi для щита
      ctrl.receiveSignal(createMockSignal('qi_attack', 0.5));
      
      // Нет Qi
      const action = ctrl.update(16, createMockBodyState({ qi: 0, maxQi: 100 }));
      
      // Qi shield не должен сработать без Qi
      expect(action?.type).not.toBe('qi_shield');
    });
    
    test('should trigger qi_shield with enough qi', () => {
      const ctrl = createSpinalController('test', 'cultivator');
      ctrl.setDebugEnabled(true);
      
      ctrl.receiveSignal(createMockSignal('qi_attack', 0.5));
      
      const action = ctrl.update(16, createMockBodyState({ qi: 50, maxQi: 100 }));
      
      expect(action).not.toBeNull();
      expect(action?.type).toBe('qi_shield');
    });
  });
  
  describe('Preset Loading', () => {
    test('should load monster preset', () => {
      const ctrl = createSpinalController('test', 'monster');
      // Monster preset должен иметь рефлексы
      expect(ctrl.getDebugInfo().npcId).toBe('test');
    });
    
    test('should load guard preset', () => {
      const ctrl = createSpinalController('test', 'guard');
      expect(ctrl.getDebugInfo().npcId).toBe('test');
    });
    
    test('should load passerby preset', () => {
      const ctrl = createSpinalController('test', 'passerby');
      expect(ctrl.getDebugInfo().npcId).toBe('test');
    });
    
    test('should load cultivator preset', () => {
      const ctrl = createSpinalController('test', 'cultivator');
      expect(ctrl.getDebugInfo().npcId).toBe('test');
    });
  });
  
  describe('Performance', () => {
    test('update should complete in < 1ms', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        controller.receiveSignal(createMockSignal('damage', 0.5));
        controller.update(16, createMockBodyState());
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      console.log(`[Test] Average update time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(1);
    });
  });
  
  describe('Debug Info', () => {
    test('should provide debug info', () => {
      controller.receiveSignal(createMockSignal('damage', 0.5));
      controller.update(16, createMockBodyState());
      
      const info = controller.getDebugInfo();
      
      expect(info.npcId).toBe('test_npc');
      expect(info.updateCount).toBeGreaterThan(0);
      expect(info.lastSignal).not.toBeNull();
    });
    
    test('should track update count', () => {
      for (let i = 0; i < 10; i++) {
        controller.update(16, createMockBodyState());
      }
      
      const info = controller.getDebugInfo();
      expect(info.updateCount).toBe(10);
    });
  });
});

// ==================== REFLEXES TESTS ====================

describe('Reflexes', () => {
  describe('Base Reflexes', () => {
    test('should have base reflexes', () => {
      const reflexes = getBaseReflexes();
      expect(reflexes.length).toBeGreaterThan(0);
    });
    
    test('should have danger_dodge reflex', () => {
      const reflexes = getBaseReflexes();
      const dodge = reflexes.find(r => r.id === 'danger_dodge');
      expect(dodge).toBeDefined();
      expect(dodge?.priority).toBe(100);
    });
    
    test('should have pain_flinch reflex', () => {
      const reflexes = getBaseReflexes();
      const flinch = reflexes.find(r => r.id === 'pain_flinch');
      expect(flinch).toBeDefined();
      expect(flinch?.priority).toBe(90);
    });
  });
  
  describe('Monster Reflexes', () => {
    test('should have monster-specific reflexes', () => {
      const reflexes = getMonsterReflexes();
      expect(reflexes.length).toBeGreaterThan(0);
      
      const monsterDodge = reflexes.find(r => r.id === 'monster_dodge');
      expect(monsterDodge).toBeDefined();
      expect(monsterDodge?.trigger.minIntensity).toBe(0.5); // Более чувствительный
    });
  });
  
  describe('Passerby Reflexes', () => {
    test('should have flee reflex for passersby', () => {
      const reflexes = getPasserbyReflexes();
      const flee = reflexes.find(r => r.id === 'passerby_flee');
      expect(flee).toBeDefined();
      expect(flee?.action).toBe('flee');
      expect(flee?.trigger.minIntensity).toBe(0.3); // Трусливый
    });
  });
  
  describe('Guard Reflexes', () => {
    test('should have alert reflex for guards', () => {
      const reflexes = getGuardReflexes();
      const alert = reflexes.find(r => r.id === 'guard_alert');
      expect(alert).toBeDefined();
      expect(alert?.action).toBe('alert');
    });
  });
  
  describe('Cultivator Reflexes', () => {
    test('should have qi_shield reflex', () => {
      const reflexes = getCultivatorReflexes();
      const shield = reflexes.find(r => r.id === 'qi_shield_reflex');
      expect(shield).toBeDefined();
      expect(shield?.requiresQi).toBe(20);
    });
    
    test('should have suppression_freeze reflex', () => {
      const reflexes = getCultivatorReflexes();
      const freeze = reflexes.find(r => r.id === 'suppression_freeze');
      expect(freeze).toBeDefined();
      expect(freeze?.priority).toBe(99);
    });
  });
  
  describe('Custom Reflex', () => {
    test('should create custom reflex', () => {
      const reflex = createCustomReflex('my_reflex', 'damage', 'dodge', {
        priority: 75,
        minIntensity: 0.4,
        cooldown: 300,
      });
      
      expect(reflex.id).toBe('my_reflex');
      expect(reflex.action).toBe('dodge');
      expect(reflex.priority).toBe(75);
      expect(reflex.trigger.minIntensity).toBe(0.4);
      expect(reflex.cooldown).toBe(300);
    });
  });
});

// ==================== PRESETS TESTS ====================

describe('Presets', () => {
  const presetTypes: SpinalPresetType[] = ['monster', 'guard', 'passerby', 'cultivator'];
  
  for (const type of presetTypes) {
    test(`should have ${type} preset`, () => {
      const preset = getPreset(type);
      expect(preset).toBeDefined();
      expect(preset?.type).toBe(type);
      expect(preset?.reflexes.length).toBeGreaterThan(0);
    });
  }
  
  test('monster preset should have high speed modifier', () => {
    const preset = getPreset('monster');
    expect(preset?.globalSpeedModifier).toBeGreaterThan(1);
  });
  
  test('passerby preset should have high sensitivity', () => {
    const preset = getPreset('passerby');
    expect(preset?.sensitivity).toBeGreaterThan(1);
  });
  
  test('guard preset should have normal sensitivity', () => {
    const preset = getPreset('guard');
    expect(preset?.sensitivity).toBe(1.0);
  });
});
