const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stores = await prisma.stores.findMany({
    select: { store_id: true, name: true, code: true }
  });
  console.log('--- STORES ---');
  console.log(JSON.stringify(stores, null, 2));

  const sw = await prisma.store_warehouses.findMany({
    include: {
      warehouses: { select: { id: true, name: true, code: true, is_active: true } },
      stores: { select: { store_id: true, name: true } }
    }
  });
  console.log('--- STORE WAREHOUSES ---');
  console.log(JSON.stringify(sw, null, 2));

  const allWh = await prisma.warehouses.findMany({
    select: { id: true, name: true, code: true, is_default: true, is_active: true }
  });
  console.log('--- ALL WAREHOUSES ---');
  console.log(JSON.stringify(allWh, null, 2));

  const sb = await prisma.stock_balances.findMany({
    take: 15,
    select: {
      id: true,
      warehouse_id: true,
      store_id: true,
      product_variant_id: true,
      qty_on_hand: true,
      qty_available: true,
      qty_reserved: true,
      product_variants: {
        select: {
          id: true,
          sku: true,
          name: true,
          product_id: true,
          products: { select: { id: true, name: true } }
        }
      }
    }
  });
  console.log('--- SAMPLE STOCK BALANCES ---');
  console.log(JSON.stringify(sb, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
