/**
 * MATERIALS REGISTRY
 * 
 * Реестр всех материалов мира культивации.
 * 
 * === ИЕРАРХИЯ МАТЕРИАЛОВ ===
 * 
 * T1 (Уровень 1-2): Обычные материалы
 *   - Добываются в поверхностных слоях (0-10 км)
 *   - Низкая проводимость Ци (5-30%)
 *   - Лор: "Верхние слои (0–10 км) — Поверхностная кора"
 * 
 * T2 (Уровень 3-4): Улучшенные материалы
 *   - Добываются из средних слоёв (10-2000 км)
 *   - Средняя проводимость Ци (20-50%)
 *   - Лор: "Средние слои (10–2 000 км) — Зона лей-линий"
 * 
 * T3 (Уровень 5-6): Духовные материалы
 *   - Добываются из мест силы и глубин
 *   - Высокая проводимость Ци (40-80%)
 *   - Лор: "Места силы имеют значительно повышенный фон"
 * 
 * T4 (Уровень 7-8): Небесные материалы
 *   - Редчайшие находки из недр и древних руин
 *   - Очень высокая проводимость (70-100%)
 *   - Лор: "Глубинные слои (2 000–5 000 км) — Структура Ци"
 * 
 * T5 (Уровень 9): Хаотичные/Первородные материалы
 *   - Легендарные материалы древности
 *   - Проводимость 100%+
 *   - Лор: "Хаотичная Ци имеет выше энергетический потенциал"
 */

import {
  MaterialDefinition,
  MaterialTier,
  MaterialCategory,
  MaterialProperties,
  MaterialBonus,
  MaterialGenerationConfig,
} from '@/types/materials';

// ============================================================================
// TIER 1: ОБЫЧНЫЕ МАТЕРИАЛЫ
// ============================================================================

const T1_MATERIALS: MaterialDefinition[] = [
  // === МЕТАЛЛЫ ===
  {
    id: 'iron',
    name: 'Железо',
    tier: 1,
    category: 'metal',
    properties: {
      durability: 30,
      qiConductivity: 10,
      weight: 3.0,
      hardness: 5,
      flexibility: 3,
    },
    bonuses: [],
    description: 'Обычное железо из поверхностных руд. Низкая проводимость Ци.',
    rarity: 100,
    source: 'Поверхностные рудники (0-2 км)',
  },
  {
    id: 'copper',
    name: 'Медь',
    tier: 1,
    category: 'metal',
    properties: {
      durability: 20,
      qiConductivity: 25,
      weight: 4.0,
      hardness: 3,
      flexibility: 6,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 2, isMultiplier: false },
    ],
    description: 'Мягкий металл с хорошей проводимостью Ци. Используется для проводников.',
    rarity: 80,
    source: 'Поверхностные рудники (0-3 км)',
  },

  // === ОРГАНИКА ===
  {
    id: 'leather',
    name: 'Кожа',
    tier: 1,
    category: 'organic',
    properties: {
      durability: 20,
      qiConductivity: 5,
      weight: 0.5,
      hardness: 2,
      flexibility: 8,
    },
    bonuses: [],
    description: 'Обычная кожа животных. Лёгкая, гибкая, но слабо проводит Ци.',
    rarity: 100,
    source: 'Охота на обычных животных',
  },
  {
    id: 'cloth',
    name: 'Ткань',
    tier: 1,
    category: 'organic',
    properties: {
      durability: 10,
      qiConductivity: 15,
      weight: 0.2,
      hardness: 1,
      flexibility: 10,
    },
    bonuses: [],
    description: 'Обычная ткань из хлопка или льна. Хорошо проводит Ци.',
    rarity: 100,
    source: 'Выращивание растений',
  },
  {
    id: 'bone',
    name: 'Кость',
    tier: 1,
    category: 'organic',
    properties: {
      durability: 25,
      qiConductivity: 20,
      weight: 1.5,
      hardness: 4,
      flexibility: 3,
    },
    bonuses: [
      { type: 'combat_damage', value: 3, isMultiplier: false },
    ],
    description: 'Обычная кость животных. Проводит Ци лучше металла.',
    rarity: 80,
    source: 'Охота на животных',
  },

  // === ДЕРЕВО ===
  {
    id: 'wood',
    name: 'Дерево',
    tier: 1,
    category: 'wood',
    properties: {
      durability: 15,
      qiConductivity: 20,
      weight: 1.0,
      hardness: 3,
      flexibility: 5,
    },
    bonuses: [],
    description: 'Обычное дерево из лесов. Баланс параметров.',
    rarity: 100,
    source: 'Леса и рощи',
  },

  // === МИНЕРАЛЫ ===
  {
    id: 'stone',
    name: 'Камень',
    tier: 1,
    category: 'mineral',
    properties: {
      durability: 40,
      qiConductivity: 5,
      weight: 5.0,
      hardness: 8,
      flexibility: 1,
    },
    bonuses: [],
    description: 'Обычный камень. Тяжёлый и прочный, но не проводит Ци.',
    rarity: 100,
    source: 'Каменоломни',
  },
];

