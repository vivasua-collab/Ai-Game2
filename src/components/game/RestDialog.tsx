/**
 * Rest Dialog Component
 * 
 * Единый диалог для всех видов отдыха:
 * - 🧘 Медитация: накопление Ци + ментальная усталость (макс 8 часов)
 * - 🌿 Отдых: медленное восстановление усталости (макс 8 часов)
 * - 😴 Сон: быстрое восстановление усталости (макс 8 часов, полное восстановление)
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
import { useGameCharacter, useGameLocation, useGameTime, useGameActions } from '@/stores/game.store';
import {
  calculateQiRates,
  calculateTimeToFull,
  formatTime as formatQiTime,
  calculateMeditationFatigue,
  canMeditate,
  getCoreFillPercent,
  getConductivityMultiplier,
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

type RestActivityType = 'meditation' | 'light' | 'sleep';

// Константы для разных типов (макс 8 часов для всех)
const ACTIVITY_CONFIG = {
  meditation: {
    minDuration: TIME_CONSTANTS.MIN_MEDITATION_TICKS, // 30 мин
    maxDuration: 480, // 8 часов
    step: TIME_CONSTANTS.MEDITATION_TICK_STEP, // 30 мин
    icon: '🧘',
    title: 'Медитация',
    description: 'Накопление Ци через концентрацию. Утомляет разум.',
  },
  light: {
    minDuration: 30, // 30 мин
    maxDuration: 480, // 8 часов
    step: 30, // 30 мин
    icon: '🌿',
    title: 'Отдых',
    description: 'Медленное восстановление сил. Можно прервать в любой момент.',
  },
  sleep: {
    minDuration: 240, // 4 часа
    maxDuration: 480, // 8 часов
    step: 30, // 30 мин
    icon: '😴',
    title: 'Сон',
    description: 'Глубокое восстановление тела и разума. 8 часов = полное восстановление.',
  },
};

// Быстрый выбор для разных типов
const QUICK_DURATIONS = {
  meditation: [30, 60, 120, 180, 240, 480],
  light: [30, 60, 120, 240, 480],
  sleep: [240, 360, 480], // 4ч, 6ч, 8ч
};

interface RestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Конвертация worldTime из store в WorldTime для расчётов
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

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setActivityType('meditation');
      setDuration(TIME_CONSTANTS.MIN_MEDITATION_TICKS);
      setInputValue(String(TIME_CONSTANTS.MIN_MEDITATION_TICKS));
      setResult(null);
    }
  }, [open]);

  // Конфигурация текущего типа
  const config = useMemo(() => ACTIVITY_CONFIG[activityType], [activityType]);

  // Обработка смены типа активности
  const handleActivityTypeChange = useCallback((type: string) => {
    const newType = type as RestActivityType;
    setActivityType(newType);
    const newMin = ACTIVITY_CONFIG[newType].minDuration;
    setDuration(newMin);
    setInputValue(String(newMin));
    setResult(null);
  }, []);

  // Обработка ввода
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      const rounded = roundMeditationTime(num);
      const clamped = Math.max(config.minDuration, Math.min(config.maxDuration, rounded));
      setDuration(clamped);
    }
  }, [config]);

  // Обработка слайдера - от 0 до maxDuration, но минимальное значение = minDuration
  const handleSliderChange = useCallback((values: number[]) => {
    const rawValue = values[0];
    // Если значение меньше минимума, устанавливаем минимум
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

  const meditationFatigue = useMemo(() => {
    if (activityType !== 'meditation') return { physicalGain: 0, mentalGain: 0 };
    return calculateMeditationFatigue(duration, 'accumulation');
  }, [duration, activityType]);

  const canMeditateNow = useMemo(() => {
    if (!character || activityType !== 'meditation') return true;
    return canMeditate(character.currentQi, character.coreCapacity);
  }, [character, activityType]);

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

    // Прямой расчёт времени после действия
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

    // Проверки
    if (activityType === 'meditation' && !canMeditateNow) {
      setResult({ message: '⚡ Ядро заполнено! Потратьте Ци чтобы продолжить накопление.' });
      return;
    }

    if (activityType === 'sleep' && duration < ACTIVITY_CONFIG.sleep.minDuration) {
      setResult({ message: `Минимальное время сна: ${ACTIVITY_CONFIG.sleep.minDuration / 60} часа` });
      return;
    }

    setIsActing(true);
    setResult(null);

    try {
      const endpoint = activityType === 'meditation' ? '/api/meditation' : '/api/rest';
      const body: Record<string, unknown> = {
        characterId: character.id,
        durationMinutes: duration,
      };

      if (activityType !== 'meditation') {
        body.restType = activityType;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        // Проверяем прерывание медитации
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
  }, [character, duration, activityType, isActing, canMeditateNow, loadState]);

  // Закрытие
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

  // Текущее время для отображения
  const currentWorldTime = toWorldTime(worldTime);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            {config.icon} {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Текущее состояние */}
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
            {/* Усталость */}
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
                
                {/* Плотность Ци и проводимость */}
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
                
                {qiRates && (
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Скорость: {(qiRates.total * 60).toFixed(1)} Ци/мин</span>
                    <span>До полного: {formatQiTime(meditationEstimate.timeToFull)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Предупреждения */}
          {activityType === 'meditation' && !canMeditateNow && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-300">
              ⚡ Ядро заполнено! Потратьте Ци (техники, бой) чтобы продолжить накопление.
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
              
              {/* Детали прерывания */}
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
                  <div className="flex gap-2 text-xs text-slate-400">
                    {result.interruptionEvent.canIgnore && (
                      <span className="text-green-400">✓ Можно игнорировать</span>
                    )}
                    {result.interruptionEvent.canHide && (
                      <span className="text-amber-400">👁 Можно скрыться</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Выбор типа активности */}
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

              <TabsContent value="meditation" className="space-y-3 mt-3">
                <div className="text-xs text-slate-400">
                  Накопление Ци через концентрацию. Утомляет разум, тело отдыхает.
                </div>
              </TabsContent>

              <TabsContent value="light" className="space-y-3 mt-3">
                <div className="text-xs text-slate-400">
                  Медленное восстановление тела и разума. Минимум 30 минут, максимум 8 часов.
                </div>
              </TabsContent>

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
                {QUICK_DURATIONS[activityType].map((mins) => (
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

              {/* Для медитации */}
              {activityType === 'meditation' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Прирост Ци:</span>
                    <span className={`font-medium ${meditationEstimate.willFillCore ? 'text-amber-400' : 'text-cyan-400'}`}>
                      +{meditationEstimate.qiGained} Ци
                    </span>
                  </div>
                  {meditationEstimate.willFillCore && (
                    <div className="text-xs text-amber-400 flex items-center gap-1">
                      ⚡ Ядро будет заполнено!
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Физ. усталость:</span>
                    <span className="text-slate-500">без изменений</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Мент. усталость:</span>
                    <span className="text-amber-400">
                      +{meditationFatigue.mentalGain.toFixed(1)}% (концентрация)
                    </span>
                  </div>
                  {/* Предупреждение о прерывании для медитаций >= 60 минут */}
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
                className={`min-w-[140px] ${
                  activityType === 'meditation'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : activityType === 'sleep'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
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
