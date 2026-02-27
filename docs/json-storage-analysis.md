# 📁 Полный переход на JSON-файлы

**Версия:** 1.0  
**Создано:** 2026-02-27  
**Статус:** Архитектурное решение

---

## 📋 Постановка вопроса

Возможно ли полностью отказаться от SQLite/Prisma и использовать только JSON-файлы?

---

## 1️⃣ АНАЛИЗ ТЕКУЩИХ ДАННЫХ

### 1.1 Классификация моделей

```
ДИНАМИЧЕСКИЕ (часто меняются):
─────────────────────────────────────────────────────────
├── GameSession     — активная сессия, время, состояние
├── Character       — Ци, здоровье, усталость, позиция
├── Message         — история чата (растёт)
├── WorldEvent      — события мира
├── InventoryItem   — изменение количества, прочности
├── CharacterTechnique — мастерство, прогресс
├── TechniquePool   — временные пулы генерации
├── EncounteredEntity — встречи, отношения
├── EntityMemory    — воспоминания
├── WorldObject     — состояние объектов
└── SystemLog       — логи (растёт)

ПОЛУ-СТАТИЧЕСКИЕ (редко меняются):
─────────────────────────────────────────────────────────
├── Location        — базовые данные места
├── Sect            — секты
├── Building        — здания
├── NPC             — состояние (но не структура)
└── Technique       — каталог (пополняется редко)

СТАТИЧЕСКИЕ (практически не меняются):
─────────────────────────────────────────────────────────
├── GameSettings    — настройки игры
└── Пресеты         — техники, предметы, шаблоны
```

### 1.2 Статистика использования

```
Операция                    Частота         Требования
──────────────────────────────────────────────────────────────
Чтение персонажа            ~10/сек         Быстрый доступ
Запись персонажа (Ци/HP)    ~1/сек          Атомарность
Добавление сообщения        ~0.1/сек        Аппенд
Поиск NPC в локации         ~1/сек          Индекс
Поиск техник игрока         ~0.5/сек        Связь
Сохранение состояния        ~1/мин          Надёжность
──────────────────────────────────────────────────────────────
```

### 1.3 Связи между данными

```
GameSession
    ├── 1 Character
    ├── N Messages (history)
    ├── N WorldEvents
    ├── N NPCs
    ├── N Locations
    └── N Sects

Character
    ├── 1 Location (current)
    ├── 1 Sect (optional)
    ├── N InventoryItems
    ├── N CharacterTechniques
    └── N TechniquePools

Location
    ├── 1 Parent (optional)
    ├── N SubLocations
    ├── N Buildings
    └── N WorldObjects
```

---

## 2️⃣ СРАВНЕНИЕ ПОДХОДОВ

### 2.1 SQLite (текущий)

```
✅ ПРЕИМУЩЕСТВА:
─────────────────────────────────────────────────────────
+ ACID транзакции (атомарность, согласованность)
+ Индексы для быстрого поиска
+ Foreign keys для целостности связей
+ SQL для сложных запросов
+ Одновременный доступ (блокировки)
+ Автоматическое управление памятью
+ Готовые инструменты (Prisma ORM)
─────────────────────────────────────────────────────────

❌ НЕДОСТАТКИ:
─────────────────────────────────────────────────────────
- Накладные расходы на запросы
- Миграции при изменении схемы
- Файл БД растёт (фрагментация)
- Сложнее бэкапы (binary)
─────────────────────────────────────────────────────────

Производительность:
- SELECT по ID: ~1-5 мс
- SELECT с JOIN: ~5-20 мс
- INSERT/UPDATE: ~2-10 мс
- Память: ~20-100 MB
```

### 2.2 JSON-файлы

```
✅ ПРЕИМУЩЕСТВА:
─────────────────────────────────────────────────────────
+ Простота (читаемый формат)
+ Версионирование через Git
+ Простой бэкап (копия файлов)
+ Нет миграций (структура гибкая)
+ Быстрое чтение всего файла
+ Легко редактировать вручную
─────────────────────────────────────────────────────────

❌ НЕДОСТАТКИ:
─────────────────────────────────────────────────────────
- НЕТ транзакций (риск потери данных)
- НЕТ индексов (поиск = перебор)
- НЕТ foreign keys (целостность вручную)
- Конкурентный доступ = проблемы
- Запись = перезапись всего файла
- Рост файла = замедление
─────────────────────────────────────────────────────────

Производительность:
- Чтение файла: ~1-50 мс (зависит от размера)
- Поиск в памяти: O(n) или O(1) с Map
- Запись: ~5-100 мс (перезапись файла)
- Память: ~10-50 MB
```

