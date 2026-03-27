/**
 * ============================================================================
 * AI POLLING CLIENT - HTTP-only клиент для серверного AI
 * ============================================================================
 *
 * Архитектура: "Божество → Облако → Земля"
 *
 * 👁️ БОЖЕСТВО (Игрок) → управляет аватаром
 * ☁️ ОБЛАКО (Браузер) → отображает мир, передаёт волю божества через HTTP
 * 🌍 ЗЕМЛЯ (Сервер) → хранит состояние, исполняет расчёты, AI
 *
 * 1 TICK = 1 СЕКУНДА реального времени
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

// ==================== ТИПЫ ====================

export interface AIEvent {
  type: string;
  npcId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AITickResult {
  success: boolean;
  processedNPCs: number;
  tickTime: number;
  tick: number;
  stats: {
    totalNPCs: number;
    activeNPCs: number;
    totalUpdates: number;
    avgUpdateTime: number;
  };
}

export interface AIEventsResult {
  success: boolean;
  events: AIEvent[];
  tick: number;
  timestamp: number;
}

export interface AIPollingConfig {
  /** Интервал polling в мс (по умолчанию 1000мс = 1 тик) */
  tickInterval: number;
  /** Интервал polling событий в мс */
  eventsInterval: number;
  /** Включить debug логирование */
  debug: boolean;
  /** Автозапуск при создании */
  autoStart: boolean;
}

const DEFAULT_CONFIG: AIPollingConfig = {
  tickInterval: 1000, // 1 тик = 1 секунда
  eventsInterval: 100, // события чаще
  debug: true, // ВКЛЮЧЕН DEBUG для диагностики NPC
  autoStart: false,
};

// ==================== КЛАСС КЛИЕНТА ====================

/**
 * AI Polling Client
 *
 * Выполняет HTTP запросы к серверу для:
 * 1. /api/ai/tick - запуск AI обновления каждый тик
 * 2. /api/ai/events - получение событий NPC (move, attack, etc.)
 */
export class AIPollingClient {
  private sessionId: string | null = null;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private eventsIntervalId: ReturnType<typeof setInterval> | null = null;
  private config: AIPollingConfig;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private eventHandlers: Map<string, Set<(event: AIEvent) => void>> = new Map();
  
  // === Позиция игрока для AI ===
  private lastPlayerPosition: { x: number; y: number } | null = null;

