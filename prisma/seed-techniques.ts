/**
 * Seed-скрипт для предсоздания базовых техник и формаций
 * 
 * Запуск: bun run db:seed-techniques
 * 
 * Техники создаются ОДИН РАЗ при развёртывании.
 * При старте игры только создаётся связь CharacterTechnique.
 */

import { PrismaClient } from '@prisma/client';
import { BASIC_TECHNIQUES, BASIC_FORMATIONS } from '../src/data/presets';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding basic techniques...');
  
  let created = 0;
  let updated = 0;
  
  // 1. Создаём базовые техники
  for (const preset of BASIC_TECHNIQUES) {
    const result = await prisma.technique.upsert({
      where: { nameId: preset.id },
      create: {
        name: preset.name,
        nameId: preset.id,
        description: preset.description,
        type: preset.techniqueType,
        element: preset.element,
        rarity: preset.rarity,
        level: preset.level,
        minLevel: preset.minLevel,
        maxLevel: preset.maxLevel,
        canEvolve: preset.canEvolve ?? true,
        minCultivationLevel: preset.minCultivationLevel,
        qiCost: preset.qiCost,
        physicalFatigueCost: preset.fatigueCost.physical,
        mentalFatigueCost: preset.fatigueCost.mental,
        statRequirements: preset.statRequirements ? JSON.stringify(preset.statRequirements) : null,
        statScaling: preset.scaling ? JSON.stringify(preset.scaling) : null,
        effects: preset.effects ? JSON.stringify(preset.effects) : null,
        source: 'preset',
      },
      update: {
        description: preset.description,
      },
    });
    
    if (result.createdAt === result.updatedAt) {
      created++;
    } else {
      updated++;
    }
  }
  
  console.log(`  ✅ Techniques: ${created} created, ${updated} updated`);
  
  // 2. Создаём базовые формации
  created = 0;
  updated = 0;
  
  for (const preset of BASIC_FORMATIONS) {
    const result = await prisma.technique.upsert({
      where: { nameId: preset.id },
      create: {
        name: preset.name,
        nameId: preset.id,
        description: preset.description,
        type: 'formation',
        element: 'neutral',
        rarity: preset.rarity,
        level: 1,
        minLevel: 1,
        maxLevel: preset.qualityLevels,
        canEvolve: true,
        minCultivationLevel: preset.requirements?.cultivationLevel || 1,
        qiCost: preset.requirements?.qiCost || 50,
        physicalFatigueCost: 0,
        mentalFatigueCost: 5,
        statRequirements: null,
        statScaling: null,
        effects: JSON.stringify({
          formationType: preset.formationType,
          formationEffects: preset.formationEffects,
          setupTime: preset.setupTime,
          duration: preset.duration,
          difficulty: preset.difficulty,
        }),
        source: 'preset',
      },
      update: {
        description: preset.description,
      },
    });
    
    if (result.createdAt === result.updatedAt) {
      created++;
    } else {
      updated++;
    }
  }
  
  console.log(`  ✅ Formations: ${created} created, ${updated} updated`);
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
