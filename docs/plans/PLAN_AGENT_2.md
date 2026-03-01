# Agent-2 Execution Plan

```yaml
agent:
  id: agent-2
  role: generator-and-ui
  dependencies: [agent-1]
  provides: [npc-generator, body-system, ui-panel, name-generator]
```

## PRE-EXECUTION: Read These Files

```
SEQUENTIAL_READ:
  1. /home/z/my-project/docs/body.md
  2. /home/z/my-project/docs/inventory-system.md
  3. /home/z/my-project/docs/equip.md
  4. /home/z/my-project/docs/npc-generator-plan.md
  5. /home/z/my-project/docs/plans/COORDINATION.md
  6. /home/z/my-project/src/lib/generator/technique-generator.ts
  7. /home/z/my-project/src/lib/game/body-system.ts
  8. /home/z/my-project/src/lib/generator/generated-objects-loader.ts
  9. /home/z/my-project/src/lib/generator/name-generator.ts
  10. /home/z/my-project/src/components/settings/TechniqueGeneratorPanel.tsx
```

## CRITICAL_RULE: NPC Inventory

```
RULE: NPC_INVENTORY_FROM_POOL
SOURCE: generatedObjectsLoader.loadObjects('consumables')
DO_NOT: generate new consumables for NPC
DO: select existing consumables filtered by level/type

IMPLEMENTATION:
```typescript
async function generateInventory(role: RolePreset, level: number, rng: () => number) {
  const consumables = await generatedObjectsLoader.loadObjects('consumables');
  const suitable = consumables.filter(c => 
    (c.level || 1) <= level &&
    (c.requirements?.cultivationLevel || 1) <= level
  );
  return weightedRandomSelect(suitable, count, rng);
}
```

## TASKS

### TASK-1.0: Create npc-generator.ts Structure

```
PRIORITY: critical
FILE: src/lib/generator/npc-generator.ts
TIME: 30min
DEPENDENCIES: none

EXPORTS:
```typescript
// Types
export interface NPCGenerationContext {
  locationId?: string;
  regionType?: string;
  sectId?: string;
  sectRole?: string;
  speciesType?: SpeciesType;
  roleType?: string;
  cultivationLevel?: number | Range;
  difficulty?: 'easy' | 'medium' | 'hard' | 'boss';
  seed?: number;
}

export interface GeneratedNPC {
  id: string;
  name: string;
  title?: string;
  age: number;
  gender: 'male' | 'female' | 'none';
  
  speciesId: string;
  roleId: string;
  
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
  };
  
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;
    currentQi: number;
    coreQuality: number;
  };
  
  bodyState: BodyState;
  
  personality: {
    traits: string[];
    motivation: string;
    dominantEmotion: string;
    disposition: number;
  };
  
  techniques: string[];
  equipment: Record<string, string | null>;
  inventory: Array<{ id: string; quantity: number }>;
  
  resources: {
    spiritStones: number;
    contributionPoints: number;
  };
  
  generationMeta: {
    seed: number;
    generatedAt: string;
    version: string;
  };
}

// Functions
export function generateNPC(context: NPCGenerationContext): GeneratedNPC;
export function generateNPCs(context: NPCGenerationContext, count: number): GeneratedNPC[];
export function generateNPCForSect(sectId: string, role: string, level?: Range): GeneratedNPC;
export function generateEnemy(difficulty: string, level: number): GeneratedNPC;
```
```

### TASK-1.1: Implement generateNPC Core

```
PRIORITY: critical
FILE: src/lib/generator/npc-generator.ts
TIME: 120min
DEPENDENCIES: [TASK-1.0, agent-1 TASK-1.*, agent-1 TASK-2.*]

IMPORTS:
```typescript
import { SPECIES_PRESETS, getSpeciesByType, getSpeciesById } from '@/data/presets/species-presets';
import { ROLE_PRESETS, getRolesByType, getRoleById } from '@/data/presets/role-presets';
import { PERSONALITY_PRESETS, getCompatiblePersonalities } from '@/data/presets/personality-presets';
import { generatedObjectsLoader } from './generated-objects-loader';
import { generateNPCName } from './name-generator';
import { createBodyForSpecies } from '@/lib/game/npc-body-system';
import { NPC_PREFIX } from './id-config';
```

