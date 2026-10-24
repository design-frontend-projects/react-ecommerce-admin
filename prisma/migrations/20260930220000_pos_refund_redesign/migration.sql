-- ============================================================================
-- Migration: 20260930220000_pos_refund_redesign
-- Description: Production-grade POS Refund & Return Redesign
--   1. Creates new refund-specific enums (refund_status_enum, refund_method_enum,
--      refund_inventory_return_status_enum, refund_approval_level_enum, return_disposition_enum)
--   2. Extends business_event_type_enum with refund events
--   3. Redesigns the refunds table with full lifecycle, financial, authorization,
--      inventory, and audit tracking
--   4. Creates refund_items table with item-level quantities, pricing snapshot,
--      condition and disposition routing
--   5. Creates pos_user_pins table for secure bcrypt-hashed POS user PINs
--   6. Enables RLS and tenant-isolation policies
-- ============================================================================

-- ─── 1. CREATE ENUMS ─────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "public"."refund_status_enum" AS ENUM (
        'draft',
        'requested',
        'pending_approval',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."refund_method_enum" AS ENUM (
        'cash',
        'card',
        'original_payment_method',
        'store_credit',
        'customer_wallet',
        'bank_transfer',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."refund_inventory_return_status_enum" AS ENUM (
        'not_required',
        'pending',
        'received',
        'partially_received',
        'completed',
        'failed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."refund_approval_level_enum" AS ENUM (
        'none',
        'supervisor',
        'manager',
        'top_management'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."return_disposition_enum" AS ENUM (
        'resalable',
        'damaged',
        'quarantine',
        'defective',
        'expired',
        'scrap'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── 2. EXTEND BUSINESS EVENT ENUM ──────────────────────────────────────────

ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_requested';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_approval_required';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_approved';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_rejected';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_processing';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_completed';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_failed';
ALTER TYPE "public"."business_event_type_enum" ADD VALUE IF NOT EXISTS 'refund_cancelled';

-- ─── 3. REDESIGN REFUNDS TABLE ──────────────────────────────────────────────

DROP TABLE IF EXISTS "public"."refunds" CASCADE;

CREATE TABLE "public"."refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,

    -- Identifiers
    "refund_number" VARCHAR(50) NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "store_id" UUID,
    "branch_id" UUID,
    "pos_terminal_id" UUID,
    "customer_id" UUID,

    -- Status & Lifecycle
    "status" "public"."refund_status_enum" NOT NULL DEFAULT 'draft',

    -- Financial
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "requested_amount" NUMERIC(18, 4) NOT NULL DEFAULT 0,
    "approved_amount" NUMERIC(18, 4) NOT NULL DEFAULT 0,
    "refunded_amount" NUMERIC(18, 4) NOT NULL DEFAULT 0,

    -- Method
    "refund_method" "public"."refund_method_enum",
    "original_payment_method" VARCHAR(50),
    "refund_reference" VARCHAR(255),

    -- Reason & Notes
    "reason" VARCHAR(500),
    "notes" TEXT,

    -- Authorization
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "approval_level" "public"."refund_approval_level_enum" NOT NULL DEFAULT 'none',
    "approval_reason" TEXT,

    -- Lifecycle Timestamps & Actors
    "requested_at" TIMESTAMPTZ(6),
    "requested_by_user_id" UUID,

    "submitted_at" TIMESTAMPTZ(6),
    "submitted_by_user_id" UUID,

    "approved_at" TIMESTAMPTZ(6),
    "approved_by_user_id" UUID,

    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by_user_id" UUID,
    "rejection_reason" TEXT,

    "processed_at" TIMESTAMPTZ(6),
    "processed_by_user_id" UUID,

    "completed_at" TIMESTAMPTZ(6),
    "completed_by_user_id" UUID,

    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_user_id" UUID,
    "cancellation_reason" TEXT,

    -- Inventory Return
    "inventory_return_required" BOOLEAN NOT NULL DEFAULT true,
    "inventory_return_status" "public"."refund_inventory_return_status_enum" NOT NULL DEFAULT 'not_required',
    "inventory_transaction_id" UUID,

    -- Concurrency & Idempotency
    "version" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(128),

    -- Extensibility
    "metadata" JSONB DEFAULT '{}'::jsonb,

    -- Audit
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_refunds_sales_invoice" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT "uq_refund_number" UNIQUE ("tenant_id", "refund_number"),
    CONSTRAINT "uq_refund_idempotency" UNIQUE ("idempotency_key")
);

CREATE INDEX IF NOT EXISTS "idx_refund_tenant_status" ON "public"."refunds" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_refund_tenant_invoice" ON "public"."refunds" ("tenant_id", "sales_invoice_id");
CREATE INDEX IF NOT EXISTS "idx_refund_tenant_store" ON "public"."refunds" ("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "idx_refund_tenant_created" ON "public"."refunds" ("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_refund_tenant_requester" ON "public"."refunds" ("tenant_id", "requested_by_user_id");

-- ─── 4. CREATE REFUND_ITEMS TABLE ───────────────────────────────────────────

CREATE TABLE "public"."refund_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,

    "refund_id" UUID NOT NULL,
    "sales_invoice_item_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,

    -- Quantities
    "original_quantity" NUMERIC(18, 4) NOT NULL,
    "previously_refunded_qty" NUMERIC(18, 4) NOT NULL DEFAULT 0,
    "refund_quantity" NUMERIC(18, 4) NOT NULL,

    -- Financial
    "unit_price" NUMERIC(18, 4) NOT NULL,
    "discount_amount" NUMERIC(18, 4) NOT NULL DEFAULT 0,
    "tax_amount" NUMERIC(18, 4) NOT NULL DEFAULT 0,
    "refund_amount" NUMERIC(18, 4) NOT NULL,

    -- Return Info
    "reason" TEXT,
    "condition" "public"."stock_condition_enum",
    "disposition" "public"."return_disposition_enum",

    -- Snapshots
    "sku_snapshot" VARCHAR(100),
    "product_name_snapshot" VARCHAR(255),
    "variant_name_snapshot" VARCHAR(255),

    -- Audit
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_by_user_id" UUID,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_refund_items_refund" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_refund_item_tenant_refund" ON "public"."refund_items" ("tenant_id", "refund_id");
CREATE INDEX IF NOT EXISTS "idx_refund_item_tenant_inv_item" ON "public"."refund_items" ("tenant_id", "sales_invoice_item_id");
CREATE INDEX IF NOT EXISTS "idx_refund_item_tenant_variant" ON "public"."refund_items" ("tenant_id", "product_variant_id");

-- ─── 5. CREATE POS_USER_PINS TABLE ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."pos_user_pins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tenant_user_id" UUID NOT NULL,
    "pin_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "pos_user_pins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_pos_user_pins_tenant_user" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uq_pos_user_pins_tenant_user_id" UNIQUE ("tenant_user_id"),
    CONSTRAINT "uq_pos_user_pins_tenant_user" UNIQUE ("tenant_id", "tenant_user_id")
);

CREATE INDEX IF NOT EXISTS "idx_pos_user_pins_tenant" ON "public"."pos_user_pins" ("tenant_id");

-- ─── 6. ENABLE ROW-LEVEL SECURITY & POLICIES ────────────────────────────────

ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."refund_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pos_user_pins" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_refunds') THEN
        CREATE POLICY "tenant_isolation_refunds" ON "public"."refunds"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_refund_items') THEN
        CREATE POLICY "tenant_isolation_refund_items" ON "public"."refund_items"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_pos_user_pins') THEN
        CREATE POLICY "tenant_isolation_pos_user_pins" ON "public"."pos_user_pins"
            AS PERMISSIVE FOR ALL
            USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
    END IF;
END $$;
