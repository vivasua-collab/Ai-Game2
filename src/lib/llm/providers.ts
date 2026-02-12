// LLM Provider Interface и реализации

import ZAI from "z-ai-web-dev-sdk";
import type { LLMConfig, LLMMessage, LLMResponse, LLMAvailability, LLMProvider as LLMProviderType } from "./types";

// Интерфейс провайдера
export interface ILLMProvider {
  generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse>;
  isAvailable(): Promise<LLMAvailability>;
  getProviderName(): LLMProviderType;
}

// ==================== Z-AI Provider ====================
export class ZAIProvider implements ILLMProvider {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private async initialize(): Promise<void> {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  async generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    await this.initialize();

    // Формируем сообщения для z-ai (system prompt идёт как assistant)
    const formattedMessages = [
      { role: "assistant" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "system" ? ("assistant" as const) : m.role,
        content: m.content,
      })),
    ];

    const completion = await this.zai!.chat.completions.create({
      messages: formattedMessages,
      thinking: { type: "disabled" },
    });

    const content = completion.choices[0]?.message?.content || "";

    return {
      content,
      provider: "z-ai",
      model: completion.model,
    };
  }

  async isAvailable(): Promise<LLMAvailability> {
    try {
      await this.initialize();
      // Простой тестовый запрос
      const testCompletion = await this.zai!.chat.completions.create({
        messages: [{ role: "assistant", content: "test" }],
        thinking: { type: "disabled" },
      });
      return {
        available: !!testCompletion.choices[0]?.message?.content,
        provider: "z-ai",
      };
    } catch (error) {
      return {
        available: false,
        provider: "z-ai",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getProviderName(): LLMProviderType {
    return "z-ai";
  }
}

// ==================== Local LLM Provider (Ollama) ====================
export class LocalLLMProvider implements ILLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const endpoint = this.config.localEndpoint || "http://localhost:11434";
    const model = this.config.localModel || "llama3.1:8b";

    // Формируем сообщения для Ollama
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.8,
          num_predict: this.config.maxTokens || 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.message?.content || "";

    return {
      content,
      provider: "local",
      model,
    };
  }

  async isAvailable(): Promise<LLMAvailability> {
    try {
      const endpoint = this.config.localEndpoint || "http://localhost:11434";
      const response = await fetch(`${endpoint}/api/tags`, {
        method: "GET",
      });

      if (response.ok) {
        return {
          available: true,
          provider: "local",
          model: this.config.localModel || "llama3.1:8b",
        };
      }

      return {
        available: false,
        provider: "local",
        error: "Ollama server not responding",
      };
    } catch (error) {
      return {
        available: false,
        provider: "local",
        error: error instanceof Error ? error.message : "Cannot connect to Ollama",
      };
    }
  }

  getProviderName(): LLMProviderType {
    return "local";
  }
}

// ==================== External API Provider ====================
export class APIProvider implements ILLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const endpoint = this.config.apiEndpoint;
    const apiKey = this.config.apiKey;
    const model = this.config.apiModel || "gpt-4";

    if (!endpoint || !apiKey) {
      throw new Error("API endpoint and key are required");
    }

    // Формируем сообщения в OpenAI-совместимом формате
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: this.config.temperature || 0.8,
        max_tokens: this.config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return {
      content,
      provider: "api",
      model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async isAvailable(): Promise<LLMAvailability> {
    if (!this.config.apiEndpoint || !this.config.apiKey) {
      return {
        available: false,
        provider: "api",
        error: "API endpoint or key not configured",
      };
    }

    // Для API считаем доступным если конфигурация задана
    return {
      available: true,
      provider: "api",
      model: this.config.apiModel || "gpt-4",
    };
  }

  getProviderName(): LLMProviderType {
    return "api";
  }
}

// ==================== LLM Manager ====================
export class LLMManager {
  private providers: Map<LLMProviderType, ILLMProvider> = new Map();
  private config: LLMConfig;
  private currentProvider: ILLMProvider | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Всегда регистрируем z-ai провайдер
    this.providers.set("z-ai", new ZAIProvider(this.config));

    // Регистрируем local провайдер
    this.providers.set("local", new LocalLLMProvider(this.config));

    // Регистрируем API провайдер если есть конфигурация
    if (this.config.apiEndpoint && this.config.apiKey) {
      this.providers.set("api", new APIProvider(this.config));
    }
  }

  async getAvailableProvider(): Promise<ILLMProvider | null> {
    // Приоритет: z-ai -> local -> api
    const priority: LLMProviderType[] = ["z-ai", "local", "api"];

    for (const providerType of priority) {
      const provider = this.providers.get(providerType);
      if (provider) {
        const availability = await provider.isAvailable();
        if (availability.available) {
          this.currentProvider = provider;
          return provider;
        }
      }
    }

    return null;
  }

  setProvider(providerType: LLMProviderType): boolean {
    const provider = this.providers.get(providerType);
    if (provider) {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }

  async generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    // Используем текущий провайдер или ищем доступный
    let provider = this.currentProvider;

    if (!provider) {
      provider = await this.getAvailableProvider();
    }

    if (!provider) {
      throw new Error("No LLM provider available");
    }

    return provider.generate(systemPrompt, messages);
  }

  async checkAllProviders(): Promise<Record<LLMProviderType, LLMAvailability>> {
    const results: Record<string, LLMAvailability> = {};

    for (const [type, provider] of this.providers) {
      results[type] = await provider.isAvailable();
    }

    return results as Record<LLMProviderType, LLMAvailability>;
  }
}

// Экспорт фабрики
export function createLLMManager(config: LLMConfig): LLMManager {
  return new LLMManager(config);
}
