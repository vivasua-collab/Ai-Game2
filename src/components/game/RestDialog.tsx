/**
 * Rest Dialog Component
 * 
 * Единый диалог для всех видов отдыха:
 * - 🧘 Медитация: накопление Ци (3 типа на выбор)
 * - 🌿 Отдых: медленное восстановление усталости
 * - 😴 Сон: быстрое восстановление усталости
 * 
 * Техника культивации назначается через меню Техники → вкладка Культивация.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameCharacter, useGameLocation, useGameTime, useGameActions, useGameTechniques } from '@/stores/game.store';
import {
  calculateQiRates,
  calculateTimeToFull,
  formatTime as formatQiTime,
  calculateMeditationFatigue,
  canMeditate,
  getCoreFillPercent,
} from '@/lib/game/qi-shared';
import {
  FATIGUE_CONSTANTS,
  FATIGUE_RECOVERY_BY_LEVEL,
  TIME_CONSTANTS,
  QI_CONSTANTS,
} from '@/lib/game/constants';
import {
  formatTime,
  formatDate,
  formatDuration,
  roundMeditationTime,
} from '@/lib/game/time-system';
import type { WorldTime } from '@/lib/game/time-system';
import {
  getConductivityMeditationProgress,
  calculateTransferTime,
  calculateTotalConductivity,
} from '@/lib/game/conductivity-system';

type RestActivityType = 'meditation' | 'light' | 'sleep';
type MeditationSubType = 'accumulation' | 'breakthrough' | 'conductivity';

// Константы для разных типов
const ACTIVITY_CONFIG = {
  meditation: {
    minDuration: TIME_CONSTANTS.MIN_MEDITATION_TICKS,
    maxDuration: 480,
    step: TIME_CONSTANTS.MEDITATION_TICK_STEP,
    icon: '🧘',
    title: 'Медитация',
    description: 'Накопление Ци через концентрацию.',
    color: 'bg-purple-600 hover:bg-purple-700',
  },
  light: {
    minDuration: 30,
    maxDuration: 480,
    step: 30,
    icon: '🌿',
    title: 'Отдых',
    description: 'Медленное восстановление сил.',
    color: 'bg-green-600 hover:bg-green-700',
  },
  sleep: {
    minDuration: 240,
    maxDuration: 480,
    step: 30,
    icon: '😴',
    title: 'Сон',
    description: 'Глубокое восстановление. 8ч = полное восстановление.',
    color: 'bg-blue-600 hover:bg-blue-700',
  },
};

// Типы медитации
const MEDITATION_TYPES = {
  accumulation: {
    icon: '🧘',
    name: 'Накопление',
    description: 'Заполнение ядра Ци. Базовая усталость.',
    fatigueMultiplier: 1.0,
  },
  breakthrough: {
    icon: '🔥',
    name: 'На прорыв',
    description: 'При заполнении → Ци в accumulatedQi. x2 усталость.',
    fatigueMultiplier: 2.0,
  },
  conductivity: {
    icon: '⚡',
    name: 'На проводимость',
    description: 'При заполнении → +1 МедП. x1.5 усталость.',
    fatigueMultiplier: 1.5,
  },
};

// Быстрый выбор для разных типов
const QUICK_DURATIONS = {
  meditation: [30, 60, 120, 180, 240, 480],
  light: [30, 60, 120, 240, 480],
  sleep: [240, 360, 480],
};

interface RestDialogProps {
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

export function RestDialog({ open, onOpenChange }: RestDialogProps) {
  const character = useGameCharacter();
  const location = useGameLocation();
  const worldTime = useGameTime();
  const { loadState } = useGameActions();

  const [activityType, setActivityType] = useState<RestActivityType>('meditation');
  const [meditationType, setMeditationType] = useState<MeditationSubType>('accumulation');
  const [duration, setDuration] = useState(TIME_CONSTANTS.MIN_MEDITATION_TICKS);
  const [inputValue, setInputValue] = useState(String(TIME_CONSTANTS.MIN_MEDITATION_TICKS));
  const [isActing, setIsActing] = useState(false);
  const [result, setResult] = useState<{ 
    message: string; 
    interrupted?: boolean;
    interruptionEvent?: {
      id: string;
      type: string;
      subType: string;
      dangerLevel: number;
      description: string;
      canIgnore: boolean;
      canHide: boolean;
    };
  } | null>(null);

  const techniques = useGameTechniques();
  const slottedCultivationTechnique = useMemo(() => {
    return techniques.find(t => t.quickSlot === 0 && t.technique.type === 'cultivation');
  }, [techniques]);

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setActivityType('meditation');
      setMeditationType('accumulation');
      setDuration(TIME_CONSTANTS.MIN_MEDITATION_TICKS);
      setInputValue(String(TIME_CONSTANTS.MIN_MEDITATION_TICKS));
      setResult(null);
    }
  }, [open]);

  const config = useMemo(() => ACTIVITY_CONFIG[activityType], [activityType]);
  const meditationConfig = useMemo(() => MEDITATION_TYPES[meditationType], [meditationType]);

  const handleActivityTypeChange = useCallback((type: string) => {
    const newType = type as RestActivityType;
    setActivityType(newType);
    const newMin = ACTIVITY_CONFIG[newType].minDuration;
    setDuration(newMin);
    setInputValue(String(newMin));
    setResult(null);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      const rounded = roundMeditationTime(num);
      const clamped = Math.max(config.minDuration, Math.min(config.maxDuration, rounded));
      setDuration(clamped);
    }
  }, [config]);

  const handleSliderChange = useCallback((values: number[]) => {
    const rawValue = values[0];
    const newDuration = rawValue < config.minDuration 
      ? config.minDuration 
      : roundMeditationTime(rawValue);
    const clamped = Math.min(config.maxDuration, newDuration);
    setDuration(clamped);
    setInputValue(String(clamped));
  }, [config]);

  // === РАСЧЁТЫ ДЛЯ МЕДИТАЦИИ ===
  const qiRates = useMemo(() => {
    if (!character || activityType !== 'meditation') return null;
    return calculateQiRates(character, location);
  }, [character, location, activityType]);

  const meditationEstimate = useMemo(() => {
    if (!character || !qiRates || activityType !== 'meditation') {
      return { qiGained: 0, willFillCore: false, timeToFull: 0 };
    }

    const durationSeconds = duration * 60;
    const totalGain = qiRates.total * durationSeconds;
    const qiGained = Math.floor(totalGain);
    const qiToFull = character.coreCapacity - character.currentQi;
    const willFillCore = qiToFull > 0 && (character.currentQi + qiGained) >= character.coreCapacity;
    const timeToFull = calculateTimeToFull(character.currentQi, character.coreCapacity, qiRates);

    return { qiGained, willFillCore, timeToFull };
  }, [character, qiRates, duration, activityType]);

  const canMeditateNowResult = useMemo(() => {
    if (!character || activityType !== 'meditation') return { canMeditate: true };
    return canMeditate(character.currentQi, character.coreCapacity, meditationType);
  }, [character, activityType, meditationType]);
  
  // For backwards compatibility with boolean checks
  const canMeditateNow = canMeditateNowResult.canMeditate;
  
  // Проверка доступности для каждого типа медитации
  const meditationTypeAvailability = useMemo(() => {
    if (!character) return { accumulation: true, breakthrough: false, conductivity: false };
    return {
      accumulation: canMeditate(character.currentQi, character.coreCapacity, 'accumulation').canMeditate,
      breakthrough: canMeditate(character.currentQi, character.coreCapacity, 'breakthrough').canMeditate,
      conductivity: canMeditate(character.currentQi, character.coreCapacity, 'conductivity').canMeditate,
    };
  }, [character]);

  // === ПРОВОДИМОСТЬ (вычисленная динамически) ===
  const totalConductivity = useMemo(() => {
    if (!character) return 0;
    return calculateTotalConductivity(
      character.coreCapacity,
      character.cultivationLevel,
      character.conductivityMeditations || 0
    );
  }, [character]);
  
  // Calculate fixed duration for breakthrough/conductivity
  const fixedDurationInfo = useMemo(() => {
    if (activityType !== 'meditation' || meditationType === 'accumulation' || !character || !qiRates) return null;
    
    const currentQi = character.currentQi;
    const maxQi = character.coreCapacity;
    const isFull = currentQi >= maxQi;
    
    if (meditationType === 'breakthrough') {
      const transferSeconds = 60; // 1 минута на перенос
      
      if (isFull) {
        return {
          duration: 1,
          description: 'Перенос всей Ци из ядра в накопленную (60 сек)'
        };
      }
      
      // При 90-100%: время накопления + перенос
      const qiToFull = maxQi - currentQi;
      const secondsToFull = Math.ceil(qiToFull / qiRates.total);
      const totalMinutes = Math.ceil((secondsToFull + transferSeconds) / 60);
      
      return {
        duration: totalMinutes,
        description: `Накопление до 100% (${secondsToFull} сек) + перенос (60 сек)`
      };
    }
    
    if (meditationType === 'conductivity') {
      // Используем единую функцию из conductivity-system.ts и динамическую проводимость
      const secondsPerTransfer = calculateTransferTime(maxQi, totalConductivity);
      
      if (isFull) {
        return {
          duration: Math.ceil(secondsPerTransfer / 60),
          description: `Перенос Ци в расширение каналов (~${secondsPerTransfer} сек)`
        };
      }
      
      // При 90-100%: время накопления + перенос
      const qiToFull = maxQi - currentQi;
      const secondsToFull = Math.ceil(qiToFull / qiRates.total);
      const totalSeconds = secondsToFull + secondsPerTransfer;
      const totalMinutes = Math.ceil(totalSeconds / 60);
      
      return {
        duration: totalMinutes,
        description: `Накопление до 100% (${secondsToFull} сек) + перенос (${secondsPerTransfer} сек)`
      };
    }
    
    return null;
  }, [activityType, meditationType, character, qiRates, totalConductivity]);

  // === РЕАЛЬНАЯ ДЛИТЕЛЬНОСТЬ ДЛЯ ОТОБРАЖЕНИЯ ===
  // Для прорыва/проводимости используем расчётную длительность
  const effectiveDuration = useMemo(() => {
    if (activityType === 'meditation' && meditationType !== 'accumulation' && fixedDurationInfo) {
      return fixedDurationInfo.duration;
    }
    return duration;
  }, [activityType, meditationType, fixedDurationInfo, duration]);

  const meditationFatigue = useMemo(() => {
    if (activityType !== 'meditation') {
      return { physicalGain: 0, mentalGain: 0 };
    }
    // Для прорыва/проводимости используем effectiveDuration
    return calculateMeditationFatigue(effectiveDuration, meditationType);
  }, [effectiveDuration, activityType, meditationType]);

  // === ПРОГРЕСС МЕДИТАЦИЙ НА ПРОВОДИМОСТЬ ===
  const conductivityProgress = useMemo(() => {
    if (!character || meditationType !== 'conductivity') return null;
    return getConductivityMeditationProgress(
      character.coreCapacity,
      character.cultivationLevel,
      character.conductivityMeditations || 0
    );
  }, [character, meditationType]);

  const qiPercent = character ? getCoreFillPercent(character.currentQi, character.coreCapacity) : 0;

  // === РАСЧЁТЫ ДЛЯ ОТДЫХА/СНА ===
  const fatigueRecovery = useMemo(() => {
    if (!character || activityType === 'meditation') {
      return { physical: 0, mental: 0 };
    }

    const levelMultiplier = FATIGUE_RECOVERY_BY_LEVEL[character.cultivationLevel] || 1.0;

    if (activityType === 'sleep') {
      return {
        physical: duration * FATIGUE_CONSTANTS.SLEEP_PHYSICAL_RECOVERY * levelMultiplier,
        mental: duration * FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY * levelMultiplier,
      };
    } else {
      return {
        physical: duration * FATIGUE_CONSTANTS.REST_LIGHT_PHYSICAL * levelMultiplier,
        mental: duration * FATIGUE_CONSTANTS.REST_LIGHT_MENTAL * levelMultiplier,
      };
    }
  }, [character, duration, activityType]);

  // === ВРЕМЯ ПОСЛЕ ДЕЙСТВИЯ ===
  const timeAfterActivity = useMemo(() => {
    const wt = toWorldTime(worldTime);
    if (!wt) return null;

    // Используем effectiveDuration для прорыва/проводимости
    const actualDuration = effectiveDuration;
    let newMinute = wt.minute + actualDuration;
    let newHour = wt.hour;
    let newDay = wt.day;
    let newMonth = wt.month;
    let newYear = wt.year;

    while (newMinute >= 60) {
      newMinute -= 60;
      newHour++;
    }

    while (newHour >= 24) {
      newHour -= 24;
      newDay++;
    }

    while (newDay > 30) {
      newDay -= 30;
      newMonth++;
    }

    while (newMonth > 12) {
      newMonth -= 12;
      newYear++;
    }

    return {
      time: {
        year: newYear,
        month: newMonth,
        day: newDay,
        hour: newHour,
        minute: newMinute,
        totalMinutes: newHour * 60 + newMinute,
      },
      dayChanged: newDay !== wt.day,
    };
  }, [worldTime, effectiveDuration]);

  // === ВЫПОЛНЕНИЕ ДЕЙСТВИЯ ===
  const handleAction = useCallback(async () => {
    if (!character || isActing) return;

    if (activityType === 'meditation' && !canMeditateNow) {
      setResult({ message: '⚡ Ядро заполнено! Потратьте Ци чтобы продолжить накопление.' });
      return;
    }

    if (meditationType === 'conductivity' && conductivityProgress) {
      if (conductivityProgress.current >= conductivityProgress.max) {
        setResult({ message: `⚡ Достигнут максимум медитаций на проводимость для уровня ${character.cultivationLevel}!` });
        return;
      }
    }

    if (activityType === 'sleep' && duration < ACTIVITY_CONFIG.sleep.minDuration) {
      setResult({ message: `Минимальное время сна: ${ACTIVITY_CONFIG.sleep.minDuration / 60} часа` });
      return;
    }

    setIsActing(true);
    setResult(null);

    try {
      if (activityType === 'meditation') {
        const response = await fetch('/api/meditation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: character.id,
            durationMinutes: duration,
            meditationType: meditationType,
          }),
        });
        const data = await response.json();

        if (data.success) {
          if (data.interrupted && data.result?.interruption) {
            const event = data.result.interruption.event;
            setResult({ 
              message: data.message,
              interrupted: true,
              interruptionEvent: event,
            });
          } else {
            setResult({ message: data.message });
          }
          await loadState();
        } else {
          setResult({ message: data.error || 'Ошибка' });
        }
      } else {
        // Отдых или сон
        const response = await fetch('/api/rest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: character.id,
            durationMinutes: duration,
            restType: activityType,
          }),
        });
        const data = await response.json();
        
        if (data.success) {
          setResult({ message: data.message });
          await loadState();
        } else {
          setResult({ message: data.error || 'Ошибка' });
        }
      }
    } catch (error) {
      console.error('Activity error:', error);
      setResult({ message: 'Ошибка соединения с сервером' });
    } finally {
      setIsActing(false);
    }
  }, [character, duration, activityType, meditationType, isActing, canMeditateNow, loadState, conductivityProgress]);

  const handleClose = useCallback(() => {
    if (!isActing) {
      onOpenChange(false);
    }
  }, [isActing, onOpenChange]);

  if (!character) return null;

  const isFullyRested = character.fatigue <= 0 && character.mentalFatigue <= 0;
  const canAct = activityType === 'meditation'
    ? canMeditateNow
    : !isFullyRested;

  const currentWorldTime = toWorldTime(worldTime);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            {config.icon} {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Текущее состояние */}
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">💚 Физ. усталость:</span>
                <span className={character.fatigue > 70 ? 'text-red-400' : 'text-green-400'}>
                  {character.fatigue.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">💜 Мент. усталость:</span>
                <span className={character.mentalFatigue > 70 ? 'text-red-400' : 'text-green-400'}>
                  {character.mentalFatigue.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Ци (для медитации) */}
            {activityType === 'meditation' && (
              <div className="mt-2 pt-2 border-t border-slate-600/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">💫 Ци:</span>
                  <span className="text-cyan-400">
                    {character.currentQi} / {character.coreCapacity}
                  </span>
                </div>
                <Progress value={qiPercent} className="h-2" />
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Плотность Ци:</span>
                    <span className="text-green-400">{location?.qiDensity || QI_CONSTANTS.DEFAULT_QI_DENSITY}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Проводимость:</span>
                    <span className="text-cyan-400">{totalConductivity.toFixed(2)}</span>
                  </div>
                </div>
                
                {slottedCultivationTechnique && (
                  <div className="flex justify-between text-xs mt-2 text-purple-400">
                    <span>🧘 Техника: {slottedCultivationTechnique.technique.name}</span>
                    <span>+{slottedCultivationTechnique.technique.effects?.qiRegenPercent || 0}% Ци</span>
                  </div>
                )}
                
                {qiRates && (
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Скорость: {(qiRates.total * 60).toFixed(1)} Ци/мин</span>
                    <span>До полного: {formatQiTime(meditationEstimate.timeToFull)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Прогресс медитаций на проводимость */}
            {activityType === 'meditation' && meditationType === 'conductivity' && conductivityProgress && (
              <div className="mt-2 pt-2 border-t border-slate-600/50">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-400">⚡ МедП:</span>
                  <span className="text-white">{conductivityProgress.current}/{conductivityProgress.max}</span>
                </div>
                <Progress value={conductivityProgress.percent} className="h-2" />
              </div>
            )}
          </div>

          {/* Предупреждения */}
          {activityType === 'meditation' && !canMeditateNow && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-300">
              ⚡ Ядро заполнено! Потратьте Ци (техники, бой) чтобы продолжить накопление.
            </div>
          )}

          {activityType === 'meditation' && meditationType === 'conductivity' && conductivityProgress && conductivityProgress.current >= conductivityProgress.max && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-300">
              ⚡ Достигнут максимум медитаций на проводимость для уровня {character.cultivationLevel}!
            </div>
          )}

          {activityType !== 'meditation' && isFullyRested && (
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 text-sm text-green-300">
              ✨ Вы полностью отдохнули!
            </div>
          )}

          {/* Результат */}
          {result && (
            <div className={`rounded-lg p-3 border ${
              result.interrupted 
                ? 'bg-red-900/30 border-red-600/50' 
                : 'bg-slate-700/70 border-slate-600'
            }`}>
              <pre className="text-sm text-slate-200 whitespace-pre-wrap">{result.message}</pre>
              
              {result.interrupted && result.interruptionEvent && (
                <div className="mt-3 pt-3 border-t border-red-600/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-600 text-white">
                      ⚠️ Опасность: {result.interruptionEvent.dangerLevel}/10
                    </Badge>
                    <Badge variant="outline" className="border-red-400 text-red-300">
                      {result.interruptionEvent.type === 'creature' ? '🐺 Существо' :
                       result.interruptionEvent.type === 'person' ? '👤 Человек' :
                       result.interruptionEvent.type === 'phenomenon' ? '🌟 Явление' :
                       result.interruptionEvent.type === 'spirit' ? '👻 Дух' : '✨ Редкое'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">
                    {result.interruptionEvent.description}
                  </p>
                  
                  {/* Actions for interruption */}
                  <div className="flex flex-wrap gap-2">
                    {result.interruptionEvent.canIgnore && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-600/50 text-green-400 hover:bg-green-900/30"
                        onClick={() => {
                          // Continue meditation - just close dialog
                          setResult({ message: 'Вы игнорируете событие и продолжаете медитацию...' });
                        }}
                      >
                        🚶 Игнорировать
                      </Button>
                    )}
                    {result.interruptionEvent.canHide && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                        onClick={() => {
                          // Try to hide - close dialog
                          setResult({ message: 'Вы пытаетесь скрыться...' });
                        }}
                      >
                        🌿 Скрыться
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/50 text-amber-400 hover:bg-amber-900/30"
                      onClick={() => {
                        // Stop meditation
                        handleClose();
                      }}
                    >
                      ⏹️ Завершить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Выбор типа активности - 3 вкладки */}
          {!result && (
            <Tabs value={activityType} onValueChange={handleActivityTypeChange}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger
                  value="meditation"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  🧘 Медитация
                </TabsTrigger>
                <TabsTrigger
                  value="light"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  🌿 Отдых
                </TabsTrigger>
                <TabsTrigger
                  value="sleep"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  😴 Сон
                </TabsTrigger>
              </TabsList>

              {/* Медитация */}
              <TabsContent value="meditation" className="space-y-3 mt-3">
                <div className="text-xs text-slate-400">
                  Накопление Ци через концентрацию.
                </div>
                
                {/* Выбор типа медитации */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Тип медитации:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(MEDITATION_TYPES) as MeditationSubType[]).map((type) => {
                      const isAvailable = meditationTypeAvailability[type];
                      const isActive = meditationType === type;
                      return (
                        <Button
                          key={type}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className={`h-auto py-2 flex-col ${
                            isActive 
                              ? type === 'accumulation' ? 'bg-purple-600 hover:bg-purple-700' :
                                type === 'breakthrough' ? 'bg-orange-600 hover:bg-orange-700' :
                                'bg-cyan-600 hover:bg-cyan-700'
                              : 'border-slate-600'
                          } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => setMeditationType(type)}
                          disabled={isActing || !isAvailable}
                        >
                          <span className="text-lg">{MEDITATION_TYPES[type].icon}</span>
                          <span className="text-xs mt-0.5">{MEDITATION_TYPES[type].name}</span>
                          {!isAvailable && type !== 'accumulation' && (
                            <span className="text-[10px] text-amber-400">90%+</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {meditationConfig.description}
                    {!meditationTypeAvailability[meditationType] && canMeditateNowResult.reason && (
                      <span className="block text-amber-400 mt-1">{canMeditateNowResult.reason}</span>
                    )}
                  </div>
                </div>

                {/* Активная техника - только для накопления */}
                {meditationType === 'accumulation' && (
                  <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
                    {slottedCultivationTechnique ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-400">🧘 Активная техника:</span>
                        <span className="text-white">{slottedCultivationTechnique.technique.name}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        🧘 Нет активной техники. Назначьте через меню Техники.
                      </div>
                    )}
                  </div>
                )}
                
                {/* Индикатор для прорыва/проводимости */}
                {meditationType === 'breakthrough' && (
                  <div className="text-xs text-orange-400 flex items-center gap-1">
                    🛡️ Автоматическая длительность • Не прерывается
                  </div>
                )}
                {meditationType === 'conductivity' && (
                  <div className="text-xs text-cyan-400 flex items-center gap-1">
                    🛡️ Автоматическая длительность • Не прерывается
                  </div>
                )}
              </TabsContent>

              {/* Отдых */}
              <TabsContent value="light" className="space-y-3 mt-3">
                <div className="text-xs text-slate-400">
                  Медленное восстановление тела и разума. Минимум 30 минут.
                </div>
              </TabsContent>

              {/* Сон */}
              <TabsContent value="sleep" className="space-y-3 mt-3">
                <div className="text-xs text-slate-400">
                  Глубокое восстановление. 8 часов = полное восстановление усталости.
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Выбор времени */}
          {!result && (
            <div className="space-y-3">
              {/* Только для накопления показываем выбор времени */}
              {activityType === 'meditation' && meditationType !== 'accumulation' ? (
                // Для прорыва/проводимости - только прогноз, без выбора времени
                <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 border border-slate-600/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">💜 Мент. усталость:</span>
                    <span className="text-amber-400">
                      +{meditationFatigue.mentalGain.toFixed(1)}%
                      {meditationConfig.fatigueMultiplier > 1 && (
                        <span className="text-slate-500 ml-1">(x{meditationConfig.fatigueMultiplier})</span>
                      )}
                    </span>
                  </div>
                  {timeAfterActivity && (
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-600/50">
                      <span className="text-slate-400">Время после:</span>
                      <span className="text-purple-400">
                        {formatTime(timeAfterActivity.time)}
                        {timeAfterActivity.dayChanged && (
                          <span className="ml-2 text-amber-400">🌅 Новый день!</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Label className="text-slate-300">
                    Время {activityType === 'meditation' ? 'медитации' : activityType === 'sleep' ? 'сна' : 'отдыха'}:
                  </Label>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={config.minDuration}
                      max={config.maxDuration}
                      step={config.step}
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={() => setInputValue(String(duration))}
                      className="bg-slate-700 border-slate-600 w-24"
                      disabled={isActing}
                    />
                    <span className="text-slate-400 text-sm">минут</span>
                    <Badge variant="outline" className="border-amber-600/50 text-amber-400 ml-auto">
                      {formatDuration(duration)}
                    </Badge>
                  </div>

                  <Slider
                    value={[duration]}
                    onValueChange={handleSliderChange}
                    min={0}
                    max={config.maxDuration}
                    step={config.step}
                    className="w-full [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-white"
                    disabled={isActing}
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span className="text-amber-400">мин. {formatDuration(config.minDuration)}</span>
                    <span>{formatDuration(config.maxDuration)}</span>
                  </div>

                  {/* Быстрый выбор */}
                  <div className="flex flex-wrap gap-2">
                    {(QUICK_DURATIONS[activityType] || []).map((mins) => (
                      <Button
                        key={mins}
                        variant={duration === mins ? 'default' : 'outline'}
                        size="sm"
                        className={`h-7 text-xs ${
                          duration === mins
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                        }`}
                        onClick={() => {
                          setDuration(mins);
                          setInputValue(String(mins));
                        }}
                        disabled={isActing}
                      >
                        {formatDuration(mins)}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Прогноз результата - только для накопления и отдыха/сна */}
          {!result && !(activityType === 'meditation' && meditationType !== 'accumulation') && (
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 border border-slate-600/50">
              <div className="text-sm font-medium text-slate-300">📊 Прогноз:</div>

              {/* Для медитации накопления */}
              {activityType === 'meditation' && meditationType === 'accumulation' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Прирост Ци:</span>
                    <span className={`font-medium ${meditationEstimate.willFillCore ? 'text-amber-400' : 'text-cyan-400'}`}>
                      +{meditationEstimate.qiGained} Ци
                    </span>
                  </div>
                  
                  {meditationEstimate.willFillCore && (
                    <div className="text-xs text-amber-400">
                      ⚡ Ядро будет заполнено!
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Мент. усталость:</span>
                    <span className="text-amber-400">
                      +{meditationFatigue.mentalGain.toFixed(1)}%
                    </span>
                  </div>
                  {duration >= 60 && (
                    <div className="text-xs text-red-400 flex items-center gap-1 pt-1 border-t border-slate-600/50">
                      ⚠️ Возможны прерывания ({Math.floor(duration / 60)} проверок)
                    </div>
                  )}
                </>
              )}

              {/* Для отдыха/сна */}
              {activityType !== 'meditation' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Физ. усталость:</span>
                    <span className="text-green-400">
                      -{Math.min(100, fatigueRecovery.physical).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Мент. усталость:</span>
                    <span className="text-green-400">
                      -{Math.min(100, fatigueRecovery.mental).toFixed(0)}%
                    </span>
                  </div>
                  {activityType === 'sleep' && duration >= 480 && (
                    <div className="text-xs text-green-400">
                      ✨ Полное восстановление за 8 часов сна!
                    </div>
                  )}
                </>
              )}

              {/* Время */}
              {timeAfterActivity && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-600/50">
                  <span className="text-slate-400">Время после:</span>
                  <span className="text-purple-400">
                    {formatTime(timeAfterActivity.time)}
                    {timeAfterActivity.dayChanged && (
                      <span className="ml-2 text-amber-400">🌅 Новый день!</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Время мира */}
          {currentWorldTime && !result && (
            <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">⏰ Сейчас:</span>
                <span className="text-slate-300">
                  {formatTime(currentWorldTime)} • {formatDate(currentWorldTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-slate-600 text-slate-300"
                disabled={isActing}
              >
                Отмена
              </Button>
              <Button
                onClick={handleAction}
                disabled={isActing || !canAct}
                className={`min-w-[140px] ${config.color}`}
              >
                {isActing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {activityType === 'meditation' ? 'Медитация...' : activityType === 'sleep' ? 'Сплю...' : 'Отдыхаю...'}
                  </span>
                ) : (
                  `${config.icon} ${activityType === 'meditation' ? 'Медитировать' : activityType === 'sleep' ? 'Спать' : 'Отдохнуть'}`
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              className="bg-amber-600 hover:bg-amber-700 w-full"
            >
              Закрыть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
