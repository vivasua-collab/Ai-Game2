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
  const progress = Math.min(1, virtualDelta / Math.max(0.1, threshold));
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
              <span>Delta: {virtualDelta.toFixed(3)}</span>
              <span>Threshold: {threshold.toFixed(1)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
