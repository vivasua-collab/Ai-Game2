/**
 * ============================================================================
 * ПРЕСЕТЫ ЛИЧНОСТЕЙ (Personality Presets)
 * ============================================================================
 * 
 * Личности определяют поведение и характер NPC:
 * - Черты характера (трейты)
 * - Доминирующие эмоции
 * - Мотивации
 * - Стиль общения
 * - Совместимость с ролями
 * 
 * Личность влияет на:
 * - Отношение к игроку (disposition)
 * - Стиль боя
 * - Торговые отношения
 * - Доверие
 * - Диалоги
 * 
 * ============================================================================
 */

import type { BasePreset } from "./base-preset";

// ============================================
// ТИПЫ
// ============================================

/**
 * Стиль боя
 */
export type CombatStyle = "aggressive" | "defensive" | "balanced";

/**
 * Стиль общения
 */
export type CommunicationStyle = "formal" | "casual" | "aggressive" | "mysterious" | "friendly";

/**
 * Эффект черты характера
 */
export interface TraitEffect {
  dispositionModifier?: number;     // Модификатор отношения (-50 до +50)
  combatStyle?: CombatStyle;        // Стиль боя
  tradeModifier?: number;           // Модификатор цен (-0.5 до +0.5)
  trustRate?: number;               // Скорость доверия (0.1 до 2.0)
  aggressionLevel?: number;         // Уровень агрессии (0-100)
  helpfulness?: number;             // Полезность (0-100)
}

/**
 * Черта характера
 */
export interface PersonalityTrait {
  name: string;
  nameEn: string;
  description: string;
  effects: TraitEffect;
}

/**
 * Интерфейс пресета личности
 */
export interface PersonalityPreset extends BasePreset {
  // === ЧЕРТЫ ХАРАКТЕРА ===
  traits: PersonalityTrait[];
  
  // === ДОМИНИРУЮЩИЕ ЭМОЦИИ ===
  dominantEmotions: string[];
  
  // === МОТИВАЦИИ ===
  motivations: string[];
  
  // === СТИЛЬ ОБЩЕНИЯ ===
  communicationStyle: CommunicationStyle;
  
  // === СОВМЕСТИМЫЕ РОЛИ ===
  compatibleRoles: string[];
  
  // === ИНТЕРВАЛ ОТНОШЕНИЯ ===
  dispositionRange?: {
    min: number;
    max: number;
  };
  
  // === ОСОБЕННОСТИ ДИАЛОГОВ ===
  dialogueHints?: {
    greetings?: string[];
    farewells?: string[];
    topics?: string[];
  };
}

