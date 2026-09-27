import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import prisma from '../src/lib/prisma'

async function run() {
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260927230000_enhance_purchase_order_and_items',
    'migration.sql'
  )

  console.log(`Reading migration from: ${migrationPath}`)
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration SQL to PostgreSQL database...')
  await prisma.$executeRawUnsafe(sql)
  console.log('Migration SQL executed successfully!')

  // Verify columns on purchase_order_items
  const poiCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'purchase_order_items'
    ORDER BY ordinal_position;
  `
  console.log('New POI columns:', poiCols.map((c: any) => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`))

  // Verify columns on purchase_orders
  const poCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders'
    ORDER BY ordinal_position;
  `
  console.log('New PO columns:', poCols.map((c: any) => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`))

  console.log('Migration verified successfully.')
}

run()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
