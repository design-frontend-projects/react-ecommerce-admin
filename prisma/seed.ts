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
    {
      code: 'FREE_TRIAL',
      name: 'Free Trial',
      description: '14-day full access trial for new restaurants & stores',
      tier: 'free_trial' as const,
      billing_interval: 'day' as const,
      duration_months: 1,
      trial_period_days: 14,
      grace_period_days: 3,
      price: 0.0,
      currency: 'LE',
      max_branches: 1,
      max_users: 2,
      max_stores: 1,
      max_warehouses: 1,
      max_products: 100,
      max_tables: 10,
      max_pos_registers: 1,
      max_monthly_orders: 200,
      max_storage_mb: 256,
      has_restaurant_pos: true,
      has_inventory_tracking: true,
      has_kitchen_display: false,
      has_delivery_management: false,
      has_api_access: false,
      has_advanced_reports: false,
      has_audit_logs: false,
      has_priority_support: false,
      allowed_modules: ['inventory' as const, 'restaurant' as const],
      features: ['1 Branch', '2 Users', 'Basic POS', '100 Products Catalog', '14-Day Free Trial'],
      is_active: true,
      is_public: true,
      sort_order: 1,
    },
    {
      code: 'STARTER_MONTHLY',
      name: 'Monthly Starter',
      description: 'Essential POS and inventory for small shops and single restaurants',
      tier: 'starter' as const,
      billing_interval: 'month' as const,
      duration_months: 1,
      price: 19.99,
      currency: 'LE',
      max_branches: 1,
      max_users: 3,
      max_stores: 1,
      max_warehouses: 1,
      max_products: 500,
      max_tables: 20,
      max_pos_registers: 2,
      max_monthly_orders: 1000,
      max_storage_mb: 1024,
      has_restaurant_pos: true,
      has_inventory_tracking: true,
      has_kitchen_display: false,
      has_delivery_management: false,
      has_api_access: false,
      has_advanced_reports: false,
      has_audit_logs: false,
      has_priority_support: false,
      allowed_modules: ['inventory' as const, 'restaurant' as const],
      features: ['1 Branch', 'Up to 3 Users', '2 POS Registers', '500 Products', 'Email Support'],
      is_active: true,
      is_public: true,
      sort_order: 2,
    },
    {
      code: 'QUARTERLY_PRO',
      name: 'Quarterly Pro',
      description: 'Advanced restaurant operations with multi-user access and KDS',
      tier: 'growth' as const,
      billing_interval: 'quarter' as const,
      duration_months: 3,
      price: 49.99,
      currency: 'LE',
      discount_percentage: 15,
      max_branches: 2,
      max_users: 10,
      max_stores: 2,
      max_warehouses: 2,
      max_products: 2500,
      max_tables: 50,
      max_pos_registers: 5,
      max_monthly_orders: 5000,
      max_storage_mb: 5120,
      has_restaurant_pos: true,
      has_inventory_tracking: true,
      has_kitchen_display: true,
      has_delivery_management: true,
      has_api_access: false,
      has_advanced_reports: true,
      has_audit_logs: true,
      has_priority_support: false,
      allowed_modules: ['inventory' as const, 'restaurant' as const],
      features: ['2 Branches', '10 Users', 'Kitchen Display System (KDS)', 'Advanced Reporting', 'Delivery Dispatch'],
      is_active: true,
      is_public: true,
      is_popular: true,
      sort_order: 3,
    },
    {
      code: 'SEMI_ANNUAL_BUSINESS',
      name: 'Semi-Annual Business',
      description: 'Full multi-branch control with high-volume order throughput',
      tier: 'professional' as const,
      billing_interval: 'half_year' as const,
      duration_months: 6,
      price: 89.99,
      currency: 'LE',
      discount_percentage: 25,
      max_branches: 5,
      max_users: 25,
      max_stores: 5,
      max_warehouses: 5,
      max_products: 10000,
      max_tables: 150,
      max_pos_registers: 15,
      max_monthly_orders: 20000,
      max_storage_mb: 15360,
      has_restaurant_pos: true,
      has_inventory_tracking: true,
      has_kitchen_display: true,
      has_delivery_management: true,
      has_api_access: true,
      has_advanced_reports: true,
      has_audit_logs: true,
      has_priority_support: true,
      allowed_modules: ['inventory' as const, 'restaurant' as const],
      features: ['5 Branches', '25 Users', 'Unlimited Kitchen Displays', 'API & Webhooks', 'Priority 24/7 Support'],
      is_active: true,
      is_public: true,
      sort_order: 4,
    },
    {
      code: 'ANNUAL_ENTERPRISE',
      name: 'Annual Enterprise',
      description: 'Unlimited enterprise capability for large restaurant chains and franchises',
      tier: 'enterprise' as const,
      billing_interval: 'year' as const,
      duration_months: 12,
      price: 159.99,
      currency: 'LE',
      discount_percentage: 35,
      max_branches: -1, // -1 means Unlimited
      max_users: -1,
      max_stores: -1,
      max_warehouses: -1,
      max_products: -1,
      max_tables: -1,
      max_pos_registers: -1,
      max_monthly_orders: -1,
      max_storage_mb: 51200,
      has_restaurant_pos: true,
      has_inventory_tracking: true,
      has_kitchen_display: true,
      has_delivery_management: true,
      has_api_access: true,
      has_advanced_reports: true,
      has_audit_logs: true,
      has_priority_support: true,
      allowed_modules: ['inventory' as const, 'restaurant' as const],
      features: ['Unlimited Branches', 'Unlimited Users & POS Registers', 'Dedicated Account Manager', 'Custom Integrations', '99.99% SLA'],
      is_active: true,
      is_public: true,
      sort_order: 5,
    },
  ];

  for (const plan of defaultPlans) {
    const existing = await prisma.subscriptions.findFirst({
      where: {
        OR: [
          { name: plan.name },
          { code: plan.code },
        ],
      },
    });
    if (!existing) {
      const created = await prisma.subscriptions.create({
        data: plan,
      });
      console.log(`Created default subscription plan: ${plan.name} (${plan.duration_months} months, id: ${created.id})`);
    } else {
      await prisma.subscriptions.update({
        where: { id: existing.id },
        data: {
          code: plan.code,
          description: plan.description,
          tier: plan.tier,
          billing_interval: plan.billing_interval,
          max_branches: plan.max_branches,
          max_users: plan.max_users,
          max_stores: plan.max_stores,
          max_warehouses: plan.max_warehouses,
          max_products: plan.max_products,
          max_tables: plan.max_tables,
          max_pos_registers: plan.max_pos_registers,
          max_monthly_orders: plan.max_monthly_orders,
          max_storage_mb: plan.max_storage_mb,
          has_restaurant_pos: plan.has_restaurant_pos,
          has_inventory_tracking: plan.has_inventory_tracking,
          has_kitchen_display: plan.has_kitchen_display,
          has_delivery_management: plan.has_delivery_management,
          has_api_access: plan.has_api_access,
          has_advanced_reports: plan.has_advanced_reports,
          has_audit_logs: plan.has_audit_logs,
          has_priority_support: plan.has_priority_support,
          allowed_modules: plan.allowed_modules,
          features: plan.features,
          is_active: plan.is_active,
          is_public: plan.is_public,
          sort_order: plan.sort_order,
        },
      });
      console.log(`Updated subscription plan with limits: ${plan.name} (max_branches: ${plan.max_branches}, max_users: ${plan.max_users})`);
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
