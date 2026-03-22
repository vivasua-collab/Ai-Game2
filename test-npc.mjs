import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'presets');

async function test() {
  const npcs = [];
  const presetDir = path.join(DATA_DIR, 'npcs', 'preset');
  
  console.log('Loading from:', presetDir);
  
  const entries = await fs.readdir(presetDir, { withFileTypes: true });
  console.log('Files:', entries.map(e => e.name));
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const filePath = path.join(presetDir, entry.name);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      console.log('File:', entry.name, 'NPCs:', data.npcs?.length);
      
      if (data.npcs) {
        npcs.push(...data.npcs);
      }
    }
  }
  
  console.log('Total NPCs:', npcs.length);
  
  // Фильтрация по категории
  const storyNpcs = npcs.filter(npc => npc.category === 'story');
  console.log('Story NPCs:', storyNpcs.length);
  
  // Первые 3
  console.log('First 3:', npcs.slice(0, 3).map(n => ({ id: n.id, category: n.category })));
}

test().catch(console.error);
