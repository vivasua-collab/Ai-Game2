# 🎮 План перехода на Phaser 3

**Создано:** 2026-02-25
**Ветка:** main2D
**Статус:** 📋 Планирование
**Длительность:** 8-13 дней

---

## 📋 Обзор миграции

### Текущее состояние
- Текстовый интерфейс с чатом
- React компоненты для панелей
- Zustand для состояния
- Prisma для данных
- LLM для генерации контента

### Целевое состояние
- 2D игровой мир (Phaser 3)
- Визуальные локации и персонажи
- Интерактивные объекты
- Анимированный бой
- Сохранение LLM для генерации контента

---

## 🏗️ Архитектура после миграции

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        NEXT.JS APP                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │   page.tsx  │  │  Layouts    │  │   API Routes            │   │  │
│  │  │  (Главная)  │  │  (Оболочка) │  │   /api/chat, /api/...   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      GAME CONTAINER                               │  │
│  │  ┌─────────────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │      PHASER 3 CANVAS        │  │      REACT UI PANELS      │  │  │
│  │  │  ┌───────────────────────┐  │  │  ┌─────────────────────┐  │  │  │
│  │  │  │      WorldScene       │  │  │  │    StatsPanel       │  │  │  │
│  │  │  │      LocationScene    │  │  │  │    InventoryPanel   │  │  │  │
│  │  │  │      CombatScene      │  │  │  │    TechniquesPanel  │  │  │  │
│  │  │  │      MeditationScene  │  │  │  │    ChatPanel        │  │  │  │
│  │  │  └───────────────────────┘  │  │  └─────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       GAME BRIDGE                                 │  │
│  │           (Связь Phaser ↔ React ↔ API ↔ Database)                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     EXISTING BACKEND                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │   Prisma    │  │   LLM API   │  │   Game Services         │   │  │
│  │  │  (SQLite)   │  │   (Z-AI)    │  │   (qi-system, etc.)     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Этап 1: Подготовка инфраструктуры (День 1)

### 1.1 Установка зависимостей

```bash
# Установка Phaser 3
bun add phaser

# Типы для TypeScript
bun add -D @types/phaser
```

### 1.2 Структура папок

```
src/
├── game/                          # Новый модуль Phaser
│   ├── config/
│   │   ├── game.config.ts         # Конфигурация игры
│   │   ├── scenes.config.ts       # Регистрация сцен
│   │   └── assets.config.ts       # Пути к ассетам
│   │
│   ├── scenes/
│   │   ├── BaseScene.ts           # Базовый класс сцены
│   │   ├── BootScene.ts           # Загрузка ассетов
│   │   ├── PreloadScene.ts        # Прелоадер
│   │   ├── WorldScene.ts          # Карта мира
│   │   ├── LocationScene.ts       # Локация
│   │   ├── CombatScene.ts         # Бой
│   │   └── MeditationScene.ts     # Медитация
│   │
│   ├── entities/
│   │   ├── Entity.ts              # Базовый класс сущности
│   │   ├── Player.ts              # Игрок
│   │   ├── NPC.ts                 # NPC
│   │   ├── Enemy.ts               # Враг
│   │   └── ResourceNode.ts        # Ресурс
│   │
│   ├── components/                # Phaser UI компоненты
│   │   ├── DialogBox.ts           # Диалоговое окно
│   │   ├── ActionMenu.ts          # Меню действий
│   │   ├── HealthBar.ts           # Полоса здоровья
│   │   ├── QiBar.ts               # Полоса Ци
│   │   └── Tooltip.ts             # Подсказки
│   │
│   ├── systems/
│   │   ├── InputSystem.ts         # Обработка ввода
│   │   ├── MovementSystem.ts      # Движение
│   │   ├── InteractionSystem.ts   # Взаимодействия
│   │   └── AnimationSystem.ts     # Анимации
│   │
│   ├── utils/
│   │   ├── assetLoader.ts         # Загрузчик ассетов
│   │   ├── sceneManager.ts        # Управление сценами
│   │   └── debug.ts               # Отладка
│   │
│   └── constants/
│       ├── colors.ts              # Цвета
│       ├── depths.ts              # Слои (z-index)
│       └── animations.ts          # Константы анимаций
│
├── components/
│   ├── game/
│   │   ├── GameContainer.tsx      # React-обёртка для Phaser
│   │   ├── GameCanvas.tsx         # Canvas компонент
│   │   └── GameProvider.tsx       # Контекст для связи
│   │
│   └── panels/                    # React UI панели
│       ├── StatsPanel.tsx
│       ├── InventoryPanel.tsx
│       ├── TechniquesPanel.tsx
│       └── ChatPanel.tsx
│
└── services/
    └── game-bridge.service.ts     # Мост Phaser ↔ React
```

### 1.3 Чеклист Этапа 1

- [ ] Установить `phaser` и `@types/phaser`
- [ ] Создать структуру папок `/src/game/`
- [ ] Создать базовые конфиги
- [ ] Настроить TypeScript для Phaser
- [ ] Проверить сборку

---

## 📦 Этап 2: Базовый Phaser Setup (День 2)

### 2.1 Конфигурация игры

```typescript
// src/game/config/game.config.ts

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { WorldScene } from '../scenes/WorldScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 550,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  
  scene: [BootScene, PreloadScene, WorldScene],
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  
  render: {
    pixelArt: true,
    antialias: false,
  },
};
```

### 2.2 Базовая сцена