---

## 3️⃣ АРХИТЕКТУРА JSON-ХРАНИЛИЩА

### 3.1 Структура директорий

```
/data/
├── sessions/
│   ├── active.json           # ID активной сессии
│   └── session_{id}/
│       ├── meta.json         # GameSession данные
│       ├── world/
│       │   ├── time.json     # Мировое время
│       │   ├── state.json    # Состояние мира
│       │   └── events.json   # История событий
│       ├── character/
│       │   ├── main.json     # Персонаж игрока
│       │   ├── inventory.json
│       │   ├── techniques.json
│       │   └── pools.json
│       ├── world_data/
│       │   ├── locations.json
│       │   ├── npcs.json
│       │   ├── sects.json
│       │   └── buildings.json
│       └── history/
│           ├── messages.json
│           └── logs.json
│
├── presets/
│   ├── techniques/
│   │   ├── index.json
│   │   └── level-{1-9}.json
│   ├── items/
│   │   ├── index.json
│   │   └── level-{1-9}.json
│   └── npc-templates.json
│
└── settings.json
```

### 3.2 Структура файлов

```json
// /data/sessions/session_{id}/character/main.json
{
  "version": "1.0",
  "id": "cm123...",
  "createdAt": "2026-02-27T10:00:00Z",
  "updatedAt": "2026-02-27T12:30:00Z",
  
  "name": "Ли Вэй",
  "cultivationLevel": 3,
  "cultivationSubLevel": 5,
  
  "stats": {
    "strength": 15.5,
    "agility": 18.2,
    "intelligence": 22.0,
    "conductivity": 1.5
  },
  
  "core": {
    "capacity": 5000,
    "quality": 2.5,
    "currentQi": 3500,
    "accumulatedQi": 12000
  },
  
  "physiology": {
    "health": 95.0,
    "fatigue": 15.5,
    "mentalFatigue": 8.0,
    "age": 18
  },
  
  "location": {
    "currentLocationId": "loc_456",
    "sectId": "sect_789",
    "sectRole": "inner_disciple"
  },
  
  "resources": {
    "contributionPoints": 150,
    "spiritStones": 500
  },
  
  "cultivation": {
    "skills": { "breath_control": 3, "meditation": 2 },
    "qiUnderstanding": 45,
    "qiUnderstandingCap": 150,
    "conductivityMeditations": 5
  }
}
```

```json
// /data/sessions/session_{id}/character/inventory.json
{
  "version": "1.0",
  "items": [
    {
      "id": "item_1",
      "presetId": "spirit_stone_medium",
      "quantity": 25,
      "durability": null,
      "customEffects": null
    },
    {
      "id": "item_2",
      "presetId": "iron_sword_l1",
      "quantity": 1,
      "durability": 85,
      "customEffects": { "damage": 12 }
    }
  ]
}
```

```json
// /data/sessions/session_{id}/character/techniques.json
{
  "version": "1.0",
  "cultivationSlot": "tech_cult_1",
  "combatSlots": [
    "tech_strike_1",
    "tech_fire_1",
    null,
    null
  ],
  "learned": [
    {
      "techniqueId": "tech_cult_1",
      "mastery": 45.5,
      "learningProgress": 100,
      "learningSource": "preset",
      "quickSlot": 0
    },
    {
      "techniqueId": "tech_strike_1",
      "mastery": 30.0,
      "learningProgress": 100,
      "learningSource": "npc",
      "quickSlot": 1
    }
  ]
}
```

---

## 4️⃣ СЕРВИС ХРАНИЛИЩА

### 4.1 Базовый класс

