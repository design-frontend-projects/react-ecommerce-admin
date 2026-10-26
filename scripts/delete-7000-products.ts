import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ANSI color helpers for clean, readable CLI logs
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const BATCH_SIZE = 500;
const TARGET_DELETE_COUNT = 7000;

async function getExcludedProductIds(): Promise<Set<string>> {
  console.log(`${c.cyan}🔍 Checking for products with active transactions/history to exclude...${c.reset}`);

  // Query all product IDs that are referenced in transactional tables
  const rows: any = await prisma.$queryRaw`
    SELECT DISTINCT p.id
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    WHERE pv.id IN (
      SELECT product_variant_id FROM inventory_transaction_items WHERE product_variant_id IS NOT NULL
      UNION
      SELECT product_variant_id FROM goods_receipt_items WHERE product_variant_id IS NOT NULL
      UNION
      SELECT product_variant_id FROM purchase_order_items WHERE product_variant_id IS NOT NULL
      UNION
      SELECT product_variant_id FROM stock_transfer_items WHERE product_variant_id IS NOT NULL
      UNION
      SELECT product_variant_id FROM stock_reservations WHERE product_variant_id IS NOT NULL
    )
    OR p.created_at < '2026-09-23 00:00:00+00' -- Always preserve original test products
  `;

  const excluded = new Set<string>(rows.map((r: any) => r.id));
  console.log(`   Found ${c.yellow}${excluded.size}${c.reset} protected products (transactions or original test items).`);
  return excluded;
}

