/**
 * ConditionBadge - Бейдж для отображения активного состояния
 */

'use client';

import { cn } from '@/lib/utils';
import { ActiveCondition } from '@/types/bonus-registry';
import { conditionRegistry, getConditionName, getConditionIcon, getConditionColor } from '@/lib/game/condition-registry';

interface ConditionBadgeProps {
  condition: ActiveCondition;
  size?: 'sm' | 'md' | 'lg';
  showTimer?: boolean;
  onClick?: () => void;
}

export function ConditionBadge({
  condition,
  size = 'md',
  showTimer = true,
  onClick,
}: ConditionBadgeProps) {
  const def = conditionRegistry.get(condition.id);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const iconSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  const remainingSec = Math.ceil(condition.duration / 1000);
  const isExpiring = remainingSec <= 3;
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium transition-all',
        sizeClasses[size],
        def?.color ?? 'text-gray-400',
        isExpiring && 'animate-pulse',
        onClick && 'cursor-pointer hover:bg-muted',
        condition.source === 'technique' && 'border-purple-500/30',
        condition.source === 'artifact' && 'border-amber-500/30',
        condition.source === 'environment' && 'border-green-500/30'
      )}
      onClick={onClick}
      title={def?.description ?? condition.id}
    >
      {/* Иконка */}
      <span className={iconSize[size]}>
        {def?.icon ?? '❓'}
      </span>
      
      {/* Название */}
      <span className="truncate">
        {def?.name ?? condition.id}
      </span>
      
      {/* Стаки */}
      {condition.stacks && condition.stacks > 1 && (
        <span className="text-xs opacity-80">
          ×{condition.stacks}
        </span>
      )}
      
      {/* Таймер */}
      {showTimer && (
        <span className={cn(
          'text-xs tabular-nums',
          isExpiring ? 'text-red-400' : 'opacity-60'
        )}>
          {remainingSec}с
        </span>
      )}
    </div>
  );
}

// Экспорт утилит для использования в других компонентах
export { getConditionName, getConditionIcon, getConditionColor };
