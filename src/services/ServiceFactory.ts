/**
 * Фабрика сервисов
 * Создаёт и настраивает все сервисы с их зависимостями
 */

import { GameService } from "./GameService";
import { PrismaCharacterRepository } from "@/repositories/prisma/PrismaCharacterRepository";
import { PrismaSessionRepository } from "@/repositories/prisma/PrismaSessionRepository";

// Кэшированные экземпляры (Singleton pattern)
let gameServiceInstance: GameService | null = null;
let characterRepoInstance: PrismaCharacterRepository | null = null;
let sessionRepoInstance: PrismaSessionRepository | null = null;

/**
 * Создать или получить CharacterRepository
 */
export function getCharacterRepository(): PrismaCharacterRepository {
  if (!characterRepoInstance) {
    characterRepoInstance = new PrismaCharacterRepository();
  }
  return characterRepoInstance;
}

/**
 * Создать или получить SessionRepository
 */
export function getSessionRepository(): PrismaSessionRepository {
  if (!sessionRepoInstance) {
    sessionRepoInstance = new PrismaSessionRepository();
  }
  return sessionRepoInstance;
}

/**
 * Создать или получить GameService
 */
export function createGameService(): GameService {
  if (!gameServiceInstance) {
    const characterRepo = getCharacterRepository();
    const sessionRepo = getSessionRepository();
    gameServiceInstance = new GameService(characterRepo, sessionRepo);
  }
  return gameServiceInstance;
}

/**
 * Сбросить все инстансы (для тестирования)
 */
export function resetServiceInstances(): void {
  gameServiceInstance = null;
  characterRepoInstance = null;
  sessionRepoInstance = null;
}
