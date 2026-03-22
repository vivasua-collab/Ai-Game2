/**
 * ============================================================================
 * РЕЕСТР СЛАБОСТЕЙ И СОПРОТИВЛЕНИЙ (Weakness & Resistance Registry)
 * ============================================================================
 * 
 * Содержит определения всех слабостей и сопротивлений для видов.
 * Используется вместе с species-presets.ts
 * 
 * @see src/types/weakness-resistance.ts — типы
 * @see docs/body_monsters.md — документация видов
 * 
 * ============================================================================
 */

import type { 
  WeaknessDefinition, 
  ResistanceDefinition 
} from '@/types/weakness-resistance';

// ============================================
// МАТЕРИАЛЬНЫЕ СЛАБОСТИ
// ============================================

/**
 * Слабость к железу (Эльфы)
 * 
 * ЛОР: В традиционном фольклоре "холодное железо" — металл, 
 * обработанный без использования огня или магии. Обжигает фейри и эльфов.
 * 
 * МЕХАНИКА:
 * - Урон железным оружием: +50%
 * - Железные оковы: блокируют магию
 * 
 * ВАЖНО: Сталь НЕ является слабостью! Только чистое железо.
 */
export const WEAKNESS_IRON: WeaknessDefinition = {
  id: 'iron',
  name: 'Слабость к железу',
  nameEn: 'Iron Weakness',
  description: 'Холодное железо обжигает плоть эльфа, нанося дополнительные повреждения и замедляя регенерацию.',
  category: 'material',
  damageMultiplier: 1.5,
  bonusDamage: 0,
  bypassArmor: false,
  blockRegeneration: true,
  conditions: {
    weaponMaterial: ['iron', 'cold_iron'],
  },
  speciesIds: ['elf'],
  additionalEffects: {
    condition: 'condition_iron_burn',
    duration: 3,
    chance: 25,
  },
  icon: '🔩',
  color: 'text-gray-400',
  loreReason: 'Фольклор: Холодное железо — традиционная слабость фейри и эльфов. Железо "разрывает" магическую связь эльфа с природой.',
};

/**
 * Слабость к серебру (Оборотни, Зверолюды)
 * 
 * ЛОР: Серебро — "чистый" металл, связанный с луной и светом.
 * Наносит незаживающие раны существам с тёмной или звериной природой.
 * 
 * МЕХАНИКА:
 * - Урон серебряным оружием: +100% (оборотни), +50% (зверолюды)
 * - Блокирует регенерацию
 * - Раны от серебра заживают в 3 раза медленнее
 */
export const WEAKNESS_SILVER: WeaknessDefinition = {
  id: 'silver',
  name: 'Слабость к серебру',
  nameEn: 'Silver Weakness',
  description: 'Серебро наносит незаживающие раны, блокируя регенерацию и причиняя невыносимую боль.',
  category: 'material',
  damageMultiplier: 2.0,
  bonusDamage: 10,
  bypassArmor: false,
  blockRegeneration: true,
  conditions: {
    weaponMaterial: ['silver', 'silver_coated'],
  },
  speciesIds: ['werewolf', 'beastkin'],
  additionalEffects: {
    condition: 'condition_silver_burn',
    duration: 5,
    chance: 50,
  },
  icon: '🥈',
  color: 'text-slate-300',
  loreReason: 'Фольклор: Серебро связано с луной и "чистотой". Оборотники, являясь смесью человека и зверя, уязвимы к "чистому" металлу.',
};

/**
 * Слабость к оружию убийцы драконов (Драконы)
 * 
 * ЛОР: Специальное оружие, выкованное с использованием
 * крови драконов и древних техник.
 * 
 * МЕХАНИКА:
 * - Урон специальным оружием: +100%
 * - Игнорирует 30% брони чешуи
 */
export const WEAKNESS_DRAGON_SLAYER: WeaknessDefinition = {
  id: 'dragon_slayer',
  name: 'Уязвимость к оружию убийцы драконов',
  nameEn: 'Dragon Slayer Weapon Weakness',
  description: 'Оружие, выкованное для убийства драконов, пробивает их чешую и наносит смертельные раны.',
  category: 'special',
  damageMultiplier: 2.0,
  bonusDamage: 50,
  bypassArmor: true,
  conditions: {
    specialCondition: 'dragon_slayer_weapon',
  },
  speciesIds: ['dragon_beast'],
  icon: '⚔️',
  color: 'text-red-500',
  loreReason: 'ЛОР: Драконобои — особый класс воинов, чьё оружие выковано с использованием крови драконов.',
};

