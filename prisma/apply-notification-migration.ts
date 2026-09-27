import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  console.log('Connected to PostgreSQL successfully.');

  try {
    // 1. Run the migration SQL
    const migrationPath = path.join(
      __dirname,
      'migrations',
      '20260927200000_add_realtime_notifications',
      'migration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 20260927200000_add_realtime_notifications...');
    await client.query(sql);
    console.log('Migration SQL applied successfully.');

    // 2. Data Migration: Migrate existing res_notifications to notifications + notification_recipients
    console.log('Checking for legacy res_notifications data to migrate...');
    const legacyCountRes = await client.query('SELECT COUNT(*) FROM public.res_notifications');
    const legacyCount = parseInt(legacyCountRes.rows[0].count, 10);
    console.log(`Found ${legacyCount} legacy records in res_notifications.`);

    if (legacyCount > 0) {
      console.log('Migrating legacy notifications...');
      const migrateSql = `
        INSERT INTO public.notifications (
          id,
          tenant_id,
          title,
          message,
          type,
          severity,
          priority,
          target_type,
          target_user_id,
          metadata,
          created_at,
          created_by_user_id,
          updated_by_user_id,
          is_active
        )
        SELECT
          rn.id,
          rn.tenant_id,
          rn.title,
          COALESCE(rn.message, ''),
          'system'::public.notification_type_enum,
          'INFO'::public.notification_severity,
          'normal'::public.notification_priority_enum,
          CASE WHEN rn.recipient_id IS NOT NULL THEN 'USER'::public.notification_target_type ELSE 'ALL'::public.notification_target_type END,
          CASE WHEN rn.recipient_id ~ '^[0-9a-fA-F-]{36}$' THEN rn.recipient_id::uuid ELSE NULL END,
          COALESCE(rn.data, '{}'::jsonb),
          COALESCE(rn.created_at, now()),
          rn.created_by_user_id,
          rn.updated_by_user_id,
          true
        FROM public.res_notifications rn
        ON CONFLICT (id) DO NOTHING;
      `;
      await client.query(migrateSql);

      // Create recipients for those with valid recipient_id
      const migrateRecipientsSql = `
        INSERT INTO public.notification_recipients (
          notification_id,
          tenant_id,
          tenant_user_id,
          delivery_status,
          is_read,
          created_at
        )
        SELECT
          rn.id,
          rn.tenant_id,
          rn.recipient_id::uuid,
          'delivered'::public.notification_delivery_status_enum,
          COALESCE(rn.is_read, false),
          COALESCE(rn.created_at, now())
        FROM public.res_notifications rn
        WHERE rn.recipient_id IS NOT NULL
          AND rn.recipient_id ~ '^[0-9a-fA-F-]{36}$'
          AND EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.id = rn.recipient_id::uuid)
        ON CONFLICT (notification_id, tenant_user_id) DO NOTHING;
      `;
      await client.query(migrateRecipientsSql);
      console.log('Legacy notifications data migrated successfully.');
    }

    // 3. Auto-provision default notification channels for all active tenants
    console.log('Auto-provisioning default notification channels for active tenants...');
    const tenantsRes = await client.query('SELECT id, name FROM public.tenants WHERE deleted_at IS NULL');
    console.log(`Found ${tenantsRes.rows.length} tenants.`);

    for (const tenant of tenantsRes.rows) {
      const tenantId = tenant.id;

      // 3.1 Tenant-wide channel: {tenant_id}:all
      await client.query(`
        INSERT INTO public.notification_channels (
          tenant_id,
          code,
          name,
          description,
          channel_type,
          is_active,
          is_system
        )
        VALUES (
          $1,
          'tenant:all',
          'Tenant-Wide Announcements',
          'Broadcasting to all tenant members',
          'tenant_wide'::public.notification_channel_type_enum,
          true,
          true
        )
        ON CONFLICT (tenant_id, code) DO NOTHING;
      `, [tenantId]);

      // 3.2 Role-based channels for all existing roles
      const rolesRes = await client.query('SELECT id, name FROM public.roles WHERE is_active = true');
      for (const role of rolesRes.rows) {
        const roleCode = `role:${role.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
        await client.query(`
          INSERT INTO public.notification_channels (
            tenant_id,
            code,
            name,
            description,
            channel_type,
            target_role_id,
            is_active,
            is_system
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'role_based'::public.notification_channel_type_enum,
            $5,
            true,
            true
          )
          ON CONFLICT (tenant_id, code) DO NOTHING;
        `, [
          tenantId,
          roleCode,
          `Role: ${role.name}`,
          `Channel for users with role ${role.name}`,
          role.id,
        ]);
      }
    }
    console.log('Default notification channels provisioned.');

    // 4. Verification queries
    console.log('\n--- VERIFICATION STATS ---');
    const chCount = await client.query('SELECT COUNT(*) FROM public.notification_channels');
    console.log('notification_channels count:', chCount.rows[0].count);
    const notifCount = await client.query('SELECT COUNT(*) FROM public.notifications');
    console.log('notifications count:', notifCount.rows[0].count);
    const recipCount = await client.query('SELECT COUNT(*) FROM public.notification_recipients');
    console.log('notification_recipients count:', recipCount.rows[0].count);
    const queueCount = await client.query('SELECT COUNT(*) FROM public.notification_publish_queue');
    console.log('notification_publish_queue count:', queueCount.rows[0].count);

    console.log('\nPhase 1 Database migration & auto-provisioning completed successfully! 🎉');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
