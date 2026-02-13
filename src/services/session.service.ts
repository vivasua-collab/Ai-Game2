/**
 * Session Service
 * 
 * Handles all game session management operations.
 * Pure TypeScript class - stateless, all data in database.
 */

import { db } from '@/lib/db';
import type { WorldTime } from '@/types/game';
import { Prisma } from '@prisma/client';

// Type for session with includes
export type SessionWithIncludes = Prisma.GameSessionGetPayload<{
  include: {
    character: true;
    messages: {
      orderBy: { createdAt: 'desc' };
      take: number;
    };
  };
}>;

// Result types
export interface SessionResult {
  success: boolean;
  session?: SessionWithIncludes;
  error?: string;
}

export interface WorldTimeUpdateResult {
  success: boolean;
  newTime?: WorldTime & { daysSinceStart: number };
  error?: string;
}

// Options for getSession
interface GetSessionOptions {
  includeMessages?: boolean;
  messageLimit?: number;
}

/**
 * Session Service Class
 */
export class SessionService {
  /**
   * Get a session by ID with optional includes
   */
  static async getSession(
    sessionId: string,
    options: GetSessionOptions = {}
  ): Promise<SessionResult> {
    try {
      const { includeMessages = true, messageLimit = 20 } = options;

      const session = await db.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          character: true,
          messages: includeMessages
            ? {
              orderBy: { createdAt: 'desc' as const },
              take: messageLimit,
            }
            : false,
        },
      });

      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, session: session as SessionWithIncludes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to get session: ${message}` };
    }
  }

  /**
   * Create a new session with character
   */
  static async createSession(data: {
    characterId: string;
    worldName?: string;
    startVariant?: number;
    worldYear?: number;
    worldMonth?: number;
    worldDay?: number;
    worldHour?: number;
    worldMinute?: number;
  }): Promise<SessionResult> {
    try {
      const session = await db.gameSession.create({
        data: {
          characterId: data.characterId,
          worldName: data.worldName ?? 'Неизвестный мир',
          startVariant: data.startVariant ?? 1,
          worldYear: data.worldYear ?? 1864,
          worldMonth: data.worldMonth ?? 1,
          worldDay: data.worldDay ?? 1,
          worldHour: data.worldHour ?? 6,
          worldMinute: data.worldMinute ?? 0,
          daysSinceStart: 0,
          worldState: '{}',
          isPaused: true,
        },
        include: {
          character: true,
          messages: true,
        },
      });

      return { success: true, session: session as SessionWithIncludes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to create session: ${message}` };
    }
  }

  /**
   * Save session state
   */
  static async saveSession(
    sessionId: string,
    data: Partial<{
      worldState: string;
      isPaused: boolean;
      daysSinceStart: number;
    }>
  ): Promise<SessionResult> {
    try {
      const updateData: Prisma.GameSessionUpdateInput = {
        updatedAt: new Date(),
      };

      if (data.worldState !== undefined) updateData.worldState = data.worldState;
      if (data.isPaused !== undefined) updateData.isPaused = data.isPaused;
      if (data.daysSinceStart !== undefined) updateData.daysSinceStart = data.daysSinceStart;

      const session = await db.gameSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          character: true,
          messages: {
            orderBy: { createdAt: 'desc' as const },
            take: 20,
          },
        },
      });

      return { success: true, session: session as SessionWithIncludes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to save session: ${message}` };
    }
  }

  /**
   * Update world time
   * Handles overflow for minutes, hours, days, months, years
   */
  static async updateWorldTime(
    sessionId: string,
    minutesToAdd: number
  ): Promise<WorldTimeUpdateResult> {
    try {
      const session = await db.gameSession.findUnique({
        where: { id: sessionId },
        select: {
          worldYear: true,
          worldMonth: true,
          worldDay: true,
          worldHour: true,
          worldMinute: true,
          daysSinceStart: true,
        },
      });

      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Calculate new time with overflow handling
      let newMinute = session.worldMinute + minutesToAdd;
      let newHour = session.worldHour;
      let newDay = session.worldDay;
      let newMonth = session.worldMonth;
      let newYear = session.worldYear;
      let daysSinceStart = session.daysSinceStart;

      // Handle overflow
      while (newMinute >= 60) {
        newMinute -= 60;
        newHour++;
      }

      while (newHour >= 24) {
        newHour -= 24;
        newDay++;
        daysSinceStart++;
      }

      while (newDay > 30) {
        newDay -= 30;
        newMonth++;
      }

      while (newMonth > 12) {
        newMonth -= 12;
        newYear++;
      }

      // Update in database
      await db.gameSession.update({
        where: { id: sessionId },
        data: {
          worldMinute: newMinute,
          worldHour: newHour,
          worldDay: newDay,
          worldMonth: newMonth,
          worldYear: newYear,
          daysSinceStart,
          updatedAt: new Date(),
        },
      });

      // Determine season based on month
      const season = newMonth <= 6 ? 'тёплый' : 'холодный';

      return {
        success: true,
        newTime: {
          year: newYear,
          month: newMonth,
          day: newDay,
          hour: newHour,
          minute: newMinute,
          formatted: `${newYear} Э.С.М., ${newMonth} месяц, ${newDay} день, ${newHour}:${newMinute.toString().padStart(2, '0')}`,
          season,
          daysSinceStart,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to update world time: ${message}` };
    }
  }

  /**
   * Get current world time
   */
  static async getWorldTime(sessionId: string): Promise<{
    time: (WorldTime & { daysSinceStart: number }) | null;
    error?: string;
  }> {
    try {
      const session = await db.gameSession.findUnique({
        where: { id: sessionId },
        select: {
          worldYear: true,
          worldMonth: true,
          worldDay: true,
          worldHour: true,
          worldMinute: true,
          daysSinceStart: true,
        },
      });

      if (!session) {
        return { time: null, error: 'Session not found' };
      }

      const season = session.worldMonth <= 6 ? 'тёплый' : 'холодный';

      return {
        time: {
          year: session.worldYear,
          month: session.worldMonth,
          day: session.worldDay,
          hour: session.worldHour,
          minute: session.worldMinute,
          formatted: `${session.worldYear} Э.С.М., ${session.worldMonth} месяц, ${session.worldDay} день, ${session.worldHour}:${session.worldMinute.toString().padStart(2, '0')}`,
          season,
          daysSinceStart: session.daysSinceStart,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { time: null, error: `Failed to get world time: ${message}` };
    }
  }

  /**
   * Delete a session and all related data
   */
  static async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete in order due to foreign key constraints
      await db.message.deleteMany({ where: { sessionId } });
      await db.nPC.deleteMany({ where: { sessionId } });
      await db.location.deleteMany({ where: { sessionId } });
      await db.sect.deleteMany({ where: { sessionId } });
      await db.worldEvent.deleteMany({ where: { sessionId } });

      // Get character ID before deleting session
      const session = await db.gameSession.findUnique({
        where: { id: sessionId },
        select: { characterId: true },
      });

      // Delete session (will cascade to character if configured)
      await db.gameSession.delete({ where: { id: sessionId } });

      // Delete character separately if not cascade
      if (session?.characterId) {
        await db.character.deleteMany({ where: { id: session.characterId } });
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to delete session: ${message}` };
    }
  }

  /**
   * Add a message to the session
   */
  static async addMessage(
    sessionId: string,
    data: {
      type: string;
      sender: string | null;
      content: string;
      metadata?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.message.create({
        data: {
          sessionId,
          type: data.type,
          sender: data.sender,
          content: data.content,
          metadata: data.metadata ?? null,
        },
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add message: ${message}` };
    }
  }

  /**
   * Get session messages
   */
  static async getMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<{
    messages: Prisma.Message[];
    error?: string;
  }> {
    try {
      const messages = await db.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return { messages };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { messages: [], error: `Failed to get messages: ${message}` };
    }
  }
}

// Export convenience functions for backward compatibility
export const getSession = SessionService.getSession;
export const createSession = SessionService.createSession;
export const saveSession = SessionService.saveSession;
export const updateWorldTime = SessionService.updateWorldTime;
export const getWorldTime = SessionService.getWorldTime;
