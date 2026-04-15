import { prisma } from './src/lib/prisma';
async function run() {
  await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema'`);
  console.log('done');
}
run().finally(() => prisma.$disconnect());
