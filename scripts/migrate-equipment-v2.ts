/**
 * Скрипт миграции существующих предметов к Equipment V2
 * 
 * Запуск: bun run scripts/migrate-equipment-v2.ts
 * 
 * Что делает:
 * 1. Добавляет materialId, materialTier для всех предметов
 * 2. Устанавливает grade на основе rarity
 * 3. Инициализирует durabilityCurrent/Max
 * 4. Устанавливает effectiveDamage/Defense
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// MIGRATION MAPPINGS
// ============================================================================

/**
 * Маппинг rarity -> grade
 */
const RARITY_TO_GRADE: Record<string, string> = {
  common: "common",
  uncommon: "common",
  rare: "refined",
  epic: "perfect",
  legendary: "transcendent",
  mythic: "transcendent",
};

/**
 * Маппинг категории -> материал по умолчанию
 */
const CATEGORY_TO_MATERIAL: Record<string, { id: string; tier: number }> = {
  weapon: { id: "iron", tier: 1 },
  armor: { id: "leather", tier: 1 },
  accessory: { id: "jade", tier: 1 },
  material: { id: "stone", tier: 1 },
  consumable: { id: "herb", tier: 1 },
};

/**
 * Маппинг материала из имени предмета
 */
function inferMaterialFromName(name: string, category: string): { id: string; tier: number } {
  const nameLower = name.toLowerCase();
  
  // T5 материалы
  if (nameLower.includes("chaos") || nameLower.includes("void")) {
    return { id: "void_matter", tier: 5 };
  }
  if (nameLower.includes("primordial")) {
    return { id: "primordial_essence", tier: 5 };
  }
  
  // T4 материалы
  if (nameLower.includes("star") || nameLower.includes("starlight")) {
    return { id: "star_metal", tier: 4 };
  }
  if (nameLower.includes("dragon")) {
    return { id: "dragon_bone", tier: 4 };
  }
  if (nameLower.includes("heavenly")) {
    return { id: "heavenly_silk", tier: 4 };
  }
  
  // T3 материалы
  if (nameLower.includes("spirit") || nameLower.includes("spiritual")) {
    return category === "armor" 
      ? { id: "spirit_silk", tier: 3 }
      : { id: "spirit_iron", tier: 3 };
  }
  if (nameLower.includes("cold iron") || nameLower.includes("cold_iron")) {
    return { id: "cold_iron", tier: 3 };
  }
  if (nameLower.includes("jade")) {
    return { id: "jade", tier: 3 };
  }
  
  // T2 материалы
  if (nameLower.includes("steel")) {
    return { id: "steel", tier: 2 };
  }
  if (nameLower.includes("bronze")) {
    return { id: "bronze", tier: 2 };
  }
  if (nameLower.includes("silk")) {
    return { id: "silk", tier: 2 };
  }
  if (nameLower.includes("ivory")) {
    return { id: "ivory", tier: 2 };
  }
  if (nameLower.includes("hardwood") || nameLower.includes("hardwood")) {
    return { id: "hardwood", tier: 2 };
  }
  
  // T1 материалы (по умолчанию)
  return CATEGORY_TO_MATERIAL[category] ?? { id: "iron", tier: 1 };
}

/**
 * Определить уровень предмета из требований
 */
