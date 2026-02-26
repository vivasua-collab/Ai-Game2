/**
 * Status Dialog Component
 * 
 * Полный статус персонажа:
 * - Характеристики (сила, ловкость, интеллект, проводимость)
 * - Культивация (уровень, ядро, Ци)
 * - Усталость (физическая, ментальная)
 * - Навыки культивации
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameCharacter, useGameTime, useGameTechniques, useGameSkills, useGameLocation } from '@/stores/game.store';
import {
  getCultivationLevelName,
  getCoreFillPercent,
  getBreakthroughProgress,
  calculateQiRates,
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  getConductivityMultiplier,
} from '@/lib/game/qi-shared';
import { QI_CONSTANTS } from '@/lib/game/constants';
import { CULTIVATION_LEVEL_NAMES, FATIGUE_CONSTANTS } from '@/lib/game/constants';
import { formatTime, formatDate, getTimeOfDayName, getSeasonName } from '@/lib/game/time-system';
import type { WorldTime } from '@/lib/game/time-system';

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Конвертация worldTime из store
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
  const techniques = useGameTechniques();
  const skills = useGameSkills();
  const location = useGameLocation();

  const currentWorldTime = useMemo(() => toWorldTime(worldTime), [worldTime]);

  // Расчёт скоростей Ци
  const qiRates = useMemo(() => {
    if (!character) return null;
    return calculateQiRates(character, location);
  }, [character, location]);

  // Скорость пассивного прироста (только микроядро, до 90% капа)
  const passiveQiRate = useMemo(() => {
    if (!character) return null;
    const coreRate = calculateCoreGenerationRate(character.coreCapacity);
    // В минуту
    return coreRate * 60;
  }, [character]);

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
            <TabsList className="grid w-full grid-cols-4 bg-slate-700">
              <TabsTrigger value="stats" className="data-[state=active]:bg-amber-600">
                💪 Характеристики
              </TabsTrigger>
              <TabsTrigger value="cultivation" className="data-[state=active]:bg-purple-600">
                🌀 Культивация
              </TabsTrigger>
              <TabsTrigger value="fatigue" className="data-[state=active]:bg-blue-600">
                😴 Состояние
              </TabsTrigger>
              <TabsTrigger value="time" className="data-[state=active]:bg-cyan-600">
                ⏰ Время
              </TabsTrigger>
            </TabsList>

            {/* Характеристики */}
            <TabsContent value="stats" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Сила */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 flex items-center gap-2">
                      💪 Сила
                    </span>
                    <span className="text-white font-bold text-lg">{character.strength}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Влияет на физические техники, урон в ближнем бою
                  </div>
                </div>

                {/* Ловкость */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 flex items-center gap-2">
                      🏃 Ловкость
                    </span>
                    <span className="text-white font-bold text-lg">{character.agility}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Влияет на скорость, уклонение, техники движения
                  </div>
                </div>

                {/* Интеллект */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 flex items-center gap-2">
                      🧠 Интеллект
                    </span>
                    <span className="text-white font-bold text-lg">{character.intelligence}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Влияет на техники Ци, скорость обучения, прозрение
                  </div>
                </div>

                {/* Проводимость */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 flex items-center gap-2">
                      ⚡ Проводимость
                    </span>
                    <span className="text-cyan-400 font-bold text-lg">{character.conductivity.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Скорость поглощения Ци из среды. Растёт с культивацией
                  </div>
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
            </TabsContent>

            {/* Культивация */}
            <TabsContent value="cultivation" className="space-y-3 mt-4">
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

              {/* Ёмкость ядра */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">🔷 Ёмкость ядра</span>
                  <span className="text-purple-400">{character.coreCapacity} ед.</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-300">✨ Качество ядра</span>
                  <span className="text-purple-400">{character.coreQuality.toFixed(2)}</span>
                </div>
              </div>

              {/* Скорость прироста Ци */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-slate-300 mb-2">⚡ Скорость прироста Ци</div>
                
                {/* Пассивный прирост от микроядра */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Микроядро (пассивно):</span>
                  <span className="text-cyan-400">
                    +{passiveQiRate?.toFixed(2) || '0'} Ци/мин
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 mb-2">
                  Работает всегда, до {(QI_CONSTANTS.PASSIVE_QI_CAP * 100).toFixed(0)}% ёмкости
                </div>
                
                {/* Поглощение из среды (при медитации) */}
                {qiRates && qiRates.environmentalAbsorption > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm border-t border-slate-600/50 pt-2">
                      <span className="text-slate-400">Из среды (медитация):</span>
                      <span className="text-green-400">
                        +{(qiRates.environmentalAbsorption * 60).toFixed(2)} Ци/мин
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Плотность Ци: {location?.qiDensity || QI_CONSTANTS.DEFAULT_QI_DENSITY}</span>
                      <span>Проводимость: {character.conductivity.toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {/* Итого при медитации */}
                {qiRates && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-600/50 pt-2 mt-2">
                    <span className="text-amber-300">Итого (медитация):</span>
                    <span className="text-amber-400 font-bold">
                      +{(qiRates.total * 60).toFixed(2)} Ци/мин
                    </span>
                  </div>
                )}
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

              {/* Техники */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">⚔️ Изученные техники</span>
                  <span className="text-green-400">{techniques.length}</span>
                </div>
                {techniques.length > 0 ? (
                  <div className="space-y-1">
                    {techniques.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between text-xs">
                        <span className="text-slate-400">{t.technique.name}</span>
                        <span className="text-amber-400">Мастерство: {t.mastery}%</span>
                      </div>
                    ))}
                    {techniques.length > 3 && (
                      <div className="text-xs text-slate-500">
                        ...и ещё {techniques.length - 3} техник
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Нет изученных техник</div>
                )}
              </div>
            </TabsContent>

            {/* Усталость */}
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

            {/* Время */}
            <TabsContent value="time" className="space-y-3 mt-4">
              {currentWorldTime && (
                <>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">
                        {formatTime(currentWorldTime)}
                      </div>
                      <div className="text-slate-400">
                        {formatDate(currentWorldTime)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-slate-400 text-sm">Время суток</div>
                      <div className="text-white font-medium">{getTimeOfDayName(currentWorldTime)}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-slate-400 text-sm">Сезон</div>
                      <div className="text-white font-medium">{getSeasonName(currentWorldTime)}</div>
                    </div>
                  </div>
                </>
              )}

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
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
