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
    try {
      await this.initialize();

      if (!this.zai) {
        throw new Error("Z-AI SDK not initialized - SDK returned null");
      }

      // Формируем сообщения для z-ai
      // Z-AI ожидает: сначала system как assistant, затем user/assistant чередование
      const formattedMessages = [];
      
      // System prompt как первое сообщение от assistant
      formattedMessages.push({
        role: "assistant" as const,
        content: systemPrompt
      });
      
      // Добавляем историю сообщений
      for (const msg of messages) {
        formattedMessages.push({
          role: msg.role === "system" ? "assistant" as const : msg.role,
          content: msg.content
        });
      }

      const completion = await this.zai.chat.completions.create({
        messages: formattedMessages,
        thinking: { type: "disabled" },
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error("Z-AI returned empty response - no choices in completion");
      }

      const content = completion.choices[0]?.message?.content || "";

      if (!content) {
        throw new Error("Z-AI returned empty content in response");
      }

      return {
        content,
        provider: "z-ai",
        model: completion.model,
      };
    } catch (error) {
      // Добавляем контекст к ошибке
      const errorMessage = error instanceof Error ? error.message : "Unknown Z-AI error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      throw new Error(`Z-AI Provider Error: ${errorMessage}\nStack: ${errorStack || "N/A"}`);
    }
  }

  async isAvailable(): Promise<LLMAvailability> {
    try {
      await this.initialize();
      
      if (!this.zai) {
        return {
          available: false,
          provider: "z-ai",
          error: "SDK not initialized",
        };
      }
      
      // Простой тестовый запрос с правильным форматом
      const testCompletion = await this.zai.chat.completions.create({
        messages: [
          { role: "user", content: "test" }
        ],
        thinking: { type: "disabled" },
      });
      return {
        available: !!testCompletion.choices[0]?.message?.content,
        provider: "z-ai",
        model: testCompletion.model,
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
  private cachedModel: string | null = null;
  private availableModels: string[] = [];

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Получить список доступных моделей от Ollama Desktop
   * API: GET http://localhost:11434/api/tags
   */
  async getAvailableModels(): Promise<string[]> {
    const endpoint = this.config.localEndpoint || "http://localhost:11434";
    
    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        // Ollama возвращает { models: [{ name: "llama3:latest", ... }, ...] }
        this.availableModels = (data.models || []).map((m: { name: string }) => m.name);
        return this.availableModels;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Получить текущую активную модель из Ollama Desktop
   * Если модель задана в конфиге и она доступна - используем её
   * Иначе берём первую доступную из списка
   */
  async getActiveModel(): Promise<string> {
    // Если уже кэшировали модель - возвращаем
    if (this.cachedModel) {
      return this.cachedModel;
    }

    // Получаем список доступных моделей
    const models = await this.getAvailableModels();
    
    // Если задана модель в конфиге и она существует
    const configModel = this.config.localModel;
    if (configModel) {
      // Проверяем точное совпадение или совпадение без тега
      const exactMatch = models.find(m => m === configModel);
      const partialMatch = models.find(m => m.startsWith(configModel + ":") || m.startsWith(configModel + "-"));
      
      if (exactMatch || partialMatch) {
        this.cachedModel = exactMatch || partialMatch;
        return this.cachedModel!;
      }
    }

    // Берём первую доступную модель
    if (models.length > 0) {
      this.cachedModel = models[0];
      return this.cachedModel!;
    }

    // Fallback - дефолтная модель
    return configModel || "llama3.1:8b";
  }

  async generate(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const endpoint = this.config.localEndpoint || "http://localhost:11434";
    
    // Получаем активную модель от Ollama Desktop
    const model = await this.getActiveModel();

    try {
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
            num_ctx: 16384, // Контекст 16K для длинных повествований
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unable to read response body");
        throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}. Body: ${errorBody}`);
      }

      const data = await response.json();
      const content = data.message?.content || "";

      if (!content) {
        throw new Error("Ollama returned empty content. Response: " + JSON.stringify(data));
      }

      return {
        content,
        provider: "local",
        model,
      };
    } catch (error) {
      // Проверяем, это сетевая ошибка
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`Ollama Connection Error: Cannot connect to ${endpoint}. Make sure Ollama is running. Original: ${error.message}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : "Unknown Ollama error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      throw new Error(`Ollama Provider Error (${endpoint}/${model}): ${errorMessage}\nStack: ${errorStack || "N/A"}`);
    }
  }

  async isAvailable(): Promise<LLMAvailability> {
    try {
      const endpoint = this.config.localEndpoint || "http://localhost:11434";
      
      // Получаем список моделей
      const models = await this.getAvailableModels();
      
      if (models.length > 0) {
        // Определяем активную модель
        const activeModel = await this.getActiveModel();
        return {
          available: true,
          provider: "local",
          model: activeModel,
        };
      }

      // Проверяем доступность сервера даже без моделей
      const response = await fetch(`${endpoint}/api/version`, {
        method: "GET",
      });

      if (response.ok) {
        return {
          available: false,
          provider: "local",
          error: "Ollama работает, но нет загруженных моделей. Запустите: ollama pull llama3",
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

  /**
   * Сбросить кэш модели (для обновления при смене модели в Desktop)
   */
  resetModelCache(): void {
    this.cachedModel = null;
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

    if (!endpoint) {
      throw new Error("API Provider Error: API endpoint not configured. Set LLM_API_ENDPOINT environment variable.");
    }

    if (!apiKey) {
      throw new Error("API Provider Error: API key not configured. Set LLM_API_KEY environment variable.");
    }

    try {
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
        const errorBody = await response.text().catch(() => "Unable to read response body");
        throw new Error(`API HTTP ${response.status}: ${response.statusText}. Endpoint: ${endpoint}. Body: ${errorBody.substring(0, 500)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (!content) {
        throw new Error("API returned empty content. Response: " + JSON.stringify(data).substring(0, 500));
      }

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
    } catch (error) {
      // Проверяем, это сетевая ошибка
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`API Connection Error: Cannot connect to ${endpoint}. Check network and endpoint URL. Original: ${error.message}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : "Unknown API error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      throw new Error(`API Provider Error (${endpoint}/${model}): ${errorMessage}\nStack: ${errorStack || "N/A"}`);
    }
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
  private preferredProvider: LLMProviderType | null = null;

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
    // Если есть предпочтительный провайдер - проверяем его первым
    if (this.preferredProvider) {
      const provider = this.providers.get(this.preferredProvider);
      if (provider) {
        const availability = await provider.isAvailable();
        if (availability.available) {
          this.currentProvider = provider;
          return provider;
        }
      }
    }

    // Приоритет: local (Ollama) -> z-ai -> api
    // Ollama бесплатный и локальный, поэтому проверяем первым
    const priority: LLMProviderType[] = ["local", "z-ai", "api"];

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

  /**
   * Установить предпочтительный провайдер
   * Будет использоваться первым при генерации
   */
  setPreferredProvider(providerType: string): boolean {
    const validProviders: LLMProviderType[] = ["z-ai", "local", "api"];
    if (!validProviders.includes(providerType as LLMProviderType)) {
      return false;
    }
    
    this.preferredProvider = providerType as LLMProviderType;
    
    // Сразу устанавливаем как текущий если есть
    const provider = this.providers.get(this.preferredProvider);
    if (provider) {
      this.currentProvider = provider;
    }
    
    return true;
  }

  /**
   * Получить текущий предпочтительный провайдер
   */
  getPreferredProvider(): LLMProviderType | null {
    return this.preferredProvider;
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

  /**
   * Обновить конфигурацию local провайдера (Ollama)
   */
  updateLocalConfig(config: { localEndpoint?: string; localModel?: string }): void {
    const localProvider = this.providers.get("local");
    if (localProvider && localProvider instanceof LocalLLMProvider) {
      if (config.localEndpoint) {
        this.config.localEndpoint = config.localEndpoint;
      }
      if (config.localModel) {
        this.config.localModel = config.localModel;
      }
      // Пересоздаем провайдер с новой конфигурацией
      this.providers.set("local", new LocalLLMProvider(this.config));
      
      // Сбрасываем текущий провайдер если это был local
      if (this.currentProvider?.getProviderName() === "local") {
        this.currentProvider = this.providers.get("local") || null;
      }
    }
  }

  /**
   * Обновить общую конфигурацию LLM
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Пересоздаем провайдеры с новой конфигурацией
    this.providers.set("z-ai", new ZAIProvider(this.config));
    this.providers.set("local", new LocalLLMProvider(this.config));
    
    if (this.config.apiEndpoint && this.config.apiKey) {
      this.providers.set("api", new APIProvider(this.config));
    }
    
    // Сбрасываем текущий провайдер
    this.currentProvider = null;
  }
}

// Экспорт фабрики
export function createLLMManager(config: LLMConfig): LLMManager {
  return new LLMManager(config);
}
