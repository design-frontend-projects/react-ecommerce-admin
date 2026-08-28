import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../src/lib/prisma';

async function runMigration() {
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260828150000_create_global_product_types',
    'migration.sql'
  );

  console.log(`Reading migration from: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration SQL...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Migration SQL executed successfully!');

  // Verify rows in product_types
  const productTypes = await prisma.product_types.findMany();
  console.log(`Verified ${productTypes.length} records in product_types table:`);
  for (const pt of productTypes) {
    console.log(` - [${pt.code}] ${pt.name} (${pt.name_ar}) - ${pt.description}`);
  }
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
