# Архитектура системы промптов

## Цели
1. **Экономия токенов** - до 50-70% reduction
2. **Разделение кода и контента** - редактирование без пересборки
3. **Переиспользование** - общие секции кэшируются
4. **Гибкость** - разные промпты для разных сценариев

---

## Текущие проблемы

```
src/data/prompts/game-master.ts (230 строк)
├── BASE_PROMPT (статика) ❌ смешан с кодом
├── WORLD_RULES_SECTION (полустатика) ❌ нельзя редактировать отдельно
├── CULTIVATION_SECTION (динамика) ✅ правильно генерируется
├── COMMANDS_SECTION (статика) ❌ смешан с кодом
└── OUTPUT_FORMAT (статика) ❌ смешан с кодом
```

**Результат:** ~3000+ токенов отправляются при каждом запросе!

---

## Предлагаемая архитектура

### 1. Структура файлов

```
src/prompts/
├── templates/                    # Шаблоны промптов (.md файлы)
│   ├── system/
│   │   ├── base.md              # Базовый системный промпт
│   │   ├── world-rules.md       # Правила мира
│   │   ├── commands.md          # Описание команд
│   │   └── output-format.md     # Формат ответа
│   ├── scenarios/
│   │   ├── sect-start.md        # Старт в секте
│   │   ├── random-start.md      # Случайный старт
│   │   └── custom-start.md      # Кастомный старт
│   └── injections/
│       ├── cultivation-levels.md # Уровни культивации
│       ├── character-state.md   # Текущее состояние персонажа
│       └── location-context.md  # Контекст локации
│
├── loader.ts                     # Загрузчик шаблонов
├── builder.ts                    # Сборщик промптов
├── optimizer.ts                  # Оптимизация токенов
└── cache.ts                      # Кэширование
```

### 2. Формат шаблонов

**Пример: `templates/system/base.md`**
```markdown
# ROLE: Game Master

Ты — Рассказчик в мире культивации.

## РОЛИ
1. **РАССКАЗЧИК** — живой мир, атмосфера, диалоги
2. **СИМУЛЯТОР** — правила мира, расчёты Ци
3. **НАБЛЮДАТЕЛЬ** — НЕ управляешь ГГ

## СТИЛЬ
- Причинно-следственная связь
- Нет "брони мира"
- Контент 18+ разрешён
```

**Пример: `templates/system/output-format.md`**
```markdown
# OUTPUT FORMAT

```json
{
  "type": "narration",
  "content": "обязательно",
  "qiDelta": {"qiChange": 0, "reason": "причина"},
  "fatigueDelta": {"physical": 0, "mental": 0},
  "timeAdvance": {"minutes": 0}
}
```

**ПРАВИЛА:**
- content ОБЯЗАТЕЛЬНО
- qiChange — ИЗМЕНЕНИЕ, не абсолют
- isBreakthrough только при прорыве
```

### 3. Система плейсхолдеров

**Шаблон с плейсхолдерами:**
```markdown
# CHARACTER CONTEXT

Имя: {{character.name}}
Уровень: {{character.cultivationLevel}}.{{character.cultivationSubLevel}}
Ци: {{character.currentQi}}/{{character.coreCapacity}}
Локация: {{location.name}}
```

**Динамическая подстановка:**
```typescript
const context = PromptBuilder.inject('character-state', {
  character: currentCharacter,
  location: currentLocation,
});
```

### 4. Оптимизация токенов

#### Стратегия 1: Сжатие секций
```typescript
// До: ~500 токенов
"Уровень 1: Закалка тела
- Плотность Ци: 1 ед/см³
- Описание: Обычный человек..."

// После: ~100 токенов
"L1:Закалка|Qi:1|Desc:Обычный человек
L2:Конденсация|Qi:2|Desc:Первое ядро..."
```

#### Стратегия 2: Кэширование system prompt
```typescript
// System prompt отправляется ОДИН раз при создании сессии
// В последующих запросах только context injection

// Запрос 1:
messages: [
  { role: 'system', content: FULL_PROMPT },  // ~3000 токенов
  { role: 'user', content: "Осмотреться" }
]

// Запрос 2:
messages: [
  // system НЕ отправляется повторно!
  { role: 'user', content: "Идти на север" }
]
```

#### Стратегия 3: lazy loading секций
```typescript
// Полный промпт только для старта
// Для продолжения - только изменения

if (isNewSession) {
  return buildFullPrompt();
} else {
  return buildMinimalPrompt({
    changedState: getChangedState(),
    recentEvents: getLastEvents(3),
  });
}
```

### 5. API

```typescript
// Загрузка шаблона
const template = PromptLoader.load('system/base');

// Сборка промпта
const prompt = PromptBuilder.build({
  template: 'game-master',
  sections: ['base', 'world-rules', 'commands', 'output-format'],
  injections: {
    cultivation: buildCultivationSection(),
    character: characterData,
  },
});

// Оптимизация
const optimized = PromptOptimizer.compress(prompt, {
  removeComments: true,
  compactJson: true,
  abbreviate: ['cultivationLevel', 'coreCapacity'],
});

// Кэширование
const cached = PromptCache.getOrSet('game-master-v1', () => 
  PromptBuilder.buildFull('game-master')
);
```

### 6. Экономия токенов (оценка)

| Секция | До | После | Экономия |
|--------|-----|-------|----------|
| Base prompt | 500 | 300 | 40% |
| World rules | 400 | 200 | 50% |
| Cultivation levels | 800 | 300 | 62% |
| Commands | 300 | 150 | 50% |
| Output format | 400 | 200 | 50% |
| **Итого** | **2400** | **1150** | **52%** |

+ **Кэширование system prompt** = ещё -50% на последующих запросах

---

## Этапы реализации

### Фаза 1: Разделение (2-3 часа)
- [ ] Создать структуру папок
- [ ] Вынести статику в .md файлы
- [ ] Реализовать PromptLoader

### Фаза 2: Сборщик (2-3 часа)
- [ ] Реализовать PromptBuilder
- [ ] Добавить плейсхолдеры
- [ ] Тесты сборки

### Фаза 3: Оптимизация (3-4 часа)
- [ ] Реализовать PromptOptimizer
- [ ] Сжатие секций
- [ ] Lazy loading

### Фаза 4: Кэширование (2-3 часа)
- [ ] Реализовать PromptCache
- [ ] Интеграция с LLM
- [ ] Статистика токенов

---

## Дополнительные идеи

### 1. Версионирование промптов
```
/prompts/v1/system/base.md
/prompts/v2/system/base.md  ← можно A/B тестировать
```

### 2. Горячая перезагрузка
```typescript
// В development режиме
if (process.env.NODE_ENV === 'development') {
  PromptLoader.watch();
}
```

### 3. Метрики
```typescript
// Сбор статистики использования токенов
PromptMetrics.track({
  template: 'game-master',
  tokensUsed: 1200,
  tokensSaved: 1800,
  cacheHit: true,
});
```

### 4. Конструктор промптов (UI)
```
/admin/prompts → редактор промптов с preview
```

---

## Решение: что реализовать сейчас?

**Рекомендация:** Начать с Фазы 1 + Фазы 2 (разделение + сборщик)

Это даст:
- ✅ Разделение кода и контента
- ✅ Возможность редактирования без пересборки
- ✅ Базовую экономию токенов (~30%)

Остальное можно добавить позже.
