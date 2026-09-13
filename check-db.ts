import { PrismaClient } from './src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const stores = await prisma.stores.findMany({
    select: { store_id: true, name: true }
  })
  console.log('--- STORES ---')
  console.log(JSON.stringify(stores, null, 2))

  const sw = await prisma.store_warehouses.findMany({
    include: {
      warehouses: { select: { id: true, name: true, code: true, is_active: true } },
      stores: { select: { store_id: true, name: true } }
    }
  })
  console.log('--- STORE WAREHOUSES ---')
  console.log(JSON.stringify(sw, null, 2))

  const sb = await prisma.stock_balances.findMany({
    take: 10,
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
  })
  console.log('--- SAMPLE STOCK BALANCES ---')
  console.log(JSON.stringify(sb, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