IMPLEMENTATION_FLOW:
```
1. seededRandom(context.seed) -> rng function
2. selectSpecies(context, rng) -> species
3. selectRole(context, species, rng) -> role
4. generateStats(species, role, rng) -> stats
5. generateCultivation(species, role, context, rng) -> cultivation
6. createBodyForSpecies(species, cultivation.level) -> bodyState
7. selectPersonality(role, rng) -> personality
8. selectTechniques(role, cultivation.level, rng) -> techniques
9. selectEquipment(role, stats, cultivation.level, rng) -> equipment
10. generateInventory(role, cultivation.level, rng) -> inventory (FROM POOL!)
11. generateResources(role, rng) -> resources
12. generateNPCName(species, gender, rng) -> name
13. generateId(NPC_PREFIX) -> id
14. return GeneratedNPC
```

CODE_TEMPLATE:
```typescript
export function generateNPC(context: NPCGenerationContext): GeneratedNPC {
  const seed = context.seed ?? Date.now();
  const rng = seededRandom(seed);
  
  // 1. Species selection
  const species = selectSpecies(context, rng);
  
  // 2. Role selection
  const role = selectRole(context, species, rng);
  
  // 3. Stats
  const stats = {
    strength: randomInRange(species.baseStats.strength, rng) + (role.statModifiers?.strength || 0),
    agility: randomInRange(species.baseStats.agility, rng) + (role.statModifiers?.agility || 0),
    intelligence: randomInRange(species.baseStats.intelligence, rng) + (role.statModifiers?.intelligence || 0),
    vitality: randomInRange(species.baseStats.vitality, rng) + (role.statModifiers?.vitality || 0),
  };
  
  // 4. Cultivation
  const cultivation = generateCultivation(species, role, context, rng);
  
  // 5. Body
  const bodyState = createBodyForSpecies(species, cultivation.level);
  
  // 6. Personality
  const personality = selectPersonality(role, rng);
  
  // 7. Techniques (async wrapper)
  const techniques = selectTechniquesSync(role, cultivation.level, rng);
  
  // 8. Equipment
  const equipment = selectEquipmentSync(role, stats, cultivation.level, rng);
  
  // 9. Inventory (FROM POOL - see CRITICAL_RULE)
  // Note: In sync context, use cached loader
  
  // 10. Resources
  const resources = {
    spiritStones: role.resources.spiritStones 
      ? randomInRange(role.resources.spiritStones, rng) 
      : 0,
    contributionPoints: role.resources.contributionPoints 
      ? randomInRange(role.resources.contributionPoints, rng) 
      : 0,
  };
  
  // 11. Name
  const gender = rng() > 0.5 ? 'male' : 'female';
  const name = generateNPCName(species, gender, rng);
  
  // 12. ID
  const id = `${NPC_PREFIX}_${generateCounter()}`;
  
  return {
    id,
    name,
    age: Math.floor(rng() * 100 + 15),
    gender,
    speciesId: species.id,
    roleId: role.id,
    stats,
    cultivation,
    bodyState,
    personality,
    techniques,
    equipment,
    inventory: [], // Will be populated by async wrapper
    resources,
    generationMeta: {
      seed,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}
```
```

### TASK-1.2: Implement Selection Functions

```
PRIORITY: critical
FILE: src/lib/generator/npc-generator.ts
TIME: 60min
DEPENDENCIES: TASK-1.1

FUNCTIONS:
```typescript
function selectSpecies(context: NPCGenerationContext, rng: () => number): SpeciesPreset {
  if (context.speciesType) {
    const candidates = getSpeciesByType(context.speciesType);
    return candidates[Math.floor(rng() * candidates.length)];
  }
  return SPECIES_PRESETS[Math.floor(rng() * SPECIES_PRESETS.length)];
}

function selectRole(context: NPCGenerationContext, species: SpeciesPreset, rng: () => number): RolePreset {
  if (context.roleType) {
    const role = getRoleById(context.roleType);
    if (role) return role;
  }
  
  const candidates = ROLE_PRESETS.filter(r => 
    !r.requirements.speciesType || 
    r.requirements.speciesType.includes(species.type)
  );
  
  return candidates[Math.floor(rng() * candidates.length)];
}

function selectPersonality(role: RolePreset, rng: () => number): PersonalityResult {
  const compatible = getCompatiblePersonalities(role.id);
  const personality = compatible.length > 0 
    ? compatible[Math.floor(rng() * compatible.length)]
    : PERSONALITY_PRESETS[Math.floor(rng() * PERSONALITY_PRESETS.length)];
  
  return {
    traits: personality.traits.map(t => t.name),
    motivation: personality.motivations[Math.floor(rng() * personality.motivations.length)],
    dominantEmotion: personality.dominantEmotions[Math.floor(rng() * personality.dominantEmotions.length)],
    disposition: personality.traits.reduce((sum, t) => sum + (t.effects.dispositionModifier || 0), 0),
  };
}
```
```

### TASK-1.3: Implement Inventory Generation (FROM POOL)

```
PRIORITY: critical
FILE: src/lib/generator/npc-generator.ts
TIME: 45min
DEPENDENCIES: [TASK-1.1, CRITICAL_RULE above]

