/**
 * Prisma-имплементация репозитория сессии
 */

import { db } from "@/lib/db";
import type { ISessionRepository, SessionWithContext } from "../ISessionRepository";

export class PrismaSessionRepository implements ISessionRepository {
  
  async findById(id: string): Promise<SessionWithContext | null> {
    return this.findByIdWithContext(id);
  }

  async findByIdWithContext(id: string): Promise<SessionWithContext | null> {
    const session = await db.gameSession.findUnique({
      where: { id },
      include: {
        character: {
          include: { currentLocation: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!session) return null;

    // Получаем локацию
    let location = null;
    if (session.character?.currentLocationId) {
      location = await db.location.findUnique({
        where: { id: session.character.currentLocationId },
      });
    }

    return {
      id: session.id,
      worldId: session.worldId,
      worldName: session.worldName,
      character: this.characterToDomain(session.character),
      characterId: session.characterId,
      location: location ? this.locationToDomain(location) : null,
      worldTime: {
        year: session.worldYear,
        month: session.worldMonth,
        day: session.worldDay,
        hour: session.worldHour,
        minute: session.worldMinute,
        formatted: `${session.worldYear} Э.С.М., ${session.worldMonth} мес., ${session.worldDay} дн.`,
        season: session.worldMonth <= 6 ? "тёплый" : "холодный",
      },
      daysSinceStart: session.daysSinceStart,
      isPaused: session.isPaused,
      messages: session.messages.map((m) => ({
        id: m.id,
        type: m.type,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async create(data: {
    worldId: string;
    worldName: string;
    startVariant: number;
    startType: string;
    characterId: string;
  }): Promise<{ id: string }> {
    const session = await db.gameSession.create({
      data: {
        worldId: data.worldId,
        worldName: data.worldName,
        startVariant: data.startVariant,
        startType: data.startType,
        characterId: data.characterId,
        worldYear: 1864,
        worldMonth: 1,
        worldDay: 1,
        worldHour: 7,
        worldMinute: 0,
        daysSinceStart: 0,
        isPaused: true,
      },
    });
    return { id: session.id };
  }

  async updateTime(
    id: string,
    time: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      daysSinceStart: number;
    }
  ): Promise<void> {
    await db.gameSession.update({
      where: { id },
      data: {
        worldYear: time.year,
        worldMonth: time.month,
        worldDay: time.day,
        worldHour: time.hour,
        worldMinute: time.minute,
        daysSinceStart: time.daysSinceStart,
        updatedAt: new Date(),
      },
    });
  }

  async setPaused(id: string, isPaused: boolean): Promise<void> {
    await db.gameSession.update({
      where: { id },
      data: { isPaused, updatedAt: new Date() },
    });
  }

  async addMessage(
    sessionId: string,
    message: {
      type: string;
      sender: string | null;
      content: string;
    }
  ): Promise<{ id: string }> {
    const msg = await db.message.create({
      data: {
        sessionId,
        type: message.type,
        sender: message.sender,
        content: message.content,
      },
    });
    return { id: msg.id };
  }

  async getRecentMessages(sessionId: string, limit: number): Promise<Array<{
    id: string;
    type: string;
    sender: string | null;
    content: string;
    createdAt: Date;
  }>> {
    const messages = await db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return messages.map((m) => ({
      id: m.id,
      type: m.type,
      sender: m.sender,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }

  async deleteWithRelations(id: string): Promise<void> {
    // Получаем сессию для получения characterId
    const session = await db.gameSession.findUnique({
      where: { id },
      select: { characterId: true },
    });

    if (!session) return;

    // Удаляем в правильном порядке
    await db.message.deleteMany({ where: { sessionId: id } });
    await db.nPC.deleteMany({ where: { sessionId: id } });
    await db.location.deleteMany({ where: { sessionId: id } });
    await db.sect.deleteMany({ where: { sessionId: id } });
    await db.character.delete({ where: { id: session.characterId } });
    await db.gameSession.delete({ where: { id } });
  }

  async getSaves(limit: number): Promise<Array<{
    id: string;
    worldId: string;
    worldName: string;
    updatedAt: Date;
    character: {
      name: string;
      cultivationLevel: number;
      cultivationSubLevel: number;
    };
  }>> {
    const sessions = await db.gameSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        character: {
          select: {
            name: true,
            cultivationLevel: true,
            cultivationSubLevel: true,
          },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      worldId: s.worldId,
      worldName: s.worldName,
      updatedAt: s.updatedAt,
      character: {
        name: s.character?.name || "Неизвестно",
        cultivationLevel: s.character?.cultivationLevel || 1,
        cultivationSubLevel: s.character?.cultivationSubLevel || 0,
      },
    }));
  }

  /**
   * Преобразование Prisma-модели персонажа в доменную модель
   */
  private characterToDomain(prismaChar: {
    id: string;
    name: string;
    age: number;
    cultivationLevel: number;
    cultivationSubLevel: number;
    coreCapacity: number;
    coreQuality: number;
    currentQi: number;
    accumulatedQi: number;
    strength: number;
    agility: number;
    intelligence: number;
    conductivity: number;
    health: number;
    fatigue: number;
    mentalFatigue: number;
    hasAmnesia: boolean;
    knowsAboutSystem: boolean;
    sectRole: string | null;
  } | null) {
    if (!prismaChar) {
      return {
        id: "",
        name: "Неизвестно",
        age: 16,
        cultivationLevel: 1,
        cultivationSubLevel: 0,
        coreCapacity: 1000,
        coreQuality: 1,
        currentQi: 0,
        accumulatedQi: 0,
        strength: 10,
        agility: 10,
        intelligence: 10,
        conductivity: 0,
        health: 100,
        fatigue: 0,
        mentalFatigue: 0,
        hasAmnesia: true,
        knowsAboutSystem: false,
        sectRole: null,
      };
    }

    return {
      id: prismaChar.id,
      name: prismaChar.name,
      age: prismaChar.age,
      cultivationLevel: prismaChar.cultivationLevel,
      cultivationSubLevel: prismaChar.cultivationSubLevel,
      coreCapacity: prismaChar.coreCapacity,
      coreQuality: prismaChar.coreQuality,
      currentQi: prismaChar.currentQi,
      accumulatedQi: prismaChar.accumulatedQi,
      strength: prismaChar.strength,
      agility: prismaChar.agility,
      intelligence: prismaChar.intelligence,
      conductivity: prismaChar.conductivity,
      health: prismaChar.health,
      fatigue: prismaChar.fatigue,
      mentalFatigue: prismaChar.mentalFatigue,
      hasAmnesia: prismaChar.hasAmnesia,
      knowsAboutSystem: prismaChar.knowsAboutSystem,
      sectRole: prismaChar.sectRole,
    };
  }

  /**
   * Преобразование Prisma-модели локации в доменную модель
   */
  private locationToDomain(prismaLoc: {
    id: string;
    name: string;
    distanceFromCenter: number;
    qiDensity: number;
    terrainType: string;
  }) {
    return {
      id: prismaLoc.id,
      name: prismaLoc.name,
      distanceFromCenter: prismaLoc.distanceFromCenter,
      qiDensity: prismaLoc.qiDensity,
      terrainType: prismaLoc.terrainType,
    };
  }
}
