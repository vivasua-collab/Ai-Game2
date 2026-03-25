/**
 * TickTimerControls Component
 *
 * UI controls for the TickTimer system.
 * Displays game time, pause/resume button, and speed selector.
 *
 * Location: Usually placed in top-right corner of game UI.
 *
 * v2.0: Added ultra speed restriction with confirmation dialog
 */

'use client';

import { useState } from 'react';
import { useTickTimer } from '@/hooks/useTickTimer';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Pause, Timer, Gauge, AlertTriangle } from 'lucide-react';
import { activityManager } from '@/lib/game/activity-manager';
import { TickSpeedId } from '@/stores/time.store';

// ==================== MAIN COMPONENT ====================

export function TickTimerControls() {
  const {
    isPaused,
    isRunning,
    tickCount,
    speed,
    formattedTime,
    speedConfig,
    speedOptions,
    togglePause,
    setSpeed,
  } = useTickTimer();

  // Ultra speed confirmation dialog state
  const [showUltraDialog, setShowUltraDialog] = useState(false);
  const [pendingSpeed, setPendingSpeed] = useState<TickSpeedId | null>(null);

  // Debug log
  console.log('[TickTimerControls] Render:', { isPaused, isRunning, tickCount, speed, formattedTime });

  const handleTogglePause = () => {
    console.log('[TickTimerControls] Toggle pause clicked, isPaused:', isPaused, 'isRunning:', isRunning);
    togglePause();
  };

  /**
   * Handle speed change with ultra speed restriction
   *
   * Rules:
   * - ultra speed requires confirmation on location (exploration, combat)
   * - ultra speed is allowed without confirmation during meditation
   */
  const handleSpeedChange = (newSpeed: TickSpeedId) => {
    // Check if trying to set ultra speed
    if (newSpeed === 'ultra') {
      const currentActivity = activityManager.getActivity();
      const isMeditating = activityManager.isMeditating();
      const isResting = activityManager.isResting();

      // Allow ultra without confirmation for meditation and rest
      if (isMeditating || isResting) {
        setSpeed(newSpeed);
        console.log('[TickTimerControls] Ultra speed allowed (meditation/rest mode)');
        return;
      }

      // For exploration, combat, travel, etc. - show confirmation dialog
      if (currentActivity === 'exploration' || currentActivity === 'combat' || currentActivity === 'travel') {
        setPendingSpeed(newSpeed);
        setShowUltraDialog(true);
        console.log('[TickTimerControls] Ultra speed requires confirmation on', currentActivity);
        return;
      }
    }

    // All other speeds - just set
    setSpeed(newSpeed);
  };

  /**
   * Confirm ultra speed change
   */
  const confirmUltraSpeed = () => {
    if (pendingSpeed) {
      setSpeed(pendingSpeed);
      console.log('[TickTimerControls] Ultra speed confirmed by user');
    }
    setShowUltraDialog(false);
    setPendingSpeed(null);
  };

  /**
   * Cancel ultra speed change
   */
  const cancelUltraSpeed = () => {
    setShowUltraDialog(false);
    setPendingSpeed(null);
    console.log('[TickTimerControls] Ultra speed cancelled by user');
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
        {/* Game Time Display */}
        <div className="flex items-center gap-1.5 text-white">
          <Timer className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-mono min-w-[100px]">{formattedTime}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/20" />

        {/* Pause/Resume Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePause}
          className="text-white hover:bg-white/20 h-8 w-8 p-0"
          title={isPaused ? 'Resume (Play)' : 'Pause'}
        >
          {isPaused ? (
            <Play className="h-4 w-4 text-green-400" />
          ) : (
            <Pause className="h-4 w-4 text-amber-400" />
          )}
        </Button>

        {/* Speed Selector */}
        <Select value={speed} onValueChange={(v) => handleSpeedChange(v as TickSpeedId)}>
          <SelectTrigger className="w-[100px] h-8 bg-white/10 border-white/20 text-white text-xs">
            <Gauge className="h-3 w-3 mr-1 text-cyan-400" />
            <SelectValue placeholder="Скорость">
              {speedConfig.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/20">
            {speedOptions.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                className="text-white text-xs focus:bg-white/10"
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-1">
                    {option.label}
                    {option.id === 'ultra' && (
                      <span className="text-amber-400" title="Требует подтверждения">⚠️</span>
                    )}
                  </span>
                  <span className="text-[10px] text-white/50">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tick Counter (debug) */}
        <div className="text-white/40 text-[10px] font-mono">
          #{tickCount}
        </div>
      </div>

      {/* Ultra Speed Confirmation Dialog */}
      <AlertDialog open={showUltraDialog} onOpenChange={setShowUltraDialog}>
        <AlertDialogContent className="bg-slate-900 border-amber-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Максимальная скорость времени
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80">
              <p className="mb-2">
                Вы пытаетесь включить режим <strong>Медитация</strong> (1 час за тик).
              </p>
              <p className="mb-2">
                Это ускорит время в 60 раз. Вы уверены?
              </p>
              <p className="text-xs text-white/50">
                💡 Совет: Эта скорость предназначена для медитации и отдыха.
                На локации время будет идти очень быстро.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/20 text-white hover:bg-slate-700">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUltraSpeed}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              Да, включить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== COMPACT VERSION ====================

export function TickTimerControlsCompact() {
  const {
    isPaused,
    speed,
    formattedTime,
    speedConfig,
    togglePause,
    cycleSpeed,
  } = useTickTimer();

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded text-white text-xs">
      {/* Time */}
      <span className="font-mono">{formattedTime}</span>

      {/* Pause/Play */}
      <button
        onClick={togglePause}
        className="p-1 hover:bg-white/20 rounded"
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 hover:bg-white/20 rounded text-cyan-400"
        title={speedConfig.description}
      >
        {speedConfig.label}
      </button>
    </div>
  );
}

// ==================== INLINE VERSION ====================

export function TickTimerInline() {
  const { isPaused, formattedTime, speedConfig, togglePause, cycleSpeed } = useTickTimer();

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="font-mono text-amber-400">{formattedTime}</span>
      <button
        onClick={togglePause}
        className="text-lg hover:scale-110 transition-transform"
      >
        {isPaused ? '▶️' : '⏸️'}
      </button>
      <button
        onClick={cycleSpeed}
        className="text-xs text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded bg-white/10"
      >
        {speedConfig.label}
      </button>
    </div>
  );
}

// ==================== STATUS DISPLAY ====================

export function TickTimerStatus() {
  const { isPaused, isRunning, tickCount, formattedTime, speedConfig } = useTickTimer();

  return (
    <div className="text-xs text-white/60 space-y-0.5">
      <div>
        Status: {!isRunning ? '⏹ Stopped' : isPaused ? '⏸ Paused' : '▶ Running'}
      </div>
      <div>Time: {formattedTime}</div>
      <div>Speed: {speedConfig.label} ({speedConfig.description})</div>
      <div>Ticks: {tickCount}</div>
    </div>
  );
}
