/**
 * Rest Dialog Component
 * 
 * Единый диалог для всех видов отдыха:
 * - 🧘 Медитация (накопление): накопление Ци + ментальная усталость
 * - 🔥 Медитация на прорыв: заполнение ядра → опустошение в accumulatedQi
 * - ⚡ Медитация на проводимость: +1 к МедП при заполнении ядра
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
  MEDITATION_TYPE_CONSTANTS,
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
  getMaxConductivityMeditations,
  calculateTotalConductivity,
} from '@/lib/game/conductivity-system';

type RestActivityType = 'meditation' | 'breakthrough' | 'conductivity' | 'light' | 'sleep';

// Константы для разных типов
const ACTIVITY_CONFIG = {
  meditation: {
    minDuration: TIME_CONSTANTS.MIN_MEDITATION_TICKS,
    maxDuration: 480,
    step: TIME_CONSTANTS.MEDITATION_TICK_STEP,
    icon: '🧘',
    title: 'Медитация',
    description: 'Накопление Ци через концентрацию. Утомляет разум.',
    color: 'bg-purple-600 hover:bg-purple-700',
    category: 'cultivation' as const,
  },
  breakthrough: {
    minDuration: TIME_CONSTANTS.MIN_MEDITATION_TICKS,
    maxDuration: 480,
    step: TIME_CONSTANTS.MEDITATION_TICK_STEP,
    icon: '🔥',
    title: 'На прорыв',
    description: 'Заполнение ядра → перенос в шкалу прорыва. x2 ментальная усталость.',
    color: 'bg-orange-600 hover:bg-orange-700',
    category: 'cultivation' as const,
  },
  conductivity: {
    minDuration: TIME_CONSTANTS.MIN_MEDITATION_TICKS,
    maxDuration: 480,
    step: TIME_CONSTANTS.MEDITATION_TICK_STEP,
    icon: '⚡',
    title: 'На проводимость',
    description: 'При заполнении ядра: +1 к МедП, проводимость растёт.',
    color: 'bg-cyan-600 hover:bg-cyan-700',
    category: 'cultivation' as const,
  },
  light: {
    minDuration: 30,
    maxDuration: 480,
    step: 30,
    icon: '🌿',
    title: 'Отдых',
    description: 'Медленное восстановление сил.',
    color: 'bg-green-600 hover:bg-green-700',
    category: 'rest' as const,
  },
  sleep: {
    minDuration: 240,
    maxDuration: 480,
    step: 30,
    icon: '😴',
    title: 'Сон',
    description: 'Глубокое восстановление. 8ч = полное восстановление.',
    color: 'bg-blue-600 hover:bg-blue-700',
    category: 'rest' as const,
  },
};

// Быстрый выбор для разных типов
const QUICK_DURATIONS = {
  meditation: [30, 60, 120, 180, 240, 480],
  breakthrough: [60, 120, 180, 240, 480],
  conductivity: [30, 60, 120, 180, 240],
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
      setDuration(TIME_CONSTANTS.MIN_MEDITATION_TICKS);
      setInputValue(String(TIME_CONSTANTS.MIN_MEDITATION_TICKS));
      setResult(null);
    }
  }, [open]);

  const config = useMemo(() => ACTIVITY_CONFIG[activityType], [activityType]);

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
    if (!character || !['meditation', 'breakthrough', 'conductivity'].includes(activityType)) return null;
    return calculateQiRates(character, location);
  }, [character, location, activityType]);

  const meditationEstimate = useMemo(() => {
    if (!character || !qiRates || !['meditation', 'breakthrough', 'conductivity'].includes(activityType)) {
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

  const meditationFatigue = useMemo(() => {
    if (!['meditation', 'breakthrough', 'conductivity'].includes(activityType)) {
      return { physicalGain: 0, mentalGain: 0 };
    }
    
    const type = activityType === 'meditation' ? 'accumulation' : 
                 activityType === 'breakthrough' ? 'breakthrough' : 'conductivity';
    return calculateMeditationFatigue(duration, type as any);
  }, [duration, activityType]);

  const canMeditateNow = useMemo(() => {
    if (!character || !['meditation', 'breakthrough', 'conductivity'].includes(activityType)) return true;
    return canMeditate(character.currentQi, character.coreCapacity);
  }, [character, activityType]);

  // === ПРОГРЕСС МЕДИТАЦИЙ НА ПРОВОДИМОСТЬ ===
  const conductivityProgress = useMemo(() => {
    if (!character || activityType !== 'conductivity') return null;
    return getConductivityMeditationProgress(
      character.cultivationLevel,
      character.conductivityMeditations || 0
    );
  }, [character, activityType]);

  const qiPercent = character ? getCoreFillPercent(character.currentQi, character.coreCapacity) : 0;

  // === РАСЧЁТЫ ДЛЯ ОТДЫХА/СНА ===
  const fatigueRecovery = useMemo(() => {
    if (!character || !['light', 'sleep'].includes(activityType)) {
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

    let newMinute = wt.minute + duration;
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
  }, [worldTime, duration]);

  // === ВЫПОЛНЕНИЕ ДЕЙСТВИЯ ===
  const handleAction = useCallback(async () => {
    if (!character || isActing) return;

    if (['meditation', 'breakthrough', 'conductivity'].includes(activityType) && !canMeditateNow) {
      setResult({ message: '⚡ Ядро заполнено! Потратьте Ци чтобы продолжить накопление.' });
      return;
    }

    if (activityType === 'conductivity' && conductivityProgress) {
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
      const endpoint = '/api/meditation';
      const body: Record<string, unknown> = {
        characterId: character.id,
        durationMinutes: duration,
      };

      if (['meditation', 'breakthrough', 'conductivity'].includes(activityType)) {
        body.meditationType = activityType === 'meditation' ? 'accumulation' : activityType;
      } else {
        // Для отдыха и сна используем другой эндпоинт
        const restResponse = await fetch('/api/rest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: character.id,
            durationMinutes: duration,
            restType: activityType,
          }),
        });
        const restData = await restResponse.json();
        
        if (restData.success) {
          setResult({ message: restData.message });
          await loadState();
        } else {
          setResult({ message: restData.error || 'Ошибка' });
        }
        setIsActing(false);
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (data.interrupted && data.result?.interruption) {
          const int = data.result.interruption;
          const event = int.event;
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
    } catch (error) {
      console.error('Activity error:', error);
      setResult({ message: 'Ошибка соединения с сервером' });
    } finally {
      setIsActing(false);
    }
  }, [character, duration, activityType, isActing, canMeditateNow, loadState, conductivityProgress]);

  const handleClose = useCallback(() => {
    if (!isActing) {
      onOpenChange(false);
    }
  }, [isActing, onOpenChange]);

  if (!character) return null;

  const isFullyRested = character.fatigue <= 0 && character.mentalFatigue <= 0;
  const canAct = ['meditation', 'breakthrough', 'conductivity'].includes(activityType)
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

            {/* Ци (для медитаций) */}
            {['meditation', 'breakthrough', 'conductivity'].includes(activityType) && (
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
                    <span className="text-cyan-400">{character.conductivity.toFixed(2)}</span>
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
            {activityType === 'conductivity' && conductivityProgress && (
              <div className="mt-2 pt-2 border-t border-slate-600/50">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-400">⚡ МедП:</span>
                  <span className="text-white">{conductivityProgress.current}/{conductivityProgress.max}</span>
                </div>
                <Progress value={conductivityProgress.percent} className="h-2" />
                <div className="text-xs text-slate-500 mt-1">
                  Текущий бонус: +{(conductivityProgress.currentBonus * 100).toFixed(1)}% проводимости
                </div>
              </div>
            )}
          </div>

          {/* Предупреждения */}
          {['meditation', 'breakthrough', 'conductivity'].includes(activityType) && !canMeditateNow && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-300">
              ⚡ Ядро заполнено! Потратьте Ци (техники, бой) чтобы продолжить накопление.
            </div>
          )}

          {activityType === 'conductivity' && conductivityProgress && conductivityProgress.current >= conductivityProgress.max && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-300">
              ⚡ Достигнут максимум медитаций на проводимость для уровня {character.cultivationLevel}!
              Повысьте уровень для продолжения.
            </div>
          )}

          {['light', 'sleep'].includes(activityType) && isFullyRested && (
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
                  <p className="text-sm text-slate-300 mb-2">
                    {result.interruptionEvent.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Выбор типа активности */}
          {!result && (
            <div className="space-y-3">
              {/* Категория: Культивация */}
              <div>
                <Label className="text-purple-400 text-xs mb-2 block">🌀 Культивация</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={activityType === 'meditation' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-auto py-2 flex-col ${activityType === 'meditation' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600'}`}
                    onClick={() => handleActivityTypeChange('meditation')}
                    disabled={isActing}
                  >
                    <span className="text-lg">🧘</span>
                    <span className="text-xs mt-1">Накопление</span>
                  </Button>
                  <Button
                    variant={activityType === 'breakthrough' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-auto py-2 flex-col ${activityType === 'breakthrough' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-600'}`}
                    onClick={() => handleActivityTypeChange('breakthrough')}
                    disabled={isActing}
                  >
                    <span className="text-lg">🔥</span>
                    <span className="text-xs mt-1">Прорыв</span>
                  </Button>
                  <Button
                    variant={activityType === 'conductivity' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-auto py-2 flex-col ${activityType === 'conductivity' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-slate-600'}`}
                    onClick={() => handleActivityTypeChange('conductivity')}
                    disabled={isActing}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="text-xs mt-1">Проводимость</span>
                  </Button>
                </div>
              </div>

              {/* Категория: Отдых */}
              <div>
                <Label className="text-green-400 text-xs mb-2 block">🌿 Отдых</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activityType === 'light' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-auto py-2 flex-col ${activityType === 'light' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600'}`}
                    onClick={() => handleActivityTypeChange('light')}
                    disabled={isActing}
                  >
                    <span className="text-lg">🌿</span>
                    <span className="text-xs mt-1">Отдых</span>
                  </Button>
                  <Button
                    variant={activityType === 'sleep' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-auto py-2 flex-col ${activityType === 'sleep' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600'}`}
                    onClick={() => handleActivityTypeChange('sleep')}
                    disabled={isActing}
                  >
                    <span className="text-lg">😴</span>
                    <span className="text-xs mt-1">Сон</span>
                  </Button>
                </div>
              </div>

              {/* Описание текущего типа */}
              <div className="text-xs text-slate-400 bg-slate-700/30 rounded p-2">
                {config.description}
              </div>
            </div>
          )}

          {/* Выбор времени */}
          {!result && (
            <div className="space-y-3">
              <Label className="text-slate-300">
                Время {config.title.toLowerCase()}:
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
                {(QUICK_DURATIONS[activityType as keyof typeof QUICK_DURATIONS] || []).map((mins) => (
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
            </div>
          )}

          {/* Прогноз результата */}
          {!result && (
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 border border-slate-600/50">
              <div className="text-sm font-medium text-slate-300">📊 Прогноз:</div>

              {/* Для медитаций */}
              {['meditation', 'breakthrough', 'conductivity'].includes(activityType) && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Прирост Ци:</span>
                    <span className={`font-medium ${meditationEstimate.willFillCore ? 'text-amber-400' : 'text-cyan-400'}`}>
                      +{meditationEstimate.qiGained} Ци
                    </span>
                  </div>
                  {meditationEstimate.willFillCore && activityType === 'meditation' && (
                    <div className="text-xs text-amber-400">
                      ⚡ Ядро будет заполнено!
                    </div>
                  )}
                  {activityType === 'breakthrough' && (
                    <div className="text-xs text-orange-400">
                      🔥 При заполнении ядра → Ци в accumulatedQi
                    </div>
                  )}
                  {activityType === 'conductivity' && (
                    <div className="text-xs text-cyan-400">
                      ⚡ При заполнении ядра → +1 МедП, проводимость растёт
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Физ. усталость:</span>
                    <span className="text-slate-500">без изменений</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Мент. усталость:</span>
                    <span className="text-amber-400">
                      +{meditationFatigue.mentalGain.toFixed(1)}% 
                      {activityType === 'breakthrough' && ' (x2)'}
                      {activityType === 'conductivity' && ' (x1.5)'}
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
              {['light', 'sleep'].includes(activityType) && (
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
                    {activityType === 'meditation' ? 'Медитация...' : 
                     activityType === 'breakthrough' ? 'Прорыв...' :
                     activityType === 'conductivity' ? 'Медитация...' :
                     activityType === 'sleep' ? 'Сплю...' : 'Отдыхаю...'}
                  </span>
                ) : (
                  `${config.icon} ${activityType === 'meditation' ? 'Медитировать' : 
                    activityType === 'breakthrough' ? 'На прорыв' :
                    activityType === 'conductivity' ? 'На проводимость' :
                    activityType === 'sleep' ? 'Спать' : 'Отдохнуть'}`
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