```typescript
// src/game/scenes/BaseScene.ts

import Phaser from 'phaser';
import { GameBridge } from '@/services/game-bridge.service';

export abstract class BaseScene extends Phaser.Scene {
  protected bridge: GameBridge;
  
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    this.bridge = GameBridge.getInstance();
  }
  
  // Общий метод для создания UI
  protected createUI(): void {
    // Переопределяется в наследниках
  }
  
  // Общий метод для обработки ввода
  protected setupInput(): void {
    // Переопределяется в наследниках
  }
  
  // Переход к другой сцене с данными
  protected goToScene(sceneName: string, data?: object): void {
    this.scene.start(sceneName, data);
  }
}
```

### 2.3 React-обёртка

```typescript
// src/components/game/GameContainer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '@/game/config/game.config';
import { GameBridge } from '@/services/game-bridge.service';

interface GameContainerProps {
  sessionId: string;
  onStateChange?: (state: unknown) => void;
}

export function GameContainer({ sessionId, onStateChange }: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    
    // Создаём игру
    const game = new Phaser.Game({
      ...GAME_CONFIG,
      parent: containerRef.current,
    });
    
    gameRef.current = game;
    
    // Регистрируем в мосте
    const bridge = GameBridge.getInstance();
    bridge.setGame(game);
    bridge.setSessionId(sessionId);
    
    // Событие готовности
    game.events.once('ready', () => {
      setIsReady(true);
    });
    
    // Очистка
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sessionId]);
  
  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        id="game-container"
        className="w-full h-[550px] rounded-lg overflow-hidden border border-border"
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Загрузка мира...</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.4 Чеклист Этапа 2

- [ ] Создать `game.config.ts`
- [ ] Создать `BaseScene.ts`
- [ ] Создать `BootScene.ts` (пустая)
- [ ] Создать `GameContainer.tsx`
- [ ] Интегрировать в `page.tsx`
- [ ] Проверить запуск игры (чёрный экран = успех)

---

## 📦 Этап 3: Карта мира (Дни 3-4)

### 3.1 Загрузка ассетов

```typescript
// src/game/scenes/BootScene.ts

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });
  }
  
  preload(): void {
    // Показываем прогресс-бар
    this.createProgressBar();
    
    // Загружаем ассеты
    this.load.image('player', '/assets/sprites/player.png');
    this.load.image('location-marker', '/assets/sprites/location-marker.png');
    this.load.image('location-visited', '/assets/sprites/location-visited.png');
    this.load.image('fog', '/assets/sprites/fog.png');
    
    // UI элементы
    this.load.image('button', '/assets/ui/button.png');
    this.load.image('panel', '/assets/ui/panel.png');
  }
  
  create(): void {
    // Переходим к карте мира
    this.scene.start('WorldScene');
  }
  
  private createProgressBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.rectangle(
      width / 2, height / 2, 400, 30, 0x222222
    );
    const progressBox = this.add.rectangle(
      width / 2, height / 2, 410, 35, 0x444444
    );
    
    this.load.on('progress', (value: number) => {
      progressBar.width = 400 * value;
    });
  }
}
```

### 3.2 Сцена карты мира

```typescript
// src/game/scenes/WorldScene.ts

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import type { Location } from '@/types/game';

interface WorldSceneData {
  locations: Location[];
  playerLocationId: string;
}

export class WorldScene extends BaseScene {
  private locations: Map<string, Phaser.GameObjects.Container> = new Map();
  private player!: Phaser.GameObjects.Sprite;
  private playerLocationId: string = '';
  
  constructor() {
    super({ key: 'WorldScene' });
  }
  
  init(data: WorldSceneData): void {
    this.playerLocationId = data.playerLocationId;
  }
  
  async create(): Promise<void> {
    // Загружаем локации из API
    await this.loadLocations();
    
    // Создаём карту
    this.createWorldMap();
    
    // Создаём игрока
    this.createPlayer();
    
    // Настраиваем ввод
    this.setupInput();
    
    // Запускаем UI сцену
    this.scene.launch('UIScene');
  }
  
  private async loadLocations(): Promise<void> {
    const locations = await this.bridge.getLocations();
    this.renderLocations(locations);
  }
  
  private renderLocations(locations: Location[]): void {
    locations.forEach((loc) => {
      const container = this.createLocationMarker(loc);
      this.locations.set(loc.id, container);
    });
  }
  
