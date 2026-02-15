# Архитектура LLM: Техники, Мульти-запросы, Контекст

## 1. Генерация техник через LLM

### Текущая система

```
technique-presets.ts → Готовые шаблоны (источник: "preset")
technique-learning.ts → Изучение (npc, scroll, insight)
qi-insight.ts → Прозрение (мгновенное получение)
```

**Новое:** Добавить `source: "created"` — техника создана через LLM

---

### Архитектура генерации

#### Промпт для LLM (технический, компактный)

```markdown
# TECHNIQUE GENERATOR

Generate a cultivation technique for Xianxia world.

## INPUT
- type: {{type}} | combat/cultivation/support/movement/sensory/healing
- element: {{element}} | fire/water/earth/air/lightning/void/neutral
- level: {{level}} | 1-9
- characterContext: {{character}}

## OUTPUT (JSON only)
{
  "name": "string (3-30 chars)",
  "description": "string (20-100 chars)",
  "type": "string",
  "element": "string",
  "rarity": "common|uncommon|rare|legendary",
  "qiCost": "number (level × 5-15)",
  "fatigueCost": { "physical": 0-5, "mental": 0-5 },
  "effects": { "damage"?: n, "healing"?: n, "duration"?: n },
  "statRequirements": { "strength"?: n, "agility"?: n },
  "statScaling": { "strength"?: 0.01-0.1 }
}

## RULES
- Higher level = stronger effects, higher cost
- Elements affect flavor: fire=damage, water=healing, etc.
- Rarity affects power ceiling
- JSON only, no markdown
```

**Размер:** ~200 токенов (vs ~800 для полного GM промпта)

---

### API Endpoint

```typescript
// POST /api/techniques/generate
interface GenerateTechniqueRequest {
  type: TechniqueType;
  element: TechniqueElement;
  level: number;
  characterContext: {
    cultivationLevel: number;
    intelligence: number;
    conductivity: number;
  };
  style?: 'balanced' | 'offensive' | 'defensive';
}

interface GenerateTechniqueResponse {
  success: boolean;
  technique?: Technique;  // С валидацией
  alternatives?: Technique[]; // 2-3 варианта
  error?: string;
}
```

---

### Валидация и баланс

```typescript
// Автоматическая коррекция LLM-результата
function balanceTechnique(raw: LLMOutput, level: number): Technique {
  // 1. Ограничение qiCost по формуле
  raw.qiCost = clamp(raw.qiCost, level * 5, level * 20);
  
  // 2. Ограничение damage/healing
  const maxEffect = level * 10 + 20;
  raw.effects.damage = clamp(raw.effects.damage, 0, maxEffect);
  raw.effects.healing = clamp(raw.effects.healing, 0, maxEffect);
  
  // 3. Проверка элемента
  if (!VALID_ELEMENTS.includes(raw.element)) {
    raw.element = 'neutral';
  }
  
  return raw;
}
```

---

### Источники генерации

| Источник | Контекст | Качество | Цена |
|----------|----------|----------|------|
| `preset` | Готовый | ★★★★★ | 0 |
| `npc` | Учитель | ★★★★☆ | средняя |
| `scroll` | Свиток | ★★★☆☆ | низкая |
| `insight` | Прозрение | ★★★★☆ | высокая (Qi) |
| `created` | LLM | ★★★☆☆ | токены |

---

## 2. Схема мульти-запроса (Big + Small LLM)

### Имеет ли смысл?

**ДА**, если:
- Высокая нагрузка (много пользователей)
- Долгие сессии (экономия критична)
- Разные типы задач (GM vs технические)

**НЕТ**, если:
- Одиночная игра (разница минимальна)
- Простой прототип (сложность не оправдана)
- Один провайдер (нет выбора моделей)

---

### Архитектура мульти-LLM

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM ORCHESTRATOR                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │   BIG LLM       │         │   SMALL LLM     │           │
│  │   (GM)          │         │   (Technical)   │           │
│  ├─────────────────┤         ├─────────────────┤           │
│  │ • Повествование │         │ • Генерация     │           │
│  │ • Диалоги       │         │ • Парсинг       │           │
│  │ • Сюжет         │         │ • Расчёты       │           │
│  │ • Контекст игры │         │ • Валидация     │           │
│  ├─────────────────┤         ├─────────────────┤           │
│  │ ~2000 токенов   │         │ ~200 токенов    │           │
│  │ высокая температура      │ низкая температура          │
│  │ creative=True   │         │ structured=True │           │
│  └─────────────────┘         └─────────────────┘           │
│           │                          │                      │
│           └──────────┬───────────────┘                      │
│                      ▼                                      │
│           ┌─────────────────┐                              │
│           │  RESPONSE       │                              │
│           │  MERGER         │                              │
│           └─────────────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Примеры задач

