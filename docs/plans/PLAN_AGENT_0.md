# Agent-0 Execution Plan

```yaml
agent:
  id: agent-0
  role: coordinator
  dependencies: [agent-1, agent-2]
```

## PRE-EXECUTION: Read These Files

```
SEQUENTIAL_READ:
  1. /home/z/my-project/docs/ARCHITECTURE.md
  2. /home/z/my-project/docs/npc-generator-plan.md
  3. /home/z/my-project/docs/plans/COORDINATION.md
  4. /home/z/my-project/src/lib/generator/preset-storage.ts
  5. /home/z/my-project/src/lib/generator/id-config.ts
  6. /home/z/my-project/src/lib/generator/generated-objects-loader.ts
  7. /home/z/my-project/src/app/api/generator/formations/route.ts
```

## TASKS

### TASK-1.0: Add NPC ID Prefix

```
PRIORITY: critical
FILE: src/lib/generator/id-config.ts
TIME: 15min
DEPENDENCIES: none

ACTION:
  1. Read current file
  2. Add NPC_PREFIX = 'NPC'
  3. Add to ID_PREFIX_CONFIG: NPC: { name: 'NPC', description: 'Non-player characters' }
  4. Export NPC_PREFIX

VERIFICATION:
  - import { NPC_PREFIX } works
  - ID_PREFIX_CONFIG.NPC exists
```

### TASK-1.1: Create NPC Storage Directory

```
PRIORITY: critical
FILES: presets/npcs/.gitkeep
TIME: 5min
DEPENDENCIES: none

ACTION:
  1. mkdir -p presets/npcs
  2. touch presets/npcs/.gitkeep
```

### TASK-1.2: Add NPC Methods to preset-storage.ts

```
PRIORITY: critical
FILE: src/lib/generator/preset-storage.ts
TIME: 45min
DEPENDENCIES: TASK-1.1

METHODS_TO_ADD:
  - saveNPCs(npcs: GeneratedNPC[], mode: 'replace' | 'append'): Promise<void>
  - loadNPCs(): Promise<GeneratedNPC[]>
  - loadNPCsByType(type: string): Promise<GeneratedNPC[]>
  - clearNPCs(type?: string): Promise<number>

IMPLEMENTATION_PATTERN:
  Follow existing pattern from saveFormations/loadFormations
  Store in presets/npcs/{type}.json
  Group by speciesType

CODE_REFERENCE: existing formation methods in same file
```

### TASK-2.0: Create NPC API Route

```
PRIORITY: critical
FILE: src/app/api/generator/npc/route.ts
TIME: 90min
DEPENDENCIES: [TASK-1.2, agent-1.tasks, agent-2.tasks]

ENDPOINTS:
  GET ?action=stats:
    - Return count of generated NPCs by type
    - Return total count
    
  GET ?action=list:
    - Return list of NPCs
    - Query params: type, limit, offset
    
  POST {action: 'generate'}:
    - Body: { context: NPCGenerationContext, count: number, save: boolean }
    - Call generateNPC/generateNPCs from agent-2
    - Save to storage if save=true
    - Return generated NPCs
    
  POST {action: 'clear'}:
    - Body: { type?: string }
    - Clear NPCs from storage
    - Return count deleted

REFERENCE_FILE: src/app/api/generator/formations/route.ts
```

### TASK-3.0: Integrate species-presets.ts

```
PRIORITY: critical
FILE: src/data/presets/index.ts
TIME: 15min
DEPENDENCIES: agent-1 TASK-1.*

ACTION:
  1. Wait for agent-1 to complete species-presets.ts
  2. git pull
  3. Add export to index.ts
  4. Verify imports work
```

### TASK-3.1: Integrate role-presets.ts

```
PRIORITY: critical
FILE: src/data/presets/index.ts
TIME: 15min
DEPENDENCIES: agent-1 TASK-2.*

ACTION:
  1. Wait for agent-1 to complete role-presets.ts
  2. git pull
  3. Add export to index.ts
  4. Verify imports work
```

### TASK-3.2: Integrate personality-presets.ts

```
PRIORITY: high
FILE: src/data/presets/index.ts
TIME: 15min
DEPENDENCIES: agent-1 TASK-3.*

ACTION:
  1. Wait for agent-1 to complete personality-presets.ts
  2. git pull
  3. Add export to index.ts
  4. Verify imports work
```

### TASK-3.3: Integrate npc-generator.ts

```
PRIORITY: critical
FILES: [src/lib/generator/npc-generator.ts, src/lib/generator/index.ts]
TIME: 30min
DEPENDENCIES: agent-2 TASK-1.*

ACTION:
  1. Wait for agent-2 to complete npc-generator.ts
  2. git pull
  3. Add export to index.ts
  4. Test import in API route
  5. Run generateNPC with test context
```

### TASK-3.4: Integrate npc-body-system.ts

```
PRIORITY: high
FILE: src/lib/game/index.ts
TIME: 15min
DEPENDENCIES: agent-2 TASK-2.*

ACTION:
  1. Wait for agent-2 to complete npc-body-system.ts
  2. git pull
  3. Add export
  4. Test createBodyForSpecies
```

### TASK-4.0: Integration Tests

```
PRIORITY: high
TIME: 60min
DEPENDENCIES: [TASK-3.0, TASK-3.1, TASK-3.2, TASK-3.3, TASK-3.4]

TEST_SCENARIOS:
  1. Generate NPC with speciesType='humanoid'
  2. Generate NPC with roleType='elder'
  3. Generate 5 NPCs with same seed - verify reproducibility
  4. Generate NPC and check inventory comes from pool
  5. Generate NPC and verify body created
  6. Clear NPCs and verify empty

ACTION:
  - Use API endpoints for testing
  - Log results
  - Fix any issues
```

### TASK-4.1: Integrate UI Panel

```
PRIORITY: medium
FILES: [src/components/settings/SettingsPanel.tsx, src/components/settings/NPCGeneratorPanel.tsx]
TIME: 30min
DEPENDENCIES: agent-2 TASK-3.*

ACTION:
  1. Wait for agent-2 to complete NPCGeneratorPanel.tsx
  2. git pull
  3. Import and add to SettingsPanel
  4. Test UI renders
  5. Test generation through UI
```

## GIT WORKFLOW

```bash
START_SESSION:
  git pull origin main2d3

AFTER_EACH_TASK:
  git add .
  git commit -m "feat(npc-gen): <description> [Agent-0]"
  git push origin main2d3

BEFORE_DEPENDENCY_TASK:
  git pull origin main2d3
```

## WORKLOG

After each task, append to /home/z/my-project/worklog.md:

```markdown
---
Task ID: <task-id>
Agent: Agent-0
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
  - src/app/api/generator/npc/route.ts
  - presets/npcs/.gitkeep

MODIFY:
  - src/lib/generator/id-config.ts
  - src/lib/generator/preset-storage.ts
  - src/data/presets/index.ts
  - src/lib/generator/index.ts
  - src/lib/game/index.ts
  - src/components/settings/SettingsPanel.tsx
```

## COMPLETION_CRITERIA

```
ALL_MUST_BE_TRUE:
  - NPC_PREFIX exported from id-config.ts
  - saveNPCs/loadNPCs work in preset-storage.ts
  - API /api/generator/npc responds to GET/POST
  - generateNPC produces valid NPC
  - All presets exported from index.ts
  - UI panel renders in SettingsPanel
```
