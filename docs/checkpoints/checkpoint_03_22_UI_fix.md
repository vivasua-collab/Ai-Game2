# UI Fix: NPC Viewer JSON Parse Error

**Дата:** 22.03.2025
**Статус:** Исправлено

## Описание проблемы

При нажатии кнопки "Пересоздать" в диалоге просмотра NPC появлялась ошибка:
```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

## Анализ

### Поток выполнения

1. Пользователь нажимает "Пересоздать"
2. `handleRespawnSessionNPCs()` делает POST запрос к `/api/npc/spawn`
3. После успешного респавна вызывается `loadAllNPCs()`
4. `loadAllNPCs()` делает параллельные запросы:
   - `/api/generator/npc?action=list`
   - `/api/npc/spawn?action=presets`
   - `/api/npc/spawn?action=list&sessionId=${sessionId}`
5. Один из запросов возвращает не-JSON ответ (HTML ошибку или пустой ответ)
6. Вызов `.json()` на ответе падает с ошибкой

### Корневая причина

В функции `loadAllNPCs()` отсутствовала проверка `content-type` перед вызовом `.json()`. 

Если сервер возвращал ошибку (HTML страницу) или пустой ответ, попытка парсинга как JSON приводила к ошибке:
```javascript
const genData = await genRes.json();  // Ошибка если ответ не JSON
const presetData = await presetRes.json();
const sessionData = await sessionRes.json();
```

Примечательно, что в `handleRespawnSessionNPCs()` такая проверка уже была:
```javascript
const contentType = res.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await res.text();
  throw new Error('Server returned non-JSON response');
}
```

## Решение

Добавлена функция `safeParseJson()` с проверкой content-type:

```javascript
const safeParseJson = async (res: Response, name: string) => {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    console.error(`[NPCViewer] ${name} returned non-JSON:`, text.substring(0, 200));
    return null;
  }
  try {
    return await res.json();
  } catch (e) {
    console.error(`[NPCViewer] ${name} JSON parse error:`, e);
    return null;
  }
};
```

Также добавлены проверки на `null` для данных:
```javascript
if (genData?.success && genData.npcs) { ... }
if (presetData?.success && presetData.presets) { ... }
if (sessionData?.success && sessionData.npcs) { ... }
```

## Изменённые файлы

- `src/components/game/NPCViewerDialog.tsx`:
  - Добавлена функция `safeParseJson()`
  - Добавлены проверки `content-type` перед парсингом
  - Добавлены проверки на `null` для данных

## Результаты тестирования

- Lint: 0 errors, 3 warnings (pre-existing)
- Dev server: Запускается без ошибок

## Дополнительные замечания

Данное исправление касается только UI части. Оркестратор генерации NPC работает корректно. 

Если сервер возвращает HTML ошибку, это будет видно в консоли браузера с первыми 200 символами ответа, что поможет диагностировать проблемы на бэкенде.
