/**
 * Qi Logger - Отдельный логгер для отслеживания изменений Ци
 *
 * Особенности:
 * - Отключаемый функционал (по умолчанию включён в dev)
 * - НЕ сохраняет в БД (только консоль и буфер)
 * - Подробный лог: источник, причина, старое/новое значение
 *
 * Использование:
 * import { logQiChange, isQiLoggingEnabled, setQiLoggingEnabled } from '@/lib/logger/qi-logger';
 *
 * // В местах изменения Ци:
 * logQiChange(sessionId, characterId, {
 *   oldQi: 500,
 *   newQi: 600,
 *   change: 100,
 *   source: 'meditation',
 *   reason: 'accumulation meditation 60min',
 * });
 *
 * @module qi-logger
 */

// ==================== TYPES ====================

export interface QiLogEntry {
  timestamp: Date;
  sessionId: string;
  characterId: string;

  // Ци в ядре
  oldQi: number;
  newQi: number;
  qiChange: number;

  // Накопленная Ци (опционально)
  oldAccumulated?: number;
  newAccumulated?: number;
  accumulatedChange?: number;

  // Источник изменения
  source: QiChangeSource;
  reason: string;

  // Дополнительные данные
  details?: Record<string, unknown>;
}

export type QiChangeSource =
  | 'meditation'        // Медитация (накопление)
  | 'breakthrough'      // Прорыв
  | 'conductivity'      // Медитация на проводимость
  | 'technique'         // Использование техники
  | 'combat'            // Бой
  | 'item'              // Использование предмета
  | 'passive'           // Пассивная генерация ядром
  | 'dissipation'       // Рассеивание избыточной Ци
  | 'cheat'             // Чит-команда
  | 'system'            // Системное изменение
  | 'sync'              // Синхронизация с БД
  | 'unknown';          // Неизвестно

// ==================== STATE ====================

// Флаг включения логирования Ци
let qiLoggingEnabled = process.env.NODE_ENV === 'development';

// Буфер логов Ци (отдельно от основного логгера)
const qiLogBuffer: QiLogEntry[] = [];
const MAX_QI_LOG_BUFFER = 500;

// ==================== PUBLIC API ====================

/**
 * Включить/выключить логирование Ци
 */
