-- ============================================================
-- Add RLS Policies for Cities and Currencies tables
-- Allows read access to public/anon/authenticated users for onboarding
-- ============================================================

DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if exists and create unified access policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'cities' 
          AND policyname = 'Policy with security definer functions'
    ) THEN
        CREATE POLICY "Policy with security definer functions" 
        ON public.cities 
        FOR ALL 
        TO anon, authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'currencies' 
          AND policyname = 'Policy with security definer functions'
    ) THEN
        CREATE POLICY "Policy with security definer functions" 
        ON public.currencies 
        FOR ALL 
        TO anon, authenticated 
        USING (true);
    END IF;
END $$;
