"use client";

import { useState } from "react";
import { useGame } from "@/hooks/useGame";
import { StartScreen } from "@/components/start/StartScreen";
import { GameChat } from "@/components/game/GameChat";

export default function Home() {
  const game = useGame();
  const [showStartScreen, setShowStartScreen] = useState(true);

  const handleStartGame = async (
    variant: 1 | 2 | 3,
    customConfig?: Record<string, unknown>,
    characterName?: string
  ) => {
    const success = await game.startGame(variant, customConfig, characterName);
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleLoadGame = async (sessionId: string) => {
    const success = await game.loadGame(sessionId);
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleNewGame = () => {
    game.resetGame();
    setShowStartScreen(true);
  };

  const handleSaveAndExit = async () => {
    await game.saveAndExit();
    setShowStartScreen(true);
  };

  // Показываем экран старта
  if (showStartScreen || !game.sessionId) {
    return (
      <StartScreen
        onStartGame={handleStartGame}
        onLoadGame={handleLoadGame}
        isLoading={game.isLoading}
      />
    );
  }

  // Показываем игровой чат
  return (
    <GameChat
      messages={game.messages}
      character={game.character}
      worldTime={game.worldTime}
      location={game.location}
      isLoading={game.isLoading}
      isPaused={game.isPaused}
      daysSinceStart={game.daysSinceStart}
      onSendMessage={game.sendMessage}
      onTogglePause={game.togglePause}
      onNewGame={handleNewGame}
      onSaveAndExit={handleSaveAndExit}
    />
  );
}
