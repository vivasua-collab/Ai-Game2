"use client";

import { useState, useCallback } from "react";
import { StartScreen } from "@/components/start/StartScreen";
import { GameChat } from "@/components/game/GameChat";
import { GameContainer } from "@/components/game/GameContainer";
import { Button } from "@/components/ui/button";
import {
  useGameSessionId,
  useGameLoading,
  useGameActions,
} from "@/stores/game.store";

type GameMode = "text" | "2d";

export default function Home() {
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>("text");

  // Get state from store
  const sessionId = useGameSessionId();
  const isLoading = useGameLoading();

  // Get actions from store
  const { startGame, loadGame, resetGame, saveAndExit } = useGameActions();

  const handleStartGame = async (
    variant: 1 | 2 | 3,
    customConfig?: Record<string, unknown>,
    characterName?: string
  ) => {
    const success = await startGame(variant, customConfig, characterName);
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleLoadGame = async (sessionIdParam: string) => {
    const success = await loadGame(sessionIdParam);
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleNewGame = () => {
    resetGame();
    setShowStartScreen(true);
  };

  const handleSaveAndExit = async () => {
    await saveAndExit();
    setShowStartScreen(true);
  };

  const toggleGameMode = useCallback(() => {
    setGameMode((prev) => (prev === "text" ? "2d" : "text"));
  }, []);

  // Показываем экран старта
  if (showStartScreen || !sessionId) {
    return (
      <StartScreen
        onStartGame={handleStartGame}
        onLoadGame={handleLoadGame}
        isLoading={isLoading}
      />
    );
  }

  // 2D режим с Phaser
  if (gameMode === "2d") {
    return (
      <div className="h-screen flex flex-col bg-slate-900 text-white">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-amber-400">
              🌸 Cultivation World
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={toggleGameMode}
              >
                📝 Текстовый режим
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-400 hover:bg-amber-900/30"
                onClick={handleNewGame}
              >
                🔄 Новая игра
              </Button>
            </div>
          </div>
        </header>

        {/* Game Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
          <GameContainer
            sessionId={sessionId}
            onSceneChange={(scene) => console.log("Scene changed:", scene)}
            className="shadow-xl"
          />
        </div>

        {/* Footer hint */}
        <footer className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-center">
          <p className="text-xs text-slate-400">
            💡 Нажмите на локацию для перехода • ESC для меню
          </p>
        </footer>
      </div>
    );
  }

  // Текстовый режим (по умолчанию)
  return (
    <div className="relative">
      {/* Mode switcher */}
      <div className="absolute top-2 right-2 z-50">
        <Button
          variant="outline"
          size="sm"
          className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/30"
          onClick={toggleGameMode}
        >
          🎮 2D режим
        </Button>
      </div>

      <GameChat onNewGame={handleNewGame} onSaveAndExit={handleSaveAndExit} />
    </div>
  );
}
