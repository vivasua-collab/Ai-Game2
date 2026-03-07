# Упрощённая версия: Система временных NPC ("Статисты")

## 1) Назначение документа
- | Тип | Хранение | Примеры | Создание |
- |-----|----------|---------|----------|
- | **Персистентные** | База данных (Prisma NPC) | Руководство сект, квестовые NPC, именные персонажи | Через генератор с сохранением |
- | **Статисты** | Память сессии (Runtime) | Обычное население, монстры, второстепенные враги | Динамически при входе в локацию |

## 2) Ключевые темы
- Система временных NPC ("Статисты")
- Концепция
- Два типа NPC
- Жизненный цикл статиста
- Архитектура
- Текущая структура
- Новая структура
- Типы данных
- TempNPC Interface
- TempItem Interface
- Конфигурация локации
- LocationNPCConfig

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- Временный NPC (статист) - существует только в памяти
- Временный предмет (существует только у статиста)
- Конфигурация NPC для локации
- Хранится в Location.properties или отдельной таблице
- Менеджер временных NPC для сессии
- Хранит статистов в оперативной памяти
- Инициализация локации
- Генерирует статистов при входе игрока
- Генерация временного NPC
- Генерация экипировки для статиста
- Генерация быстрых слотов (расходники)
- Очистка локации при выходе

## 5) Псевдокод перехода на новый язык
```text
INIT context
READ rules from this document
FOR each section IN key_topics:
  MAP terms -> new_language_terms
  IMPLEMENT minimal equivalent
  VALIDATE with small test case
END
RETURN migration_notes
```

## 6) Что важно при переносе кода
- const villageConfig: LocationNPCConfig = {
- const wildernessConfig: LocationNPCConfig = {
- const sectConfig: LocationNPCConfig = {
- class SessionNPCManager {
- if (this.getLocationNPCs(sessionId, locationId).length > 0) {
- return this.getLocationNPCs(sessionId, locationId);
- const count = this.calculatePopulation(config);
- const npcs: TempNPC[] = [];
- for (let i = 0; i < count; i++) {
- const npc = await this.generateTempNPC(config, playerLevel);

> Источник: `/docs/random_npc.md`. Этот файл сформирован для быстрого чтения и миграции.
