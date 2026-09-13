import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface CurrencyItem {
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
  is_active: boolean;
}

const MOST_USED_CURRENCIES: CurrencyItem[] = [
  // Top Traded Global Currencies
  { code: 'USD', name: 'US Dollar', name_ar: 'دولار أمريكي', symbol: '$', is_active: true },
  { code: 'EUR', name: 'Euro', name_ar: 'يورو', symbol: '€', is_active: true },
  { code: 'JPY', name: 'Japanese Yen', name_ar: 'ين ياباني', symbol: '¥', is_active: true },
  { code: 'GBP', name: 'British Pound', name_ar: 'جنيه إسترليني', symbol: '£', is_active: true },
  { code: 'CNY', name: 'Chinese Yuan', name_ar: 'يوان صيني', symbol: '¥', is_active: true },
  { code: 'AUD', name: 'Australian Dollar', name_ar: 'دولار أسترالي', symbol: 'A$', is_active: true },
  { code: 'CAD', name: 'Canadian Dollar', name_ar: 'دولار كندي', symbol: 'C$', is_active: true },
  { code: 'CHF', name: 'Swiss Franc', name_ar: 'فرنك سويسري', symbol: 'CHF', is_active: true },
  { code: 'HKD', name: 'Hong Kong Dollar', name_ar: 'دولار هونغ كونغ', symbol: 'HK$', is_active: true },
  { code: 'SGD', name: 'Singapore Dollar', name_ar: 'دولار سنغافوري', symbol: 'S$', is_active: true },
  { code: 'SEK', name: 'Swedish Krona', name_ar: 'كرونة سويدية', symbol: 'kr', is_active: true },
  { code: 'KRW', name: 'South Korean Won', name_ar: 'وون كوري جنوبي', symbol: '₩', is_active: true },
  { code: 'NOK', name: 'Norwegian Krone', name_ar: 'كرونة نرويجية', symbol: 'kr', is_active: true },
  { code: 'NZD', name: 'New Zealand Dollar', name_ar: 'دولار نيوزيلندي', symbol: 'NZ$', is_active: true },
  { code: 'INR', name: 'Indian Rupee', name_ar: 'روبية هندية', symbol: '₹', is_active: true },
  { code: 'MXN', name: 'Mexican Peso', name_ar: 'بيزو مكسيكي', symbol: '$', is_active: true },
  { code: 'TWD', name: 'New Taiwan Dollar', name_ar: 'دولار تايواني جديد', symbol: 'NT$', is_active: true },
  { code: 'ZAR', name: 'South African Rand', name_ar: 'راند جنوب أفريقي', symbol: 'R', is_active: true },
  { code: 'BRL', name: 'Brazilian Real', name_ar: 'ريال برازيلي', symbol: 'R$', is_active: true },
  { code: 'DKK', name: 'Danish Krone', name_ar: 'كرونة دنماركية', symbol: 'kr', is_active: true },
  { code: 'PLN', name: 'Polish Zloty', name_ar: 'زلوتي بولندي', symbol: 'zł', is_active: true },
  { code: 'THB', name: 'Thai Baht', name_ar: 'بات تايلاندي', symbol: '฿', is_active: true },
  { code: 'ILS', name: 'Israeli Shekel', name_ar: 'شيكل إسرائيلي', symbol: '₪', is_active: true },
  { code: 'IDR', name: 'Indonesian Rupiah', name_ar: 'روبية إندونيسية', symbol: 'Rp', is_active: true },
  { code: 'CZK', name: 'Czech Koruna', name_ar: 'كرونة تشيكية', symbol: 'Kč', is_active: true },
  { code: 'TRY', name: 'Turkish Lira', name_ar: 'ليرة تركية', symbol: '₺', is_active: true },
  { code: 'HUF', name: 'Hungarian Forint', name_ar: 'فورنت مجري', symbol: 'Ft', is_active: true },
  { code: 'CLP', name: 'Chilean Peso', name_ar: 'بيزو تشيلي', symbol: '$', is_active: true },
  { code: 'PHP', name: 'Philippine Peso', name_ar: 'بيزو فلبيني', symbol: '₱', is_active: true },
  { code: 'MYR', name: 'Malaysian Ringgit', name_ar: 'رينغيت ماليزي', symbol: 'RM', is_active: true },
  { code: 'COP', name: 'Colombian Peso', name_ar: 'بيزو كولومبي', symbol: '$', is_active: true },
  { code: 'RUB', name: 'Russian Ruble', name_ar: 'روبل روسي', symbol: '₽', is_active: true },
  { code: 'RON', name: 'Romanian Leu', name_ar: 'ليو روماني', symbol: 'lei', is_active: true },
  { code: 'PEN', name: 'Peruvian Sol', name_ar: 'سول بيروفي', symbol: 'S/', is_active: true },
  { code: 'BGN', name: 'Bulgarian Lev', name_ar: 'ليف بلغاري', symbol: 'лв', is_active: true },
  { code: 'VND', name: 'Vietnamese Dong', name_ar: 'دونغ فيتنامي', symbol: '₫', is_active: true },
  { code: 'PKR', name: 'Pakistani Rupee', name_ar: 'روبية باكستانية', symbol: '₨', is_active: true },

  // GCC & Middle East / North Africa (MENA) Currencies
  { code: 'SAR', name: 'Saudi Riyal', name_ar: 'ريال سعودي', symbol: 'ر.س', is_active: true },
  { code: 'AED', name: 'UAE Dirham', name_ar: 'درهم إماراتي', symbol: 'د.إ', is_active: true },
  { code: 'QAR', name: 'Qatari Riyal', name_ar: 'ريال قطري', symbol: 'ر.ق', is_active: true },
  { code: 'KWD', name: 'Kuwaiti Dinar', name_ar: 'دينار كويتي', symbol: 'د.ك', is_active: true },
  { code: 'BHD', name: 'Bahraini Dinar', name_ar: 'دينار بحريني', symbol: 'د.ب', is_active: true },
  { code: 'OMR', name: 'Omani Rial', name_ar: 'ريال عماني', symbol: 'ر.ع', is_active: true },
  { code: 'JOD', name: 'Jordanian Dinar', name_ar: 'دينار أردني', symbol: 'د.أ', is_active: true },
  { code: 'EGP', name: 'Egyptian Pound', name_ar: 'جنيه مصري', symbol: 'ج.م', is_active: true },
  { code: 'MAD', name: 'Moroccan Dirham', name_ar: 'درهم مغربي', symbol: 'د.م', is_active: true },
  { code: 'IQD', name: 'Iraqi Dinar', name_ar: 'دينار عراقي', symbol: 'د.ع', is_active: true },
  { code: 'LBP', name: 'Lebanese Pound', name_ar: 'ليرة لبنانية', symbol: 'ل.ل', is_active: true },
  { code: 'TND', name: 'Tunisian Dinar', name_ar: 'دينار تونسي', symbol: 'د.ت', is_active: true },
  { code: 'DZD', name: 'Algerian Dinar', name_ar: 'دينار جزائري', symbol: 'د.ج', is_active: true },
];