  private createLocationMarker(location: Location): Phaser.GameObjects.Container {
    const x = location.x || 0;
    const y = location.y || 0;
    
    const container = this.add.container(x, y);
    
    // Маркер локации
    const marker = this.add.image(0, 0, 'location-marker');
    marker.setInteractive({ useHandCursor: true });
    
    // Название
    const name = this.add.text(0, 40, location.name, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Иконка типа
    const icon = this.add.text(0, 0, this.getLocationIcon(location.terrainType), {
      fontSize: '24px',
    }).setOrigin(0.5);
    
    container.add([marker, icon, name]);
    
    // Обработка клика
    marker.on('pointerdown', () => {
      this.onLocationClick(location);
    });
    
    // Hover эффект
    marker.on('pointerover', () => {
      container.setScale(1.1);
    });
    marker.on('pointerout', () => {
      container.setScale(1);
    });
    
    return container;
  }
  
  private getLocationIcon(terrainType?: string | null): string {
    const icons: Record<string, string> = {
      forest: '🌲',
      mountain: '🏔️',
      water: '🌊',
      desert: '🏜️',
      plains: '🌾',
      cave: '🕳️',
      temple: '🛕',
      village: '🏘️',
    };
    return icons[terrainType || 'plains'] || '📍';
  }
  
  private createPlayer(): void {
    const playerLoc = this.locations.get(this.playerLocationId);
    const x = playerLoc?.x || 450;
    const y = playerLoc?.y || 275;
    
    this.player = this.add.sprite(x, y, 'player');
    this.player.setDepth(100);
    
    // Анимация покачивания
    this.tweens.add({
      targets: this.player,
      y: y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  
  private onLocationClick(location: Location): void {
    // Переход к локации
    this.bridge.setCurrentLocation(location.id);
    this.scene.start('LocationScene', { locationId: location.id });
  }
  
  private setupInput(): void {
    // Клавиатура
    this.input.keyboard?.on('keydown-ESC', () => {
      // Открыть меню
    });
  }
}
```

### 3.3 Чеклист Этапа 3

- [ ] Создать минимальные ассеты (маркеры, иконки)
- [ ] Реализовать BootScene с загрузкой
- [ ] Реализовать WorldScene
- [ ] Отображение локаций из БД
- [ ] Кликабельные маркеры
- [ ] Отображение игрока
- [ ] Переход к локации

---

## 📦 Этап 4: Сцена локации (Дни 5-6)

### 4.1 Структура локации

```typescript
// src/game/scenes/LocationScene.ts

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import type { Location, Character, NPC } from '@/types/game';

interface LocationSceneData {
  locationId: string;
}

export class LocationScene extends BaseScene {
  private location!: Location;
  private character!: Character;
  private npcs: NPC[] = [];
  private actionMenu!: Phaser.GameObjects.Container;
  
  constructor() {
    super({ key: 'LocationScene' });
  }
  
  async init(data: LocationSceneData): void {
    // Загружаем данные локации
    this.location = await this.bridge.getLocation(data.locationId);
    this.character = await this.bridge.getCharacter();
    this.npcs = await this.bridge.getNPCs(data.locationId);
  }
  
  create(): void {
    // Фон локации
    this.createBackground();
    
    // Игрок
    this.createPlayerCharacter();
    
    // NPC
    this.createNPCs();
    
    // Ресурсы
    this.createResources();
    
    // Меню действий
    this.createActionMenu();
    
    // UI
    this.createLocationUI();
    
    // Ввод
    this.setupInput();
  }
  
  private createBackground(): void {
    // Цвет фона по типу местности
    const colors: Record<string, number> = {
      forest: 0x1a4d1a,
      mountain: 0x4a4a4a,
      water: 0x1a3d5c,
      desert: 0xc2a860,
      temple: 0x2a2a4a,
      village: 0x3d3d3d,
    };
    
    const color = colors[this.location.terrainType || 'forest'] || 0x1a1a2e;
    this.cameras.main.setBackgroundColor(color);
    
    // Декорации
    this.createDecorations();
  }
  
  private createDecorations(): void {
    // Деревья, камни, etc.
    const decorationCount = Phaser.Math.Between(3, 8);
    
    for (let i = 0; i < decorationCount; i++) {
      const x = Phaser.Math.Between(50, 850);
      const y = Phaser.Math.Between(50, 450);
      
      const decoration = this.add.text(x, y, this.getRandomDecoration(), {
        fontSize: '32px',
      }).setAlpha(0.6);
      
      decoration.setDepth(1);
    }
  }
  
  private getRandomDecoration(): string {
    const decorations = ['🌿', '🍂', '🪨', '🌾', '🪵', '🌸'];
    return decorations[Phaser.Math.Between(0, decorations.length - 1)];
  }
  
  private createPlayerCharacter(): void {
    this.player = this.add.sprite(450, 300, 'player');
    this.player.setScale(2);
    this.player.setDepth(50);
    
    // Имя игрока
    this.add.text(450, 350, this.character.name || 'Игрок', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(51);
  }
  
  private createNPCs(): void {
    this.npcs.forEach((npc, index) => {
      const x = 200 + index * 200;
      const y = 250;
      
      const npcSprite = this.add.sprite(x, y, 'npc');
      npcSprite.setInteractive({ useHandCursor: true });
      npcSprite.setDepth(40);
      
      // Имя NPC
      this.add.text(x, y + 40, npc.name, {
        fontSize: '12px',
        color: '#ffdd00',
      }).setOrigin(0.5).setDepth(41);
      
      // Клик для диалога
      npcSprite.on('pointerdown', () => {
        this.startDialog(npc);
      });
    });
  }
  
  private createActionMenu(): void {
    const menuX = 450;
    const menuY = 450;
    
    this.actionMenu = this.add.container(menuX, menuY);
    this.actionMenu.setDepth(100);
    
    const actions = [
      { label: '🔍 Осмотреться', action: 'examine' },
      { label: '🧘 Медитировать', action: 'meditate' },
      { label: '🗺️ Карта', action: 'map' },
      { label: '💬 Чат', action: 'chat' },
    ];
    
    actions.forEach((act, i) => {
      const btn = this.createButton(-150 + i * 100, 0, act.label);
      btn.on('pointerdown', () => this.handleAction(act.action));
      this.actionMenu.add(btn);
    });
  }
  
  private createButton(x: number, y: number, text: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 90, 35, 0x333333, 0.9)
      .setStrokeStyle(2, 0x666666);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(90, 35);
    container.setInteractive({ useHandCursor: true });
    
    // Hover
    container.on('pointerover', () => bg.setFillStyle(0x444444));
    container.on('pointerout', () => bg.setFillStyle(0x333333));
    
    return container;
  }
  
  private async handleAction(action: string): Promise<void> {
    switch (action) {
      case 'examine':
        await this.examineLocation();
        break;
      case 'meditate':
        this.scene.start('MeditationScene', { locationId: this.location.id });
        break;
      case 'map':
        this.scene.start('WorldScene');
        break;
      case 'chat':
        this.bridge.toggleChat();
        break;
    }
  }
  
  private async examineLocation(): Promise<void> {
    const response = await this.bridge.sendAction('Осмотреться');
    this.showNarration(response);
  }
  
  private showNarration(text: string): void {
    // Показать текст повествования
    const box = this.add.rectangle(450, 520, 800, 60, 0x000000, 0.8);
    const narration = this.add.text(450, 520, text, {
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: 780 },
    }).setOrigin(0.5);
    
    // Автоскрытие через 5 сек
    this.time.delayedCall(5000, () => {
      box.destroy();
      narration.destroy();
    });
  }
  
  private setupInput(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('WorldScene');
    });
  }
}
```

### 4.2 Чеклист Этапа 4

- [ ] Создать LocationScene
- [ ] Загрузка данных локации
- [ ] Отрисовка фона по типу
- [ ] Размещение игрока
- [ ] Размещение NPC
- [ ] Меню действий
- [ ] Интеграция с API (examine, meditate)
- [ ] Переходы между сценами

---

## 📦 Этап 5: Сцена боя (Дни 7-8)

### 5.1 Боевая сцена

```typescript
// src/game/scenes/CombatScene.ts

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';

interface CombatSceneData {
  enemyId: string;
  locationId: string;
}

interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerQi: number;
  playerMaxQi: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: 'player' | 'enemy';
  log: string[];
}

