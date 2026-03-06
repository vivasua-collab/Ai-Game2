# 🎨 План упрощения спрайтов персонажей

**Версия:** 1.0.0  
**Дата:** 2026-03-04  
**Статус:** 📋 Планирование

---

## 📌 Концепция: "Восток-Запад"

### Проблема
Текущая система требует **8 направлений** спрайтов:
- S, SW, W, NW, N, NE, E, SE (8 фреймов)
- Сложность рисования ×8
- Большой размер текстур
- Трудно добавлять анимации

### Решение
Упрощение до **2 направлений** с отзеркаливанием:
- **"Запад"** — персонаж смотрит влево (1 спрайт)
- **"Восток"** — отзеркаливание "Запад" (flipX)

### Выгода
| Метрика | Было (8 dir) | Стало (2 dir) | Экономия |
|---------|-------------|---------------|----------|
| Фреймы | 8 | 1 | **87.5%** |
| Размер текстуры | 512×64 | 64×64 | **87.5%** |
| Сложность рисования | ×8 | ×1 | **87.5%** |
| Анимации (idle, walk, attack) | ×8 каждый | ×1 каждый | **87.5%** |

---

## 🎯 Принцип работы

```
                    Вертикальная граница
                           │
                           │
          "Запад"          │          "Восток"
         (левая сторона)   │    (правая сторона)
                           │
                           │
            ◀─────         │         ─────▶
           спрайт          │       спрайт.flipX
         (оригинал)        │      (отзеркален)
```

### Логика отображения
```typescript
// Угол направления игрока
const angle = Math.atan2(mouseY - playerY, mouseX - playerX);

// Определяем сторону
if (angle >= -Math.PI/2 && angle <= Math.PI/2) {
  // Правая сторона (Восток) — отзеркалить
  sprite.setFlipX(true);
} else {
  // Левая сторона (Запад) — оригинал
  sprite.setFlipX(false);
}
```

### Визуальная граница
```
        N (вверх)
          │
          │
    ┌─────┼─────┐
    │     │     │
 W  │  ◀  │  ▶  │  E
    │     │     │
    └─────┼─────┘
          │
          │
        S (вниз)

Всё слева от вертикали = спрайт "Запад" (оригинал)
Всё справа от вертикали = спрайт "Восток" (flipX)
```

---

## 📋 План внедрения

### Этап 1: Создание нового генератора (1 день)

#### 1.1 Новая функция `createSimpleDirectionalSprite()`
**Файл:** `src/game/services/sprite-loader.ts`

```typescript
/**
 * Создать упрощённый спрайт персонажа (1 направление)
 * Второе направление получается через sprite.setFlipX(true)
 */
export function createSimpleDirectionalSprite(
  scene: Phaser.Scene,
  level: number = 1,
  pose: 'idle' | 'walk' | 'attack' = 'idle'
): void {
  const frameSize = 64;
  const themeConfig = getCultivationThemeConfig(level);
  const glowColor = themeConfig.color;
  
  const canvas = document.createElement('canvas');
  canvas.width = frameSize;
  canvas.height = frameSize;
  const ctx = canvas.getContext('2d')!;
  
  // Рисуем персонажа смотрящим ВЛЕВО ("Запад")
  drawCharacterProfile(ctx, 32, 32, 'left', level, pose, glowColor);
  
  // Добавляем текстуру
  scene.textures.addCanvas(`player_${pose}`, canvas);
}
```

#### 1.2 Функция отрисовки профиля
```typescript
function drawCharacterProfile(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  facing: 'left' | 'right',
  level: number,
  pose: 'idle' | 'walk' | 'attack',
  glowColor: number
): void {
  // Персонаж в профиль (смотрит влево)
  // При facing='right' — отзеркаливаем весь рисунок
  
  ctx.save();
  if (facing === 'right') {
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
  }
  
  // === ТЕЛО ===
  // Роба культиватора
  ctx.fillStyle = '#1a3d2e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // === ГОЛОВА ===
  ctx.fillStyle = '#f5deb3';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 20, 10, 0, Math.PI * 2); // Смещение влево (профиль)
  ctx.fill();
  
  // Волосы
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 22, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  
  // Пучок волос
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 32, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // === ЛИЦО (только для левого направления) ===
  // Глаз
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 21, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // === РУКИ ===
  const armAngle = pose === 'attack' ? -0.3 : 0.2;
  ctx.strokeStyle = '#1a3d2e';
  ctx.lineWidth = 4;
  
  // Передняя рука
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 5);
  ctx.lineTo(cx - 20, cy + 5 + (pose === 'walk' ? 3 : 0));
  ctx.stroke();
  
  // === НОГИ ===
  ctx.strokeStyle = '#1a3d2e';
  ctx.lineWidth = 6;
  
  const legOffset = pose === 'walk' ? 5 : 0;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 15);
  ctx.lineTo(cx - 8 - legOffset, cy + 30);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy + 15);
  ctx.lineTo(cx + 6 + legOffset, cy + 30);
  ctx.stroke();
  
  // === ЦИ СИЯНИЕ ===
  ctx.strokeStyle = `rgba(${(glowColor >> 16) & 255}, ${(glowColor >> 8) & 255}, ${glowColor & 255}, 0.3)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}
