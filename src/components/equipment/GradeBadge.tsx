/**
 * GradeBadge - Бейдж для отображения грейда экипировки
 */

import { Badge } from '@/components/ui/badge';
import { EquipmentGrade } from '@/types/equipment-v2';
import { GRADE_CONFIGS } from '@/lib/game/grade-system';

interface GradeBadgeProps {
  grade: EquipmentGrade;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function GradeBadge({ grade, size = 'md', showIcon = true }: GradeBadgeProps) {
  const config = GRADE_CONFIGS[grade];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  return (
    <Badge 
      className={`${config.color} ${sizeClasses[size]} font-medium border-current`}
      variant="outline"
      style={{ borderColor: config.colorHex }}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.name}
    </Badge>
  );
}

// Экспорт цветов для использования в других компонентах
export const GRADE_COLORS: Record<EquipmentGrade, string> = {
  damaged: '#f87171',
  common: '#9ca3af',
  refined: '#4ade80',
  perfect: '#60a5fa',
  transcendent: '#fbbf24',
};
