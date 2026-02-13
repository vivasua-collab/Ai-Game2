/**
 * Интерфейс репозитория сессии
 * Абстракция для работы с данными игровой сессии
 */

import type { Character, Location, WorldTime } from "@/types/game";

export interface SessionWithContext {
  id: string;
  worldId: string;
  worldName: string;
  character: Character;
  characterId: string;
  location: Location | null;
  worldTime: WorldTime;
  daysSinceStart: number;
  isPaused: boolean;
  messages: Array<{
    id: string;
    type: string;
    sender: string | null;
    content: string;
    createdAt: Date;
  }>;
}

export interface ISessionRepository {
  /**
   * Найти сессию по ID
   */
  findById(id: string): Promise<SessionWithContext | null>;

  /**
   * Найти сессию с полным контекстом
   */
  findByIdWithContext(id: string): Promise<SessionWithContext | null>;

  /**
   * Создать сессию
   */
  create(data: {
    worldId: string;
    worldName: string;
    startVariant: number;
    startType: string;
    characterId: string;
  }): Promise<{ id: string }>;

  /**
   * Обновить время в мире
   */
  updateTime(
    id: string,
    time: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      daysSinceStart: number;
    }
  ): Promise<void>;

  /**
   * Установить паузу
   */
  setPaused(id: string, isPaused: boolean): Promise<void>;

  /**
   * Добавить сообщение
   */
  addMessage(
    sessionId: string,
    message: {
      type: string;
      sender: string | null;
      content: string;
    }
  ): Promise<{ id: string }>;

  /**
   * Получить последние сообщения
   */
  getRecentMessages(sessionId: string, limit: number): Promise<Array<{
    id: string;
    type: string;
    sender: string | null;
    content: string;
    createdAt: Date;
  }>>;

  /**
   * Удалить сессию со всеми связанными данными
   */
  deleteWithRelations(id: string): Promise<void>;

  /**
   * Получить список сохранений
   */
  getSaves(limit: number): Promise<Array<{
    id: string;
    worldId: string;
    worldName: string;
    updatedAt: Date;
    character: {
      name: string;
      cultivationLevel: number;
      cultivationSubLevel: number;
    };
  }>>;
}