function inferItemLevel(requirements: string | null): number {
  if (!requirements) return 1;
  
  try {
    const req = JSON.parse(requirements);
    return req.level ?? req.cultivationLevel ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Рассчитать эффективные параметры
 */
function calculateEffectiveStats(
  stats: string | null,
  grade: string,
  materialTier: number
): { damage: number; defense: number; qiCond: number } {
  const gradeMultipliers: Record<string, { damage: number; defense: number }> = {
    damaged: { damage: 0.8, defense: 0.5 },
    common: { damage: 1.0, defense: 1.0 },
    refined: { damage: 1.3, defense: 1.5 },
    perfect: { damage: 1.7, defense: 2.5 },
    transcendent: { damage: 2.5, defense: 4.0 },
  };
  
  const multiplier = gradeMultipliers[grade] ?? { damage: 1.0, defense: 1.0 };
  const tierBonus = materialTier * 0.1;
  
  let damage = 0;
  let defense = 0;
  
  if (stats) {
    try {
      const statsObj = JSON.parse(stats);
      damage = (statsObj.damage ?? statsObj.attack ?? 0) * multiplier.damage * (1 + tierBonus);
      defense = (statsObj.defense ?? statsObj.armor ?? 0) * multiplier.defense * (1 + tierBonus);
    } catch {
      // Ignore parse errors
    }
  }
  
  // Базовая проводимость Ци на основе тира материала
  const qiCond = materialTier * 10;
  
  return {
    damage: Math.floor(damage),
    defense: Math.floor(defense),
    qiCond,
  };
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrateItems() {
  console.log("🔄 Начинаем миграцию предметов к Equipment V2...\n");
  
  // Получаем все предметы
  const items = await prisma.inventoryItem.findMany();
  console.log(`📦 Найдено предметов: ${items.length}\n`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const item of items) {
    try {
      // Пропускаем если уже мигрирован
      if (item.materialId !== "iron" || item.grade !== "common") {
        // Проверяем, есть ли уже V2 поля
        if (item.durabilityCurrent !== 100 || item.repairCount !== 0) {
          skipped++;
          continue;
        }
      }
      
      // Определяем грейд из rarity
      const grade = RARITY_TO_GRADE[item.rarity] ?? "common";
      
      // Определяем материал
      const material = inferMaterialFromName(item.name, item.category);
      
      // Определяем уровень предмета
      const itemLevel = inferItemLevel(item.requirements);
      
      // Рассчитываем прочность
      const baseDurability = 100 * material.tier;
      const gradeMultiplier = grade === "damaged" ? 0.5 
        : grade === "refined" ? 1.5 
        : grade === "perfect" ? 2.5 
        : grade === "transcendent" ? 4.0 
        : 1.0;
      const maxDurability = Math.floor(baseDurability * gradeMultiplier);
      const currentDurability = item.durability ?? maxDurability;
      
      // Определяем состояние прочности
      const durabilityPercent = (currentDurability / maxDurability) * 100;
      let condition = "pristine";
      if (durabilityPercent < 20) condition = "broken";
      else if (durabilityPercent < 50) condition = "damaged";
      else if (durabilityPercent < 70) condition = "worn";
      else if (durabilityPercent < 90) condition = "good";
      
      // Рассчитываем эффективные параметры
      const effective = calculateEffectiveStats(item.stats, grade, material.tier);
      
      // Обновляем предмет
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          materialId: material.id,
          materialTier: material.tier,
          materialName: material.id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          grade,
          gradeName: getGradeDisplayName(grade),
          durabilityCurrent,
          durabilityMax: maxDurability,
          durabilityCondition: condition,
          repairCount: 0,
          lastRepairQuality: 100,
          itemLevel,
          effectiveDamage: effective.damage,
          effectiveDefense: effective.defense,
          effectiveQiCond: effective.qiCond,
          // Обновляем старые поля для совместимости
          durability: currentDurability,
          maxDurability,
        },
      });
      
      migrated++;
      console.log(`✅ ${item.name}: ${grade} (${material.id} T${material.tier})`);
      
    } catch (error) {
      errors++;
      console.error(`❌ Ошибка миграции ${item.name}:`, error);
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 Результаты миграции:");
  console.log(`   ✅ Мигрировано: ${migrated}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);
  console.log(`   ❌ Ошибок: ${errors}`);
  console.log("=".repeat(50));
  
  await prisma.$disconnect();
}

function getGradeDisplayName(grade: string): string {
  const names: Record<string, string> = {
    damaged: "Повреждённый",
    common: "Обычный",
    refined: "Улучшенный",
    perfect: "Идеальный",
    transcendent: "Превосходный",
  };
  return names[grade] ?? "Обычный";
}

// Запуск
migrateItems().catch(console.error);
