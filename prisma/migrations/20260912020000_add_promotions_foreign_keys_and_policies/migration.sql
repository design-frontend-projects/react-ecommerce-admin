-- AlterTable promotion_menu_scopes, promotion_usage: add foreign keys, indexes, and RLS policies
DO $$
BEGIN
    -- Foreign key between promotion_menu_scopes and promotions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotion_menu_scopes_promotion_id_fkey'
    ) THEN
        ALTER TABLE "public"."promotion_menu_scopes"
        ADD CONSTRAINT "promotion_menu_scopes_promotion_id_fkey"
        FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- Foreign key between promotion_menu_scopes and res_menu_items
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotion_menu_scopes_menu_item_id_fkey'
    ) THEN
        ALTER TABLE "public"."promotion_menu_scopes"
        ADD CONSTRAINT "promotion_menu_scopes_menu_item_id_fkey"
        FOREIGN KEY ("menu_item_id") REFERENCES "public"."res_menu_items"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- Foreign key between promotion_menu_scopes and res_menu_categories
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotion_menu_scopes_menu_category_id_fkey'
    ) THEN
        ALTER TABLE "public"."promotion_menu_scopes"
        ADD CONSTRAINT "promotion_menu_scopes_menu_category_id_fkey"
        FOREIGN KEY ("menu_category_id") REFERENCES "public"."res_menu_categories"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- Foreign key between promotion_usage and promotions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotion_usage_promotion_id_fkey'
    ) THEN
        ALTER TABLE "public"."promotion_usage"
        ADD CONSTRAINT "promotion_usage_promotion_id_fkey"
        FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_promotion_menu_scopes_promotion" ON "public"."promotion_menu_scopes"("promotion_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_menu_scopes_item" ON "public"."promotion_menu_scopes"("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_menu_scopes_category" ON "public"."promotion_menu_scopes"("menu_category_id");
CREATE INDEX IF NOT EXISTS "idx_promotions_tenant_id" ON "public"."promotions"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_promotions_code" ON "public"."promotions"("code");
CREATE INDEX IF NOT EXISTS "idx_promotion_usage_promotion_id" ON "public"."promotion_usage"("promotion_id");

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotions' AND policyname = 'promotions_authenticated_all'
    ) THEN
        CREATE POLICY "promotions_authenticated_all" ON "public"."promotions"
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotions' AND policyname = 'promotions_anon_select'
    ) THEN
        CREATE POLICY "promotions_anon_select" ON "public"."promotions"
        FOR SELECT TO anon USING (is_active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotion_menu_scopes' AND policyname = 'promotion_menu_scopes_authenticated_all'
    ) THEN
        CREATE POLICY "promotion_menu_scopes_authenticated_all" ON "public"."promotion_menu_scopes"
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotion_menu_scopes' AND policyname = 'promotion_menu_scopes_anon_select'
    ) THEN
        CREATE POLICY "promotion_menu_scopes_anon_select" ON "public"."promotion_menu_scopes"
        FOR SELECT TO anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotion_usage' AND policyname = 'promotion_usage_authenticated_all'
    ) THEN
        CREATE POLICY "promotion_usage_authenticated_all" ON "public"."promotion_usage"
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
