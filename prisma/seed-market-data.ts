import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { MARKET_UOMS } from './data/market-uoms-data';
import { MIDDLE_EASTERN_CATEGORIES_DATA } from './data/middle-eastern-categories-data';
import { ARABIC_BRANDS_DATA } from './data/arabic-brands-data';

async function seedUoms() {
  console.log('\n========================================');
  console.log('1. SEEDING MARKET UNITS OF MEASURE (UOMs)');
  console.log('========================================');

  const existingUoms = await prisma.uoms.findMany({
    select: { code: true }
  });
  const existingCodes = new Set(existingUoms.map(u => u.code.toLowerCase().trim()));
  console.log(`Found ${existingCodes.size} existing UOMs in database.`);

  const toInsert = MARKET_UOMS.filter(u => !existingCodes.has(u.code.toLowerCase().trim()));
  console.log(`Preparing to insert ${toInsert.length} new market standard UOMs...`);

  if (toInsert.length > 0) {
    const result = await prisma.uoms.createMany({
      data: toInsert.map(u => ({
        code: u.code,
        name: u.name,
        uom_category: u.uom_category,
        is_base: u.is_base,
        is_active: true,
        tenant_id: null,
      })),
      skipDuplicates: true,
    });
    console.log(`✓ Inserted ${result.count} new market UOMs.`);
  } else {
    console.log('All market UOMs already exist in database.');
  }

  const totalUoms = await prisma.uoms.count();
  console.log(`Total UOMs in database now: ${totalUoms}`);
}

async function seedCategories() {
  console.log('\n========================================');
  console.log('2. SEEDING 500 MIDDLE EASTERN CATEGORIES');
  console.log('========================================');

  const existingCategories = await prisma.categories.findMany({
    select: { id: true, name: true }
  });
  const existingMap = new Map<string, string>();
  for (const c of existingCategories) {
    existingMap.set(c.name.toLowerCase().trim(), c.id);
  }
  console.log(`Found ${existingMap.size} existing categories in database.`);

  let insertedParents = 0;
  let insertedSubs = 0;

  // Track parent IDs
  const parentIdMap = new Map<string, string>();

  // Pass 1: Ensure all parent categories exist
  console.log(`Processing ${MIDDLE_EASTERN_CATEGORIES_DATA.length} top-level parent categories...`);
  for (const parent of MIDDLE_EASTERN_CATEGORIES_DATA) {
    const normName = parent.name.toLowerCase().trim();
    let parentId = existingMap.get(normName);

    if (!parentId) {
      const created = await prisma.categories.create({
        data: {
          name: parent.name,
          name_ar: parent.name_ar,
          description: parent.description,
          parent_id: null,
          tenant_id: null,
          is_active: true,
        },
      });
      parentId = created.id;
      existingMap.set(normName, parentId);
      insertedParents++;
    }

    parentIdMap.set(parent.name, parentId);
  }

  console.log(`Parent categories ready: ${insertedParents} newly created, ${parentIdMap.size} total active parents.`);

  // Pass 2: Insert subcategories referencing their respective parent
  console.log('Processing subcategories for each parent category...');
  const subCategoriesToInsert: {
    name: string;
    name_ar: string;
    description: string;
    parent_id: string;
    tenant_id: string | null;
    is_active: boolean;
  }[] = [];

  for (const parent of MIDDLE_EASTERN_CATEGORIES_DATA) {
    const parentId = parentIdMap.get(parent.name);
    if (!parentId) continue;

    for (const sub of parent.subcategories) {
      const normSub = sub.name.toLowerCase().trim();
      if (!existingMap.has(normSub)) {
        subCategoriesToInsert.push({
          name: sub.name,
          name_ar: sub.name_ar,
          description: sub.description,
          parent_id: parentId,
          tenant_id: null,
          is_active: true,
        });
        existingMap.set(normSub, 'pending');
      }
    }
  }

  console.log(`Found ${subCategoriesToInsert.length} subcategories to insert in batch.`);

  // Batch insert subcategories in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < subCategoriesToInsert.length; i += chunkSize) {
    const chunk = subCategoriesToInsert.slice(i, i + chunkSize);
    const res = await prisma.categories.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedSubs += res.count;
    console.log(` - Inserted subcategories batch ${Math.floor(i / chunkSize) + 1} (${res.count} records)`);
  }

  console.log(`✓ Categories Seeding Complete: ${insertedParents} parents created, ${insertedSubs} subcategories created.`);
  const totalCategories = await prisma.categories.count();
  console.log(`Total Categories in database now: ${totalCategories}`);
}

async function seedBrands() {
  console.log('\n========================================');
  console.log('3. SEEDING 1,000 ARABIC & MIDDLE EASTERN BRANDS');
  console.log('========================================');

  const existingBrands = await prisma.brands.findMany({
    select: { name: true, code: true }
  });
  const existingNames = new Set(existingBrands.map(b => b.name.toLowerCase().trim()));
  const existingCodes = new Set(existingBrands.map(b => (b.code || '').toUpperCase().trim()));

  console.log(`Loaded ${existingNames.size} existing brands from database.`);

  const toInsert = ARABIC_BRANDS_DATA.filter(b => {
    const normName = b.name.toLowerCase().trim();
    const normCode = b.code.toUpperCase().trim();
    return !existingNames.has(normName) && !existingCodes.has(normCode);
  });

  console.log(`Filtered candidates: ${toInsert.length} brands ready for insertion.`);

  let insertedCount = 0;
  const chunkSize = 150;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const result = await prisma.brands.createMany({
      data: chunk.map(b => ({
        name: b.name,
        name_ar: b.name_ar,
        code: b.code,
        description: b.description,
        is_active: true,
      })),
      skipDuplicates: true,
    });
    insertedCount += result.count;
    console.log(` - Inserted brands batch ${Math.floor(i / chunkSize) + 1} (${result.count} records)`);
  }

  console.log(`✓ Brands Seeding Complete: ${insertedCount} new brands inserted.`);
  const totalBrands = await prisma.brands.count();
  console.log(`Total Brands in database now: ${totalBrands}`);
}

async function main() {
  console.log('STARTING MASTER SEEDING PIPELINE...');
  const startTime = Date.now();

  await seedUoms();
  await seedCategories();
  await seedBrands();

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n========================================`);
  console.log(`ALL SEEDING COMPLETED SUCCESSFULLY IN ${elapsedSec}s!`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error('Seeding execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