export function setQiLoggingEnabled(enabled: boolean): void {
  qiLoggingEnabled = enabled;
  console.log(`[QiLogger] Logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Проверить, включено ли логирование Ци
 */
export function isQiLoggingEnabled(): boolean {
  return qiLoggingEnabled;
}

/**
 * Получить буфер логов Ци
 */
export function getQiLogBuffer(): QiLogEntry[] {
  return [...qiLogBuffer];
}

/**
 * Очистить буфер логов Ци
 */
export function clearQiLogBuffer(): void {
  qiLogBuffer.length = 0;
}

/**
 * Получить последние N записей
 */
export function getRecentQiLogs(count: number = 50): QiLogEntry[] {
  return qiLogBuffer.slice(-count);
}

/**
 * Получить логи по sessionId
 */
export function getQiLogsBySession(sessionId: string): QiLogEntry[] {
  return qiLogBuffer.filter(log => log.sessionId === sessionId);
}

/**
 * Получить логи по источнику
 */
export function getQiLogsBySource(source: QiChangeSource): QiLogEntry[] {
  return qiLogBuffer.filter(log => log.source === source);
}

// ==================== MAIN LOGGING FUNCTION ====================

/**
 * Залогировать изменение Ци
 *
 * @param sessionId - ID сессии
 * @param characterId - ID персонажа
 * @param options - Параметры изменения
 */
export function logQiChange(
  sessionId: string,
  characterId: string,
  options: {
    oldQi: number;
    newQi: number;
    oldAccumulated?: number;
    newAccumulated?: number;
    source: QiChangeSource;
    reason: string;
    details?: Record<string, unknown>;
  }
): QiLogEntry | null {
  if (!qiLoggingEnabled) {
    return null;
  }

  const qiChange = options.newQi - options.oldQi;
  const accumulatedChange = options.newAccumulated !== undefined && options.oldAccumulated !== undefined
    ? options.newAccumulated - options.oldAccumulated
    : undefined;

  const entry: QiLogEntry = {
    timestamp: new Date(),
    sessionId,
    characterId,
    oldQi: options.oldQi,
    newQi: options.newQi,
    qiChange,
    oldAccumulated: options.oldAccumulated,
    newAccumulated: options.newAccumulated,
    accumulatedChange,
    source: options.source,
    reason: options.reason,
    details: options.details,
  };

  // Добавляем в буфер
  qiLogBuffer.push(entry);
  if (qiLogBuffer.length > MAX_QI_LOG_BUFFER) {
    qiLogBuffer.shift();
  }

  // Форматированный вывод в консоль
  const time = entry.timestamp.toISOString().split('T')[1].split('.')[0];
  const changeSign = qiChange >= 0 ? '+' : '';
  const qiEmoji = qiChange >= 0 ? '💜' : '💔';

  let consoleMsg = `${qiEmoji} [${time}] QI ${changeSign}${qiChange} | ${options.source}: ${options.reason}`;
  consoleMsg += ` | Ядро: ${options.oldQi} → ${options.newQi}`;

  if (accumulatedChange !== undefined && accumulatedChange !== 0) {
    const accSign = accumulatedChange >= 0 ? '+' : '';
    consoleMsg += ` | Накоп: ${accSign}${accumulatedChange}`;
  }

  // Цветной вывод в консоль
  if (qiChange < 0) {
    console.warn(consoleMsg, options.details || '');
  } else {
    console.log(consoleMsg, options.details || '');
  }

  return entry;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Быстрый лог для медитации
 */
export function logQiMeditation(
  sessionId: string,
  characterId: string,
  oldQi: number,
  newQi: number,
  duration: number,
  type: 'accumulation' | 'breakthrough' | 'conductivity'
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi,
    newQi,
    source: type === 'breakthrough' ? 'breakthrough' : type === 'conductivity' ? 'conductivity' : 'meditation',
    reason: `${type} meditation ${duration}min`,
    details: { duration, type },
  });
}

/**
 * Быстрый лог для техники
 */
export function logQiTechnique(
  sessionId: string,
  characterId: string,
  oldQi: number,
  newQi: number,
  techniqueName: string
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi,
    newQi,
    source: 'technique',
    reason: `technique: ${techniqueName}`,
    details: { techniqueName },
  });
}

/**
 * Быстрый лог для рассеивания
 */
export function logQiDissipation(
  sessionId: string,
  characterId: string,
  oldQi: number,
  newQi: number,
  reason: string
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi,
    newQi,
    source: 'dissipation',
    reason,
  });
}

/**
 * Быстрый лог для предмета
 */
export function logQiItem(
  sessionId: string,
  characterId: string,
  oldQi: number,
  newQi: number,
  itemName: string
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi,
    newQi,
    source: 'item',
    reason: `item: ${itemName}`,
    details: { itemName },
  });
}

/**
 * Быстрый лог для системных изменений
 */
export function logQiSystem(
  sessionId: string,
  characterId: string,
  oldQi: number,
  newQi: number,
  reason: string,
  details?: Record<string, unknown>
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi,
    newQi,
    source: 'system',
    reason,
    details,
  });
}

/**
 * Быстрый лог для синхронизации с БД
 */
export function logQiSync(
  sessionId: string,
  characterId: string,
  memoryQi: number,
  dbQi: number,
  action: 'save' | 'load'
): QiLogEntry | null {
  return logQiChange(sessionId, characterId, {
    oldQi: action === 'save' ? memoryQi : dbQi,
    newQi: action === 'save' ? dbQi : memoryQi,
    source: 'sync',
    reason: `${action} DB sync`,
    details: { memoryQi, dbQi, action },
  });
}

// ==================== STATISTICS ====================

/**
 * Статистика изменений Ци за сессию
 */
export function getQiStats(sessionId: string): {
  totalGained: number;
  totalSpent: number;
  netChange: number;
  gainCount: number;
  spendCount: number;
  topSources: Array<{ source: QiChangeSource; count: number; total: number }>;
} {
  const logs = getQiLogsBySession(sessionId);

  let totalGained = 0;
  let totalSpent = 0;
  let gainCount = 0;
  let spendCount = 0;

  const sourceStats = new Map<QiChangeSource, { count: number; total: number }>();

  for (const log of logs) {
    if (log.qiChange >= 0) {
      totalGained += log.qiChange;
      gainCount++;
    } else {
      totalSpent += Math.abs(log.qiChange);
      spendCount++;
    }

    const existing = sourceStats.get(log.source) || { count: 0, total: 0 };
    existing.count++;
    existing.total += log.qiChange;
    sourceStats.set(log.source, existing);
  }

  const topSources = Array.from(sourceStats.entries())
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  return {
    totalGained,
    totalSpent,
    netChange: totalGained - totalSpent,
    gainCount,
    spendCount,
    topSources,
  };
}

// ==================== EXPORT ====================

const qiLogger = {
  logQiChange,
  logQiMeditation,
  logQiTechnique,
  logQiDissipation,
  logQiItem,
  logQiSystem,
  logQiSync,
  setQiLoggingEnabled,
  isQiLoggingEnabled,
  getQiLogBuffer,
  clearQiLogBuffer,
  getRecentQiLogs,
  getQiLogsBySession,
  getQiLogsBySource,
  getQiStats,
};

export default qiLogger;
