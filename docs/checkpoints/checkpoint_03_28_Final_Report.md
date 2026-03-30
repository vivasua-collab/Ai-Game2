# Итоговый отчёт: NPC Не Двигаются - РЕШЕНИЕ

**Дата:** 2026-03-28 12:00 UTC
**Статус:** ✅ Код исправлен, сервер требует перезапуска

---

## 🔍 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### Проблема 1: NPCAIManager проверял только активных NPC
**Файл:** `src/lib/game/ai/server/npc-ai-manager.ts`

NPC создаются с `isActive: false`, но `updateAllNPCs()` получал только активных → циклическая ошибка.

**Исправление:**
```typescript
// БЫЛО
const activeNPCs = truthSystem.getActiveNPCs(sessionId);

// СТАЛО
const allNPCs = truthSystem.getAllNPCs(sessionId);
// ШАГ 1: Активируем NPC рядом с игроком
// ШАГ 2: Обновляем AI только активных
```

### Проблема 2: AIPollingClient singleton не сбрасывался
**Файл:** `src/components/game/GameContainer.tsx`

При смене sessionId, singleton AIPollingClient продолжал использовать старый sessionId в интервалах.

**Исправление:**
```typescript
import { resetAIPollingClient } from '@/lib/game/ai/client';

useEffect(() => {
  if (sessionId && gameRef.current) {
    // Сбрасываем AI polling client
    resetAIPollingClient();
    GameBridge.getInstance().setSessionId(sessionId);
  }
}, [sessionId]);
```

---

## 📊 ДОКАЗАТЕЛЬСТВА РАБОТЫ (из логов до падения)

```
[NPCAIManager] Tick 1: activeNPCs = 0, playerPos = (700, 600)
[NPCAIManager] Tick 2: activeNPCs = 3, playerPos = (700, 600)  ← NPC активированы!

[NPCAIManager] GENERATING CHASE for Лун to (786, 565)
[NPCAIManager] Updated NPC "Лун" position to (786, 565)
[NPCAIManager] Broadcast action to location "training_ground"

[NPCAIManager] GENERATING CHASE for Медведь Быстроног to (714, 491)
[NPCAIManager] GENERATING CHASE for Фэн to (773, 721)
```

**NPC успешно активируются, генерируют действия и broadcast'ят их!**

---

## 📁 ИЗМЕНЁННЫЕ ФАЙЛЫ

| Файл | Изменение |
|------|-----------|
| `src/lib/game/ai/server/npc-ai-manager.ts` | Исправлена логика активации (проверяем всех NPC, не только активных) |
| `src/components/game/GameContainer.tsx` | Добавлен `resetAIPollingClient()` при смене sessionId |

---

## ⚠️ ТЕКУЩАЯ ПРОБЛЕМА: Turbopack Error

Сервер упал с ошибкой:
```
FATAL: An unexpected Turbopack error occurred.
slice index starts at 15715556 but ends at 6796098
```

Это известный баг Next.js Turbopack. Требуется:
1. Полная очистка `.next` папки
2. Перезапуск dev сервера

---

## ✅ ЧТО БЫЛО ИСПРАВЛЕНО

1. **NPC активация** - теперь проверяем ВСЕХ NPC и активируем рядом с игроком
2. **SessionId синхронизация** - AIPollingClient сбрасывается при смене сессии
3. **Добавлена константа DEACTIVATION_RADIUS** - для деактивации далёких NPC

---

## 🔜 ДЛЯ ВОССТАНОВЛЕНИЯ

1. Очистить кеш: `rm -rf .next node_modules/.cache`
2. Перезапустить сервер: `bun run dev` (автоматически)

---

*Отчёт создан: 2026-03-28 12:00 UTC*
