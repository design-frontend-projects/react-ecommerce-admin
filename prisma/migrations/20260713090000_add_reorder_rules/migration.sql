BEGIN;



-- =============================================================================
-- Reorder rules + suggestions (replenishment engine).
-- One rule per (variant, store). run_reorder_check() (20260713150000) compares
-- qty_available + on-order against reorder_point and upserts open suggestions,
-- which convert into purchase_requisitions (source='reorder_engine').
-- Replaces the legacy inventory-table-based checkAndTriggerReorder().
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'reorder_suggestion_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "reorder_suggestion_status_enum" AS ENUM ('open', 'converted', 'dismissed', 'expired');
  END IF;
END $do$;



CREATE TABLE IF NOT EXISTS "reorder_rules" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "product_variant_id"    UUID NOT NULL,
  "store_id"              UUID NOT NULL,
  "min_qty"               DECIMAL(18,4),
  "max_qty"               DECIMAL(18,4),
  "safety_stock"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reorder_point"         DECIMAL(18,4) NOT NULL,
  "reorder_qty"           DECIMAL(18,4),
  "eoq"                   DECIMAL(18,4),
  "lead_time_days"        INTEGER,
  "preferred_supplier_id" INTEGER,
  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"          UUID DEFAULT auth.uid(),
  CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reorder_rules_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reorder_rules_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reorder_rules_preferred_supplier_id_fkey"
    FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers" ("supplier_id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_reorder_rules_variant_store" ON "reorder_rules" ("product_variant_id", "store_id");

CREATE INDEX IF NOT EXISTS "idx_reorder_rules_tenant_id" ON "reorder_rules" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_reorder_rules_store_id" ON "reorder_rules" ("store_id");

CREATE INDEX IF NOT EXISTS "idx_reorder_rules_active" ON "reorder_rules" ("is_active") WHERE ("is_active" = true);



CREATE TABLE IF NOT EXISTS "reorder_suggestions" (
  "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                UUID NOT NULL,
  "reorder_rule_id"          UUID NOT NULL,
  "product_variant_id"       UUID NOT NULL,
  "store_id"                 UUID NOT NULL,
  "qty_available_at_run"     DECIMAL(18,4) NOT NULL DEFAULT 0,
  "qty_on_order_at_run"      DECIMAL(18,4) NOT NULL DEFAULT 0,
  "suggested_qty"            DECIMAL(18,4) NOT NULL,
  "preferred_supplier_id"    INTEGER,
  "status"                   "reorder_suggestion_status_enum" NOT NULL DEFAULT 'open',
  "converted_requisition_id" UUID,
  "run_at"                   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"             UUID DEFAULT auth.uid(),
  CONSTRAINT "reorder_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reorder_suggestions_reorder_rule_id_fkey"
    FOREIGN KEY ("reorder_rule_id") REFERENCES "reorder_rules" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reorder_suggestions_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reorder_suggestions_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reorder_suggestions_supplier_fkey"
    FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers" ("supplier_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "reorder_suggestions_converted_requisition_fkey"
    FOREIGN KEY ("converted_requisition_id") REFERENCES "purchase_requisitions" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);


-- At most one OPEN suggestion per rule
CREATE UNIQUE INDEX IF NOT EXISTS "uq_reorder_suggestions_open_rule"
  ON "reorder_suggestions" ("reorder_rule_id") WHERE ("status" = 'open');

CREATE INDEX IF NOT EXISTS "idx_reorder_suggestions_tenant_id" ON "reorder_suggestions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_reorder_suggestions_status" ON "reorder_suggestions" ("status");



CREATE OR REPLACE TRIGGER "trg_reorder_rules_updated_at"
BEFORE UPDATE ON "reorder_rules" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_reorder_suggestions_updated_at"
BEFORE UPDATE ON "reorder_suggestions" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "reorder_rules" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "reorder_suggestions" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "reorder_rules_all_own" ON "reorder_rules";
CREATE POLICY "reorder_rules_all_own" ON "reorder_rules"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "reorder_suggestions_all_own" ON "reorder_suggestions";
CREATE POLICY "reorder_suggestions_all_own" ON "reorder_suggestions"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());



COMMIT;
