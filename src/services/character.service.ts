/**
 * Character Service
 * 
 * Handles all character CRUD operations and state updates.
 * Pure TypeScript class - stateless, all data in database.
 */

import { db } from '@/lib/db';
import type { Character } from '@/types/game';
import { Prisma } from '@prisma/client';

// Type for Prisma Character include
export type CharacterWithRelations = Prisma.CharacterGetPayload<{
  include: {
    currentLocation: true;
    sect: true;
  };
}>;

// Result types
export interface CharacterResult {
  success: boolean;
  character?: CharacterWithRelations;
  error?: string;
}

export interface CharacterUpdateResult {
  success: boolean;
  character?: CharacterWithRelations;
  changes?: Record<string, unknown>;
  error?: string;
}

/**
 * Character Service Class
 */
export class CharacterService {
  /**
   * Get a character by ID
   */
  static async getCharacter(characterId: string): Promise<CharacterResult> {
    try {
      const character = await db.character.findUnique({
        where: { id: characterId },
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      if (!character) {
        return { success: false, error: 'Character not found' };
      }

      return { success: true, character };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to get character: ${message}` };
    }
  }

  /**
   * Update character with partial data
   */
  static async updateCharacter(
    characterId: string,
    data: Partial<Character>
  ): Promise<CharacterUpdateResult> {
    try {
      // Build update data - map Character type to Prisma schema
      const updateData: Prisma.CharacterUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.age !== undefined) updateData.age = data.age;
      if (data.cultivationLevel !== undefined) updateData.cultivationLevel = data.cultivationLevel;
      if (data.cultivationSubLevel !== undefined) updateData.cultivationSubLevel = data.cultivationSubLevel;
      if (data.coreCapacity !== undefined) updateData.coreCapacity = data.coreCapacity;
      if (data.coreQuality !== undefined) updateData.coreQuality = data.coreQuality;
      if (data.currentQi !== undefined) updateData.currentQi = data.currentQi;
      if (data.accumulatedQi !== undefined) updateData.accumulatedQi = data.accumulatedQi;
      if (data.strength !== undefined) updateData.strength = data.strength;
      if (data.agility !== undefined) updateData.agility = data.agility;
      if (data.intelligence !== undefined) updateData.intelligence = data.intelligence;
      if (data.conductivity !== undefined) updateData.conductivity = data.conductivity;
      if (data.health !== undefined) updateData.health = data.health;
      if (data.fatigue !== undefined) updateData.fatigue = data.fatigue;
      if (data.mentalFatigue !== undefined) updateData.mentalFatigue = data.mentalFatigue;
      if (data.hasAmnesia !== undefined) updateData.hasAmnesia = data.hasAmnesia;
      if (data.knowsAboutSystem !== undefined) updateData.knowsAboutSystem = data.knowsAboutSystem;
      if (data.sectRole !== undefined) updateData.sectRole = data.sectRole;

      // Always update timestamp
      updateData.updatedAt = new Date();

      const character = await db.character.update({
        where: { id: characterId },
        data: updateData,
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      return { success: true, character, changes: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to update character: ${message}` };
    }
  }

  /**
   * Apply fatigue changes to character
   * Uses positive values for fatigue increase
   */
  static async applyFatigue(
    characterId: string,
    physicalChange: number,
    mentalChange: number
  ): Promise<CharacterUpdateResult> {
    try {
      // Get current character to calculate new values
      const current = await db.character.findUnique({
        where: { id: characterId },
        select: { fatigue: true, mentalFatigue: true },
      });

      if (!current) {
        return { success: false, error: 'Character not found' };
      }

      // Calculate new fatigue (clamped to 0-100)
      const newPhysicalFatigue = Math.max(0, Math.min(100, current.fatigue + physicalChange));
      const newMentalFatigue = Math.max(0, Math.min(100, current.mentalFatigue + mentalChange));

      const character = await db.character.update({
        where: { id: characterId },
        data: {
          fatigue: newPhysicalFatigue,
          mentalFatigue: newMentalFatigue,
          updatedAt: new Date(),
        },
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      return {
        success: true,
        character,
        changes: {
          fatigue: newPhysicalFatigue,
          mentalFatigue: newMentalFatigue,
          physicalChange: newPhysicalFatigue - current.fatigue,
          mentalChange: newMentalFatigue - current.mentalFatigue,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to apply fatigue: ${message}` };
    }
  }

  /**
   * Get character with current location
   */
  static async getCharacterWithLocation(characterId: string): Promise<{
    character: CharacterWithRelations | null;
    location: Prisma.Location | null;
    error?: string;
  }> {
    try {
      const character = await db.character.findUnique({
        where: { id: characterId },
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      if (!character) {
        return { character: null, location: null, error: 'Character not found' };
      }

      let location = null;
      if (character.currentLocationId) {
        location = await db.location.findUnique({
          where: { id: character.currentLocationId },
        });
      }

      return { character, location };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { character: null, location: null, error: `Failed to get character with location: ${message}` };
    }
  }

  /**
   * Update character location
   */
  static async updateLocation(
    characterId: string,
    locationId: string | null
  ): Promise<CharacterResult> {
    try {
      const character = await db.character.update({
        where: { id: characterId },
        data: {
          currentLocationId: locationId,
          updatedAt: new Date(),
        },
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      return { success: true, character };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to update location: ${message}` };
    }
  }

  /**
   * Create a new character with default values
   */
  static async createCharacter(data: {
    name: string;
    age?: number;
    cultivationLevel?: number;
    cultivationSubLevel?: number;
    coreCapacity?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  }): Promise<CharacterResult> {
    try {
      const character = await db.character.create({
        data: {
          name: data.name,
          age: data.age ?? 16,
          cultivationLevel: data.cultivationLevel ?? 1,
          cultivationSubLevel: data.cultivationSubLevel ?? 0,
          coreCapacity: data.coreCapacity ?? 1000,
          strength: data.strength ?? 10.0,
          agility: data.agility ?? 10.0,
          intelligence: data.intelligence ?? 10.0,
          conductivity: data.conductivity ?? 0.0,
        },
        include: {
          currentLocation: true,
          sect: true,
        },
      });

      return { success: true, character };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to create character: ${message}` };
    }
  }

  /**
   * Delete a character
   */
  static async deleteCharacter(characterId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.character.delete({
        where: { id: characterId },
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to delete character: ${message}` };
    }
  }
}

// Export convenience functions for backward compatibility
export const getCharacter = CharacterService.getCharacter;
export const updateCharacter = CharacterService.updateCharacter;
export const applyFatigue = CharacterService.applyFatigue;
export const getCharacterWithLocation = CharacterService.getCharacterWithLocation;
