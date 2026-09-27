import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function inspectPO() {
  console.log('=== Checking purchase_orders columns ===')
  const poCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders'
    ORDER BY ordinal_position;
  `
  for (const c of poCols) {
    console.log(`PO: ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`)
  }

  console.log('\n=== Checking purchase_order_items columns ===')
  const poiCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'purchase_order_items'
    ORDER BY ordinal_position;
  `
  for (const c of poiCols) {
    console.log(`POI: ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`)
  }

  const poCount = await prisma.purchase_orders.count()
  const poiCount = await prisma.purchase_order_items.count()
  console.log(`\nRecord Counts: purchase_orders = ${poCount}, purchase_order_items = ${poiCount}`)

  if (poiCount > 0) {
    // 1. Check for product_id != product_variant.product_id
    const mismatches: any = await prisma.$queryRaw`
      SELECT 
        poi.id, 
        poi.po_id, 
        poi.product_id as poi_product_id, 
        poi.product_variant_id, 
        pv.product_id as pv_product_id
      FROM purchase_order_items poi
      LEFT JOIN product_variants pv ON pv.id = poi.product_variant_id
      WHERE poi.product_variant_id IS NOT NULL 
        AND poi.product_id IS NOT NULL
        AND poi.product_id != pv.product_id;
    `
    console.log(`\nMismatched product_id vs variant.product_id count: ${mismatches.length}`)
    if (mismatches.length > 0) {
      console.log('Mismatches:', mismatches)
    }

    // 2. Check for null product_variant_id
    const nullVariants: any = await prisma.$queryRaw`
      SELECT poi.id, poi.po_id, poi.product_id
      FROM purchase_order_items poi
      WHERE poi.product_variant_id IS NULL;
    `
    console.log(`POI with null product_variant_id count: ${nullVariants.length}`)
    if (nullVariants.length > 0) {
      console.log('Null variants sample:', nullVariants.slice(0, 5))
    }
  }

  // 3. Inspect PO store_id, branch_id, warehouse_id usage
  const poHierarchySample: any = await prisma.$queryRaw`
    SELECT id, store_id, branch_id, warehouse_id, currency, currency_id, status, lifecycle_status,
           subtotal, discount_total, tax_total, grand_total, total_amount, tax_amount, discount_amount
    FROM purchase_orders
    LIMIT 10;
  `
  console.log('\nSample PO records:', JSON.stringify(poHierarchySample, null, 2))
}

inspectPO()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