```typescript
// /src/lib/storage/json-storage.ts

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class JsonStorage {
  private baseDir: string;
  private cache = new Map<string, { data: any; mtime: number }>();
  private writeQueue = new Map<string, Promise<void>>();
  
  constructor(baseDir: string = './data') {
    this.baseDir = baseDir;
  }
  
  // Чтение с кэшированием
  async read<T>(relativePath: string): Promise<T | null> {
    const fullPath = path.join(this.baseDir, relativePath);
    
    // Проверка кэша
    const cached = this.cache.get(fullPath);
    if (cached) {
      try {
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs === cached.mtime) {
          return cached.data as T;
        }
      } catch {
        // Файл удалён
        this.cache.delete(fullPath);
      }
    }
    
    // Чтение файла
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Кэширование
      const stat = await fs.stat(fullPath);
      this.cache.set(fullPath, { data, mtime: stat.mtimeMs });
      
      return data as T;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  // Запись с очередью (избежание конфликтов)
  async write<T>(relativePath: string, data: T): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    
    // Ожидание предыдущей записи
    const previousWrite = this.writeQueue.get(fullPath);
    if (previousWrite) {
      await previousWrite;
    }
    
    // Создание директории
    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Запись
    const writePromise = (async () => {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, content, 'utf-8');
      
      // Обновление кэша
      const stat = await fs.stat(fullPath);
      this.cache.set(fullPath, { data, mtime: stat.mtimeMs });
    })();
    
    this.writeQueue.set(fullPath, writePromise);
    
    try {
      await writePromise;
    } finally {
      this.writeQueue.delete(fullPath);
    }
  }
  
  // Атомарное обновление (чтение-модификация-запись)
  async update<T>(
    relativePath: string,
    updater: (data: T) => T,
    defaultValue: T
  ): Promise<T> {
    const data = await this.read<T>(relativePath) ?? defaultValue;
    const updated = updater(data);
    await this.write(relativePath, updated);
    return updated;
  }
  
  // Удаление
  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.unlink(fullPath);
      this.cache.delete(fullPath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  // Список файлов в директории
  async list(dirPath: string): Promise<string[]> {
    const fullPath = path.join(this.baseDir, dirPath);
    try {
      const files = await fs.readdir(fullPath);
      return files.filter(f => f.endsWith('.json'));
    } catch {
      return [];
    }
  }
  
  // Очистка кэша
  clearCache(): void {
    this.cache.clear();
  }
}

export const storage = new JsonStorage();
```

### 4.2 Сервис сессии

```typescript
// /src/lib/storage/session-storage.ts

import { storage } from './json-storage';
import type { Character, GameSession, Location } from '@/types/game';

export class SessionStorage {
  private sessionId: string | null = null;
  
  // Загрузка сессии
  async loadSession(sessionId: string): Promise<{
    session: GameSession;
    character: Character;
  } | null> {
    this.sessionId = sessionId;
    
    const sessionMeta = await storage.read<GameSession>(
      `sessions/session_${sessionId}/meta.json`
    );
    
    if (!sessionMeta) return null;
    
    const character = await storage.read<Character>(
      `sessions/session_${sessionId}/character/main.json`
    );
    
    if (!character) return null;
    
    return { session: sessionMeta, character };
  }
  
  // Сохранение персонажа
  async saveCharacter(character: Character): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');
    
    await storage.write(
      `sessions/session_${this.sessionId}/character/main.json`,
      {
        version: '1.0',
        ...character,
        updatedAt: new Date().toISOString()
      }
    );
  }
  
  // Обновление конкретных полей персонажа
  async updateCharacter(updates: Partial<Character>): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');
    
    await storage.update<Character>(
      `sessions/session_${this.sessionId}/character/main.json`,
      (char) => ({ ...char, ...updates, updatedAt: new Date().toISOString() }),
      {} as Character
    );
  }
  
  // Получение инвентаря
  async getInventory(): Promise<InventoryItem[]> {
    if (!this.sessionId) return [];
    
    const data = await storage.read<{ items: InventoryItem[] }>(
      `sessions/session_${this.sessionId}/character/inventory.json`
    );
    
    return data?.items ?? [];
  }
  
  // Добавление сообщения
  async addMessage(message: Message): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');
    
    await storage.update<{ messages: Message[] }>(
      `sessions/session_${this.sessionId}/history/messages.json`,
      (data) => {
        data.messages.push(message);
        // Ограничение размера истории
        if (data.messages.length > 1000) {
          data.messages = data.messages.slice(-500);
        }
        return data;
      },
      { messages: [] }
    );
  }
  
  // Получение NPC в локации
  async getNpcsInLocation(locationId: string): Promise<NPC[]> {
    if (!this.sessionId) return [];
    
    const data = await storage.read<{ npcs: NPC[] }>(
      `sessions/session_${this.sessionId}/world_data/npcs.json`
    );
    
    if (!data) return [];
    
    return data.npcs.filter(npc => npc.locationId === locationId);
  }
}

export const sessionStore = new SessionStorage();
```

