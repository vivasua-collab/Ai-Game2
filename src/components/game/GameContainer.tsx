/**
 * GameContainer - React wrapper for Phaser game
 * 
 * Manages Phaser lifecycle and provides React integration.
 * Uses dynamic imports to avoid SSR issues with Phaser.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { GAME_WIDTH, GAME_HEIGHT } from '@/game/config/game.constants';
import { GameBridge } from '@/services/game-bridge.service';

// Types for Phaser (imported dynamically)
type PhaserGame = {
  destroy: (removeCanvas: boolean) => void;
  events: {
    once: (event: string, callback: () => void) => void;
    emit: (event: string, data?: unknown) => void;
  };
  scene: {
    start: (name: string, data?: object) => void;
  };
};

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
  const gameRef = useRef<PhaserGame | null>(null);
  const initRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize game - only once, client-side only
  useEffect(() => {
    // Prevent double initialization and ensure client-side
    if (initRef.current) return;
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;

    initRef.current = true;

    // Dynamic import of Phaser and scenes (client-side only)
    let mounted = true;

    const initGame = async () => {
      try {
        // Import Phaser dynamically
        const Phaser = await import('phaser');
        const { GAME_CONFIG } = await import('@/game/config/game.config');
        const { BootScene } = await import('@/game/scenes/BootScene');
        const { WorldScene } = await import('@/game/scenes/WorldScene');

        if (!mounted) return;

        // Create game config with scenes
        const config: Phaser.Types.Core.GameConfig = {
          ...GAME_CONFIG,
          parent: containerRef.current!,
          scene: [BootScene, WorldScene],
        };

        // Create game instance
        const game = new Phaser.Game(config);
        gameRef.current = game as unknown as PhaserGame;

        // Register with bridge
        const bridge = GameBridge.getInstance();
        bridge.setGame(game as unknown as PhaserGame);

        if (sessionId) {
          bridge.setSessionId(sessionId);
        }

        // Setup event listeners
        if (onSceneChange) {
          bridge.on('scene-change', (data) => onSceneChange((data as { scene: string }).scene));
        }

        if (onStateUpdate) {
          bridge.on('state-updated', onStateUpdate);
        }

        if (onChatToggle) {
          bridge.on('chat-toggle', onChatToggle);
        }

        // Ready event
        game.events.once('ready', () => {
          if (mounted) setIsReady(true);
        });

        // Fallback ready check
        setTimeout(() => {
          if (mounted) setIsReady(true);
        }, 2000);

      } catch (err) {
        console.error('Failed to initialize Phaser:', err);
        if (mounted) {
          setError('Ошибка инициализации игры. Попробуйте обновить страницу.');
        }
      }
    };

    initGame();

    // Cleanup
    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      initRef.current = false;
      GameBridge.getInstance().destroy();
    };
  }, []); // Intentionally empty - we only want to initialize once

  // Update session ID separately
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      GameBridge.getInstance().setSessionId(sessionId);
    }
  }, [sessionId]);

  // Handle errors via error boundary or async
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
