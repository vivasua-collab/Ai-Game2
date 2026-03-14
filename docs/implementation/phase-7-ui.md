# PHASE 7: Stats UI Components

**PRIORITY:** P2
**DEPENDS ON:** Phase 9 (Delta Integration)
**TARGET:** UI for stat development visualization

---

## DIR STRUCTURE

```
src/components/stats/
├── StatIcon.tsx
├── StatProgressBar.tsx
├── StatsDevelopmentPanel.tsx
├── TrainingSelection.tsx
├── SleepConsolidationResult.tsx
├── ThresholdTable.tsx
└── index.ts
```

---

## FILE 1: `src/components/stats/StatIcon.tsx`

```typescript
'use client';

import type { StatName } from '@/types/stat-development';
import { STAT_EMOJIS, STAT_NAMES_RU } from '@/types/stat-development';

interface StatIconProps {
  stat: StatName;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_CLASSES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

export function StatIcon({ stat, size = 'md', showLabel = false }: StatIconProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${SIZE_CLASSES[size]}`}>
      <span>{STAT_EMOJIS[stat]}</span>
      {showLabel && <span className="text-muted-foreground">{STAT_NAMES_RU[stat]}</span>}
    </span>
  );
}
```

---

## FILE 2: `src/components/stats/StatProgressBar.tsx`

```typescript
'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import type { StatDevelopment, StatName } from '@/types/stat-development';
import { STAT_EMOJIS, STAT_NAMES_RU } from '@/types/stat-development';

interface StatProgressBarProps {
  stat: StatName;
  development: StatDevelopment;
  showDetails?: boolean;
  compact?: boolean;
}

function getProgressColor(progress: number): string {
  if (progress >= 1.0) return 'bg-purple-500';
  if (progress >= 0.75) return 'bg-blue-400';
  if (progress >= 0.5) return 'bg-green-400';
  if (progress >= 0.25) return 'bg-yellow-400';
  return 'bg-gray-300';
}

