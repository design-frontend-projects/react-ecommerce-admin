-- AlterTable price_list: add foreign keys and indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_list_product_id_fkey'
    ) THEN
        ALTER TABLE "public"."price_list"
        ADD CONSTRAINT "price_list_product_id_fkey"
        FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_list_group_id_fkey'
    ) THEN
        ALTER TABLE "public"."price_list"
        ADD CONSTRAINT "price_list_group_id_fkey"
        FOREIGN KEY ("group_id") REFERENCES "public"."customer_groups"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_price_list_id_fkey'
    ) THEN
        ALTER TABLE "public"."price_list_items"
        ADD CONSTRAINT "price_list_items_price_list_id_fkey"
        FOREIGN KEY ("price_list_id") REFERENCES "public"."price_list"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_product_variant_id_fkey'
    ) THEN
        ALTER TABLE "public"."price_list_items"
        ADD CONSTRAINT "price_list_items_product_variant_id_fkey"
        FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_price_list_tenant_id" ON "public"."price_list"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_price_list_product_id" ON "public"."price_list"("product_id");
CREATE INDEX IF NOT EXISTS "idx_price_list_group_id" ON "public"."price_list"("group_id");
CREATE INDEX IF NOT EXISTS "idx_price_list_active" ON "public"."price_list"("is_active") WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS "idx_price_list_items_tenant_id" ON "public"."price_list_items"("tenant_id");