// ============================================================================
// TIER 2: УЛУЧШЕННЫЕ МАТЕРИАЛЫ
// ============================================================================

const T2_MATERIALS: MaterialDefinition[] = [
  // === МЕТАЛЛЫ ===
  {
    id: 'steel',
    name: 'Сталь',
    tier: 2,
    category: 'metal',
    properties: {
      durability: 50,
      qiConductivity: 15,
      weight: 3.5,
      hardness: 7,
      flexibility: 4,
    },
    bonuses: [
      { type: 'combat_damage', value: 8, isMultiplier: false },
    ],
    description: 'Улучшенная сталь. Прочнее железа, лучше держит заточку.',
    rarity: 60,
    source: 'Глубокие шахты (2-10 км)',
  },
  {
    id: 'bronze',
    name: 'Бронза',
    tier: 2,
    category: 'metal',
    properties: {
      durability: 40,
      qiConductivity: 30,
      weight: 4.5,
      hardness: 6,
      flexibility: 4,
    },
    bonuses: [
      { type: 'defense_armor', value: 5, isMultiplier: false },
    ],
    description: 'Сплав меди и олова. Хорошо проводит Ци, подходит для брони.',
    rarity: 50,
    source: 'Глубокие шахты (3-8 км)',
  },

  // === ОРГАНИКА ===
  {
    id: 'silk',
    name: 'Шёлк',
    tier: 2,
    category: 'organic',
    properties: {
      durability: 15,
      qiConductivity: 45,
      weight: 0.1,
      hardness: 1,
      flexibility: 10,
    },
    bonuses: [
      { type: 'defense_evasion', value: 5, isMultiplier: false },
    ],
    description: 'Шёлк от особых гусениц. Отличная проводимость Ци.',
    rarity: 40,
    source: 'Шёлковые фермы',
  },
  {
    id: 'ivory',
    name: 'Слоновая кость',
    tier: 2,
    category: 'organic',
    properties: {
      durability: 35,
      qiConductivity: 40,
      weight: 2.0,
      hardness: 5,
      flexibility: 4,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 3, isMultiplier: false },
    ],
    description: 'Кость крупных животных. Отличная проводимость Ци.',
    rarity: 30,
    source: 'Охота на крупных зверей',
  },

  // === ДЕРЕВО ===
  {
    id: 'hardwood',
    name: 'Твёрдое дерево',
    tier: 2,
    category: 'wood',
    properties: {
      durability: 30,
      qiConductivity: 30,
      weight: 1.5,
      hardness: 6,
      flexibility: 4,
    },
    bonuses: [
      { type: 'combat_crit_chance', value: 2, isMultiplier: false },
    ],
    description: 'Плотное дерево из древних лесов. Прочное и упругое.',
    rarity: 50,
    source: 'Древние леса',
  },

  // === МИНЕРАЛЫ ===
  {
    id: 'marble',
    name: 'Мрамор',
    tier: 2,
    category: 'mineral',
    properties: {
      durability: 60,
      qiConductivity: 15,
      weight: 6.0,
      hardness: 9,
      flexibility: 1,
    },
    bonuses: [
      { type: 'defense_armor', value: 8, isMultiplier: false },
    ],
    description: 'Плотный мрамор из глубоких каменолен. Очень твёрдый.',
    rarity: 40,
    source: 'Глубокие каменоломни (5-15 км)',
  },
];

// ============================================================================
// TIER 3: ДУХОВНЫЕ МАТЕРИАЛЫ
// ============================================================================