export class CombatScene extends BaseScene {
  private enemyId!: string;
  private locationId!: string;
  private state!: CombatState;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private enemySprite!: Phaser.GameObjects.Sprite;
  private actionButtons: Phaser.GameObjects.Container[] = [];
  private isAnimating: boolean = false;
  
  constructor() {
    super({ key: 'CombatScene' });
  }
  
  async init(data: CombatSceneData): void {
    this.enemyId = data.enemyId;
    this.locationId = data.locationId;
    
    // Инициализация состояния
    this.state = await this.bridge.initCombat(data.enemyId);
  }
  
  create(): void {
    // Фон
    this.createBattleBackground();
    
    // Персонажи
    this.createCombatants();
    
    // UI
    this.createHealthBars();
    this.createActionButtons();
    this.createCombatLog();
    
    // Начало боя
    this.showCombatStart();
  }
  
  private createBattleBackground(): void {
    // Затемнённый фон
    this.add.rectangle(450, 275, 900, 550, 0x000000, 0.5);
    
    // Арена
    this.add.ellipse(450, 350, 700, 200, 0x1a1a2e, 0.8);
  }
  
  private createCombatants(): void {
    // Игрок слева
    this.playerSprite = this.add.sprite(250, 300, 'player');
    this.playerSprite.setScale(2.5);
    this.playerSprite.setFlipX(false);
    
    // Враг справа
    this.enemySprite = this.add.sprite(650, 300, 'enemy');
    this.enemySprite.setScale(2.5);
    this.enemySprite.setFlipX(true);
    
    // Имена
    this.add.text(250, 380, 'Ты', {
      fontSize: '16px',
      color: '#4ade80',
    }).setOrigin(0.5);
    
    this.add.text(650, 380, 'Враг', {
      fontSize: '16px',
      color: '#ef4444',
    }).setOrigin(0.5);
  }
  
  private createHealthBars(): void {
    // HP игрока
    this.createBar(150, 100, 200, 25, () => this.state.playerHp / this.state.playerMaxHp, 0x4ade80);
    this.add.text(150, 85, 'HP', { fontSize: '12px', color: '#ffffff' });
    
    // Ци игрока
    this.createBar(150, 140, 200, 20, () => this.state.playerQi / this.state.playerMaxQi, 0x3b82f6);
    this.add.text(150, 125, 'Ци', { fontSize: '12px', color: '#ffffff' });
    
    // HP врага
    this.createBar(550, 100, 200, 25, () => this.state.enemyHp / this.state.enemyMaxHp, 0xef4444);
    this.add.text(550, 85, 'HP врага', { fontSize: '12px', color: '#ffffff' });
  }
  
  private createBar(
    x: number, y: number, width: number, height: number,
    getProgress: () => number, color: number
  ): Phaser.GameObjects.Graphics {
    const bar = this.add.graphics();
    
    const draw = () => {
      bar.clear();
      const progress = getProgress();
      
      // Фон
      bar.fillStyle(0x333333);
      bar.fillRect(x, y, width, height);
      
      // Заполнение
      bar.fillStyle(color);
      bar.fillRect(x, y, width * progress, height);
      
      // Рамка
      bar.lineStyle(2, 0x666666);
      bar.strokeRect(x, y, width, height);
    };
    
    draw();
    
    // Обновление каждый кадр
    this.events.on('update', draw);
    
    return bar;
  }
  
