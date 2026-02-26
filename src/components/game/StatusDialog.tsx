/**
 * Status Dialog Component
 * 
 * Полный статус персонажа:
 * - Характеристики (сила, ловкость, интеллект) - физические параметры тела
 * - Культивация (уровень, ядро, Ци, проводимость)
 * - Состояние (физическая, ментальная усталость)
 */

'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameCharacter, useGameTime } from '@/stores/game.store';
import {
  getCultivationLevelName,
  getCoreFillPercent,
  getBreakthroughProgress,
} from '@/lib/game/qi-shared';
import { 
  getConductivityMeditationProgress,
  getBaseConductivityForLevel,
} from '@/lib/game/conductivity-system';
import { 
  FATIGUE_CONSTANTS,
  QI_CONSTANTS,
} from '@/lib/game/constants';
import { formatTime, formatDate, getTimeOfDayName, getSeasonName } from '@/lib/game/time-system';
import type { WorldTime } from '@/lib/game/time-system';

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toWorldTime(wt: { year: number; month: number; day: number; hour: number; minute: number } | null): WorldTime | null {
  if (!wt) return null;
  return {
    year: wt.year,
    month: wt.month,
    day: wt.day,
    hour: wt.hour,
    minute: wt.minute,
    totalMinutes: wt.hour * 60 + wt.minute,
  };
}