// ============================================
// СТИХИЙНЫЕ СЛАБОСТИ
// ============================================

/**
 * Слабость к свету (Демоны, Призраки)
 */
export const WEAKNESS_LIGHT: WeaknessDefinition = {
  id: 'light',
  name: 'Слабость к свету',
  nameEn: 'Light Weakness',
  description: 'Яркий свет обжигает тёмные сущности, нанося урон и ослепляя.',
  category: 'element',
  damageMultiplier: 1.5,
  bonusDamage: 0,
  conditions: {
    element: ['holy'],
    damageType: ['elemental'],
  },
  speciesIds: ['demon_humanoid', 'ghost', 'chaos_spawn', 'cthonian'],
  additionalEffects: {
    condition: 'condition_blind',
    duration: 2,
    chance: 30,
  },
  icon: '☀️',
  color: 'text-yellow-300',
  loreReason: 'ЛОР: Сущности тьмы и хаоса не выносят чистого света. Святой урон разрушает их структуру.',
};

/**
 * Слабость к святому (Демоны, Нежить)
 */
export const WEAKNESS_HOLY: WeaknessDefinition = {
  id: 'holy',
  name: 'Слабость к святому',
  nameEn: 'Holy Weakness',
  description: 'Святая энергия разрушает тёмную сущность, нанося критический урон.',
  category: 'element',
  damageMultiplier: 2.0,
  bonusDamage: 25,
  bypassArmor: true,
  conditions: {
    element: ['holy'],
    damageType: ['elemental', 'qi'],
  },
  speciesIds: ['demon_humanoid', 'ghost', 'chaos_spawn', 'cthonian', 'mutant'],
  icon: '✝️',
  color: 'text-amber-200',
  loreReason: 'ЛОР: Святая энергия — концентрация чистой Ци, которая разрушает искажённые формы жизни.',
};

/**
 * Слабость к воде (Феникс, Огненные элементали)
 */
export const WEAKNESS_WATER: WeaknessDefinition = {
  id: 'water',
  name: 'Слабость к воде',
  nameEn: 'Water Weakness',
  description: 'Вода гасит внутреннее пламя, ослабляя и нанося урон.',
  category: 'element',
  damageMultiplier: 1.5,
  conditions: {
    element: ['water'],
    damageType: ['elemental'],
  },
  speciesIds: ['phoenix', 'fire_elemental'],
  additionalEffects: {
    condition: 'condition_extinguish',
    duration: 3,
    chance: 40,
  },
  icon: '💧',
  color: 'text-blue-400',
  loreReason: 'ЛОР: Огненные сущности теряют силу при контакте с водой.',
};

/**
 * Слабость к огню (Ламии, Змеи)
 */
export const WEAKNESS_FIRE: WeaknessDefinition = {
  id: 'fire',
  name: 'Слабость к огню',
  nameEn: 'Fire Weakness',
  description: 'Огонь наносит дополнительный урон холоднокровным существам.',
  category: 'element',
  damageMultiplier: 1.3,
  conditions: {
    element: ['fire'],
    damageType: ['elemental'],
  },
  speciesIds: ['snake', 'lamia', 'lizard'],
  icon: '🔥',
  color: 'text-orange-400',
  loreReason: 'ЛОР: Холоднокровные существа не переносят высоких температур.',
};

/**
 * Слабость к холоду (Змеи, Рептилии)
 */
export const WEAKNESS_COLD: WeaknessDefinition = {
  id: 'cold',
  name: 'Слабость к холоду',
  nameEn: 'Cold Weakness',
  description: 'Холод замедляет холоднокровных существ, делая их вялыми.',
  category: 'element',
  damageMultiplier: 1.3,
  conditions: {
    element: ['water'],  // Ледяные техники — это water
    damageType: ['elemental'],
    specialCondition: 'cold_damage',
  },
  speciesIds: ['snake', 'lamia', 'lizard'],
  additionalEffects: {
    condition: 'condition_slow',
    duration: 4,
    chance: 60,
  },
  icon: '❄️',
  color: 'text-cyan-300',
  loreReason: 'ЛОР: Холоднокровные существа впадают в спячку при низких температурах.',
};

