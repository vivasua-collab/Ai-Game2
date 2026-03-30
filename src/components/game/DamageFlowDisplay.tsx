/**
 * DamageFlowDisplay - Визуализация pipeline урона
 * 
 * Показывает пошаговое прохождение урона через слои защиты:
 * 1. Raw Damage (исходный урон)
 * 2. Level Suppression (множитель)
 * 3. Active Defense (уклонение/блок)
 * 4. Qi Buffer (90% поглощение)
 * 5. Armor (снижение бронёй)
 * 6. Material Reduction (chitin 20%, etc.)
 * 7. Final Damage
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { DamagePipelineResult } from '@/lib/game/damage-pipeline';

interface DamageFlowDisplayProps {
  /** Результат пайплайна урона */
  result: DamagePipelineResult;
  /** Компактный режим */
  compact?: boolean;
  /** Показывать анимацию */
  animated?: boolean;
}

/**
 * Карточка одного слоя защиты
 */
function DamageLayerCard({
  label,
  icon,
  inputValue,
  outputValue,
  reduction,
  color = 'slate',
  details,
}: {
  label: string;
  icon: string;
  inputValue: number;
  outputValue: number;
  reduction?: number;
  color?: 'slate' | 'cyan' | 'amber' | 'red' | 'green' | 'purple';
  details?: string;
}) {
  const colorClasses = {
    slate: 'border-slate-600 bg-slate-700/30',
    cyan: 'border-cyan-600 bg-cyan-900/20',
    amber: 'border-amber-600 bg-amber-900/20',
    red: 'border-red-600 bg-red-900/20',
    green: 'border-green-600 bg-green-900/20',
    purple: 'border-purple-600 bg-purple-900/20',
  };

  return (
    <div className={`rounded-lg border p-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium flex items-center gap-1">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        {reduction !== undefined && reduction > 0 && (
          <Badge variant="outline" className="text-xs">
            -{Math.round(reduction * 100)}%
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Вход: {Math.floor(inputValue)}</span>
        <span className="text-slate-500">→</span>
        <span className="text-white font-medium">Выход: {Math.floor(outputValue)}</span>
      </div>
      
      {details && (
        <div className="text-xs text-slate-500 mt-1">{details}</div>
      )}
    </div>
  );
}

export function DamageFlowDisplay({
  result,
  compact = false,
  animated = true,
}: DamageFlowDisplayProps) {
  const layers = useMemo(() => {
    const items: Array<{
      label: string;
      icon: string;
      input: number;
      output: number;
      reduction?: number;
      color: 'slate' | 'cyan' | 'amber' | 'red' | 'green' | 'purple';
      details?: string;
      skip?: boolean;
    }> = [];

    // Слой 1: Исходный урон
    items.push({
      label: 'Исходный урон',
      icon: '⚔️',
      input: result.rawDamage,
      output: result.rawDamage,
      color: 'slate',
    });

    // Слой 2: Level Suppression
    if (result.levelSuppression.wasSuppressed || result.levelSuppression.multiplier < 1) {
      items.push({
        label: 'Подавление уровнем',
        icon: '📊',
        input: result.rawDamage,
        output: result.damageAfterSuppression,
        reduction: 1 - result.levelSuppression.multiplier,
        color: result.levelSuppression.multiplier === 0 ? 'red' : 'amber',
        details: result.levelSuppression.multiplier === 0
          ? `Иммунитет (+${result.levelSuppression.levelDifference} ур.)`
          : `×${result.levelSuppression.multiplier.toFixed(2)}`,
        skip: result.wasImmune,
      });
    }

    // Если иммунитет - дальше не идём
    if (result.wasImmune) {
      return items;
    }

    // Слой 4: Активная защита
    if (result.activeDefense && result.activeDefense.success) {
      items.push({
        label: result.activeDefense.type === 'dodge' ? 'Уклонение' 
              : result.activeDefense.type === 'parry' ? 'Парирование' 
              : 'Блок',
        icon: result.activeDefense.type === 'dodge' ? '💨' 
             : result.activeDefense.type === 'parry' ? '⚔️' 
             : '🛡️',
        input: result.damageAfterSuppression,
        output: result.damageAfterActiveDefense,
        reduction: result.activeDefense.damageReduction,
        color: 'green',
        details: result.activeDefense.message,
      });
    }

    // Слой 5: Qi Buffer
    if (result.qiBuffer && result.qiBuffer.bufferActivated) {
      const input = result.damageAfterActiveDefense;
      const output = result.damageAfterQiBuffer;
      const reduction = input > 0 ? result.qiBuffer.absorbedDamage / input : 0;
      
      items.push({
        label: 'Qi Buffer',
        icon: '✨',
        input,
        output,
        reduction,
        color: 'cyan',
        details: `Поглощено: ${Math.floor(result.qiBuffer.absorbedDamage)} | Ци: -${Math.floor(result.qiBuffer.qiConsumed)}`,
      });
    }

    // Слой 6-7: Броня
    if (result.armor && result.armor.coverageTriggered && result.damageAfterQiBuffer !== result.damageAfterArmor) {
      items.push({
        label: 'Броня',
        icon: '🛡️',
        input: result.damageAfterQiBuffer,
        output: result.damageAfterArmor,
        reduction: result.armor.damageReduction,
        color: 'purple',
      });
    }

    // Слой 8: Материал тела
    if (result.materialReduction > 0 && result.damageAfterArmor !== result.finalDamage) {
      items.push({
        label: 'Материал тела',
        icon: '🧬',
        input: result.damageAfterArmor,
        output: result.finalDamage,
        reduction: result.materialReduction,
        color: 'slate',
      });
    }

    // Финальный урон
    if (items[items.length - 1]?.output !== result.finalDamage) {
      items.push({
        label: 'Финальный урон',
        icon: '❤️',
        input: result.damageAfterArmor,
        output: result.finalDamage,
        color: result.finalDamage > 0 ? 'red' : 'green',
      });
    }

    return items;
  }, [result]);

  // Компактный режим
  if (compact) {
    const totalReduction = result.rawDamage > 0 
      ? 1 - (result.finalDamage / result.rawDamage)
      : 0;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">
          {result.rawDamage} → {result.finalDamage}
        </span>
        <Progress value={totalReduction * 100} className="h-1.5 w-16" />
        <span className={result.finalDamage > 0 ? 'text-red-400' : 'text-green-400'}>
          {result.wasImmune ? '🛡️' : result.wasFullyBlocked ? '✅' : '💔'} 
          {result.finalDamage}
        </span>
      </div>
    );
  }

  // Полный режим
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📊 Расчёт урона</span>
            {result.wasImmune && (
              <Badge className="bg-green-600">Иммунитет</Badge>
            )}
            {result.wasFullyBlocked && !result.wasImmune && (
              <Badge className="bg-cyan-600">Заблокирован</Badge>
            )}
          </span>
          <span className={result.finalDamage > 0 ? 'text-red-400' : 'text-green-400'}>
            {result.finalDamage} урона
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Flow visualization */}
        <div className="space-y-1">
          {layers.map((layer, index) => (
            <div 
              key={index}
              className={`${animated ? 'animate-in fade-in slide-in-from-left-2' : ''}`}
              style={{ animationDelay: animated ? `${index * 100}ms` : undefined }}
            >
              <DamageLayerCard
                label={layer.label}
                icon={layer.icon}
                inputValue={layer.input}
                outputValue={layer.output}
                reduction={layer.reduction}
                color={layer.color}
                details={layer.details}
              />
            </div>
          ))}
        </div>

        {/* Progress bar showing total reduction */}
        <div className="pt-2 border-t border-slate-600">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Общее снижение</span>
            <span>
              {result.rawDamage > 0 
                ? Math.round((1 - result.finalDamage / result.rawDamage) * 100)
                : 0}%
            </span>
          </div>
          <Progress 
            value={result.rawDamage > 0 
              ? (1 - result.finalDamage / result.rawDamage) * 100 
              : 0
            } 
            className="h-2"
          />
        </div>

        {/* Message */}
        {result.message && (
          <div className="text-xs text-slate-400 italic mt-2">
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DamageFlowDisplay;
