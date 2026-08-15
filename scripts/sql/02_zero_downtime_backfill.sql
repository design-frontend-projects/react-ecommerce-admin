-- ==============================================================================
-- 02_zero_downtime_backfill.sql
-- Step 2: Zero-Downtime Safe Batch Backfill & Non-Blocking NOT NULL Validation
-- ==============================================================================

-- 1. Ensure a fallback default tenant exists for legacy orphan data
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Legacy Tenant', 'legacy-default', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill Warehouses from Branches / Stores / auth_user_id
DO $$
DECLARE
    batch_size CONSTANT INT := 5000;
    rows_updated INT := 0;
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        LOOP
            WITH target_rows AS (
                SELECT w.id, 
                       COALESCE(
                           b.tenant_id, 
                           s.tenant_id, 
                           tu.tenant_id, 
                           tu.parent_tenant_id, 
                           default_tenant_id
                       ) AS resolved_tenant_id
                FROM warehouses w
                LEFT JOIN branches b ON w.branch_id = b.id
                LEFT JOIN stores s ON w.store_id = s.store_id
                LEFT JOIN tenant_users tu ON w.auth_user_id = tu.auth_user_id
                WHERE w.tenant_id IS NULL
                LIMIT batch_size
                FOR UPDATE OF w SKIP LOCKED
            )
            UPDATE warehouses w_target
            SET tenant_id = target_rows.resolved_tenant_id
            FROM target_rows
            WHERE w_target.id = target_rows.id;

            GET DIAGNOSTICS rows_updated = ROW_COUNT;
            EXIT WHEN rows_updated = 0;
            PERFORM pg_sleep(0.05); -- yield I/O
        END LOOP;
    END IF;
END $$;

-- 3. Backfill Warehouse Locations from Warehouses
DO $$
DECLARE
    batch_size CONSTANT INT := 5000;
    rows_updated INT := 0;
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
        LOOP
            WITH target_rows AS (
                SELECT wl.id, COALESCE(w.tenant_id, default_tenant_id) AS resolved_tenant_id
                FROM warehouse_locations wl
                LEFT JOIN warehouses w ON wl.warehouse_id = w.id
                WHERE wl.tenant_id IS NULL
                LIMIT batch_size
                FOR UPDATE OF wl SKIP LOCKED
            )
            UPDATE warehouse_locations wl_target
            SET tenant_id = target_rows.resolved_tenant_id
            FROM target_rows
            WHERE wl_target.id = target_rows.id;

            GET DIAGNOSTICS rows_updated = ROW_COUNT;
            EXIT WHEN rows_updated = 0;
            PERFORM pg_sleep(0.05);
        END LOOP;
    END IF;
END $$;

-- 4. Backfill Inventory Movements from Stores / Branches / Auth User
DO $$
DECLARE
    batch_size CONSTANT INT := 5000;
    rows_updated INT := 0;
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        LOOP
            WITH target_rows AS (
                SELECT im.id, 
                       COALESCE(
                           s.tenant_id, 
                           b.tenant_id, 
                           tu.tenant_id, 
                           tu.parent_tenant_id, 
                           default_tenant_id
                       ) AS resolved_tenant_id
                FROM inventory_movements im
                LEFT JOIN stores s ON im.store_id = s.store_id
                LEFT JOIN branches b ON im.branch_id = b.id
                LEFT JOIN tenant_users tu ON im.auth_user_id = tu.auth_user_id
                WHERE im.tenant_id IS NULL
                LIMIT batch_size
                FOR UPDATE OF im SKIP LOCKED
            )
            UPDATE inventory_movements im_target
            SET tenant_id = target_rows.resolved_tenant_id
            FROM target_rows
            WHERE im_target.id = target_rows.id;

            GET DIAGNOSTICS rows_updated = ROW_COUNT;
            EXIT WHEN rows_updated = 0;
            PERFORM pg_sleep(0.05);
        END LOOP;
    END IF;
END $$;

-- 5. Backfill Stock Balances from Stores
DO $$
DECLARE
    batch_size CONSTANT INT := 5000;
    rows_updated INT := 0;
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_balances') THEN
        LOOP
            WITH target_rows AS (
                SELECT sb.id, COALESCE(s.tenant_id, default_tenant_id) AS resolved_tenant_id
                FROM stock_balances sb
                LEFT JOIN stores s ON sb.store_id = s.store_id
                WHERE sb.tenant_id IS NULL
                LIMIT batch_size
                FOR UPDATE OF sb SKIP LOCKED
            )
            UPDATE stock_balances sb_target
            SET tenant_id = target_rows.resolved_tenant_id
            FROM target_rows
            WHERE sb_target.id = target_rows.id;

            GET DIAGNOSTICS rows_updated = ROW_COUNT;
            EXIT WHEN rows_updated = 0;
            PERFORM pg_sleep(0.05);
        END LOOP;
    END IF;
END $$;

-- 6. Apply Non-Blocking NOT NULL Constraints via Check Constraints
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY['warehouses', 'warehouse_locations', 'inventory_movements', 'stock_balances'];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            -- Add check constraint NOT VALID (instant execution without table lock)
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (tenant_id IS NOT NULL) NOT VALID;', t, 'chk_' || t || '_tenant_id_not_null');
            -- Validate constraint concurrently
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I;', t, 'chk_' || t || '_tenant_id_not_null');
        END IF;
    END LOOP;
END $$;
