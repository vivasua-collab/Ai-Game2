// Тестируем API напрямую
const baseUrl = 'http://localhost:3000';

async function testApi(url, label) {
  console.log(`\n=== Testing ${label} ===`);
  console.log('URL:', url);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));
    
    const text = await res.text();
    console.log('Response length:', text.length);
    
    // Попробуем распарсить
    try {
      const json = JSON.parse(text);
      console.log('JSON parse: SUCCESS');
      console.log('Success:', json.success);
      if (json.npcs) console.log('NPCs count:', json.npcs.length);
      if (json.presets) console.log('Presets:', Object.keys(json.presets));
    } catch (parseError) {
      console.log('JSON parse: FAILED');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.log('Error:', error.name, error.message);
  }
}

async function main() {
  // Test all 3 API calls from loadAllNPCs
  await testApi(`${baseUrl}/api/generator/npc?action=list&limit=10`, 'generator/npc list');
  await testApi(`${baseUrl}/api/npc/spawn?action=presets`, 'npc/spawn presets');
  await testApi(`${baseUrl}/api/npc/spawn?action=list&sessionId=test`, 'npc/spawn list');
}

main().catch(console.error);
