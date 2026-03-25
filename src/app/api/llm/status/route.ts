import { NextRequest, NextResponse } from "next/server";
import { checkLLMStatus, initializeLLM, getLLMManager, setPreferredProvider, updateLLMConfig } from "@/lib/llm";

// GET - проверка статуса LLM провайдеров
export async function GET() {
  // Значения по умолчанию для ответа
  const defaultProviders = {
    zai: { available: false, error: undefined as string | undefined, model: undefined as string | undefined },
    local: { available: false, error: undefined as string | undefined, model: undefined as string | undefined },
    api: { available: false, error: undefined as string | undefined, model: undefined as string | undefined },
  };

  try {
    // Пытаемся загрузить настройки из БД (если БД существует)
    let savedEndpoint: string | null = null;
    try {
      const { db } = await import("@/lib/db");
      const settings = await db.gameSettings.findFirst();
      savedEndpoint = settings?.llmEndpoint || null;
    } catch {
      // БД не существует или недоступна - игнорируем
    }
    
    // Если есть кастомный endpoint для Ollama, применяем его
    if (savedEndpoint) {
      try {
        initializeLLM();
        updateLLMConfig({ localEndpoint: savedEndpoint });
      } catch {
        // Игнорируем ошибки
      }
    } else {
      // Инициализируем LLM если ещё не сделали
      try {
        initializeLLM();
      } catch {
        // Игнорируем ошибки инициализации
      }
    }

    // Получаем статус всех провайдеров
    let status: Record<string, { available: boolean; error?: string; model?: string }>;
    try {
      status = await checkLLMStatus();
    } catch (e) {
      // Если проверка статуса не удалась, возвращаем дефолтные значения
      console.error("Failed to check LLM status:", e);
      return NextResponse.json({
        success: true,
        available: false,
        currentProvider: "z-ai",
        currentModel: "default",
        preferredProvider: null,
        providers: defaultProviders,
        savedEndpoint,
        error: e instanceof Error ? e.message : "Failed to check providers",
      });
    }
    
    // Получаем выбранный провайдер
    let preferredProvider: string | null = null;
    try {
      const manager = getLLMManager();
      preferredProvider = manager.getPreferredProvider();
    } catch {
      // Игнорируем ошибки
    }
    
    // Определяем текущий провайдер
    let currentProvider = preferredProvider || "z-ai";
    
    if (!preferredProvider) {
      try {
        const manager = getLLMManager();
        // Пытаемся получить доступный провайдер
        const provider = await manager.getAvailableProvider();
        if (provider) {
          currentProvider = provider.getProviderName();
        }
      } catch {
        // Игнорируем ошибки
      }
    }

    // Определяем, есть ли доступный провайдер
    const isAvailable = 
      status.zai?.available || 
      status.local?.available || 
      status.api?.available;

    // Собираем информацию о моделях
    const models: Record<string, string> = {};
    if (status.zai?.available) {
      models["z-ai"] = status.zai.model || "default";
    }
    if (status.local?.available) {
      models["local"] = status.local.model || "unknown";
    }
    if (status.api?.available) {
      models["api"] = status.api.model || "unknown";
    }

    return NextResponse.json({
      success: true,
      available: isAvailable,
      currentProvider,
      currentModel: models[currentProvider] || "default",
      preferredProvider,
      providers: {
        zai: {
          available: status.zai?.available || false,
          error: status.zai?.error,
          model: status.zai?.model,
        },
        local: {
          available: status.local?.available || false,
          error: status.local?.error,
          model: status.local?.model,
        },
        api: {
          available: status.api?.available || false,
          error: status.api?.error,
          model: status.api?.model,
        },
      },
      // Выбранный провайдер для использования
      activeProvider: currentProvider,
      activeModel: models[currentProvider] || "default",
      // Сохраненный endpoint
      savedEndpoint,
    });
  } catch (error) {
    console.error("LLM status API error:", error);
    return NextResponse.json({
      success: true, // Возвращаем success=true чтобы не ломать UI
      available: false,
      currentProvider: "z-ai",
      currentModel: "default",
      preferredProvider: null,
      providers: defaultProviders,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - установка предпочтительного провайдера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || !["z-ai", "local", "api"].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider. Must be: z-ai, local, or api" },
        { status: 400 }
      );
    }

    // Инициализируем LLM если ещё не сделали
    try {
      initializeLLM();
    } catch {
      // Игнорируем ошибки инициализации
    }

    // Устанавливаем предпочтительный провайдер
    setPreferredProvider(provider);

    return NextResponse.json({
      success: true,
      message: `Preferred provider set to: ${provider}`,
      preferredProvider: provider,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
