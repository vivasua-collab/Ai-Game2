/**
 * ============================================================================
 * ГЕНЕРАТОР ИМЁН ПРЕДМЕТОВ
 * ============================================================================
 * 
 * Генерация имён предметов с учётом рода слова.
 * Важно: прилагательные должны согласовываться с существительными по роду!
 * 
 * Примеры:
 * - "Холодный Клинок" ✓ (мужской род)
 * - "Холодная Сабля" ✓ (женский род)
 * - "Холодное Копьё" ✓ (средний род)
 * - "Холодный Вода" ✗ (несогласовано!)
 */

import type { Element, Gender, Rarity } from './base-item-generator';
import type { ItemType, WeaponType, EquipmentSlot } from './item-config';
import { WEAPON_TYPE_CONFIGS, EQUIPMENT_SLOT_CONFIGS } from './item-config';

// ==================== БАЗЫ ДАННЫХ ====================

/**
 * Прилагательные по элементам с учётом рода
 */
const ELEMENT_ADJECTIVES: Record<Element, {
  male: string[];
  female: string[];
  neuter: string[];
}> = {
  fire: {
    male: ['Огненный', 'Пылающий', 'Раскалённый', 'Пожирающий', 'Вулканический', 'Пламенный'],
    female: ['Огненная', 'Пылающая', 'Раскалённая', 'Пожирающая', 'Вулканическая', 'Пламенная'],
    neuter: ['Огненное', 'Пылающее', 'Раскалённое', 'Пожирающее', 'Вулканическое', 'Пламенное'],
  },
  water: {
    male: ['Ледяной', 'Струящийся', 'Холодный', 'Морской', 'Штормовой', 'Морозный'],
    female: ['Ледяная', 'Струящаяся', 'Холодная', 'Морская', 'Штормовая', 'Морозная'],
    neuter: ['Ледяное', 'Струящееся', 'Холодное', 'Морское', 'Штормовое', 'Морозное'],
  },
  earth: {
    male: ['Каменный', 'Тяжёлый', 'Горный', 'Неизбежный', 'Титанический', 'Скальный'],
    female: ['Каменная', 'Тяжёлая', 'Горная', 'Неизбежная', 'Титаническая', 'Скальная'],
    neuter: ['Каменное', 'Тяжёлое', 'Горное', 'Неизбежное', 'Титаническое', 'Скальное'],
  },
  air: {
    male: ['Стремительный', 'Вихревой', 'Невидимый', 'Порывистый', 'Штормовой', 'Ветряной'],
    female: ['Стремительная', 'Вихревая', 'Невидимая', 'Порывистая', 'Штормовая', 'Ветряная'],
    neuter: ['Стремительное', 'Вихревое', 'Невидимое', 'Порывистое', 'Штормовое', 'Ветряное'],
  },
  lightning: {
    male: ['Молниеносный', 'Искрящийся', 'Громовой', 'Ослепляющий', 'Статический', 'Грозовой'],
    female: ['Молниеносная', 'Искрящаяся', 'Громовая', 'Ослепляющая', 'Статическая', 'Грозовая'],
    neuter: ['Молниеносное', 'Искрящееся', 'Громовое', 'Ослепляющее', 'Статическое', 'Грозовое'],
  },
  void: {
    male: ['Бесплотный', 'Теневой', 'Пустотный', 'Забвенный', 'Эфирный', 'Тёмный'],
    female: ['Бесплотная', 'Теневая', 'Пустотная', 'Забвенная', 'Эфирная', 'Тёмная'],
    neuter: ['Бесплотное', 'Теневое', 'Пустотное', 'Забвенное', 'Эфирное', 'Тёмное'],
  },
  neutral: {
    male: ['Истинный', 'Чистый', 'Сфокусированный', 'Концентрированный', 'Сбалансированный', 'Простой'],
    female: ['Истинная', 'Чистая', 'Сфокусированная', 'Концентрированная', 'Сбалансированная', 'Простая'],
    neuter: ['Истинное', 'Чистое', 'Сфокусированное', 'Концентрированное', 'Сбалансированное', 'Простое'],
  },
};

/**
 * Качественные прилагательные по редкости
 */
