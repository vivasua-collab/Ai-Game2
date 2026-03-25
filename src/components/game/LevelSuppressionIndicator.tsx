/**
 * LevelSuppressionIndicator - Индикатор подавления уровнем
 * 
 * Показывает множитель урона при атаке на цель другого уровня:
 * - +5 уровней и более = иммунитет (0%)
 * - Меньше уровней = сниженный урон
 * - Ultimate-техники пробивают +4 уровня
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { calculateLevelSuppression } from '@/lib/constants/level-suppression';

interface LevelSuppressionIndicatorProps {
  /** Уровень атакующего */
  attackerLevel: number;
  /** Уровень защищающегося */
  defenderLevel: number;
  /** Тип атаки */
  attackType: 'normal' | 'technique' | 'ultimate';
  /** Уровень техники (если technique/ultimate) */
  techniqueLevel?: number;
  /** Компактный режим */
  compact?: boolean;
}

export function LevelSuppressionIndicator({
  attackerLevel,
  defenderLevel,
  attackType,
  techniqueLevel,
  compact = false
}: LevelSuppressionIndicatorProps) {
  const levelDiff = attackerLevel - defenderLevel;
  const multiplier = calculateLevelSuppression(
    attackerLevel,
    defenderLevel,
    attackType,
    techniqueLevel
  );
  
  // Если нет подавления - не показываем
  if (multiplier === 1) return null;
  
  // Цвет по силе подавления
  const getColor = () => {
    if (multiplier === 0) return 'text-red-400 border-red-500';
    if (multiplier < 0.25) return 'text-red-400 border-red-400';
    if (multiplier < 0.5) return 'text-orange-400 border-orange-400';
    if (multiplier < 0.75) return 'text-yellow-400 border-yellow-400';
    return 'text-green-400 border-green-400';
  };
  
  // Текст описания
  const getDescription = () => {
    if (multiplier === 0) return '🛡️ Иммунитет!';
    if (levelDiff >= 5) return 'Подавление уровнем';
    if (levelDiff <= -5) return 'Превосходство';
    if (multiplier < 1) return 'Снижение урона';
    return '';
  };
  
  // Иконка
  const getIcon = () => {
    if (multiplier === 0) return '🛡️';
    if (multiplier < 0.5) return '⚠️';
    if (multiplier < 1) return '📉';
    return '📊';
  };
  
  if (compact) {
    return (
      <span className={`text-xs font-medium ${getColor().split(' ')[0]}`}>
        {multiplier === 0 ? '🛡️' : `×${Math.round(multiplier * 100)}%`}
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${getColor()} font-medium`}>
        <span className="mr-1">{getIcon()}</span>
        {multiplier === 0 ? 'Иммунитет' : `×${Math.round(multiplier * 100)}%`}
      </Badge>
      
      <div className="text-xs text-slate-400">
        <span>{getDescription()}</span>
        {attackType === 'ultimate' && (
          <span className="ml-1 text-amber-400">⚡Ultimate</span>
        )}
      </div>
    </div>
  );
}

/**
 * Расширенная версия с деталями
 */
export function LevelSuppressionDetails({
  attackerLevel,
  defenderLevel,
  attackType,
  techniqueLevel
}: LevelSuppressionIndicatorProps) {
  const levelDiff = attackerLevel - defenderLevel;
  const multiplier = calculateLevelSuppression(
    attackerLevel,
    defenderLevel,
    attackType,
    techniqueLevel
  );
  
  // Если нет подавления
  if (multiplier === 1) {
    return (
      <div className="text-xs text-green-400">
        ✓ Полный урон (уровни равны)
      </div>
    );
  }
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-400">Уровень атакующего:</span>
        <span className="text-white">L{attackerLevel}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Уровень цели:</span>
        <span className="text-white">L{defenderLevel}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Разница:</span>
        <span className={levelDiff >= 0 ? 'text-red-400' : 'text-green-400'}>
          {levelDiff >= 0 ? '+' : ''}{levelDiff}
        </span>
      </div>
      
      <div className="pt-2 border-t border-slate-600">
        <div className="flex justify-between font-medium">
          <span className="text-slate-300">Множитель урона:</span>
          <span className={multiplier === 0 ? 'text-red-400' : multiplier < 1 ? 'text-orange-400' : 'text-green-400'}>
            {multiplier === 0 ? 'Иммунитет' : `×${Math.round(multiplier * 100)}%`}
          </span>
        </div>
      </div>
      
      {attackType === 'ultimate' && (
        <div className="pt-2 border-t border-slate-600">
          <span className="text-amber-400">⚡ Ultimate-техника пробивает +4 уровня</span>
        </div>
      )}
    </div>
  );
}

export default LevelSuppressionIndicator;
