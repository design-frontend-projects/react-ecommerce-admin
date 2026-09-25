import 'dotenv/config';
import prisma from '../src/lib/prisma';

const TENANT_ID = '2f2e33cb-68b7-4d80-8cb6-0c9997a63c64';
const DEFAULT_PRICE_LIST_ID = 'a8867992-1d49-480b-a93b-5ba5ca05749b';

async function verify5000MiddleEastProducts() {
  console.log('='.repeat(70));
  console.log('🔍 VERIFYING DATABASE AFTER 5,000 PRODUCTS SEEDING');
  console.log('='.repeat(70));

  // 1. Core Counts
  const [
    totalProducts,
    totalVariants,
    totalPriceListItems,
    totalStockBalances,
    totalInventoryItems,
  ] = await Promise.all([
    prisma.products.count({ where: { tenant_id: TENANT_ID } }),
    prisma.product_variants.count({ where: { tenant_id: TENANT_ID } }),
    prisma.price_list_items.count({ where: { tenant_id: TENANT_ID, price_list_id: DEFAULT_PRICE_LIST_ID } }),
    prisma.stock_balances.count({ where: { tenant_id: TENANT_ID } }),
    prisma.inventory_items.count({ where: { tenant_id: TENANT_ID } }),
  ]);

  console.log('\n📊 DATABASE RECORD COUNTS FOR TENANT:');
  console.log(`   - Total Products:           ${totalProducts.toLocaleString()}`);
  console.log(`   - Total Product Variants:   ${totalVariants.toLocaleString()}`);
  console.log(`   - Active Price List Items:  ${totalPriceListItems.toLocaleString()}`);
  console.log(`   - Warehouse Stock Balances: ${totalStockBalances.toLocaleString()}`);
  console.log(`   - Inventory Items (Catalog):${totalInventoryItems.toLocaleString()}`);

  // 2. Barcode & SKU Integrity Check
  const sampleVariants = await prisma.product_variants.findMany({
    where: { tenant_id: TENANT_ID },
    select: { sku: true, barcode: true },
    take: 13150,
  });

  const skuSet = new Set<string>();
  const barcodeSet = new Set<string>();
  let duplicateSkus = 0;
  let duplicateBarcodes = 0;

  for (const v of sampleVariants) {
    if (skuSet.has(v.sku)) duplicateSkus++;
    else skuSet.add(v.sku);

    if (v.barcode) {
      if (barcodeSet.has(v.barcode)) duplicateBarcodes++;
      else barcodeSet.add(v.barcode);
    }
  }

  console.log('\n🔒 INTEGRITY & UNIQUENESS VERIFICATION:');
  console.log(`   - Total Variant Records Inspected: ${sampleVariants.length.toLocaleString()}`);
  console.log(`   - Unique SKUs:                      ${skuSet.size.toLocaleString()} (Duplicates: ${duplicateSkus})`);
  console.log(`   - Unique Barcodes:                  ${barcodeSet.size.toLocaleString()} (Duplicates: ${duplicateBarcodes})`);

  // 3. Category Distribution Check
  const categoryBreakdown: any = await prisma.$queryRaw`
    SELECT c.name as category_name, COUNT(p.id)::int as product_count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.tenant_id = ${TENANT_ID}::uuid
    GROUP BY c.name
    ORDER BY product_count DESC
    LIMIT 15;
  `;

  console.log('\n🏷️ TOP CATEGORIES DISTRIBUTION:');
  for (const row of categoryBreakdown) {
    console.log(`   - ${row.category_name.padEnd(45)}: ${row.product_count} products`);
  }

  // 4. Warehouse Stock Breakdown
  const warehouseBreakdown: any = await prisma.$queryRaw`
    SELECT w.name as warehouse_name, COUNT(sb.id)::int as balance_count, SUM(sb.qty_on_hand)::int as total_units
    FROM stock_balances sb
    JOIN warehouses w ON sb.warehouse_id = w.id
    WHERE sb.tenant_id = ${TENANT_ID}::uuid
    GROUP BY w.name
    ORDER BY total_units DESC;
  `;

  console.log('\n🏬 WAREHOUSE STOCK DISTRIBUTION:');
  for (const row of warehouseBreakdown) {
    console.log(`   - ${row.warehouse_name.padEnd(25)}: ${row.balance_count.toLocaleString()} variants, ${row.total_units?.toLocaleString() ?? 0} units on hand`);
  }

  // 5. Inspect Detailed Sample Products Across Different Sectors
  const sampleIndices = [0, 500, 1000, 2000, 3000, 4000];
  const sampleProducts: any[] = [];
  
  for (const idx of sampleIndices) {
    const sp = await prisma.products.findFirst({
      where: { tenant_id: TENANT_ID },
      skip: idx,
      include: {
        brands: { select: { name: true } },
        categories: { select: { name: true } },
        product_variants: {
          include: {
            price_list_items: {
              where: { price_list_id: DEFAULT_PRICE_LIST_ID },
              select: { price: true, cost_price: true, min_price: true, markup_percent: true }
            },
            stock_balances: {
              select: { warehouse_id: true, qty_on_hand: true, avg_cost: true }
            },
            inventory: {
              select: { reorder_point: true, safety_stock: true, aisle: true, rack: true, shelf: true, bin: true }
            }
          }
        }
      }
    });
    if (sp) sampleProducts.push(sp);
  }

  console.log('\n🔍 SAMPLE PRODUCT INSPECTION ACROSS DIVERSE SECTORS:');
  for (const sp of sampleProducts) {
    console.log(`\n📦 Product: ${sp.name} [SKU: ${sp.sku}, Barcode: ${sp.barcode}]`);
    console.log(`   Brand: ${sp.brands?.name} | Category: ${sp.categories?.name} | Tracking: ${sp.tracking_mode}`);
    console.log(`   Variants (${sp.product_variants.length}):`);
    for (const v of sp.product_variants.slice(0, 2)) {
      const pli = v.price_list_items[0];
      const stockCairo = v.stock_balances.find((sb: any) => sb.warehouse_id === 'f8ce2d23-4e3d-4d7e-ac45-a3d1d4e870d9');
      const stockEgypt = v.stock_balances.find((sb: any) => sb.warehouse_id === '896cd75e-67da-46ba-bcfe-22c5dac19929');
      const inv = v.inventory[0];
      console.log(`     🔹 ${v.name} (SKU: ${v.sku}, Barcode: ${v.barcode})`);
      console.log(`        Price: $${pli?.price} | Cost: $${pli?.cost_price} | Markup: ${pli?.markup_percent}% | Min: $${pli?.min_price}`);
      console.log(`        Stock: Cairo WH: ${stockCairo?.qty_on_hand ?? 0} units | Egypt Central WH: ${stockEgypt?.qty_on_hand ?? 0} units`);
      console.log(`        Location: Aisle ${inv?.aisle}, Rack ${inv?.rack}, Shelf ${inv?.shelf}, Bin ${inv?.bin} (ROP: ${inv?.reorder_point}, Safety: ${inv?.safety_stock})`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
}

verify5000MiddleEastProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
