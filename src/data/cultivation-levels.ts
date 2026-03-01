// Уровни культивации и их характеристики

export interface CultivationLevel {
  level: number;
  name: string;
  nameRu: string;
  qiDensity: number; // Плотность Ци: 2^(level-1) ед/см³
  description: string;
  abilities: string[];
  physicalChanges: string[];
  agingFactor: number; // Множитель старения (1 = нормально, 0.5 = в 2 раза медленнее)
  regenerationMultiplier: number; // Множитель регенерации
  conductivityMultiplier: number; // Множитель проводимости
}

export const CULTIVATION_LEVELS: CultivationLevel[] = [
  {
    level: 1,
    name: "Awakened Core",
    nameRu: "Пробуждённое Ядро",
    qiDensity: 1, // 2^0
    description: "Ци впервые конденсируется в даньтянь, формируя слабое ядро.",
    abilities: [
      "Первичное накопление Ци в ядре",
      "Тело становится чуть выносливее обычного",
    ],
    physicalChanges: [
      "Лёгкое повышение выносливости",
      "Улучшение общего самочувствия",
    ],
    agingFactor: 1,
    regenerationMultiplier: 1.1,
    conductivityMultiplier: 1,
  },
  {
    level: 2,
    name: "Life Flow",
    nameRu: "Течение Жизни",
    qiDensity: 2, // 2^1
    description: "Ци циркулирует по основным меридианам.",
    abilities: [
      "Ускоренное заживление (порезы за час)",
      "Лёгкое усиление мышц (прыжки, удары)",
      "Интуитивное чувство опасности",
    ],
    physicalChanges: [
      "Заметное улучшение регенерации",
      "Усиление физических параметров",
    ],
    agingFactor: 1,
    regenerationMultiplier: 2,
    conductivityMultiplier: 1.2,
  },
  {
    level: 3,
    name: "Inner Flame",
    nameRu: "Пламя Внутреннего Огня",
    qiDensity: 4, // 2^2
    description: "Ядро стабильно горит; Ци можно выбрасывать для всплесков силы.",
    abilities: [
      "Регуляция температуры тела волей",
      "Очищение воды/воздуха от примесей Ци",
      "Доступ к простым боевым техникам Ци",
    ],
    physicalChanges: [
      "Стабильный внутренний жар",
      "Улучшенный иммунитет",
    ],
    agingFactor: 0.9,
    regenerationMultiplier: 3,
    conductivityMultiplier: 1.5,
  },
  {
    level: 4,
    name: "Body-Spirit Union",
    nameRu: "Объединение Тела и Духа",
    qiDensity: 8, // 2^3
    description: "Мышцы, кости и Ци синхронизированы.",
    abilities: [
      "Физические параметры превосходят человеческие пределы",
      "Кратковременное 'парение' (компенсация гравитации)",
    ],
    physicalChanges: [
      "Старение замедляется в 2-3 раза",
      "Плотность мышц и костей увеличивается",
    ],
    agingFactor: 0.4,
    regenerationMultiplier: 5,
    conductivityMultiplier: 2,
  },
  {
    level: 5,
    name: "Heaven's Heart",
    nameRu: "Сердце Небес",
    qiDensity: 16, // 2^4
    description: "Ядро начинает взаимодействовать с внешними потоками Ци.",
    abilities: [
      "Слушание Ци ландшафта — находить узлы, источники",
      "Эмоциональная стабильность",
    ],
    physicalChanges: [
      "Практически полное отсутствие страха и гнева",
      "Улучшенная связь с окружением",
    ],
    agingFactor: 0.3,
    regenerationMultiplier: 8,
    conductivityMultiplier: 3,
  },
  {
    level: 6,
    name: "Veil Break",
    nameRu: "Разрыв Пелены",
    qiDensity: 32, // 2^5
    description: "Осознание: Ци — не просто энергия, а ткань реальности.",
    abilities: [
      "Искажение локального поля Ци (иллюзии, маскировка)",
      "Тело почти неуязвимо для обычного оружия",
      "Способность жить без еды/воды, питаясь только Ци",
    ],
    physicalChanges: [
      "Тело становится гораздо прочнее",
      "Зависимость от пищи снижается",
    ],
    agingFactor: 0.1,
    regenerationMultiplier: 15,
    conductivityMultiplier: 5,
  },
  {
    level: 7,
    name: "Eternal Ring",
    nameRu: "Вечное Кольцо",
    qiDensity: 64, // 2^6
    description: "Ядро становится самоподдерживающимся.",
    abilities: [
      "Пассивное поглощение Ци даже во сне",
      "Старение остановлено",
    ],
    physicalChanges: [
      "Возраст перестаёт увеличиваться",
      "Автоматическое накопление Ци",
    ],
    agingFactor: 0,
    regenerationMultiplier: 30,
    conductivityMultiplier: 8,
  },
  {
    level: 8,
    name: "Heaven's Voice",
    nameRu: "Глас Небес",
    qiDensity: 128, // 2^7
    description: "Слышит 'песнь мира' — вибрации Ци на планетарном уровне.",
    abilities: [
      "Предсказание природных катаклизмов",
      "Регенерация при потере конечностей",
    ],
    physicalChanges: [
      "Способность восстанавливать утраченные части тела",
      "Глубокая связь с миром",
    ],
    agingFactor: 0,
    regenerationMultiplier: 100,
    conductivityMultiplier: 15,
  },
  {
    level: 9,
    name: "Immortal Core",
    nameRu: "Бессмертное Ядро",
    qiDensity: 256, // 2^8
    description: "Ядро сливается с сутью героя. Он становится частью мира.",
    abilities: [
      "Проводимость увеличивается в 5-10 раз относительно 8-го уровня",
      "Почти бессмертие: смерть только от 9-го уровня или космической силы",
      "Создание духовных артефактов с волей",
    ],
    physicalChanges: [
      "Символ: звезда в ладони",
      "Тело — проявление воли",
    ],
    agingFactor: 0,
    regenerationMultiplier: 1000,
    conductivityMultiplier: 50,
  },
  {
    level: 10,
    name: "Ascension",
    nameRu: "Вознесение",
    qiDensity: 512, // 2^9 (теоретически)
    description: "Покидает мир. Это не предел развития, а переход в новую форму существования.",
    abilities: [
      "Выход за пределы мира",
      "Новая форма существования",
    ],
    physicalChanges: [
      "Трансцендентное состояние",
    ],
    agingFactor: 0,
    regenerationMultiplier: Infinity,
    conductivityMultiplier: 100,
  },
];

