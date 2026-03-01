/**
 * ============================================================================
 * ГЕНЕРАТОР КАМНЕЙ ЦИ
 * ============================================================================
 * 
 * Процедурная генерация камней Ци (Духовных Камней).
 * 
 * Префикс ID: QS (QS_000001, QS_000002, ...)
 * 
 * ⚠️ ВАЖНО: Камни Ци БЕЗ качества!
 * Только: объём Ци + тип (calm/chaotic)
 * 
 * Физика:
 * - Плотность: 1024 ед/см³ (постоянная)
 * - Формула: Ци = 1024 × объём_см³
 * 
 * Классификация по размеру:
 * - dust (пыль): < 0.1 см³, < 102 ед Ци
 * - fragment (осколок): 0.1 - 1 см³, 102 - 1024 ед
 * - small (малый): 1 - 8 см³, 1024 - 8192 ед
 * - medium (средний): 8 - 27 см³, 8192 - 27648 ед
 * - large (большой): 27 - 64 см³, 27648 - 65536 ед
 * - huge (огромный): 64 - 125 см³, 65536 - 128000 ед
 * - boulder (глыба): > 125 см³, > 128000 ед
 */

// ==================== ТИПЫ ====================

export type QiStoneSize =
  | 'dust'      // Пыль (< 0.1 см³)
  | 'fragment'  // Осколок (0.1 - 1 см³)
  | 'small'     // Малый (1 - 8 см³)
  | 'medium'    // Средний (8 - 27 см³)
  | 'large'     // Большой (27 - 64 см³)
  | 'huge'      // Огромный (64 - 125 см³)
  | 'boulder';  // Глыба (> 125 см³)

export type QiStoneType = 'calm' | 'chaotic';

/**
 * Камень Ци
 * ⚠️ БЕЗ качества — только объём + тип
 */
export interface QiStone {
  id: string;                    // QS_XXXXXX
  name: string;
  nameEn: string;
  description: string;
  
  // Размер
  sizeClass: QiStoneSize;
  volumeCm3: number;             // Объём в см³
  surfaceCm2: number;            // Площадь поверхности в см²
  
  // Содержание Ци
  totalQi: number;               // Полное содержание
  currentQi: number;             // Текущее (после использования)
  
  // Тип (ЕДИНСТВЕННАЯ классификация)
  type: QiStoneType;
  
  // ❌ Качество УДАЛЕНО (Лор первичен)
  
  // Состояние
  isSealed: boolean;
  
  // Скорость высвобождения (вычисляемая)
  releaseRate: number;           // ед/сек
}

/**
 * Параметры генерации
 */
export interface QiStoneGenerationOptions {
  sizeClass?: QiStoneSize;
  type?: QiStoneType;
  count?: number;
  mode: 'replace' | 'append';
  // Или указать диапазон объёма
  volumeMin?: number;
  volumeMax?: number;
}

/**
 * Результат генерации
 */
export interface QiStoneGenerationResult {
  success: boolean;
  generated: number;
  total: number;
  stones: QiStone[];
  errors: string[];
  warnings: string[];
}

// ==================== КОНСТАНТЫ ====================

/**
 * Плотность Ци в кристалле (ед/см³)
 * Постоянная величина!
 */
const QI_DENSITY = 1024;

/**
 * Скорость высвобождения Ци на единицу площади поверхности
 * ед/(см²·сек)
 */
const RELEASE_RATE_PER_SURFACE = 0.5;

/**
 * Конфигурация размеров камней Ци
 */
export const QI_STONE_SIZES: Record<QiStoneSize, {
  name: string;
  nameEn: string;
  volumeRange: [number, number];  // см³
  qiRange: [number, number];      // ед Ци
  typicalDimensions: string;
}> = {
  dust: {
    name: 'Пыль Ци',
    nameEn: 'Qi Dust',
    volumeRange: [0, 0.1],
    qiRange: [0, 102],
    typicalDimensions: '< 0.5 мм',
  },
  fragment: {
    name: 'Осколок Ци',
    nameEn: 'Qi Fragment',
    volumeRange: [0.1, 1],
    qiRange: [102, 1024],
    typicalDimensions: '0.5 - 1 см',
  },
  small: {
    name: 'Малый камень',
    nameEn: 'Small Qi Stone',
    volumeRange: [1, 8],
    qiRange: [1024, 8192],
    typicalDimensions: '1 - 2 см',
  },
  medium: {
    name: 'Средний камень',
    nameEn: 'Medium Qi Stone',
    volumeRange: [8, 27],
    qiRange: [8192, 27648],
    typicalDimensions: '2 - 3 см',
  },
  large: {
    name: 'Большой камень',
    nameEn: 'Large Qi Stone',
    volumeRange: [27, 64],
    qiRange: [27648, 65536],
    typicalDimensions: '3 - 4 см',
  },
  huge: {
    name: 'Огромный камень',
    nameEn: 'Huge Qi Stone',
    volumeRange: [64, 125],
    qiRange: [65536, 128000],
    typicalDimensions: '4 - 5 см',
  },
  boulder: {
    name: 'Глыба Ци',
    nameEn: 'Qi Boulder',
    volumeRange: [125, Infinity],
    qiRange: [128000, Infinity],
    typicalDimensions: '> 5 см',
  },
};