| Задача | LLM | Токены | Почему |
|--------|-----|--------|--------|
| Повествование боя | BIG | 1500 | Творчество, контекст |
| Генерация техники | SMALL | 200 | Структура, правила |
| Диалог с NPC | BIG | 800 | Характер, эмоции |
| Парсинг действия | SMALL | 100 | Простая логика |
| Описание локации | BIG | 600 | Атмосфера |
| Проверка правил | SMALL | 150 | Факты, формулы |

---

### Координация запросов

```typescript
class LLMOrchestrator {
  private bigLLM: LLMProvider;    // z-ai, GPT-4
  private smallLLM: LLMProvider;  // local, GPT-3.5
  
  async processGameTurn(input: string, context: GameContext): Promise<GameResponse> {
    // 1. Быстрый анализ (SMALL) - что хочет игрок?
    const intent = await this.smallLLM.generate(
      INTENT_PROMPT,  // ~50 токенов
      [{ role: 'user', content: input }],
      { temperature: 0.2, maxTokens: 50 }
    );
    
    // 2. Если нужен технический контент - SMALL
    if (intent.needsGeneration) {
      const generated = await this.smallLLM.generate(
        TECHNIQUE_PROMPT,  // ~200 токенов
        [{ role: 'user', content: intent.params }]
      );
      context.addGeneratedContent(generated);
    }
    
    // 3. Основное повествование - BIG
    const narrative = await this.bigLLM.generate(
      this.buildGMSystemPrompt(context),  // ~1500 токенов
      context.history,
      { temperature: 0.8, maxTokens: 1000 }
    );
    
    return this.merge(narrative, generated);
  }
}
```

---

### Экономия токенов (расчёт)

**Сценарий:** 1 час игры = ~20 запросов

| Подход | BIG запросы | SMALL запросы | Токены |
|--------|-------------|---------------|--------|
| Только BIG | 20 × 1500 | 0 | 30,000 |
| Мульти-LLM | 15 × 1500 | 5 × 200 | 23,500 |
| **Экономия** | | | **22%** |

**При кэшировании system prompt:**
- BIG: 1 × 1500 + 14 × 300 = 5700
- SMALL: 5 × 200 = 1000
- **Итого:** 6,700 токенов (78% экономия!)

---

### Риски мульти-LLM

1. **Задержка** — 2 последовательных запроса медленнее
2. **Рассинхрон** — SMALL может противоречить BIG
3. **Сложность** — больше кода, больше багов

**Решение:** Параллельные запросы + контракты данных

```typescript
// Параллельное выполнение
const [narrative, technique] = await Promise.all([
  bigLLM.generate(GM_PROMPT, history),
  needsTechnique ? smallLLM.generate(TECH_PROMPT, params) : null,
]);
```

---

## 3. Как работает контекст LLM

### Cloud LLM (OpenAI, Anthropic, Z-AI)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD LLM SESSION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request 1:                                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ system: "Ты GM в мире культивации..."             │       │
│  │ user: "Осмотреться"                               │       │
│  └──────────────────────────────────────────────────┘       │
│                         ↓                                    │
│  Response 1: "Ты находишься в бамбуковой роще..."            │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  Request 2:                                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ system: "Ты GM в мире культивации..."             │       │
│  │ user: "Осмотреться"                               │       │
│  │ assistant: "Ты находишься в бамбуковой роще..."   │ ← КОНТЕКСТ СОХРАНЁН
│  │ user: "Идти на север"                             │       │
│  └──────────────────────────────────────────────────┘       │
│                         ↓                                    │
│  Response 2: "Продвигаясь на север, ты видишь..."            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

