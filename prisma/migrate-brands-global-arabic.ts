import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { ARABIC_BRAND_NAMES } from './brands-arabic-dictionary';

async function main() {
  console.log('========================================================================');
  console.log('🚀 DATABASE MIGRATION: CONVERT BRANDS TO GLOBAL TABLE & ADD ARABIC NAMES');
  console.log('========================================================================');

  // 1. Alter PostgreSQL Table: Drop tenant_id & indexes, add name_ar & global indexes
  console.log('\n🔧 Step 1: Executing PostgreSQL DDL schema alterations...');

  // A. Drop tenant-specific indexes
  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS public.uq_brands_tenant_name;
  `);
  console.log('  ✔ Dropped index "uq_brands_tenant_name"');

  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS public.idx_brands_tenant_id;
  `);
  console.log('  ✔ Dropped index "idx_brands_tenant_id"');

  // B. Add name_ar column
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS name_ar VARCHAR(120);
  `);
  console.log('  ✔ Added column "name_ar VARCHAR(120)"');

  // C. Drop tenant_id column
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.brands DROP COLUMN IF EXISTS tenant_id;
  `);
  console.log('  ✔ Dropped column "tenant_id" (table is now GLOBAL)');

  // D. Create global unique index on name & index on code
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_name ON public.brands (name);
  `);
  console.log('  ✔ Created global unique index "uq_brands_name" ON brands(name)');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_brands_code ON public.brands (code);
  `);
  console.log('  ✔ Created index "idx_brands_code" ON brands(code)');

  // 2. Query all existing brands from the global table
  console.log('\n📋 Step 2: Fetching all brands for Arabic name population...');
  const allBrands = await prisma.brands.findMany({
    select: { id: true, name: true, name_ar: true },
  });
  console.log(`  Found ${allBrands.length} brands in the database.`);

  // 3. Update each brand with its Arabic name
  console.log('\n🌐 Step 3: Populating authentic Arabic names (name_ar)...');
  let updatedCount = 0;
  let exactMatchCount = 0;
  const CHUNK_SIZE = 100;

  for (let i = 0; i < allBrands.length; i += CHUNK_SIZE) {
    const chunk = allBrands.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(
      chunk.map(async (b) => {
        const key = b.name.trim().toLowerCase();
        let arabicName = ARABIC_BRAND_NAMES[key];

        if (arabicName) {
          exactMatchCount++;
        } else {
          // If no exact match, strip parentheses/suffixes or use clean name
          const baseKey = key.split('(')[0].trim();
          arabicName = ARABIC_BRAND_NAMES[baseKey] || b.name;
        }

        await prisma.brands.update({
          where: { id: b.id },
          data: { name_ar: arabicName },
        });
        updatedCount++;
      })
    );

    console.log(`  Processed ${Math.min(i + CHUNK_SIZE, allBrands.length)}/${allBrands.length} brands...`);
  }

  console.log(`\n  ✔ Finished updating ${updatedCount} brands.`);
  console.log(`  ✔ Exact dictionary matches: ${exactMatchCount}`);

  // 4. Verify database state
  console.log('\n🔍 Step 4: Verifying PostgreSQL table schema...');
  const columns: any = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands'
    ORDER BY ordinal_position;
  `;
  console.log('  Current table "brands" columns:');
  console.table(columns);

  const populatedCount = await prisma.brands.count({
    where: { name_ar: { not: null } },
  });
  console.log(`  Brands with name_ar populated: ${populatedCount} / ${allBrands.length}`);

  // 5. Display sample records with English + Arabic names
  console.log('\n✨ Step 5: Sample Global Brands with Arabic Names:');
  const samples = await prisma.brands.findMany({
    take: 15,
    orderBy: { created_at: 'desc' },
    select: {
      name: true,
      name_ar: true,
      code: true,
      description: true,
    },
  });
  console.table(samples);

  console.log('\n========================================================================');
  console.log('🎉 SUCCESS: Brands table is now Global and enriched with Arabic names!');
  console.log('========================================================================');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