const TYPE_INFO: Record<QiStoneType, {
  name: string;
  nameEn: string;
  description: string;
  danger: number;
}> = {
  calm: {
    name: 'Спокойная Ци',
    nameEn: 'Calm Qi',
    description: 'Стандартный кристалл, безопасен для поглощения.',
    danger: 0,
  },
  chaotic: {
    name: 'Хаотичная Ци',
    nameEn: 'Chaotic Qi',
    description: 'Содержит неупорядоченную Ци. Высокий энергетический потенциал, но опасен.',
    danger: 7,
  },
};

const NAME_PARTS = {
  calm: ['Чистый', 'Светлый', 'Ясный', 'Спокойный', 'Гармоничный'],
  chaotic: ['Тёмный', 'Неистовый', 'Бурный', 'Хаотичный', 'Нестабильный'],
  nouns: ['Кристалл', 'Камень', 'Осколок', 'Глыба', 'Пыль'],
};

// Счётчик ID
let qiStoneCounter = 0;

// ==================== УТИЛИТЫ ====================

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function generateQiStoneId(): string {
  qiStoneCounter++;
  return `QS_${qiStoneCounter.toString().padStart(6, '0')}`;
}

/**
 * Вычислить площадь поверхности куба
 */
function cubeSurface(side: number): number {
  return 6 * Math.pow(side, 2);
}

/**
 * Вычислить сторону куба по объёму
 */
function cubeSideFromVolume(volume: number): number {
  return Math.pow(volume, 1/3);
}

/**
 * Определить класс размера по объёму
 */
function getSizeClass(volume: number): QiStoneSize {
  if (volume < 0.1) return 'dust';
  if (volume < 1) return 'fragment';
  if (volume < 8) return 'small';
  if (volume < 27) return 'medium';
  if (volume < 64) return 'large';
  if (volume < 125) return 'huge';
  return 'boulder';
}

/**
 * Вычислить скорость высвобождения Ци
 * Формула: поверхность (см²) × 0.5 ед/(см²·сек)
 */
function calculateReleaseRate(surfaceCm2: number): number {
  return surfaceCm2 * RELEASE_RATE_PER_SURFACE;
}

/**
 * Сгенерировать имя камня
 */
