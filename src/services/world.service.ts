/**
 * World Service
 * 
 * Handles world-related operations: locations, world events, and time-based mechanics.
 * Pure TypeScript class - stateless, all data in database.
 */

import { db } from '@/lib/db';
import type { Location, WorldTime } from '@/types/game';
import { Prisma } from '@prisma/client';

// Types from Prisma
export type LocationData = Prisma.LocationGetPayload<Record<string, never>>;
export type WorldEventData = Prisma.WorldEventGetPayload<Record<string, never>>;

// Result types
export interface LocationResult {
  success: boolean;
  location?: LocationData;
  error?: string;
}

export interface LocationsResult {
  success: boolean;
  locations?: LocationData[];
  error?: string;
}

export interface WorldEventResult {
  success: boolean;
  event?: WorldEventData;
  error?: string;
}

/**
 * World Service Class
 */
export class WorldService {
  /**
   * Get a location by ID
   */
  static async getLocation(locationId: string): Promise<LocationResult> {
    try {
      const location = await db.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return { success: false, error: 'Location not found' };
      }

      return { success: true, location };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to get location: ${message}` };
    }
  }

  /**
   * Get all locations for a session
   */
  static async getLocationsForSession(sessionId: string): Promise<LocationsResult> {
    try {
      const locations = await db.location.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      return { success: true, locations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to get locations: ${message}` };
    }
  }

  /**
   * Create a new location
   */
  static async createLocation(
    sessionId: string,
    data: {
      name: string;
      description?: string;
      distanceFromCenter?: number;
      qiDensity?: number;
      terrainType?: string;
      x?: number;
      y?: number;
      parentLocationId?: string;
    }
  ): Promise<LocationResult> {
    try {
      const location = await db.location.create({
        data: {
          sessionId,
          name: data.name,
          description: data.description,
          distanceFromCenter: data.distanceFromCenter ?? 50000,
          qiDensity: data.qiDensity ?? 100,
          terrainType: data.terrainType ?? 'plains',
          x: data.x,
          y: data.y,
          parentLocationId: data.parentLocationId,
        },
      });

      return { success: true, location };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to create location: ${message}` };
    }
  }

  /**
   * Update a location
   */
  static async updateLocation(
    locationId: string,
    data: Partial<{
      name: string;
      description: string;
      distanceFromCenter: number;
      qiDensity: number;
      qiFlowRate: number;
      terrainType: string;
    }>
  ): Promise<LocationResult> {
    try {
      const location = await db.location.update({
        where: { id: locationId },
        data: {
          ...data,
          createdAt: undefined, // Prevent updating createdAt
        },
      });

      return { success: true, location };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to update location: ${message}` };
    }
  }

  /**
   * Delete a location
   */
  static async deleteLocation(locationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.location.delete({
        where: { id: locationId },
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to delete location: ${message}` };
    }
  }

  /**
   * Generate world events based on current state
   * This could be expanded to include procedural generation
   */
  static async generateWorldEvents(
    sessionId: string,
    worldTime: WorldTime
  ): Promise<{
    events: WorldEventData[];
    error?: string;
  }> {
    try {
      // Placeholder for world event generation logic
      // This can be expanded to generate random events based on:
      // - Time of day
      // - Character location
      // - World state
      // - NPC actions

      const events: WorldEventData[] = [];

      // Example: Random weather events
      if (worldTime.hour === 6 && Math.random() < 0.1) {
        const weatherEvent = await db.worldEvent.create({
          data: {
            sessionId,
            eventType: 'weather_change',
            description: 'Утренний туман рассеивается',
            worldImpact: JSON.stringify({ visibility: 'normal' }),
          },
        });
        events.push(weatherEvent);
      }

      return { events };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { events: [], error: `Failed to generate world events: ${message}` };
    }
  }

  /**
   * Get unprocessed world events
   */
  static async getUnprocessedEvents(sessionId: string): Promise<{
    events: WorldEventData[];
    error?: string;
  }> {
    try {
      const events = await db.worldEvent.findMany({
        where: {
          sessionId,
          processed: false,
        },
        orderBy: { createdAt: 'asc' },
      });

      return { events };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { events: [], error: `Failed to get unprocessed events: ${message}` };
    }
  }

  /**
   * Mark event as processed
   */
  static async markEventProcessed(eventId: string): Promise<WorldEventResult> {
    try {
      const event = await db.worldEvent.update({
        where: { id: eventId },
        data: { processed: true },
      });

      return { success: true, event };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to mark event as processed: ${message}` };
    }
  }

  /**
   * Get location danger level based on distance and qi density
   */
  static calculateLocationDanger(location: Location | LocationData | null): number {
    if (!location) return 3; // Medium danger by default

    const { qiDensity, distanceFromCenter } = location;

    // Further from civilization center = more dangerous
    // Higher qi density = stronger creatures
    const distanceFactor = Math.floor(distanceFromCenter / 20000); // 0-5
    const densityFactor = Math.floor(qiDensity / 30); // 0-4

    // Final danger level (1-10)
    return Math.min(10, Math.max(1, 1 + distanceFactor + densityFactor));
  }

  /**
   * Get location base interruption chance
   */
  static getLocationInterruptionChance(location: Location | LocationData | null): number {
    if (!location) return 0.15;

    const terrainType = location.terrainType || 'plains';

    // Base interruption chances by terrain type (per hour)
    const terrainChances: Record<string, number> = {
      // Enclosed safe areas
      meditation_room: 0.01,
      building: 0.03,
      cave: 0.05,

      // Limited spaces
      courtyard: 0.08,
      garden: 0.10,
      village: 0.12,

      // Open spaces
      plains: 0.20,
      forest: 0.25,
      mountains: 0.30,

      // Dangerous zones
      wilderness: 0.40,
      dangerous: 0.50,
      forbidden: 0.70,
    };

    if (terrainChances[terrainType]) {
      return terrainChances[terrainType];
    }

    // Fallback based on distance from center
    if (location.distanceFromCenter > 90000) return 0.50;
    if (location.distanceFromCenter > 70000) return 0.35;
    if (location.distanceFromCenter > 50000) return 0.25;
    if (location.distanceFromCenter > 30000) return 0.15;
    return 0.10;
  }

  /**
   * Get time of day string from hour
   */
  static getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 19 && hour < 21) return 'dusk';
    return 'night';
  }

  /**
   * Get sects for a session
   */
  static async getSectsForSession(sessionId: string): Promise<{
    sects: Prisma.SectGetPayload<{
      include: { location: true };
    }>[];
    error?: string;
  }> {
    try {
      const sects = await db.sect.findMany({
        where: { sessionId },
        include: { location: true },
      });

      return { sects };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { sects: [], error: `Failed to get sects: ${message}` };
    }
  }
}

// Export convenience functions for backward compatibility
export const getLocation = WorldService.getLocation;
export const getLocationsForSession = WorldService.getLocationsForSession;
export const createLocation = WorldService.createLocation;
export const updateLocation = WorldService.updateLocation;
export const generateWorldEvents = WorldService.generateWorldEvents;