/**
 * Слабость к пустоте (Духи, Элементали)
 */
export const WEAKNESS_VOID: WeaknessDefinition = {
  id: 'void',
  name: 'Слабость к пустоте',
  nameEn: 'Void Weakness',
  description: 'Пустота поглощает духовную энергию, разрушая нематериальные формы.',
  category: 'element',
  damageMultiplier: 1.75,
  bypassArmor: true,
  conditions: {
    element: ['void'],
    damageType: ['elemental', 'qi'],
  },
  speciesIds: ['ghost', 'fire_elemental', 'water_elemental', 'wind_elemental', 'phoenix', 'celestial_spirit'],
  icon: '🌑',
  color: 'text-purple-500',
  loreReason: 'ЛОР: Пустота — антимагия, которая разрушает любую концентрацию Ци.',
};

/**
 * Слабость к молнии (Водные элементали, Русалки)
 */
export const WEAKNESS_LIGHTNING: WeaknessDefinition = {
  id: 'lightning',
  name: 'Слабость к молнии',
  nameEn: 'Lightning Weakness',
  description: 'Электричество проводит через водную среду, нанося критический урон.',
  category: 'element',
  damageMultiplier: 1.5,
  conditions: {
    element: ['lightning'],
    damageType: ['elemental'],
  },
  speciesIds: ['water_elemental', 'mermaid'],
  icon: '⚡',
  color: 'text-yellow-400',
  loreReason: 'ФИЗИКА: Вода проводит электричество, делая водных существ уязвимыми.',
};

// ============================================
// СПЕЦИАЛЬНЫЕ СЛАБОСТИ
// ============================================

/**
 * Слабость к засухе (Русалки)
 */
export const WEAKNESS_DROUGHT: WeaknessDefinition = {
  id: 'drought',
  name: 'Слабость к засухе',
  nameEn: 'Drought Weakness',
  description: 'Без воды русалка теряет силы и постепенно умирает.',
  category: 'special',
  damageMultiplier: 1.0,
  conditions: {
    specialCondition: 'out_of_water',
  },
  speciesIds: ['mermaid'],
  additionalEffects: {
    condition: 'condition_desiccation',
    duration: -1,  // Постоянно, пока в засухе
    chance: 100,
  },
  icon: '🏜️',
  color: 'text-amber-500',
  loreReason: 'ЛОР: Русалки — водные существа, которые не могут долго находиться на суше.',
};

/**
 * Слабость к отсутствию луны (Оборотни)
 */
export const WEAKNESS_MOON_DEPRIVATION: WeaknessDefinition = {
  id: 'moon_deprivation',
  name: 'Зависимость от луны',
  nameEn: 'Moon Deprivation',
  description: 'Без лунного света оборотень теряет способность к трансформации и слабеет.',
  category: 'special',
  damageMultiplier: 1.0,
  conditions: {
    timeCondition: 'no_moon',
  },
  speciesIds: ['werewolf'],
  additionalEffects: {
    condition: 'condition_weakness',
    duration: -1,
    chance: 100,
  },
  icon: '🌙',
  color: 'text-blue-200',
  loreReason: 'ЛОР: Оборотни связаны с лунным циклом. Новолуние ослабляет их.',
};

/**
 * Слабость к магии (Големы)
 */
export const WEAKNESS_MAGIC: WeaknessDefinition = {
  id: 'magic',
  name: 'Слабость к магии',
  nameEn: 'Magic Weakness',
  description: 'Магические техники Ци разрушают структуру голема.',
  category: 'damage_type',
  damageMultiplier: 1.5,
  conditions: {
    damageType: ['qi'],
  },
  speciesIds: ['golem'],
  icon: '✨',
  color: 'text-purple-400',
  loreReason: 'ЛОР: Големы — конструкты без собственной Ци, уязвимы к внешней Ци.',
};