```

---

### Этап 2: Модификация PhaserGame (1 день)

#### 2.1 Обновление preload()
**Файл:** `src/components/game/PhaserGame.tsx`

```typescript
preload(this: Phaser.Scene) {
  const scene = this as Phaser.Scene;
  const cultivationLevel = globalCharacter?.cultivationLevel || 1;
  
  // ИСПРАВЛЕНО: Создаём только 1 спрайт (смотрит влево)
  createSimpleDirectionalSprite(scene, cultivationLevel, 'idle');
  createSimpleDirectionalSprite(scene, cultivationLevel, 'walk');
  createSimpleDirectionalSprite(scene, cultivationLevel, 'attack');
}
```

#### 2.2 Обновление логики направления
```typescript
// БЫЛО: 8 направлений
const frameIndex = angleToDirectionFrame(rotation);
player.setFrame(frameIndex);

// СТАЛО: 2 направления с отзеркаливанием
function updatePlayerDirection(player: Phaser.GameObjects.Sprite, rotation: number) {
  // rotation: 0° = вправо, 90° = вниз, 180° = влево, -90° = вверх
  
  // Нормализуем угол
  const normalized = ((rotation % 360) + 360) % 360;
  
  // Определяем: правая или левая половина
  // Правая: 270° - 90° (или -90° - 90°)
  // Левая: 90° - 270°
  
  const isRightSide = normalized < 90 || normalized > 270;
  
  player.setFlipX(isRightSide);
}
```

#### 2.3 Смена поз (анимации)
```typescript
// Состояние: idle, walk, attack
let currentPose = 'idle';

function updatePose() {
  const speed = Math.abs(velocityX) + Math.abs(velocityY);
  
  if (isAttacking) {
    currentPose = 'attack';
  } else if (speed > 10) {
    currentPose = 'walk';
  } else {
    currentPose = 'idle';
  }
  
  player.setTexture(`player_${currentPose}`);
  player.setFlipX(isLookingRight);
}
```

---

### Этап 3: Анимации (2 дня)

#### 3.1 Структура спрайт-листа для анимаций
```
idle: 4 фрейма (дыхание)
walk: 6 фреймов (шаги)
attack: 4 фрейма (удар)
```

#### 3.2 Генератор анимированных спрайтов
```typescript
export function createAnimatedSpriteSheet(
  scene: Phaser.Scene,
  level: number,
  animation: 'idle' | 'walk' | 'attack'
): void {
  const frameWidth = 64;
  const frameCount = animation === 'walk' ? 6 : 4;
  const sheetWidth = frameWidth * frameCount;
  
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = frameWidth;
  const ctx = canvas.getContext('2d')!;
  
  for (let i = 0; i < frameCount; i++) {
    const cx = i * frameWidth + frameWidth / 2;
    const cy = frameWidth / 2;
    
    // Смещения для анимации
    const bounce = animation === 'idle' ? Math.sin(i * Math.PI / 2) * 2 : 0;
    const legOffset = animation === 'walk' ? Math.sin(i * Math.PI / 3) * 5 : 0;
    const armOffset = animation === 'attack' ? Math.sin(i * Math.PI / 2) * 10 : 0;
    
    drawCharacterFrame(ctx, cx, cy, {
      bounce, legOffset, armOffset,
      facing: 'left',
      level,
      glowColor: getCultivationThemeConfig(level).color
    });
  }
  
  scene.textures.addCanvas(`player_${animation}`, canvas);
  
  // Добавляем фреймы в текстуру
  const texture = scene.textures.get(`player_${animation}`);
  for (let i = 0; i < frameCount; i++) {
    texture.add(i, 0, i * frameWidth, 0, frameWidth, frameWidth);
  }
}
```

#### 3.3 Создание анимаций в Phaser
```typescript
// В create()
scene.anims.create({
  key: 'player_idle',
  frames: scene.anims.generateFrameNumbers('player_idle', { start: 0, end: 3 }),
  frameRate: 6,
  repeat: -1
});

