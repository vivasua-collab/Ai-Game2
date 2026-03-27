# ДИАГНОЗ: NPC НЕ ДВИГАЮТСЯ

**Дата:** 2026-03-26
**Статус:** 🔵 ДИАГНОСТИКА В ПРОЦЕССЕ

---

## 🔄 ИЗМЕНЕНИЯ В ВЕРСИИ c1c138f

### Добавлено debug логирование:

1. **`src/app/api/ai/tick/route.ts`**:
   - Логирование состояния `location.playerIds` до/после добавления игрока
   - Логирование количества NPC в `worldState.npcs.size`
   - Использование `npcWorldManager` из `npcAIManager` (единый singleton)

2. **`src/lib/game/ai/server/npc-ai-manager.ts`**:
   - Подробное логирование в `findNearbyPlayers()`
   - Логирование выполнения действий в `executeAction()`

3. **`src/lib/game/ai/client/ai-polling-client.ts`**:
   - Включён debug режим по умолчанию

4. **`src/app/api/ai/events/route.ts`**:
   - Исправлен импорт `TruthSystem` вместо `getTruthSystem`

---

## 🔴 КОРНЕВЫЕ ПРИЧИНЫ (ИДЕНТИФИЦИРОВАНЫ)

### Причина #1: Разные singleton в Next.js dev mode

**Проблема:**
- `route.ts` использует `getNPCWorldManager()` - один singleton
- `npcAIManager` использует `this.npcWorldManager = getNPCWorldManager()` - другой singleton
- В dev mode это РАЗНЫЕ объекты!

**Исправлено:**
```typescript
// route.ts - используем npcWorldManager ИЗ npcAIManager
const npcWorldManager = (npcAIManager as any).npcWorldManager;
```

### Причина #2: Ошибка компиляции в /api/ai/events

**Проблема:**
```typescript
import { getTruthSystem } from '@/lib/game/truth-system';
// getTruthSystem не существует!
```

**Исправлено:**
```typescript
import { TruthSystem } from '@/lib/game/truth-system';
const truthSystem = TruthSystem.getInstance();
```

---

## 🎯 СИМПТОМЫ

1. ✅ NPC видны на экране
2. ✅ NPC получают урон от удара рукой
3. ❌ **NPC НЕ ДВИГАЮТСЯ** ← В процессе исправления
4. ❌ **NPC НЕ РЕАГИРУЮТ на урон** ← В процессе исправления

---

## 📋 ДИАГНОСТИКА: РЕЗУЛЬТАТЫ ТЕСТОВ

### Тест /api/temp-npc
- ✅ Возвращает 4 NPC для sessionId `cmn5s3fco0002p7zwk4zqd14n`
- ✅ locationId = `training_ground`
- ✅ Позиции NPC заданы

### Тест /api/ai/tick
- ❌ `totalNPCs: 0` - NPC НЕ загружены в WorldManager!
- Причина: `loadNPCsToWorldManager()` не находит NPC

---

## 🔧 СЛЕДУЮЩИЕ ШАГИ

1. **Перезапустить dev сервер** - чтобы кэш обновился
2. **Протестировать снова** - запустить `node scripts/test-ai-tick.mjs`
3. **Проверить логи** - убедиться что NPC загружаются

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [ ] NPC загружаются в WorldManager (`totalNPCs > 0`)
- [ ] NPC активируются при приближении игрока
- [ ] NPC двигаются (chase, patrol)
- [ ] NPC реагируют на урон

---

*Документ обновлён: 2026-03-26*
*Коммит: c1c138f*
*Статус: Debug логирование добавлено, требуется перезапуск сервера*
