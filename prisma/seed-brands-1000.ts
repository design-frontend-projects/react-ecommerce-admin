import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { BRANDS_DATA } from './seed-brands-mena';
import { GLOBAL_BRANDS_DATA } from './seed-brands-global-tech';
import { GLOBAL_FMCG_DATA } from './seed-brands-global-fmcg';
import { GLOBAL_FASHION_DATA } from './seed-brands-global-fashion';
import { GLOBAL_MORE_DATA } from './seed-brands-global-more';
import { EXTRA_BRANDS_DATA } from './seed-brands-extra';
import { ARABIC_BRAND_NAMES } from './brands-arabic-dictionary';

interface BrandSeedItem {
  name: string;
  code: string;
  description: string;
  category: string;
  region: 'Middle East' | 'Worldwide';
  domain?: string;
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 POSTGRESQL EXPERT SEED SCRIPT: 1,000+ GLOBAL BRANDS INGESTION');
  console.log('========================================================================');

  // Administrator user id for auditing
  const adminUserId = 'bc847d0b-e5d2-4ec9-ad2a-6b30303ec5e4';

  // 1. Ensure global database indexes
  console.log('\n🔧 Ensuring PostgreSQL global indexes on "brands" table...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_name 
      ON public.brands (name);
    `);
    console.log('  ✔ Global Unique Index "uq_brands_name" ensured (name)');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_brands_code 
      ON public.brands (code);
    `);
    console.log('  ✔ Index "idx_brands_code" ensured (code)');
  } catch (err) {
    console.warn('  ⚠️ Note during index creation:', (err as Error).message);
  }

  // 2. Assemble and deduplicate brand datasets
  const rawDatasets: BrandSeedItem[][] = [
    BRANDS_DATA,
    GLOBAL_BRANDS_DATA,
    GLOBAL_FMCG_DATA,
    GLOBAL_FASHION_DATA,
    GLOBAL_MORE_DATA,
    EXTRA_BRANDS_DATA,
  ];

  const brandMap = new Map<string, BrandSeedItem>();
  const codeSet = new Set<string>();

  for (const dataset of rawDatasets) {
    for (const item of dataset) {
      const trimmedName = item.name.trim();
      const normalizedKey = trimmedName.toLowerCase();
      if (!brandMap.has(normalizedKey)) {
        // Ensure code uniqueness
        let code = item.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30);
        if (codeSet.has(code)) {
          let suffix = 2;
          while (codeSet.has(`${code.slice(0, 26)}_${suffix}`)) {
            suffix++;
          }
          code = `${code.slice(0, 26)}_${suffix}`;
        }
        codeSet.add(code);

        brandMap.set(normalizedKey, {
          ...item,
          name: trimmedName,
          code,
        });
      }
    }
  }

  const allBrands = Array.from(brandMap.values());
  console.log(`\n📊 Curated Distinct Brands in Dataset: ${allBrands.length}`);

  const menaCount = allBrands.filter((b) => b.region === 'Middle East').length;
  const globalCount = allBrands.filter((b) => b.region === 'Worldwide').length;
  console.log(`  - Middle East & Regional Leaders: ${menaCount}`);
  console.log(`  - Worldwide & Global Giants:     ${globalCount}`);

  // 3. Fetch existing global brands
  const existingBrands = await prisma.brands.findMany({
    select: { name: true },
  });
  const existingNamesSet = new Set(existingBrands.map((b) => b.name.toLowerCase()));
  console.log(`\nExisting brands in DB: ${existingBrands.length}`);

  // 4. Filter out already-existing brands
  const brandsToInsert = allBrands.filter(
    (b) => !existingNamesSet.has(b.name.toLowerCase())
  );

  console.log(`New brands ready for batch insertion: ${brandsToInsert.length}`);

  // 5. Perform batch insertion in chunks of 200
  const CHUNK_SIZE = 200;
  let totalInserted = 0;

  if (brandsToInsert.length > 0) {
    console.log('\n⚡ Executing batch insertion in PostgreSQL...');
    for (let i = 0; i < brandsToInsert.length; i += CHUNK_SIZE) {
      const chunk = brandsToInsert.slice(i, i + CHUNK_SIZE);
      const records = chunk.map((brand) => {
        const key = brand.name.trim().toLowerCase();
        const baseKey = key.split('(')[0].trim();
        const arabicName = ARABIC_BRAND_NAMES[key] || ARABIC_BRAND_NAMES[baseKey] || brand.name;

        return {
          name: brand.name.slice(0, 120),
          name_ar: arabicName.slice(0, 120),
          code: brand.code.slice(0, 30),
          logo_url: brand.domain ? `https://logo.clearbit.com/${brand.domain}` : null,
          description: brand.description ? brand.description.slice(0, 500) : null,
          is_active: true,
          created_by_user_id: adminUserId,
          updated_by_user_id: adminUserId,
        };
      });

      const result = await prisma.brands.createMany({
        data: records,
        skipDuplicates: true,
      });

      totalInserted += result.count;
      console.log(`  Inserted batch ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(brandsToInsert.length / CHUNK_SIZE)}: +${result.count} records (Running total: ${totalInserted})`);
    }
  }

  // 6. Verify final count in the PostgreSQL database
  const finalBrandCount = await prisma.brands.count();

  console.log('\n========================================================================');
  console.log(`🎉 SUCCESS: Global Brands Ingestion Complete!`);
  console.log(`📌 Total brands in global table "brands": ${finalBrandCount}`);
  console.log('========================================================================');
}

main()
  .catch((err) => {
    console.error('❌ Error executing brand seed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