✅ КОНТЕКСТ: Сохраняется НА КЛИЕНТЕ, отправляется с каждым запросом
✅ ПАМЯТЬ: Ограничена токенами (обычно 4K-128K)
✅ СТОИМОСТЬ: Платим за ВСЕ токены в каждом запросе
```

---

### Local LLM (Ollama)

```
┌─────────────────────────────────────────────────────────────┐
│                    OLLAMA SESSION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request 1:                                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ POST /api/generate                                 │       │
│  │ { "model": "llama3", "prompt": "Осмотреться" }    │       │
│  └──────────────────────────────────────────────────┘       │
│                         ↓                                    │
│  Response 1: "Ты находишься в бамбуковой роще..."            │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  Request 2:                                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ POST /api/generate                                 │       │
│  │ { "model": "llama3", "prompt": "Идти на север" }  │ ← НЕТ КОНТЕКСТА!
│  └──────────────────────────────────────────────────┘       │
│                         ↓                                    │
│  Response 2: "Я не понимаю контекста. Кто ты? Где ты?"       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

❌ КОНТЕКСТ: НЕ сохраняется между запросами
❌ ПАМЯТЬ: Каждый запрос = чистый лист
✅ СТОИМОСТЬ: Бесплатно (локально)
```

---

### Решение для Ollama

**Вариант 1: Ручная передача истории**

```typescript
// Каждый запрос должен включать ВСЮ историю
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: 'Осмотреться' },
  { role: 'assistant', content: 'Ты находишься в роще...' },
  { role: 'user', content: 'Идти на север' },  // ← Новый запрос
];

const response = await ollama.chat({ model: 'llama3', messages });
```

**Вариант 2: Ollama Keep-Alive**

```typescript
// Ollama держит модель в памяти N минут
POST /api/generate
{
  "model": "llama3",
  "prompt": "...",
  "keep_alive": "10m"  // Держать в памяти 10 минут
}
```

⚠️ **Keep-alive ≠ контекст!** Модель остаётся в RAM, но контекст всё равно нужно передавать.

---

### Сравнение подходов

| Аспект | Cloud | Ollama (stateless) | Ollama (keep-alive) |
|--------|-------|-------------------|---------------------|
| Контекст | ✅ На клиенте | ❌ Нет | ❌ Нет |
| Память | ✅ API | ❌ Ручная | ❌ Ручная |
| Скорость | 🌐 Сеть | ⚡ Локально | ⚡⚡ Кэш модели |
| Стоимость | 💰 За токены | 🆓 Бесплатно | 🆓 Бесплатно |
| RAM | ☁️ Облако | 💻 ~4-16 GB | 💻 ~4-16 GB |

---

### Оптимальная стратегия контекста

```typescript
class ContextManager {
  private history: Message[] = [];
  private maxMessages = 50;  // Лимит истории
  
  // Сжатие старых сообщений
  compressHistory(): void {
    if (this.history.length > this.maxMessages) {
      // Заменяем старые сообщения на summary
      const oldMessages = this.history.slice(0, -10);
      const summary = this.generateSummary(oldMessages);
      
      this.history = [
        { role: 'system', content: summary },
        ...this.history.slice(-10),
      ];
    }
  }
  
  // Summary через LLM (периодически)
  async generateSummary(messages: Message[]): Promise<string> {
    const prompt = `Сжато опиши события:
    ${messages.map(m => m.content).join('\n')}
    
    Важно: имена, локации, ключевые решения.`;
    
    return await smallLLM.generate(prompt);  // ~100 токенов
  }
}
```

---

## Итоговые рекомендации

### Что реализовать в первую очередь?

1. **Вынос промптов в .md файлы** (Фаза 1 из прошлого документа)
   - Легко реализуется
   - Даёт ~30% экономии
   - Улучшает поддерживаемость

2. **Кэширование system prompt**
   - 50% экономия на повторных запросах
   - Требует хранения состояния сессии

3. **Генерация техник через SMALL LLM**
   - Отдельный endpoint
   - Валидация результата
   - Не критично для MVP

### Когда мульти-LLM оправдана?

| Условие | Оправдано? |
|---------|------------|
| Одиночная игра | ❌ Нет |
| Прототип / MVP | ❌ Нет |
| Production (10+ юзеров) | ✅ Да |
| Долгие сессии (1ч+) | ✅ Да |
| Локальный Ollama | ⚠️ Частично |

### Контекст: что помнить

1. **Cloud LLM** — контекст на клиенте, платим за все токены
2. **Ollama** — stateless, историю передаём вручную
3. **Keep-alive** — не даёт контекст, только кэш модели в RAM
