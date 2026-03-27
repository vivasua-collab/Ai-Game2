import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logInfo, logError } from "@/lib/logger";

// GET - получить настройки LLM
export async function GET() {
  try {
    // Получаем настройки из БД
    let settings = await db.gameSettings.findFirst();

    if (!settings) {
      // Создаем дефолтные настройки
      settings = await db.gameSettings.create({
        data: {
          llmProvider: "z-ai",
          temperature: 0.8,
          maxTokens: 2000,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        llmProvider: settings.llmProvider,
        llmModel: settings.llmModel,
        llmEndpoint: settings.llmEndpoint,
        llmApiKey: settings.llmApiKey ? "***" : null, // Скрываем API ключ
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
    });
  } catch (error) {
    await logError("API", "Failed to get LLM settings", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - сохранить настройки LLM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { llmEndpoint, llmModel, llmProvider, temperature, maxTokens } = body;

    // Получаем существующие настройки
    let settings = await db.gameSettings.findFirst();

    if (settings) {
      // Обновляем настройки
      settings = await db.gameSettings.update({
        where: { id: settings.id },
        data: {
          ...(llmEndpoint !== undefined && { llmEndpoint }),
          ...(llmModel !== undefined && { llmModel }),
          ...(llmProvider !== undefined && { llmProvider }),
          ...(temperature !== undefined && { temperature }),
          ...(maxTokens !== undefined && { maxTokens }),
        },
      });
    } else {
      // Создаем новые настройки
      settings = await db.gameSettings.create({
        data: {
          llmProvider: llmProvider || "z-ai",
          llmEndpoint: llmEndpoint || null,
          llmModel: llmModel || null,
          temperature: temperature || 0.8,
          maxTokens: maxTokens || 2000,
        },
      });
    }

    await logInfo("API", "LLM settings updated", {
      llmEndpoint: llmEndpoint || "default",
      llmModel: llmModel || "default",
    });

    return NextResponse.json({
      success: true,
      settings: {
        llmProvider: settings.llmProvider,
        llmModel: settings.llmModel,
        llmEndpoint: settings.llmEndpoint,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
    });
  } catch (error) {
    await logError("API", "Failed to save LLM settings", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