  private createActionButtons(): void {
    const actions = [
      { label: '⚔️ Атака', action: 'attack', qiCost: 0 },
      { label: '🔥 Техника', action: 'technique', qiCost: 20 },
      { label: '🛡️ Защита', action: 'defend', qiCost: 5 },
      { label: '🏃 Бегство', action: 'flee', qiCost: 0 },
    ];
    
    actions.forEach((act, i) => {
      const btn = this.createCombatButton(200 + i * 130, 480, act);
      this.actionButtons.push(btn);
    });
  }
  
  private createCombatButton(
    x: number, y: number, action: { label: string; action: string; qiCost: number }
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 120, 45, 0x333333, 0.9)
      .setStrokeStyle(2, 0x666666);
    
    const label = this.add.text(0, -5, action.label, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    const cost = this.add.text(0, 12, action.qiCost > 0 ? `${action.qiCost} Ци` : '', {
      fontSize: '10px',
      color: '#3b82f6',
    }).setOrigin(0.5);
    
    container.add([bg, label, cost]);
    container.setSize(120, 45);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerdown', () => {
      if (this.state.turn === 'player' && !this.isAnimating) {
        this.executeAction(action.action, action.qiCost);
      }
    });
    
    container.on('pointerover', () => bg.setFillStyle(0x444444));
    container.on('pointerout', () => bg.setFillStyle(0x333333));
    
    return container;
  }
  
  private async executeAction(action: string, qiCost: number): Promise<void> {
    if (this.state.playerQi < qiCost) {
      this.showFloatingText(250, 250, 'Недостаточно Ци!', '#ef4444');
      return;
    }
    
    this.isAnimating = true;
    this.disableButtons();
    
    // Анимация атаки
    await this.playAttackAnimation(action);
    
    // Отправляем на сервер
    const result = await this.bridge.executeCombatAction(action);
    
    // Обновляем состояние
    this.updateState(result);
    
    // Проверяем конец боя
    if (result.combatEnd) {
      await this.endCombat(result);
    } else {
      // Ход врага
      await this.enemyTurn();
    }
    
    this.isAnimating = false;
    this.enableButtons();
  }
  
  private async playAttackAnimation(action: string): Promise<void> {
    return new Promise((resolve) => {
      if (action === 'attack') {
        // Движение к врагу
        this.tweens.add({
          targets: this.playerSprite,
          x: 550,
          duration: 200,
          yoyo: true,
          onYoyo: () => {
            // Эффект удара
            this.showDamageEffect(650, 300);
          },
          onComplete: resolve,
        });
      } else if (action === 'technique') {
        // Эффект техники
        this.showTechniqueEffect();
        this.time.delayedCall(500, resolve);
      } else {
        resolve();
      }
    });
  }
  
  private showDamageEffect(x: number, y: number): void {
    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: 300,
      quantity: 10,
    });
    
    this.time.delayedCall(300, () => particles.destroy());
  }
  
  private showTechniqueEffect(): void {
    // Красная вспышка
    const flash = this.add.rectangle(450, 275, 900, 550, 0xff0000, 0.3);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }
  
  private async enemyTurn(): Promise<void> {
    this.state.turn = 'enemy';
    
    // Анимация врага
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.enemySprite,
        x: 350,
        duration: 200,
        yoyo: true,
        onYoyo: () => this.showDamageEffect(250, 300),
        onComplete: () => resolve(),
      });
    });
    
    // Получаем действие врага от сервера
    const result = await this.bridge.getEnemyAction();
    
    this.updateState(result);
    this.addLog(`Враг атакует! Урон: ${result.damage}`);
    
    if (result.combatEnd) {
      await this.endCombat(result);
    } else {
      this.state.turn = 'player';
    }
  }
  
  private async endCombat(result: { victory: boolean; loot?: unknown }): Promise<void> {
    if (result.victory) {
      this.showVictoryScreen(result.loot);
    } else {
      this.showDefeatScreen();
    }
    
    await new Promise<void>((resolve) => {
      this.time.delayedCall(2000, resolve);
    });
    
    this.scene.start('LocationScene', { locationId: this.locationId });
  }
  
  private showVictoryScreen(loot?: unknown): void {
    const overlay = this.add.rectangle(450, 275, 900, 550, 0x000000, 0.7);
    const text = this.add.text(450, 250, '🏆 ПОБЕДА!', {
      fontSize: '48px',
      color: '#4ade80',
    }).setOrigin(0.5);
    
    if (loot) {
      this.add.text(450, 320, `Добыча: ${JSON.stringify(loot)}`, {
        fontSize: '18px',
        color: '#ffffff',
      }).setOrigin(0.5);
    }
  }
  
  private showDefeatScreen(): void {
    this.add.rectangle(450, 275, 900, 550, 0x000000, 0.7);
    this.add.text(450, 275, '💀 ПОРАЖЕНИЕ', {
      fontSize: '48px',
      color: '#ef4444',
    }).setOrigin(0.5);
  }
  
  private updateState(result: Partial<CombatState>): void {
    Object.assign(this.state, result);
  }
  
  private addLog(message: string): void {
    this.state.log.push(message);
    // Обновить UI лога
  }
  
  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const floatingText = this.add.text(x, y, text, {
      fontSize: '16px',
      color,
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => floatingText.destroy(),
    });
  }
  
  private disableButtons(): void {
    this.actionButtons.forEach(btn => btn.setAlpha(0.5));
  }
  
  private enableButtons(): void {
    this.actionButtons.forEach(btn => btn.setAlpha(1));
  }
  
  private createCombatLog(): void {
    // Лог боя внизу
    const logBox = this.add.rectangle(450, 530, 800, 40, 0x000000, 0.6);
  }
}
```

### 5.2 Чеклист Этапа 5

- [ ] Создать CombatScene
- [ ] Инициализация состояния боя
- [ ] Отображение бойцов
- [ ] HP/Ци бары
- [ ] Кнопки действий
- [ ] Анимации атак
- [ ] Ход врага
- [ ] Эффекты частиц
- [ ] Экран победы/поражения
- [ ] Интеграция с боевой системой

---

## 📦 Этап 6: Сцена медитации (День 9)

### 6.1 Медитация с эффектами

```typescript
// src/game/scenes/MeditationScene.ts

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';

