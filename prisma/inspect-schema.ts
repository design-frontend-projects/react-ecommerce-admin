import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const pt = await prisma.product_types.findMany();
  console.log('PRODUCT TYPES:', pt);

  const prodCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'products'
    ORDER BY ordinal_position;
  `;
  console.log('\nPRODUCTS COLUMNS:');
  for (const col of prodCols) {
    console.log(`- ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default})`);
  }

  const varCols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'product_variants'
    ORDER BY ordinal_position;
  `;
  console.log('\nPRODUCT_VARIANTS COLUMNS:');
  for (const col of varCols) {
    console.log(`- ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
