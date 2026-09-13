import prisma from './src/lib/prisma'

async function main() {
  const balances = await prisma.stock_balances.findMany({
    include: {
      product_variants: { select: { id: true, sku: true } },
      warehouses: { select: { id: true, name: true, code: true } },
      stores: { select: { store_id: true, name: true } },
    },
  })

  console.log('Stock balances count:', balances.length)
  console.log(
    JSON.stringify(
      balances.map((b) => ({
        id: b.id,
        variantId: b.product_variant_id,
        sku: b.product_variants?.sku,
        warehouseId: b.warehouse_id,
        warehouseName: b.warehouses?.name,
        storeId: b.store_id,
        storeName: b.stores?.name,
        onHand: Number(b.qty_on_hand),
        reserved: Number(b.qty_reserved),
        available: Number(b.qty_available),
      })),
      null,
      2
    )
  )

  const storeWhs = await prisma.store_warehouses.findMany({
    include: {
      stores: { select: { store_id: true, name: true } },
      warehouses: { select: { id: true, name: true, code: true } },
    },
  })

  console.log('Store warehouses count:', storeWhs.length)
  console.log(
    JSON.stringify(
      storeWhs.map((sw) => ({
        id: sw.id,
        storeName: sw.stores?.name,
        storeId: sw.store_id,
        warehouseName: sw.warehouses?.name,
        warehouseId: sw.warehouse_id,
        isDefault: sw.is_default,
        priority: sw.priority,
      })),
      null,
      2
    )
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
