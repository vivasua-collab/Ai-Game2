// Init environment script
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const envContent = 'DATABASE_URL=file:/home/z/my-project/db/custom.db\n';

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('[init-env] Created .env file');
} else {
  console.log('[init-env] .env already exists');
}
