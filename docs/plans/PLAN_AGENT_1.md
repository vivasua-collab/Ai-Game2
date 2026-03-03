# Agent-1 Execution Plan

```yaml
agent:
  id: agent-1
  role: data-presets
  dependencies: none  # АВТОНОМНАЯ РАБОТА
  provides: [species-presets, role-presets, personality-presets]
```

## STATUS CHECK

```
CURRENT_STATE:
  species-presets.ts: MISSING (требуется создать)
  role-presets.ts: MISSING (требуется создать)
  personality-presets.ts: MISSING (требуется создать)

AGENT_2_STATUS:
  npc-generator.ts: DONE (с временными пресетами)
  npc-body-system.ts: DONE
  
NOTE: Agent-2 создал TEMP пресеты. Agent-1 должен создать ПОЛНОЦЕННЫЕ пресеты.
Agent-0 сделает интеграцию после завершения работы Agent-1.
```

## PRE-EXECUTION: Read These Files

```
SEQUENTIAL_READ:
  1. /home/z/my-project/docs/body.md
  2. /home/z/my-project/src/lib/generator/npc-generator.ts (посмотреть TEMP пресеты)
  3. /home/z/my-project/src/data/presets/technique-presets.ts (пример структуры)
  4. /home/z/my-project/prisma/schema.prisma (NPC model)
```

## TASKS (АВТОНОМНЫЕ)

### TASK-1.0: Create species-presets.ts

```
PRIORITY: critical
FILE: src/data/presets/species-presets.ts
TIME: 90min
DEPENDENCIES: none

INTERFACE:
```typescript
import type { Range } from './base-preset';

export type SpeciesType = 'humanoid' | 'beast' | 'spirit' | 'hybrid' | 'aberration';
export type BodyTemplate = 'humanoid' | 'beast_quadruped' | 'beast_bird' | 'beast_serpentine' | 'spirit';
export type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export interface SpeciesPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: SpeciesType;
  subtype: string;
  
  baseStats: {
    strength: Range;
    agility: Range;
    intelligence: Range;
    vitality: Range;
  };
  
  capabilities: {
    canCultivate: boolean;
    innateQiGeneration: boolean;
    speechCapable: boolean;
    toolUse: boolean;
    learningRate: number;
  };
  
  cultivation: {
    coreCapacityBase: Range;
    coreQualityRange: Range;
    conductivityBase: number;
    maxCultivationLevel: number;
  };
  
  bodyTemplate: BodyTemplate;
  sizeClass: SizeClass;
  regenerationRate: number;
  
  innateTechniques?: Array<{
    techniqueId: string;
    unlockLevel: number;
    mastery: number;
  }>;
  
  tags?: string[];
}

export const SPECIES_PRESETS: SpeciesPreset[] = [...];
export const getSpeciesByType: (type: SpeciesType) => SpeciesPreset[];
export const getSpeciesById: (id: string) => SpeciesPreset | undefined;
export const getAllSpecies: () => SpeciesPreset[];
```

SPECIES_TO_CREATE (минимум 20):
  HUMANOID:
    - human: balanced, max_level=9
    - elf: high agi/int, max_level=8
    - demon: high str, innateQi=true
    - dwarf: high str/vit, small size
    - giant: huge size, very high str
  
  BEAST:
    - wolf: quadruped, predator
    - tiger: quadruped, predator
    - bear: quadruped, large
    - snake: serpentine, poison
    - eagle: bird, fast
    - spider: small, venom
    - dragon: huge, innate qi
  
  SPIRIT:
    - fire_elemental: fire attacks
    - water_elemental: water attacks
    - wind_elemental: wind attacks
    - ghost: ethereal
    - celestial: high intelligence
  
  HYBRID:
    - centaur: humanoid+horse
    - mermaid: humanoid+fish
    - werewolf: humanoid+wolf
  
  ABERRATION:
    - chaos_spawn: random stats
    - mutant: varied
    - golem: construct, no qi
```

### TASK-1.1: Create role-presets.ts

```
PRIORITY: critical
FILE: src/data/presets/role-presets.ts
TIME: 90min
DEPENDENCIES: none

INTERFACE:
```typescript
import type { Range } from './base-preset';
import type { SpeciesType } from './species-presets';

export type RoleType = 'sect' | 'profession' | 'social' | 'combat';

