/**
 * Игровые механики - главный модуль
 * 
 * Экспорт всех подсистем:
 * - qiSystem: система Ци
 * - fatigueSystem: система усталости
 * - environmentSystem: система окружения
 * - techniqueSystem: система техник
 * - requestRouter: маршрутизатор запросов
 * - entitySystem: система персонажей/монстров
 */

// Система Ци
export * from "./qi-system";

// Система усталости
export * from "./fatigue-system";

// Система окружения
export * from "./environment-system";

// Система техник
export * from "./technique-system";

// Маршрутизатор запросов
export * from "./request-router";

// Система сущностей
export * from "./entity-system";

// Импорт типов из хука useGame
export type { Character, Location, WorldTime } from "@/hooks/useGame";
