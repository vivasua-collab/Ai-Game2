"use client";

// Cultivation World Simulator - Main Game Component
// Updated: 2026-03-11 11:50 - Removed localStorage, server-only storage
// Version: 2.1 - Server-side storage only (no localStorage/sessionStorage)

import { useEffect, useState, useCallback } from "react";
import { PhaserGame } from "@/components/game/PhaserGame";
import { GameContainer } from "@/components/game/GameContainer";
import { ActionButtons } from "@/components/game/ActionButtons";
import { RestDialog } from "@/components/game/RestDialog";
import { StatusDialog } from "@/components/game/StatusDialog";
import { TechniquesDialog } from "@/components/game/TechniquesDialog";
import { InventoryDialog } from "@/components/game/InventoryDialog";
import { GameMenuDialog } from "@/components/game/GameMenuDialog";
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

export default function Home() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("training"); // По умолчанию - тренировочный полигон

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

  // Auto-initialize session on mount
  // Server-only storage: try to restore last session from server, or create new
  useEffect(() => {
    console.log("[Page] useEffect triggered, starting initSession");
    const initSession = async () => {
      console.log("[Page] initSession started");
      try {
        // Try to restore last session from server
        const response = await fetch('/api/game/last-session');
        const data = await response.json();

        if (data.success && data.session) {
          console.log("[Init] Found last session on server:", data.session.id);
          const success = await loadGame(data.session.id);
          if (success) {
            console.log("[Init] Session restored successfully");
            setIsInitializing(false);
            return;
          }
          console.log("[Init] Failed to restore session, creating new one");
        }

        // Create new session with default variant
        console.log("[Init] Creating new session...");
        const success = await startGame(1, undefined, "Путник");

        if (success) {
          console.log("[Init] New session created");
        } else {
          setInitError("Не удалось создать игровую сессию");
        }
      } catch (error) {
        console.error("[Init] Error:", error);
        setInitError(error instanceof Error ? error.message : "Ошибка инициализации");
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, [startGame, loadGame]);

  // Handle new game (reset)
  const handleNewGame = useCallback(async () => {
    resetGame();
    setIsInitializing(true);
    setInitError(null);

    const success = await startGame(1, undefined, "Путник");
    if (!success) {
      setInitError("Не удалось создать игру");
    }
    setIsInitializing(false);
  }, [resetGame, startGame]);

  // Handle save and exit
  const handleSaveAndExit = useCallback(async () => {
    await saveAndExit();
    setIsInitializing(true);
    setInitError(null);

    // Create new session
    const success = await startGame(1, undefined, "Путник");
    if (!success) {
      setInitError("Не удалось создать игру");
    }
    setIsInitializing(false);
  }, [saveAndExit, startGame]);

  // Toggle game mode
  const toggleGameMode = useCallback(() => {
    setGameMode(prev => prev === "world" ? "training" : "world");
  }, []);

  // Loading screen during initialization
  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-amber-400">
            🌸 Cultivation World
          </h1>
          <p className="text-slate-400">Инициализация мира...</p>
          <Progress value={50} className="w-48 h-2" />
        </div>
      </div>
    );
  }

  // Error screen
  if (initError) {
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
