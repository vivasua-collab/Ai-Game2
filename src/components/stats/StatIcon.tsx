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
