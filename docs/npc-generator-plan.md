# NPC Generator - Technical Specification

```yaml
version: 2.0
date: 2026-03-01
status: ready-for-implementation

repository:
  url: https://github.com/vivasua-collab/Ai-Game2.git
  branch: main2d3
  token_file: .git-connect
```

## Architecture

```
GENERATION_FLOW:
  1. Context Input -> 2. Species Selection -> 3. Role Selection
       ↓                    ↓                      ↓
  4. Stats Generation -> 5. Cultivation -> 6. Body Creation
       ↓                    ↓                      ↓
  7. Personality -> 8. Techniques -> 9. Equipment -> 10. Inventory (FROM POOL)

INVENTORY_RULE:
  source: generatedObjectsLoader.loadObjects('consumables')
  method: filter by level, weighted random select
  DO_NOT: generate new consumables
```

## Existing Systems

```
MODELS (Prisma):
  - NPC: name, title, age, cultivationLevel, stats, personality, role, sectId
  - Character: bodyState, cultivationSkills
  - EncounteredEntity: name, type, cultivationLevel, power, disposition

GENERATORS:
  - technique-generator.ts ✅
  - weapon-generator.ts ✅
  - armor-generator.ts ✅
  - accessory-generator.ts ✅
  - consumable-generator.ts ✅
  - qi-stone-generator.ts ✅
  - formation-generator.ts ✅
  - name-generator.ts ✅ (extend for NPC)

STORAGE:
  - preset-storage.ts ✅
  - generated-objects-loader.ts ✅
  - id-config.ts ✅
```

## New Components

```
CRITICAL:
  1. species-presets.ts [Agent-1]
     - Interface: SpeciesPreset
     - Data: 25+ species (humanoid, beast, spirit, hybrid, aberration)
     - Exports: SPECIES_PRESETS, getSpeciesByType, getSpeciesById

  2. role-presets.ts [Agent-1]
     - Interface: RolePreset
     - Data: 30+ roles (sect, profession, social, combat)
     - Exports: ROLE_PRESETS, getRolesByType, getRoleById

  3. npc-generator.ts [Agent-2]
     - Interface: NPCGenerationContext, GeneratedNPC
     - Functions: generateNPC, generateNPCs, generateNPCForSect, generateEnemy
     - CRITICAL: Inventory from pool!

  4. api/generator/npc/route.ts [Agent-0]
     - GET ?action=stats|list
     - POST {action: generate|clear}

IMPORTANT:
  5. personality-presets.ts [Agent-1]
     - Interface: PersonalityPreset
     - Data: 15+ personalities
     - Exports: PERSONALITY_PRESETS, getCompatiblePersonalities

  6. npc-body-system.ts [Agent-2]
     - Function: createBodyForSpecies
     - Templates: humanoid, beast_quadruped, beast_bird, beast_serpentine, spirit

DESIRABLE:
  7. NPCGeneratorPanel.tsx [Agent-2]
     - UI for species/role/level selection
     - Generate button
     - Results display
```

## Type Definitions

```typescript
// Species
type SpeciesType = 'humanoid' | 'beast' | 'spirit' | 'hybrid' | 'aberration';
type BodyTemplate = 'humanoid' | 'beast_quadruped' | 'beast_bird' | 'beast_serpentine' | 'spirit';
type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

// Role
type RoleType = 'sect' | 'profession' | 'social' | 'combat';

// Common
interface Range { min: number; max: number; }

// Generation Context
interface NPCGenerationContext {
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

// Output
interface GeneratedNPC {
  id: string;
  name: string;
  title?: string;
  age: number;
  gender: 'male' | 'female' | 'none';
  speciesId: string;
  roleId: string;
  stats: { strength, agility, intelligence, vitality };
  cultivation: { level, subLevel, coreCapacity, currentQi, coreQuality };
  bodyState: BodyState;
  personality: { traits, motivation, dominantEmotion, disposition };
  techniques: string[];
  equipment: Record<string, string | null>;
  inventory: Array<{ id, quantity }>;
  resources: { spiritStones, contributionPoints };
  generationMeta: { seed, generatedAt, version };
}
```