// ============================================
// ПРЕСЕТЫ ЛИЧНОСТЕЙ
// ============================================

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: "wise_mentor",
    name: "Мудрый наставник",
    nameEn: "Wise Mentor",
    description: "Опытный учитель, готовый помочь искренним ученикам.",
    category: "master",
    rarity: "rare",
    traits: [
      {
        name: "Мудрость",
        nameEn: "Wisdom",
        description: "Глубокое понимание мира",
        effects: { dispositionModifier: 10, trustRate: 1.5, helpfulness: 80 },
      },
      {
        name: "Терпение",
        nameEn: "Patience",
        description: "Спокойствие в любых ситуациях",
        effects: { combatStyle: "defensive", aggressionLevel: 10 },
      },
      {
        name: "Доброта",
        nameEn: "Kindness",
        description: "Желание помочь другим",
        effects: { dispositionModifier: 15, helpfulness: 90 },
      },
    ],
    dominantEmotions: ["спокойствие", "мудрость", "тепло"],
    motivations: ["передача знаний", "помощь ученикам", "сохранение традиций"],
    communicationStyle: "formal",
    compatibleRoles: ["elder", "sect_master", "instructor", "hermit"],
    dispositionRange: { min: 30, max: 80 },
    dialogueHints: {
      greetings: ["Добро пожаловать, юный практик.", "Рад видеть тебя на пути познания."],
      farewells: ["Иди с миром и мудростью.", "Пусть Ци ведёт тебя."],
      topics: ["культивация", "мудрость древних", "путь практики"],
    },
    icon: "🧙",
  },
  
  {
    id: "greedy_merchant",
    name: "Жадный торговец",
    nameEn: "Greedy Merchant",
    description: "Купец, одержимый прибылью.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Жадность",
        nameEn: "Greed",
        description: "Стремление к накоплению",
        effects: { dispositionModifier: -5, tradeModifier: 0.3, helpfulness: 20 },
      },
      {
        name: "Хитрость",
        nameEn: "Cunning",
        description: "Умение найти выгоду",
        effects: { trustRate: 0.5 },
      },
      {
        name: "Обаяние",
        nameEn: "Charm",
        description: "Умение убеждать",
        effects: { dispositionModifier: 5 },
      },
    ],
    dominantEmotions: ["алчность", "расчётливость", "радость от сделки"],
    motivations: ["накопление богатства", "расширение торговли", "найти редкие товары"],
    communicationStyle: "casual",
    compatibleRoles: ["merchant", "innkeeper", "noble"],
    dispositionRange: { min: -10, max: 40 },
    dialogueHints: {
      greetings: ["Добро пожаловать! Что желаете приобрести?", "У меня есть всё, что нужно практику!"],
      farewells: ["Приходите ещё! Всегда рад выгоде... то есть вам!", "Пусть ваши камни множатся!"],
      topics: ["цены", "редкие товары", "выгодные сделки"],
    },
    icon: "💰",
  },
  
  {
    id: "hostile_bandit",
    name: "Враждебный бандит",
    nameEn: "Hostile Bandit",
    description: "Агрессивный разбойник, нападающий без предупреждения.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Агрессия",
        nameEn: "Aggression",
        description: "Склонность к насилию",
        effects: { dispositionModifier: -30, combatStyle: "aggressive", aggressionLevel: 90 },
      },
      {
        name: "Жестокость",
        nameEn: "Cruelty",
        description: "Наслаждение чужой болью",
        effects: { dispositionModifier: -20, helpfulness: 5 },
      },
      {
        name: "Нетерпение",
        nameEn: "Impatience",
        description: "Желание быстрых результатов",
        effects: { combatStyle: "aggressive" },
      },
    ],
    dominantEmotions: ["гнев", "алчность", "презрение"],
    motivations: ["нажива", "доминирование", "выживание"],
    communicationStyle: "aggressive",
    compatibleRoles: ["bandit", "criminal", "cultist"],
    dispositionRange: { min: -80, max: -20 },
    dialogueHints: {
      greetings: ["Кошелёк или жизнь!", "Ты труп!"],
      farewells: ["Тебе конец!", "Ещё встретимся..."],
      topics: ["деньги", "насилие", "запугивание"],
    },
    icon: "🗡️",
  },
  
  {
    id: "loyal_guard",
    name: "Верный страж",
    nameEn: "Loyal Guard",
    description: "Преданный защитник, исполняющий долг.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Верность",
        nameEn: "Loyalty",
        description: "Преданность долгу",
        effects: { dispositionModifier: 15, trustRate: 1.2, helpfulness: 60 },
      },
      {
        name: "Храбрость",
        nameEn: "Bravery",
        description: "Отсутствие страха",
        effects: { combatStyle: "defensive", aggressionLevel: 40 },
      },
      {
        name: "Дисциплина",
        nameEn: "Discipline",
        description: "Следование правилам",
        effects: { combatStyle: "balanced" },
      },
    ],
    dominantEmotions: ["решимость", "обязанность", "гордость"],
    motivations: ["защита", "служение", "поддержание порядка"],
    communicationStyle: "formal",
    compatibleRoles: ["guard_combat", "sect_guard", "mercenary"],
    dispositionRange: { min: 0, max: 50 },
    dialogueHints: {
      greetings: ["Стой! Назови себя.", "Проходите, но не нарушайте порядок."],
      farewells: ["Будьте бдительны.", "Порядок превыше всего."],
      topics: ["безопасность", "долг", "правила"],
    },
    icon: "🛡️",
  },
  
  {
    id: "mysterious_hermit",
    name: "Загадочный отшельник",
    nameEn: "Mysterious Hermit",
    description: "Уединённый практик со скрытыми мотивами.",
    category: "master",
    rarity: "rare",
    traits: [
      {
        name: "Таинственность",
        nameEn: "Mystery",
        description: "Скрытность намерений",
        effects: { trustRate: 0.3, dispositionModifier: 5 },
      },
      {
        name: "Мудрость",
        nameEn: "Wisdom",
        description: "Глубокие знания",
        effects: { helpfulness: 50 },
      },
      {
        name: "Отстранённость",
        nameEn: "Detachment",
        description: "Независимость от мира",
        effects: { combatStyle: "balanced", aggressionLevel: 20 },
      },
    ],
    dominantEmotions: ["спокойствие", "загадочность", "глубина"],
    motivations: ["постижение истины", "уединение", "тайные цели"],
    communicationStyle: "mysterious",
    compatibleRoles: ["hermit", "elder", "scholar"],
    dispositionRange: { min: -10, max: 60 },
    dialogueHints: {
      greetings: ["...", "Ты пришёл... зачем?"],
      farewells: ["Иди... путь твой.", "Судьба приведёт снова."],
      topics: ["тайны мира", "древние истины", "путь культивации"],
    },
    icon: "🧘",
  },
  
  {
    id: "arrogant_noble",
    name: "Высокомерный дворянин",
    nameEn: "Arrogant Noble",
    description: "Аристократ, считающий себя выше других.",
    category: "advanced",
    rarity: "uncommon",
    traits: [
      {
        name: "Гордыня",
        nameEn: "Pride",
        description: "Чувство превосходства",
        effects: { dispositionModifier: -10, trustRate: 0.4 },
      },
      {
        name: "Презрение",
        nameEn: "Contempt",
        description: "Неприязнь к низшим",
        effects: { dispositionModifier: -15, helpfulness: 15 },
      },
      {
        name: "Влиятельность",
        nameEn: "Influence",
        description: "Социальная власть",
        effects: { tradeModifier: -0.2 },
      },
    ],
    dominantEmotions: ["презрение", "гордость", "недовольство"],
    motivations: ["поддержание статуса", "власть", "роскошь"],
    communicationStyle: "formal",
    compatibleRoles: ["noble", "sect_master", "elder"],
    dispositionRange: { min: -40, max: 10 },
    dialogueHints: {
      greetings: ["Что тебе нужно, простолюдин?", "Не отнимай моё время."],
      farewells: ["Проваливай.", "Не забывай своё место."],
      topics: ["статус", "богатство", "привилегии"],
    },
    icon: "👑",
  },
  
  {
    id: "kind_healer",
    name: "Добрый целитель",
    nameEn: "Kind Healer",
    description: "Сострадательный лекарь, помогающий всем.",
    category: "advanced",
    rarity: "uncommon",
    traits: [
      {
        name: "Сострадание",
        nameEn: "Compassion",
        description: "Желание помочь",
        effects: { dispositionModifier: 20, helpfulness: 95, trustRate: 1.5 },
      },
      {
        name: "Терпение",
        nameEn: "Patience",
        description: "Спокойствие в лечении",
        effects: { combatStyle: "defensive", aggressionLevel: 5 },
      },
      {
        name: "Знание",
        nameEn: "Knowledge",
        description: "Медицинская экспертиза",
        effects: { tradeModifier: -0.2 },
      },
    ],
    dominantEmotions: ["сострадание", "тепло", "забота"],
    motivations: ["исцеление", "помощь страждущим", "медицинские знания"],
    communicationStyle: "friendly",
    compatibleRoles: ["healer", "alchemist", "sect_alchemist"],
    dispositionRange: { min: 30, max: 80 },
    dialogueHints: {
      greetings: ["Чем могу помочь?", "Вы ранены? Давайте посмотрю."],
      farewells: ["Поправляйтесь!", "Пусть здоровье не покидает вас."],
      topics: ["здоровье", "лечение", "лекарства"],
    },
    icon: "💊",
  },
  
  {
    id: "cunning_assassin",
    name: "Коварный убийца",
    nameEn: "Cunning Assassin",
    description: "Холодный профессионал в искусстве смерти.",
    category: "advanced",
    rarity: "rare",
    traits: [
      {
        name: "Хладнокровие",
        nameEn: "Cold-blooded",
        description: "Отсутствие эмоций",
        effects: { dispositionModifier: -20, combatStyle: "balanced", aggressionLevel: 60 },
      },
      {
        name: "Скрытность",
        nameEn: "Stealth",
        description: "Умение быть незаметным",
        effects: { trustRate: 0.2 },
      },
      {
        name: "Профессионализм",
        nameEn: "Professionalism",
        description: "Выполнение контракта",
        effects: { helpfulness: 20 },
      },
    ],
    dominantEmotions: ["холод", "расчёт", "решимость"],
    motivations: ["выполнение заказа", "оплата", "совершенствование навыков"],
    communicationStyle: "casual",
    compatibleRoles: ["assassin", "criminal", "mercenary"],
    dispositionRange: { min: -50, max: 0 },
    dialogueHints: {
      greetings: ["...", "Ты заказчик?"],
      farewells: ["Дело сделано.", "До следующего раза."],
      topics: ["контракт", "цель", "оплата"],
    },
    icon: "🗡️",
  },
  
  {
    id: "pious_cultist",
    name: "Ревностный культист",
    nameEn: "Pious Cultist",
    description: "Фанатичный последователь тёмной веры.",
    category: "advanced",
    rarity: "uncommon",
    traits: [
      {
        name: "Фанатизм",
        nameEn: "Fanaticism",
        description: "Слепая преданность",
        effects: { dispositionModifier: -15, aggressionLevel: 70, trustRate: 0.3 },
      },
      {
        name: "Преданность",
        nameEn: "Devotion",
        description: "Служение культу",
        effects: { combatStyle: "aggressive" },
      },
      {
        name: "Тайна",
        nameEn: "Secrecy",
        description: "Скрытность культа",
        effects: { trustRate: 0.2 },
      },
    ],
    dominantEmotions: ["фанатизм", "экстаз", "нетерпимость"],
    motivations: ["служение культу", "распространение веры", "тёмные ритуалы"],
    communicationStyle: "mysterious",
    compatibleRoles: ["cultist", "criminal", "bandit"],
    dispositionRange: { min: -60, max: -10 },
    dialogueHints: {
      greetings: ["Во имя тьмы...", "Ты избран... или жертва."],
      farewells: ["Тьма ждёт.", "Вера ведёт нас."],
      topics: ["вера", "ритуалы", "тёмные силы"],
    },
    icon: "🌑",
  },
  
  {
    id: "lazy_servant",
    name: "Ленивый слуга",
    nameEn: "Lazy Servant",
    description: "Нерадивый работник, избегающий труда.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Лень",
        nameEn: "Laziness",
        description: "Нежелание работать",
        effects: { helpfulness: 20, dispositionModifier: 5 },
      },
      {
        name: "Покорность",
        nameEn: "Submissiveness",
        description: "Готовность подчиняться",
        effects: { trustRate: 1.0, combatStyle: "defensive" },
      },
      {
        name: "Хитрость",
        nameEn: "Cunning",
        description: "Умение избежать работы",
        effects: { tradeModifier: 0.1 },
      },
    ],
    dominantEmotions: ["апатия", "скука", "желание отдыха"],
    motivations: ["минимум работы", "комфорт", "спокойствие"],
    communicationStyle: "casual",
    compatibleRoles: ["servant", "farmer", "innkeeper"],
    dispositionRange: { min: -5, max: 30 },
    dialogueHints: {
      greetings: ["А, вы...", "Ну что вам нужно?"],
      farewells: ["Наконец-то...", "Можно и отдохнуть."],
      topics: ["работа (неохотно)", "отдых", "сплетни"],
    },
    icon: "😴",
  },
  
  {
    id: "ambitious_disciple",
    name: "Амбициозный ученик",
    nameEn: "Ambitious Disciple",
    description: "Молодой практик с большими целями.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Амбициозность",
        nameEn: "Ambition",
        description: "Стремление к успеху",
        effects: { dispositionModifier: 5, trustRate: 0.8, helpfulness: 40 },
      },
      {
        name: "Упорство",
        nameEn: "Determination",
        description: "Нежелание сдаваться",
        effects: { combatStyle: "aggressive", aggressionLevel: 50 },
      },
      {
        name: "Соревновательность",
        nameEn: "Competitiveness",
        description: "Желание быть лучшим",
        effects: { dispositionModifier: -5 },
      },
    ],
    dominantEmotions: ["решимость", "зависть", "надежда"],
    motivations: ["продвижение", "сила", "признание"],
    communicationStyle: "casual",
    compatibleRoles: ["candidate", "outer_disciple", "inner_disciple", "core_member"],
    dispositionRange: { min: -10, max: 40 },
    dialogueHints: {
      greetings: ["Привет! Тоже тренируетесь?", "Какой уровень культивации?"],
      farewells: ["Ещё встретимся на пути!", "Надо тренироваться."],
      topics: ["культивация", "соревнования", "продвижение"],
    },
    icon: "🔥",
  },
  
  {
    id: "cynical_elder",
    name: "Циничный старейшина",
    nameEn: "Cynical Elder",
    description: "Опытный практик, разочарованный в мире.",
    category: "master",
    rarity: "rare",
    traits: [
      {
        name: "Цинизм",
        nameEn: "Cynicism",
        description: "Недоверие к людям",
        effects: { dispositionModifier: -10, trustRate: 0.3, helpfulness: 30 },
      },
      {
        name: "Опыт",
        nameEn: "Experience",
        description: "Многолетняя практика",
        effects: { combatStyle: "balanced" },
      },
      {
        name: "Реализм",
        nameEn: "Realism",
        description: "Практический взгляд",
        effects: { tradeModifier: 0.1 },
      },
    ],
    dominantEmotions: ["цинизм", "усталость", "мудрость"],
    motivations: ["покой", "наблюдение", "сохранение опыта"],
    communicationStyle: "formal",
    compatibleRoles: ["elder", "hermit", "scholar"],
    dispositionRange: { min: -20, max: 20 },
    dialogueHints: {
      greetings: ["Опять вы...", "Ладно, что нужно?"],
      farewells: ["Не делайте глупостей.", "Мир жесток, запомните."],
      topics: ["опыт", "реальность", "предостережения"],
    },
    icon: "🧓",
  },
  
  {
    id: "friendly_traveler",
    name: "Дружелюбный путник",
    nameEn: "Friendly Traveler",
    description: "Открытый странник, готовый к общению.",
    category: "basic",
    rarity: "common",
    traits: [
      {
        name: "Дружелюбие",
        nameEn: "Friendliness",
        description: "Открытость к людям",
        effects: { dispositionModifier: 15, trustRate: 1.3, helpfulness: 60 },
      },
      {
        name: "Любопытство",
        nameEn: "Curiosity",
        description: "Интерес к миру",
        effects: { dispositionModifier: 5 },
      },
      {
        name: "Авантюризм",
        nameEn: "Adventurousness",
        description: "Любовь к приключениям",
        effects: { combatStyle: "balanced", aggressionLevel: 30 },
      },
    ],
    dominantEmotions: ["радость", "любопытство", "открытость"],
    motivations: ["путешествия", "новые знакомства", "приключения"],
    communicationStyle: "friendly",
    compatibleRoles: ["traveler", "merchant", "hunter"],
    dispositionRange: { min: 20, max: 70 },
    dialogueHints: {
      greetings: ["Привет, путник!", "Рад встрече!"],
      farewells: ["До новых встреч!", "Удачи в пути!"],
      topics: ["путешествия", "истории", "новости"],
    },
    icon: "😊",
  },
  
  {
    id: "ruthless_warrior",
    name: "Безжалостный воин",
    nameEn: "Ruthless Warrior",
    description: "Сильный боец без моральных ограничений.",
    category: "advanced",
    rarity: "uncommon",
    traits: [
      {
        name: "Безжалостность",
        nameEn: "Ruthlessness",
        description: "Отсутствие жалости",
        effects: { dispositionModifier: -15, combatStyle: "aggressive", aggressionLevel: 80 },
      },
      {
        name: "Дисциплина",
        nameEn: "Discipline",
        description: "Жёсткий самоконтроль",
        effects: { trustRate: 0.7 },
      },
      {
        name: "Сила",
        nameEn: "Strength",
        description: "Физическое превосходство",
        effects: { combatStyle: "aggressive" },
      },
    ],
    dominantEmotions: ["решимость", "презрение", "уверенность"],
    motivations: ["сила", "победа", "доминирование"],
    communicationStyle: "aggressive",
    compatibleRoles: ["warrior", "mercenary", "bandit", "guard_combat"],
    dispositionRange: { min: -30, max: 10 },
    dialogueHints: {
      greetings: ["Ты слаб.", "Бой или уходи."],
      farewells: ["Слабак.", "В следующий раз - смерть."],
      topics: ["сила", "бой", "победа"],
    },
    icon: "⚔️",
  },
  
  {
    id: "eccentric_scholar",
    name: "Эксцентричный учёный",
    nameEn: "Eccentric Scholar",
    description: "Странный исследователь, погружённый в знания.",
    category: "advanced",
    rarity: "uncommon",
    traits: [
      {
        name: "Эксцентричность",
        nameEn: "Eccentricity",
        description: "Странное поведение",
        effects: { dispositionModifier: 5, trustRate: 0.6 },
      },
      {
        name: "Интеллект",
        nameEn: "Intelligence",
        description: "Глубокие знания",
        effects: { helpfulness: 50, combatStyle: "defensive" },
      },
      {
        name: "Одержимость",
        nameEn: "Obsession",
        description: "Фокус на исследованиях",
        effects: { dispositionModifier: -5 },
      },
    ],
    dominantEmotions: ["любопытство", "возбуждение", "растерянность"],
    motivations: ["знания", "исследования", "открытия"],
    communicationStyle: "mysterious",
    compatibleRoles: ["scholar", "alchemist", "sect_alchemist"],
    dispositionRange: { min: -5, max: 40 },
    dialogueHints: {
      greetings: ["А? Что? Кто вы?", "Интересно, интересно..."],
      farewells: ["Надо записать...", "Великолепно!"],
      topics: ["наука", "исследования", "странные явления"],
    },
    icon: "📚",
  },
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить личность по ID
 */
