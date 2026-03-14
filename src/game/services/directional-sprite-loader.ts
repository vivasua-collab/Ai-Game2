/**
 * Directional Sprite Loader for Phaser 3
 * 
 * Handles 8-direction top-down sprites that DON'T rotate.
 * Instead, shows different frames based on facing direction.
 */

export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

// Direction indices in spritesheet (4x2 grid layout)
// Row 0: E, SE, S, SW  (frames 0-3)
// Row 1: W, NW, N, NE  (frames 4-7)
const DIRECTION_FRAMES: Record<Direction, number> = {
  'e': 0,
  'se': 1,
  's': 2,
  'sw': 3,
  'w': 4,
  'nw': 5,
  'n': 6,
  'ne': 7,
};

// Spritesheet configuration
const DIRECTIONAL_CONFIG = {
  // player-directions.png: 1344x768 = 4 cols x 2 rows
  frameWidth: 336,   // 1344 / 4
  frameHeight: 384,  // 768 / 2
  directions: 8,
};

export class DirectionalSpriteLoader {
  private scene: Phaser.Scene;
  private currentDirection: Direction = 's'; // Default facing south (down)
  private isLoaded: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load the directional spritesheet
   */
  preload(): void {
    // Load spritesheet with 8 directional frames
    this.scene.load.spritesheet('player_directions', '/sprites/player/player-directions.png', {
      frameWidth: DIRECTIONAL_CONFIG.frameWidth,
      frameHeight: DIRECTIONAL_CONFIG.frameHeight,
    });
    
    // Optional: Load walk animation spritesheet
    this.scene.load.spritesheet('player_walk', '/sprites/player/player-walk-frames.png', {
      frameWidth: 256,  // 1024 / 4 = 256
      frameHeight: 256, // 1024 / 4 = 256
    });
  }

  /**
   * Create animations for all directions
   * Call this in create() after preload completes
   */
  createAnimations(): void {
    // Create single-frame "idle" animation for each direction
    Object.entries(DIRECTION_FRAMES).forEach(([dir, frameIndex]) => {
      this.scene.anims.create({
        key: `player_idle_${dir}`,
        frames: [{ key: 'player_directions', frame: frameIndex }],
        frameRate: 1,
        repeat: 0,
      });
    });

    // Create walk animations (4 frames per direction)
    // Assuming walk spritesheet has frames arranged by direction
    Object.entries(DIRECTION_FRAMES).forEach(([dir, dirIndex]) => {
      // Walk frames: each direction has 4 frames starting at dirIndex * 4
      const startFrame = dirIndex * 4;
      
      this.scene.anims.create({
        key: `player_walk_${dir}`,
        frames: this.scene.anims.generateFrameNumbers('player_walk', {
          start: startFrame,
          end: startFrame + 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });

    this.isLoaded = true;
  }

  /**
   * Check if textures are loaded
   */
  isReady(): boolean {
    return this.isLoaded && this.scene.textures.exists('player_directions');
  }

  /**
   * Get the frame index for a direction
   */
  getFrameIndex(direction: Direction): number {
    return DIRECTION_FRAMES[direction];
  }

  /**
   * Convert angle (in degrees) to direction
   * 0° = East, 90° = South, 180° = West, -90° = North
   */
  static angleToDirection(angleDegrees: number): Direction {
    // Normalize angle to 0-360
    let angle = ((angleDegrees % 360) + 360) % 360;
    
    // Map to 8 directions (45° sectors)
    // East: 337.5° - 22.5°
    if (angle >= 337.5 || angle < 22.5) return 'e';
    // Southeast: 22.5° - 67.5°
    if (angle >= 22.5 && angle < 67.5) return 'se';
    // South: 67.5° - 112.5°
    if (angle >= 67.5 && angle < 112.5) return 's';
    // Southwest: 112.5° - 157.5°
    if (angle >= 112.5 && angle < 157.5) return 'sw';
    // West: 157.5° - 202.5°
    if (angle >= 157.5 && angle < 202.5) return 'w';
    // Northwest: 202.5° - 247.5°
    if (angle >= 202.5 && angle < 247.5) return 'nw';
    // North: 247.5° - 292.5°
    if (angle >= 247.5 && angle < 292.5) return 'n';
    // Northeast: 292.5° - 337.5°
    return 'ne';
  }

  /**
   * Convert velocity to direction
   */
  static velocityToDirection(vx: number, vy: number): Direction {
    if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
      return 's'; // Default when stationary
    }
    const angle = Math.atan2(vy, vx) * 180 / Math.PI;
    return this.angleToDirection(angle);
  }

  /**
   * Update player sprite to face a direction
   * Returns the animation key that should be played
   */
  getAnimationKey(direction: Direction, isMoving: boolean): string {
    this.currentDirection = direction;
    return isMoving ? `player_walk_${direction}` : `player_idle_${direction}`;
  }

  /**
   * Get current direction
   */
  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  /**
   * Create a player sprite with directional rendering
   * Returns a sprite that can play directional animations
   */
  createPlayerSprite(x: number, y: number): Phaser.GameObjects.Sprite | null {
    if (!this.isReady()) {
      console.warn('DirectionalSpriteLoader: Sprites not loaded yet');
      return null;
    }

    const sprite = this.scene.add.sprite(x, y, 'player_directions', DIRECTION_FRAMES['s']);
    
    // Scale down to game-appropriate size (original frame is 336x384, we want ~48px)
    const targetSize = 48;
    const scale = targetSize / DIRECTIONAL_CONFIG.frameWidth;
    sprite.setScale(scale);
    
    // Play initial idle animation (facing south)
    sprite.play('player_idle_s');
    
    return sprite;
  }

  /**
   * Update player direction based on angle
   * Call this every frame or when direction changes
   */
  updatePlayerDirection(
    sprite: Phaser.GameObjects.Sprite, 
    angleDegrees: number,
    isMoving: boolean = false
  ): void {
    const direction = DirectionalSpriteLoader.angleToDirection(angleDegrees);
    const animKey = this.getAnimationKey(direction, isMoving);
    
    // Only change animation if it's different
    if (sprite.anims.currentAnim?.key !== animKey) {
      sprite.play(animKey);
    }
    
    // IMPORTANT: No rotation! The sprite faces the direction via frame
    sprite.setRotation(0);
  }
}

// Export singleton-like helpers
export function getDirectionFromAngle(angle: number): Direction {
  return DirectionalSpriteLoader.angleToDirection(angle);
}

export function getDirectionFromVelocity(vx: number, vy: number): Direction {
  return DirectionalSpriteLoader.velocityToDirection(vx, vy);
}