export function StatusDialog({ open, onOpenChange }: StatusDialogProps) {
  const character = useGameCharacter();
  const worldTime = useGameTime();

  const currentWorldTime = useMemo(() => toWorldTime(worldTime), [worldTime]);

  if (!character) return null;

  // Прогресс заполнения ядра
  const qiPercent = getCoreFillPercent(character.currentQi, character.coreCapacity);

  // Прогресс прорыва
  const breakthroughProgress = getBreakthroughProgress(
    character.cultivationLevel,
    character.cultivationSubLevel,
    character.accumulatedQi,
    character.coreCapacity
  );

  // Прогресс медитаций на проводимость
  const conductivityProgress = getConductivityMeditationProgress(
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );

  // Базовая проводимость на уровне
  const baseConductivity = getBaseConductivityForLevel(character.cultivationLevel);

  // Название уровня
  const levelName = getCultivationLevelName(character.cultivationLevel);

  // Категоризация усталости
  const getFatigueColor = (value: number) => {
    if (value >= FATIGUE_CONSTANTS.CRITICAL_FATIGUE_THRESHOLD) return 'text-red-400';
    if (value >= FATIGUE_CONSTANTS.HIGH_FATIGUE_THRESHOLD) return 'text-amber-400';
    return 'text-green-400';
  };

  const getFatigueLabel = (value: number) => {
    if (value >= 90) return 'Критическая';
    if (value >= 70) return 'Высокая';
    if (value >= 40) return 'Средняя';
    if (value >= 10) return 'Лёгкая';
    return 'Отлично';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            📊 Статус персонажа
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Имя и уровень */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">{character.name}</h3>
                <p className="text-slate-400 text-sm">Возраст: {character.age} лет</p>
              </div>
              <div className="text-right">
                <Badge className="bg-amber-600 text-white text-lg px-3 py-1">
                  Ур. {character.cultivationLevel}.{character.cultivationSubLevel}
                </Badge>
                <p className="text-amber-400 text-sm mt-1">{levelName}</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700">
              <TabsTrigger value="stats" className="data-[state=active]:bg-amber-600">
                💪 Характеристики
              </TabsTrigger>
              <TabsTrigger value="cultivation" className="data-[state=active]:bg-purple-600">
                🌀 Культивация
              </TabsTrigger>
              <TabsTrigger value="fatigue" className="data-[state=active]:bg-blue-600">
                😴 Состояние
              </TabsTrigger>
            </TabsList>

            {/* Характеристики - только физические параметры тела */}
            <TabsContent value="stats" className="space-y-3 mt-4">
              <div className="text-xs text-slate-500 mb-2">
                Физические параметры тела
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Сила */}
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💪</div>
                  <div className="text-slate-400 text-xs">Сила</div>
                  <div className="text-white font-bold text-xl">{character.strength.toFixed(1)}</div>
                </div>

                {/* Ловкость */}
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🏃</div>
                  <div className="text-slate-400 text-xs">Ловкость</div>
                  <div className="text-white font-bold text-xl">{character.agility.toFixed(1)}</div>
                </div>

                {/* Интеллект */}
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🧠</div>
                  <div className="text-slate-400 text-xs">Интеллект</div>
                  <div className="text-white font-bold text-xl">{character.intelligence.toFixed(1)}</div>
                </div>
              </div>

              {/* Здоровье */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">❤️ Здоровье</span>
                  <span className={character.health > 50 ? 'text-green-400' : character.health > 25 ? 'text-amber-400' : 'text-red-400'}>
                    {character.health.toFixed(0)}%
                  </span>
                </div>
                <Progress value={character.health} className="h-2" />
              </div>

              {/* Ресурсы */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-slate-300 mb-2">💰 Ресурсы:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Духовные камни:</span>
                    <span className="text-cyan-400">{character.spiritStones || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Очки вклада:</span>
                    <span className="text-amber-400">{character.contributionPoints || 0}</span>
                  </div>
                </div>
              </div>

              {/* Время */}
              {currentWorldTime && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {formatTime(currentWorldTime)}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {formatDate(currentWorldTime)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-slate-400">{getTimeOfDayName(currentWorldTime)}</div>
                      <div className="text-slate-500">{getSeasonName(currentWorldTime)}</div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Культивация */}
            <TabsContent value="cultivation" className="space-y-3 mt-4">
              {/* Проводимость */}
              <div className="bg-cyan-900/20 border border-cyan-600/30 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-cyan-400 font-medium">⚡ Проводимость меридиан</span>
                  <span className="text-cyan-300 font-bold text-xl">{character.conductivity.toFixed(3)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Базовая на уровне:</span>
                    <span className="text-slate-400">{baseConductivity.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Множитель уровня:</span>
                    <span className="text-cyan-400">×{QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[character.cultivationLevel] || 1.0}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Бонус от МедП:</span>
                    <span className="text-cyan-400">+{conductivityProgress.currentBonus.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">МедП:</span>
                    <span className="text-cyan-400">{conductivityProgress.current}/{conductivityProgress.max}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-600/30">
                  <Progress value={conductivityProgress.percent} className="h-1.5" />
                </div>
                
                {/* Таблица коэффициентов проводимости */}
                <div className="mt-3 pt-2 border-t border-cyan-600/30">
                  <div className="text-xs text-slate-500 mb-2">📊 Коэффициенты проводимости по уровням:</div>
                  <div className="grid grid-cols-5 gap-1 text-xs">
                    {[1,2,3,4,5].map(lvl => (
                      <div key={lvl} className={`text-center p-1 rounded ${character.cultivationLevel === lvl ? 'bg-cyan-600/30' : ''}`}>
                        <div className="text-slate-400">{lvl}</div>
                        <div className="text-cyan-400">×{QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[lvl]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-xs mt-1">
                    {[6,7,8,9,10].map(lvl => (
                      <div key={lvl} className={`text-center p-1 rounded ${character.cultivationLevel === lvl ? 'bg-cyan-600/30' : ''}`}>
                        <div className="text-slate-400">{lvl}</div>
                        <div className="text-cyan-400">×{QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[lvl] || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ци */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">💫 Ци в ядре</span>
                  <span className="text-cyan-400 font-bold">
                    {character.currentQi} / {character.coreCapacity}
                  </span>
                </div>
                <Progress value={qiPercent} className="h-3" />
                <div className="text-xs text-slate-500 mt-1">Заполнение: {qiPercent}%</div>
              </div>

              {/* Ядро */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-400 mb-2">🔷 Ядро</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Ёмкость:</span>
                    <span className="text-purple-400">{character.coreCapacity} ед.</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Качество:</span>
                    <span className="text-purple-400">{character.coreQuality.toFixed(3)}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Качество ×100% = множитель ёмкости при прорыве
                </div>
              </div>

              {/* Прогресс прорыва */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">📈 Прогресс прорыва</span>
                  <span className="text-amber-400">
                    {breakthroughProgress.current} / {breakthroughProgress.required} заполнений
                  </span>
                </div>
                <Progress value={breakthroughProgress.percent} className="h-2" />
                <div className="text-xs text-slate-500 mt-1">
                  Накоплено Ци: {character.accumulatedQi} (для прорыва нужно {breakthroughProgress.required * character.coreCapacity})
                </div>
              </div>
            </TabsContent>

            {/* Состояние */}
            <TabsContent value="fatigue" className="space-y-3 mt-4">
              {/* Физическая усталость */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">💚 Физическая усталость</span>
                  <span className={getFatigueColor(character.fatigue)}>
                    {character.fatigue.toFixed(0)}% — {getFatigueLabel(character.fatigue)}
                  </span>
                </div>
                <Progress value={character.fatigue} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-red-500" />
                <div className="text-xs text-slate-500 mt-1">
                  Влияет на физические действия, бой, перемещение
                </div>
              </div>

              {/* Ментальная усталость */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">💜 Ментальная усталость</span>
                  <span className={getFatigueColor(character.mentalFatigue)}>
                    {character.mentalFatigue.toFixed(0)}% — {getFatigueLabel(character.mentalFatigue)}
                  </span>
                </div>
                <Progress value={character.mentalFatigue} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-red-500" />
                <div className="text-xs text-slate-500 mt-1">
                  Влияет на медитацию, техники Ци, концентрацию
                </div>
              </div>

              {/* Рекомендации */}
              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                <div className="text-sm font-medium text-slate-300 mb-2">📋 Рекомендации:</div>
                {character.fatigue >= 70 || character.mentalFatigue >= 70 ? (
                  <div className="text-amber-400 text-sm">
                    ⚠️ Высокая усталость! Рекомендуется отдохнуть или поспать.
                    {character.fatigue >= 70 && character.mentalFatigue >= 70 && (
                      <span className="block mt-1">8 часов сна полностью восстановят силы.</span>
                    )}
                  </div>
                ) : (
                  <div className="text-green-400 text-sm">
                    ✨ Состояние хорошее. Можно продолжать культивацию.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
