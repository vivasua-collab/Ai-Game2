// Имитация вызова spawnPresetNPCs
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'presets');

async function loadPresetNPCs() {
  const npcs = [];
  const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
  
  try {
    const entries = await fs.readdir(presetDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(presetDir, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        if (data.npcs && Array.isArray(data.npcs)) {
          npcs.push(...data.npcs);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
  
  return npcs;
}

async function spawnPresetNPCs(options) {
  const { category, limit, randomize } = options;
  
  let presetNPCs = await loadPresetNPCs();
  console.log('Loaded NPCs:', presetNPCs.length);
  
  // Фильтр по категории
  if (category) {
    presetNPCs = presetNPCs.filter(npc => npc.category === category);
    console.log('After category filter:', presetNPCs.length);
  }
  
  // Randomize
  if (randomize) {
    for (let i = presetNPCs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [presetNPCs[i], presetNPCs[j]] = [presetNPCs[j], presetNPCs[i]];
    }
  }
  
  // Limit
  if (limit) {
    presetNPCs = presetNPCs.slice(0, limit);
  }
  
  console.log('Final NPCs to spawn:', presetNPCs.length);
  console.log('NPCs:', presetNPCs.map(n => n.name));
  
  return presetNPCs;
}

async function spawnStoryNPCs(sessionId, locationId) {
  return spawnPresetNPCs({
    sessionId,
    locationId,
    category: 'story',
    limit: 5,
    randomize: true,
  });
}

// Test
spawnStoryNPCs('test-session', 'test-location')
  .then(npcs => console.log('SUCCESS:', npcs.length, 'NPCs'))
  .catch(e => console.error('ERROR:', e));