ASYNC_FUNCTION:
```typescript
export async function generateNPCAsync(context: NPCGenerationContext): Promise<GeneratedNPC> {
  const npc = generateNPC(context);
  npc.inventory = await generateInventoryFromPool(npc);
  return npc;
}

async function generateInventoryFromPool(npc: GeneratedNPC): Promise<InventoryItem[]> {
  const inventory: InventoryItem[] = [];
  
  // Load consumables from generated pool
  const consumables = await generatedObjectsLoader.loadObjects('consumables');
  
  // Filter by level
  const suitable = consumables.filter(c => 
    (c.level || 1) <= npc.cultivation.level &&
    (!c.requirements?.cultivationLevel || c.requirements.cultivationLevel <= npc.cultivation.level)
  );
  
  // Select random items
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const selected = suitable
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  for (const item of selected) {
    inventory.push({
      id: item.id,
      quantity: Math.floor(Math.random() * 3) + 1,
    });
  }
  
  return inventory;
}
```

REMEMBER: NEVER generate new consumables - always select from pool!
```

### TASK-2.0: Create npc-body-system.ts

```
PRIORITY: high
FILE: src/lib/game/npc-body-system.ts
TIME: 60min
DEPENDENCIES: none (but reference docs/body.md)

IMPORTS:
```typescript
import { SpeciesPreset } from '@/data/presets/species-presets';
import type { BodyState, BodyPartState } from './body-system';
```

BODY_TEMPLATES:
```typescript
const BODY_TEMPLATES = {
  humanoid: {
    parts: ['head', 'torso', 'heart', 'left_arm', 'right_arm', 'left_hand', 'right_hand', 'left_leg', 'right_leg', 'left_foot', 'right_foot'],
    defaultHP: {
      head: { functional: 50, structural: 100 },
      torso: { functional: 100, structural: 200 },
      heart: { functional: 80, structural: 0 },
      arm: { functional: 40, structural: 80 },
      hand: { functional: 20, structural: 40 },
      leg: { functional: 50, structural: 100 },
      foot: { functional: 25, structural: 50 },
    },
  },
  
  beast_quadruped: {
    parts: ['head', 'torso', 'heart', 'front_left_leg', 'front_right_leg', 'back_left_leg', 'back_right_leg', 'tail'],
    defaultHP: {
      head: { functional: 60, structural: 120 },
      torso: { functional: 120, structural: 240 },
      heart: { functional: 80, structural: 0 },
      leg: { functional: 45, structural: 90 },
      tail: { functional: 30, structural: 60 },
    },
  },
  
  beast_bird: {
    parts: ['head', 'torso', 'heart', 'left_wing', 'right_wing', 'left_leg', 'right_leg'],
    defaultHP: {
      head: { functional: 40, structural: 80 },
      torso: { functional: 80, structural: 160 },
      heart: { functional: 60, structural: 0 },
      wing: { functional: 35, structural: 70 },
      leg: { functional: 25, structural: 50 },
    },
  },
  
  beast_serpentine: {
    parts: ['head', 'torso', 'heart', 'body_segment_1', 'body_segment_2', 'tail'],
    defaultHP: {
      head: { functional: 50, structural: 100 },
      torso: { functional: 100, structural: 200 },
      heart: { functional: 70, structural: 0 },
      body_segment: { functional: 60, structural: 120 },
      tail: { functional: 40, structural: 80 },
    },
  },
  
  spirit: {
    parts: ['core', 'essence'],
    defaultHP: {
      core: { functional: 100, structural: 0 },
      essence: { functional: 200, structural: 0 },
    },
  },
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  tiny: 0.5,
  small: 0.75,
  medium: 1.0,
  large: 1.5,
  huge: 2.0,
};
```

