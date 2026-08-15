-- ==============================================================================
-- 03_postgresql_rls_policies.sql
-- Step 3: PostgreSQL Row-Level Security (RLS) Policies & Context Functions
-- ==============================================================================

-- 1. Helper function to extract current tenant ID from session or JWT claim
CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    session_tenant TEXT;
    jwt_tenant TEXT;
BEGIN
    -- Check local transaction/session configuration variable
    session_tenant := current_setting('app.current_tenant_id', true);
    IF session_tenant IS NOT NULL AND session_tenant <> '' THEN
        RETURN session_tenant::uuid;
    END IF;

    -- Fallback: check Supabase JWT claims if present
    BEGIN
        jwt_tenant := (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id');
        IF jwt_tenant IS NOT NULL AND jwt_tenant <> '' THEN
            RETURN jwt_tenant::uuid;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Macro Procedure to Apply Standard Multi-Tenant RLS Policies
DO $$
DECLARE
    tbl TEXT;
    target_tables TEXT[] := ARRAY[
        'warehouses',
        'warehouse_locations',
        'inventory',
        'inventory_movements',
        'inventory_movement_serials',
        'stock_balances',
        'stock_adjustments',
        'stock_transfers'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            -- Enable and Force RLS (ensures table owners also follow RLS)
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

            -- Drop existing policies if any
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I;', tbl);

            -- 1. SELECT Policy (USING)
            EXECUTE format(
                'CREATE POLICY tenant_isolation_select ON %I
                 FOR SELECT
                 USING (tenant_id = app_current_tenant_id());',
                tbl
            );

            -- 2. INSERT Policy (WITH CHECK)
            EXECUTE format(
                'CREATE POLICY tenant_isolation_insert ON %I
                 FOR INSERT
                 WITH CHECK (tenant_id = app_current_tenant_id());',
                tbl
            );

            -- 3. UPDATE Policy (USING & WITH CHECK)
            EXECUTE format(
                'CREATE POLICY tenant_isolation_update ON %I
                 FOR UPDATE
                 USING (tenant_id = app_current_tenant_id())
                 WITH CHECK (tenant_id = app_current_tenant_id());',
                tbl
            );

            -- 4. DELETE Policy (USING)
            EXECUTE format(
                'CREATE POLICY tenant_isolation_delete ON %I
                 FOR DELETE
                 USING (tenant_id = app_current_tenant_id());',
                tbl
            );
        END IF;
    END LOOP;
END $$;
