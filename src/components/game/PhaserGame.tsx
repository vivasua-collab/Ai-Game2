/**
 * Game Scene - Main gameplay scene
 * 
 * Features:
 * - Simple plane environment
 * - Character with movement (WASD/Arrow keys)
 * - Camera follows player
 * - Movement time tracking (tiles moved → time advanced)
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameSessionId, useGameActions } from '@/stores/game.store';

// Game dimensions
const GAME_WIDTH = 900;
const GAME_HEIGHT = 550;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Player settings
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 200;

// Time tracking: accumulate distance and sync with server
const TILE_SIZE = 64; // pixels per tile
const TIME_SYNC_INTERVAL = 3000; // Sync every 3 seconds
const MIN_TILES_FOR_SYNC = 1; // Minimum tiles moved before sync

// Store global reference for scene to access
let globalSessionId: string | null = null;
let globalOnMovement: ((tiles: number) => void) | null = null;

// Scene config as object (no class for SSR compatibility)
const GameSceneConfig = {
  key: 'GameScene',

  preload(this: Phaser.Scene) {
    // Create textures programmatically
    // Player texture
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Body (circle)
    playerGraphics.fillStyle(0x4ade80); // green
    playerGraphics.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    // Inner detail (darker green)
    playerGraphics.fillStyle(0x22c55e);
    playerGraphics.fillCircle(PLAYER_SIZE, PLAYER_SIZE - 4, PLAYER_SIZE * 0.5);
    // Direction indicator
    playerGraphics.fillStyle(0xffffff);
    playerGraphics.fillCircle(PLAYER_SIZE + 8, PLAYER_SIZE, 4);
    playerGraphics.generateTexture('player', PLAYER_SIZE * 2 + 16, PLAYER_SIZE * 2);
    playerGraphics.destroy();

    // Ground tile texture
    const tileGraphics = this.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(0x1a2a1a);
    tileGraphics.fillRect(0, 0, 64, 64);
    tileGraphics.lineStyle(1, 0x2a3a2a);
    tileGraphics.strokeRect(0, 0, 64, 64);
    tileGraphics.generateTexture('ground', 64, 64);
    tileGraphics.destroy();
  },

  create(this: Phaser.Scene) {
    // @ts-expect-error - Phaser types
    const scene = this as Phaser.Scene;

    // Create world bounds
    scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create tiled ground
    for (let x = 0; x < WORLD_WIDTH; x += 64) {
      for (let y = 0; y < WORLD_HEIGHT; y += 64) {
        scene.add.image(x + 32, y + 32, 'ground').setOrigin(0.5);
      }
    }

    // World border visual
    const border = scene.add.graphics();
    border.lineStyle(4, 0x4ade80, 0.8);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create player
    const player = scene.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    // Player label
    const playerLabel = scene.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 40, 'Игрок', {
      fontSize: '14px',
      color: '#4ade80',
    }).setOrigin(0.5).setDepth(11);

    // Camera setup
    scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    scene.cameras.main.setZoom(1);

    // Input
    const cursors = scene.input.keyboard?.createCursorKeys();
    const wasd = scene.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Store references
    scene.data.set('player', player);
    scene.data.set('playerLabel', playerLabel);
    scene.data.set('cursors', cursors);
    scene.data.set('wasd', wasd);

    // Time tracking
    scene.data.set('lastPosition', { x: player.x, y: player.y });
    scene.data.set('accumulatedTiles', 0);
    scene.data.set('lastSyncTime', Date.now());

    // UI - Instructions
    const uiContainer = scene.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(100);

    // Top bar
    const topBar = scene.add.rectangle(GAME_WIDTH / 2, 25, GAME_WIDTH, 50, 0x000000, 0.7);
    uiContainer.add(topBar);

    const title = scene.add.text(GAME_WIDTH / 2, 15, '🌸 Cultivation World - Demo', {
      fontSize: '18px',
      color: '#4ade80',
    }).setOrigin(0.5);
    uiContainer.add(title);

    const coords = scene.add.text(GAME_WIDTH / 2, 35, 'X: 1000  Y: 1000', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    uiContainer.add(coords);
    scene.data.set('coordsText', coords);

    // Instructions
    const instructions = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20,
      'WASD или ←↑↓→ для перемещения', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    uiContainer.add(instructions);

    // Minimap (simple)
    const minimapSize = 120;
    const minimapX = GAME_WIDTH - minimapSize - 10;
    const minimapY = GAME_HEIGHT - minimapSize - 30;

    const minimapBg = scene.add.rectangle(minimapX, minimapY, minimapSize, minimapSize, 0x000000, 0.7);
    minimapBg.setStrokeStyle(2, 0x4ade80);
    uiContainer.add(minimapBg);

    const minimapPlayer = scene.add.circle(minimapX, minimapY, 4, 0x4ade80);
    uiContainer.add(minimapPlayer);
    scene.data.set('minimapPlayer', minimapPlayer);
    scene.data.set('minimapX', minimapX);
    scene.data.set('minimapY', minimapY);
    scene.data.set('minimapSize', minimapSize);

    // Ambient particles
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
      const size = Phaser.Math.Between(2, 4);

      const particle = scene.add.circle(x, y, size, 0x4ade80, 0.3);
      particle.setDepth(1);

      scene.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(10, 30),
        alpha: { from: 0.3, to: 0.1 },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 500),
      });
    }
  },

  update(this: Phaser.Scene) {
    // @ts-expect-error - Phaser types
    const scene = this as Phaser.Scene;

    const player = scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
    const playerLabel = scene.data.get('playerLabel') as Phaser.GameObjects.Text;
    const cursors = scene.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
    const wasd = scene.data.get('wasd') as Record<string, Phaser.Input.Keyboard.Key>;
    const coordsText = scene.data.get('coordsText') as Phaser.GameObjects.Text;
    const minimapPlayer = scene.data.get('minimapPlayer') as Phaser.GameObjects.Arc;
    const minimapX = scene.data.get('minimapX') as number;
    const minimapY = scene.data.get('minimapY') as number;
    const minimapSize = scene.data.get('minimapSize') as number;
    const lastPosition = scene.data.get('lastPosition') as { x: number; y: number };
    const accumulatedTiles = scene.data.get('accumulatedTiles') as number;
    const lastSyncTime = scene.data.get('lastSyncTime') as number;

    if (!player || !cursors || !wasd) return;

    // Movement
    let velocityX = 0;
    let velocityY = 0;

    if (cursors.left.isDown || wasd.left.isDown) {
      velocityX = -PLAYER_SPEED;
      player.setFlipX(true);
    } else if (cursors.right.isDown || wasd.right.isDown) {
      velocityX = PLAYER_SPEED;
      player.setFlipX(false);
    }

    if (cursors.up.isDown || wasd.up.isDown) {
      velocityY = -PLAYER_SPEED;
    } else if (cursors.down.isDown || wasd.down.isDown) {
      velocityY = PLAYER_SPEED;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    player.setVelocity(velocityX, velocityY);

    // Update player label position
    playerLabel.setPosition(player.x, player.y + 40);

    // Update coordinates display
    coordsText.setText(`X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}`);

    // Update minimap player position
    const mapRatio = minimapSize / WORLD_WIDTH;
    const miniX = minimapX - minimapSize / 2 + player.x * mapRatio;
    const miniY = minimapY - minimapSize / 2 + player.y * mapRatio;
    minimapPlayer.setPosition(miniX, miniY);

    // === TIME TRACKING ===
    // Calculate distance moved since last frame
    const dx = player.x - lastPosition.x;
    const dy = player.y - lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update last position
    scene.data.set('lastPosition', { x: player.x, y: player.y });

    // Accumulate tiles moved (1 tile = TILE_SIZE pixels)
    const tilesThisFrame = distance / TILE_SIZE;
    const newAccumulatedTiles = accumulatedTiles + tilesThisFrame;
    scene.data.set('accumulatedTiles', newAccumulatedTiles);

    // Check if we should sync with server
    const now = Date.now();
    const timeSinceSync = now - lastSyncTime;

    if (newAccumulatedTiles >= MIN_TILES_FOR_SYNC && timeSinceSync >= TIME_SYNC_INTERVAL) {
      // Sync with server
      const tilesToReport = Math.floor(newAccumulatedTiles);
      scene.data.set('accumulatedTiles', newAccumulatedTiles - tilesToReport);
      scene.data.set('lastSyncTime', now);

      // Call global callback
      if (globalOnMovement && globalSessionId) {
        globalOnMovement(tilesToReport);
      }
    }
  }
};

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const sessionId = useGameSessionId();
  const { loadState } = useGameActions();

  // Update global sessionId when it changes
  useEffect(() => {
    globalSessionId = sessionId;
  }, [sessionId]);

  // Handle movement - sync with server
  const handleMovement = useCallback(async (tilesMoved: number) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tilesMoved,
        }),
      });

      const data = await response.json();

      if (data.success && data.timeAdvanced) {
        // Reload state to update worldTime in store
        await loadState();
      }
    } catch (err) {
      console.error('Movement sync error:', err);
    }
  }, [sessionId, loadState]);

  // Set up global callback
  useEffect(() => {
    globalOnMovement = handleMovement;
    return () => {
      globalOnMovement = null;
    };
  }, [handleMovement]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initGame = async () => {
      try {
        // Dynamic import Phaser
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default;

        // Game config
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          parent: containerRef.current!,
          backgroundColor: '#0a1a0a',
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { x: 0, y: 0 },
              debug: false,
            },
          },
          scene: [GameSceneConfig],
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
        };

        // Create game
        gameRef.current = new Phaser.Game(config);
        setIsLoaded(true);
      } catch (err) {
        console.error('Phaser init error:', err);
        setError('Ошибка загрузки Phaser');
      }
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
        style={{ maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}` }}
      />

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-lg">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Загрузка игрового мира...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
