import 'dotenv/config';
import { randomUUID } from 'crypto';
import prisma from '../src/lib/prisma';
import { generate5000MiddleEastProducts, GeneratedProduct } from './data/middle-east-products-generator';

const TENANT_ID = '2f2e33cb-68b7-4d80-8cb6-0c9997a63c64';
const DEFAULT_PRICE_LIST_ID = 'a8867992-1d49-480b-a93b-5ba5ca05749b';
const DEFAULT_TAX_RATE_ID = 'ede193cf-7855-43c2-be83-f262dc6d38bc';
const CAIRO_WAREHOUSE_ID = 'f8ce2d23-4e3d-4d7e-ac45-a3d1d4e870d9';
const EGYPT_WAREHOUSE_ID = '896cd75e-67da-46ba-bcfe-22c5dac19929';
const BATCH_SIZE = 250;

async function seed5000MiddleEastProducts() {
  const startTime = Date.now();
  console.log('='.repeat(70));
  console.log('🚀 SEEDING 5,000 MIDDLE EAST TRADITIONAL PRODUCTS WITH VARIANTS');
  console.log('='.repeat(70));

  // 1. Verify tenant & core prerequisites
  const tenant = await prisma.tenants.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    throw new Error(`Tenant ${TENANT_ID} not found!`);
  }
  console.log(`✅ Tenant verified: ${tenant.name} (${tenant.id})`);

  // 2. Pre-fetch and cache lookups
  console.log('📥 Pre-fetching database lookups...');
  const [brands, categories, uoms, productTypes] = await Promise.all([
    prisma.brands.findMany({ select: { id: true, name: true } }),
    prisma.categories.findMany({ select: { id: true, name: true } }),
    prisma.uoms.findMany({ select: { id: true, code: true, name: true } }),
    prisma.product_types.findMany({ select: { id: true, code: true } }),
  ]);

  const brandMap = new Map<string, string>();
  brands.forEach(b => brandMap.set(b.name.toLowerCase().trim(), b.id));

  const catMap = new Map<string, string>();
  categories.forEach(c => catMap.set(c.name.toLowerCase().trim(), c.id));

  const uomMap = new Map<string, string>();
  uoms.forEach(u => {
    uomMap.set(u.code.toLowerCase().trim(), u.id);
    uomMap.set(u.name.toLowerCase().trim(), u.id);
  });

  const productTypeMap = new Map<string, string>();
  productTypes.forEach(pt => productTypeMap.set(pt.code.toLowerCase().trim(), pt.id));

  console.log(`Lookup tables cached: ${brands.length} brands, ${categories.length} categories, ${uoms.length} UOMs, ${productTypes.length} product types.`);

  // Fallback defaults
  const fallbackBrandId = brands[0]?.id;
  const fallbackCatId = categories[0]?.id;
  const fallbackUomId = uoms.find(u => u.code === 'pc')?.id || uoms[0]?.id;
  const fallbackNonDurableTypeId = productTypeMap.get('non_durable') || productTypes[0]?.id;
  const fallbackDurableTypeId = productTypeMap.get('durable') || productTypes[1]?.id;

  // 3. Generate 5,000 product structures
  console.log('\n⚙️ Generating 5,000 authentic Middle Eastern products and variants...');
  const allProducts: GeneratedProduct[] = generate5000MiddleEastProducts();
  console.log(`Generated ${allProducts.length} product blueprints.`);

  // Calculate totals
  const totalVariantsCount = allProducts.reduce((sum, p) => sum + p.variants.length, 0);
  console.log(`Total variants to insert: ${totalVariantsCount}`);
  console.log(`Total price list items to insert: ${totalVariantsCount}`);
  console.log(`Total stock balances to insert: ${totalVariantsCount * 2} (Cairo & Egypt WH)`);
  console.log(`Total inventory records to insert: ${totalVariantsCount}`);

  // 4. Batch Insertion
  const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
  console.log(`\n📦 Executing insertions across ${totalBatches} transactional batches (batch size = ${BATCH_SIZE} products)...\n`);

  let totalProductsInserted = 0;
  let totalVariantsInserted = 0;
  let totalPricesInserted = 0;
  let totalStockBalancesInserted = 0;
  let totalInventoryInserted = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, allProducts.length);
    const chunk = allProducts.slice(batchStart, batchEnd);

    const chunkProductData: any[] = [];
    const chunkVariantData: any[] = [];
    const chunkPriceListData: any[] = [];
    const chunkStockBalanceData: any[] = [];
    const chunkInventoryData: any[] = [];

    for (let pIdx = 0; pIdx < chunk.length; pIdx++) {
      const p = chunk[pIdx];
      const prodId = randomUUID();

      const brandId = brandMap.get(p.brand_name.toLowerCase().trim()) || fallbackBrandId;
      const catId = catMap.get(p.category_name.toLowerCase().trim()) || fallbackCatId;
      const baseUomId = uomMap.get(p.base_uom_code.toLowerCase().trim()) || fallbackUomId;
      const prodTypeId = productTypeMap.get(p.product_type_code) ||
        (p.product_type_code === 'durable' ? fallbackDurableTypeId : fallbackNonDurableTypeId);

      chunkProductData.push({
        id: prodId,
        tenant_id: TENANT_ID,
        name: p.name,
        description: p.description,
        sku: p.sku,
        barcode: p.barcode,
        weight: p.weight,
        dimensions: p.dimensions,
        is_active: true,
        is_deleted: false,
        has_variants: true,
        has_expiration: p.tracking_mode === 'batch',
        is_marketplace: true,
        base_uom_id: baseUomId,
        brand_id: brandId,
        category_id: catId,
        product_type_id: prodTypeId,
        product_type: 'variant',
        tracking_mode: p.tracking_mode,
        is_stock_item: true,
        reorderable: true,
        is_batch_tracked: p.tracking_mode === 'batch',
        is_serial_tracked: p.tracking_mode === 'serial',
      });

      for (let vIdx = 0; vIdx < p.variants.length; vIdx++) {
        const v = p.variants[vIdx];
        const varId = randomUUID();
        const varUomId = uomMap.get(v.uom_code.toLowerCase().trim()) || baseUomId;

        // Expiration date for batch tracked items (12 to 36 months out)
        const expDate = v.shelf_life_months
          ? new Date(Date.now() + v.shelf_life_months * 30 * 24 * 60 * 60 * 1000)
          : null;

        chunkVariantData.push({
          id: varId,
          tenant_id: TENANT_ID,
          product_id: prodId,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          weight: v.weight,
          dimensions: v.dimensions,
          is_active: true,
          expiration_date: expDate,
          uom_id: varUomId,
          tax_rate_id: DEFAULT_TAX_RATE_ID,
        });

        // Price list item under default active price list
        const markup = v.cost_price > 0
          ? Math.round(((v.price - v.cost_price) / v.cost_price) * 10000) / 100
          : 0;

        chunkPriceListData.push({
          id: randomUUID(),
          tenant_id: TENANT_ID,
          price_list_id: DEFAULT_PRICE_LIST_ID,
          product_id: prodId,
          product_variant_id: varId,
          price: v.price,
          cost_price: v.cost_price,
          min_price: v.min_price,
          max_discount_percent: 5,
          markup_percent: markup,
          price_source: 'MANUAL',
          tax_id: DEFAULT_TAX_RATE_ID,
        });

        // Stock balances across active warehouses
        // Cairo WH: ~30-100 units on hand
        const cairoQty = 30 + ((batchStart + pIdx + vIdx * 7) % 71);
        chunkStockBalanceData.push({
          id: randomUUID(),
          tenant_id: TENANT_ID,
          warehouse_id: CAIRO_WAREHOUSE_ID,
          product_variant_id: varId,
          condition: 'good',
          qty_on_hand: cairoQty,
          qty_reserved: 0,
          qty_available: cairoQty,
          qty_in_transit: 0,
          qty_incoming: 0,
          qty_outgoing: 0,
          qty_damaged: 0,
          avg_cost: v.cost_price,
          version: 0,
        });

        // Egypt Central WH: ~80-300 units on hand
        const egyptQty = 80 + ((batchStart + pIdx + vIdx * 13) % 221);
        chunkStockBalanceData.push({
          id: randomUUID(),
          tenant_id: TENANT_ID,
          warehouse_id: EGYPT_WAREHOUSE_ID,
          product_variant_id: varId,
          condition: 'good',
          qty_on_hand: egyptQty,
          qty_reserved: 0,
          qty_available: egyptQty,
          qty_in_transit: 0,
          qty_incoming: 0,
          qty_outgoing: 0,
          qty_damaged: 0,
          avg_cost: v.cost_price,
          version: 0,
        });

        // Inventory reorder parameters (Main warehouse)
        const reorderPt = Math.max(10, Math.round(cairoQty * 0.3));
        const safetyStk = Math.max(5, Math.round(reorderPt * 0.5));
        const reorderQty = Math.max(25, reorderPt * 3);
        const aisleChar = String.fromCharCode(65 + ((pIdx + batchStart) % 8)); // A through H
        const rackNum = String(1 + ((pIdx + vIdx) % 15)).padStart(2, '0');
        const shelfNum = String(1 + ((pIdx + vIdx) % 5));
        const binNum = String(1 + ((pIdx * 3 + vIdx) % 20)).padStart(2, '0');

        chunkInventoryData.push({
          tenant_id: TENANT_ID,
          product_id: prodId,
          product_variant_id: varId,
          warehouse_id: EGYPT_WAREHOUSE_ID,
          min_quantity: safetyStk,
          max_quantity: reorderQty * 4,
          reorder_point: reorderPt,
          safety_stock: safetyStk,
          reorder_quantity: reorderQty,
          unit_cost: v.cost_price,
          lead_time_days: 7,
          is_active: true,
          status: 'active',
          aisle: aisleChar,
          rack: `R${rackNum}`,
          shelf: `S${shelfNum}`,
          bin: `B${binNum}`,
        });
      }
    }

    // Execute atomic transaction for the batch
    const batchTimer = Date.now();
    await prisma.$transaction(async (tx) => {
      await tx.products.createMany({ data: chunkProductData });
      await tx.product_variants.createMany({ data: chunkVariantData });
      await tx.price_list_items.createMany({ data: chunkPriceListData });
      await tx.stock_balances.createMany({ data: chunkStockBalanceData });
      await tx.inventory.createMany({ data: chunkInventoryData });
    }, {
      timeout: 30000,
    });

    const batchElapsedMs = Date.now() - batchTimer;
    totalProductsInserted += chunkProductData.length;
    totalVariantsInserted += chunkVariantData.length;
    totalPricesInserted += chunkPriceListData.length;
    totalStockBalancesInserted += chunkStockBalanceData.length;
    totalInventoryInserted += chunkInventoryData.length;

    const progressPct = (((batchIdx + 1) / totalBatches) * 100).toFixed(1);
    console.log(
      `[Batch ${(batchIdx + 1).toString().padStart(2, '0')}/${totalBatches}] ` +
      `(${progressPct}%) Inserted ${chunkProductData.length} products, ` +
      `${chunkVariantData.length} variants, ${chunkStockBalanceData.length} stock balances ` +
      `in ${batchElapsedMs}ms (Total Prods: ${totalProductsInserted})`
    );
  }

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(70));
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
  console.log(`⏱️ Total Execution Time: ${totalTimeSeconds}s`);
  console.log(`📊 Summary of inserted records:`);
  console.log(`   - Products:            ${totalProductsInserted.toLocaleString()}`);
  console.log(`   - Product Variants:    ${totalVariantsInserted.toLocaleString()}`);
  console.log(`   - Price List Items:    ${totalPricesInserted.toLocaleString()}`);
  console.log(`   - Stock Balances:      ${totalStockBalancesInserted.toLocaleString()}`);
  console.log(`   - Inventory Rules:     ${totalInventoryInserted.toLocaleString()}`);
  console.log('='.repeat(70));
}

seed5000MiddleEastProducts()
  .catch((err) => {
    console.error('❌ SEEDING FAILED WITH ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