interface MeditationSceneData {
  locationId: string;
  duration?: number; // Минуты
}

export class MeditationScene extends BaseScene {
  private locationId!: string;
  private duration: number = 60;
  private progress: number = 0;
  private qiGained: number = 0;
  private isComplete: boolean = false;
  
  constructor() {
    super({ key: 'MeditationScene' });
  }
  
  init(data: MeditationSceneData): void {
    this.locationId = data.locationId;
    this.duration = data.duration || 60;
  }
  
  create(): void {
    this.createMeditationBackground();
    this.createCharacter();
    this.createQiParticles();
    this.createProgressBar();
    this.createCancelButton();
    
    // Запуск медитации
    this.startMeditation();
  }
  
  private createMeditationBackground(): void {
    // Градиентный фон
    const graphics = this.add.graphics();
    
    // Создаём градиент
    for (let i = 0; i < 550; i++) {
      const alpha = 0.3 + (i / 550) * 0.3;
      graphics.fillStyle(0x1a1a4e, alpha);
      graphics.fillRect(0, i, 900, 1);
    }
    
    // Эффект "дыхания" фона
    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.8, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }
  
  private createCharacter(): void {
    // Персонаж в позе медитации
    const player = this.add.sprite(450, 350, 'player');
    player.setScale(3);
    
    // Лёгкое покачивание
    this.tweens.add({
      targets: player,
      y: 345,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Аура вокруг персонажа
    const aura = this.add.circle(450, 350, 80, 0x3b82f6, 0.2);
    
    this.tweens.add({
      targets: aura,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 2000,
      repeat: -1,
    });
  }
  
  private createQiParticles(): void {
    // Частицы Ци поднимаются вверх
    const particles = this.add.particles(450, 450, 'particle', {
      x: { min: -200, max: 200 },
      speed: { min: 50, max: 100 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.3, end: 0 },
      lifespan: 2000,
      quantity: 2,
      tint: [0x4ade80, 0x3b82f6, 0x8b5cf6],
      blendMode: 'ADD',
    });
  }
  
  private createProgressBar(): void {
    // Фон прогресс-бара
    this.add.rectangle(450, 100, 600, 30, 0x333333, 0.8);
    
    // Заполнение (обновляется в update)
    this.progressFill = this.add.rectangle(150, 100, 0, 26, 0x4ade80);
    
    // Текст времени
    this.timeText = this.add.text(450, 100, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Текст Ци
    this.qiText = this.add.text(450, 150, 'Ци: +0', {
      fontSize: '18px',
      color: '#4ade80',
    }).setOrigin(0.5);
  }
  
  private createCancelButton(): void {
    const cancelBtn = this.add.text(450, 500, '[ Прервать медитацию ]', {
      fontSize: '16px',
      color: '#ef4444',
    }).setOrigin(0.5);
    
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => this.cancelMeditation());
    cancelBtn.on('pointerover', () => cancelBtn.setColor('#f87171'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#ef4444'));
  }
  
  private async startMeditation(): Promise<void> {
    // Отправляем запрос на сервер
    const result = await this.bridge.startMeditation(this.locationId, this.duration);
    
    if (result.interrupted) {
      this.handleInterruption(result);
      return;
    }
    
    // Анимация прогресса
    const totalTime = this.duration * 60 * 1000; // В реальное время (ускорено для демо)
    const animTime = 5000; // 5 секунд для демо
    
    this.tweens.add({
      targets: this,
      progress: 1,
      duration: animTime,
      onUpdate: () => {
        this.updateProgress();
      },
      onComplete: () => {
        this.completeMeditation(result);
      },
    });
  }
  
  private updateProgress(): void {
    const width = 600 * this.progress;
    this.progressFill.width = width;
    
    const remainingMinutes = Math.ceil(this.duration * (1 - this.progress));
    this.timeText.setText(`${remainingMinutes} мин.`);
    
    this.qiGained = Math.floor(this.duration * 2 * this.progress);
    this.qiText.setText(`Ци: +${this.qiGained}`);
  }
  
  private async completeMeditation(result: unknown): Promise<void> {
    this.isComplete = true;
    
    // Эффект завершения
    this.cameras.main.flash(500, 100, 200, 255);
    
    // Показываем результат
    this.showResult(result);
    
    await new Promise<void>(resolve => {
      this.time.delayedCall(2000, resolve);
    });
    
    this.scene.start('LocationScene', { locationId: this.locationId });
  }
  
  private handleInterruption(result: { event: unknown }): void {
    // Показываем событие прерывания
    this.add.rectangle(450, 275, 900, 550, 0x000000, 0.7);
    
    this.add.text(450, 250, '⚠️ Медитация прервана!', {
      fontSize: '24px',
      color: '#fbbf24',
    }).setOrigin(0.5);
    
    // Опции
    // ...
  }
  
  private async cancelMeditation(): Promise<void> {
    if (this.isComplete) return;
    
    // Частичный результат
    const result = await this.bridge.cancelMeditation();
    
    this.showResult(result);
    
    await new Promise<void>(resolve => {
      this.time.delayedCall(1000, resolve);
    });
    
    this.scene.start('LocationScene', { locationId: this.locationId });
  }
  
  private showResult(result: unknown): void {
    // Показываем итоги
  }
}
```

### 6.2 Чеклист Этапа 6

- [ ] Создать MeditationScene
- [ ] Визуальные эффекты (частицы, аура)
- [ ] Прогресс-бар
- [ ] Анимация накопления Ци
- [ ] Обработка прерываний
- [ ] Кнопка отмены
- [ ] Интеграция с qi-system

---

## 📦 Этап 7: Game Bridge Service (День 10)

### 7.1 Мост между Phaser и API

```typescript
// src/services/game-bridge.service.ts

import Phaser from 'phaser';
import { db } from '@/lib/db';

export interface CombatResult {
  victory: boolean;
  damage: number;
  qiSpent: number;
  loot?: unknown;
  combatEnd: boolean;
}

export interface MeditationResult {
  qiGained: number;
  fatigueReduced: number;
  interrupted: boolean;
  event?: unknown;
}

class GameBridge {
  private static instance: GameBridge;
  private game: Phaser.Game | null = null;
  private sessionId: string | null = null;
  private characterId: string | null = null;
  
  private constructor() {}
  
  static getInstance(): GameBridge {
    if (!GameBridge.instance) {
      GameBridge.instance = new GameBridge();
    }
    return GameBridge.instance;
  }
  
  // === Инициализация ===
  
  setGame(game: Phaser.Game): void {
    this.game = game;
  }
  
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
  
  setCharacterId(characterId: string): void {
    this.characterId = characterId;
  }
  
  // === Данные ===
  
  async getLocations(): Promise<Location[]> {
    const response = await fetch(`/api/map/locations?sessionId=${this.sessionId}`);
    return response.json();
  }
  
  async getLocation(locationId: string): Promise<Location> {
    const response = await fetch(`/api/location/${locationId}`);
    return response.json();
  }
  
  async getCharacter(): Promise<Character> {
    const response = await fetch(`/api/character/${this.characterId}`);
    return response.json();
  }
  
  async getNPCs(locationId: string): Promise<NPC[]> {
    const response = await fetch(`/api/npcs?locationId=${locationId}`);
    return response.json();
  }
  
  // === Действия ===
  
  async sendAction(action: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message: action,
      }),
    });
    
    const data = await response.json();
    return data.response.content;
  }
  