// Функция расчёта плотности Ци для уровня
export function calculateQiDensity(level: number): number {
  if (level < 1 || level > 10) return 0;
  return Math.pow(2, level - 1);
}

// Функция расчёта ёмкости ядра после повышения уровня
export function calculateCoreCapacityAfterLevelUp(
  currentCapacity: number,
  isMajorLevelUp: boolean
): number {
  // Ёмкость растёт на ~10% за уровень
  const growthRate = isMajorLevelUp ? 1.1 : 1.1;
  return Math.ceil(currentCapacity * growthRate);
}

// Функция расчёта накопленной Ци для прорыва
export function calculateRequiredQiForBreakthrough(
  coreCapacity: number,
  isMajorBreakthrough: boolean
): number {
  // Малый уровень: ёмкость × 10
  // Большой уровень: ёмкость × 100
  return coreCapacity * (isMajorBreakthrough ? 100 : 10);
}

// Функция получения информации об уровне
export function getCultivationLevel(level: number): CultivationLevel | undefined {
  return CULTIVATION_LEVELS.find((l) => l.level === level);
}

// Функция форматирования уровня для отображения
export function formatCultivationLevel(
  mainLevel: number,
  subLevel: number
): string {
  const levelInfo = getCultivationLevel(mainLevel);
  if (!levelInfo) return `Уровень ${mainLevel}.${subLevel}`;
  return `${levelInfo.nameRu} (${mainLevel}.${subLevel})`;
}

// Расчёт скорости генерации Ци микроядром (10% от ёмкости в сутки)
export function calculateMicroCoreGeneration(coreCapacity: number): number {
  return Math.floor(coreCapacity * 0.1);
}

// Расчёт времени накопления Ци до прорыва
export function calculateTimeToBreakthrough(
  currentAccumulated: number,
  required: number,
  dailyGeneration: number,
  dailyAbsorption: number
): number {
  const remaining = required - currentAccumulated;
  if (remaining <= 0) return 0;
  
  const dailyTotal = dailyGeneration + dailyAbsorption;
  if (dailyTotal <= 0) return Infinity;
  
  return Math.ceil(remaining / dailyTotal);
}
