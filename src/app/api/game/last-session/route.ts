/**
 * API: Get Last Session
 * Returns the most recently updated game session for auto-restore
 *
 * @created 2026-03-11 11:45
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logDebug, logError } from "@/lib/logger";

/**
 * GET /api/game/last-session
 * Returns the last active session for auto-restore on page load
 */
export async function GET() {
  try {
    console.log('[LastSession API] Looking for last session...');
    
    // Find the most recently updated session with character data
    const lastSession = await db.gameSession.findFirst({
      orderBy: { updatedAt: "desc" },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            cultivationLevel: true,
            cultivationSubLevel: true,
            currentQi: true,
            health: true,
          },
        },
      },
    });
    
    console.log('[LastSession API] Query result:', lastSession ? { id: lastSession.id, characterName: lastSession.character?.name } : null);

    if (!lastSession) {
      return NextResponse.json({
        success: true,
        session: null,
        message: "No sessions found",
      });
    }

    await logDebug("API", "Last session found", {
      sessionId: lastSession.id,
      characterName: lastSession.character?.name,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: lastSession.id,
        worldName: lastSession.worldName,
        worldDay: lastSession.worldDay,
        updatedAt: lastSession.updatedAt,
        character: lastSession.character,
      },
    });
  } catch (error) {
    await logError("API", "Failed to get last session", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get last session",
        session: null,
      },
      { status: 500 }
    );
  }
}
