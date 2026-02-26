/**
 * GameContainer - React wrapper for Phaser game
 * 
 * Manages Phaser lifecycle and provides React integration.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from '@/game/config/game.config';
import { GameBridge } from '@/services/game-bridge.service';
import { BootScene } from '@/game/scenes/BootScene';
import { WorldScene } from '@/game/scenes/WorldScene';

interface GameContainerProps {
  sessionId?: string;
  onSceneChange?: (scene: string) => void;
  onStateUpdate?: (state: unknown) => void;
  onChatToggle?: () => void;
  className?: string;
}

export function GameContainer({
  sessionId,
  onSceneChange,
  onStateUpdate,
  onChatToggle,
  className = '',
}: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize game - only once
  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    if (!containerRef.current) return;
    
    initRef.current = true;
    
    // Create game config with scenes
    const config: Phaser.Types.Core.GameConfig = {
      ...GAME_CONFIG,
      parent: containerRef.current,
      scene: [BootScene, WorldScene],
    };
    
    // Create game instance
    const game = new Phaser.Game(config);
    gameRef.current = game;
    
    // Register with bridge
    const bridge = GameBridge.getInstance();
    bridge.setGame(game);
    
    if (sessionId) {
      bridge.setSessionId(sessionId);
    }
    
    // Setup event listeners
    const unsubscribers: (() => void)[] = [];
    
    if (onSceneChange) {
      unsubscribers.push(
        bridge.on('scene-change', (data) => onSceneChange((data as { scene: string }).scene))
      );
    }
    
    if (onStateUpdate) {
      unsubscribers.push(bridge.on('state-updated', onStateUpdate));
    }
    
    if (onChatToggle) {
      unsubscribers.push(bridge.on('chat-toggle', onChatToggle));
    }
    
    // Ready event
    game.events.once('ready', () => {
      setIsReady(true);
    });
    
    // Fallback ready check
    const readyCheck = setTimeout(() => {
      setIsReady(true);
    }, 2000);
    
    // Cleanup
    return () => {
      clearTimeout(readyCheck);
      unsubscribers.forEach((unsub) => unsub());
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      initRef.current = false;
      GameBridge.getInstance().destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want to initialize once
  
  // Update session ID separately
  useEffect(() => {
    if (sessionId) {
      GameBridge.getInstance().setSessionId(sessionId);
    }
  }, [sessionId]);
  
  // Handle errors via error boundary or async
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('Phaser') || event.message.includes('WebGL')) {
        setError('Ошибка инициализации графики. Попробуйте обновить страницу.');
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        id="game-container"
        className="w-full rounded-lg overflow-hidden border border-border bg-background"
        style={{ maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}` }}
      />
      
      {/* Loading overlay */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Загрузка игрового мира...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
          <div className="text-center p-4">
            <p className="text-destructive mb-2">⚠️ {error}</p>
            <p className="text-muted-foreground text-sm">
              Попробуйте обновить страницу
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
