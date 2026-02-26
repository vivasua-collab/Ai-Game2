"use client";

import { useEffect, useState, useCallback } from "react";
import { PhaserGame } from "@/components/game/PhaserGame";
import { ActionButtons } from "@/components/game/ActionButtons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useGameSessionId,
  useGameLoading,
  useGameCharacter,
  useGameActions,
} from "@/stores/game.store";

// Ключ для localStorage
const SESSION_STORAGE_KEY = "cultivation_session_id";

export default function Home() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Get state from store
  const sessionId = useGameSessionId();
  const isLoading = useGameLoading();
  const character = useGameCharacter();

  // Get actions from store
  const { startGame, loadGame, resetGame, saveAndExit } = useGameActions();

  // Auto-initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        // Try to restore existing session from localStorage
        const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
        
        if (savedSessionId) {
          console.log("[Init] Found saved session:", savedSessionId);
          const success = await loadGame(savedSessionId);
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
          // Save session ID to localStorage
          const store = (await import("@/stores/game.store")).useGameStore.getState();
          if (store.sessionId) {
            localStorage.setItem(SESSION_STORAGE_KEY, store.sessionId);
          }
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

  // Save session ID when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  }, [sessionId]);

  // Handle new game (reset)
  const handleNewGame = useCallback(async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    resetGame();
    setIsInitializing(true);
    setInitError(null);
    
    const success = await startGame(1, undefined, "Путник");
    if (success) {
      const store = (await import("@/stores/game.store")).useGameStore.getState();
      if (store.sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY, store.sessionId);
      }
    }
    setIsInitializing(false);
  }, [resetGame, startGame]);

  // Handle save and exit
  const handleSaveAndExit = useCallback(async () => {
    await saveAndExit();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsInitializing(true);
    setInitError(null);
    
    // Create new session
    const success = await startGame(1, undefined, "Путник");
    if (success) {
      const store = (await import("@/stores/game.store")).useGameStore.getState();
      if (store.sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY, store.sessionId);
      }
    }
    setIsInitializing(false);
  }, [saveAndExit, startGame]);

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

  // Main 2D mode - FULLSCREEN with chat inside Phaser
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
          </div>
          <div className="flex items-center gap-2">
            {/* Action buttons */}
            <ActionButtons />
            
            <div className="w-px h-6 bg-slate-600 mx-1" />
            
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
              onClick={handleSaveAndExit}
            >
              💾 Сохранить
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-400 hover:bg-amber-900/30"
              onClick={handleNewGame}
            >
              🔄 Новая
            </Button>
          </div>
        </div>
      </header>

      {/* Main content: FULLSCREEN Phaser Game Canvas with integrated chat */}
      <div className="flex-1 overflow-hidden">
        <PhaserGame />
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1 text-center flex-shrink-0">
        <p className="text-xs text-slate-400">
          WASD или ←↑↓→ для перемещения • Enter для чата • 1-9,0,-,= для техник
        </p>
      </footer>
    </div>
  );
}
