-- ==============================================================================
-- 01_multi_tenant_schema_updates.sql
-- Step 1: Add tenant_id columns, compound constraints, and composite indexes
-- ==============================================================================

-- 1. Ensure master tenants table exists
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

-- 2. Add tenant_id to all inventory, repository, and warehouse tables (if not already present)
DO $$
BEGIN
    -- Warehouses & Warehouse Locations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
        ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    -- Inventory & Movements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movement_serials') THEN
        ALTER TABLE inventory_movement_serials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    -- Stock Balances, Adjustments & Transfers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_balances') THEN
        ALTER TABLE stock_balances ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_adjustments') THEN
        ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfers') THEN
        ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. Composite Uniqueness & Foreign Key Constraints
-- Ensures child records cannot reference parent records belonging to a different tenant
DO $$
BEGIN
    -- Warehouses unique (tenant_id, id) & unique code per tenant
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_warehouses_tenant_id_id') THEN
            ALTER TABLE warehouses ADD CONSTRAINT uq_warehouses_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_warehouses_tenant_code') THEN
            ALTER TABLE warehouses ADD CONSTRAINT uq_warehouses_tenant_code UNIQUE (tenant_id, code);
        END IF;
    END IF;

    -- Stock Balances unique per tenant, store, and variant
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_balances') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_stock_balances_tenant_store_variant') THEN
            ALTER TABLE stock_balances ADD CONSTRAINT uq_stock_balances_tenant_store_variant UNIQUE (tenant_id, store_id, product_variant_id);
        END IF;
    END IF;
END $$;

-- 4. Composite B-Tree Indexes for Performance (tenant_id as leading column)
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_status 
    ON warehouses (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant_warehouse 
    ON warehouse_locations (tenant_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_date 
    ON inventory_movements (tenant_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_variant 
    ON inventory_movements (tenant_id, product_variant_id);

CREATE INDEX IF NOT EXISTS idx_stock_balances_tenant_store 
    ON stock_balances (tenant_id, store_id);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_tenant_created 
    ON stock_adjustments (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant_status 
    ON stock_transfers (tenant_id, status);
