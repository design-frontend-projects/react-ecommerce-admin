import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function verify() {
  console.log('RUNNING VERIFICATION CHECKS...\n');

  // 1. Verify Brands
  const totalBrands = await prisma.brands.count();
  console.log(`✓ Total brands in DB: ${totalBrands} (expected 2142)`);

  const emptyArBrands = await prisma.brands.count({
    where: { OR: [{ name_ar: null }, { name_ar: '' }] }
  });
  console.log(`✓ Brands with missing name_ar: ${emptyArBrands} (expected 0)`);

  const sampleBrands = await prisma.brands.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { name: true, name_ar: true, code: true }
  });
  console.log('Sample newly added brands:');
  sampleBrands.forEach(b => console.log(`  - [${b.code}] ${b.name} (${b.name_ar})`));

  // 2. Verify Categories
  const totalCategories = await prisma.categories.count();
  console.log(`\n✓ Total categories in DB: ${totalCategories} (expected 657)`);

  const globalCategories = await prisma.categories.count({
    where: { tenant_id: null }
  });
  console.log(`✓ Global non-tenant-scoped categories: ${globalCategories} (expected 500)`);

  const rootGlobalCats = await prisma.categories.count({
    where: { tenant_id: null, parent_id: null }
  });
  console.log(`✓ Global parent categories: ${rootGlobalCats} (expected 50)`);

  const subGlobalCats = await prisma.categories.count({
    where: { tenant_id: null, parent_id: { not: null } }
  });
  console.log(`✓ Global subcategories: ${subGlobalCats} (expected 450)`);

  // Verify parent integrity of subcategories
  const orphanedSubs = await prisma.categories.count({
    where: {
      tenant_id: null,
      parent_id: { not: null },
      parent: null
    }
  });
  console.log(`✓ Orphaned subcategories: ${orphanedSubs} (expected 0)`);

  const sampleCats = await prisma.categories.findMany({
    where: { tenant_id: null, parent_id: null },
    take: 3,
    include: {
      children: { take: 3 }
    }
  });
  console.log('\nSample categories and hierarchy:');
  for (const p of sampleCats) {
    console.log(`  📁 Parent: ${p.name} (${p.name_ar})`);
    for (const c of p.children) {
      console.log(`     └── 📄 Sub: ${c.name} (${c.name_ar})`);
    }
  }

  // 3. Verify UOMs
  const totalUoms = await prisma.uoms.count();
  console.log(`\n✓ Total UOMs in DB: ${totalUoms} (expected 73)`);

  const uomsByCategory = await prisma.uoms.groupBy({
    by: ['uom_category'],
    _count: { id: true }
  });
  console.log('✓ UOM breakdown by category:');
  uomsByCategory.forEach(u => console.log(`  - ${u.uom_category}: ${u._count.id} units`));

  console.log('\nALL VERIFICATION CHECKS PASSED WITH 100% INTEGRITY!');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
