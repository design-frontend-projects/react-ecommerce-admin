import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { calculateEndDate } from '../src/lib/subscription_utils';

async function main() {
  // 1. Seed activity types
  const activityTypes = [
    { code: 'USER_LOGIN', name: 'User Login', description: 'User successfully logged in' },
    { code: 'USER_LOGOUT', name: 'User Logout', description: 'User successfully logged out' },
    { code: 'ITEM_CREATED', name: 'Item Created', description: 'A new item was created' },
    { code: 'ITEM_UPDATED', name: 'Item Updated', description: 'An item was updated' },
    { code: 'ITEM_DELETED', name: 'Item Deleted', description: 'An item was deleted' },
    { code: 'SETTINGS_UPDATED', name: 'Settings Updated', description: 'System settings were updated' },
  ];

  console.log('Start seeding activity types...');
  for (const activityType of activityTypes) {
    const existing = await prisma.activity_types.findFirst({
      where: { code: activityType.code },
    });
    if (!existing) {
      const act = await prisma.activity_types.create({
        data: activityType,
      });
      console.log(`Created activity type with id: ${act.id}`);
    } else {
      console.log(`Activity type already exists: ${activityType.code}`);
    }
  }

  // 2. Ensure baseline subscription plans exist
  console.log('\nChecking default subscription plans...');
  const defaultPlans = [
    { name: 'Monthly Starter', duration_months: 1, price: 19.99 },
    { name: 'Quarterly Pro', duration_months: 3, price: 49.99 },
    { name: 'Semi-Annual Business', duration_months: 6, price: 89.99 },
    { name: 'Annual Enterprise', duration_months: 12, price: 159.99 },
  ];

  for (const plan of defaultPlans) {
    const existing = await prisma.subscriptions.findFirst({
      where: { name: plan.name },
    });
    if (!existing) {
      const created = await prisma.subscriptions.create({
        data: plan,
      });
      console.log(`Created default subscription plan: ${plan.name} (${plan.duration_months} months, id: ${created.id})`);
    } else {
      console.log(`Subscription plan already exists: ${plan.name} (${plan.duration_months} months)`);
    }
  }

  // 3. Alter and recalculate end_date for all existing rows in tenant_subscriptions table
  console.log('\nStart updating existing rows in tenant_subscriptions table...');
  const tenantSubscriptions = await prisma.tenant_subscriptions.findMany({
    include: {
      subscriptions: true,
    },
  });

  console.log(`Found ${tenantSubscriptions.length} tenant_subscriptions records to process.`);

  let updatedCount = 0;
  for (const sub of tenantSubscriptions) {
    const startDate = sub.start_date || sub.created_at || new Date();
    let durationMonths = sub.subscriptions?.duration_months;

    if (!durationMonths) {
      const fallbackPlan = await prisma.subscriptions.findFirst({
        orderBy: { duration_months: 'asc' },
      });
      durationMonths = fallbackPlan?.duration_months ?? 1;
    }

    const calculatedEndDate = calculateEndDate(startDate, durationMonths);

    await prisma.tenant_subscriptions.update({
      where: { id: sub.id },
      data: {
        start_date: startDate,
        end_date: calculatedEndDate,
      },
    });

    updatedCount++;
    console.log(
      `✓ Updated tenant_subscription ${sub.id}: start_date=${new Date(startDate).toISOString().split('T')[0]}, duration=${durationMonths}m, end_date=${calculatedEndDate.toISOString().split('T')[0]}`
    );
  }

  console.log(`\nSuccessfully updated ${updatedCount} tenant_subscriptions records.`);

  // 4. Seed system lookup catalogs and default values
  console.log('\nStart seeding lookup master catalogs...');
  const { seedLookups } = await import('../src/server/seed/lookups-seed');
  await seedLookups();

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
