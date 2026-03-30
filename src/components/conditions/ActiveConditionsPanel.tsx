/**
 * ActiveConditionsPanel - Панель активных состояний
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ActiveCondition } from '@/types/bonus-registry';
import { ConditionBadge } from './ConditionBadge';
import { conditionRegistry, ConditionDefinition } from '@/lib/game/condition-registry';
import { conditionManager } from '@/lib/game/condition-manager';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ScrollArea,
} from '@/components/ui/scroll-area';

interface ActiveConditionsPanelProps {
  conditions: ActiveCondition[];
  maxVisible?: number;
  showBuffs?: boolean;
  showDebuffs?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  onConditionClick?: (condition: ActiveCondition) => void;
  className?: string;
}

export function ActiveConditionsPanel({
  conditions,
  maxVisible = 8,
  showBuffs = true,
  showDebuffs = true,
  orientation = 'horizontal',
  size = 'md',
  onConditionClick,
  className,
}: ActiveConditionsPanelProps) {
  // Разделяем на баффы и дебаффы
  const buffs: ActiveCondition[] = [];
  const debuffs: ActiveCondition[] = [];
  
  for (const c of conditions) {
    const def = conditionRegistry.get(c.id);
    if (!def) continue;
    
    if (def.type === 'buff' && showBuffs) {
      buffs.push(c);
    } else if (def.type === 'debuff' && showDebuffs) {
      debuffs.push(c);
    }
  }
  
  const visibleBuffs = buffs.slice(0, maxVisible);
  const visibleDebuffs = debuffs.slice(0, maxVisible);
  const hiddenBuffs = buffs.length - maxVisible;
  const hiddenDebuffs = debuffs.length - maxVisible;
  
  if (conditions.length === 0) {
    return null;
  }
  
  const containerClass = orientation === 'horizontal'
    ? 'flex flex-wrap gap-1'
    : 'flex flex-col gap-1';
  
  return (
    <TooltipProvider>
      <div className={cn(containerClass, className)}>
        {/* Баффы */}
        {visibleBuffs.map((condition) => (
          <ConditionTooltip key={condition.id} condition={condition}>
            <ConditionBadge
              condition={condition}
              size={size}
              onClick={() => onConditionClick?.(condition)}
            />
          </ConditionTooltip>
        ))}
        
        {/* Скрытые баффы */}
        {hiddenBuffs > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'inline-flex items-center justify-center rounded border bg-green-500/10 text-green-400',
                size === 'sm' && 'text-xs px-1.5 py-0.5',
                size === 'md' && 'text-sm px-2 py-1',
                size === 'lg' && 'text-base px-3 py-1.5',
              )}>
                +{hiddenBuffs}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Ещё {hiddenBuffs} баффов
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Разделитель */}
        {showBuffs && showDebuffs && buffs.length > 0 && debuffs.length > 0 && (
          <div className="w-px h-6 bg-border mx-1" />
        )}
        
        {/* Дебаффы */}
        {visibleDebuffs.map((condition) => (
          <ConditionTooltip key={condition.id} condition={condition}>
            <ConditionBadge
              condition={condition}
              size={size}
              onClick={() => onConditionClick?.(condition)}
            />
          </ConditionTooltip>
        ))}
        
        {/* Скрытые дебаффы */}
        {hiddenDebuffs > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'inline-flex items-center justify-center rounded border bg-red-500/10 text-red-400',
                size === 'sm' && 'text-xs px-1.5 py-0.5',
                size === 'md' && 'text-sm px-2 py-1',
                size === 'lg' && 'text-base px-3 py-1.5',
              )}>
                +{hiddenDebuffs}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Ещё {hiddenDebuffs} дебаффов
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

function ConditionTooltip({
  condition,
  children,
}: {
  condition: ActiveCondition;
  children: React.ReactNode;
}) {
  const def = conditionRegistry.get(condition.id);
  
  if (!def) return <>{children}</>;
  
  const remainingSec = Math.ceil(condition.duration / 1000);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-sm">
          {/* Заголовок */}
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">{def.icon}</span>
            <span className={def.color}>{def.name}</span>
            {condition.stacks && condition.stacks > 1 && (
              <span className="text-xs text-muted-foreground">
                ×{condition.stacks}
              </span>
            )}
          </div>
          
          {/* Описание */}
          <p className="text-muted-foreground">
            {def.description}
          </p>
          
          {/* Параметры */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1 border-t border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Осталось:</span>
              <span>{remainingSec} сек</span>
            </div>
            
            {def.tickInterval && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Тик:</span>
                <span>{def.tickInterval / 1000} сек</span>
              </div>
            )}
            
            {def.damagePerTick && (
              <div className="flex justify-between text-red-400">
                <span>Урон/тик:</span>
                <span>{def.damagePerTick}</span>
              </div>
            )}
            
            {def.healPerTick && (
              <div className="flex justify-between text-green-400">
                <span>Лечение/тик:</span>
                <span>{def.healPerTick}</span>
              </div>
            )}
            
            {def.slowPercent && (
              <div className="flex justify-between text-blue-400">
                <span>Замедление:</span>
                <span>{def.slowPercent}%</span>
              </div>
            )}
            
            {def.damageBonus && (
              <div className="flex justify-between text-amber-400">
                <span>Бонус урона:</span>
                <span>+{def.damageBonus}%</span>
              </div>
            )}
          </div>
          
          {/* Источник */}
          <div className="text-xs text-muted-foreground pt-1 border-t border-border">
            Источник: {getSourceLabel(condition.source)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function getSourceLabel(source: ActiveCondition['source']): string {
  const labels: Partial<Record<ActiveCondition['source'], string>> = {
    technique: 'Техника',
    weapon: 'Оружие',
    artifact: 'Артефакт',
    environment: 'Окружение',
    system: 'Система',
    item: 'Предмет',
    event: 'Событие',
  };
  return labels[source] ?? source;
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

interface ConditionSummaryProps {
  conditions: ActiveCondition[];
  className?: string;
}

export function ConditionSummary({ conditions, className }: ConditionSummaryProps) {
  const buffs = conditions.filter(c => {
    const def = conditionRegistry.get(c.id);
    return def?.type === 'buff';
  });
  
  const debuffs = conditions.filter(c => {
    const def = conditionRegistry.get(c.id);
    return def?.type === 'debuff';
  });
  
  const hasStun = conditions.some(c => 
    c.id === 'condition_stun' || c.id === 'condition_freezing'
  );
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Иконка баффов */}
      {buffs.length > 0 && (
        <div className="flex items-center gap-1 text-green-400">
          <span>⬆️</span>
          <span className="text-xs font-medium">{buffs.length}</span>
        </div>
      )}
      
      {/* Иконка дебаффов */}
      {debuffs.length > 0 && (
        <div className="flex items-center gap-1 text-red-400">
          <span>⬇️</span>
          <span className="text-xs font-medium">{debuffs.length}</span>
        </div>
      )}
      
      {/* Оглушение */}
      {hasStun && (
        <span className="text-yellow-400 animate-pulse">💫</span>
      )}
      
      {conditions.length === 0 && (
        <span className="text-xs text-muted-foreground">Нет состояний</span>
      )}
    </div>
  );
}
