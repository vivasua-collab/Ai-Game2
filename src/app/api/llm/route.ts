import { NextResponse } from "next/server";
import { checkLLMStatus, initializeLLM } from "@/lib/llm";

export async function GET() {
  try {
    // Инициализируем LLM
    initializeLLM();

    // Проверяем статус провайдеров
    const status = await checkLLMStatus();

    return NextResponse.json({
      success: true,
      providers: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LLM status API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