### 4.3 Сервис пресетов

```typescript
// /src/lib/storage/preset-storage.ts

import { storage } from './json-storage';

export class PresetStorage {
  private techniqueCache = new Map<string, PresetTechnique>();
  private itemCache = new Map<string, PresetItem>();
  private loaded = false;
  
  // Загрузка всех пресетов при старте
  async initialize(): Promise<void> {
    if (this.loaded) return;
    
    console.log('[Presets] Loading...');
    const start = Date.now();
    
    // Загрузка техник
    for (let level = 1; level <= 9; level++) {
      const data = await storage.read<{ techniques: PresetTechnique[] }>(
        `presets/techniques/level-${level}.json`
      );
      
      if (data) {
        for (const tech of data.techniques) {
          this.techniqueCache.set(tech.id, tech);
        }
      }
    }
    
    // Загрузка предметов
    for (let level = 1; level <= 9; level++) {
      const data = await storage.read<{ items: PresetItem[] }>(
        `presets/items/level-${level}.json`
      );
      
      if (data) {
        for (const item of data.items) {
          this.itemCache.set(item.id, item);
        }
      }
    }
    
    this.loaded = true;
    console.log(`[Presets] Loaded ${this.techniqueCache.size} techniques, ${this.itemCache.size} items in ${Date.now() - start}ms`);
  }
  
  // Получение техники
  getTechnique(id: string): PresetTechnique | undefined {
    return this.techniqueCache.get(id);
  }
  
  // Получение предмета
  getItem(id: string): PresetItem | undefined {
    return this.itemCache.get(id);
  }
  
  // Техники по уровню
  getTechniquesByLevel(level: number): PresetTechnique[] {
    return Array.from(this.techniqueCache.values())
      .filter(t => t.level === level);
  }
  
  // Предметы по типу
  getItemsByType(type: string): PresetItem[] {
    return Array.from(this.itemCache.values())
      .filter(i => i.type === type);
  }
}

export const presetStore = new PresetStorage();
```

---

## 5️⃣ РЕШЕНИЕ ПРОБЛЕМ

### 5.1 Проблема: Атомарность записей

```
Проблема: При одновременных запросах может произойти:
1. Запрос A читает файл (version=1)
2. Запрос B читает файл (version=1)
3. Запрос A пишет (version=2)
4. Запрос B пишет (version=2) — потеряны изменения A!

Решение: Очередь записей + оптимистическая блокировка
─────────────────────────────────────────────────────────

interface VersionedData {
  version: number;
  data: any;
}

async function optimisticUpdate<T>(
  path: string,
  updater: (data: T) => T
): Promise<boolean> {
  let retries = 3;
  
  while (retries > 0) {
    const current = await storage.read<VersionedData<T>>(path);
    const version = current?.version ?? 0;
    const data = current?.data ?? getDefault();
    
    const updated = updater(data);
    
    // Проверка версии перед записью
    const latest = await storage.read<VersionedData<T>>(path);
    if (latest && latest.version !== version) {
      retries--;
      continue; // Кто-то изменил, пробуем снова
    }
    
    await storage.write(path, {
      version: version + 1,
      data: updated
    });
    
    return true;
  }
  
  return false; // Не удалось после 3 попыток
}
```

### 5.2 Проблема: Поиск по индексам

