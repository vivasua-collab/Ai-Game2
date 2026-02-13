/**
 * Интерфейс репозитория персонажа
 * Абстракция для работы с данными персонажа
 */

import type { Character } from "@/types/game";

export interface ICharacterRepository {
  /**
   * Найти персонажа по ID
   */
  findById(id: string): Promise<Character | null>;

  /**
   * Найти персонажа по ID сессии
   */
  findBySessionId(sessionId: string): Promise<Character | null>;

  /**
   * Создать персонажа
   */
  create(data: Omit<Character, "id">): Promise<Character>;

  /**
   * Обновить персонажа
   */
  update(id: string, data: Partial<Character>): Promise<Character>;

  /**
   * Удалить персонажа
   */
  delete(id: string): Promise<void>;

  /**
   * Обновить Ци
   */
  updateQi(id: string, currentQi: number, accumulatedQi?: number): Promise<Character>;

  /**
   * Обновить усталость
   */
  updateFatigue(
    id: string, 
    fatigue: number, 
    mentalFatigue: number
  ): Promise<Character>;

  /**
   * Применить прорыв
   */
  applyBreakthrough(
    id: string,
    newLevel: number,
    newSubLevel: number,
    newCoreCapacity: number,
    qiConsumed: number
  ): Promise<Character>;
}