## File Structure

```
src/
├── data/presets/
│   ├── species-presets.ts      [Agent-1] CREATE
│   ├── role-presets.ts         [Agent-1] CREATE
│   ├── personality-presets.ts  [Agent-1] CREATE
│   └── index.ts                [Agent-0] MODIFY
│
├── lib/generator/
│   ├── npc-generator.ts        [Agent-2] CREATE
│   ├── name-generator.ts       [Agent-2] MODIFY
│   ├── id-config.ts            [Agent-0] MODIFY
│   └── preset-storage.ts       [Agent-0] MODIFY
│
├── lib/game/
│   └── npc-body-system.ts      [Agent-2] CREATE
│
├── app/api/generator/npc/
│   └── route.ts                [Agent-0] CREATE
│
└── components/settings/
    └── NPCGeneratorPanel.tsx   [Agent-2] CREATE

presets/
└── npcs/                       [Agent-0] CREATE_DIR
```

## Agent Distribution

```yaml
agent-0:
  role: coordinator
  tasks: [api, integration, testing]
  dependencies: [agent-1, agent-2]
  plan: docs/plans/PLAN_AGENT_0.md

agent-1:
  role: data-presets
  tasks: [species-presets, role-presets, personality-presets]
  dependencies: none
  plan: docs/plans/PLAN_AGENT_1.md

agent-2:
  role: generator-and-ui
  tasks: [npc-generator, body-system, ui-panel, name-generator]
  dependencies: [agent-1]
  plan: docs/plans/PLAN_AGENT_2.md
```

## Execution Phases

```
PHASE_1 (parallel):
  agent-0: [id-config, preset-storage npc methods, dir structure]
  agent-1: [species-presets, role-presets]
  agent-2: [npc-generator structure, generateNPC core]
  SYNC: git push/pull

PHASE_2:
  agent-0: [wait for agent-1, agent-2]
  agent-1: [personality-presets]
  agent-2: [body-system, inventory from pool, name-generator]
  SYNC: git push/pull

PHASE_3:
  agent-0: [api route, integration, testing]
  agent-2: [ui panel]
  SYNC: final integration
```

## CRITICAL: Inventory Rule

```typescript
// CORRECT - Select from existing pool
async function generateInventory(role, level, rng) {
  const consumables = await generatedObjectsLoader.loadObjects('consumables');
  const suitable = consumables.filter(c => c.level <= level);
  return weightedRandomSelect(suitable, count, rng);
}

// WRONG - Do not generate new consumables
function generateInventory(role, level, rng) {
  return generateConsumable({ level }); // ❌ NEVER DO THIS
}
```

## Completion Criteria

```yaml
agent-0:
  - NPC_PREFIX in id-config.ts
  - saveNPCs/loadNPCs in preset-storage.ts
  - API responds to GET/POST
  - All presets exported from index.ts
  - Integration tests pass

agent-1:
  - species-presets: 25+ species
  - role-presets: 30+ roles
  - personality-presets: 15+ personalities
  - All types exported

agent-2:
  - generateNPC produces valid NPC
  - Inventory from consumables pool
  - Body system for all templates
  - UI panel renders
  - Names for all species
```

## Related Documentation

```
- docs/body.md              # Body system, species details
- docs/equip.md             # Equipment types
- docs/inventory-system.md  # Inventory structure
- docs/plans/COORDINATION.md # Agent coordination
- docs/plans/PLAN_AGENT_0.md # Agent-0 tasks
- docs/plans/PLAN_AGENT_1.md # Agent-1 tasks
- docs/plans/PLAN_AGENT_2.md # Agent-2 tasks
```
