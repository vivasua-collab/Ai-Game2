/**
 * Игровые механики - главный модуль
 * 
 * Экспорт всех подсистем:
 * - qiSystem: система Ци
 * - fatigueSystem: система усталости
 * - environmentSystem: система окружения
 * - techniqueSystem: система техник (активные способности)
 * - cultivationSkills: система навыков культивации (пассивные)
 * - formations: система формаций (объекты мира)
 * - qiInsight: система прозрения (создание техник)
 * - techniqueLearning: система обучения техникам
 * - worldCoordinates: система координат мира
 * - requestRouter: маршрутизатор запросов
 * - entitySystem: система персонажей/монстров
 */

// Система Ци
export * from "./qi-system";

// Система усталости
export * from "./fatigue-system";

// Система окружения
export * from "./environment-system";

// Система техник (активные способности)
export * from "./techniques";

// Навыки культивации (пассивные)
export * from "./cultivation-skills";

// Система развития проводимости
export * from "./conductivity-system";

// Формации (объекты мира)
export * from "./formations";

// Система прозрения (создание техник)
export * from "./qi-insight";

// Система обучения техникам
export * from "./technique-learning";

// Система координат мира
export * from "./world-coordinates";

// Маршрутизатор запросов
export * from "./request-router";

// Система сущностей
export * from "./entity-system";

// Импорт типов из типов игры
export type { Character, Location, WorldTime } from "@/types/game";
