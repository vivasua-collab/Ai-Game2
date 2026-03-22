/**
 * ============================================================================
 * ЦЕНТРАЛИЗОВАННЫЕ СЧЁТЧИКИ ID
 * ============================================================================
 * 
 * Единая точка управления счётчиками для генерации уникальных ID.
 * 
 * Формат ID: PREFIX_NNNNNN
 * Примеры:
 * - WP_000001 — первое оружие
 * - AR_000042 — 42-я броня
 * - CH_000123 — 123-й зарядник
 */

import { IdPrefix, generateId } from './id-config';

// ==================== СЧЁТЧИКИ ====================

/**
 * Глобальные счётчики для каждого типа объектов
 */
const counters: Map<IdPrefix, number> = new Map();

/**
 * Получить следующий ID для указанного префикса
 */
export function getNextId(prefix: IdPrefix): string {
  const current = counters.get(prefix) ?? 0;
  const next = current + 1;
  counters.set(prefix, next);
  return generateId(prefix, next);
}

/**
 * Получить текущее значение счётчика
 */
export function getCounter(prefix: IdPrefix): number {
  return counters.get(prefix) ?? 0;
}

/**
 * Установить значение счётчика (для восстановления из БД)
 */
export function setCounter(prefix: IdPrefix, value: number): void {
  counters.set(prefix, value);
}

/**
 * Сбросить конкретный счётчик
 */
export function resetCounter(prefix: IdPrefix): void {
  counters.set(prefix, 0);
}

/**
 * Сбросить все счётчики
 */
export function resetAllCounters(): void {
  counters.clear();
}

// ==================== СПЕЦИАЛИЗИРОВАННЫЕ ФУНКЦИИ ====================

/**
 * Получить следующий ID оружия
 */
export function getNextWeaponId(): string {
  return getNextId('WP');
}

/**
 * Получить следующий ID брони
 */
export function getNextArmorId(): string {
  return getNextId('AR');
}

/**
 * Получить следующий ID зарядника
 */
export function getNextChargerId(): string {
  return getNextId('CH');
}

/**
 * Получить следующий ID аксессуара
 */
export function getNextAccessoryId(): string {
  return getNextId('AC');
}

/**
 * Получить следующий ID артефакта
 */
export function getNextArtifactId(): string {
  return getNextId('AF');
}

/**
 * Получить следующий ID расходника
 */
export function getNextConsumableId(): string {
  return getNextId('CS');
}

/**
 * Получить следующий ID камня Ци
 */
export function getNextQiStoneId(): string {
  return getNextId('QS');
}

/**
 * Получить следующий ID предмета (общий)
 */
export function getNextItemId(): string {
  return getNextId('IT');
}

/**
 * Получить следующий ID NPC
 */
export function getNextNPCId(): string {
  return getNextId('NP');
}

/**
 * Получить следующий ID формации
 */
export function getNextFormationId(): string {
  return getNextId('FM');
}

// ==================== УТИЛИТЫ ПАРСИНГА ====================

/**
 * Извлечь номер из ID
 * @example extractCounter('WP_000042') // 42
 */
export function extractCounter(id: string): number | null {
  const match = id.match(/_(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Обновить счётчик до максимального значения из списка ID
 */
export function syncCountersFromIds(prefix: IdPrefix, ids: string[]): void {
  const maxCounter = ids
    .map(extractCounter)
    .filter((c): c is number => c !== null)
    .reduce((max, c) => Math.max(max, c), 0);
  
  if (maxCounter > 0) {
    counters.set(prefix, maxCounter);
  }
}