const T3_MATERIALS: MaterialDefinition[] = [
  // === МЕТАЛЛЫ ===
  {
    id: 'spirit_iron',
    name: 'Духовное железо',
    tier: 3,
    category: 'metal',
    properties: {
      durability: 70,
      qiConductivity: 55,
      weight: 3.5,
      hardness: 8,
      flexibility: 5,
    },
    bonuses: [
      { type: 'combat_damage', value: 20, isMultiplier: false },
      { type: 'qi_cost_reduction', value: 8, isMultiplier: false },
    ],
    description: 'Железо, насыщенное Ци из лей-линий. Светится слабым светом.',
    rarity: 20,
    source: 'Лей-линии (10-500 км глубина)',
    requiredLevel: 5,
  },
  {
    id: 'cold_iron',
    name: 'Хладное железо',
    tier: 3,
    category: 'metal',
    properties: {
      durability: 65,
      qiConductivity: 45,
      weight: 3.5,
      hardness: 7,
      flexibility: 4,
    },
    bonuses: [
      { type: 'elemental_cold', value: 15, isMultiplier: false },
      { type: 'combat_damage', value: 12, isMultiplier: false },
    ],
    description: 'Железо из холодных недр. Наносит ледяной урон.',
    rarity: 15,
    source: 'Холодные глубины (200-1000 км)',
    requiredLevel: 5,
  },

  // === ОРГАНИКА ===
  {
    id: 'spirit_silk',
    name: 'Духовный шёлк',
    tier: 3,
    category: 'organic',
    properties: {
      durability: 25,
      qiConductivity: 75,
      weight: 0.1,
      hardness: 1,
      flexibility: 10,
    },
    bonuses: [
      { type: 'defense_evasion', value: 12, isMultiplier: false },
      { type: 'qi_regeneration', value: 8, isMultiplier: false },
    ],
    description: 'Шёлк от духовных червей. Почти невесомый, отлично проводит Ци.',
    rarity: 15,
    source: 'Духовные черви в местах силы',
    requiredLevel: 5,
  },
  {
    id: 'spirit_bone',
    name: 'Духовная кость',
    tier: 3,
    category: 'organic',
    properties: {
      durability: 50,
      qiConductivity: 65,
      weight: 1.8,
      hardness: 6,
      flexibility: 4,
    },
    bonuses: [
      { type: 'combat_damage', value: 15, isMultiplier: false },
      { type: 'qi_cost_reduction', value: 10, isMultiplier: false },
    ],
    description: 'Кость духовного зверя. Содержит сжатую Ци.',
    rarity: 10,
    source: 'Охота на духовных зверей',
    requiredLevel: 5,
  },

  // === ДЕРЕВО ===
  {
    id: 'ironwood',
    name: 'Железное дерево',
    tier: 3,
    category: 'wood',
    properties: {
      durability: 55,
      qiConductivity: 50,
      weight: 2.5,
      hardness: 8,
      flexibility: 3,
    },
    bonuses: [
      { type: 'defense_armor', value: 8, isMultiplier: false },
      { type: 'combat_crit_damage', value: 15, isMultiplier: false },
    ],
    description: 'Дерево твёрже железа из мест силы.',
    rarity: 15,
    source: 'Места силы, древние рощи',
    requiredLevel: 5,
  },

  // === МИНЕРАЛЫ ===
  {
    id: 'jade',
    name: 'Нефрит',
    tier: 3,
    category: 'mineral',
    properties: {
      durability: 50,
      qiConductivity: 85,
      weight: 3.0,
      hardness: 7,
      flexibility: 2,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 12, isMultiplier: false },
      { type: 'special_meditation_bonus', value: 15, isMultiplier: false },
    ],
    description: 'Нефрит из глубин. Идеален для культивации и артефактов.',
    rarity: 10,
    source: 'Глубинные жилы нефрита (500-2000 км)',
    requiredLevel: 5,
  },
  {
    id: 'spirit_crystal_shard',
    name: 'Осколок кристалла Ци',
    tier: 3,
    category: 'crystal',
    properties: {
      durability: 30,
      qiConductivity: 90,
      weight: 0.5,
      hardness: 5,
      flexibility: 2,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 15, isMultiplier: false },
    ],
    description: 'Осколок кристалла Ци (духовного камня). Высокая проводимость.',
    rarity: 8,
    source: 'Залежи кристаллов Ци',
    requiredLevel: 5,
  },
];

