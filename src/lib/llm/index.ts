// Экспорт LLM модуля

export * from "./types";
export * from "./providers";

import { LLMManager, createLLMManager } from "./providers";
import type { LLMConfig, LLMMessage, LLMResponse, GameResponse } from "./types";
import { parseCommand } from "./types";

// Синглтон менеджера
let llmManager: LLMManager | null = null;

// Инициализация LLM менеджера
export function initializeLLM(config?: Partial<LLMConfig>): LLMManager {
  const defaultConfig: LLMConfig = {
    provider: "z-ai",
    temperature: 0.8,
    maxTokens: 2000,
    ...config,
  };

  llmManager = createLLMManager(defaultConfig);
  return llmManager;
}

// Получение LLM менеджера
export function getLLMManager(): LLMManager {
  if (!llmManager) {
    return initializeLLM();
  }
  return llmManager;
}

// Проверка готовности LLM
export function isLLMReady(): boolean {
  return llmManager !== null;
}

// Установка предпочтительного провайдера
export function setPreferredProvider(provider: string): void {
  const manager = getLLMManager();
  manager.setPreferredProvider(provider);
}

// Утилита для генерации ответа игры
export async function generateGameResponse(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: LLMMessage[] = []
): Promise<GameResponse> {
  const manager = getLLMManager();

  // Парсим команду
  const parsedCommand = parseCommand(userMessage);

  // Добавляем информацию о команде в промпт если нужно
  let enhancedSystemPrompt = systemPrompt;

  if (parsedCommand.type === "strict") {
    enhancedSystemPrompt += `\n\n=== СТРОГИЙ РЕЖИМ ===\nОтключи повествование. Верни только запрошенную информацию в сжатом формате.`;
  } else if (parsedCommand.type === "verify") {
    enhancedSystemPrompt += `\n\n=== РЕЖИМ ПРОВЕРКИ ===\nПроверь предыдущий результат по всем правилам мира. Сообщи о найденных противоречиях.`;
  }

  // Формируем сообщения
  const messages: LLMMessage[] = [
    ...conversationHistory,
    { role: "user", content: parsedCommand.content },
  ];

  // Генерируем ответ
  const response = await manager.generate(enhancedSystemPrompt, messages);

  // Пытаемся распарсить JSON ответ
  try {
    // Ищем JSON в ответе
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || "narration",
        content: parsed.content || response.content,
        stateUpdate: parsed.stateUpdate,
        timeAdvance: parsed.timeAdvance,
      };
    }
  } catch {
    // Если не JSON, возвращаем как narration
  }

  return {
    type: "narration",
    content: response.content,
  };
}

// Проверка доступности провайдеров
export async function checkLLMStatus(): Promise<Record<string, { available: boolean; error?: string; model?: string }>> {
  const manager = getLLMManager();
  const status = await manager.checkAllProviders();

  return {
    zai: { 
      available: status["z-ai"]?.available || false, 
      error: status["z-ai"]?.error,
      model: status["z-ai"]?.model,
    },
    local: { 
      available: status["local"]?.available || false, 
      error: status["local"]?.error,
      model: status["local"]?.model,
    },
    api: { 
      available: status["api"]?.available || false, 
      error: status["api"]?.error,
      model: status["api"]?.model,
    },
  };
}