function generateName(
  sizeClass: QiStoneSize,
  type: QiStoneType,
  rng: () => number
): { name: string; nameEn: string } {
  const adjectives = NAME_PARTS[type];
  const adj = adjectives[Math.floor(rng() * adjectives.length)];
  
  const sizeNouns: Record<QiStoneSize, string> = {
    dust: 'Пыль',
    fragment: 'Осколок',
    small: 'Камень',
    medium: 'Камень',
    large: 'Камень',
    huge: 'Камень',
    boulder: 'Глыба',
  };
  
  const noun = sizeNouns[sizeClass];
  const name = `${adj} ${noun}`;
  const nameEn = `${adj} ${QI_STONE_SIZES[sizeClass].nameEn}`;
  
  return { name, nameEn };
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация одного камня Ци
 */
export function generateQiStone(options: QiStoneGenerationOptions): QiStone {
  const seed = Date.now() + Math.random() * 1000000;
  const rng = seededRandom(seed);
  
  // Определение объёма
  let volume: number;
  
  if (options.volumeMin !== undefined && options.volumeMax !== undefined) {
    // По диапазону объёма
    volume = options.volumeMin + rng() * (options.volumeMax - options.volumeMin);
  } else if (options.sizeClass) {
    // По классу размера
    const [min, max] = QI_STONE_SIZES[options.sizeClass].volumeRange;
    volume = min + rng() * (max - min);
  } else {
    // Случайный размер с весами (малые и средние чаще)
    const weights: { size: QiStoneSize; weight: number }[] = [
      { size: 'dust', weight: 5 },
      { size: 'fragment', weight: 15 },
      { size: 'small', weight: 35 },
      { size: 'medium', weight: 25 },
      { size: 'large', weight: 12 },
      { size: 'huge', weight: 6 },
      { size: 'boulder', weight: 2 },
    ];
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = rng() * totalWeight;
    let selectedSize: QiStoneSize = 'small';
    
    for (const w of weights) {
      random -= w.weight;
      if (random <= 0) {
        selectedSize = w.size;
        break;
      }
    }
    
    const [min, max] = QI_STONE_SIZES[selectedSize].volumeRange;
    volume = min + rng() * (max - min);
  }
  
  // Определение размера
  const sizeClass = getSizeClass(volume);
  const side = cubeSideFromVolume(volume);
  const surface = cubeSurface(side);
  
  // Вычисление Ци (формула: 1024 × объём)
  const totalQi = Math.floor(QI_DENSITY * volume);
  
  // Тип
  const stoneType: QiStoneType = options.type || (rng() > 0.2 ? 'calm' : 'chaotic');
  
  // Генерация имени
  const { name, nameEn } = generateName(sizeClass, stoneType, rng);
  const id = generateQiStoneId();
  
  // Описание
  const typeDesc = TYPE_INFO[stoneType];
  let description = `${QI_STONE_SIZES[sizeClass].name} с ${typeDesc.name.toLowerCase()}. `;
  description += `Объём: ${volume.toFixed(2)} см³. `;
  description += `Содержание Ци: ${totalQi} ед.`;
  if (stoneType === 'chaotic') {
    description += ' ⚠️ Опасен для неопытных практиков!';
  }
  
  return {
    id,
    name,
    nameEn,
    description,
    sizeClass,
    volumeCm3: Math.round(volume * 1000) / 1000,
    surfaceCm2: Math.round(surface * 100) / 100,
    totalQi,
    currentQi: totalQi,
    type: stoneType,
    isSealed: stoneType === 'chaotic',
    releaseRate: Math.round(calculateReleaseRate(surface) * 100) / 100,
  };
}

/**
 * Генерация нескольких камней Ци
 */
export function generateQiStones(
  count: number,
  options?: QiStoneGenerationOptions
): QiStoneGenerationResult {
  const stones: QiStone[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (options?.mode === 'replace') {
    qiStoneCounter = 0;
  }
  
  for (let i = 0; i < count; i++) {
    try {
      const stone = generateQiStone(options || { mode: 'append' });
      stones.push(stone);
    } catch (error) {
      errors.push(`Ошибка генерации камня ${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: stones.length,
    total: count,
    stones,
    errors,
    warnings,
  };
}

/**
 * Сброс счётчика
 */
export function resetQiStoneCounter(): void {
  qiStoneCounter = 0;
}

/**
 * Получить текущее значение счётчика
 */
export function getQiStoneCounter(): number {
  return qiStoneCounter;
}

/**
 * Установить начальное значение счётчика
 */
export function setQiStoneCounter(value: number): void {
  qiStoneCounter = value;
}

/**
 * Получить список классов размера для UI
 */
export function getQiStoneSizeList(): { id: QiStoneSize; name: string; qiRange: string }[] {
  return Object.entries(QI_STONE_SIZES).map(([id, config]) => ({
    id: id as QiStoneSize,
    name: config.name,
    qiRange: `${config.qiRange[0]} - ${config.qiRange[1] === Infinity ? '∞' : config.qiRange[1]} ед`,
  }));
}

/**
 * Получить информацию о типах Ци
 */
export function getQiStoneTypeInfo(): { id: QiStoneType; name: string; description: string; danger: number }[] {
  return Object.entries(TYPE_INFO).map(([id, info]) => ({
    id: id as QiStoneType,
    name: info.name,
    description: info.description,
    danger: info.danger,
  }));
}

/**
 * Вычислить Ци по объёму (формула: 1024 × объём)
 */
export function calculateQiFromVolume(volumeCm3: number): number {
  return Math.floor(QI_DENSITY * volumeCm3);
}

/**
 * Вычислить объём по Ци (обратная формула)
 */
export function calculateVolumeFromQi(qi: number): number {
  return qi / QI_DENSITY;
}

/**
 * Константа плотности Ци
 */
export const QI_DENSITY_CONSTANT = QI_DENSITY;
