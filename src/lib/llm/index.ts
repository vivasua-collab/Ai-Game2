// Экспорт LLM модуля

export * from "./types";
export * from "./providers";

import { LLMManager, createLLMManager, LocalLLMProvider } from "./providers";
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

// Обновление конфигурации Ollama endpoint
export function updateOllamaEndpoint(endpoint: string): void {
  const manager = getLLMManager();
  manager.updateLocalConfig({ localEndpoint: endpoint });
}

// Обновление конфигурации LLM
export function updateLLMConfig(config: Partial<LLMConfig>): void {
  const manager = getLLMManager();
  manager.updateConfig(config);
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
      
      // Если есть поле content - используем его
      if (parsed.content && typeof parsed.content === "string") {
        // Обрабатываем qiDelta (новый формат)
        let qiDelta = undefined;
        if (parsed.qiDelta && typeof parsed.qiDelta === "object") {
          const d = parsed.qiDelta as Record<string, unknown>;
          qiDelta = {
            qiChange: typeof d.qiChange === "number" ? d.qiChange : 0,
            reason: typeof d.reason === "string" ? d.reason : "Действие",
            isBreakthrough: Boolean(d.isBreakthrough),
          };
        }
        
        // Обрабатываем fatigueDelta
        let fatigueDelta = undefined;
        if (parsed.fatigueDelta && typeof parsed.fatigueDelta === "object") {
          const f = parsed.fatigueDelta as Record<string, unknown>;
          fatigueDelta = {
            physical: typeof f.physical === "number" ? f.physical : 0,
            mental: typeof f.mental === "number" ? f.mental : 0,
          };
        }
        
        // Обрабатываем timeAdvance
        let timeAdvance = undefined;
        if (parsed.timeAdvance && typeof parsed.timeAdvance === "object") {
          const t = parsed.timeAdvance as Record<string, unknown>;
          timeAdvance = {
            minutes: typeof t.minutes === "number" ? t.minutes : 0,
            hours: typeof t.hours === "number" ? t.hours : undefined,
            days: typeof t.days === "number" ? t.days : undefined,
          };
        }
        
        return {
          type: parsed.type || "narration",
          content: parsed.content,
          qiDelta,
          fatigueDelta,
          timeAdvance,
          stateUpdate: parsed.stateUpdate, // Для совместимости
        };
      }
      
      // Если JSON без content, но с данными локации - форматируем текст
      if (parsed.location) {
        const loc = parsed.location as Record<string, unknown>;
        const locationText = `📍 **${loc.name || "Неизвестная местность"}**

Тип местности: ${loc.terrainType || "неизвестен"}
Плотность Ци: ${loc.qiDensity || "неизвестна"} ед/м³
${loc.distanceFromCenter ? `Расстояние от центра мира: ${loc.distanceFromCenter} км` : ""}

Ты оглядываешься вокруг, пытаясь понять, где находишься...`;
        return {
          type: "narration",
          content: locationText,
          qiDelta: { qiChange: 0, reason: "Нет изменений" },
        };
      }
      
      // Если JSON без content, но с другими данными - форматируем
      if (parsed.type && !parsed.content) {
        // Преобразуем JSON в читаемый текст
        const formattedContent = Object.entries(parsed)
          .filter(([key]) => key !== "type" && key !== "qiDelta" && key !== "fatigueDelta" && key !== "timeAdvance")
          .map(([key, value]) => {
            if (typeof value === "object" && value !== null) {
              return `**${key}**: ${JSON.stringify(value, null, 2)}`;
            }
            return `**${key}**: ${value}`;
          })
          .join("\n");
        
        return {
          type: parsed.type || "narration",
          content: formattedContent || response.content,
          qiDelta: parsed.qiDelta,
          fatigueDelta: parsed.fatigueDelta,
          timeAdvance: parsed.timeAdvance,
        };
      }
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
