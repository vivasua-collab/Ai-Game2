/**
 * DurabilityBar - Полоса прочности экипировки
 */

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DurabilityCondition } from '@/types/equipment-v2';

interface DurabilityBarProps {
  current: number;
  max: number;
  condition?: DurabilityCondition;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DurabilityBar({ 
  current, 
  max, 
  condition,
  showLabel = true,
  size = 'md',
}: DurabilityBarProps) {
  const percent = Math.floor((current / max) * 100);
  const actualCondition = condition ?? getConditionFromPercent(percent);
  const config = CONDITION_CONFIG[actualCondition];
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };
  
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className={config.textColor}>
            {config.label}
          </span>
          <span className="text-muted-foreground">
            {current}/{max}
          </span>
        </div>
      )}
      <div className="relative">
        <Progress 
          value={percent} 
          className={cn(sizeClasses[size], "bg-muted")}
        />
        <div 
          className={cn(
            "absolute inset-0 rounded-full transition-all",
            config.bgColor
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Определение состояния по проценту
function getConditionFromPercent(percent: number): DurabilityCondition {
  if (percent >= 90) return 'pristine';
  if (percent >= 70) return 'good';
  if (percent >= 50) return 'worn';
  if (percent >= 20) return 'damaged';
  return 'broken';
}

// Конфигурация состояний
const CONDITION_CONFIG: Record<DurabilityCondition, {
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  pristine: {
    label: 'Безупречное',
    bgColor: 'bg-green-500',
    textColor: 'text-green-500',
  },
  good: {
    label: 'Хорошее',
    bgColor: 'bg-lime-500',
    textColor: 'text-lime-500',
  },
  worn: {
    label: 'Поношенное',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-500',
  },
  damaged: {
    label: 'Повреждённое',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-500',
  },
  broken: {
    label: 'Сломанное',
    bgColor: 'bg-red-500',
    textColor: 'text-red-500',
  },
};

// Экспорт для использования в других компонентах
export function getConditionLabel(condition: DurabilityCondition): string {
  return CONDITION_CONFIG[condition].label;
}

export function getConditionColor(condition: DurabilityCondition): string {
  return CONDITION_CONFIG[condition].bgColor;
}