const RARITY_ADJECTIVES: Record<Rarity, {
  male: string[];
  female: string[];
  neuter: string[];
}> = {
  common: {
    male: ['Простой', 'Обычный', 'Рядовой', 'Стандартный'],
    female: ['Простая', 'Обычная', 'Рядовая', 'Стандартная'],
    neuter: ['Простое', 'Обычное', 'Рядовое', 'Стандартное'],
  },
  uncommon: {
    male: ['Добротный', 'Качественный', 'Надёжный', 'Улучшенный'],
    female: ['Добротная', 'Качественная', 'Надёжная', 'Улучшенная'],
    neuter: ['Добротное', 'Качественное', 'Надёжное', 'Улучшенное'],
  },
  rare: {
    male: ['Редкий', 'Превосходный', 'Изысканный', 'Мастерский'],
    female: ['Редкая', 'Превосходная', 'Изысканная', 'Мастерская'],
    neuter: ['Редкое', 'Превосходное', 'Изысканное', 'Мастерское'],
  },
  legendary: {
    male: ['Легендарный', 'Божественный', 'Непревзойдённый', 'Вечный', 'Священный'],
    female: ['Легендарная', 'Божественная', 'Непревзойдённая', 'Вечная', 'Священная'],
    neuter: ['Легендарное', 'Божественное', 'Непревзойдённое', 'Вечное', 'Священное'],
  },
};

/**
 * Существительные для оружия (по типу)
 */
const WEAPON_NOUNS: Record<WeaponType, { word: string; gender: Gender }> = {
  // Одноручное клинковое
  sword:         { word: 'Меч', gender: 'male' },
  saber:         { word: 'Сабля', gender: 'female' },
  dagger:        { word: 'Кинжал', gender: 'male' },
  rapier:        { word: 'Рапира', gender: 'female' },
  shortsword:    { word: 'Короткий меч', gender: 'male' },
  
  // Двуручное клинковое
  greatsword:    { word: 'Двуручный меч', gender: 'male' },
  katana:        { word: 'Катана', gender: 'female' },
  claymore:      { word: 'Клеймор', gender: 'male' },
  zweihander:    { word: 'Цвайхандер', gender: 'male' },
  
  // Древковое
  spear:         { word: 'Копьё', gender: 'neuter' },
  glaive:        { word: 'Глефа', gender: 'female' },
  naginata:      { word: 'Нагината', gender: 'female' },
  halberd:       { word: 'Алебарда', gender: 'female' },
  staff:         { word: 'Посох', gender: 'male' },
  
  // Дробящее
  mace:          { word: 'Булава', gender: 'female' },
  hammer:        { word: 'Молот', gender: 'male' },
  flail:         { word: 'Цеп', gender: 'male' },
  club:          { word: 'Дубина', gender: 'female' },
  warhammer:     { word: 'Боевой молот', gender: 'male' },
  
  // Кистевое
  fist:          { word: 'Кулак', gender: 'male' },
  claw:          { word: 'Коготь', gender: 'male' },
  knuckle:       { word: 'Кастет', gender: 'male' },
  glove_weapon:  { word: 'Перчатка', gender: 'female' },
  
  // Метательное
  throwing_knife: { word: 'Метательный нож', gender: 'male' },
  shuriken:      { word: 'Сюрикен', gender: 'male' },
  throwing_axe:  { word: 'Метательный топор', gender: 'male' },
  javelin:       { word: 'Дротик', gender: 'male' },
  
  // Дальнобойное
  bow:           { word: 'Лук', gender: 'male' },
  crossbow:      { word: 'Арбалет', gender: 'male' },
  slingshot:     { word: 'Праща', gender: 'female' },
};

/**
 * Существительные для экипировки (по слоту)
 */
const ARMOR_NOUNS: Record<EquipmentSlot, { words: Array<{ word: string; gender: Gender }> }> = {
  head: {
    words: [
      { word: 'Шлем', gender: 'male' },
      { word: 'Капюшон', gender: 'male' },
      { word: 'Обруч', gender: 'male' },
      { word: 'Корона', gender: 'female' },
      { word: 'Диадема', gender: 'female' },
      { word: 'Маска', gender: 'female' },
    ],
  },
  torso: {
    words: [
      { word: 'Кираса', gender: 'female' },
      { word: 'Доспех', gender: 'male' },
      { word: 'Роба', gender: 'female' },
      { word: 'Куртка', gender: 'female' },
      { word: 'Броня', gender: 'female' },
      { word: 'Нагрудник', gender: 'male' },
    ],
  },
  legs: {
    words: [
      { word: 'Поножи', gender: 'neuter' }, // мн.ч.
      { word: 'Штаны', gender: 'neuter' }, // мн.ч.
      { word: 'Брюки', gender: 'neuter' }, // мн.ч.
      { word: 'Набедренник', gender: 'male' },
    ],
  },
  feet: {
    words: [
      { word: 'Сапоги', gender: 'neuter' }, // мн.ч.
      { word: 'Ботинки', gender: 'neuter' }, // мн.ч.
      { word: 'Сандалии', gender: 'neuter' }, // мн.ч.
      { word: 'Поножи', gender: 'neuter' }, // мн.ч.
    ],
  },
  hands_gloves: {
    words: [
      { word: 'Перчатки', gender: 'neuter' }, // мн.ч.
      { word: 'Рукавицы', gender: 'neuter' }, // мн.ч.
    ],
  },
  hands_bracers: {
    words: [
      { word: 'Наручи', gender: 'neuter' }, // мн.ч.
      { word: 'Наплечники', gender: 'neuter' }, // мн.ч.
      { word: 'Защитный рукав', gender: 'male' },
    ],
  },
};