async function getDatabaseCounts() {
  const result: any = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*)::int FROM products) as "productsCount",
      (SELECT COUNT(*)::int FROM product_variants) as "variantsCount",
      (SELECT COUNT(*)::int FROM inventory) as "inventoryCount",
      (SELECT COUNT(*)::int FROM stock_balances) as "stockBalancesCount",
      (SELECT COUNT(*)::int FROM inventory_items) as "inventoryItemsCount",
      (SELECT COUNT(*)::int FROM price_list_items) as "priceListItemsCount";
  `;

  return result[0];
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  const isDryRun = process.argv.includes('--dry-run') || !isExecute;

  console.log('\n' + '='.repeat(70));
  console.log(`${c.bright}${c.cyan}SUPABASE / POSTGRESQL PRODUCT PURGE TOOL${c.reset}`);
  console.log(`Mode: ${isExecute ? `${c.red}EXECUTE (LIVE DATA DELETION)${c.reset}` : `${c.yellow}DRY-RUN (SIMULATION ONLY)${c.reset}`}`);
  console.log('='.repeat(70));

  // 1. Initial State
  const initialCounts = await getDatabaseCounts();
  console.log(`\n${c.bright}📊 CURRENT DATABASE STATE:${c.reset}`);
  console.log(`   - Products:           ${initialCounts.productsCount.toLocaleString()}`);
  console.log(`   - Product Variants:   ${initialCounts.variantsCount.toLocaleString()}`);
  console.log(`   - Inventory:          ${initialCounts.inventoryCount.toLocaleString()}`);
  console.log(`   - Stock Balances:     ${initialCounts.stockBalancesCount.toLocaleString()}`);
  console.log(`   - Inventory Items:    ${initialCounts.inventoryItemsCount.toLocaleString()}`);
  console.log(`   - Price List Items:   ${initialCounts.priceListItemsCount.toLocaleString()}`);

  if (initialCounts.productsCount <= 1006) {
    console.log(`\n${c.yellow}⚠️ Database already contains ${initialCounts.productsCount} products. No deletion necessary.${c.reset}`);
    return;
  }

  // 2. Identify excluded & target product IDs
  const excludedIds = await getExcludedProductIds();

  console.log(`\n${c.cyan}🎯 Selecting the ${TARGET_DELETE_COUNT.toLocaleString()} most recent unreferenced products...${c.reset}`);
  
  // Select candidate products ordered by created_at DESC
  const allCandidates: any[] = await prisma.$queryRaw`
    SELECT id, name, sku, created_at
    FROM products
    ORDER BY created_at DESC, id DESC;
  `;

  const targetProducts: any[] = [];
  for (const candidate of allCandidates) {
    if (!excludedIds.has(candidate.id)) {
      targetProducts.push(candidate);
      if (targetProducts.length === TARGET_DELETE_COUNT) {
        break;
      }
    }
  }

  if (targetProducts.length < TARGET_DELETE_COUNT) {
    throw new Error(
      `Could only find ${targetProducts.length} unreferenced products to delete (needed ${TARGET_DELETE_COUNT}). Aborting for safety!`
    );
  }

  const targetProductIds = targetProducts.map((p) => p.id);
  const remainingCount = initialCounts.productsCount - targetProducts.length;

  console.log(`   ✅ Successfully identified exactly ${c.green}${targetProducts.length.toLocaleString()}${c.reset} target products to delete.`);
  console.log(`   ✅ Exactly ${c.green}${remainingCount.toLocaleString()}${c.reset} products will remain in the database.`);
  console.log(`\n${c.gray}   Sample target products to be removed:${c.reset}`);
  targetProducts.slice(0, 3).forEach((p, i) => {
    console.log(`     ${i + 1}. [${p.sku}] ${p.name.substring(0, 50)} (${p.created_at})`);
  });
  console.log(`     ... and ${(targetProducts.length - 3).toLocaleString()} more.`);

  // 3. Dry-Run Handling
  if (isDryRun) {
    console.log('\n' + '-'.repeat(70));
    console.log(`${c.yellow}💡 DRY-RUN SUMMARY (No database changes made):${c.reset}`);
    console.log(`   - Target Products to Delete:  ${targetProducts.length.toLocaleString()}`);
    console.log(`   - Remaining Products:         ${remainingCount.toLocaleString()}`);
    console.log(`   - Estimated Dependent Rows:   ~100,000+ across inventory, stock, variants`);
    console.log(`\nTo perform the live deletion, run:`);
    console.log(`   ${c.bright}pnpm exec tsx scripts/delete-7000-products.ts --execute${c.reset}`);
    console.log('-'.repeat(70) + '\n');
    return;
  }

  // 4. Live Execution in Batches
  console.log(`\n${c.red}🚨 INITIATING LIVE DELETION IN BATCHES OF ${BATCH_SIZE}...${c.reset}`);
  const totalBatches = Math.ceil(targetProductIds.length / BATCH_SIZE);
  const startTime = Date.now();

  let totalDeletedProducts = 0;
  let totalDeletedVariants = 0;
  let totalDeletedStock = 0;
  let totalDeletedInventory = 0;
  let totalDeletedInvItems = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batchIds = targetProductIds.slice(batchStart, batchStart + BATCH_SIZE);

    const batchStartTime = Date.now();
    console.log(`\n[Batch ${batchIdx + 1}/${totalBatches}] Processing ${batchIds.length} products...`);

    // Fetch variant IDs for this batch of products
    const variants: any[] = await prisma.$queryRaw`
      SELECT id FROM product_variants WHERE product_id = ANY(${batchIds}::uuid[]);
    `;
    const variantIds = variants.map((v) => v.id);

    // Execute deletion within a single transaction per batch
    await prisma.$transaction(async (tx) => {
      // 1. Delete from stock_balances (must delete before inventory_items due to RESTRICT FK)
      if (variantIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM stock_balances WHERE product_variant_id = ANY(${variantIds}::uuid[]);
        `;
      }

      // 3. Delete from inventory_items (RESTRICT on product_variants)
      if (variantIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM inventory_items WHERE product_variant_id = ANY(${variantIds}::uuid[]);
        `;
      }

      // 4. Delete price_list_items
      if (variantIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM price_list_items 
          WHERE product_id = ANY(${batchIds}::uuid[]) 
             OR product_variant_id = ANY(${variantIds}::uuid[]);
        `;
      } else {
        await tx.$executeRaw`
          DELETE FROM price_list_items WHERE product_id = ANY(${batchIds}::uuid[]);
        `;
      }

      // 5. Delete other auxiliary tables if present
      if (variantIds.length > 0) {
        await tx.$executeRaw`DELETE FROM inv_promotion_products WHERE product_id = ANY(${batchIds}::uuid[]) OR product_variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM product_media WHERE product_id = ANY(${batchIds}::uuid[]) OR variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM product_suppliers WHERE product_id = ANY(${batchIds}::uuid[]) OR product_variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM reorder_rules WHERE product_variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM reorder_suggestions WHERE product_variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM stock_by_location WHERE product_variant_id = ANY(${variantIds}::uuid[]);`;
        await tx.$executeRaw`DELETE FROM product_variant_attributes WHERE product_variant_id = ANY(${variantIds}::uuid[]);`;
      }

      // 6. Delete product_variants
      await tx.$executeRaw`
        DELETE FROM product_variants WHERE product_id = ANY(${batchIds}::uuid[]);
      `;

      // 7. Delete products
      await tx.$executeRaw`
        DELETE FROM products WHERE id = ANY(${batchIds}::uuid[]);
      `;
    }, {
      timeout: 60000, // 60 seconds per batch
      maxWait: 10000, // 10 seconds to acquire connection
    });

    totalDeletedProducts += batchIds.length;
    totalDeletedVariants += variantIds.length;

    const elapsedBatch = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    console.log(
      `   ${c.green}✔ Batch ${batchIdx + 1}/${totalBatches} completed in ${elapsedBatch}s${c.reset} (${batchIds.length} products, ${variantIds.length} variants)`
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log(`${c.bright}${c.green}🎉 ALL ${totalBatches} BATCHES EXECUTED SUCCESSFULLY IN ${totalTime}s!${c.reset}`);
  console.log('='.repeat(70));

  // 5. Post-Deletion Verification Audit
  console.log(`\n${c.cyan}🔍 RUNNING POST-PURGE VERIFICATION AUDIT...${c.reset}`);
  const finalCounts = await getDatabaseCounts();
  console.log(`\n${c.bright}📊 FINAL DATABASE STATE:${c.reset}`);
  console.log(`   - Products:           ${finalCounts.productsCount.toLocaleString()} (Reduced by ${(initialCounts.productsCount - finalCounts.productsCount).toLocaleString()})`);
  console.log(`   - Product Variants:   ${finalCounts.variantsCount.toLocaleString()} (Reduced by ${(initialCounts.variantsCount - finalCounts.variantsCount).toLocaleString()})`);
  console.log(`   - Inventory:          ${finalCounts.inventoryCount.toLocaleString()} (Reduced by ${(initialCounts.inventoryCount - finalCounts.inventoryCount).toLocaleString()})`);
  console.log(`   - Stock Balances:     ${finalCounts.stockBalancesCount.toLocaleString()} (Reduced by ${(initialCounts.stockBalancesCount - finalCounts.stockBalancesCount).toLocaleString()})`);
  console.log(`   - Inventory Items:    ${finalCounts.inventoryItemsCount.toLocaleString()} (Reduced by ${(initialCounts.inventoryItemsCount - finalCounts.inventoryItemsCount).toLocaleString()})`);
  console.log(`   - Price List Items:   ${finalCounts.priceListItemsCount.toLocaleString()} (Reduced by ${(initialCounts.priceListItemsCount - finalCounts.priceListItemsCount).toLocaleString()})`);

  if (finalCounts.productsCount === 1006) {
    console.log(`\n${c.bright}${c.green}✅ SUCCESS: Exactly 1,006 products remain in the database as planned!${c.reset}\n`);
  } else {
    console.log(`\n${c.yellow}⚠️ Remaining products count is ${finalCounts.productsCount} (expected 1,006).${c.reset}\n`);
  }
}

main()
  .catch((err) => {
    console.error(`\n${c.red}❌ Execution failed:${c.reset}`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
