# Work Log

---
Task ID: 2
Agent: Main Agent
Task: Обновление документации системы тела с механикой Qi Buffer 90%

Work Log:
- Обновлён docs/body_review.md до v4.1:
  - Механика Qi Buffer: сырая Ци поглощает только 90% урона
  - 10% ВСЕГДА пробивается в броню/HP
  - Новая функция processQiDamage() с параметром rawQiAbsorptionPercent
  - Обновлены таблицы с колонкой "Пробитие/удар"
  - Обновлён пример боя L8 vs L9 техники
- Обновлён docs/body_armor.md до v3.0:
  - Броня теперь ОБЯЗАТЕЛЬНА для всех уровней
  - L8 без брони: паралич торса за 1 удар L9 техники
  - L8 с бронёй: паралич за 2 удара (+100% выживаемости)
  - Щитовая техника: 0 урона (100% vs 90%)
  - Обновлён порядок слоёв защиты
- Созданы чекпоинты:
  - docs/checkpoints/checkpoint_03_22.md — основной план
  - docs/checkpoints/checkpoint_03_22_Body_update.md — детальный план внедрения

Stage Summary:
- Механика Qi Buffer 90% документирована
- Ключевой вывод: Щитовая техника = жизнь, Броня = страховка
- L8 vs L9: сырая Ци → 3,932 урона/удар, щит → 0 урона
- Броня даёт +1 удар до паралича = критическая разница
- План реализации: 10-14 часов работы
- Коммиты готовы к пушу на GitHub

---
Task ID: 1
Agent: Main Agent
Task: Исправление формулы qiCost в генераторе техник V2

Work Log:
- Проанализирована документация docs/technique-system-v2.md
- Обнаружено расхождение: в коде использовалась формула `qiCost = 10 × 1.5^(level-1)`, которая не соответствует документации
- Изучены разделы 2.1 и 6.1 документации
- Исправлена формула в technique-generator-config-v2.ts:
  - `qiCost = baseCapacity(type) × 2^(level-1)`
  - Для cultivation: qiCost = 0
- Обновлён генератор technique-generator-v2.ts:
  - baseDamage теперь вычисляется из capacity (не из qiCost)
  - Убраны неиспользуемые импорты GRADE_QI_COST_MULTIPLIERS
  - Обновлён интерфейс GeneratedTechniqueV2
  - Добавлены поля qiCost, minLevel, maxLevel, fatigueCost в интерфейс
- Исправлен скрипт scripts/generate-techniques.ts (убран require())
- Выполнена регенерация 121 техники

Stage Summary:
- Формула qiCost: `baseCapacity(type) × 2^(level-1)`
- Формула capacity: `baseCapacity × 2^(level-1) × masteryBonus`
- Формула damage: `capacity × gradeMult`
- Все проверки пройдены успешно
- Пример L3 melee_strike: qiCost=256, damage(refined)=307
- Пример L9 melee_strike: qiCost=16384, damage(common)=16384
- Cultivation: qiCost=0, capacity=null (пассивная техника)
- Техники сохранены в presets/techniques/