// ============================================================================
// TIER 4: НЕБЕСНЫЕ МАТЕРИАЛЫ
// ============================================================================

const T4_MATERIALS: MaterialDefinition[] = [
  // === МЕТАЛЛЫ ===
  {
    id: 'star_metal',
    name: 'Звёздный металл',
    tier: 4,
    category: 'metal',
    properties: {
      durability: 90,
      qiConductivity: 75,
      weight: 2.0,
      hardness: 10,
      flexibility: 6,
    },
    bonuses: [
      { type: 'combat_damage', value: 40, isMultiplier: false },
      { type: 'combat_armor_penetration', value: 15, isMultiplier: false },
      { type: 'qi_cost_reduction', value: 15, isMultiplier: false },
    ],
    description: 'Металл с "упавших звёзд" — из купола мира. Редчайший материал.',
    rarity: 5,
    source: 'Падения с купола мира (редчайшие события)',
    requiredLevel: 7,
  },
  {
    id: 'thunder_metal',
    name: 'Громовой металл',
    tier: 4,
    category: 'metal',
    properties: {
      durability: 80,
      qiConductivity: 70,
      weight: 2.5,
      hardness: 9,
      flexibility: 5,
    },
    bonuses: [
      { type: 'elemental_lightning', value: 25, isMultiplier: false },
      { type: 'combat_damage', value: 25, isMultiplier: false },
    ],
    description: 'Металл, закалённый в грозовых бурях мест силы.',
    rarity: 4,
    source: 'Грозовые места силы',
    requiredLevel: 7,
  },

  // === ОРГАНИКА ===
  {
    id: 'dragon_bone',
    name: 'Кость дракона',
    tier: 4,
    category: 'organic',
    properties: {
      durability: 85,
      qiConductivity: 95,
      weight: 2.5,
      hardness: 9,
      flexibility: 7,
    },
    bonuses: [
      { type: 'combat_damage', value: 35, isMultiplier: false },
      { type: 'qi_regeneration', value: 20, isMultiplier: false },
      { type: 'elemental_fire', value: 20, isMultiplier: false },
    ],
    description: 'Кость древнего дракона. Содержит сжатую Ци тысячелетий.',
    rarity: 3,
    source: 'Древние драконы (легендарные существа)',
    requiredLevel: 7,
  },
  {
    id: 'heavenly_silk',
    name: 'Небесный шёлк',
    tier: 4,
    category: 'organic',
    properties: {
      durability: 40,
      qiConductivity: 100,
      weight: 0.05,
      hardness: 2,
      flexibility: 10,
    },
    bonuses: [
      { type: 'defense_evasion', value: 25, isMultiplier: false },
      { type: 'qi_regeneration', value: 25, isMultiplier: false },
      { type: 'special_stealth', value: 20, isMultiplier: false },
    ],
    description: 'Шёлк небесных червей из вершин купола. Почти невидим.',
    rarity: 3,
    source: 'Небесные черви (вершины купола)',
    requiredLevel: 7,
  },

  // === ДЕРЕВО ===
  {
    id: 'void_wood',
    name: 'Пустотное дерево',
    tier: 4,
    category: 'wood',
    properties: {
      durability: 60,
      qiConductivity: 90,
      weight: 0.3,
      hardness: 8,
      flexibility: 8,
    },
    bonuses: [
      { type: 'combat_crit_chance', value: 10, isMultiplier: false },
      { type: 'combat_crit_damage', value: 35, isMultiplier: false },
      { type: 'qi_cost_reduction', value: 20, isMultiplier: false },
    ],
    description: 'Дерево из пустоты между мирами. Лор: "Дерево из пустоты между мирами".',
    rarity: 3,
    source: 'Разрывы в куполе мира',
    requiredLevel: 7,
  },

  // === МИНЕРАЛЫ ===
  {
    id: 'spirit_crystal',
    name: 'Духовный кристалл',
    tier: 4,
    category: 'crystal',
    properties: {
      durability: 70,
      qiConductivity: 100,
      weight: 2.0,
      hardness: 8,
      flexibility: 1,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 30, isMultiplier: false },
      { type: 'special_meditation_bonus', value: 40, isMultiplier: false },
      { type: 'elemental_all', value: 10, isMultiplier: false },
    ],
    description: 'Чистый кристалл Ци. Лор: "кристаллы Ци плотность 1024 ед/см³".',
    rarity: 2,
    source: 'Сердце мира, глубинные залежи',
    requiredLevel: 7,
  },
];

