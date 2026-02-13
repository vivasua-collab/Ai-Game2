/**
 * Prisma-имплементация репозитория персонажа
 */

import { db } from "@/lib/db";
import type { ICharacterRepository } from "../ICharacterRepository";
import type { Character } from "@/types/game";

export class PrismaCharacterRepository implements ICharacterRepository {
  
  async findById(id: string): Promise<Character | null> {
    const char = await db.character.findUnique({ where: { id } });
    return char ? this.toDomain(char) : null;
  }

  async findBySessionId(sessionId: string): Promise<Character | null> {
    const session = await db.gameSession.findUnique({
      where: { id: sessionId },
      include: { character: true },
    });
    return session?.character ? this.toDomain(session.character) : null;
  }

  async create(data: Omit<Character, "id">): Promise<Character> {
    const char = await db.character.create({
      data: {
        name: data.name,
        age: data.age,
        cultivationLevel: data.cultivationLevel,
        cultivationSubLevel: data.cultivationSubLevel,
        coreCapacity: data.coreCapacity,
        coreQuality: data.coreQuality,
        currentQi: data.currentQi,
        accumulatedQi: data.accumulatedQi,
        strength: data.strength,
        agility: data.agility,
        intelligence: data.intelligence,
        conductivity: data.conductivity,
        health: data.health,
        fatigue: data.fatigue,
        mentalFatigue: data.mentalFatigue,
        hasAmnesia: data.hasAmnesia,
        knowsAboutSystem: data.knowsAboutSystem,
        sectRole: data.sectRole,
      },
    });
    return this.toDomain(char);
  }

  async update(id: string, data: Partial<Character>): Promise<Character> {
    const char = await db.character.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(char);
  }

  async delete(id: string): Promise<void> {
    await db.character.delete({ where: { id } });
  }

  async updateQi(id: string, currentQi: number, accumulatedQi?: number): Promise<Character> {
    const updateData: Record<string, unknown> = { currentQi };
    if (accumulatedQi !== undefined) {
      updateData.accumulatedQi = accumulatedQi;
    }
    
    const char = await db.character.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() },
    });
    return this.toDomain(char);
  }

  async updateFatigue(id: string, fatigue: number, mentalFatigue: number): Promise<Character> {
    const char = await db.character.update({
      where: { id },
      data: { 
        fatigue: Math.max(0, Math.min(100, fatigue)),
        mentalFatigue: Math.max(0, Math.min(100, mentalFatigue)),
        updatedAt: new Date(),
      },
    });
    return this.toDomain(char);
  }

  async applyBreakthrough(
    id: string,
    newLevel: number,
    newSubLevel: number,
    newCoreCapacity: number,
    qiConsumed: number
  ): Promise<Character> {
    const char = await db.character.update({
      where: { id },
      data: {
        cultivationLevel: newLevel,
        cultivationSubLevel: newSubLevel,
        coreCapacity: newCoreCapacity,
        accumulatedQi: { decrement: qiConsumed },
        updatedAt: new Date(),
      },
    });
    return this.toDomain(char);
  }

  /**
   * Преобразование Prisma-модели в доменную модель
   */
  private toDomain(prismaChar: {
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
    currentLocationId: string | null;
  }): Character {
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
}
