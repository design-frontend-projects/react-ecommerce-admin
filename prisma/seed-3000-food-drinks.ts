import 'dotenv/config';
import { randomUUID } from 'crypto';
import prisma from '../src/lib/prisma';
import { generate3000FoodAndDrinksProducts, GeneratedProduct } from './data/egypt-europe-food-generator';

const TENANT_ID = '2f2e33cb-68b7-4d80-8cb6-0c9997a63c64';
const DEFAULT_PRICE_LIST_ID = 'a8867992-1d49-480b-a93b-5ba5ca05749b';
const DEFAULT_TAX_RATE_ID = 'ede193cf-7855-43c2-be83-f262dc6d38bc';
const CAIRO_WAREHOUSE_ID = 'f8ce2d23-4e3d-4d7e-ac45-a3d1d4e870d9';
const EGYPT_WAREHOUSE_ID = '896cd75e-67da-46ba-bcfe-22c5dac19929';
const BATCH_SIZE = 250;

async function seed3000FoodAndDrinks() {
  const startTime = Date.now();
  console.log('='.repeat(70));
  console.log('🥖 SEEDING 3,000 EGYPTIAN & EUROPEAN TRADITIONAL FOOD & DRINKS');
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

  // Fallbacks
  const fallbackBrandId = brands[0]?.id;
  const fallbackCatId = categories[0]?.id;
  const fallbackUomId = uoms.find(u => u.code === 'gram')?.id || uoms[0]?.id;
  const fallbackNonDurableTypeId = productTypeMap.get('non_durable') || productTypes[0]?.id;

  // 3. Generate 3,000 food & drink products
  console.log('\n⚙️ Generating 3,000 authentic Egyptian & European food and beverage products...');
  const allProducts: GeneratedProduct[] = generate3000FoodAndDrinksProducts();
  console.log(`Generated ${allProducts.length} product blueprints.`);

  const totalVariantsCount = allProducts.reduce((sum, p) => sum + p.variants.length, 0);
  console.log(`Total variants to insert: ${totalVariantsCount}`);
  console.log(`Total price list items to insert: ${totalVariantsCount}`);
  console.log(`Total stock balances to insert: ${totalVariantsCount * 2} (Cairo & Egypt WH)`);
  console.log(`Total inventory records to insert: ${totalVariantsCount}`);

  // 4. Batch Insertion across 12 batches
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
    const chunkInventoryItemsData: any[] = [];
    const chunkReorderRulesData: any[] = [];

    for (let pIdx = 0; pIdx < chunk.length; pIdx++) {
      const p = chunk[pIdx];
      const prodId = randomUUID();

      const brandId = brandMap.get(p.brand_name.toLowerCase().trim()) || fallbackBrandId;
      const catId = catMap.get(p.category_name.toLowerCase().trim()) || fallbackCatId;
      const baseUomId = uomMap.get(p.base_uom_code.toLowerCase().trim()) || fallbackUomId;
      const prodTypeId = productTypeMap.get(p.product_type_code) || fallbackNonDurableTypeId;

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
        has_expiration: true,
        is_marketplace: true,
        base_uom_id: baseUomId,
        brand_id: brandId,
        category_id: catId,
        product_type_id: prodTypeId,
        product_type: 'variant',
        tracking_mode: 'batch',
        is_stock_item: true,
        reorderable: true,
        is_batch_tracked: true,
        is_serial_tracked: false,
      });

      for (let vIdx = 0; vIdx < p.variants.length; vIdx++) {
        const v = p.variants[vIdx];
        const varId = randomUUID();
        const varUomId = uomMap.get(v.uom_code.toLowerCase().trim()) || baseUomId;

        // Realistic expiration date (6 to 24 months out)
        const expDate = new Date(Date.now() + v.shelf_life_months * 30 * 24 * 60 * 60 * 1000);

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

        // Stock balance in Cairo warehouse (approx 35-120 units)
        const cairoQty = 35 + ((batchStart + pIdx + vIdx * 9) % 86);
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

        // Stock balance in Egypt Central warehouse (approx 90-350 units)
        const egyptQty = 90 + ((batchStart + pIdx + vIdx * 17) % 261);
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

        // Inventory reorder parameters & rule
        const reorderPt = Math.max(15, Math.round(cairoQty * 0.35));
        const safetyStk = Math.max(10, Math.round(reorderPt * 0.5));
        const reorderQty = Math.max(30, reorderPt * 3);

        chunkInventoryItemsData.push({
          id: randomUUID(),
          tenant_id: TENANT_ID,
          product_variant_id: varId,
          sku: v.sku,
          barcode: v.barcode,
          tracking_type: p.tracking_mode === 'batch' ? 'BATCH' : p.tracking_mode === 'serial' ? 'SERIAL' : 'STANDARD',
          is_stockable: true,
          is_sellable: true,
          is_purchasable: true,
          unit_of_measure_id: varUomId,
          status: 'ACTIVE',
          is_active: true,
        });

        chunkReorderRulesData.push({
          id: randomUUID(),
          tenant_id: TENANT_ID,
          product_variant_id: varId,
          warehouse_id: EGYPT_WAREHOUSE_ID,
          min_stock: safetyStk,
          reorder_point: reorderPt,
          reorder_quantity: reorderQty,
          max_stock: reorderQty * 4,
          lead_time_days: 5,
          is_active: true,
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
      await tx.inventory_items.createMany({ data: chunkInventoryItemsData });
      await tx.reorder_rules.createMany({ data: chunkReorderRulesData });
    }, {
      timeout: 30000,
    });

    const batchElapsedMs = Date.now() - batchTimer;
    totalProductsInserted += chunkProductData.length;
    totalVariantsInserted += chunkVariantData.length;
    totalPricesInserted += chunkPriceListData.length;
    totalStockBalancesInserted += chunkStockBalanceData.length;
    totalInventoryInserted += chunkInventoryItemsData.length;

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
  console.log('🎉 FOOD & DRINKS SEEDING COMPLETED SUCCESSFULLY!');
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

seed3000FoodAndDrinks()
  .catch((err) => {
    console.error('❌ SEEDING FAILED WITH ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
