# 🎮 Анализ 2D движков для WEB-версии

**Создано:** 2026-02-25
**Статус:** 📝 Исследование
**Приоритет:** 🔴 Высокий

---

## 🎯 Проблема

Текущий интерфейс — текстовый чат с боковыми панелями. Это ограничивает:
- Визуальное представление мира
- Интерактивность исследования
- Геймификацию боёв
- Отображение карты и локаций

---

## 📊 Сравнение 2D движков для WEB

| Движок | Размер | Сложность | Производительность | Подходит для |
|--------|--------|-----------|-------------------|--------------|
| **Phaser 3** | ~1.5 MB | 🟡 Средняя | ⭐⭐⭐⭐⭐ | Игры любого типа |
| **PixiJS** | ~250 KB | 🟡 Средняя | ⭐⭐⭐⭐⭐ | 2D рендеринг, UI |
| **Konva.js** | ~150 KB | 🟢 Низкая | ⭐⭐⭐⭐ | Интерактивные схемы |
| **Fabric.js** | ~300 KB | 🟢 Низкая | ⭐⭐⭐ | Canvas редакторы |
| **Three.js 2D** | ~500 KB | 🔴 Высокая | ⭐⭐⭐⭐ | Сложная графика |
| **Babylon.js 2D** | ~1 MB | 🔴 Высокая | ⭐⭐⭐⭐ | Полноценные игры |

---

## 🏆 Рекомендуемые варианты

### Вариант 1: Phaser 3 (РЕКОМЕНДУЕТСЯ)

**Почему Phaser:**
- Полноценный игровой движок
- Встроенная система сцен, спрайтов, анимаций
- Поддержка тайловых карт (Tiled)
- Отличная документация
- Активное сообщество
- TypeScript из коробки

**Интеграция с Next.js:**
```typescript
// components/game/GameCanvas.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 600,
      scene: [MainScene, UIScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      }
    });
    
    return () => game.destroy(true);
  }, []);
  
  return <div ref={containerRef} className="game-canvas" />;
}
```

**Структура сцен:**
```
src/game/
├── scenes/
│   ├── BootScene.ts       # Загрузка ассетов
│   ├── WorldScene.ts      # Карта мира
│   ├── LocationScene.ts   # Локация
│   ├── CombatScene.ts     # Бой
│   ├── MeditationScene.ts # Медитация
│   └── UIScene.ts         # UI оверлей
├── entities/
│   ├── Player.ts
│   ├── NPC.ts
│   └── Enemy.ts
├── systems/
│   ├── MovementSystem.ts
│   └── CombatSystem.ts
└── config/
    └── gameConfig.ts
```

**Плюсы:**
- ✅ Полноценный игровой движок
- ✅ Богатые возможности из коробки
- ✅ Tiled-карты для мира
- ✅ Анимации и частицы
- ✅ Звуковая система

**Минусы:**
- ⚠️ Большой размер (~1.5 MB)
- ⚠️ Кривая обучения
- ⚠️ Может быть избыточен для текстовой игры

---

### Вариант 2: PixiJS (ЛЕГКИЙ ВАРИАНТ)

**Почему PixiJS:**
- Самый быстрый 2D рендеринг
- Минимальный размер
- Полный контроль
- Отлично для UI и интерфейсов

**Интеграция:**
```typescript
// components/game/PixiCanvas.tsx
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });
    
    containerRef.current?.appendChild(app.view as HTMLCanvasElement);
    
    // Создание игрового мира
    const world = new GameWorld(app);
    world.init();
    
    return () => app.destroy(true);
  }, []);
  
  return <div ref={containerRef} />;
}
```

**Плюсы:**
- ✅ Минимальный размер (~250 KB)
- ✅ Максимальная производительность
- ✅ Полный контроль
- ✅ WebGL + Canvas fallback

**Минусы:**
- ⚠️ Нет встроенной физики
- ⚠️ Нужно писать всё с нуля
- ⚠️ Нет системы сцен

---

### Вариант 3: Konva.js (UI-ВАРИАНТ)

**Почему Konva:**
- React-интеграция (react-konva)
- Простой для UI элементов
- События как в DOM
- Отлично для интерактивных схем

