BEGIN;

-- =============================================================================
-- Promotion activity scoping + new promo types.
--   * promotions.activities: order channels the promo applies to
--     (dine_in / takeaway / delivery). Default = all three.
--   * promotions.promo_type: order_discount (existing behavior),
--     item_discount (scoped to menu items/categories), buy_x_get_y.
--   * buy_x_get_y config: buy_quantity, get_quantity, get_discount_value
--     (% off the "get" units; 100 = free).
--   * promotion_menu_scopes: one flexible join table for item/category
--     applicability. scope_role: 'target' (item_discount), 'buy'/'get'
--     (buy_x_get_y sets; empty 'get' set means get == buy).
-- =============================================================================

ALTER TABLE "promotions"
  ADD COLUMN "activities" TEXT[] NOT NULL DEFAULT '{dine_in,takeaway,delivery}',
  ADD COLUMN "promo_type" VARCHAR(30) NOT NULL DEFAULT 'order_discount',
  ADD COLUMN "buy_quantity" INTEGER,
  ADD COLUMN "get_quantity" INTEGER,
  ADD COLUMN "get_discount_value" DECIMAL(10,2) DEFAULT 100,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) DEFAULT now();

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_promo_type_check"
    CHECK ("promo_type" IN ('order_discount', 'item_discount', 'buy_x_get_y')),
  ADD CONSTRAINT "promotions_buy_get_check"
    CHECK (
      "promo_type" <> 'buy_x_get_y'
      OR ("buy_quantity" >= 1 AND "get_quantity" >= 1)
    ),
  ADD CONSTRAINT "promotions_get_discount_value_check"
    CHECK ("get_discount_value" IS NULL OR ("get_discount_value" > 0 AND "get_discount_value" <= 100));

CREATE TABLE "promotion_menu_scopes" (
  "scope_id"         SERIAL,
  "promotion_id"     INTEGER NOT NULL,
  "menu_item_id"     UUID,
  "menu_category_id" UUID,
  "scope_role"       VARCHAR(10) NOT NULL DEFAULT 'target',
  "created_at"       TIMESTAMPTZ(6) DEFAULT now(),
  "updated_at"       TIMESTAMPTZ(6) DEFAULT now(),
  CONSTRAINT "promotion_menu_scopes_pkey" PRIMARY KEY ("scope_id"),
  CONSTRAINT "promotion_menu_scopes_promotion_id_fkey"
    FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("promotion_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "promotion_menu_scopes_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "res_menu_items" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "promotion_menu_scopes_menu_category_id_fkey"
    FOREIGN KEY ("menu_category_id") REFERENCES "res_menu_categories" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "promotion_menu_scopes_scope_role_check"
    CHECK ("scope_role" IN ('target', 'buy', 'get')),
  CONSTRAINT "promotion_menu_scopes_ref_check"
    CHECK ("menu_item_id" IS NOT NULL OR "menu_category_id" IS NOT NULL)
);

CREATE INDEX "idx_promotion_menu_scopes_promotion" ON "promotion_menu_scopes" ("promotion_id");
CREATE INDEX "idx_promotion_menu_scopes_item" ON "promotion_menu_scopes" ("menu_item_id");
CREATE INDEX "idx_promotion_menu_scopes_category" ON "promotion_menu_scopes" ("menu_category_id");

ALTER TABLE "promotion_menu_scopes" ENABLE ROW LEVEL SECURITY;

-- POS reads scopes to compute item-level discounts; admin manages them.
-- Writes are permissive for authenticated (matches the promotions table's
-- current posture); tighten to an admin role when role claims are available.
CREATE POLICY "promotion_menu_scopes_select_authenticated" ON "promotion_menu_scopes"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "promotion_menu_scopes_write_authenticated" ON "promotion_menu_scopes"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
