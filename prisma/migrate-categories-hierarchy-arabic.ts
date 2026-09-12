import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Executing DDL migration for categories table...');

  // 1. Add parent_id column referencing categories(id)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.categories 
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  `);
  console.log('  ✔ Column "parent_id UUID REFERENCES categories(id)" added.');

  // 2. Add name_ar column for Arabic translation
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.categories 
    ADD COLUMN IF NOT EXISTS name_ar VARCHAR(150);
  `);
  console.log('  ✔ Column "name_ar VARCHAR(150)" added.');

  // 3. Add index on parent_id
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
  `);
  console.log('  ✔ Index "idx_categories_parent_id" created.');

  // 4. Add composite index on (tenant_id, parent_id)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON public.categories(tenant_id, parent_id);
  `);
  console.log('  ✔ Index "idx_categories_tenant_parent" created.');

  // 5. Add index on name_ar
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_categories_name_ar ON public.categories(name_ar);
  `);
  console.log('  ✔ Index "idx_categories_name_ar" created.');

  // Verify columns in categories table
  const cols = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' 
    ORDER BY ordinal_position;
  `;
  console.log('\n🔍 Current columns in "categories" table:');
  console.table(cols);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
