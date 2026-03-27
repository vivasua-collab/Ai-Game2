# Чекпоинт: Базовое движение NPC

**Дата:** 2026-03-27
**Статус:** 🔧 В процессе
**Цель:** Заставить NPC двигаться по квадрату

---

## 🎯 Цель

Заставить NPC двигаться базовым образом:
- NPC в сцене с игроком двигаются
- NPC вне границ полигона - на паузе

---

## 📊 Диагностика

### Найденные проблемы:

1. **NPC не создавались на сервере при входе в локацию**
   - `LocationScene.loadNPCs()` загружал только существующих NPC
   - Не было вызова `/api/temp-npc?action=init`
   - **Исправлено:** Добавлена инициализация NPC на сервере

2. **Позиции генерировались случайно вместо серверных**
   - `spawnNPC()` игнорировал позиции с сервера
   - **Исправлено:** Теперь использует `npcData.position` или `npcData.x/y`

3. **TruthSystem singleton не работал между запросами**
   - `private static instance` не работает в Next.js Dev Mode с Turbopack
   - Каждый API route использовал свой инстанс
   - **Исправлено:** Используем `globalThis` для singleton

4. **addNPC требовал загруженную сессию**
   - Если сессия не загружена - NPC не добавлялись
   - **Исправлено:** `addNPC` теперь асинхронный и загружает сессию автоматически

---

## 📁 Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `src/game/scenes/LocationScene.ts` | Добавлена инициализация NPC на сервере |
| `src/game/scenes/LocationScene.ts` | `spawnNPC()` использует позиции с сервера |
| `src/lib/game/truth-system.ts` | Singleton через `globalThis` |
| `src/lib/game/truth-system.ts` | `addNPC()` асинхронный, загружает сессию |
| `src/lib/game/session-npc-manager.ts` | Проверка результата `addNPC()` |

---

## 🧪 Тестирование

### curl тесты:

```bash
# 1. Инициализация NPC
curl -X POST http://localhost:3000/api/temp-npc \
  -H "Content-Type: application/json" \
  -d '{"action":"init","sessionId":"SESSION_ID","locationId":"LOCATION_ID","config":"training_ground","playerLevel":1}'

# 2. AI tick
curl -X POST http://localhost:3000/api/ai/tick \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","playerX":400,"playerY":300}'
```

### Ожидаемый результат:
```json
{
  "success": true,
  "processedNPCs": 3,
  "stats": {
    "totalNPCs": 3,
    "activeNPCs": 3
  }
}
```

---

## ⚠️ Открытые проблемы

### 1. Singleton синхронизация

**Проблема:** Даже с `globalThis`, singleton может не работать правильно в Turbopack.

**Решение:**
- Вариант A: Отключить Turbopack для dev (`next dev` без `--turbopack`)
- Вариант B: Использовать Redis/MemoryStore для состояния
- Вариант C: Перезагружать страницу после изменений

### 2. Lint warnings

```
3 warnings (pre-existing, not related to NPC)
```

---

## 📋 Следующие шаги

1. [ ] Протестировать с отключенным Turbopack
2. [ ] Проверить что AI tick обрабатывает активных NPC
3. [ ] Добавить базовое движение (квадрат)
4. [ ] Добавить паузу для NPC вне полигона

---

## 📊 Метрики успеха

| Метрика | Значение | Статус |
|---------|----------|--------|
| NPC создаются | ✅ | Работает |
| NPC сохраняются в TruthSystem | ❓ | Нужно проверить |
| AI tick находит NPC | ❌ | 0 NPC |
| NPC двигаются | ❌ | Не тестировалось |

---

*Последнее обновление: 2026-03-27*
