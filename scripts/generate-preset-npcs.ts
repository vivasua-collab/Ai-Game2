/**
 * Генерация 20 preset NPC (все люди)
 * 
 * Запуск: bun run scripts/generate-preset-npcs.ts
 */

import { generateNPCs, resetNPCCounter } from '../src/lib/generator/npc-generator';
import { presetStorage } from '../src/lib/generator/preset-storage';
import * as fs from 'fs';
import * as path from 'path';

// Функция для генерации русских имён
function generateRussianName(gender: 'male' | 'female', index: number): { name: string; nameEn: string } {
  const maleNames = [
    { ru: 'Вэй Лун', en: 'Wei Long' },
    { ru: 'Чжан Фэн', en: 'Zhang Feng' },
    { ru: 'Ли Минь', en: 'Li Ming' },
    { ru: 'Ван Хао', en: 'Wang Hao' },
    { ru: 'Чэнь Юнь', en: 'Chen Yun' },
    { ru: 'Лю Цзян', en: 'Liu Jiang' },
    { ru: 'Ян Чжи', en: 'Yang Zhi' },
    { ru: 'Чжао Вэй', en: 'Zhao Wei' },
    { ru: 'Сунь Лун', en: 'Sun Long' },
    { ru: 'Чжоу Хуа', en: 'Zhou Hua' },
  ];
  
  const femaleNames = [
    { ru: 'Ли Мэй', en: 'Li Mei' },
    { ru: 'Ван Юй', en: 'Wang Yu' },
    { ru: 'Чжан Лань', en: 'Zhang Lan' },
    { ru: 'Лю Ин', en: 'Liu Ying' },
    { ru: 'Чэнь Сю', en: 'Chen Xiu' },
    { ru: 'Ян Фэй', en: 'Yang Fei' },
    { ru: 'Чжао Хуа', en: 'Zhao Hua' },
    { ru: 'Сунь Цзы', en: 'Sun Zi' },
    { ru: 'Чжоу Мэй', en: 'Zhou Mei' },
    { ru: 'Вэй Лин', en: 'Wei Ling' },
  ];
  
  const names = gender === 'male' ? maleNames : femaleNames;
  return names[index % names.length];
}

// Роли для людей
const humanRoles = [
  'outer_disciple', 'inner_disciple', 'elder', 'sect_master', 'instructor',
  'merchant', 'alchemist', 'blacksmith', 'healer', 'scholar',
  'noble', 'beggar', 'traveler', 'hermit', 'mercenary',
  'guard_combat', 'bandit', 'assassin', 'cultist', 'warrior'
];

// Названия для ролей
const roleTitles: Record<string, string> = {
  outer_disciple: 'Внешний ученик',
  inner_disciple: 'Внутренний ученик',
  elder: 'Старейшина',
  sect_master: 'Мастер секты',
  instructor: 'Инструктор',
  merchant: 'Торговец',
  alchemist: 'Алхимик',
  blacksmith: 'Кузнец',
  healer: 'Целитель',
  scholar: 'Учёный',
  noble: 'Дворянин',
  beggar: 'Нищий',
  traveler: 'Путник',
  hermit: 'Отшельник',
  mercenary: 'Наёмник',
  guard_combat: 'Страж',
  bandit: 'Разбойник',
  assassin: 'Убийца',
  cultist: 'Культист',
  warrior: 'Воин',
};

async function main() {
  console.log('=== Генерация 20 NPC (люди) ===\n');
  
  // Сбрасываем счётчик
  resetNPCCounter();
  
  // Генерируем 20 NPC (только люди)
  const npcs = generateNPCs({
    speciesType: 'humanoid',  // Гуманоиды = люди
    cultivationLevel: { min: 1, max: 6 },  // Уровни 1-6
    seed: 42,  // Детерминированная генерация
  }, 20);
  
  // Формируем preset NPC с полными данными
  const presetNPCs = npcs.map((npc, index) => {
    const gender = npc.gender;
    const names = generateRussianName(gender, index);
    const roleTitle = roleTitles[humanRoles[index % humanRoles.length]] || 'Странник';
    
    return {
      id: `NPC_PRESET_${(index + 1).toString().padStart(5, '0')}`,
      isPreset: true,
      name: names.ru,
      nameEn: names.en,
      title: `${roleTitle}`,
      age: npc.age,
      gender: npc.gender,
      backstory: `Персонаж мира культивации. Уровень ${npc.cultivation.level}.${npc.cultivation.subLevel}.`,
      personality: {
        traits: npc.personality.traits,
        motivation: npc.personality.motivation,
        dominantEmotion: npc.personality.dominantEmotion,
        speechStyle: 'Обычная речь',
        quirks: [],
      },
      speciesId: 'human',
      speciesType: 'humanoid',
      roleId: humanRoles[index % humanRoles.length],
      stats: {
        strength: npc.stats.strength,
        agility: npc.stats.agility,
        intelligence: npc.stats.intelligence,
        conductivity: Math.floor(npc.cultivation.meridianConductivity),
        vitality: npc.stats.vitality,
      },
      cultivation: {
        level: npc.cultivation.level,
        subLevel: npc.cultivation.subLevel,
        coreCapacity: npc.cultivation.coreCapacity,
        currentQi: npc.cultivation.currentQi,
        coreQuality: npc.cultivation.coreQuality,
        baseVolume: npc.cultivation.baseVolume,
        qiDensity: npc.cultivation.qiDensity,
        meridianConductivity: npc.cultivation.meridianConductivity,
      },
      techniques: npc.techniques,
      equipment: npc.equipment,
      resources: npc.resources,
      relations: {
        defaultPlayerDisposition: npc.personality.disposition,
      },
      category: 'story',
      rarity: npc.cultivation.level >= 5 ? 'legendary' : npc.cultivation.level >= 3 ? 'rare' : 'uncommon',
      importance: npc.cultivation.level >= 5 ? 'important' : 'normal',
      tags: [humanRoles[index % humanRoles.length]],
      generatedAt: new Date().toISOString(),
      generatorVersion: '2.1.0-preset',
    };
  });
  
  // Сохраняем в файл
  const output = {
    version: '2.1',
    category: 'story',
    description: 'Сюжетные NPC для тестирования (20 человек)',
    count: presetNPCs.length,
    npcs: presetNPCs,
  };
  
  const outputPath = path.join(process.cwd(), 'presets/npcs/preset/story.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`Сгенерировано ${presetNPCs.length} NPC:`);
  presetNPCs.forEach((npc, i) => {
    console.log(`  ${i + 1}. ${npc.name} (${npc.title}) - Ур.${npc.cultivation.level}.${npc.cultivation.subLevel}`);
    console.log(`     Str:${npc.stats.strength} Agi:${npc.stats.agility} Int:${npc.stats.intelligence} Vit:${npc.stats.vitality}`);
    console.log(`     Qi: ${npc.cultivation.currentQi}/${npc.cultivation.coreCapacity}`);
  });
  
  console.log(`\nФайл сохранён: ${outputPath}`);
}

main().catch(console.error);
