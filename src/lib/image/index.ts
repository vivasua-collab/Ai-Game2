/**
 * Модуль генерации изображений
 *
 * В данный момент - заглушка.
 * В будущем будет интегрирована локальная модель генерации изображений
 * (например, Stable Diffusion или аналоги).
 */

export type ImageStyle = "location" | "character" | "item" | "action";

export interface ImageGenerationConfig {
  prompt: string;
  style?: ImageStyle;
  width?: number;
  height?: number;
}

export interface ImageGenerationResult {
  url: string;
  isPlaceholder: boolean;
  style: ImageStyle;
}

// Placeholder URLs для разных стилей
const PLACEHOLDER_IMAGES: Record<ImageStyle, string> = {
  location: "/images/placeholders/location.jpg",
  character: "/images/placeholders/character.jpg",
  item: "/images/placeholders/item.jpg",
  action: "/images/placeholders/action.jpg",
};

// Описания placeholder для разных типов
const PLACEHOLDER_DESCRIPTIONS: Record<ImageStyle, string> = {
  location: "Мистический пейзаж мира культивации",
  character: "Силуэт культиватора",
  item: "Духовный артефакт",
  action: "Сцена боя или медитации",
};

/**
 * Генерация изображения (текущая реализация - заглушка)
 *
 * @param config - Конфигурация для генерации
 * @returns Promise с результатом генерации
 */
export async function generateImage(
  config: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const style = config.style || "location";

  // Возвращаем placeholder
  // TODO: Интегрировать реальную генерацию изображений
  return {
    url: PLACEHOLDER_IMAGES[style],
    isPlaceholder: true,
    style,
  };
}

/**
 * Проверка доступности генератора изображений
 *
 * @returns Promise<boolean> - true если генератор доступен
 */
export async function isImageGenerationAvailable(): Promise<boolean> {
  // TODO: Проверка доступности локальной модели
  return false;
}

/**
 * Получить список доступных стилей генерации
 */
export function getAvailableStyles(): ImageStyle[] {
  return ["location", "character", "item", "action"];
}

/**
 * Получить описание стиля
 */
export function getStyleDescription(style: ImageStyle): string {
  return PLACEHOLDER_DESCRIPTIONS[style];
}

/**
 * Сгенерировать фоновое изображение для локации
 *
 * @param locationName - Название локации
 * @param qiDensity - Плотность Ци (влияет на атмосферу)
 * @param terrainType - Тип местности
 */
export async function generateLocationBackground(
  locationName: string,
  qiDensity: number,
  terrainType: string
): Promise<ImageGenerationResult> {
  // Формируем промпт для будущей генерации
  const prompt = `
${locationName}, ${terrainType} terrain.
Qi density: ${qiDensity} units/m³.
Atmospheric cultivation world setting, mystical, ethereal lighting.
${qiDensity > 500 ? "High spiritual energy, glowing particles." : ""}
${qiDensity < 50 ? "Barren, low spiritual energy, desolate." : ""}
  `.trim();

  return generateImage({
    prompt,
    style: "location",
    width: 1920,
    height: 1080,
  });
}

/**
 * Сгенерировать портрет персонажа/NPC
 *
 * @param name - Имя персонажа
 * @param cultivationLevel - Уровень культивации
 * @param traits - Черты характера
 */
export async function generateCharacterPortrait(
  name: string,
  cultivationLevel: number,
  traits: string[]
): Promise<ImageGenerationResult> {
  // Формируем промпт для будущей генерации
  const levelDescriptions: Record<number, string> = {
    1: "weak aura, beginner cultivator",
    2: "faint energy flow",
    3: "inner fire visible",
    4: "strong body, confident pose",
    5: "heavenly aura beginning",
    6: "reality-distorting presence",
    7: "eternal ring behind, stopped aging",
    8: "celestial voice emanating",
    9: "immortal presence, star symbol",
  };

  const levelDesc = levelDescriptions[cultivationLevel] || "cultivator";

  const prompt = `
${name}, ${levelDesc}.
Traits: ${traits.join(", ")}.
Cultivation world portrait, asian fantasy style.
Level ${cultivationLevel} cultivator appearance.
  `.trim();

  return generateImage({
    prompt,
    style: "character",
    width: 512,
    height: 768,
  });
}

/**
 * Информация о модуле генерации
 */
export const IMAGE_GENERATION_INFO = {
  name: "Image Generation Module",
  version: "0.1.0",
  status: "stub",
  description: "Заглушка для модуля генерации изображений. В будущем будет интегрирована локальная модель.",
  plannedFeatures: [
    "Генерация фоновых изображений для локаций",
    "Генерация портретов NPC",
    "Генерация изображений предметов",
    "Генерация сцен боёв и действий",
    "Интеграция с Stable Diffusion или аналогами",
  ],
};
