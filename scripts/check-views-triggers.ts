import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function checkViewsAndTriggers() {
  const views: any = await prisma.$queryRaw`
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND (view_definition ILIKE '%purchase_orders%' OR view_definition ILIKE '%purchase_order_items%');
  `
  console.log('Views referencing PO:', views)

  const triggers: any = await prisma.$queryRaw`
    SELECT tgname, relname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname IN ('purchase_orders', 'purchase_order_items');
  `
  console.log('Triggers on PO/POI:', triggers)

  const routines: any = await prisma.$queryRaw`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND (routine_name ILIKE '%receipt%' OR routine_name ILIKE '%purchase%');
  `
  console.log('Routines on PO/receipt:', routines)
}

checkViewsAndTriggers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
