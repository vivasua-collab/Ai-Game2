#!/usr/bin/env node
/**
 * Тест AI tick для диагностики NPC
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SESSION_ID = 'cmn5s3fco0002p7zwk4zqd14n';
const LOCATION_ID = 'training_ground';

async function main() {
  console.log('=== AI Tick Diagnostic Test ===\n');
  
  // 1. Проверяем temp-npc API
  console.log('1. Checking /api/temp-npc...');
  const tempNpcUrl = `${BASE_URL}/api/temp-npc?action=list&sessionId=${SESSION_ID}&locationId=${LOCATION_ID}`;
  console.log(`   URL: ${tempNpcUrl}`);
  
  const tempNpcRes = await fetch(tempNpcUrl);
  const tempNpcData = await tempNpcRes.json();
  console.log(`   Success: ${tempNpcData.success}`);
  console.log(`   NPCs count: ${tempNpcData.total}`);
  if (tempNpcData.npcs && tempNpcData.npcs.length > 0) {
    console.log(`   First NPC: ${tempNpcData.npcs[0].name} at (${tempNpcData.npcs[0].position?.x}, ${tempNpcData.npcs[0].position?.y})`);
  }
  console.log('');
  
  // 2. Проверяем AI tick
  console.log('2. Testing /api/ai/tick...');
  const tickUrl = `${BASE_URL}/api/ai/tick`;
  console.log(`   URL: ${tickUrl}`);
  
  const tickRes = await fetch(tickUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      locationId: LOCATION_ID,
      playerX: 800,
      playerY: 600,
    }),
  });
  
  const tickData = await tickRes.json();
  console.log(`   Success: ${tickData.success}`);
  console.log(`   Total NPCs: ${tickData.stats?.totalNPCs}`);
  console.log(`   Active NPCs: ${tickData.stats?.activeNPCs}`);
  console.log(`   Processed NPCs: ${tickData.processedNPCs}`);
  console.log(`   Tick: ${tickData.tick}`);
  console.log('');
  
  // 3. Проверяем AI events
  console.log('3. Checking /api/ai/events...');
  const eventsUrl = `${BASE_URL}/api/ai/events?sessionId=${SESSION_ID}`;
  console.log(`   URL: ${eventsUrl}`);
  
  const eventsRes = await fetch(eventsUrl);
  const eventsData = await eventsRes.json();
  console.log(`   Success: ${eventsData.success}`);
  console.log(`   Events count: ${eventsData.events?.length || 0}`);
  if (eventsData.events && eventsData.events.length > 0) {
    console.log(`   Event types: ${eventsData.events.map(e => e.event || e.type).join(', ')}`);
  }
  console.log('');
  
  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Temp NPCs: ${tempNpcData.total}`);
  console.log(`AI NPCs loaded: ${tickData.stats?.totalNPCs}`);
  console.log(`AI Events: ${eventsData.events?.length || 0}`);
  
  if (tickData.stats?.totalNPCs === 0 && tempNpcData.total > 0) {
    console.log('\n⚠️  PROBLEM: NPCs exist in temp-npc but NOT loaded in AI!');
    console.log('   This means loadNPCsToWorldManager() is not working correctly.');
  }
}

main().catch(console.error);
