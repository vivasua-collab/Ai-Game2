// Типы для системы LLM

// Типы провайдеров
export type LLMProvider = "z-ai" | "local" | "api";

// Конфигурация LLM
export interface LLMConfig {
  provider: LLMProvider;

  // Local LLM (Ollama)
  localEndpoint?: string; // default: http://localhost:11434
  localModel?: string; // default: llama3.1:8b

  // External API
  apiEndpoint?: string;
  apiKey?: string;
  apiModel?: string;

  // Common
  temperature?: number;
  maxTokens?: number;
}

// Сообщение для LLM
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Ответ от LLM
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider: LLMProvider;
}

// Результат проверки доступности
export interface LLMAvailability {
  available: boolean;
  provider: LLMProvider;
  error?: string;
}

// Статус провайдеров
export interface LLMStatus {
  zai: LLMProviderStatus;
  local: LLMProviderStatus;
  api: LLMProviderStatus;
}

export interface LLMProviderStatus {
  available: boolean;
  model?: string;
  error?: string;
  lastChecked?: Date;
}

// Типы для игры
export interface GameAction {
  type: "action" | "command" | "query";
  input: string;
  command?: string; // Для команд: "!!", "--", "---", "--ПМ"
  content?: string; // Содержимое команды
}

export interface GameResponse {
  type: "narration" | "system" | "error";
  content: string;
  stateUpdate?: Partial<CharacterState>;
  timeAdvance?: TimeAdvance;
}

export interface CharacterState {
  // Характеристики
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;

  // Культивация
  cultivationLevel: number;
  cultivationSubLevel: number;
  coreCapacity: number;
  currentQi: number;
  accumulatedQi: number;

  // Физиология
  health: number;
  fatigue: number;
  age: number;
}

export interface TimeAdvance {
  minutes: number;
  hours?: number;
  days?: number;
}

// Парсинг команд
export interface ParsedCommand {
  isValid: boolean;
  type: "player" | "world" | "strict" | "verify" | "none";
  content: string;
  raw: string;
}

// Функция парсинга команд
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  // !! - команда для ГГ
  if (trimmed.startsWith("!!")) {
    return {
      isValid: true,
      type: "player",
      content: trimmed.slice(2).trim(),
      raw: trimmed,
    };
  }

  // --- - строгий режим
  if (trimmed.startsWith("---")) {
    return {
      isValid: true,
      type: "strict",
      content: trimmed.slice(3).trim(),
      raw: trimmed,
    };
  }

  // --ПМ - проверка мира
  if (trimmed.startsWith("--ПМ")) {
    return {
      isValid: true,
      type: "verify",
      content: trimmed.slice(4).trim(),
      raw: trimmed,
    };
  }

  // -- - глобальный запрос
  if (trimmed.startsWith("--")) {
    return {
      isValid: true,
      type: "world",
      content: trimmed.slice(2).trim(),
      raw: trimmed,
    };
  }

  // Обычное действие
  return {
    isValid: true,
    type: "none",
    content: trimmed,
    raw: trimmed,
  };
}

// Дефолтная конфигурация
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "z-ai",
  temperature: 0.8,
  maxTokens: 2000,
};