export function getPersonalityById(id: string): PersonalityPreset | undefined {
  return PERSONALITY_PRESETS.find(p => p.id === id);
}

/**
 * Получить все личности
 */
export function getAllPersonalities(): PersonalityPreset[] {
  return PERSONALITY_PRESETS;
}

/**
 * Получить совместимые личности для роли
 */
export function getCompatiblePersonalities(roleId: string): PersonalityPreset[] {
  return PERSONALITY_PRESETS.filter(p => p.compatibleRoles.includes(roleId));
}

/**
 * Получить личности по стилю общения
 */
export function getPersonalitiesByCommunicationStyle(style: CommunicationStyle): PersonalityPreset[] {
  return PERSONALITY_PRESETS.filter(p => p.communicationStyle === style);
}

/**
 * Получить личности по стилю боя
 */
export function getPersonalitiesByCombatStyle(style: CombatStyle): PersonalityPreset[] {
  return PERSONALITY_PRESETS.filter(p => 
    p.traits.some(t => t.effects.combatStyle === style)
  );
}

/**
 * Получить дружелюбные личности
 */
export function getFriendlyPersonalities(): PersonalityPreset[] {
  return PERSONALITY_PRESETS.filter(p => 
    (p.dispositionRange?.min ?? 0) >= 0
  );
}

