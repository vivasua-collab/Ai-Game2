/**
 * Система прозрения - создание новых техник через понимание Ци
 * 
 * Механика:
 * 1. При изучении техник накапливается qiUnderstanding
 * 2. При достижении cap → прозрение → новая техника
 * 3. С 5-го уровня доступен разбор техник для быстрого прироста
 */

import { 
  QI_UNDERSTANDING_CAP, 
  INSIGHT_CONSTANTS 
} from './constants';
import type { TechniquePreset } from '@/data/presets/technique-presets';
// Импортируем типы техник из единого источника
import type { TechniqueType, TechniqueElement } from './techniques';

// Реэкспорт для удобства
export type { TechniqueType, TechniqueElement };

// ==================== ТИПЫ ====================

export interface InsightResult {
  triggered: boolean;
  newQiUnderstanding: number;
  newTechnique?: GeneratedTechnique;
  message?: string;
}

export interface AnalysisResult {
  success: boolean;
  qiGained: number;
  newQiUnderstanding: number;
  newTechnique?: GeneratedTechnique;
  message: string;
}

export interface GeneratedTechnique {
  name: string;
  level: number;
  type: TechniqueType;
  element: TechniqueElement;
  description: string;
  source: 'insight' | 'analysis';
}

export interface CharacterForInsight {
  id: string;
  cultivationLevel: number;
  qiUnderstanding: number;
  qiUnderstandingCap: number;
  intelligence: number;
  conductivity: number;
  cultivationSkills: Record<string, number>;
}

