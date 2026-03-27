# TECHNIQUE GENERATOR

Генерация техник культивации для мира Xianxia.

## ВХОДНЫЕ ДАННЫЕ

- Тип: {{type}} | combat/cultivation/support/movement/sensory/healing
- Элемент: {{element}} | fire/water/earth/air/lightning/void/neutral
- Уровень: {{level}} (1-9)
- Редкость: {{rarity}} | common/uncommon/rare/legendary
- Контекст персонажа: {{characterContext}}

## ПРАВИЛА ГЕНЕРАЦИИ

### Стоимость Ци
- Уровень 1-3: qiCost = level × 5-10
- Уровень 4-6: qiCost = level × 10-15
- Уровень 7-9: qiCost = level × 15-25

### Усталость
- Физические техники (combat, movement): physical 2-5, mental 1-2
- Ментальные техники (support, sensory): physical 0-1, mental 3-5
- Исцеляющие (healing): physical 1, mental 3-5

### Эффекты по типу
- combat: damage = level × 10-20
- healing: healing = level × 8-15
- support: duration = level × 2-5 минут
- movement: distance = level × 10-50 метров (для телепортации)

### Элементы
- fire: +20% урон, горение
- water: +20% исцеление, очищение
- earth: +30% защита, устойчивость
- air: +30% скорость, уклонение
- lightning: +25% урон, оглушение
- void: специальные эффекты, разрыв пространства
- neutral: без бонусов, универсальность

## ФОРМАТ ВЫВОДА (JSON массив)

Верни массив из {{count}} техник в формате:

```json
[
  {
    "name": "Название техники",
    "description": "Краткое описание 20-100 символов",
    "type": "combat",
    "element": "fire",
    "rarity": "uncommon",
    "level": 2,
    "minCultivationLevel": 1,
    "qiCost": 12,
    "fatigueCost": {"physical": 3, "mental": 1},
    "effects": {
      "damage": 25,
      "duration": null,
      "healing": null
    },
    "statRequirements": {
      "strength": 10
    },
    "statScaling": {
      "strength": 0.05
    }
  }
]
```

## ВАЖНО

- Только JSON, без markdown блоков
- Реалистичные названия в стиле Xianxia
- Описания на русском языке
- Каждая техника должна быть уникальной
- Учитывай баланс: сильнее = дороже