/**
 * Дополнительные прилагательные для свойств
 */
const PROPERTY_ADJECTIVES: Record<string, {
  male: string[];
  female: string[];
  neuter: string[];
}> = {
  sharp: {
    male: ['Острый', 'Наточенный', 'Бритвенный'],
    female: ['Острая', 'Наточенная', 'Бритвенная'],
    neuter: ['Острое', 'Наточенное', 'Бритвенное'],
  },
  heavy: {
    male: ['Тяжёлый', 'Массивный', 'Громоздкий'],
    female: ['Тяжёлая', 'Массивная', 'Громоздкая'],
    neuter: ['Тяжёлое', 'Массивное', 'Громоздкое'],
  },
  fast: {
    male: ['Быстрый', 'Лёгкий', 'Проворный'],
    female: ['Быстрая', 'Лёгкая', 'Проворная'],
    neuter: ['Быстрое', 'Лёгкое', 'Проворное'],
  },
  durable: {
    male: ['Прочный', 'Крепкий', 'Надёжный'],
    female: ['Прочная', 'Крепкая', 'Надёжная'],
    neuter: ['Прочное', 'Крепкое', 'Надёжное'],
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить прилагательное для элемента с учётом рода
 */
export function getElementAdjective(element: Element, gender: Gender, rng: () => number): string {
  const adjectives = ELEMENT_ADJECTIVES[element][gender];
  return adjectives[Math.floor(rng() * adjectives.length)];
}

/**
 * Получить прилагательное для редкости с учётом рода
 */
export function getRarityAdjective(rarity: Rarity, gender: Gender, rng: () => number): string {
  const adjectives = RARITY_ADJECTIVES[rarity][gender];
  return adjectives[Math.floor(rng() * adjectives.length)];
}

/**
 * Получить род оружия по типу
 */
export function getWeaponGender(type: WeaponType): Gender {
  return WEAPON_NOUNS[type]?.gender || 'male';
}

/**
 * Получить существительное для оружия
 */
export function getWeaponNoun(type: WeaponType): string {
  return WEAPON_NOUNS[type]?.word || 'Оружие';
}

/**
 * Получить случайное существительное для экипировки
 */
export function getArmorNoun(slot: EquipmentSlot, rng: () => number): { word: string; gender: Gender } {
  const words = ARMOR_NOUNS[slot]?.words || [{ word: 'Доспех', gender: 'male' }];
  return words[Math.floor(rng() * words.length)];
}

/**
 * Генерация имени для оружия
 */
export function generateWeaponName(
  weaponType: WeaponType,
  element: Element,
  rarity: Rarity,
  rng: () => number
): { name: string; nameEn: string } {
  const nounData = WEAPON_NOUNS[weaponType];
  if (!nounData) {
    return { name: 'Неизвестное оружие', nameEn: 'Unknown Weapon' };
  }
  
  const { word: noun, gender } = nounData;
  
  // Выбираем паттерн имени
  const patterns = [
    // [элемент] [существительное]
    () => {
      const adj = getElementAdjective(element, gender, rng);
      return `${adj} ${noun}`;
    },
    // [редкость] [существительное]
    () => {
      const adj = getRarityAdjective(rarity, gender, rng);
      return `${adj} ${noun}`;
    },
    // [элемент] [существительное] (без прилагательного для neutral)
    () => {
      if (element === 'neutral') {
        return noun;
      }
      const adj = getElementAdjective(element, gender, rng);
      return `${adj} ${noun}`;
    },
    // [свойство] [элемент] [существительное]
    () => {
      const propKeys = Object.keys(PROPERTY_ADJECTIVES);
      const prop = propKeys[Math.floor(rng() * propKeys.length)];
      const propAdj = PROPERTY_ADJECTIVES[prop][gender][Math.floor(rng() * PROPERTY_ADJECTIVES[prop][gender].length)];
      const elemAdj = element !== 'neutral' ? getElementAdjective(element, gender, rng) + ' ' : '';
      return `${propAdj} ${elemAdj}${noun}`;
    },
  ];
  
  // Выбираем паттерн по редкости
  // common: простые имена (паттерны 0-1)
  // uncommon: стандартные + редкость
  // rare: сложные имена
  // legendary: самые красивые
  let patternIndex: number;
  const roll = rng();
  
  switch (rarity) {
    case 'common':
      patternIndex = roll < 0.6 ? 0 : 1;
      break;
    case 'uncommon':
      patternIndex = roll < 0.4 ? 0 : (roll < 0.8 ? 1 : 2);
      break;
    case 'rare':
      patternIndex = roll < 0.3 ? 0 : (roll < 0.6 ? 1 : (roll < 0.9 ? 2 : 3));
      break;
    case 'legendary':
      patternIndex = roll < 0.2 ? 1 : (roll < 0.5 ? 2 : 3);
      break;
    default:
      patternIndex = 0;
  }
  
  const name = patterns[patternIndex]();
  
  // Английское имя (простая транслитерация)
  const weaponConfig = WEAPON_TYPE_CONFIGS[weaponType];
  const nameEn = weaponConfig ? weaponConfig.nameEn : 'Weapon';
  
  return { name, nameEn };
}

/**
 * Генерация имени для экипировки
 */
export function generateArmorName(
  slot: EquipmentSlot,
  element: Element,
  rarity: Rarity,
  rng: () => number
): { name: string; nameEn: string } {
  const nounData = getArmorNoun(slot, rng);
  const { word: noun, gender } = nounData;
  
  // Паттерны имени
  const patterns = [
    () => {
      const adj = getElementAdjective(element, gender, rng);
      return `${adj} ${noun}`;
    },
    () => {
      const adj = getRarityAdjective(rarity, gender, rng);
      return `${adj} ${noun}`;
    },
    () => {
      if (element === 'neutral') {
        return noun;
      }
      const adj = getElementAdjective(element, gender, rng);
      return `${adj} ${noun}`;
    },
  ];
  
  const roll = rng();
  let patternIndex = 0;
  
  switch (rarity) {
    case 'common':
      patternIndex = roll < 0.7 ? 0 : 1;
      break;
    case 'uncommon':
      patternIndex = roll < 0.5 ? 0 : (roll < 0.9 ? 1 : 2);
      break;
    case 'rare':
    case 'legendary':
      patternIndex = roll < 0.3 ? 0 : (roll < 0.7 ? 1 : 2);
      break;
  }
  
  const name = patterns[patternIndex]();
  
  const slotConfig = EQUIPMENT_SLOT_CONFIGS[slot];
  const nameEn = slotConfig ? slotConfig.nameEn : 'Armor';
  
  return { name, nameEn };
}

/**
 * Генерация имени для предмета (универсальный интерфейс)
 */
export function generateItemName(
  itemType: ItemType,
  options: {
    weaponType?: WeaponType;
    equipmentSlot?: EquipmentSlot;
    element?: Element;
    rarity?: Rarity;
  },
  rng: () => number
): { name: string; nameEn: string } {
  const element = options.element || 'neutral';
  const rarity = options.rarity || 'common';
  
  switch (itemType) {
    case 'weapon':
      if (options.weaponType) {
        return generateWeaponName(options.weaponType, element, rarity, rng);
      }
      return { name: 'Оружие', nameEn: 'Weapon' };
      
    case 'armor':
      if (options.equipmentSlot) {
        return generateArmorName(options.equipmentSlot, element, rarity, rng);
      }
      return { name: 'Экипировка', nameEn: 'Armor' };
      
    default:
      return { name: 'Предмет', nameEn: 'Item' };
  }
}

/**
 * Экспорт баз данных для использования в других модулях
 */
export {
  ELEMENT_ADJECTIVES,
  RARITY_ADJECTIVES,
  WEAPON_NOUNS,
  ARMOR_NOUNS,
  PROPERTY_ADJECTIVES,
};
