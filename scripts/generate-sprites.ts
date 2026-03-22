/**
 * Sprite Generation Script
 * Generates high-quality environment sprites using AI
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './public/sprites/environment';

// Sprites to generate
const SPRITES = {
  trees: [
    {
      name: 'tree_oak',
      prompt: 'Game sprite of a majestic oak tree, top-down view, lush green foliage, brown trunk, stylized game art, fantasy style, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'tree_pine',
      prompt: 'Game sprite of a pine tree, top-down view, dark green needle foliage, conical shape, stylized game art, fantasy style, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'tree_bamboo',
      prompt: 'Game sprite of bamboo grove, top-down view, green bamboo stalks with leaves, Asian fantasy style, stylized game art, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'tree_cherry_blossom',
      prompt: 'Game sprite of cherry blossom tree, top-down view, pink flowers, green leaves, Asian fantasy style, beautiful sakura, stylized game art, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'tree_willow',
      prompt: 'Game sprite of willow tree, top-down view, drooping branches with green leaves, fantasy style, stylized game art, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'tree_dead',
      prompt: 'Game sprite of dead tree, top-down view, bare branches, brown gray color, spooky atmosphere, stylized game art, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
  ],
  rocks: [
    {
      name: 'rock_small',
      prompt: 'Game sprite of a small rock, top-down view, gray stone, rough texture, natural shape, stylized game art, fantasy style, transparent background, clean edges, 64x64 pixels, high quality game asset',
    },
    {
      name: 'rock_medium',
      prompt: 'Game sprite of a medium rock boulder, top-down view, gray stone with moss patches, rough texture, natural shape, stylized game art, fantasy style, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
    {
      name: 'rock_large',
      prompt: 'Game sprite of a large rock boulder, top-down view, dark gray stone, cracks and crevices, rough texture, stylized game art, fantasy style, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
    {
      name: 'rock_mountain',
      prompt: 'Game sprite of mountain rocks, top-down view, jagged peaks, gray and brown stones, rough terrain, stylized game art, fantasy style, transparent background, clean edges, 128x128 pixels, high quality game asset',
    },
  ],
  ores: [
    {
      name: 'ore_iron',
      prompt: 'Game sprite of iron ore rock, top-down view, gray stone with metallic silver veins, mining node, glowing crystals, stylized game art, fantasy style, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
    {
      name: 'ore_copper',
      prompt: 'Game sprite of copper ore rock, top-down view, brown stone with copper orange veins, mining node, metallic shine, stylized game art, fantasy style, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
    {
      name: 'ore_gold',
      prompt: 'Game sprite of gold ore rock, top-down view, gray stone with golden veins, mining node, sparkling gold, stylized game art, fantasy style, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
    {
      name: 'ore_spirit',
      prompt: 'Game sprite of spirit stone ore, top-down view, dark stone with glowing cyan crystals, magical energy, cultivation game, stylized game art, fantasy style, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
    {
      name: 'ore_jade',
      prompt: 'Game sprite of jade ore rock, top-down view, gray stone with green jade deposits, precious gem, Asian fantasy, stylized game art, transparent background, clean edges, 96x96 pixels, high quality game asset',
    },
  ],
};

async function generateSprite(zai: any, prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);
    
    return true;
  } catch (error) {
    console.error(`Failed to generate: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🎨 Starting sprite generation...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Initialize ZAI
  const zai = await ZAI.create();
  
  let total = 0;
  let success = 0;

  // Generate all sprites
  for (const [category, sprites] of Object.entries(SPRITES)) {
    console.log(`\n📁 Generating ${category}...`);
    
    for (const sprite of sprites) {
      total++;
      const outputPath = path.join(OUTPUT_DIR, `${sprite.name}.png`);
      
      // Skip if already exists
      if (fs.existsSync(outputPath)) {
        console.log(`  ✓ ${sprite.name} (cached)`);
        success++;
        continue;
      }
      
      process.stdout.write(`  ⏳ Generating ${sprite.name}...`);
      
      const result = await generateSprite(zai, sprite.prompt, outputPath);
      
      if (result) {
        console.log(' ✓');
        success++;
      } else {
        console.log(' ✗');
      }
      
      // Small delay between generations
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n✅ Complete: ${success}/${total} sprites generated`);
  
  // List generated files
  console.log('\n📋 Generated files:');
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
}

main().catch(console.error);
