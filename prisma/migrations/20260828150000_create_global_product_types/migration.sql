-- ============================================================
-- Migration: 20260828150000_create_global_product_types
-- Purpose: Create global product_types table, seed global classification
--          types (Non-durable goods, Durable goods, Service, Digital goods),
--          and link products.product_type_id foreign key.
-- ============================================================

DO $$
BEGIN
    -- 1. Create table public.product_types
    CREATE TABLE IF NOT EXISTS public.product_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100),
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(20),
        sort_order INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- 2. Enable RLS
    ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

    -- 3. Create RLS read policy for all authenticated & anon users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'product_types' 
          AND policyname = 'Allow public and authenticated read access on product_types'
    ) THEN
        CREATE POLICY "Allow public and authenticated read access on product_types" 
        ON public.product_types 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
    END IF;

    -- 4. Foreign Key on products.product_type_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_product_type_id'
          AND table_name = 'products'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT fk_products_product_type_id 
        FOREIGN KEY (product_type_id) 
        REFERENCES public.product_types(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;

    -- 5. Seed Global Product Types
    INSERT INTO public.product_types (code, name, name_ar, description, icon, color, sort_order, is_active)
    VALUES
        (
            'non_durable',
            'Non-durable goods',
            'بضائع غير معمرة',
            'Perishable items and consumables (e.g. food, drinks, ingredients, toiletries)',
            'Apple',
            '#10b981',
            1,
            true
        ),
        (
            'durable',
            'Durable goods',
            'بضائع معمرة',
            'Long-lasting physical goods (e.g. equipment, electronics, appliances, furniture)',
            'Package',
            '#3b82f6',
            2,
            true
        ),
        (
            'service',
            'Service',
            'خدمة',
            'Non-physical tasks, hospitality services, labor, and consulting',
            'Wrench',
            '#8b5cf6',
            3,
            true
        ),
        (
            'digital',
            'Digital goods',
            'سلع رقمية',
            'Virtual, downloadable, or software license products',
            'Download',
            '#f59e0b',
            4,
            true
        )
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        name_ar = EXCLUDED.name_ar,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = now();

END $$;
