-- Migration: 20260927200000_add_realtime_notifications
-- Description: Real-time Multi-tenant Notification & In-App Messaging Engine
--              Adds 6 new enums, extends 2 existing enums, creates 7 new models,
--              links customers and suppliers with notification channels, and enables RLS.

-- 1. EXTEND EXISTING ENUMS
ALTER TYPE "public"."notification_severity" ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'CHANNEL';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'DEPARTMENT';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'ENTITY';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'CUSTOMER_GROUP';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'STORE';
ALTER TYPE "public"."notification_target_type" ADD VALUE IF NOT EXISTS 'WAREHOUSE';

-- 2. CREATE NEW ENUMS
DO $$ BEGIN
    CREATE TYPE "public"."notification_priority_enum" AS ENUM ('low', 'normal', 'high', 'urgent', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."notification_type_enum" AS ENUM ('system', 'admin_message', 'alert', 'announcement', 'task', 'reminder');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."notification_channel_type_enum" AS ENUM ('tenant_wide', 'role_based', 'department_based', 'entity_based', 'user_specific', 'customer_group', 'store_based', 'warehouse_based');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."notification_delivery_status_enum" AS ENUM ('pending', 'dispatched', 'delivered', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."notification_sender_type_enum" AS ENUM ('system', 'admin', 'super_admin', 'service');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."business_event_type_enum" AS ENUM (
        'purchase_order_received',
        'purchase_order_approved',
        'purchase_order_rejected',
        'product_added',
        'product_updated',
        'product_expiring_soon',
        'product_expired',
        'supplier_added',
        'supplier_updated',
        'customer_added',
        'customer_updated',
        'stock_low',
        'stock_reorder_needed',
        'stock_received',
        'stock_adjustment',
        'stock_transfer',
        'sales_order_created',
        'sales_invoice_created',
        'sales_return_created',
        'payment_received',
        'user_registered',
        'user_role_changed',
        'system_maintenance',
        'subscription_expiring',
        'custom'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. CREATE NOTIFICATION_CHANNELS TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "channel_type" "public"."notification_channel_type_enum" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "target_role_id" UUID,
    "target_branch_id" UUID,
    "target_store_id" UUID,
    "target_warehouse_id" UUID,
    "target_customer_group_id" UUID,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notification_channels_tenant_code" UNIQUE ("tenant_id", "code"),
    CONSTRAINT "fk_notif_chan_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_chan_role" FOREIGN KEY ("target_role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_notif_chan_branch" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_notif_chan_store" FOREIGN KEY ("target_store_id") REFERENCES "public"."stores"("store_id") ON DELETE SET NULL,
    CONSTRAINT "fk_notif_chan_warehouse" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_notif_chan_cust_group" FOREIGN KEY ("target_customer_group_id") REFERENCES "public"."customer_groups"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_notif_chan_tenant_type_active" ON "public"."notification_channels" ("tenant_id", "channel_type", "is_active");
CREATE INDEX IF NOT EXISTS "idx_notif_chan_tenant_role" ON "public"."notification_channels" ("tenant_id", "target_role_id");
CREATE INDEX IF NOT EXISTS "idx_notif_chan_tenant_branch" ON "public"."notification_channels" ("tenant_id", "target_branch_id");

-- 4. ADD NOTIFICATION_CHANNEL_ID TO CUSTOMERS & SUPPLIERS
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'notification_channel_id'
    ) THEN
        ALTER TABLE "public"."customers" ADD COLUMN "notification_channel_id" UUID;
        ALTER TABLE "public"."customers" ADD CONSTRAINT "fk_customers_notif_chan" 
            FOREIGN KEY ("notification_channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'notification_channel_id'
    ) THEN
        ALTER TABLE "public"."suppliers" ADD COLUMN "notification_channel_id" UUID;
        ALTER TABLE "public"."suppliers" ADD CONSTRAINT "fk_suppliers_notif_chan" 
            FOREIGN KEY ("notification_channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 5. CREATE NOTIFICATION_CHANNEL_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_channel_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_channel_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_user_id" UUID,
    "customer_id" UUID,
    "supplier_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_channel_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notif_chan_mem_user" UNIQUE ("notification_channel_id", "tenant_user_id"),
    CONSTRAINT "uq_notif_chan_mem_customer" UNIQUE ("notification_channel_id", "customer_id"),
    CONSTRAINT "uq_notif_chan_mem_supplier" UNIQUE ("notification_channel_id", "supplier_id"),
    CONSTRAINT "fk_notif_mem_channel" FOREIGN KEY ("notification_channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_mem_user" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_mem_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_mem_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notif_mem_tenant_user_active" ON "public"."notification_channel_members" ("tenant_id", "tenant_user_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_notif_mem_tenant_customer" ON "public"."notification_channel_members" ("tenant_id", "customer_id");
CREATE INDEX IF NOT EXISTS "idx_notif_mem_tenant_supplier" ON "public"."notification_channel_members" ("tenant_id", "supplier_id");

-- 6. CREATE NOTIFICATION_TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "title_template" VARCHAR(255) NOT NULL,
    "message_template" TEXT NOT NULL,
    "type" "public"."notification_type_enum" NOT NULL DEFAULT 'system',
    "severity" "public"."notification_severity" NOT NULL DEFAULT 'INFO',
    "priority" "public"."notification_priority_enum" NOT NULL DEFAULT 'normal',
    "variables" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notif_templates_tenant_code" UNIQUE ("tenant_id", "code")
);

CREATE INDEX IF NOT EXISTS "idx_notif_templates_tenant_active" ON "public"."notification_templates" ("tenant_id", "is_active");

-- 7. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."notification_type_enum" NOT NULL DEFAULT 'system',
    "severity" "public"."notification_severity" NOT NULL DEFAULT 'INFO',
    "priority" "public"."notification_priority_enum" NOT NULL DEFAULT 'normal',
    "target_type" "public"."notification_target_type" NOT NULL DEFAULT 'ALL',
    "notification_channel_id" UUID,
    "target_role_id" UUID,
    "target_user_id" UUID,
    "target_customer_id" UUID,
    "target_supplier_id" UUID,
    "target_branch_id" UUID,
    "target_store_id" UUID,
    "target_warehouse_id" UUID,
    "sender_type" "public"."notification_sender_type_enum" NOT NULL DEFAULT 'system',
    "sender_user_id" UUID,
    "sender_name" VARCHAR(200),
    "business_event_type" "public"."business_event_type_enum",
    "source_entity_type" VARCHAR(100),
    "source_entity_id" UUID,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "idempotency_key" VARCHAR(255),
    "template_id" UUID,
    "action_url" VARCHAR(500),
    "action_label" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notifications_tenant_idempotency" UNIQUE ("tenant_id", "idempotency_key"),
    CONSTRAINT "fk_notifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notifications_channel" FOREIGN KEY ("notification_channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_notifications_template" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_created" ON "public"."notifications" ("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_type_sev" ON "public"."notifications" ("tenant_id", "type", "severity");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_target" ON "public"."notifications" ("tenant_id", "target_type");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_biz_event" ON "public"."notifications" ("tenant_id", "business_event_type");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_channel" ON "public"."notifications" ("tenant_id", "notification_channel_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_active_archived" ON "public"."notifications" ("tenant_id", "is_active", "is_archived");

-- 8. CREATE NOTIFICATION_RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_user_id" UUID,
    "customer_id" UUID,
    "supplier_id" UUID,
    "delivery_status" "public"."notification_delivery_status_enum" NOT NULL DEFAULT 'pending',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "dispatched_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notif_recip_user" UNIQUE ("notification_id", "tenant_user_id"),
    CONSTRAINT "uq_notif_recip_customer" UNIQUE ("notification_id", "customer_id"),
    CONSTRAINT "uq_notif_recip_supplier" UNIQUE ("notification_id", "supplier_id"),
    CONSTRAINT "fk_notif_recip_notification" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_recip_user" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_recip_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_recip_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notif_recip_user_read" ON "public"."notification_recipients" ("tenant_id", "tenant_user_id", "is_read", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_notif_recip_user_status" ON "public"."notification_recipients" ("tenant_id", "tenant_user_id", "delivery_status");
CREATE INDEX IF NOT EXISTS "idx_notif_recip_cust_read" ON "public"."notification_recipients" ("tenant_id", "customer_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notif_recip_supp_read" ON "public"."notification_recipients" ("tenant_id", "supplier_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notif_recip_status_retry" ON "public"."notification_recipients" ("delivery_status", "retry_count");

-- 9. CREATE NOTIFICATION_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tenant_user_id" UUID NOT NULL,
    "notification_channel_id" UUID,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "mute_until" TIMESTAMPTZ(6),
    "min_severity" "public"."notification_severity" NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_notif_pref_user_channel" UNIQUE ("tenant_user_id", "notification_channel_id"),
    CONSTRAINT "fk_notif_pref_user" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notif_pref_channel" FOREIGN KEY ("notification_channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notif_pref_tenant_user" ON "public"."notification_preferences" ("tenant_id", "tenant_user_id");

-- 10. CREATE NOTIFICATION_PUBLISH_QUEUE (OUTBOX) TABLE
CREATE TABLE IF NOT EXISTS "public"."notification_publish_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."notification_delivery_status_enum" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_retry_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_publish_queue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_notif_queue_status_retry" ON "public"."notification_publish_queue" ("status", "next_retry_at");
CREATE INDEX IF NOT EXISTS "idx_notif_queue_tenant_status" ON "public"."notification_publish_queue" ("tenant_id", "status");

-- 11. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE "public"."notification_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_channel_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_publish_queue" ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES (Tenant Isolation)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_channels') THEN
        CREATE POLICY "tenant_isolation_notification_channels" ON "public"."notification_channels"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_channel_members') THEN
        CREATE POLICY "tenant_isolation_notification_channel_members" ON "public"."notification_channel_members"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_templates') THEN
        CREATE POLICY "tenant_isolation_notification_templates" ON "public"."notification_templates"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notifications') THEN
        CREATE POLICY "tenant_isolation_notifications" ON "public"."notifications"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_recipients') THEN
        CREATE POLICY "tenant_isolation_notification_recipients" ON "public"."notification_recipients"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_preferences') THEN
        CREATE POLICY "tenant_isolation_notification_preferences" ON "public"."notification_preferences"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_notification_publish_queue') THEN
        CREATE POLICY "tenant_isolation_notification_publish_queue" ON "public"."notification_publish_queue"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
END $$;
