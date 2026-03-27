"use client";

// Cultivation World Simulator - Main Game Component
// Updated: 2026-03-14 - Show StartScreen when no session exists
// Version: 2.2 - StartScreen for new game selection

import { useEffect, useState, useCallback } from "react";
import { PhaserGame } from "@/components/game/PhaserGame";
import { GameContainer } from "@/components/game/GameContainer";
import { ActionButtons } from "@/components/game/ActionButtons";
import { RestDialog } from "@/components/game/RestDialog";
import { StatusDialog } from "@/components/game/StatusDialog";
import { TechniquesDialog } from "@/components/game/TechniquesDialog";
import { InventoryDialog } from "@/components/game/InventoryDialog";
import { GameMenuDialog } from "@/components/game/GameMenuDialog";
import { TickTimerControls } from "@/components/game/TickTimerControls";
import { StartScreen } from "@/components/start/StartScreen";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary } from "@/components/game/ErrorBoundary";
import {
  useGameSessionId,
  useGameLoading,
  useGameCharacter,
  useGameActions,
} from "@/stores/game.store";

// Режимы игры
type GameMode = "world" | "training";

// Состояния инициализации
type InitState = "checking" | "start_screen" | "loading" | "playing" | "error";

export default function Home() {
  const [initState, setInitState] = useState<InitState>("checking");
  const [initError, setInitError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("training"); // По умолчанию - тренировочный полигон
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; worldName: string; characterName: string }>>([]);

  // Global dialog states (work in both world and training modes)
  const [restOpen, setRestOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [techniquesOpen, setTechniquesOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  // Get state from store
  const sessionId = useGameSessionId();
  const isLoading = useGameLoading();
  const character = useGameCharacter();

  // Get actions from store
  const { startGame, loadGame, resetGame, saveAndExit } = useGameActions();

  // Global event listeners for game menu actions (from Phaser scenes)
  useEffect(() => {
    // Listener for gameMenuAction events (from LocationScene)
    const handleGameMenuAction = (event: CustomEvent) => {
      const { action } = event.detail || {};
      console.log('[Page] Game menu action:', action);
      switch (action) {
        case 'status': setStatusOpen(true); break;
        case 'rest': setRestOpen(true); break;
        case 'techniques': setTechniquesOpen(true); break;
        case 'inventory': setInventoryOpen(true); break;
      }
    };

    // Listener for openGameMenu event
    const handleOpenGameMenu = () => setGameMenuOpen(true);

    window.addEventListener('gameMenuAction', handleGameMenuAction as EventListener);
    window.addEventListener('openGameMenu', handleOpenGameMenu);

    return () => {
      window.removeEventListener('gameMenuAction', handleGameMenuAction as EventListener);
      window.removeEventListener('openGameMenu', handleOpenGameMenu);
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    console.log("[Page] Checking for existing session...");
    const checkSession = async () => {
      try {
        // Try to restore last session from server
        const response = await fetch('/api/game/last-session');
        const data = await response.json();

        if (data.success && data.session) {
          console.log("[Init] Found last session on server:", data.session.id);
          const success = await loadGame(data.session.id);
          if (success) {
            console.log("[Init] Session restored successfully");
            setInitState("playing");
            return;
          }
        }

        // No session found - show start screen
        console.log("[Init] No session found, showing start screen");
        
        // Load saved sessions for StartScreen (с обработкой ошибок)
        try {
          const savesResponse = await fetch('/api/game/save');
          if (savesResponse.ok) {
            const savesData = await savesResponse.json();
            if (savesData.success && savesData.saves) {
              setSavedSessions(savesData.saves.map((s: Record<string, unknown>) => ({
                id: s.id as string,
                worldName: s.worldName as string || "Неизвестный мир",
                characterName: (s.character as Record<string, unknown>)?.name as string || "Безымянный",
              })));
            }
          } else {
            console.warn("[Init] Failed to load saves, status:", savesResponse.status);
          }
        } catch (savesError) {
          // Не критическая ошибка - продолжаем без списка сохранений
          console.warn("[Init] Failed to load saves:", savesError);
        }
        
        setInitState("start_screen");
      } catch (error) {
        console.error("[Init] Error:", error);
        setInitError(error instanceof Error ? error.message : "Ошибка инициализации");
        setInitState("error");
      }
    };

    checkSession();
  }, [loadGame]);

  // Handle start game from StartScreen
  const handleStartGame = useCallback(async (variant: 1 | 2 | 3, customConfig?: Record<string, unknown>, characterName?: string) => {
    setInitState("loading");
    setInitError(null);

    const success = await startGame(variant, customConfig, characterName);
    if (success) {
      console.log("[StartGame] New session created");
      setInitState("playing");
    } else {
      setInitError("Не удалось создать игровую сессию");
      setInitState("error");
    }
  }, [startGame]);

  // Handle load game from StartScreen
  const handleLoadGame = useCallback(async (sessionId: string) => {
    setInitState("loading");
    setInitError(null);

    const success = await loadGame(sessionId);
    if (success) {
      console.log("[LoadGame] Session loaded");
      setInitState("playing");
    } else {
      setInitError("Не удалось загрузить сессию");
      setInitState("error");
    }
  }, [loadGame]);

  // Handle new game (reset)
  const handleNewGame = useCallback(async () => {
    resetGame();
    setInitState("start_screen");
    setInitError(null);
  }, [resetGame]);

  // Handle save and exit
  const handleSaveAndExit = useCallback(async () => {
    await saveAndExit();
    setInitState("start_screen");
    setInitError(null);
  }, [saveAndExit]);

  // Toggle game mode
  const toggleGameMode = useCallback(() => {
    setGameMode(prev => prev === "world" ? "training" : "world");
  }, []);

  // Checking session state
  if (initState === "checking") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-amber-400">
            🌸 Cultivation World
          </h1>
          <p className="text-slate-400">Проверка сохранений...</p>
          <Progress value={30} className="w-48 h-2" />
        </div>
      </div>
    );
  }

  // Start screen
  if (initState === "start_screen") {
    return (
      <StartScreen
        onStartGame={handleStartGame}
        onLoadGame={handleLoadGame}
        isLoading={initState === "loading"}
      />
    );
  }

  // Loading state
  if (initState === "loading") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-amber-400">
            🌸 Cultivation World
          </h1>
          <p className="text-slate-400">Создание мира...</p>
          <Progress value={70} className="w-48 h-2" />
        </div>
      </div>
    );
  }

  // Error screen
  if (initState === "error") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-red-400">
            ⚠️ Ошибка инициализации
          </h1>
          <p className="text-slate-400">{initError}</p>
          <Button
            onClick={handleNewGame}
            className="bg-amber-600 hover:bg-amber-700"
          >
            🔄 Начать заново
          </Button>
        </div>
      </div>
    );
  }

  // Playing state - show game
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-amber-400">
              🌸 Cultivation World
            </h1>
            {character && (
              <span className="text-xs text-slate-400">
                {character.name} • Ур. {character.cultivationLevel}
              </span>
            )}
            {/* Mode indicator */}
            <span className={`text-xs px-2 py-0.5 rounded ${
              gameMode === "world"
                ? "bg-green-600/30 text-green-400"
                : "bg-orange-600/30 text-orange-400"
            }`}>
              {gameMode === "world" ? "🌍 Мир" : "⚔️ Полигон"}
            </span>
            
            {/* TickTimer Controls */}
            <TickTimerControls />
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle button */}
            <Button
              variant="outline"
              size="sm"
              className={`h-9 ${
                gameMode === "world"
                  ? "border-orange-600/50 text-orange-400 hover:bg-orange-900/30"
                  : "border-green-600/50 text-green-400 hover:bg-green-900/30"
              }`}
              onClick={toggleGameMode}
              title={gameMode === "world" ? "Перейти на тренировочный полигон" : "Вернуться в мир"}
            >
              {gameMode === "world" ? "⚔️ Полигон" : "🌍 Мир"}
            </Button>

            {/* Action buttons - only in training mode */}
            {gameMode === "training" && <ActionButtons />}

            <div className="w-px h-6 bg-slate-600 mx-1" />

            <Button
              variant="outline"
              size="sm"
              className="border-orange-600/50 text-orange-400 hover:bg-orange-900/30 h-9"
              onClick={() => {
                const event = new CustomEvent('openGameMenu');
                window.dispatchEvent(event);
              }}
              title="Меню игры (Сохранить, Читы, Редактор тела)"
            >
              🎮 Меню игры
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary onReset={handleNewGame}>
          {gameMode === "world" ? (
            // World mode - GameContainer with locations
            <GameContainer
              sessionId={sessionId || undefined}
              className="absolute inset-0"
            />
          ) : (
            // Training mode - PhaserGame (full screen with integrated chat)
            <PhaserGame />
          )}
        </ErrorBoundary>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1 text-center flex-shrink-0">
        <p className="text-xs text-slate-400">
          {gameMode === "world"
            ? "Клик по локации для входа • WASD или ←↑↓→ для перемещения • Enter для чата"
            : "WASD или ←↑↓→ для перемещения • Enter для чата • 1-9,0,-,= для техник"
          }
        </p>
      </footer>

      {/* Global dialogs - work in both world and training modes */}
      <RestDialog open={restOpen} onOpenChange={setRestOpen} />
      <StatusDialog open={statusOpen} onOpenChange={setStatusOpen} />
      <TechniquesDialog open={techniquesOpen} onOpenChange={setTechniquesOpen} />
      <InventoryDialog open={inventoryOpen} onOpenChange={setInventoryOpen} />
      <GameMenuDialog open={gameMenuOpen} onOpenChange={setGameMenuOpen} />
    </div>
  );
}