```
Проблема: SQLite имеет индексы, JSON — нет
Поиск NPC по locationId требует перебора всех NPC

Решение: Вторичные индексы в памяти
─────────────────────────────────────────────────────────

class NpcIndex {
  private byLocation = new Map<string, Set<string>>();
  private byLevel = new Map<number, Set<string>>();
  private npcs = new Map<string, NPC>();
  
  async load(sessionId: string): Promise<void> {
    const data = await storage.read<{ npcs: NPC[] }>(
      `sessions/session_${sessionId}/world_data/npcs.json`
    );
    
    if (!data) return;
    
    for (const npc of data.npcs) {
      this.index(npc);
    }
  }
  
  private index(npc: NPC): void {
    this.npcs.set(npc.id, npc);
    
    // Индекс по локации
    if (npc.locationId) {
      if (!this.byLocation.has(npc.locationId)) {
        this.byLocation.set(npc.locationId, new Set());
      }
      this.byLocation.get(npc.locationId)!.add(npc.id);
    }
    
    // Индекс по уровню
    if (!this.byLevel.has(npc.cultivationLevel)) {
      this.byLevel.set(npc.cultivationLevel, new Set());
    }
    this.byLevel.get(npc.cultivationLevel)!.add(npc.id);
  }
  
  getByLocation(locationId: string): NPC[] {
    const ids = this.byLocation.get(locationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.npcs.get(id)!).filter(Boolean);
  }
  
  update(npc: NPC): void {
    this.remove(npc.id);
    this.index(npc);
  }
}
```

### 5.3 Проблема: Рост файлов истории

```
Проблема: messages.json и logs.json растут бесконечно

Решение: Ротация файлов
─────────────────────────────────────────────────────────

async function rotateHistory(sessionId: string): Promise<void> {
  const messagesPath = `sessions/session_${sessionId}/history/messages.json`;
  const data = await storage.read<{ messages: Message[] }>(messagesPath);
  
  if (!data || data.messages.length < 5000) return;
  
  // Сохраняем старые сообщения в архив
  const archive = data.messages.slice(0, -1000);
  const recent = data.messages.slice(-1000);
  
  const timestamp = new Date().toISOString().split('T')[0];
  await storage.write(
    `sessions/session_${sessionId}/history/archive/messages_${timestamp}.json`,
    { messages: archive }
  );
  
  await storage.write(messagesPath, { messages: recent });
}

// Запуск при сохранении
async function addMessage(sessionId: string, message: Message): Promise<void> {
  await updateMessages(sessionId, msgs => {
    msgs.push(message);
    return msgs;
  });
  
  // Проверка на ротацию
  const data = await storage.read<{ messages: Message[] }>(
    `sessions/session_${sessionId}/history/messages.json`
  );
  
  if (data && data.messages.length > 5000) {
    await rotateHistory(sessionId);
  }
}
```

### 5.4 Проблема: Целостность связей

```
Проблема: Нет foreign keys, можно удалить Location, на который ссылается NPC

Решение: Валидация в сервисном слое
─────────────────────────────────────────────────────────

async function deleteLocation(sessionId: string, locationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Проверка связей
  const npcs = await npcIndex.getByLocation(locationId);
  if (npcs.length > 0) {
    return {
      success: false,
      error: `Location has ${npcs.length} NPCs. Move or delete them first.`
    };
  }
  
  const characters = await getCharactersInLocation(sessionId, locationId);
  if (characters.length > 0) {
    return {
      success: false,
      error: 'Location has players. Cannot delete.'
    };
  }
  
  // Удаление
  await updateLocations(sessionId, locations => 
    locations.filter(l => l.id !== locationId)
  );
  
  return { success: true };
}
```

---

## 6️⃣ СРАВНЕНИЕ ПРОИЗВОДИТЕЛЬНОСТИ

### 6.1 Типичные операции

```
Операция                    SQLite          JSON (с кэшем)
──────────────────────────────────────────────────────────────
Загрузка сессии             20-50 мс        30-100 мс
Чтение персонажа            1-5 мс          <1 мс (кэш)
Обновление Ци               2-10 мс         5-20 мс
Поиск NPC в локации         5-10 мс         <1 мс (индекс)
Добавление сообщения        2-5 мс          10-30 мс
Сложный JOIN запрос         10-50 мс        20-100 мс
──────────────────────────────────────────────────────────────
```

### 6.2 Размер данных

```
Компонент                   SQLite          JSON файлы
──────────────────────────────────────────────────────────────
1 сессия (полная)           ~500 KB         ~200 KB (сжатие)
100 сессий                  ~50 MB          ~20 MB
Пресеты (2046 техник)       ~2 MB           ~300 KB
──────────────────────────────────────────────────────────────
```

### 6.3 Потребление памяти

```
Режим                       SQLite          JSON
──────────────────────────────────────────────────────────────
Холостой                    ~10 MB          ~5 MB
1 активная сессия           ~15 MB          ~10 MB
100 сессий + кэш            ~50 MB          ~30 MB
──────────────────────────────────────────────────────────────
```