export interface TechniqueForAnalysis {
  id: string;
  name: string;
  level: number;
  type: TechniqueType;
  element: TechniqueElement;
  mastery: number;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Получить максимальное понимание Ци для уровня
 */
export function getQiUnderstandingCap(level: number): number {
  return QI_UNDERSTANDING_CAP[level] || QI_UNDERSTANDING_CAP[9];
}

/**
 * Рассчитать прирост понимания Ци при изучении техники
 * Базовый прирост = уровень техники * 10
 */
export function calculateQiUnderstandingGain(techniqueLevel: number): number {
  return techniqueLevel * INSIGHT_CONSTANTS.BASE_QI_GAIN_PER_TECHNIQUE_LEVEL;
}

/**
 * Рассчитать прирост понимания Ци при разборе техники
 * Разбор даёт больше понимания, но уничтожает технику
 */
export function calculateAnalysisQiGain(techniqueLevel: number): number {
  return techniqueLevel * INSIGHT_CONSTANTS.BASE_QI_GAIN_PER_TECHNIQUE_LEVEL * INSIGHT_CONSTANTS.ANALYSIS_GAIN_MULTIPLIER;
}

/**
 * Добавить понимание Ци и проверить прозрение
 */
export function addQiUnderstanding(
  character: CharacterForInsight,
  gain: number
): InsightResult {
  const newQiUnderstanding = character.qiUnderstanding + gain;
  const cap = getQiUnderstandingCap(character.cultivationLevel);
  
  // Проверка прозрения
  if (newQiUnderstanding >= cap && character.cultivationLevel >= 5) {
    // Прозрение сработало!
    return {
      triggered: true,
      newQiUnderstanding: 0, // Сброс аккумулятора
      newTechnique: generateTechniqueFromInsight(character),
      message: `✨ Прозрение! Вы достигли нового уровня понимания Ци и обрели новую технику!`,
    };
  }
  
  // Обычное накопление
  return {
    triggered: false,
    newQiUnderstanding: Math.min(newQiUnderstanding, cap),
  };
}

/**
 * Проверить возможность разбора техники
 */
export function canAnalyzeTechnique(
  character: CharacterForInsight,
  technique: TechniqueForAnalysis
): { canAnalyze: boolean; reason?: string } {
  // Проверка уровня персонажа
  if (character.cultivationLevel < INSIGHT_CONSTANTS.MIN_LEVEL_FOR_ANALYSIS) {
    return {
      canAnalyze: false,
      reason: `Требуется уровень культивации ${INSIGHT_CONSTANTS.MIN_LEVEL_FOR_ANALYSIS}+ для разбора техник.`,
    };
  }
  
  // Проверка мастерства техники
  if (technique.mastery < INSIGHT_CONSTANTS.MIN_MASTERY_FOR_ANALYSIS) {
    return {
      canAnalyze: false,
      reason: `Требуется мастерство техники ${INSIGHT_CONSTANTS.MIN_MASTERY_FOR_ANALYSIS}%+ для разбора.`,
    };
  }
  
  return { canAnalyze: true };
}

/**
 * Рассчитать шанс создания новой техники при разборе
 */
export function calculateInsightChance(
  character: CharacterForInsight,
  technique: TechniqueForAnalysis
): number {
  const base = INSIGHT_CONSTANTS.BASE_INSIGHT_CHANCE;
  const intelligenceBonus = character.intelligence * INSIGHT_CONSTANTS.INSIGHT_CHANCE_PER_INTELLIGENCE;
  const conductivityBonus = character.conductivity * INSIGHT_CONSTANTS.INSIGHT_CHANCE_PER_CONDUCTIVITY;
  const masteryBonus = technique.mastery * INSIGHT_CONSTANTS.INSIGHT_CHANCE_PER_MASTERY;
  
  return Math.min(0.9, base + intelligenceBonus + conductivityBonus + masteryBonus);
}

/**
 * Разобрать технику
 * Уничтожает технику, даёт большой прирост понимания Ци
 * Шанс создать новую технику того же уровня
 */
export function analyzeTechnique(
  character: CharacterForInsight,
  technique: TechniqueForAnalysis
): AnalysisResult {
  // Проверка возможности
  const check = canAnalyzeTechnique(character, technique);
  if (!check.canAnalyze) {
    return {
      success: false,
      qiGained: 0,
      newQiUnderstanding: character.qiUnderstanding,
      message: check.reason || 'Невозможно разобрать технику.',
    };
  }
  
  // Прирост понимания
  const qiGained = calculateAnalysisQiGain(technique.level);
  const newQiUnderstanding = character.qiUnderstanding + qiGained;
  
  // Проверка прозрения при разборе
  const cap = getQiUnderstandingCap(character.cultivationLevel);
  if (newQiUnderstanding >= cap && character.cultivationLevel >= 5) {
    return {
      success: true,
      qiGained,
      newQiUnderstanding: 0,
      newTechnique: generateTechniqueFromInsight(character),
      message: `✨ Разбор техники "${technique.name}" привёл к прозрению! Вы обрели новую технику!`,
    };
  }
  
  // Шанс создания похожей техники
  const insightChance = calculateInsightChance(character, technique);
  const rolled = Math.random();
  
  if (rolled < insightChance) {
    return {
      success: true,
      qiGained,
      newQiUnderstanding,
      newTechnique: generateSimilarTechnique(technique),
      message: `🔍 Разобрав технику "${technique.name}", вы обрели понимание и создали новую технику!`,
    };
  }
  
  return {
    success: true,
    qiGained,
    newQiUnderstanding,
    message: `Вы разобрали технику "${technique.name}" и получили +${qiGained} понимания Ци.`,
  };
}

// ==================== ГЕНЕРАЦИЯ ТЕХНИК ====================

/**
 * Сгенерировать новую технику при прозрении
 */
export function generateTechniqueFromInsight(character: CharacterForInsight): GeneratedTechnique {
  // Выбор типа на основе навыков персонажа
  const skills = character.cultivationSkills;
  const types: TechniqueType[] = ['combat', 'cultivation', 'support', 'movement', 'sensory', 'healing'];
  
  // Навыки влияют на тип генерируемой техники
  if (skills.deep_meditation && skills.deep_meditation >= 3) {
    // Высокий навык медитации → техники культивации
    types.push('cultivation', 'cultivation');
  }
  if (skills.qi_perception && skills.qi_perception >= 3) {
    // Высокое восприятие Ци → сенсорные техники
    types.push('sensory', 'sensory');
  }
  
  const type = types[Math.floor(Math.random() * types.length)];
  
  // Элемент зависит от проводимости и интеллекта
  const elements: TechniqueElement[] = ['fire', 'water', 'earth', 'air', 'lightning'];
  const element = elements[Math.floor(Math.random() * elements.length)];
  
  // Уровень техники = уровень персонажа ± 1
  const levelVariation = Math.random() < 0.5 ? -1 : 1;
  const level = Math.max(1, Math.min(9, character.cultivationLevel + levelVariation));
  
  return {
    name: generateTechniqueName(type, element, level),
    level,
    type,
    element,
    description: generateTechniqueDescription(type, element, level),
    source: 'insight',
  };
}

/**
 * Сгенерировать похожую технику при разборе
 */
export function generateSimilarTechnique(original: TechniqueForAnalysis): GeneratedTechnique {
  // Похожая техника того же уровня и типа
  const elements: TechniqueElement[] = ['fire', 'water', 'earth', 'air', 'lightning'];
  
  // Выбираем другой элемент с высокой вероятностью
  let newElement = original.element;
  if (Math.random() < 0.7) {
    const otherElements = elements.filter(e => e !== original.element);
    newElement = otherElements[Math.floor(Math.random() * otherElements.length)];
  }
  
  return {
    name: generateTechniqueName(original.type, newElement, original.level),
    level: original.level,
    type: original.type,
    element: newElement,
    description: generateTechniqueDescription(original.type, newElement, original.level),
    source: 'analysis',
  };
}

/**
 * Генерация имени техники
 */
function generateTechniqueName(type: TechniqueType, element: TechniqueElement, level: number): string {
  const typeNames: Record<TechniqueType, string[]> = {
    combat: ['Удар', 'Кулак', 'Атака', 'Рубеж', 'Волна'],
    cultivation: ['Медитация', 'Накопление', 'Поток', 'Вихрь', 'Сфера'],
    support: ['Щит', 'Защита', 'Барьер', 'Покров', 'Аура'],
    movement: ['Шаг', 'Рывок', 'Прыжок', 'Полёт', 'Перемещение'],
    sensory: ['Взгляд', 'Чутьё', 'Восприятие', 'Ощущение', 'Видение'],
    healing: ['Исцеление', 'Регенерация', 'Восстановление', 'Поток жизни', 'Прикосновение'],
  };
  
  const elementNames: Record<TechniqueElement, string> = {
    fire: 'Огненного',
    water: 'Водного',
    earth: 'Земного',
    air: 'Воздушного',
    lightning: 'Грозового',
    void: 'Пустотного',
    neutral: '',
  };
  
  const levelNames = ['', 'Начальный', 'Средний', 'Продвинутый', 'Мастерский', 'Высший'];
  
  const baseName = typeNames[type][Math.floor(Math.random() * typeNames[type].length)];
  const elementName = elementNames[element];
  const levelName = level >= 4 ? levelNames[Math.min(level, 5)] : '';
  
  if (levelName) {
    return `${levelName} ${baseName} ${elementName} Потока`;
  }
  return `${baseName} ${elementName} Потока`;
}

/**
 * Генерация описания техники
 */
function generateTechniqueDescription(type: TechniqueType, element: TechniqueElement, level: number): string {
  const descriptions: Record<TechniqueType, string> = {
    combat: `Техника боя с использованием энергии ${element}. Уровень ${level}.`,
    cultivation: `Техника культивации для накопления ${element} энергии. Уровень ${level}.`,
    support: `Поддерживающая техника ${element} типа. Уровень ${level}.`,
    movement: `Техника перемещения через ${element} энергию. Уровень ${level}.`,
    sensory: `Сенсорная техника для восприятия ${element}. Уровень ${level}.`,
    healing: `Техника исцеления через ${element} энергию. Уровень ${level}.`,
  };
  
  return descriptions[type];
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить прогресс понимания Ци (в процентах)
 */
export function getQiUnderstandingProgress(character: CharacterForInsight): number {
  const cap = getQiUnderstandingCap(character.cultivationLevel);
  return Math.round((character.qiUnderstanding / cap) * 100);
}

/**
 * Получить текстовое описание прогресса понимания
 */
export function getQiUnderstandingDescription(character: CharacterForInsight): string {
  const progress = getQiUnderstandingProgress(character);
  const cap = getQiUnderstandingCap(character.cultivationLevel);
  
  if (character.cultivationLevel < 5) {
    return `Понимание Ци: ${character.qiUnderstanding}/${cap} (${progress}%) - прозрение доступно с 5-го уровня`;
  }
  
  if (progress >= 90) {
    return `Понимание Ци: ${character.qiUnderstanding}/${cap} (${progress}%) - близко к прозрению!`;
  }
  
  if (progress >= 50) {
    return `Понимание Ци: ${character.qiUnderstanding}/${cap} (${progress}%) - хороший прогресс`;
  }
  
  return `Понимание Ци: ${character.qiUnderstanding}/${cap} (${progress}%)`;
}
