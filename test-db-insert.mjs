import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  // Проверим существование локации
  const locations = await prisma.location.findMany({ take: 5 });
  console.log('Locations:', locations.length);
  if (locations.length > 0) {
    console.log('First location:', locations[0].id, locations[0].name);
  }
  
  // Проверим существование сессии
  const sessions = await prisma.gameSession.findMany({ take: 5 });
  console.log('Sessions:', sessions.length);
  if (sessions.length > 0) {
    console.log('First session:', sessions[0].id);
  }
  
  // Попробуем создать NPC
  const testSessionId = sessions[0]?.id || 'test-session';
  const testLocationId = locations[0]?.id || null;
  
  console.log('\nTrying to create NPC with:', { testSessionId, testLocationId });
  
  try {
    const npc = await prisma.nPC.create({
      data: {
        sessionId: testSessionId,
        isPreset: true,
        presetId: 'NPC_PRESET_TEST_001',
        name: 'Test NPC',
        title: 'Test Title',
        age: 25,
        backstory: 'Test backstory',
        cultivationLevel: 1,
        cultivationSubLevel: 0,
        coreCapacity: 1000,
        currentQi: 0,
        strength: 10,
        agility: 10,
        intelligence: 10,
        conductivity: 0.5,
        vitality: 10,
        personality: JSON.stringify({ traits: [], motivation: 'test' }),
        motivation: 'test',
        disposition: 0,
        relations: JSON.stringify({}),
        equipment: JSON.stringify({}),
        techniques: JSON.stringify([]),
        locationId: testLocationId,
      },
    });
    console.log('NPC created:', npc.id);
  } catch (error) {
    console.error('Error creating NPC:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
  }
  
  await prisma.$disconnect();
}

test();
