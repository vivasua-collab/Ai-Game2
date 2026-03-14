/**
 * Очистка NPC из базы данных
 */

import { db } from '../src/lib/db';

async function main() {
  console.log('Очистка NPC из базы данных...');
  
  const result = await db.nPC.deleteMany({});
  
  console.log(`Удалено ${result.count} NPC`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
