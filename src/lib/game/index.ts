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

// Формации (объекты мира)
export * from "./formations";

// Маршрутизатор запросов
export * from "./request-router";

// Система сущностей
export * from "./entity-system";

// Импорт типов из хука useGame
export type { Character, Location, WorldTime } from "@/hooks/useGame";