EXPORT:
```typescript
export function createBodyForSpecies(species: SpeciesPreset, cultivationLevel: number): BodyState {
  const template = BODY_TEMPLATES[species.bodyTemplate];
  const sizeMultiplier = SIZE_MULTIPLIERS[species.sizeClass] || 1;
  const cultivationBonus = 1 + (cultivationLevel - 1) * 0.1;
  
  const parts: Record<string, BodyPartState> = {};
  
  for (const partId of template.parts) {
    const baseHP = template.defaultHP[partId] || template.defaultHP[getPartType(partId)];
    
    parts[partId] = {
      functionalHP: Math.floor(baseHP.functional * sizeMultiplier * cultivationBonus),
      maxFunctionalHP: Math.floor(baseHP.functional * sizeMultiplier * cultivationBonus),
      structuralHP: Math.floor(baseHP.structural * sizeMultiplier * cultivationBonus),
      maxStructuralHP: Math.floor(baseHP.structural * sizeMultiplier * cultivationBonus),
      status: 'healthy',
      regenerationRate: 0.1,
    };
  }
  
  return {
    parts,
    activeBleeds: [],
    activeAttachments: [],
    isDead: false,
  };
}

function getPartType(partId: string): string {
  if (partId.includes('arm') || partId.includes('wing')) return 'arm';
  if (partId.includes('hand') || partId.includes('foot')) return 'hand';
  if (partId.includes('leg')) return 'leg';
  if (partId.includes('tail') || partId.includes('segment')) return 'tail';
  return 'torso';
}
```
```

### TASK-3.0: Create NPCGeneratorPanel.tsx

```
PRIORITY: medium
FILE: src/components/settings/NPCGeneratorPanel.tsx
TIME: 90min
DEPENDENCIES: [TASK-1.*, agent-1 TASK-1.*, agent-1 TASK-2.*]

REFERENCE: src/components/settings/TechniqueGeneratorPanel.tsx

COMPONENT_STRUCTURE:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Trash2 } from 'lucide-react';

interface NPCGeneratorPanelProps {
  onGenerate?: (npcs: GeneratedNPC[]) => void;
}

export function NPCGeneratorPanel({ onGenerate }: NPCGeneratorPanelProps) {
  const [speciesType, setSpeciesType] = useState<string>('humanoid');
  const [roleType, setRoleType] = useState<string>('');
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(3);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generator/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          context: {
            speciesType,
            roleType: roleType || undefined,
            cultivationLevel: { min: minLevel, max: maxLevel },
          },
          count,
          save: true,
        }),
      });
      
      const data = await response.json();
      onGenerate?.(data.npcs);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Species Selector */}
      <div>
        <Label>Вид существа</Label>
        <Select value={speciesType} onValueChange={setSpeciesType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="humanoid">Человекоподобные</SelectItem>
            <SelectItem value="beast">Звери</SelectItem>
            <SelectItem value="spirit">Духи</SelectItem>
            <SelectItem value="hybrid">Гибриды</SelectItem>
            <SelectItem value="aberration">Аберрации</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Role Selector */}
      <div>
        <Label>Роль</Label>
        <Select value={roleType} onValueChange={setRoleType}>
          <SelectTrigger>
            <SelectValue placeholder="Любая роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="elder">Старейшина</SelectItem>
            <SelectItem value="inner_disciple">Внутренний ученик</SelectItem>
            <SelectItem value="outer_disciple">Внешний ученик</SelectItem>
            <SelectItem value="merchant">Торговец</SelectItem>
            <SelectItem value="bandit">Бандит</SelectItem>
            {/* ... more roles */}
          </SelectContent>
        </Select>
      </div>
      
      {/* Level Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Мин. уровень</Label>
          <Input type="number" min={1} max={9} value={minLevel} onChange={e => setMinLevel(+e.target.value)} />
        </div>
        <div>
          <Label>Макс. уровень</Label>
          <Input type="number" min={1} max={9} value={maxLevel} onChange={e => setMaxLevel(+e.target.value)} />
        </div>
      </div>
      
      {/* Count */}
      <div>
        <Label>Количество</Label>
        <Input type="number" min={1} max={20} value={count} onChange={e => setCount(+e.target.value)} />
      </div>
      
      {/* Generate Button */}
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin mr-2" /> : <Users className="mr-2" />}
        Сгенерировать NPC
      </Button>
    </div>
  );
}
```
```

### TASK-4.0: Extend name-generator.ts