  async startMeditation(locationId: string, duration: number): Promise<MeditationResult> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message: `медитировать ${duration} минут`,
      }),
    });
    
    const data = await response.json();
    return {
      qiGained: data.response.characterState?.currentQi || 0,
      fatigueReduced: data.response.characterState?.fatigue || 0,
      interrupted: data.response.type === 'interruption',
      event: data.response.interruption,
    };
  }
  
  async cancelMeditation(): Promise<Partial<MeditationResult>> {
    // Прерывание медитации
    return { qiGained: 0, interrupted: true };
  }
  
  // === Бой ===
  
  async initCombat(enemyId: string): Promise<CombatState> {
    const response = await fetch('/api/combat/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: this.characterId,
        enemyId,
      }),
    });
    
    return response.json();
  }
  
  async executeCombatAction(action: string): Promise<CombatResult> {
    const response = await fetch('/api/combat/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: this.characterId,
        action,
      }),
    });
    
    return response.json();
  }
  
  async getEnemyAction(): Promise<CombatResult> {
    const response = await fetch('/api/combat/enemy-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: this.characterId,
      }),
    });
    
    return response.json();
  }
  
  // === Навигация ===
  
  setCurrentLocation(locationId: string): void {
    this.game?.events.emit('location-changed', locationId);
  }
  
  goToScene(sceneName: string, data?: object): void {
    this.game?.scene.start(sceneName, data);
  }
  
  toggleChat(): void {
    this.game?.events.emit('toggle-chat');
  }
  
  // === События ===
  
  on(event: string, callback: (...args: unknown[]) => void): void {
    this.game?.events.on(event, callback);
  }
  
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.game?.events.off(event, callback);
  }
  
  emit(event: string, data?: unknown): void {
    this.game?.events.emit(event, data);
  }
}

export const gameBridge = GameBridge.getInstance();
```

### 7.2 Чеклист Этапа 7

- [ ] Создать GameBridge singleton
- [ ] Методы для работы с API
- [ ] Управление сценами
- [ ] События для связи с React
- [ ] Обработка ошибок

---

## 📦 Этап 8: Интеграция с React UI (Дни 11-12)

### 8.1 Главная страница

```typescript
// src/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { GameContainer } from '@/components/game/GameContainer';
import { StatsPanel } from '@/components/panels/StatsPanel';
import { InventoryPanel } from '@/components/panels/InventoryPanel';
import { TechniquesPanel } from '@/components/panels/TechniquesPanel';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { gameBridge } from '@/services/game-bridge.service';

