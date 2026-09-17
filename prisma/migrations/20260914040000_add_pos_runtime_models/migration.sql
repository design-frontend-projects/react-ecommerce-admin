-- =============================================================================
-- Migration: Add POS Runtime Models
-- Description: Creates pos_terminal_users, pos_sessions, pos_cash_movements,
--              sales_order_payments, pos_held_orders tables and extends
--              pos_terminals, sales_orders, sales_order_items with POS columns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add new enum for held order status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE held_order_status_enum AS ENUM ('held', 'resumed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Extend pos_terminals with branch_id, warehouse_id, default_price_list_id
-- ---------------------------------------------------------------------------
ALTER TABLE "pos_terminals"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "warehouse_id" UUID REFERENCES "warehouses"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "default_price_list_id" UUID REFERENCES "price_list"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "idx_pos_terminals_tenant" ON "pos_terminals" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pos_terminals_store" ON "pos_terminals" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_pos_terminals_branch" ON "pos_terminals" ("branch_id");

-- ---------------------------------------------------------------------------
-- 3. Extend sales_orders with POS references
-- ---------------------------------------------------------------------------
ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "pos_terminal_id" UUID REFERENCES "pos_terminals"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "pos_session_id" UUID,
  ADD COLUMN IF NOT EXISTS "payment_status" "payment_status_enum" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sales_orders_idempotency"
  ON "sales_orders" ("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_sales_orders_pos_terminal" ON "sales_orders" ("pos_terminal_id");
CREATE INDEX IF NOT EXISTS "idx_sales_orders_pos_session" ON "sales_orders" ("pos_session_id");

-- ---------------------------------------------------------------------------
-- 4. Extend sales_order_items with unit_cost, tax_rate_id
-- ---------------------------------------------------------------------------
ALTER TABLE "sales_order_items"
  ADD COLUMN IF NOT EXISTS "unit_cost" DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_rate_id" UUID;

-- ---------------------------------------------------------------------------
-- 5. Create pos_terminal_users (cashier authorization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pos_terminal_users" (
  "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID        NOT NULL,
  "terminal_id"        UUID        NOT NULL REFERENCES "pos_terminals"("id") ON DELETE CASCADE,
  "user_id"            UUID        NOT NULL,
  "is_active"          BOOLEAN     NOT NULL DEFAULT true,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "pos_terminal_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_terminal_users_terminal_user_unique" UNIQUE ("terminal_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_pos_terminal_users_tenant" ON "pos_terminal_users" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pos_terminal_users_user" ON "pos_terminal_users" ("user_id");

-- ---------------------------------------------------------------------------
-- 6. Create pos_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pos_sessions" (
  "id"                 UUID                   NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID                   NOT NULL,
  "terminal_id"        UUID                   NOT NULL REFERENCES "pos_terminals"("id") ON DELETE CASCADE,
  "cashier_id"         UUID                   NOT NULL,
  "status"             "session_status_enum"  NOT NULL DEFAULT 'open',
  "opening_cash"       DECIMAL(18,4)          NOT NULL DEFAULT 0,
  "expected_cash"      DECIMAL(18,4)          NOT NULL DEFAULT 0,
  "actual_cash"        DECIMAL(18,4),
  "cash_difference"    DECIMAL(18,4),
  "opened_at"          TIMESTAMPTZ(6)         NOT NULL DEFAULT now(),
  "closed_at"          TIMESTAMPTZ(6),
  "notes"              TEXT,
  "created_at"         TIMESTAMPTZ(6)         NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6)         NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant" ON "pos_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_terminal" ON "pos_sessions" ("terminal_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_cashier" ON "pos_sessions" ("cashier_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_status" ON "pos_sessions" ("tenant_id", "status");

-- Now add FK from sales_orders.pos_session_id to pos_sessions
ALTER TABLE "sales_orders"
  ADD CONSTRAINT "sales_orders_pos_session_fk"
  FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 7. Create pos_cash_movements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pos_cash_movements" (
  "id"                 UUID                         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID                         NOT NULL,
  "session_id"         UUID                         NOT NULL REFERENCES "pos_sessions"("id") ON DELETE CASCADE,
  "type"               "cash_movement_type_enum"    NOT NULL,
  "reason"             "cash_movement_reason_enum"  NOT NULL,
  "amount"             DECIMAL(18,4)                NOT NULL DEFAULT 0,
  "reference_type"     VARCHAR(50),
  "reference_id"       UUID,
  "notes"              TEXT,
  "created_at"         TIMESTAMPTZ(6)               NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6)               NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "pos_cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_pos_cash_movements_session" ON "pos_cash_movements" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_pos_cash_movements_tenant" ON "pos_cash_movements" ("tenant_id");

-- ---------------------------------------------------------------------------
-- 8. Create sales_order_payments (split/mixed payments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sales_order_payments" (
  "id"                 UUID                         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID                         NOT NULL,
  "sales_order_id"     UUID                         NOT NULL,
  "session_id"         UUID                         REFERENCES "pos_sessions"("id") ON DELETE SET NULL,
  "payment_method"     "payment_method_type_enum"   NOT NULL DEFAULT 'cash',
  "amount"             DECIMAL(18,4)                NOT NULL DEFAULT 0,
  "currency"           CHAR(3)                      NOT NULL DEFAULT 'USD',
  "status"             "payment_status_enum"        NOT NULL DEFAULT 'completed',
  "reference_number"   VARCHAR(100),
  "notes"              TEXT,
  "created_at"         TIMESTAMPTZ(6)               NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6)               NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "sales_order_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sales_order_payments_order" ON "sales_order_payments" ("sales_order_id");
CREATE INDEX IF NOT EXISTS "idx_sales_order_payments_session" ON "sales_order_payments" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_sales_order_payments_tenant" ON "sales_order_payments" ("tenant_id");

-- ---------------------------------------------------------------------------
-- 9. Create pos_held_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pos_held_orders" (
  "id"                 UUID                      NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID                      NOT NULL,
  "terminal_id"        UUID                      NOT NULL REFERENCES "pos_terminals"("id") ON DELETE CASCADE,
  "session_id"         UUID                      NOT NULL REFERENCES "pos_sessions"("id") ON DELETE CASCADE,
  "customer_id"        UUID,
  "hold_reference"     VARCHAR(100)              NOT NULL,
  "cart_data"          JSONB                     NOT NULL DEFAULT '{}',
  "subtotal"           DECIMAL(18,4)             NOT NULL DEFAULT 0,
  "tax_amount"         DECIMAL(18,4)             NOT NULL DEFAULT 0,
  "discount_amount"    DECIMAL(18,4)             NOT NULL DEFAULT 0,
  "total_amount"       DECIMAL(18,4)             NOT NULL DEFAULT 0,
  "status"             "held_order_status_enum"  NOT NULL DEFAULT 'held',
  "notes"              TEXT,
  "created_at"         TIMESTAMPTZ(6)            NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6)            NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "pos_held_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_pos_held_orders_session" ON "pos_held_orders" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_pos_held_orders_terminal" ON "pos_held_orders" ("terminal_id");
CREATE INDEX IF NOT EXISTS "idx_pos_held_orders_tenant_status" ON "pos_held_orders" ("tenant_id", "status");

-- ---------------------------------------------------------------------------
-- 10. Enable Row Level Security on all new tables
-- ---------------------------------------------------------------------------
ALTER TABLE "pos_terminal_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_cash_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales_order_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_held_orders" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tenant isolation via tenant_id
CREATE POLICY "tenant_isolation_pos_terminal_users" ON "pos_terminal_users"
  USING ("tenant_id" = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "tenant_isolation_pos_sessions" ON "pos_sessions"
  USING ("tenant_id" = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "tenant_isolation_pos_cash_movements" ON "pos_cash_movements"
  USING ("tenant_id" = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "tenant_isolation_sales_order_payments" ON "sales_order_payments"
  USING ("tenant_id" = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "tenant_isolation_pos_held_orders" ON "pos_held_orders"
  USING ("tenant_id" = (current_setting('app.current_tenant_id', true))::uuid);