```
PRIORITY: high
FILE: src/lib/generator/name-generator.ts
TIME: 45min
DEPENDENCIES: none

ADD_TO_FILE:
```typescript
const NPC_NAMES = {
  humanoid: {
    male: {
      human: ['Вэй', 'Лин', 'Чэнь', 'Фэн', 'Юнь', 'Лун', 'Мин', 'Хао', 'Цзянь', 'Ши'],
      elf: ['Эльтар', 'Сильвэн', 'Аэриэль', 'Кельтос', 'Фэйлин'],
      demon: ['Асмодей', 'Вельзевул', 'Маммон', 'Астарот', 'Белиал'],
      giant: ['Грол', 'Торн', 'Краг', 'Болдур', 'Стейн'],
      beastkin: ['Рагнар', 'Фенрис', 'Ульф', 'Кайл', 'Бьярн'],
    },
    female: {
      human: ['Мэй', 'Сю', 'Лань', 'Ин', 'Цзы', 'Лин', 'Юй', 'Хуа', 'Фэй', 'Сяо'],
      elf: ['Элара', 'Лириэль', 'Аура', 'Исиль', 'Нимэ'],
      demon: ['Лилит', 'Наама', 'Аграт', 'Эвфросина', 'Маха'],
      giant: ['Хильда', 'Фрея', 'Астрид', 'Инга', 'Герд'],
      beastkin: ['Фрейя', 'Акила', 'Леони', 'Вупо', 'Кицун'],
    },
  },
  
  beast: {
    titles: ['Острозуб', 'Быстроног', 'Тенекрад', 'Громолап', 'Смертоносец', 'Кровоклык', 'Железношерст', 'Пламегрив'],
  },
  
  spirit: {
    fire: ['Инферно', 'Пиро', 'Фламма', 'Игнис', 'Блейз'],
    water: ['Аква', 'Марина', 'Фрост', 'Глейшер', 'Нептун'],
    wind: ['Зефир', 'Густ', 'Аэро', 'Виро', 'Спирит'],
    earth: ['Терра', 'Петра', 'Гаия', 'Стоун', 'Кристалл'],
    neutral: ['Эфир', 'Спектр', 'Фантом', 'Мистик', 'Аура'],
  },
};

export function generateNPCName(
  species: SpeciesPreset,
  gender: 'male' | 'female' | 'none',
  rng: () => number
): string {
  // Beast: Species + Title
  if (species.type === 'beast') {
    const title = NPC_NAMES.beast.titles[Math.floor(rng() * NPC_NAMES.beast.titles.length)];
    return `${species.name} ${title}`;
  }
  
  // Spirit: Element-based name
  if (species.type === 'spirit') {
    const element = species.subtype.includes('fire') ? 'fire' 
                  : species.subtype.includes('water') ? 'water'
                  : species.subtype.includes('wind') ? 'wind'
                  : species.subtype.includes('earth') ? 'earth'
                  : 'neutral';
    const names = NPC_NAMES.spirit[element];
    return names[Math.floor(rng() * names.length)];
  }
  
  // Humanoid: Name from appropriate culture
  const subtype = species.subtype || 'human';
  const genderNames = NPC_NAMES.humanoid[gender]?.[subtype] || NPC_NAMES.humanoid[gender]?.human;
  
  if (genderNames) {
    return genderNames[Math.floor(rng() * genderNames.length)];
  }
  
  // Fallback
  return `NPC_${Math.floor(rng() * 10000)}`;
}
```
```

## GIT WORKFLOW

```bash
START_SESSION:
  git pull origin main2d3

AFTER_EACH_TASK:
  git add .
  git commit -m "feat(npc-gen): <description> [Agent-2]"
  git push origin main2d3

BEFORE_DEPENDENCY_TASK:
  git pull origin main2d3
```

## WORKLOG

After each task, append to /home/z/my-project/worklog.md:

```markdown
---
Task ID: <task-id>
Agent: Agent-2
Task: <description>

Work Log:
- <action 1>
- <action 2>

Stage Summary:
- Results: <outcome>
- Files: [modified files]
- Issues: <if any>
```

## OUTPUT_FILES

```
CREATE:
  - src/lib/generator/npc-generator.ts
  - src/lib/game/npc-body-system.ts
  - src/components/settings/NPCGeneratorPanel.tsx

MODIFY:
  - src/lib/generator/name-generator.ts
```

## COMPLETION_CRITERIA

```
ALL_MUST_BE_TRUE:
  - generateNPC() produces valid GeneratedNPC
  - Inventory comes from consumables pool
  - createBodyForSpecies() works for all bodyTemplate types
  - NPCGeneratorPanel renders and calls API
  - generateNPCName() supports all species types
  - All files pushed to GitHub
```