scene.anims.create({
  key: 'player_walk',
  frames: scene.anims.generateFrameNumbers('player_walk', { start: 0, end: 5 }),
  frameRate: 10,
  repeat: -1
});

scene.anims.create({
  key: 'player_attack',
  frames: scene.anims.generateFrameNumbers('player_attack', { start: 0, end: 3 }),
  frameRate: 12,
  repeat: 0
});

// В update()
if (isAttacking) {
  player.play('player_attack', true);
} else if (speed > 10) {
  player.play('player_walk', true);
} else {
  player.play('player_idle', true);
}

// ВАЖНО: После play() сохраняем flipX
player.setFlipX(isLookingRight);
```

---

### Этап 4: Интеграция с AI-спрайтами (опционально)

#### 4.1 Использование загруженных изображений
```typescript
// Если есть AI-сгенерированный спрайт
if (SPRITE_PATHS.player.profile) {
  scene.load.image('player_profile', SPRITE_PATHS.player.profile);
}

// В update()
// Просто меняем flipX в зависимости от направления
player.setFlipX(isLookingRight);
```

#### 4.2 Структура папок для AI-спрайтов
```
public/sprites/player/
├── profile_left.png      # Основной спрайт (смотрит влево)
├── idle/
│   ├── frame_0.png
│   ├── frame_1.png
│   ├── frame_2.png
│   └── frame_3.png
├── walk/
│   ├── frame_0.png
│   ├── ...
│   └── frame_5.png
└── attack/
    ├── frame_0.png
    ├── ...
    └── frame_3.png
```

---

## 📊 Сравнение подходов

| Характеристика | 8 направлений | 2 направления |
|----------------|---------------|---------------|
| **Фреймы на анимацию** | 8×4 = 32 | 1×4 = 4 |
| **Размер памяти** | ~512KB | ~64KB |
| **Время рисования** | 8× | 1× |
| **Качество поворота** | Идеально | Приемлемо |
| **Сложность кода** | Средняя | Низкая |
| **Подходит для** | Тактика | Экшен/RPG |

---

## 🗓️ Временные рамки

| Этап | Описание | Время | Приоритет |
|------|----------|-------|-----------|
| 1 | Новый генератор спрайтов | 1 день | 🔴 Высокий |
| 2 | Модификация PhaserGame | 1 день | 🔴 Высокий |
| 3 | Анимации (idle, walk, attack) | 2 дня | 🟡 Средний |
| 4 | Интеграция AI-спрайтов | 1 день | 🟢 Низкий |

**Итого:** 3-5 дней

---

## ✅ Критерии готовности

1. [ ] Спрайт персонажа отображается в профиле (смотрит влево)
2. [ ] При движении вправо спрайт отзеркаливается (flipX)
3. [ ] Граница переключения: вертикальная линия через центр игрока
4. [ ] Анимация idle работает (дыхание)
5. [ ] Анимация walk работает при движении
6. [ ] Анимация attack работает при атаке
7. [ ] Все анимации корректно отзеркаливаются

---

## 📝 Замечания

### Преимущества
- **Простота**: в 8 раз меньше работы художнику/ИИ
- **Память**: экономия 87.5% видеопамяти
- **Анимации**: легко добавить новые (idle, walk, attack, cast, death)
- **AI-генерация**: проще генерировать 1 позу чем 8

### Недостатки
- **Визуально**: персонаж всегда "в профиль" даже при движении вверх/вниз
- **Не подходит**: для тактических игр с точным направлением взгляда

### Решение недостатков
Для движений вверх/вниз можно добавить:
- Небольшой наклон спрайта в направлении движения
- Эффект перспективы (чуть уменьшать спрайт при движении вверх)

---

## 🎯 Рекомендация

**Принять план к реализации.**

Система "Восток-Запад" идеально подходит для:
- ✅ Экшен-игр
- ✅ RPG с видом сверху
- ✅ Быстрой разработки
- ✅ AI-генерации спрайтов

Не рекомендуется для:
- ❌ Тактических пошаговых игр
- ❌ Игр с критичной важностью направления взгляда

---

*Документ создан: 2026-03-04*
*Автор: Main Agent*
