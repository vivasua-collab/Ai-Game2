# TECHNIQUE GENERATOR

Generate {{count}} cultivation techniques for Xianxia world.

## INPUT
- type: {{type}} | combat/cultivation/support/movement/sensory/healing
- element: {{element}} | fire/water/earth/air/lightning/void/neutral
- level: {{level}} | 1-9
- rarity: {{rarity}} | common/uncommon/rare/legendary
- characterContext: {{characterContext}}

## OUTPUT (JSON array only)
```json
[
  {
    "name": "string (3-30 chars)",
    "description": "string (20-100 chars)",
    "type": "string",
    "element": "string",
    "rarity": "common|uncommon|rare|legendary",
    "level": "number",
    "minCultivationLevel": "number",
    "qiCost": "number (level × 5-15)",
    "fatigueCost": { "physical": "0-5", "mental": "0-5" },
    "effects": { "damage"?: "n", "healing"?: "n", "duration"?: "n" },
    "statRequirements": { "strength"?: "n", "agility"?: "n", "intelligence"?: "n", "conductivity"?: "n" },
    "statScaling": { "strength"?: "0.01-0.1", "agility"?: "0.01-0.1", "intelligence"?: "0.01-0.1", "conductivity"?: "0.01-0.1" }
  }
]
```

## RULES
- Higher level = stronger effects, higher cost
- Elements affect flavor: fire=damage, water=healing, etc.
- Rarity affects power ceiling
- JSON array only, no markdown
