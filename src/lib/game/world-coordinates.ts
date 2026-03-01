/**
 * Система координат мира
 * 
 * 3D координаты для всех объектов мира:
 * - x: Восток(+)/Запад(-) в метрах
 * - y: Север(+)/Юг(-) в метрах
 * - z: Высота(+)/Глубина(-) в метрах
 * 
 * Центр мира: (0, 0, 0)
 * 
 * Отображение для игрока:
 * - 2D карта показывает только x, y
 * - z используется для определения доступности
 */

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface WorldPosition2D {
  x: number;
  y: number;
}

// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Размеры мира (в метрах)
 */
export const WORLD_BOUNDS = {
  minX: -100000,  // 100 км на запад
  maxX: 100000,   // 100 км на восток
  minY: -100000,  // 100 км на юг
  maxY: 100000,   // 100 км на север
  minZ: -1000,    // 1 км под землёй
  maxZ: 10000,    // 10 км в небо
};

/**
 * Типы высот
 */
export const HEIGHT_ZONES = {
  /** Подземелья */
  underground: { min: -1000, max: -1, name: "Подземелье" },
  
  /** Поверхность */
  surface: { min: 0, max: 100, name: "Поверхность" },
  
  /** Холмы */
  hills: { min: 100, max: 500, name: "Холмы" },
  
  /** Горы */
  mountains: { min: 500, max: 3000, name: "Горы" },
  
  /** Высокогорье */
  highlands: { min: 3000, max: 5000, name: "Высокогорье" },
  
  /** Небо (для летающих) */
  sky: { min: 5000, max: 10000, name: "Небо" },
};

// ============================================
// ФУНКЦИИ РАСЧЁТА
// ============================================

/**
 * Расчёт 3D расстояния между точками
 */
export function getDistance3D(a: WorldPosition, b: WorldPosition): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2) +
    Math.pow(b.z - a.z, 2)
  );
}

/**
 * Расчёт 2D расстояния (для карты)
 */
export function getDistance2D(a: WorldPosition2D, b: WorldPosition2D): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2)
  );
}

/**
 * Расчёт расстояния от центра мира
 */
export function getDistanceFromCenter(pos: WorldPosition): number {
  return Math.sqrt(pos.x * pos.x + pos.y * pos.y);
}

/**
 * Расчёт направления между точками (в градусах)
 * 0° = север, 90° = восток, 180° = юг, 270° = запад
 */
export function getDirection(a: WorldPosition2D, b: WorldPosition2D): number {
  const angle = Math.atan2(b.x - a.x, b.y - a.y);
  return (angle * 180 / Math.PI + 360) % 360;
}

/**
 * Получение названия направления
 */
export function getDirectionName(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  
  if (normalized < 22.5 || normalized >= 337.5) return "север";
  if (normalized < 67.5) return "северо-восток";
  if (normalized < 112.5) return "восток";
  if (normalized < 157.5) return "юго-восток";
  if (normalized < 202.5) return "юг";
  if (normalized < 247.5) return "юго-запад";
  if (normalized < 292.5) return "запад";
  return "северо-запад";
}

/**
 * Форматирование расстояния для отображения
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} км`;
  } else {
    return `${Math.round(meters / 1000)} км`;
  }
}

/**
 * Получение зоны высоты
 */
export function getHeightZone(z: number): { name: string; min: number; max: number } | null {
  for (const zone of Object.values(HEIGHT_ZONES)) {
    if (z >= zone.min && z <= zone.max) {
      return zone;
    }
  }
  return null;
}

/**
 * Проверка доступности позиции для уровня культивации
 */
export function isPositionAccessible(
  pos: WorldPosition,
  cultivationLevel: number
): { accessible: boolean; reason?: string } {
  // Подземелья требуют минимум уровень 2
  if (pos.z < 0 && cultivationLevel < 2) {
    return {
      accessible: false,
      reason: "Для входа в подземелья требуется 2-й уровень культивации",
    };
  }
  
  // Высокогорье требует минимум уровень 3
  if (pos.z >= 3000 && cultivationLevel < 3) {
    return {
      accessible: false,
      reason: "Для высокогорья требуется 3-й уровень культивации",
    };
  }
  
  // Небо требует минимум уровень 5 (полёт)
  if (pos.z >= 5000 && cultivationLevel < 5) {
    return {
      accessible: false,
      reason: "Для полёта требуется 5-й уровень культивации",
    };
  }
  
  return { accessible: true };
}

/**
 * Генерация случайной позиции в радиусе от центра
 */
export function generateRandomPosition(
  centerRadius: number,
  minHeight: number = 0,
  maxHeight: number = 100
): WorldPosition {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * centerRadius;
  
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
    z: Math.round(minHeight + Math.random() * (maxHeight - minHeight)),
  };
}

/**
 * Генерация позиции на точном расстоянии от центра мира
 * Используется для стартовых локаций
 * 
 * @param exactDistance - Точное расстояние от центра в метрах
 * @param minHeight - Минимальная высота (по умолчанию 0 - поверхность)
 * @param maxHeight - Максимальная высота
 */
export function generatePositionAtDistance(
  exactDistance: number,
  minHeight: number = 0,
  maxHeight: number = 100
): WorldPosition {
  const angle = Math.random() * 2 * Math.PI;
  
  return {
    x: Math.round(Math.cos(angle) * exactDistance),
    y: Math.round(Math.sin(angle) * exactDistance),
    z: Math.round(minHeight + Math.random() * (maxHeight - minHeight)),
  };
}

/**
 * Генерация позиции в диапазоне расстояний от центра
 * 
 * @param minDistance - Минимальное расстояние от центра в метрах
 * @param maxDistance - Максимальное расстояние от центра в метрах
 * @param minHeight - Минимальная высота
 * @param maxHeight - Максимальная высота
 */
export function generatePositionInRange(
  minDistance: number,
  maxDistance: number,
  minHeight: number = 0,
  maxHeight: number = 100
): WorldPosition {
  const angle = Math.random() * 2 * Math.PI;
  const radius = minDistance + Math.random() * (maxDistance - minDistance);
  
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
    z: Math.round(minHeight + Math.random() * (maxHeight - minHeight)),
  };
}

/**
 * Вычисление расстояния от центра мира по координатам
 * Это значение должно храниться в distanceFromCenter
 */
export function calculateDistanceFromCenter(x: number, y: number): number {
  return Math.round(Math.sqrt(x * x + y * y));
}

/**
 * Конвертация в 2D для карты
 */
export function toMapPosition(pos: WorldPosition): WorldPosition2D {
  return { x: pos.x, y: pos.y };
}

/**
 * Расчёт времени пути между 3D позициями
 * Использует WorldPosition (x, y, z координаты)
 */
export function calculatePositionTravelTime(
  from: WorldPosition,
  to: WorldPosition,
  speedKmPerHour: number = 5
): { hours: number; distance: number } {
  const distance = getDistance3D(from, to);
  const hours = distance / 1000 / speedKmPerHour;
  
  return {
    hours: Math.ceil(hours * 10) / 10,  // округление до 0.1 часа
    distance,
  };
}

/**
 * Проверка валидности позиции
 */
export function isValidPosition(pos: WorldPosition): boolean {
  return (
    pos.x >= WORLD_BOUNDS.minX &&
    pos.x <= WORLD_BOUNDS.maxX &&
    pos.y >= WORLD_BOUNDS.minY &&
    pos.y <= WORLD_BOUNDS.maxY &&
    pos.z >= WORLD_BOUNDS.minZ &&
    pos.z <= WORLD_BOUNDS.maxZ
  );
}
