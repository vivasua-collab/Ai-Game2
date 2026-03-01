# NPC Generator - Agent Coordination

```yaml
meta:
  version: 2.0
  date: 2026-03-01
  project: Cultivation World Simulator

repository:
  url: https://github.com/vivasua-collab/Ai-Game2.git
  branch: main2d3
  token_file: .git-connect

agents:
  - id: agent-0
    role: coordinator
    tasks: [api, integration, testing]
    files: [src/app/api/generator/npc/, src/lib/generator/id-config.ts, src/lib/generator/preset-storage.ts]
    
  - id: agent-1
    role: presets
    tasks: [species-presets, role-presets, personality-presets]
    files: [src/data/presets/species-presets.ts, src/data/presets/role-presets.ts, src/data/presets/personality-presets.ts]
    
  - id: agent-2
    role: generator
    tasks: [npc-generator, body-system, ui]
    files: [src/lib/generator/npc-generator.ts, src/lib/game/npc-body-system.ts, src/components/settings/NPCGeneratorPanel.tsx]
```

## MANDATORY: Read Before Start

### Agent-0 Must Read:
```
docs/ARCHITECTURE.md
docs/npc-generator-plan.md
docs/plans/COORDINATION.md
src/lib/generator/preset-storage.ts
src/lib/generator/id-config.ts
src/lib/generator/generated-objects-loader.ts
src/app/api/generator/formations/route.ts
```

### Agent-1 Must Read:
```
docs/body.md
docs/npc-generator-plan.md
src/data/presets/technique-presets.ts
src/data/presets/character-presets.ts
prisma/schema.prisma
```

### Agent-2 Must Read:
```
docs/body.md
docs/inventory-system.md
docs/equip.md
docs/npc-generator-plan.md
src/lib/generator/technique-generator.ts
src/lib/game/body-system.ts
src/lib/generator/generated-objects-loader.ts
```

## CRITICAL: NPC Inventory Rule

```
NPC_INVENTORY_SOURCE: pool
NPC_INVENTORY_METHOD: generatedObjectsLoader.loadObjects('consumables')
DO_NOT: generate new consumables for NPC
DO: select from existing consumables pool by level/type
```

Example Code:
```typescript
const consumables = await generatedObjectsLoader.loadObjects('consumables');
const suitable = consumables.filter(c => c.level <= npcLevel);
const selected = weightedRandomSelect(suitable, count, rng);
```

## Dependency Graph

```
agent-1 (species-presets) ──┬──> agent-0 (api)
                             └──> agent-2 (createBodyForSpecies)

agent-1 (role-presets) ─────┬──> agent-0 (api)
                             └──> agent-2 (selectRole)

agent-2 (npc-generator) ────┬──> agent-0 (api integration)
agent-2 (body-system) ──────┘

agent-1 (personality-presets) ──> agent-0 (integration)
```

## Execution Order

```
PHASE_1_PARALLEL:
  agent-0: [task-1.0, task-1.1, task-1.2]
  agent-1: [task-1.0, task-1.1, task-1.2, task-1.3, task-1.4]
  agent-2: [task-1.0, task-1.1, task-1.2, task-1.3]
  SYNC_POINT: git push + git pull

PHASE_2:
  agent-0: [task-3.0, task-3.1, task-3.2]
  agent-1: [task-3.0, task-3.1]
  agent-2: [task-2.0, task-2.1, task-4.0]
  SYNC_POINT: git push + git pull

PHASE_3:
  agent-0: [task-2.0, task-3.3, task-3.4, task-4.0, task-4.1]
  agent-2: [task-3.0, task-3.1]
  SYNC_POINT: final integration
```

## Git Protocol

```bash
START:
  git pull origin main2d3

AFTER_TASK:
  git add .
  git commit -m "feat(npc-gen): description [Agent-X]"
  git push origin main2d3

BEFORE_CONTINUE:
  git pull origin main2d3
```

## Worklog Format

Append to /home/z/my-project/worklog.md:
```markdown
---
Task ID: <id>
Agent: Agent-X
Task: <description>

Work Log:
- <step 1>
- <step 2>

Stage Summary:
- Results: <results>
- Files: [list]
- Issues: <if any>
```

## Conflict Resolution

```
PRIORITY_ORDER:
  1. agent-0 (coordinator)
  2. agent-1 (presets)
  3. agent-2 (generator)

SHARED_FILES:
  - src/data/presets/index.ts -> agent-0 controls
  - src/lib/generator/id-config.ts -> agent-0 controls
```

## File Ownership

```
agent-0:
  CREATE: src/app/api/generator/npc/route.ts
  MODIFY: src/lib/generator/id-config.ts, src/lib/generator/preset-storage.ts, src/data/presets/index.ts
  CREATE_DIR: presets/npcs/

agent-1:
  CREATE: src/data/presets/species-presets.ts
  CREATE: src/data/presets/role-presets.ts
  CREATE: src/data/presets/personality-presets.ts

agent-2:
  CREATE: src/lib/generator/npc-generator.ts
  CREATE: src/lib/game/npc-body-system.ts
  CREATE: src/components/settings/NPCGeneratorPanel.tsx
  MODIFY: src/lib/generator/name-generator.ts
```

## Completion Checklist

```yaml
agent-0:
  - id-config: NPC prefix added
  - preset-storage: NPC methods added
  - api: generate/stats/list/clear work
  - integration: all presets exported
  - tests: generation works

agent-1:
  - species-presets: 25+ species
  - role-presets: 30+ roles
  - personality-presets: 15+ personalities

agent-2:
  - npc-generator: full generation
  - inventory: from consumables pool
  - body-system: all species templates
  - ui: panel works
  - names: all species supported
```