// ============================================
// СОПРОТИВЛЕНИЯ
// ============================================

/**
 * Сопротивление огню (Демоны, Драконы, Фениксы)
 */
export const RESISTANCE_FIRE: ResistanceDefinition = {
  id: 'fire',
  name: 'Сопротивление огню',
  nameEn: 'Fire Resistance',
  description: 'Огненный урон снижен благодаря врождённой связи с пламенем.',
  category: 'element',
  damageReduction: 50,
  damageMultiplier: 0.5,
  conditions: {
    element: ['fire'],
    damageType: ['elemental'],
  },
  speciesIds: ['demon_humanoid', 'dragon_beast', 'phoenix', 'fire_elemental'],
  icon: '🔥',
  color: 'text-orange-400',
  loreReason: 'ЛОР: Эти существа произошли из огня или имеют с ним связь.',
};

/**
 * Сопротивление физическому урону (Големы, Великаны, Медведи)
 */
export const RESISTANCE_PHYSICAL: ResistanceDefinition = {
  id: 'physical',
  name: 'Сопротивление физике',
  nameEn: 'Physical Resistance',
  description: 'Физический урон снижен благодаря твёрдой структуре тела.',
  category: 'damage_type',
  damageReduction: 30,
  damageMultiplier: 0.7,
  conditions: {
    damageType: ['physical'],
  },
  speciesIds: ['golem', 'giant', 'bear', 'dragon_beast'],
  icon: '🛡️',
  color: 'text-gray-400',
  loreReason: 'ЛОР: Твёрдая материя тела или огромная масса снижает физический урон.',
};

/**
 * Сопротивление ментальным эффектам (Эльфы, Драконы, Небесные духи)
 */
export const RESISTANCE_MENTAL: ResistanceDefinition = {
  id: 'mental',
  name: 'Ментальное сопротивление',
  nameEn: 'Mental Resistance',
  description: 'Сопротивление ментальным атакам и контролю.',
  category: 'condition',
  damageReduction: 0,
  damageMultiplier: 1.0,
  immunity: true,
  conditions: {
    specialCondition: 'mental_effect',
  },
  speciesIds: ['elf', 'dragon_beast', 'celestial_spirit', 'lamia'],
  icon: '🧠',
  color: 'text-purple-300',
  loreReason: 'ЛОР: Древние расы имеют развитую ментальную защиту.',
};

/**
 * Сопротивление ядам (Змеи, Оборотни)
 */
export const RESISTANCE_POISON: ResistanceDefinition = {
  id: 'poison',
  name: 'Сопротивление ядам',
  nameEn: 'Poison Resistance',
  description: 'Иммунитет к большинству ядов.',
  category: 'element',
  damageReduction: 75,
  damageMultiplier: 0.25,
  immunity: false,
  conditions: {
    element: ['poison'],
  },
  speciesIds: ['snake', 'lamia', 'werewolf', 'lizard'],
  icon: '☠️',
  color: 'text-green-400',
  loreReason: 'ЛОР: Эти существа сами вырабатывают яд или имеют к нему иммунитет.',
};

/**
 * Сопротивление болезням (Зверолюды, Оборотни, Мутанты)
 */
export const RESISTANCE_DISEASE: ResistanceDefinition = {
  id: 'disease',
  name: 'Сопротивление болезням',
  nameEn: 'Disease Resistance',
  description: 'Усиленный иммунитет к болезням.',
  category: 'condition',
  damageReduction: 0,
  damageMultiplier: 1.0,
  immunity: true,
  conditions: {
    specialCondition: 'disease_effect',
  },
  speciesIds: ['beastkin', 'werewolf', 'mutant'],
  icon: '🦠',
  color: 'text-lime-400',
  loreReason: 'ЛОР: Звериный иммунитет или мутация даёт защиту от болезней.',
};

/**
 * Сопротивление холоду (Волки, Медведи, Великаны)
 */
