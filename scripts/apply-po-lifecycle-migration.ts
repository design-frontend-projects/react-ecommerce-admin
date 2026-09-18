import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../src/lib/prisma';

async function runMigration() {
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260918234500_purchase_order_lifecycle_rpcs',
    'migration.sql'
  );

  console.log(`Reading migration from: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration SQL to PostgreSQL...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Migration SQL executed successfully!');

  // Verify function in information_schema.routines
  const routines = await prisma.$queryRawUnsafe(`
    SELECT routine_name, routine_schema, data_type
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'set_purchase_order_status';
  `);
  console.log('Verified routine in database:', routines);

  // Send NOTIFY to PostgREST to reload schema
  await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema'`);
  console.log('PostgREST reload schema signal sent.');
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
