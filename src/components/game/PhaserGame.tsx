/**
 * Game Scene - Main gameplay scene with integrated chat and combat slots
 * 
 * Features:
 * - Simple plane environment
 * - Character with movement (WASD/Arrow keys)
 * - Integrated chat with Enter key toggle (bottom-left)
 * - Combat slots with keyboard shortcuts (bottom-center)
 * - Minimap (top-right)
 * - Responsive UI that scales with window size
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameSessionId, useGameActions, useGameCharacter, useGameTechniques, useGameMessages, useGameLoading } from '@/stores/game.store';
import type { Message, CharacterTechnique } from '@/types/game';
import { getCombatSlotsCount } from '@/types/game';

// Game dimensions - will be dynamically resized
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 700;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Aliases for backward compatibility
const GAME_WIDTH = BASE_WIDTH;
const GAME_HEIGHT = BASE_HEIGHT;

// Player settings
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 200;

// Time tracking
const TILE_SIZE = 64;
const TIME_SYNC_INTERVAL = 3000;
const MIN_TILES_FOR_SYNC = 1;

// Combat slots configuration
const COMBAT_SLOT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'EQUALS'];
const BASE_COMBAT_SLOTS = 3;

// Global references for scene access
let globalSessionId: string | null = null;
let globalOnMovement: ((tiles: number) => void) | null = null;
let globalOnSendMessage: ((message: string) => void) | null = null;
let globalOnCombatTechnique: ((techniqueId: string) => void) | null = null;
let globalCharacter: any = null;
let globalTechniques: CharacterTechnique[] = [];
let globalMessages: Message[] = [];
let globalIsLoading: boolean = false;

// Scene config
const GameSceneConfig = {
  key: 'GameScene',

  preload(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;

    // Player texture
    const playerGraphics = scene.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x4ade80);
    playerGraphics.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    playerGraphics.fillStyle(0x22c55e);
    playerGraphics.fillCircle(PLAYER_SIZE, PLAYER_SIZE - 4, PLAYER_SIZE * 0.5);
    playerGraphics.fillStyle(0xffffff);
    playerGraphics.fillCircle(PLAYER_SIZE + 8, PLAYER_SIZE, 4);
    playerGraphics.generateTexture('player', PLAYER_SIZE * 2 + 16, PLAYER_SIZE * 2);
    playerGraphics.destroy();

    // Ground tile texture
    const tileGraphics = scene.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(0x1a2a1a);
    tileGraphics.fillRect(0, 0, 64, 64);
    tileGraphics.lineStyle(1, 0x2a3a2a);
    tileGraphics.strokeRect(0, 0, 64, 64);
    tileGraphics.generateTexture('ground', 64, 64);
    tileGraphics.destroy();
  },

  create(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;
    let isChatFocused = false;
    let chatInputText = '';

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

    // Input keys
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
    scene.data.set('isChatFocused', isChatFocused);
    scene.data.set('chatInputText', chatInputText);
    scene.data.set('lastPosition', { x: player.x, y: player.y });
    scene.data.set('accumulatedTiles', 0);
    scene.data.set('lastSyncTime', Date.now());

    // === UI CONTAINER (fixed on screen) ===
    const uiContainer = scene.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(100);

    // Helper function to get current screen size
    const getScreenSize = () => ({
      width: scene.cameras.main.width,
      height: scene.cameras.main.height,
    });

    // Top bar
    const topBar = scene.add.rectangle(0, 25, 0, 50, 0x000000, 0.7);
    uiContainer.add(topBar);

    const title = scene.add.text(0, 15, '🌸 Cultivation World', {
      fontSize: '18px',
      color: '#4ade80',
    }).setOrigin(0.5);
    uiContainer.add(title);

    const coords = scene.add.text(0, 35, 'X: 1000  Y: 1000', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    uiContainer.add(coords);
    scene.data.set('coordsText', coords);

    // === CHAT PANEL (bottom-left) ===
    const chatWidth = 300;
    const chatHeight = 150;
    
    // Chat background
    const chatBg = scene.add.rectangle(0, 0, chatWidth, chatHeight, 0x000000, 0.8);
    chatBg.setStrokeStyle(1, 0x4ade80, 0.5);
    uiContainer.add(chatBg);

    // Chat title
    const chatTitle = scene.add.text(0, 0, '💬 Чат [Enter]', {
      fontSize: '12px',
      color: '#fbbf24',
    });
    uiContainer.add(chatTitle);

    // Chat messages container
    const chatMessagesText = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#e2e8f0',
      wordWrap: { width: chatWidth - 20 },
      lineSpacing: 3,
    });
    uiContainer.add(chatMessagesText);
    scene.data.set('chatMessagesText', chatMessagesText);

    // Chat input background
    const inputBg = scene.add.rectangle(0, 0, chatWidth - 10, 24, 0x1e293b, 1);
    inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
    uiContainer.add(inputBg);

    // Chat input text
    const chatInputDisplay = scene.add.text(0, 0, '|', {
      fontSize: '12px',
      color: '#ffffff',
    });
    uiContainer.add(chatInputDisplay);
    scene.data.set('chatInputDisplay', chatInputDisplay);

    // === COMBAT SLOTS (bottom-center) ===
    const slotSize = 40;
    const slotSpacing = 5;
    const totalSlots = 12;

    const combatSlotsContainer = scene.add.container(0, 0);
    uiContainer.add(combatSlotsContainer);

    const slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];
    const slotTexts: Phaser.GameObjects.Text[] = [];

    const updateCombatSlots = () => {
      combatSlotsContainer.removeAll(true);
      slotBackgrounds.length = 0;
      slotTexts.length = 0;

      const { width, height } = getScreenSize();

      const level = globalCharacter?.cultivationLevel || 0;
      const availableSlots = getCombatSlotsCount(level);

      // Get equipped techniques by quickSlot
      const equippedBySlot: Map<number, CharacterTechnique> = new Map();
      for (const t of globalTechniques) {
        if ((t.technique.type === 'combat' || t.technique.type === 'movement') && t.quickSlot !== null && t.quickSlot > 0) {
          equippedBySlot.set(t.quickSlot, t);
        }
      }

      const slotsY = height - 35; // Dynamic position from bottom
      const startX = width / 2 - (totalSlots * (slotSize + slotSpacing)) / 2;

      for (let i = 0; i < totalSlots; i++) {
        const x = startX + i * (slotSize + slotSpacing);
        const isAvailable = i < availableSlots;
        const equipped = equippedBySlot.get(i + 1); // quickSlot is 1-indexed
        const slotKey = i < 9 ? String(i + 1) : (i === 9 ? '0' : i === 10 ? '-' : '=');

        // Slot background
        const slotBg = scene.add.rectangle(x, slotsY, slotSize, slotSize,
          isAvailable ? (equipped ? 0x22c55e : 0x1e293b) : 0x0f172a, 1
        );
        slotBg.setStrokeStyle(2, isAvailable ? (equipped ? 0x22c55e : 0x4ade80) : 0x334155);
        combatSlotsContainer.add(slotBg);
        slotBackgrounds.push(slotBg);

        // Slot key label
        const keyLabel = scene.add.text(x, slotsY - slotSize / 2 - 8, slotKey, {
          fontSize: '10px',
          color: isAvailable ? '#9ca3af' : '#475569',
        }).setOrigin(0.5);
        combatSlotsContainer.add(keyLabel);

        // Slot content
        const slotContent = scene.add.text(x, slotsY, equipped ? '⚔️' : '', {
          fontSize: '20px',
        }).setOrigin(0.5);
        combatSlotsContainer.add(slotContent);
        slotTexts.push(slotContent);

        // Interactive
        if (isAvailable && equipped) {
          slotBg.setInteractive();
          slotBg.on('pointerdown', () => {
            if (globalOnCombatTechnique) {
              globalOnCombatTechnique(equipped.techniqueId);
            }
          });
        }
      }
    };

    scene.data.set('updateCombatSlots', updateCombatSlots);
    updateCombatSlots();

    // === MINIMAP (top-right) ===
    const minimapSize = 100;

    const minimapBg = scene.add.rectangle(0, 0, minimapSize, minimapSize, 0x000000, 0.7);
    minimapBg.setStrokeStyle(2, 0x4ade80);
    uiContainer.add(minimapBg);

    const minimapPlayer = scene.add.circle(0, 0, 3, 0x4ade80);
    uiContainer.add(minimapPlayer);
    scene.data.set('minimapPlayer', minimapPlayer);
    scene.data.set('minimapSize', minimapSize);

    // === INSTRUCTIONS ===
    const instructions = scene.add.text(0, 0,
      'WASD • Enter для чата • 1-9,0,-,= для техник', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    uiContainer.add(instructions);

    // === UPDATE UI POSITIONS FUNCTION ===
    const updateUIPositions = () => {
      const { width, height } = getScreenSize();

      // Update top bar
      topBar.setPosition(width / 2, 25);
      topBar.setSize(width, 50);
      title.setPosition(width / 2, 15);
      coords.setPosition(width / 2, 35);

      // Update chat panel (bottom-left)
      const chatX = chatWidth / 2 + 10;
      const chatY = height - chatHeight / 2 - 10;
      chatBg.setPosition(chatX, chatY);
      chatTitle.setPosition(chatX - chatWidth / 2 + 5, chatY - chatHeight / 2 + 5);
      chatMessagesText.setPosition(chatX - chatWidth / 2 + 10, chatY - chatHeight / 2 + 25);
      inputBg.setPosition(chatX, chatY + chatHeight / 2 - 15);
      chatInputDisplay.setPosition(chatX - chatWidth / 2 + 10, chatY + chatHeight / 2 - 22);

      // Update minimap (top-right)
      const minimapX = width - minimapSize / 2 - 10;
      const minimapY = 60 + minimapSize / 2;
      minimapBg.setPosition(minimapX, minimapY);
      minimapPlayer.setPosition(minimapX, minimapY);
      scene.data.set('minimapX', minimapX);
      scene.data.set('minimapY', minimapY);

      // Update instructions (bottom-center)
      instructions.setPosition(width / 2, height - 15);

      // Update combat slots
      updateCombatSlots();
    };

    scene.data.set('updateUIPositions', updateUIPositions);
    updateUIPositions(); // Initial positioning

    // === AMBIENT PARTICLES ===
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
      const particle = scene.add.circle(x, y, Phaser.Math.Between(2, 4), 0x4ade80, 0.3);
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

    // === KEYBOARD HANDLING ===

    // Handle Enter key for chat focus toggle
    scene.input.keyboard?.on('keydown-ENTER', () => {
      isChatFocused = !isChatFocused;
      scene.data.set('isChatFocused', isChatFocused);

      if (isChatFocused) {
        chatBg.setFillStyle(0x000000, 0.9);
        inputBg.setStrokeStyle(2, 0xfbbf24);
        chatTitle.setText('💬 Чат [Enter - отправить]');
      } else {
        // Send message
        const text = scene.data.get('chatInputText') as string;
        if (text?.trim() && globalOnSendMessage) {
          globalOnSendMessage(text.trim());
        }
        scene.data.set('chatInputText', '');
        chatBg.setFillStyle(0x000000, 0.8);
        inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
        chatTitle.setText('💬 Чат [Enter]');
        chatInputDisplay.setText('|');
      }
    });

    // Handle Escape to unfocus chat
    scene.input.keyboard?.on('keydown-ESC', () => {
      if (isChatFocused) {
        isChatFocused = false;
        scene.data.set('isChatFocused', false);
        scene.data.set('chatInputText', '');
        chatBg.setFillStyle(0x000000, 0.8);
        inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
        chatTitle.setText('💬 Чат [Enter]');
        chatInputDisplay.setText('|');
      }
    });

    // Handle text input when chat is focused
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!isChatFocused) return;

      let currentText = (scene.data.get('chatInputText') as string) || '';

      if (event.key === 'Backspace') {
        currentText = currentText.slice(0, -1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        if (currentText.length < 100) {
          currentText += event.key;
        }
      }

      scene.data.set('chatInputText', currentText);
      chatInputDisplay.setText(currentText + '|');
    });

    // Handle combat slot keys
    COMBAT_SLOT_KEYS.forEach((keyName, index) => {
      const keyCode = Phaser.Input.Keyboard.KeyCodes[keyName as keyof typeof Phaser.Input.Keyboard.KeyCodes];
      scene.input.keyboard?.on(`keydown-${keyCode}`, () => {
        if (isChatFocused) return;

        const slotIndex = index + 1;
        const level = globalCharacter?.cultivationLevel || 0;
        const availableSlots = getCombatSlotsCount(level);

        if (slotIndex <= availableSlots) {
          // Find equipped technique
          const equipped = globalTechniques.find(t => 
            (t.technique.type === 'combat' || t.technique.type === 'movement') && 
            t.quickSlot === slotIndex
          );

          if (equipped && globalOnCombatTechnique) {
            globalOnCombatTechnique(equipped.techniqueId);

            // Visual feedback
            const slotBg = slotBackgrounds[index];
            if (slotBg) {
              scene.tweens.add({
                targets: slotBg,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true,
              });
            }
          }
        }
      });
    });

    // Update chat messages periodically
    scene.time.addEvent({
      delay: 500,
      callback: () => {
        if (chatMessagesText && globalMessages.length > 0) {
          const recentMessages = globalMessages.slice(-5);
          const text = recentMessages.map(m => {
            const prefix = m.sender === 'player' ? '👤' : '📖';
            const content = m.content.length > 50 ? m.content.slice(0, 50) + '...' : m.content;
            return `${prefix} ${content}`;
          }).join('\n');
          chatMessagesText.setText(text);
        }
      },
      loop: true,
    });

    // Update combat slots periodically
    scene.time.addEvent({
      delay: 1000,
      callback: updateCombatSlots,
      loop: true,
    });
  },

  update(this: Phaser.Scene) {
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
    const isChatFocused = scene.data.get('isChatFocused') as boolean;

    if (!player || !cursors || !wasd) return;

    // Skip movement when chat is focused
    if (isChatFocused) {
      player.setVelocity(0, 0);
      return;
    }

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

    // Time tracking
    const dx = player.x - lastPosition.x;
    const dy = player.y - lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    scene.data.set('lastPosition', { x: player.x, y: player.y });

    const tilesThisFrame = distance / TILE_SIZE;
    const newAccumulatedTiles = accumulatedTiles + tilesThisFrame;
    scene.data.set('accumulatedTiles', newAccumulatedTiles);

    const now = Date.now();
    const timeSinceSync = now - lastSyncTime;

    if (newAccumulatedTiles >= MIN_TILES_FOR_SYNC && timeSinceSync >= TIME_SYNC_INTERVAL) {
      const tilesToReport = Math.floor(newAccumulatedTiles);
      scene.data.set('accumulatedTiles', newAccumulatedTiles - tilesToReport);
      scene.data.set('lastSyncTime', now);

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
  const character = useGameCharacter();
  const techniques = useGameTechniques();
  const messages = useGameMessages();
  const isLoading = useGameLoading();
  const { loadState, sendMessage } = useGameActions();

  // Update global references
  useEffect(() => {
    globalSessionId = sessionId;
  }, [sessionId]);

  useEffect(() => {
    globalCharacter = character;
  }, [character]);

  useEffect(() => {
    globalTechniques = techniques;
  }, [techniques]);

  useEffect(() => {
    globalMessages = messages;
  }, [messages]);

  useEffect(() => {
    globalIsLoading = isLoading;
  }, [isLoading]);

  // Handle movement
  const handleMovement = useCallback(async (tilesMoved: number) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, tilesMoved }),
      });

      const data = await response.json();
      if (data.success && data.timeAdvanced) {
        await loadState();
      }
    } catch (err) {
      console.error('Movement sync error:', err);
    }
  }, [sessionId, loadState]);

  // Handle chat message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    await sendMessage(message);
  }, [sendMessage]);

  // Handle combat technique
  const handleCombatTechnique = useCallback(async (techniqueId: string) => {
    console.log('Combat technique used:', techniqueId);
    // TODO: Implement combat technique usage
  }, []);

  // Set up global callbacks
  useEffect(() => {
    globalOnMovement = handleMovement;
    return () => { globalOnMovement = null; };
  }, [handleMovement]);

  useEffect(() => {
    globalOnSendMessage = handleSendMessage;
    return () => { globalOnSendMessage = null; };
  }, [handleSendMessage]);

  useEffect(() => {
    globalOnCombatTechnique = handleCombatTechnique;
    return () => { globalOnCombatTechnique = null; };
  }, [handleCombatTechnique]);

  // Initialize game with fullscreen scaling
  useEffect(() => {
    if (!containerRef.current) return;

    const initGame = async () => {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default;

        // Get container size for initial setup
        const container = containerRef.current!;
        const width = container.clientWidth || BASE_WIDTH;
        const height = container.clientHeight || BASE_HEIGHT;

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: width,
          height: height,
          parent: container,
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
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: width,
            height: height,
          },
        };

        gameRef.current = new Phaser.Game(config);
        
        // Handle resize
        const handleResize = () => {
          if (!gameRef.current || !container) return;
          
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          
          gameRef.current.scale.resize(newWidth, newHeight);
          
          // Update UI positions in the scene
          const scene = gameRef.current.scene.getScene('GameScene') as Phaser.Scene;
          if (scene && scene.data) {
            const updateUI = scene.data.get('updateUIPositions') as (() => void) | undefined;
            if (updateUI) updateUI();
          }
        };
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        // Initial resize after mount
        setTimeout(handleResize, 100);
        
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
    <div className="relative w-full h-full min-h-0 flex-1">
      <div
        ref={containerRef}
        className="w-full h-full bg-slate-900"
        style={{ minHeight: '100%' }}
      />

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Загрузка игрового мира...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
