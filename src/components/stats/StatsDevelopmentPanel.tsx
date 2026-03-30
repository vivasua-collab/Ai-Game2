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

export function StatsDevelopmentPanel({ stats, title = 'Body Development', showEstimates = false, compact = false }: StatsDevelopmentPanelProps) {
  const totalDelta = Object.values(stats).reduce((sum, stat) => sum + (stat?.virtualDelta || 0), 0);

  return (
    <Card>
      <CardHeader className={compact ? 'py-2 px-3' : 'py-3'}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          📊 {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'py-2 px-3 space-y-2' : 'space-y-3'}>
        {STAT_ORDER.map((statName) => {
          const stat = stats[statName];
          if (!stat) return null;
          return (
            <StatProgressBar 
              key={statName} 
              stat={statName} 
              development={stat} 
              showDetails={showEstimates && !compact} 
              compact={compact} 
            />
          );
        })}
        {showEstimates && !compact && (
          <div className="pt-2 mt-2 border-t text-sm text-muted-foreground">
            💤 Next sleep (8h): up to +0.20 consolidation
            <br />📈 Total delta: {totalDelta.toFixed(3)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
