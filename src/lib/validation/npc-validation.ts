import { z } from 'zod';

/**
 * Zod схема для GeneratedNPC
 */
export const GeneratedNPCSchema = z.object({
  id: z.string().startsWith('TEMP_'),
  name: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  
  speciesType: z.enum(['humanoid', 'beast', 'spirit', 'hybrid', 'aberration']),
  role: z.string(),
  
  level: z.number().int().min(1).max(9),
  cultivationLevel: z.number().int().min(1).max(9),
  
  maxHealth: z.number().positive(),
  currentHealth: z.number().min(0),
  maxQi: z.number().positive(),
  currentQi: z.number().min(0),
  
  strength: z.number().int().min(1).max(100),
  agility: z.number().int().min(1).max(100),
  intelligence: z.number().int().min(1).max(100),
  conductivity: z.number().int().min(1).max(100),
  
  // SoulEntity compatibility
  soulType: z.enum(['character', 'creature', 'spirit', 'construct']),
  controller: z.literal('ai'),
  mind: z.enum(['full', 'instinct', 'simple']),
  
  // Optional fields
  techniques: z.array(z.string()).optional(),
  equipment: z.record(z.any()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

/**
 * Схема для конфигурации локации
 */
export const LocationNPCConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  population: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(1),
  }),
  allowedSpecies: z.array(z.object({
    type: z.string(),
    weight: z.number().positive(),
  })),
  allowedRoles: z.array(z.object({
    type: z.string(),
    weight: z.number().positive(),
  })),
  levelRange: z.object({
    min: z.number().int().min(1).max(9),
    max: z.number().int().min(1).max(9),
    relativeToPlayer: z.number().optional(),
  }),
  behavior: z.object({
    defaultDisposition: z.number().min(-100).max(100).optional(),
    agroRadius: z.number().positive().optional(),
    patrolRadius: z.number().positive().optional(),
  }).optional(),
  loot: z.object({
    dropRate: z.number().min(0).max(1),
    dropFromEquipment: z.boolean().optional(),
    dropFromQuickSlots: z.boolean().optional(),
  }).optional(),
});

/**
 * Валидация NPC
 */
export function validateNPC(npc: unknown): {
  success: boolean;
  data?: z.infer<typeof GeneratedNPCSchema>;
  errors?: z.ZodError;
} {
  const result = GeneratedNPCSchema.safeParse(npc);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Валидация диапазонов характеристик
 */
export function validateStatsRange(npc: z.infer<typeof GeneratedNPCSchema>): boolean {
  const baseStat = 10;
  const maxMultiplier = npc.level * 2;
  
  const statsValid = 
    npc.strength >= baseStat && npc.strength <= baseStat * maxMultiplier &&
    npc.agility >= baseStat && npc.agility <= baseStat * maxMultiplier &&
    npc.intelligence >= baseStat && npc.intelligence <= baseStat * maxMultiplier;
  
  return statsValid;
}