/**
 * Получить враждебные личности
 */
export function getHostilePersonalities(): PersonalityPreset[] {
  return PERSONALITY_PRESETS.filter(p => 
    (p.dispositionRange?.max ?? 0) <= 0
  );
}

/**
 * Получить случайную личность
 */
export function getRandomPersonality(): PersonalityPreset {
  return PERSONALITY_PRESETS[Math.floor(Math.random() * PERSONALITY_PRESETS.length)];
}

/**
 * Получить случайную совместимую личность для роли
 */
export function getRandomCompatiblePersonality(roleId: string): PersonalityPreset {
  const compatible = getCompatiblePersonalities(roleId);
  if (compatible.length === 0) return getRandomPersonality();
  return compatible[Math.floor(Math.random() * compatible.length)];
}

/**
 * Получить суммарные эффекты черт личности
 */
export function getPersonalityTraitEffects(personality: PersonalityPreset): TraitEffect {
  const combined: TraitEffect = {};
  
  for (const trait of personality.traits) {
    const effects = trait.effects;
    
    if (effects.dispositionModifier !== undefined) {
      combined.dispositionModifier = (combined.dispositionModifier ?? 0) + effects.dispositionModifier;
    }
    if (effects.combatStyle !== undefined) {
      combined.combatStyle = effects.combatStyle;
    }
    if (effects.tradeModifier !== undefined) {
      combined.tradeModifier = (combined.tradeModifier ?? 0) + effects.tradeModifier;
    }
    if (effects.trustRate !== undefined) {
      combined.trustRate = Math.min(2.0, (combined.trustRate ?? 1.0) * effects.trustRate);
    }
    if (effects.aggressionLevel !== undefined) {
      combined.aggressionLevel = Math.max(combined.aggressionLevel ?? 0, effects.aggressionLevel);
    }
    if (effects.helpfulness !== undefined) {
      combined.helpfulness = (combined.helpfulness ?? 0) + effects.helpfulness;
    }
  }
  
  return combined;
}

/**
 * Статистика по личностям
 */
export function getPersonalityStats(): {
  total: number;
  byCommunicationStyle: Record<CommunicationStyle, number>;
  friendly: number;
  hostile: number;
} {
  const styles: CommunicationStyle[] = ["formal", "casual", "aggressive", "mysterious", "friendly"];
  const byCommunicationStyle = {} as Record<CommunicationStyle, number>;
  
  for (const style of styles) {
    byCommunicationStyle[style] = getPersonalitiesByCommunicationStyle(style).length;
  }
  
  return {
    total: PERSONALITY_PRESETS.length,
    byCommunicationStyle,
    friendly: getFriendlyPersonalities().length,
    hostile: getHostilePersonalities().length,
  };
}