  constructor(config: Partial<AIPollingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (typeof window !== 'undefined') {
      // Слушаем события от NPCSprite для синхронизации
      window.addEventListener('ai:player-position', this.handlePlayerPosition.bind(this) as EventListener);
    }
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Инициализировать клиент с sessionId
   */
  initialize(sessionId: string): void {
    this.sessionId = sessionId;
    this.log('[AIPollingClient] Initialized with sessionId:', sessionId);

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Запустить polling
   */
  start(): void {
    if (this.isRunning) {
      this.log('[AIPollingClient] Already running');
      return;
    }

    if (!this.sessionId) {
      console.error('[AIPollingClient] Cannot start: no sessionId');
      return;
    }

    this.isRunning = true;
    this.log('[AIPollingClient] Starting polling...');

    // Запускаем tick loop (1 раз в секунду)
    this.tickIntervalId = setInterval(() => {
      this.performTick();
    }, this.config.tickInterval);

    // Запускаем events polling (чаще)
    this.eventsIntervalId = setInterval(() => {
      this.pollEvents();
    }, this.config.eventsInterval);

    // Сразу выполняем первый тик
    this.performTick();
  }

  /**
   * Остановить polling
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.log('[AIPollingClient] Stopping polling...');

    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }

    if (this.eventsIntervalId) {
      clearInterval(this.eventsIntervalId);
      this.eventsIntervalId = null;
    }
  }

  /**
   * Подписаться на события AI
   */
  on(eventType: string, handler: (event: AIEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    // Возвращаем функцию отписки
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Отписаться от всех событий
   */
  off(eventType: string, handler: (event: AIEvent) => void): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Получить текущий тик
   */
  getLastTick(): number {
    return this.lastTick;
  }

  /**
   * Проверить, запущен ли клиент
   */
  isActive(): boolean {
    return this.isRunning;
  }
  
  /**
   * Обновить позицию игрока (для AI)
   * 
   * ВАЖНО: Вызывать каждый кадр или при движении игрока!
   */
  updatePlayerPosition(x: number, y: number): void {
    this.lastPlayerPosition = { x, y };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Выполнить AI тик на сервере
   */
  private async performTick(): Promise<void> {
    if (!this.sessionId) return;

    try {
      // Собираем данные для тика (включая позицию игрока если есть)
      const body: Record<string, unknown> = {
        sessionId: this.sessionId,
        deltaMs: this.config.tickInterval,
      };
      
      // Если есть сохранённая позиция игрока - отправляем её
      if (this.lastPlayerPosition) {
        body.playerX = this.lastPlayerPosition.x;
        body.playerY = this.lastPlayerPosition.y;
      }

      const response = await fetch('/api/ai/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error('[AIPollingClient] Tick failed:', response.status);
        return;
      }

      const result: AITickResult = await response.json();

      if (result.success) {
        this.lastTick = result.tick;
        this.log(`[AIPollingClient] Tick #${result.tick}: processed ${result.processedNPCs} NPCs in ${result.tickTime}ms`);

        // Отправляем событие для UI
        this.dispatchWindowEvent('ai:tick', result);
      }
    } catch (error) {
      console.error('[AIPollingClient] Tick error:', error);
    }
  }

  /**
   * Poll события от сервера
   */
  private async pollEvents(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const response = await fetch(`/api/ai/events?sessionId=${this.sessionId}`);

      if (!response.ok) {
        return; // Молча игнорируем ошибки polling
      }

      const result: AIEventsResult = await response.json();

      if (result.success && result.events.length > 0) {
        this.log(`[AIPollingClient] Received ${result.events.length} events`);

        for (const event of result.events) {
          this.handleEvent(event);
        }
      }
    } catch (error) {
      // Молча игнорируем ошибки polling
    }
  }

  /**
   * Обработать событие от сервера
   */
  private handleEvent(event: AIEvent): void {
    // 1. Вызываем подписчиков
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[AIPollingClient] Handler error for ${event.type}:`, err);
        }
      }
    }

    // 2. Отправляем через window для Phaser
    this.dispatchWindowEvent(event.type, event);

    // 3. Специфичная обработка для NPC actions
    switch (event.type) {
      case 'npc:action':
        this.handleNPCAction(event);
        break;
      case 'npc:update':
        this.handleNPCUpdate(event);
        break;
      case 'npc:despawn':
        this.handleNPCDespawn(event);
        break;
      case 'combat:hit':
        this.handleCombatHit(event);
        break;
    }
  }

  /**
   * Обработать npc:action событие
   */
  private handleNPCAction(event: AIEvent): void {
    const { npcId, data } = event;
    const action = data.action as { type: string; data?: Record<string, unknown> };

    if (!action) return;

    this.log(`[AIPollingClient] NPC ${npcId} action: ${action.type}`);

    // Конвертируем в формат для NPCSprite.executeServerAction
    this.dispatchWindowEvent('npc:server-action', {
      npcId,
      action,
    });
  }

  /**
   * Обработать npc:update событие
   */
  private handleNPCUpdate(event: AIEvent): void {
    const { npcId, data } = event;

    this.log(`[AIPollingClient] NPC ${npcId} update:`, data.changes);

    // Конвертируем в формат для NPCSprite.applyServerUpdate
    this.dispatchWindowEvent('npc:server-update', {
      npcId,
      changes: data.changes,
    });
  }

  /**
   * Обработать npc:despawn событие
   */
  private handleNPCDespawn(event: AIEvent): void {
    const { npcId, data } = event;

    this.log(`[AIPollingClient] NPC ${npcId} despawn:`, data.reason);

    this.dispatchWindowEvent('npc:server-despawn', {
      npcId,
      reason: data.reason,
    });
  }

  /**
   * Обработать combat:hit событие
   */
  private handleCombatHit(event: AIEvent): void {
    const { data } = event;

    this.log(`[AIPollingClient] Combat hit:`, data);

    this.dispatchWindowEvent('combat:server-hit', {
      attackerId: data.attackerId,
      targetId: data.targetId,
      damage: data.damage,
      effects: data.effects,
    });
  }

  /**
   * Обработать позицию игрока (для отправки на сервер)
   */
  private handlePlayerPosition(event: Event): void {
    const customEvent = event as CustomEvent<{ x: number; y: number }>;
    const { x, y } = customEvent.detail;

    // Отправляем позицию на сервер для AI
    this.sendPlayerPosition(x, y);
  }

  /**
   * Отправить позицию игрока на сервер
   */
  private async sendPlayerPosition(x: number, y: number): Promise<void> {
    if (!this.sessionId) return;

    try {
      await fetch('/api/ai/player-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          x,
          y,
        }),
      });
    } catch (error) {
      // Игнорируем ошибки
    }
  }

  /**
   * Отправить событие через window
   */
  private dispatchWindowEvent(type: string, data: unknown): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(type, { detail: data }));
    }
  }

  /**
   * Debug логирование
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log(...args);
    }
  }
}

// ==================== SINGLETON ====================

let clientInstance: AIPollingClient | null = null;

/**
 * Получить глобальный инстанс клиента
 */
export function getAIPollingClient(): AIPollingClient {
  if (!clientInstance) {
    clientInstance = new AIPollingClient();
  }
  return clientInstance;
}

/**
 * Инициализировать AI polling клиент
 */
export function initAIPollingClient(sessionId: string, config?: Partial<AIPollingConfig>): AIPollingClient {
  const client = getAIPollingClient();
  client.initialize(sessionId);
  return client;
}