**Интеграция:**
```typescript
// components/game/KonvaMap.tsx
import { Stage, Layer, Rect, Circle, Text, Image } from 'react-konva';

export function KonvaMap({ locations, player }) {
  return (
    <Stage width={800} height={600}>
      <Layer>
        {/* Карта мира */}
        {locations.map(loc => (
          <Circle
            key={loc.id}
            x={loc.x}
            y={loc.y}
            radius={20}
            fill={loc.visited ? '#4ade80' : '#6b7280'}
            onClick={() => handleLocationClick(loc)}
          />
        ))}
        
        {/* Игрок */}
        <Circle
          x={player.x}
          y={player.y}
          radius={15}
          fill="#f59e0b"
        />
      </Layer>
    </Stage>
  );
}
```

**Плюсы:**
- ✅ React-интеграция из коробки
- ✅ Простота использования
- ✅ События как в DOM
- ✅ Минимальный размер

**Минусы:**
- ⚠️ Не игровой движок
- ⚠️ Нет физики
- ⚠️ Ограниченные возможности

---

## 🏗️ Предлагаемая архитектура (Phaser 3)

### Общая структура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAME ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   NEXT.JS   │◄──►│   PHASER    │◄──►│  GAME API   │             │
│  │  (Оболочка) │    │  (Движок)   │    │ (Состояние) │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   REACT UI  │    │   SCENES    │    │  PRISMA DB  │             │
│  │  (Панели)   │    │  (Сцены)    │    │  (Данные)   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Сценарий использования

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GAMEPLAY FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. ЗАПУСК                                                          │
│     BootScene → загрузка ассетов → WorldScene                       │
│                                                                     │
│  2. ИССЛЕДОВАНИЕ                                                    │
│     WorldScene → клик на локацию → LocationScene                    │
│                                                                     │
│  3. ДЕЙСТВИЕ                                                        │
│     LocationScene → действие → LLM API → ответ → анимация           │
│                                                                     │
│  4. БОЙ                                                             │
│     LocationScene → враг → CombatScene → результат → возврат        │
│                                                                     │
│  5. МЕДИТАЦИЯ                                                       │
│     LocationScene → медитация → MeditationScene → эффекты           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Визуальная концепция

### Карта мира (WorldScene)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│      🏔️                                                        │
│      Горы                                          🌲🌲🌲       │
│                              🛕                    Лес         │
│      ⛰️        🌊                         🏠                  │
│      Пещера    Озеро                       Деревня             │
│                                                                │
│                    ⭐ ← Игрок                                   │
│                                                                │
│                              🏛️                                │
│                              Храм                              │
│                                                                │
│  ════════════════════════════════════════════════════════════  │
│  │ 💬 Чат / Действия                                    [⚙️] │  │
│  │-----------------------------------------------------------│
│  │ Ты находишься у подножия гор...                          │
│  │                                                           │
│  │ > Осмотреться                                             │
│  │ > Идти на восток                                          │
│  │ > Медитировать                                            │
│  └───────────────────────────────────────────────────────────┘
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Локация (LocationScene)

```
┌────────────────────────────────────────────────────────────────┐
│  🏛️ ХРАМ НЕБОСНОГО ПИКА                                        │
│  ─────────────────────────────                                │
│                                                                │
│      ┌─────────────────────────────┐                          │
│      │     🕉️  АЛТАРЬ  🕉️         │                          │
│      │                             │                          │
│      │   🔮    👤→    📜          │                          │
│      │   Ци   Игрок   Свиток      │                          │
│      │                             │                          │
│      │   🧘                        │                          │
│      │   Монах                     │                          │
│      └─────────────────────────────┘                          │
│                                                                │
│  ════════════════════════════════════════════════════════════  │
│  │ ⚡ Ци: 150/200    😫 Усталость: 23%    🧘 Ур: 3.2       │  │
│  ════════════════════════════════════════════════════════════  │
│  │ 💬 Монах приветствует тебя: "Добро пожаловать..."        │  │
│  │                                                           │  │
│  │ [Поговорить] [Медитировать] [Осмотреть алтарь] [Уйти]    │  │
│  └───────────────────────────────────────────────────────────┘
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Бой (CombatScene)

```
┌────────────────────────────────────────────────────────────────┐
│  ⚔️ БОЙ: Дикий зверь                                           │
│  ─────────────────────                                        │
│                                                                │
│      🐺 Дикий зверь                    👤 Ты                   │
│      HP: ████████░░ 80%               HP: ██████████ 100%     │
│      Ци: ░░░░░░░░░░ 0%                Ци: ████████░░ 75%      │
│                                                                │
│      ┌───────────────────────────────────────────────┐        │
│      │                                               │        │
│      │          🐺 ←────💥──── 👤                    │        │
│      │              Атака!                           │        │
│      │                                               │        │
│      └───────────────────────────────────────────────┘        │
│                                                                │
│  ════════════════════════════════════════════════════════════  │
│  │ [⚔️ Удар] [🔥 Техника] [🛡️ Защита] [🏃 Бегство]         │  │
│  │                                                           │  │
│  │ Доступные техники:                                        │  │
│  │ [Огненный кулак - 20 Ци] [Воздушный щит - 15 Ци]          │  │
│  └───────────────────────────────────────────────────────────┘
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📦 Структура проекта