export const RESISTANCE_COLD: ResistanceDefinition = {
  id: 'cold',
  name: 'Сопротивление холоду',
  nameEn: 'Cold Resistance',
  description: 'Защита от низких температур.',
  category: 'element',
  damageReduction: 50,
  damageMultiplier: 0.5,
  conditions: {
    element: ['water'],
    specialCondition: 'cold_damage',
  },
  speciesIds: ['wolf', 'bear', 'giant', 'mermaid'],
  icon: '❄️',
  color: 'text-cyan-300',
  loreReason: 'ЛОР: Существа северного происхождения адаптированы к холоду.',
};

/**
 * Сопротивление страху (Тигры)
 */
export const RESISTANCE_FEAR: ResistanceDefinition = {
  id: 'fear',
  name: 'Сопротивление страху',
  nameEn: 'Fear Resistance',
  description: 'Иммунитет к эффектам страха.',
  category: 'condition',
  damageReduction: 0,
  damageMultiplier: 1.0,
  immunity: true,
  conditions: {
    specialCondition: 'fear_effect',
  },
  speciesIds: ['tiger'],
  icon: '😠',
  color: 'text-orange-300',
  loreReason: 'ЛОР: Тигры — хищники без страха.',
};

// ============================================
// РЕЕСТР
// ============================================

/**
 * Все слабости
 */
export const WEAKNESS_REGISTRY: WeaknessDefinition[] = [
  WEAKNESS_IRON,
  WEAKNESS_SILVER,
  WEAKNESS_DRAGON_SLAYER,
  WEAKNESS_LIGHT,
  WEAKNESS_HOLY,
  WEAKNESS_WATER,
  WEAKNESS_FIRE,
  WEAKNESS_COLD,
  WEAKNESS_VOID,
  WEAKNESS_LIGHTNING,
  WEAKNESS_DROUGHT,
  WEAKNESS_MOON_DEPRIVATION,
  WEAKNESS_MAGIC,
];

/**
 * Все сопротивления
 */
export const RESISTANCE_REGISTRY: ResistanceDefinition[] = [
  RESISTANCE_FIRE,
  RESISTANCE_PHYSICAL,
  RESISTANCE_MENTAL,
  RESISTANCE_POISON,
  RESISTANCE_DISEASE,
  RESISTANCE_COLD,
  RESISTANCE_FEAR,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить слабость по ID
 */
export function getWeaknessById(id: string): WeaknessDefinition | undefined {
  return WEAKNESS_REGISTRY.find(w => w.id === id);
}

/**
 * Получить сопротивление по ID
 */
export function getResistanceById(id: string): ResistanceDefinition | undefined {
  return RESISTANCE_REGISTRY.find(r => r.id === id);
}

/**
 * Получить слабости вида
 */
export function getWeaknessesForSpecies(speciesId: string): WeaknessDefinition[] {
  return WEAKNESS_REGISTRY.filter(w => w.speciesIds.includes(speciesId));
}

/**
 * Получить сопротивления вида
 */
export function getResistancesForSpecies(speciesId: string): ResistanceDefinition[] {
  return RESISTANCE_REGISTRY.filter(r => r.speciesIds.includes(speciesId));
}

/**
 * Проверить, есть ли у вида слабость к материалу
 */
export function hasMaterialWeakness(speciesId: string, material: string): boolean {
  const weaknesses = getWeaknessesForSpecies(speciesId);
  return weaknesses.some(w => 
    w.category === 'material' && 
    w.conditions.weaponMaterial?.includes(material as any)
  );
}

/**
 * Получить множитель урона от слабости
 */
export function getWeaknessDamageMultiplier(
  speciesId: string,
  weaponMaterial?: string,
  element?: string,
  damageType?: string
): number {
  const weaknesses = getWeaknessesForSpecies(speciesId);
  let multiplier = 1.0;
  
  for (const weakness of weaknesses) {
    let applies = false;
    
    // Проверка материала
    if (weaponMaterial && weakness.conditions.weaponMaterial?.includes(weaponMaterial as any)) {
      applies = true;
    }
    
    // Проверка стихии
    if (element && weakness.conditions.element?.includes(element as any)) {
      applies = true;
    }
    
    // Проверка типа урона
    if (damageType && weakness.conditions.damageType?.includes(damageType as any)) {
      applies = true;
    }
    
    if (applies) {
      multiplier *= weakness.damageMultiplier;
    }
  }
  
  return multiplier;
}
