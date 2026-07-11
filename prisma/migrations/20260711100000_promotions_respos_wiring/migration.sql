BEGIN;

-- =============================================================================
-- Promotions ↔ ResPOS wiring: make the admin `promotions` table the single
-- source of truth for POS promo codes.
--   * res_orders gains applied_promotion_id (Int FK → promotions) alongside the
--     legacy UUID promotion_id (→ res_promotions, untouched/deprecated) and an
--     explicit order_type channel column.
--   * promotion_usage gains res_order_id + customer_mobile so restaurant orders
--     can be counted for total and per-customer usage limits.
--   * record_promotion_usage(): atomic, race-safe usage recording that
--     re-checks usage_limit / usage_per_customer inside a row lock. Client-side
--     validation is advisory; this RPC is the enforcement point.
-- =============================================================================

ALTER TABLE "res_orders"
  ADD COLUMN "applied_promotion_id" INTEGER,
  ADD COLUMN "order_type" VARCHAR(20);

ALTER TABLE "res_orders"
  ADD CONSTRAINT "res_orders_applied_promotion_id_fkey"
    FOREIGN KEY ("applied_promotion_id") REFERENCES "promotions" ("promotion_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "res_orders_order_type_check"
    CHECK ("order_type" IS NULL OR "order_type" IN ('dine_in', 'takeaway', 'delivery'));

CREATE INDEX "idx_res_orders_applied_promotion" ON "res_orders" ("applied_promotion_id");

ALTER TABLE "promotion_usage"
  ADD COLUMN "res_order_id" UUID,
  ADD COLUMN "customer_mobile" VARCHAR(50),
  ADD COLUMN "created_at" TIMESTAMPTZ(6) DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) DEFAULT now();

ALTER TABLE "promotion_usage"
  ADD CONSTRAINT "promotion_usage_res_order_id_fkey"
    FOREIGN KEY ("res_order_id") REFERENCES "res_orders" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_promotion_usage_res_order" ON "promotion_usage" ("res_order_id");
CREATE INDEX "idx_promotion_usage_promo_mobile" ON "promotion_usage" ("promotion_id", "customer_mobile");
-- One usage row per restaurant order: makes recording idempotent under offline
-- replay / double-click / payment retry.
CREATE UNIQUE INDEX "uq_promotion_usage_res_order" ON "promotion_usage" ("res_order_id")
  WHERE "res_order_id" IS NOT NULL;

-- POS roles (cashier/captain) must be able to read promotions and usage counts.
-- Deliberately permissive SELECT for authenticated users (single-tenant promos);
-- tighten to tenant scoping if/when promos become tenant-scoped.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'promotions'
      AND policyname = 'promotions_select_authenticated'
  ) THEN
    CREATE POLICY "promotions_select_authenticated" ON "promotions"
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'promotion_usage'
      AND policyname = 'promotion_usage_select_authenticated'
  ) THEN
    CREATE POLICY "promotion_usage_select_authenticated" ON "promotion_usage"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- =============================================================================
-- record_promotion_usage(): call at order completion (before flipping the order
-- to paid). Serializes per promotion via FOR UPDATE so limit checks are
-- race-safe. Raises CODE|detail exceptions the client maps to i18n keys:
--   PROMO_NOT_FOUND | USAGE_LIMIT_REACHED | PER_CUSTOMER_LIMIT_REACHED
-- Idempotent per res_order_id (returns recorded=false instead of erroring).
-- =============================================================================
CREATE OR REPLACE FUNCTION "record_promotion_usage"(
  p_promotion_id integer,
  p_res_order_id uuid,
  p_customer_mobile text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo  promotions%ROWTYPE;
  v_mobile text := nullif(trim(coalesce(p_customer_mobile, '')), '');
  v_total  integer;
  v_customer integer;
BEGIN
  IF p_res_order_id IS NULL THEN
    RAISE EXCEPTION 'PROMO_ORDER_REQUIRED|res_order_id is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_promo FROM promotions WHERE promotion_id = p_promotion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROMO_NOT_FOUND|%', p_promotion_id USING ERRCODE = 'P0001';
  END IF;

  -- Already recorded for this order → success, not an error (retry-safe)
  IF EXISTS (SELECT 1 FROM promotion_usage WHERE res_order_id = p_res_order_id) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'already_recorded');
  END IF;

  IF v_promo.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO v_total FROM promotion_usage
      WHERE promotion_id = p_promotion_id;
    IF v_total >= v_promo.usage_limit THEN
      RAISE EXCEPTION 'USAGE_LIMIT_REACHED|%', p_promotion_id USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_promo.usage_per_customer IS NOT NULL AND v_mobile IS NOT NULL THEN
    SELECT count(*) INTO v_customer FROM promotion_usage
      WHERE promotion_id = p_promotion_id AND customer_mobile = v_mobile;
    IF v_customer >= v_promo.usage_per_customer THEN
      RAISE EXCEPTION 'PER_CUSTOMER_LIMIT_REACHED|%', p_promotion_id USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO promotion_usage (promotion_id, res_order_id, customer_mobile, used_at)
    VALUES (p_promotion_id, p_res_order_id, v_mobile, now())
  ON CONFLICT ("res_order_id") WHERE "res_order_id" IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('recorded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION "record_promotion_usage"(integer, uuid, text) TO authenticated;

COMMIT;
