import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function inspectConstraints() {
  const fks: any = await prisma.$queryRaw`
    SELECT conname, contype::text as contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'purchase_order_items'::regclass;
  `
  console.log('POI Constraints:', JSON.stringify(fks, null, 2))

  const idxs: any = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'purchase_order_items';
  `
  console.log('POI Indexes:', JSON.stringify(idxs, null, 2))

  const poFks: any = await prisma.$queryRaw`
    SELECT conname, contype::text as contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'purchase_orders'::regclass;
  `
  console.log('PO Constraints:', JSON.stringify(poFks, null, 2))

  const poIdxs: any = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'purchase_orders';
  `
  console.log('PO Indexes:', JSON.stringify(poIdxs, null, 2))
}

inspectConstraints()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