// ============================================================================
// TIER 5: ХАОТИЧНЫЕ / ПЕРВОРОДНЫЕ МАТЕРИАЛЫ
// ============================================================================

const T5_MATERIALS: MaterialDefinition[] = [
  // === ОСОБЫЕ МАТЕРИАЛЫ ===
  {
    id: 'void_matter',
    name: 'Пустотная материя',
    tier: 5,
    category: 'metal',
    properties: {
      durability: 100,
      qiConductivity: 100,
      weight: 0.1,
      hardness: 10,
      flexibility: 10,
    },
    bonuses: [
      { type: 'combat_damage', value: 80, isMultiplier: false },
      { type: 'defense_armor', value: 40, isMultiplier: false },
      { type: 'qi_cost_reduction', value: 40, isMultiplier: false },
      { type: 'special_void_resistance', value: 100, isMultiplier: false },
    ],
    description: 'Материя из глубин пустоты за куполом мира. Существует вне законов.',
    rarity: 1,
    source: 'За границей купола мира',
    requiredLevel: 9,
  },
  {
    id: 'chaos_matter',
    name: 'Хаотичная материя',
    tier: 5,
    category: 'metal',
    properties: {
      durability: 80,
      qiConductivity: 120,
      weight: 5.0,
      hardness: 10,
      flexibility: 10,
    },
    bonuses: [
      { type: 'combat_damage', value: 120, isMultiplier: false },
      { type: 'combat_crit_chance', value: 20, isMultiplier: false },
      { type: 'combat_crit_damage', value: 80, isMultiplier: false },
      { type: 'special_chaos_effect', value: 100, isMultiplier: false },
    ],
    description: 'Нестабильная материя хаоса. Лор: "Хаотичная Ци имеет выше энергетический потенциал".',
    rarity: 0.5,
    source: 'Древние катаклизмы, разрывы реальности',
    requiredLevel: 9,
  },
  {
    id: 'primordial_essence',
    name: 'Первородная эссенция',
    tier: 5,
    category: 'crystal',
    properties: {
      durability: 150,
      qiConductivity: 150,
      weight: 0.01,
      hardness: 10,
      flexibility: 10,
    },
    bonuses: [
      { type: 'combat_damage', value: 150, isMultiplier: false },
      { type: 'defense_all', value: 80, isMultiplier: false },
      { type: 'qi_regeneration', value: 80, isMultiplier: false },
      { type: 'special_immortality', value: 1, isMultiplier: false },
    ],
    description: 'Эссенция творения из начала времён. Материал существовал до мира.',
    rarity: 0.1,
    source: 'Начало времён (недоступно обычным путям)',
    requiredLevel: 9,
  },
  {
    id: 'heart_of_world_shard',
    name: 'Осколок Сердца Мира',
    tier: 5,
    category: 'crystal',
    properties: {
      durability: 120,
      qiConductivity: 130,
      weight: 0.5,
      hardness: 10,
      flexibility: 5,
    },
    bonuses: [
      { type: 'qi_regeneration', value: 100, isMultiplier: false },
      { type: 'special_world_connection', value: 1, isMultiplier: false },
      { type: 'special_infinite_qi_pool', value: 1, isMultiplier: false },
    ],
    description: 'Осколок Сердца Мира. Лор: "Сердце Мира — портал в подпространство для хранения Ци".',
    rarity: 0.2,
    source: 'Сердце Мира (глубина 5000+ км)',
    requiredLevel: 9,
  },
];

// ============================================================================
// REGISTRY CLASS
// ============================================================================

/**
 * Реестр материалов
 */
class MaterialsRegistry {
  private materials: Map<string, MaterialDefinition> = new Map();
  private byTier: Map<MaterialTier, MaterialDefinition[]> = new Map();
  private byCategory: Map<MaterialCategory, MaterialDefinition[]> = new Map();

  constructor() {
    // Инициализация пустых массивов
    for (let i = 1; i <= 5; i++) {
      this.byTier.set(i as MaterialTier, []);
    }
    
    const categories: MaterialCategory[] = ['metal', 'organic', 'mineral', 'wood', 'crystal'];
    for (const cat of categories) {
      this.byCategory.set(cat, []);
    }
  }