export interface RolePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: RoleType;
  
  requirements: {
    minCultivationLevel?: number;
    maxCultivationLevel?: number;
    speciesType?: SpeciesType[];
  };
  
  statModifiers?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    vitality?: number;
  };
  
  techniques: {
    guaranteed?: string[];
    possible?: string[];
    count?: number;
  };
  
  equipment: {
    weapon?: string | string[];
    armor?: string | string[];
    accessories?: string[];
  };
  
  inventory: {
    consumables: Array<{
      type: string;
      count: Range;
    }>;
    qiStones?: Array<{
      quality: string;
      count: Range;
    }>;
  };
  
  resources: {
    spiritStones?: Range;
    contributionPoints?: Range;
  };
  
  personalityWeights?: Record<string, number>;
  
  tags?: string[];
}

export const ROLE_PRESETS: RolePreset[] = [...];
export const getRolesByType: (type: RoleType) => RolePreset[];
export const getRoleById: (id: string) => RolePreset | undefined;
export const getAllRoles: () => RolePreset[];
```

ROLES_TO_CREATE (минимум 25):
  SECT:
    - candidate, outer_disciple, inner_disciple, core_member
    - elder, sect_master, instructor, alchemist, guard, servant
  
  PROFESSION:
    - merchant, alchemist, blacksmith, healer, scholar
    - hunter, farmer, innkeeper
  
  SOCIAL:
    - noble, beggar, traveler, hermit, refugee, criminal
  
  COMBAT:
    - guard, bandit, mercenary, assassin, cultist, warrior
```

### TASK-1.2: Create personality-presets.ts

```
PRIORITY: high
FILE: src/data/presets/personality-presets.ts
TIME: 60min
DEPENDENCIES: none

INTERFACE:
```typescript
export interface PersonalityPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  traits: Array<{
    name: string;
    effects: {
      dispositionModifier?: number;
      combatStyle?: 'aggressive' | 'defensive' | 'balanced';
      tradeModifier?: number;
      trustRate?: number;
    };
  }>;
  
  dominantEmotions: string[];
  motivations: string[];
  
  communicationStyle: 'formal' | 'casual' | 'aggressive' | 'mysterious' | 'friendly';
  
  compatibleRoles: string[];
  
  tags?: string[];
}

export const PERSONALITY_PRESETS: PersonalityPreset[] = [...];
export const getPersonalityById: (id: string) => PersonalityPreset | undefined;
export const getCompatiblePersonalities: (roleId: string) => PersonalityPreset[];
export const getAllPersonalities: () => PersonalityPreset[];
```

PERSONALITIES_TO_CREATE (минимум 15):
  - wise_mentor, greedy_merchant, hostile_bandit
  - loyal_guard, mysterious_hermit, arrogant_noble
  - kind_healer, cunning_assassin, pious_cultist
  - lazy_servant, ambitious_disciple, cynical_elder
  - friendly_traveler, ruthless_warrior, eccentric_scholar
```

## GIT WORKFLOW

```bash
START:
  git pull origin main2d3

AFTER_ALL_TASKS:
  git add .
  git commit -m "feat(npc-presets): Add species, role, personality presets [Agent-1]"
  git push origin main2d3
```

## OUTPUT_FILES

```
CREATE:
  - src/data/presets/species-presets.ts
  - src/data/presets/role-presets.ts
  - src/data/presets/personality-presets.ts

NO_MODIFICATIONS:
  - Не изменять npc-generator.ts (Agent-0 сделает интеграцию)
  - Не изменять index.ts (Agent-0 сделает экспорты)
```

## COMPLETION_CRITERIA

```
ALL_MUST_BE_TRUE:
  - species-presets.ts: 20+ species with all required fields
  - role-presets.ts: 25+ roles with all required fields
  - personality-presets.ts: 15+ personalities
  - All types exported correctly
  - Helper functions work
  - Files pushed to GitHub
```

## WORKLOG

After completion, append to /home/z/my-project/worklog.md:

```markdown
---
Task ID: agent-1-presets
Agent: Agent-1
Task: Create species, role, personality presets

Work Log:
- Created species-presets.ts with X species
- Created role-presets.ts with X roles
- Created personality-presets.ts with X personalities

Stage Summary:
- Results: All presets created
- Files: [list]
- Issues: none
```