```
src/
├── app/
│   └── page.tsx              # Главная страница (Next.js)
│
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx    # Контейнер для Phaser
│   │   ├── ChatPanel.tsx     # Панель чата (React)
│   │   ├── StatsPanel.tsx    # Панель статов (React)
│   │   └── ActionButtons.tsx # Кнопки действий (React)
│   └── ui/                   # shadcn/ui компоненты
│
├── game/                     # Phaser модуль
│   ├── config/
│   │   └── gameConfig.ts     # Конфигурация игры
│   ├── scenes/
│   │   ├── BootScene.ts      # Загрузка
│   │   ├── WorldScene.ts     # Карта мира
│   │   ├── LocationScene.ts  # Локация
│   │   ├── CombatScene.ts    # Бой
│   │   ├── MeditationScene.ts# Медитация
│   │   └── UIScene.ts        # UI оверлей
│   ├── entities/
│   │   ├── Player.ts         # Игрок
│   │   ├── NPC.ts            # NPC
│   │   ├── Enemy.ts          # Враги
│   │   └── ResourceNode.ts   # Ресурсы
│   ├── systems/
│   │   ├── MovementSystem.ts # Движение
│   │   ├── CombatSystem.ts   # Бой
│   │   └── DialogSystem.ts   # Диалоги
│   ├── ui/
│   │   ├── DialogBox.ts      # Диалоговое окно
│   │   ├── ActionMenu.ts     # Меню действий
│   │   └── StatusBar.ts      # Статус-бары
│   └── assets/
│       ├── sprites/          # Спрайты
│       ├── tiles/            # Тайлы
│       └── audio/            # Звуки
│
├── lib/
│   └── game/                 # Существующая логика (qi-system, etc.)
│
└── services/
    └── game-bridge.service.ts # Мост между Phaser и API
```

---

## 🔗 Интеграция с существующим кодом

### Мост Phaser ↔ API

```typescript
// services/game-bridge.service.ts

import { gameStore } from '@/stores/game-store';

export class GameBridge {
  private static instance: GameBridge;
  private phaserGame: Phaser.Game | null = null;
  
  static getInstance(): GameBridge {
    if (!this.instance) {
      this.instance = new GameBridge();
    }
    return this.instance;
  }
  
  setGame(game: Phaser.Game) {
    this.phaserGame = game;
  }
  
  // Вызов LLM для генерации контента
  async generateNarrative(action: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: gameStore.getState().sessionId,
        message: action,
      }),
    });
    
    const data = await response.json();
    
    // Триггер анимации в Phaser
    this.phaserGame?.events.emit('narrative-generated', data);
    
    return data.response.content;
  }
  
  // Обновление состояния из Phaser
  updateCharacterState(state: Partial<CharacterState>) {
    gameStore.getState().updateCharacter(state);
    
    // Обновить UI в React
    this.phaserGame?.events.emit('state-updated', state);
  }
  
  // Триггер боя
  startCombat(enemy: Enemy) {
    this.phaserGame?.scene.start('CombatScene', { enemy });
  }
  
  // Триггер медитации
  startMeditation(duration: number) {
    this.phaserGame?.scene.start('MeditationScene', { duration });
  }
}
```

### Связь React ↔ Phaser

