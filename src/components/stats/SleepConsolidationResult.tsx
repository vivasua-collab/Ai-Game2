'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { SleepConsolidationResult, StatName } from '@/types/stat-development';
import { STAT_EMOJIS, STAT_NAMES_RU } from '@/types/stat-development';

interface Props { 
  result: SleepConsolidationResult; 
  showDetails?: boolean; 
}

const STAT_ORDER: StatName[] = ['strength', 'agility', 'intelligence', 'vitality'];

export function SleepConsolidationResultComponent({ result, showDetails = true }: Props) {
  const { stats, sleepHours, totalAdvancements } = result;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">💤 Sleep results ({sleepHours}h)</h3>
          {totalAdvancements > 0 && (
            <span className="text-sm text-purple-500 font-medium">
              ✨ Advancements: {totalAdvancements}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {STAT_ORDER.map((statName) => {
            const statResult = stats[statName];
            if (!statResult) return null;
            const { before, after, advancements } = statResult;
            const hasAdvanced = advancements.length > 0;

            return (
              <div 
                key={statName} 
                className={`flex items-center justify-between p-2 rounded ${hasAdvanced ? 'bg-purple-500/10' : ''}`}
              >
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