  /**
   * Зарегистрировать материал
   */
  register(material: MaterialDefinition): void {
    this.materials.set(material.id, material);
    
    // По тиру
    const tierList = this.byTier.get(material.tier) ?? [];
    tierList.push(material);
    this.byTier.set(material.tier, tierList);
    
    // По категории
    const catList = this.byCategory.get(material.category) ?? [];
    catList.push(material);
    this.byCategory.set(material.category, catList);
  }

  /**
   * Получить материал по ID
   */
  get(id: string): MaterialDefinition | undefined {
    return this.materials.get(id);
  }

  /**
   * Получить все материалы тира
   */
  getByTier(tier: MaterialTier): MaterialDefinition[] {
    return this.byTier.get(tier) ?? [];
  }

  /**
   * Получить все материалы категории
   */
  getByCategory(category: MaterialCategory): MaterialDefinition[] {
    return this.byCategory.get(category) ?? [];
  }

  /**
   * Получить все материалы
   */
  getAll(): MaterialDefinition[] {
    return Array.from(this.materials.values());
  }

  /**
   * Дефолтный материал для тира
   */
  getDefault(tier: MaterialTier): MaterialDefinition {
    const tierMaterials = this.byTier.get(tier) ?? [];
    
    // Приоритет: металлы, затем другие категории
    const metal = tierMaterials.find(m => m.category === 'metal');
    if (metal) return metal;
    
    return tierMaterials[0] ?? this.materials.get('iron')!;
  }

  /**
   * Выбрать случайный материал
   */
  selectRandom(
    config?: MaterialGenerationConfig,
    rng: () => number = Math.random
  ): MaterialDefinition {
    let candidates = this.getAll();

    // Фильтрация по тиру
    if (config?.minTier !== undefined || config?.maxTier !== undefined) {
      const min = config.minTier ?? 1;
      const max = config.maxTier ?? 5;
      candidates = candidates.filter(m => m.tier >= min && m.tier <= max);
    }

    // Фильтрация по категории
    if (config?.category) {
      candidates = candidates.filter(m => m.category === config.category);
    }

    // Исключение по ID
    if (config?.excludeIds) {
      candidates = candidates.filter(m => !config.excludeIds.includes(m.id));
    }

    if (candidates.length === 0) {
      return this.getDefault(1);
    }

    // Весовой выбор по редкости
    if (config?.preferHighRarity) {
      // Предпочтение редким (низкое значение rarity = редкий)
      candidates.sort((a, b) => a.rarity - b.rarity);
    } else {
      // Обычный весовой выбор (высокое rarity = чаще)
      const weighted = candidates.flatMap(m =>
        Array(Math.max(1, Math.floor(m.rarity))).fill(m)
      );
      const index = Math.floor(rng() * weighted.length);
      return weighted[index] ?? candidates[0];
    }

    return candidates[0];
  }

  /**
   * Получить материалы по уровню культивации
   */
  getByCultivationLevel(level: number): MaterialDefinition[] {
    // Определить подходящий тир по уровню
    let tier: MaterialTier = 1;
    if (level >= 9) tier = 5;
    else if (level >= 7) tier = 4;
    else if (level >= 5) tier = 3;
    else if (level >= 3) tier = 2;

    return this.getByTier(tier);
  }

  /**
   * Проверить существование материала
   */
  has(id: string): boolean {
    return this.materials.has(id);
  }

  /**
   * Количество материалов
   */
  get count(): number {
    return this.materials.size;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const materialsRegistry = new MaterialsRegistry();

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeRegistry(): void {
  // Регистрация всех материалов
  const allMaterials = [
    ...T1_MATERIALS,
    ...T2_MATERIALS,
    ...T3_MATERIALS,
    ...T4_MATERIALS,
    ...T5_MATERIALS,
  ];

  for (const material of allMaterials) {
    materialsRegistry.register(material);
  }
}

// Инициализация при импорте
initializeRegistry();

// ============================================================================
// EXPORTS
// ============================================================================

export {
  T1_MATERIALS,
  T2_MATERIALS,
  T3_MATERIALS,
  T4_MATERIALS,
  T5_MATERIALS,
};