async function main() {
  console.log('========================================================================');
  console.log('🚀 CURRENCIES MIGRATION & SEEDING: ADD `name_ar` & SEED WORLD CURRENCIES');
  console.log('========================================================================');

  // Step 1: DDL Schema Alterations
  console.log('\n🔧 Step 1: Executing PostgreSQL DDL alterations on currencies table...');
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currencies' AND column_name = 'name_ar'
      ) THEN
        ALTER TABLE public.currencies ADD COLUMN name_ar VARCHAR(100);
      END IF;

      ALTER TABLE public.currencies ALTER COLUMN symbol TYPE VARCHAR(10);

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'currencies' AND indexname = 'currencies_code_key'
      ) THEN
        CREATE UNIQUE INDEX currencies_code_key ON public.currencies (code);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'currencies' AND indexname = 'idx_currencies_name_ar'
      ) THEN
        CREATE INDEX idx_currencies_name_ar ON public.currencies (name_ar);
      END IF;
    END $$;
  `);
  console.log('  ✔ Column "name_ar" added/verified.');
  console.log('  ✔ Column "symbol" expanded to VARCHAR(10).');
  console.log('  ✔ Unique index on "code" and index on "name_ar" verified.');

  // Step 2: Upsert currencies
  console.log(`\n📦 Step 2: Upserting ${MOST_USED_CURRENCIES.length} world & regional currencies...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const curr of MOST_USED_CURRENCIES) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id, code, name, name_ar, symbol FROM public.currencies WHERE code = ${curr.code} LIMIT 1;
    `;

    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE public.currencies 
        SET name = $1, name_ar = $2, symbol = $3, is_active = $4, updated_at = NOW() 
        WHERE code = $5;
      `, curr.name, curr.name_ar, curr.symbol, curr.is_active, curr.code);
      updatedCount++;
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.currencies (id, code, name, name_ar, symbol, is_active, created_at, updated_at) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW());
      `, curr.code, curr.name, curr.name_ar, curr.symbol, curr.is_active);
      insertedCount++;
    }
  }

  console.log(`  ✔ Successfully upserted currencies: ${insertedCount} inserted, ${updatedCount} updated.`);

  // Step 3: Verification & Summary Table
  console.log('\n🔍 Step 3: Verifying currencies in database...');
  const totalRows = await prisma.$queryRaw<any[]>`
    SELECT id, code, name, name_ar, symbol, is_active, updated_at
    FROM public.currencies 
    ORDER BY code ASC;
  `;

  console.log(`\n🎉 Total Currencies in Database: ${totalRows.length}`);
  console.table(totalRows.map(r => ({
    code: r.code,
    name: r.name,
    name_ar: r.name_ar,
    symbol: r.symbol,
    is_active: r.is_active,
  })));
}

main()
  .catch((err) => {
    console.error('❌ Migration/seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
