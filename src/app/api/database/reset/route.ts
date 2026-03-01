import { NextResponse } from "next/server";
import { resetDatabase } from "@/lib/migrations";
import { logInfo, logError } from "@/lib/logger";

export async function POST() {
  try {
    await logInfo("SYSTEM", "Database reset requested");

    const result = await resetDatabase();

    if (result.success) {
      await logInfo("SYSTEM", "Database reset completed", { backupPath: result.backupPath });

      return NextResponse.json({
        success: true,
        message: "Database recreated successfully",
        backupPath: result.backupPath,
      });
    } else {
      await logError("DATABASE", `Database reset failed: ${result.error}`, {
        error: result.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logError("DATABASE", `Database reset failed: ${errorMsg}`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
