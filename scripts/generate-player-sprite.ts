/**
 * Генератор спрайтов игрока для Cultivation World Simulator
 * Стиль: Аниме/Манга
 * Направления: 8 (N, NE, E, SE, S, SW, W, NW)
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './public/sprites/player';

// Поддерживаемые размеры
type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440';

interface SpriteConfig {
  name: string;
  prompt: string;
  size: ImageSize;
  filename: string;
}

// Базовый промпт для культиватора
const BASE_CULTIVATOR_PROMPT = `
anime manga style character sprite sheet, young male cultivator in traditional Chinese robes,
flowing white and light blue cultivation robes with subtle golden embroidery,
long dark hair tied in a traditional topknot with a simple hairpin,
determined but calm expression, lean athletic build,
martial artist pose, xianxia cultivation game style,
clean cel-shading, crisp lines, vibrant colors,
transparent background, sprite sheet format,
high quality anime art, detailed character design
`;

// Направления движения
const DIRECTIONS = {
  N: 'facing away from viewer, back view',
  NE: 'facing diagonally upper right, 45 degree angle',
  E: 'facing right, side profile',
  SE: 'facing diagonally lower right, 45 degree angle',
  S: 'facing towards viewer, front view',
  SW: 'facing diagonally lower left, 45 degree angle',
  W: 'facing left, side profile',
  NW: 'facing diagonally upper left, 45 degree angle',
};

// Эффекты уровня культивации
const CULTIVATION_LEVELS = {
  1: { name: 'Awakened Core', color: 'pale white', glow: 'faint white aura' },
  2: { name: 'Life Flow', color: 'light green', glow: 'soft green energy wisps' },
  3: { name: 'Inner Fire', color: 'orange', glow: 'warm orange flames' },
  4: { name: 'Body Spirit Union', color: 'blue', glow: 'flowing blue energy' },
  5: { name: 'Heaven Heart', color: 'purple', glow: 'purple lightning sparks' },
  6: { name: 'Veil Break', color: 'silver', glow: 'silver spatial distortion' },
  7: { name: 'Eternal Ring', color: 'gold', glow: 'golden halo ring' },
  8: { name: 'Heaven Voice', color: 'white-gold', glow: 'radiant white-gold aura' },
  9: { name: 'Immortal Core', color: 'rainbow', glow: 'rainbow celestial energy' },
};

// Анимации
const ANIMATIONS = {
  idle: 'standing still, calm breathing pose, subtle energy fluctuation',
  walk: 'walking animation, mid-stride, dynamic movement pose',
  attack: 'martial arts attack pose, extended arm strike, combat stance',
  meditate: 'floating meditation pose, crossed legs, eyes closed, serene expression',
};

async function generateImage(zai: any, prompt: string, size: ImageSize, outputPath: string) {
  console.log(`Generating: ${outputPath}`);
  console.log(`Prompt: ${prompt.substring(0, 100)}...`);
  
  const response = await zai.images.generations.create({
    prompt: prompt,
    size: size,
  });

  const imageBase64 = response.data[0].base64;
  const buffer = Buffer.from(imageBase64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✓ Saved: ${outputPath} (${buffer.length} bytes)`);
  return outputPath;
}

async function generatePlayerSprites() {
  console.log('=== Generating Player Sprites ===\n');
  
  // Инициализация
  const zai = await ZAI.create();
  
  // Создаём директории
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: string[] = [];

  // ========================================
  // 1. Генерация базового спрайт-листа (все 8 направлений)
  // ========================================
  
  console.log('\n--- Generating Directional Sprite Sheet ---\n');
  
  const spriteSheetPrompt = `
anime manga style game sprite sheet, 
young male cultivator character in traditional Chinese cultivation robes,
8 directional movement sprites arranged in a grid,
top row: facing up-right, right, down-right, down,
bottom row: facing down-left, left, up-left, up,
each sprite shows walking animation frame,
white and light blue flowing robes with golden embroidery,
long dark hair in topknot,
martial artist stance,
clean cel-shaded anime style,
transparent background,
consistent character design across all sprites,
game asset quality,
high detail anime art style
`;

  const spriteSheetPath = path.join(OUTPUT_DIR, 'player-directions.png');
  await generateImage(zai, spriteSheetPrompt, '1344x768', spriteSheetPath);
  results.push(spriteSheetPath);

  // ========================================
  // 2. Генерация спрайтов для разных уровней культивации
  // ========================================
  
  console.log('\n--- Generating Cultivation Level Effects ---\n');
  
  // Генерируем только ключевые уровни для экономии
  const keyLevels = [1, 3, 5, 7, 9] as const;
  
  for (const level of keyLevels) {
    const levelConfig = CULTIVATION_LEVELS[level];
    
    const levelPrompt = `
anime manga style character portrait,
young male cultivator in traditional Chinese robes,
cultivation level ${level} - ${levelConfig.name},
${levelConfig.glow} surrounding the character,
${levelConfig.color} energy flowing around body,
intense spiritual power visualization,
dramatic lighting from ${levelConfig.color} energy source,
white and blue robes fluttering from energy,
determined expression with glowing eyes,
high quality anime art,
dark background for contrast,
full body portrait,
xianxia cultivation game style
`;

    const levelPath = path.join(OUTPUT_DIR, `player-level-${level}.png`);
    await generateImage(zai, levelPrompt, '768x1344', levelPath);
    results.push(levelPath);
  }

  // ========================================
  // 3. Генерация эффектов Ци
  // ========================================
  
  console.log('\n--- Generating Qi Effects ---\n');
  
  const effectsDir = './public/sprites/effects';
  if (!fs.existsSync(effectsDir)) {
    fs.mkdirSync(effectsDir, { recursive: true });
  }

  // Свечение Ци
  const qiGlowPrompt = `
magical energy aura effect for game sprite,
concentric rings of glowing cyan and white energy,
soft ethereal glow, particle effects,
transparent center for character placement,
layered energy waves,
anime game special effect style,
transparent background PNG,
high quality particle effect,
spiritual cultivation energy visualization
`;

  const qiGlowPath = path.join(effectsDir, 'qi-glow.png');
  await generateImage(zai, qiGlowPrompt, '1024x1024', qiGlowPath);
  results.push(qiGlowPath);

  // Эффект прорыва
  const breakthroughPrompt = `
dramatic cultivation breakthrough effect,
explosive golden and white energy burst,
pillar of light shooting upward,
surging spiritual power visualization,
anime special effect,
dramatic lighting, particle explosion,
transparent background PNG,
xianxia cultivation game effect,
high quality cinematic effect
`;

  const breakthroughPath = path.join(effectsDir, 'breakthrough-effect.png');
  await generateImage(zai, breakthroughPrompt, '768x1344', breakthroughPath);
  results.push(breakthroughPath);

  // Эффект медитации
  const meditationPrompt = `
meditation energy field effect,
soft cyan lotus flower energy pattern,
floating spiritual particles,
calm peaceful aura glow,
concentric energy circles on ground,
anime game effect style,
transparent background PNG,
cultivation meditation visualization,
high quality special effect
`;

  const meditationPath = path.join(effectsDir, 'meditation-effect.png');
  await generateImage(zai, meditationPrompt, '1024x1024', meditationPath);
  results.push(meditationPath);

  // ========================================
  // 4. Генерация анимаций покоя и движения
  // ========================================
  
  console.log('\n--- Generating Animation Frames ---\n');

  // Idle анимация (4 кадра)
  const idlePrompt = `
anime manga style sprite sheet,
cultivator character idle animation,
4 frames horizontal sequence,
subtle breathing animation,
slight body movement,
white and blue robes,
traditional Chinese cultivation attire,
consistent character design,
transparent background,
game sprite animation frames,
clean anime style
`;

  const idlePath = path.join(OUTPUT_DIR, 'player-idle-frames.png');
  await generateImage(zai, idlePrompt, '1024x1024', idlePath);
  results.push(idlePath);

  // Walk анимация (4 кадра, боковой вид)
  const walkPrompt = `
anime manga style sprite sheet,
cultivator character walking animation side view,
4 frames horizontal sequence,
complete walking cycle,
dynamic leg and arm movement,
flowing robes in motion,
white and blue Chinese cultivation robes,
consistent character design,
transparent background,
game sprite animation frames,
clean anime style
`;

  const walkPath = path.join(OUTPUT_DIR, 'player-walk-frames.png');
  await generateImage(zai, walkPrompt, '1024x1024', walkPath);
  results.push(walkPath);

  // ========================================
  // Итоговый отчёт
  // ========================================
  
  console.log('\n=== Generation Complete ===\n');
  console.log('Generated files:');
  results.forEach(r => console.log(`  ✓ ${r}`));
  
  return results;
}

// Запуск
generatePlayerSprites()
  .then(() => {
    console.log('\n✓ All sprites generated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Generation failed:', error);
    process.exit(1);
  });