export function StatProgressBar({ stat, development, showDetails = false, compact = false }: StatProgressBarProps) {
  const { current, virtualDelta, threshold } = development;
  const progress = Math.min(1, virtualDelta / threshold);
  const progressPercent = Math.round(progress * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{STAT_EMOJIS[stat]}</span>
        <span className="text-sm font-medium w-8">{current}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full transition-all ${getProgressColor(progress)}`} style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">{progressPercent}%</span>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{STAT_EMOJIS[stat]}</span>
            <span className="font-medium">{STAT_NAMES_RU[stat]}</span>
          </div>
          <span className="text-xl font-bold">{current}</span>
        </div>
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{virtualDelta.toFixed(3)} / {threshold.toFixed(1)}</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
        {showDetails && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            <div className="flex justify-between">
              <span>Дельта: {virtualDelta.toFixed(3)}</span>
              <span>Порог: {threshold.toFixed(1)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## FILE 3: `src/components/stats/StatsDevelopmentPanel.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatProgressBar } from './StatProgressBar';
import type { CharacterStatsDevelopment, StatName } from '@/types/stat-development';

interface StatsDevelopmentPanelProps {
  stats: CharacterStatsDevelopment;
  title?: string;
  showEstimates?: boolean;
  compact?: boolean;
}

const STAT_ORDER: StatName[] = ['strength', 'agility', 'intelligence', 'vitality'];

export function StatsDevelopmentPanel({ stats, title = 'Развитие тела', showEstimates = false, compact = false }: StatsDevelopmentPanelProps) {
  const totalDelta = Object.values(stats).reduce((sum, stat) => sum + stat.virtualDelta, 0);

  return (
    <Card>
      <CardHeader className={compact ? 'py-2 px-3' : 'py-3'}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>📊 {title}</CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'py-2 px-3 space-y-2' : 'space-y-3'}>
        {STAT_ORDER.map((statName) => (
          <StatProgressBar key={statName} stat={statName} development={stats[statName]} showDetails={showEstimates && !compact} compact={compact} />
        ))}
        {showEstimates && !compact && (
          <div className="pt-2 mt-2 border-t text-sm text-muted-foreground">
            💤 При следующем сне (8ч): до +0.20 закрепления
            <br />📈 Всего дельты: {totalDelta.toFixed(3)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## FILE 4: `src/components/stats/TrainingSelection.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TrainingType, StatName } from '@/types/stat-development';

interface TrainingSelectionProps {
  availableTypes: TrainingType[];
  selectedType: TrainingType | null;
  onSelect: (type: TrainingType) => void;
  currentFatigue: { physical: number; mental: number };
  targetStat: StatName;
}

const TRAINING_INFO: Record<TrainingType, { name: string; mult: number; risk: string }> = {
  classical: { name: 'Классическая', mult: 1.0, risk: 'low' },
  focused: { name: 'Фокусная', mult: 1.2, risk: 'medium' },
  extreme: { name: 'Экстремальная', mult: 1.5, risk: 'high' },
};

const RISK_COLORS: Record<string, string> = { low: 'text-green-500', medium: 'text-yellow-500', high: 'text-red-500' };

export function TrainingSelection({ availableTypes, selectedType, onSelect, currentFatigue }: TrainingSelectionProps) {
  const isCriticalFatigue = currentFatigue.physical >= 80 || currentFatigue.mental >= 80;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="text-sm font-medium">🏋️ Выберите тип тренировки</div>
        <div className="grid grid-cols-3 gap-3">
          {availableTypes.map((type) => {
            const info = TRAINING_INFO[type];
            return (
              <Button key={type} variant={selectedType === type ? 'default' : 'outline'} className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => onSelect(type)} disabled={isCriticalFatigue && type === 'extreme'}>
                <span className="font-medium text-sm">{info.name}</span>
                <span className="text-xs text-muted-foreground">×{info.mult}</span>
                <span className={`text-xs ${RISK_COLORS[info.risk]}`}>{info.risk === 'low' ? 'Низкий риск' : info.risk === 'medium' ? 'Средний риск' : 'Высокий риск'}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## FILE 5: `src/components/stats/SleepConsolidationResult.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { SleepConsolidationResult, StatName } from '@/types/stat-development';
import { STAT_EMOJIS, STAT_NAMES_RU } from '@/types/stat-development';

interface Props { result: SleepConsolidationResult; showDetails?: boolean; }

const STAT_ORDER: StatName[] = ['strength', 'agility', 'intelligence', 'vitality'];

export function SleepConsolidationResultComponent({ result, showDetails = true }: Props) {
  const { stats, sleepHours, totalAdvancements } = result;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">💤 Результаты сна ({sleepHours} ч)</h3>
          {totalAdvancements > 0 && <span className="text-sm text-purple-500 font-medium">✨ Повышений: {totalAdvancements}</span>}
        </div>
        <div className="space-y-3">
          {STAT_ORDER.map((statName) => {
            const statResult = stats[statName];
            if (!statResult) return null;
            const { before, after, advancements } = statResult;
            const hasAdvanced = advancements.length > 0;

            return (
              <div key={statName} className={`flex items-center justify-between p-2 rounded ${hasAdvanced ? 'bg-purple-500/10' : ''}`}>
                <div className="flex items-center gap-2">
                  <span>{STAT_EMOJIS[statName]}</span>
                  <span className="font-medium">{STAT_NAMES_RU[statName]}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {hasAdvanced ? (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{before.current}</span>
                      <span>→</span>
                      <span className="font-bold text-purple-500">{after.current}</span>
                      <span className="text-purple-500">✨</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{after.current}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## FILE 6: `src/components/stats/ThresholdTable.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props { fromStat?: number; toStat?: number; currentStat?: number; }

function calcThreshold(stat: number): number { return Math.floor(stat / 10); }
function calcDays(threshold: number): number { return Math.ceil(threshold / 0.15); }

export function ThresholdTable({ fromStat = 10, toStat = 60, currentStat }: Props) {
  const rows = [];
  for (let stat = fromStat; stat <= toStat; stat += 5) {
    const threshold = calcThreshold(stat);
    const days = calcDays(threshold);
    const isCurrent = currentStat !== undefined && stat <= currentStat && stat + 5 > currentStat;
    rows.push(
      <TableRow key={stat} className={isCurrent ? 'bg-primary/10' : undefined}>
        <TableCell className="font-medium">{isCurrent && '▶'}{stat}</TableCell>
        <TableCell>{threshold.toFixed(1)}</TableCell>
        <TableCell>{days} дней</TableCell>
        <TableCell className="text-muted-foreground">{isCurrent && '← Текущий'}</TableCell>
      </TableRow>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-medium mb-3">📈 Таблица порогов развития</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Стат</TableHead>
              <TableHead>Порог</TableHead>
              <TableHead>Дней до +1</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## FILE 7: `src/components/stats/index.ts`

```typescript
export { StatIcon } from './StatIcon';
export { StatProgressBar } from './StatProgressBar';
export { StatsDevelopmentPanel } from './StatsDevelopmentPanel';
export { TrainingSelection } from './TrainingSelection';
export { SleepConsolidationResultComponent } from './SleepConsolidationResult';
export { ThresholdTable } from './ThresholdTable';
```

---

## INTEGRATION: RestDialog.tsx

**ADD IMPORTS:**
```typescript
import { StatsDevelopmentPanel, SleepConsolidationResultComponent } from '@/components/stats';
```

**ADD TO JSX:**
```tsx
<StatsDevelopmentPanel stats={character.statsDevelopment} title="Текущее развитие" compact />
{sleepResult && <SleepConsolidationResultComponent result={sleepResult} />}
```

---

## VALIDATION

```bash
bun run lint
```

---

## RELATED DOCS

- [src/types/stat-development.ts](../../../src/types/stat-development.ts)
- [docs/stat-threshold-system.md](../../stat-threshold-system.md)

---

*END OF PHASE 7*