export default function GamePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [activePanel, setActivePanel] = useState<'stats' | 'inventory' | 'techniques' | 'chat'>('stats');
  
  useEffect(() => {
    // Загрузка или создание сессии
    initSession();
    
    // Подписка на события
    gameBridge.on('state-updated', (state) => {
      setCharacter(prev => ({ ...prev, ...state }));
    });
  }, []);
  
  async function initSession() {
    const saved = localStorage.getItem('sessionId');
    if (saved) {
      setSessionId(saved);
      gameBridge.setSessionId(saved);
      
      const char = await gameBridge.getCharacter();
      setCharacter(char);
      gameBridge.setCharacterId(char.id);
    } else {
      // Создание новой сессии
      const response = await fetch('/api/game/start', {
        method: 'POST',
        body: JSON.stringify({ name: 'Игрок' }),
      });
      const data = await response.json();
      
      setSessionId(data.sessionId);
      gameBridge.setSessionId(data.sessionId);
      gameBridge.setCharacterId(data.character.id);
      setCharacter(data.character);
      
      localStorage.setItem('sessionId', data.sessionId);
    }
  }
  
  if (!sessionId) {
    return <LoadingScreen />;
  }
  
  return (
    <main className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Основная игровая область */}
        <div className="flex-1 p-4">
          <GameContainer 
            sessionId={sessionId}
            onStateChange={(state) => setCharacter(prev => ({ ...prev, ...state }))}
          />
        </div>
        
        {/* Боковая панель */}
        <div className="w-80 border-l border-border flex flex-col">
          {/* Переключатель панелей */}
          <div className="flex border-b border-border">
            {(['stats', 'inventory', 'techniques', 'chat'] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2 text-sm ${
                  activePanel === panel 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                {panel === 'stats' && '📊'}
                {panel === 'inventory' && '🎒'}
                {panel === 'techniques' && '⚔️'}
                {panel === 'chat' && '💬'}
              </button>
            ))}
          </div>
          
          {/* Контент панели */}
          <div className="flex-1 overflow-auto">
            {activePanel === 'stats' && <StatsPanel character={character} />}
            {activePanel === 'inventory' && <InventoryPanel sessionId={sessionId} />}
            {activePanel === 'techniques' && <TechniquesPanel characterId={character?.id} />}
            {activePanel === 'chat' && <ChatPanel sessionId={sessionId} />}
          </div>
        </div>
      </div>
    </main>
  );
}
```

### 8.2 Чеклист Этапа 8

- [ ] Обновить главную страницу
- [ ] Интегрировать GameContainer
- [ ] Связать React UI с Phaser
- [ ] Сохранение сессии
- [ ] Адаптивный дизайн

---

## 📦 Этап 9: Ассеты и полировка (День 13)

### 9.1 Минимальный набор ассетов

```
public/assets/
├── sprites/
│   ├── player.png         # 32x32
│   ├── npc.png            # 32x32
│   ├── enemy.png          # 32x32
│   ├── location-marker.png # 48x48
│   └── particle.png       # 8x8
│
├── tiles/
│   └── (для будущих карт)
│
└── ui/
    ├── button.png
    └── panel.png
```

### 9.2 Источники ассетов

1. **Kenney.nl** — бесплатные ассеты (CC0)
2. **OpenGameArt.org** — спрайты персонажей
3. **Game-icons.net** — иконки для UI
4. **Самодельные** — простые геометрические формы

### 9.3 Чеклист Этапа 9

- [ ] Создать/скачать базовые спрайты
- [ ] Оптимизировать размеры
- [ ] Добавить fallback (эмодзи)
- [ ] Тестирование на разных разрешениях

---

## 📊 Итоговый чеклист

### Этап 1: Подготовка ✅
- [ ] Установить Phaser
- [ ] Создать структуру папок
- [ ] Настроить TypeScript

### Этап 2: Базовый Setup ✅
- [ ] game.config.ts
- [ ] BaseScene.ts
- [ ] GameContainer.tsx

### Этап 3: Карта мира ✅
- [ ] BootScene
- [ ] WorldScene
- [ ] Маркеры локаций

### Этап 4: Локация ✅
- [ ] LocationScene
- [ ] NPC и ресурсы
- [ ] Меню действий

### Этап 5: Бой ✅
- [ ] CombatScene
- [ ] HP/Ци бары
- [ ] Анимации

### Этап 6: Медитация ✅
- [ ] MeditationScene
- [ ] Эффекты частиц
- [ ] Прогресс-бар

### Этап 7: Game Bridge ✅
- [ ] API интеграция
- [ ] Управление сценами
- [ ] События

### Этап 8: React UI ✅
- [ ] Главная страница
- [ ] Панели
- [ ] Связь с Phaser

### Этап 9: Ассеты ✅
- [ ] Спрайты
- [ ] UI элементы
- [ ] Оптимизация

---

## 📈 Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Визуальный интерфейс | Текст | 2D графика |
| Интерактивность | Низкая | Высокая |
| Размер бандла | ~500 KB | ~2 MB |
| Время отклика | 2-5 сек | 0.1-0.5 сек (локально) |
| Погружение | Среднее | Высокое |

---

## 🚀 Следующие шаги после миграции

1. **Тайловые карты** — интеграция Tiled для больших миров
2. **Анимации персонажей** — ходьба, атаки, медитация
3. **Звуки** — фоновая музыка, эффекты
4. **Мультиплеер** — WebSocket синхронизация
5. **Мобильная версия** — touch управление

---

*Документ создан: 2026-02-25*
*Ветка: main2D*
