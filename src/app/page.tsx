"use client";

import { useState } from "react";
import { StartScreen } from "@/components/start/StartScreen";
import { GameChat } from "@/components/game/GameChat";
import {
  useGameSessionId,
  useGameLoading,
  useGameActions,
} from "@/stores/game.store";

export default function Home() {
  const [showStartScreen, setShowStartScreen] = useState(true);

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

  // Показываем игровой чат
  return (
    <GameChat
      onNewGame={handleNewGame}
      onSaveAndExit={handleSaveAndExit}
    />
  );
}
