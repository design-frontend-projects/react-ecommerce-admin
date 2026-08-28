-- ============================================================
-- Migration: 20260828170000_drop_duplicate_product_types_fk
-- Purpose: Drop redundant fk_products_product_type_id constraint
--          to resolve PostgREST PGRST201 embedding ambiguity.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_product_type_id'
          AND table_name = 'products'
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT fk_products_product_type_id;
    END IF;
END $$;
