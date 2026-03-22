/**
 * QiBufferStatus - Индикатор Qi Buffer 90%
 * 
 * Показывает количество Ци, доступное для защиты:
 * - 90% от текущей Ци используется как буфер
 * - При наличии щит-техники - 100%
 * 
 * Размещение: StatusDialog.tsx или HUD
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameCharacter } from '@/stores/game.store';

interface QiBufferStatusProps {
  /** Щит-техника активна (100% поглощение) */
  hasShieldTechnique?: boolean;
  /** Дополнительное Ци от щит-техники */
  shieldQi?: number;
  /** Компактный режим */
  compact?: boolean;
}

export function QiBufferStatus({ 
  hasShieldTechnique = false, 
  shieldQi,
  compact = false 
}: QiBufferStatusProps) {
  const character = useGameCharacter();
  
  if (!character) return null;
  
  // coreCapacity = максимальная ёмкость ядра Ци
  const { currentQi, coreCapacity } = character;
  const maxQi = coreCapacity; // Алиас для читаемости
  
  // 90% доступно для защиты (или 100% со щит-техникой)
  const absorptionPercent = hasShieldTechnique ? 1.0 : 0.9;
  const bufferQi = Math.floor(currentQi * absorptionPercent);
  const qiPercent = maxQi > 0 ? (bufferQi / maxQi) * 100 : 0;
  
  // Цвет по заполненности буфера
  const getProgressColor = () => {
    if (qiPercent >= 70) return 'bg-cyan-500';
    if (qiPercent >= 40) return 'bg-cyan-400';
    if (qiPercent >= 20) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  const getTextColor = () => {
    if (qiPercent >= 70) return 'text-cyan-400';
    if (qiPercent >= 40) return 'text-cyan-300';
    if (qiPercent >= 20) return 'text-amber-400';
    return 'text-red-400';
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-cyan-400">🛡️</span>
        <Progress value={qiPercent} className="h-1.5 w-16" />
        <span className="text-slate-400">
          {bufferQi.toLocaleString()}
        </span>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">🛡️ Qi Buffer</span>
          {hasShieldTechnique && (
            <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
              ⚛️ Щит
            </Badge>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {hasShieldTechnique ? '100%' : '90%'} absorption
        </span>
      </div>
      
      <Progress value={qiPercent} className="h-2" />
      
      <div className="flex justify-between text-xs mt-2">
        <span className={getTextColor()}>Доступно: {bufferQi.toLocaleString()} Ци</span>
        <span className="text-slate-500">Макс: {maxQi.toLocaleString()} Ци</span>
      </div>
      
      {hasShieldTechnique && shieldQi && shieldQi > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-600 text-xs">
          <div className="flex justify-between text-green-400">
            <span>⚛️ Щит-техника:</span>
            <span>{shieldQi.toLocaleString()} Ци</span>
          </div>
        </div>
      )}
      
      {/* Подсказка */}
      <div className="mt-2 text-xs text-slate-500">
        💡 Буфер поглощает урон прежде чем он достигнет тела
      </div>
    </div>
  );
}

export default QiBufferStatus;