```typescript
// components/game/GameCanvas.tsx

'use client';

import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { BootScene } from '@/game/scenes/BootScene';
import { WorldScene } from '@/game/scenes/WorldScene';
import { GameBridge } from '@/services/game-bridge.service';

interface GameCanvasProps {
  onSceneChange?: (scene: string) => void;
  onStateUpdate?: (state: unknown) => void;
}

export function GameCanvas({ onSceneChange, onStateUpdate }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 500,
      backgroundColor: '#1a1a2e',
      scene: [BootScene, WorldScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };
    
    const game = new Phaser.Game(config);
    gameRef.current = game;
    
    // Регистрация в мосте
    GameBridge.getInstance().setGame(game);
    
    // Слушатели событий
    game.events.on('scene-change', onSceneChange || (() => {}));
    game.events.on('state-updated', onStateUpdate || (() => {}));
    
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-[500px] rounded-lg overflow-hidden border border-border"
    />
  );
}
```

---

## 📊 Сравнение подходов

| Критерий | Только React | Phaser + React | PixiJS + React |
|----------|--------------|----------------|----------------|
| Размер бандла | ~100 KB | ~1.6 MB | ~350 KB |
| Время разработки | 🟢 Быстро | 🟡 Средне | 🔴 Долго |
| Интерактивность | 🟡 Средняя | 🟢 Высокая | 🟢 Высокая |
| Анимации | 🟡 CSS/Framer | 🟢 Встроенные | 🟡 Самописные |
| Карты/Уровни | 🔴 Сложно | 🟢 Tiled | 🟡 Самописные |
| Физика | 🔴 Нет | 🟢 Arcade/Matter | 🔴 Нет |
| Звук | 🟡 Web Audio | 🟢 Встроенный | 🔴 Самописный |
| Производительность | 🟢 Отлично | 🟢 Отлично | 🟢 Отлично |

---

## 📅 План реализации (Phaser)

### Фаза 1: Основа (2-3 дня)
- [ ] Установить Phaser (`bun add phaser`)
- [ ] Создать базовую структуру `/game/`
- [ ] Реализовать BootScene (загрузка)
- [ ] Реализовать простую WorldScene
- [ ] Интегрировать с существующим API

### Фаза 2: Локации (2-3 дня)
- [ ] Реализовать LocationScene
- [ ] Система переходов между локациями
- [ ] Отображение NPC и ресурсов
- [ ] Интерактивные объекты

### Фаза 3: Бой (2-3 дня)
- [ ] Реализовать CombatScene
- [ ] Анимации атак и эффектов
- [ ] UI выбора действий
- [ ] Интеграция с боевой системой

### Фаза 4: Медитация (1-2 дня)
- [ ] Реализовать MeditationScene
- [ ] Визуальные эффекты Ци
- [ ] Анимация прерываний

### Фаза 5: UI (1-2 дня)
- [ ] Панели статов (React)
- [ ] Инвентарь
- [ ] Техники
- [ ] Чат/Лог действий

---

## 🎨 Ассеты

### Минимальный набор для MVP

| Категория | Файлы | Источник |
|-----------|-------|----------|
| Игрок | player.png, player-walk.png | Kenney / OpenGameArt |
| NPC | npc-monk.png, npc-villager.png | Kenney |
| Враги | enemy-wolf.png, enemy-spirit.png | Kenney |
| Тайлы | grass.png, stone.png, water.png | Kenney |
| Иконки | icons.png (sprite sheet) | Game-icons.net |
| Эффекты | particles.png | Самодельные |

### Рекомендуемые источники
- **Kenney.nl** — бесплатные ассеты (CC0)
- **OpenGameArt.org** — бесплатные ассеты
- **Game-icons.net** — иконки (CC-BY)
- **Tiled Map Editor** — создание карт

---

## 💰 Оценка

| Ресурс | Значение |
|--------|----------|
| Размер бандла | +1.5 MB |
| Время разработки | 8-13 дней |
| Сложность | 🟡 Средняя |
| ROI | Высокий (улучшение UX) |

---

## 🚀 Рекомендация

**Рекомендуется: Phaser 3 + React**

1. Phaser даёт полноценный игровой движок
2. React сохраняется для UI панелей
3. Интеграция через GameBridge
4. Возможность постепенной миграции

**Начать с MVP:**
- Карта мира с кликабельными локациями
- Простая сцена локации
- Базовые анимации

---

*Документ создан: 2026-02-25*