---

## 7️⃣ ГИБРИДНЫЙ ВАРИАНТ (РЕКОМЕНДУЕМЫЙ)

### 7.1 Концепция

Разделить данные по частоте изменений:

```
┌─────────────────────────────────────────────────────────────┐
│  БЫСТРО МЕНЯЮЩИЕСЯ → SQLite (ACID, транзакции)              │
│  ├── Character (Ци, HP, усталость — часто)                  │
│  ├── Inventory (количество — часто)                         │
│  ├── CharacterTechnique (мастерство — иногда)               │
│  └── TechniquePool (временные)                              │
├─────────────────────────────────────────────────────────────┤
│  СТАТИЧЕСКИЕ → JSON файлы (кэш в памяти)                    │
│  ├── Пресеты техник                                         │
│  ├── Пресеты предметов                                      │
│  ├── Шаблоны NPC                                            │
│  └── Настройки игры                                         │
├─────────────────────────────────────────────────────────────┤
│  ИСТОРИЯ → JSON файлы (ротация)                             │
│  ├── Messages                                               │
│  ├── SystemLogs                                             │
│  └── WorldEvents (архив)                                    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Упрощённая Prisma схема

```prisma
// Только динамические данные

model Character {
  id        String   @id @default(cuid())
  sessionId String   @unique
  
  // Часто меняющиеся поля
  currentQi        Int   @default(0)
  health           Float @default(100.0)
  fatigue          Float @default(0.0)
  mentalFatigue    Float @default(0.0)
  cultivationLevel Int   @default(1)
  
  // Редко меняющиеся — в JSON-поле
  stats      String  @default("{}")  // JSON
  resources  String  @default("{}")  // JSON
  
  // Ссылки на JSON-файлы
  inventoryDataId  String? // ID файла инвентаря
  techniquesDataId String? // ID файла техник
  
  updatedAt DateTime @updatedAt
}

model SessionState {
  id        String   @id @default(cuid())
  sessionId String   @unique
  
  // Время
  worldYear   Int @default(1864)
  worldMonth  Int @default(1)
  worldDay    Int @default(1)
  worldHour   Int @default(6)
  worldMinute Int @default(0)
  
  // Флаги
  isPaused Boolean @default(true)
  
  updatedAt DateTime @updatedAt
}

// Больше моделей не нужно!
// NPC, Locations, Sects, Buildings — всё в JSON
```

---

## 8️⃣ ИТОГОВОЕ РЕШЕНИЕ

### Вариант A: Полный переход на JSON

```
✅ Подходит если:
- Максимум 10 одновременных игроков
- Простая логика (нет сложных JOIN)
- Разработчик один
- Важна простота бэкапов

❌ НЕ подходит если:
- Много одновременных запросов
- Сложные связи между данными
- Нужна гарантия целостности
- Командная разработка
```

### Вариант B: Гибридный (рекомендуется)

```
SQLite:
├── Character (только часто меняющиеся поля)
├── SessionState
└── Атомарные операции

JSON:
├── Пресеты (техники, предметы)
├── История (messages, logs)
├── Статичные данные мира
└── Полные дампы персонажей (бэкап)
```

### Вариант C: Текущий (оставить как есть)

```
✅ Если устраивает текущая производительность
✅ Нет проблем с миграциями
✅ Нужны сложные SQL-запросы
```

---

## 📊 РЕЗЮМЕ

| Критерий | SQLite | JSON | Гибрид |
|----------|--------|------|--------|
| Сложность реализации | Низкая | Средняя | Средняя |
| Атомарность | ✅ Автомат | ❌ Вручную | ✅ Частично |
| Производительность | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Простота бэкапов | ❌ Binary | ✅ Text | ✅ Text |
| Версионирование | ❌ Миграции | ✅ Git | ✅ Git |
| Масштабируемость | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Рекомендация** | | | ✅ |

**Итог:** Для проекта с ≤100 игроками рекомендуется **гибридный подход**:
- SQLite для критичных часто меняющихся данных (Character, сессия)
- JSON для пресетов, истории и статичных данных мира

Полный переход на JSON возможен, но требует:
1. Реализации очереди записей
2. Вторичных индексов в памяти
3. Ротации файлов истории
4. Валидации связей в коде

---

*Документ для архитектурного решения*
