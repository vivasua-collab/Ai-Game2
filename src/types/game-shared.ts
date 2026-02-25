/**
 * Общие типы для клиента и сервера
 *
 * Единый источник типов, используемых в:
 * - API routes (сервер)
 * - React components (клиент)
 * - Game logic (сервер)
 *
 * ВНИМАНИЕ: Эти типы не должны зависеть от Prisma!
 * Для Prisma-типов используйте @prisma/client напрямую.
 */

// ==================== ЛОКАЦИЯ ====================

/**
 * Данные о локации для расчётов
 *
 * Используется в:
 * - qi-system.ts (медитация, прорыв)
 * - qi-shared.ts (расчёты Ци)
 * - request-router.ts (маршрутизация)
 * - environment-system.ts (окружение)
 * - meditation-interruption.ts (прерывания)
 *
 * Отличие от Location (game.ts):
 * - Location имеет id (из БД)
 * - LocationData - только данные для расчётов
 */
export interface LocationData {
  /** Название локации */
  name?: string;
  /** Плотность Ци в ед/м³ (обязательно) */
  qiDensity: number;
  /** Скорость потока Ци */
  qiFlowRate?: number;
  /** Расстояние от центра мира в км (обязательно для расчётов) */
  distanceFromCenter: number;
  /** Тип местности */
  terrainType?: string | null;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ====================

/**
 * Минимальные данные персонажа для расчётов Ци
 * Используется в qi-shared.ts для оптимизации
 */
export interface CharacterQiData {
  coreCapacity: number;
  conductivity: number;
  cultivationLevel: number;
}

/**
 * Результаты расчёта скоростей Ци
 */
export interface QiRatesData {
  /** Ци/секунду от ядра */
  coreGeneration: number;
  /** Ци/секунду из среды */
  environmentalAbsorption: number;
  /** Суммарная скорость */
  total: number;
}
