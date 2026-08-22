-- ============================================================
-- Migration: 20260816000000_tenant_isolation_refactor
-- Purpose: Remove auth_user_id from data models and enforce tenant_id isolation
--          with audit columns (created_by_user_id, updated_by_user_id).
-- ============================================================

DO $$
BEGIN
    -- ------------------------------------------------------------
    -- 1. Ensure tenant_id exists on tables that previously lacked it
    -- ------------------------------------------------------------
    ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.pos_reorder_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.purchase_return_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.sales_invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.sales_return_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.shipping_methods ADD COLUMN IF NOT EXISTS tenant_id UUID;

    -- ------------------------------------------------------------
    -- 2. Backfill tenant_id on tables from parent relations or auth_user_id
    -- ------------------------------------------------------------
    -- 2a. Direct auth_user_id mapping to tenant_users or tenants
    CREATE OR REPLACE TEMP VIEW tmp_auth_tenant_map AS
    SELECT DISTINCT auth_user_id, COALESCE(tenant_id, parent_tenant_id) AS resolved_tenant_id
    FROM public.tenant_users
    WHERE auth_user_id IS NOT NULL AND COALESCE(tenant_id, parent_tenant_id) IS NOT NULL
    UNION
    SELECT DISTINCT auth_user_id, id AS resolved_tenant_id
    FROM public.tenants
    WHERE auth_user_id IS NOT NULL
    UNION
    SELECT DISTINCT auth_user_id, COALESCE(tenant_id, id) AS resolved_tenant_id
    FROM public.tenant_subscriptions
    WHERE auth_user_id IS NOT NULL;

    -- Update tables where tenant_id is currently NULL but auth_user_id exists
    UPDATE public.addresses t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.branches t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.categories t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.customer_cards t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.customer_groups t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.customers t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.payment_types t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.pos_terminals t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.price_list t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.price_list_items t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.products t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.inventory t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.pos_reorder_requests t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.promotion_usage t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.promotions t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.purchase_invoices t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.purchase_order_items t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.purchase_orders t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.refunds t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_events t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_floors t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_item_properties t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_item_variants t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_menu_categories t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_menu_items t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_notifications t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_order_items t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_orders t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_shipments t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_payment_methods t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_reservations t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_shifts t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.res_tables t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.sales_invoices t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.shipments t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.shipping_rates t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.stores t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.suppliers t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.tax_rates t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.transactions t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.inventory_movements t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;
    UPDATE public.app_settings t SET tenant_id = m.resolved_tenant_id FROM tmp_auth_tenant_map m WHERE t.tenant_id IS NULL AND t.auth_user_id = m.auth_user_id;

    -- 2b. Backfill child tables from parent relations
    UPDATE public.product_variants pv SET tenant_id = p.tenant_id FROM public.products p WHERE pv.product_id = p.id AND pv.tenant_id IS NULL;
    UPDATE public.pos_reorder_requests pr SET tenant_id = p.tenant_id FROM public.products p WHERE pr.product_id = p.id AND pr.tenant_id IS NULL;
    UPDATE public.sales_invoice_items sii SET tenant_id = si.tenant_id FROM public.sales_invoices si WHERE sii.invoice_id = si.id AND sii.tenant_id IS NULL;
    UPDATE public.purchase_invoice_items pii SET tenant_id = pi.tenant_id FROM public.purchase_invoices pi WHERE pii.purchase_invoice_id = pi.id AND pii.tenant_id IS NULL;
    UPDATE public.sales_returns sr SET tenant_id = si.tenant_id FROM public.sales_invoices si WHERE sr.sales_invoice_id = si.id AND sr.tenant_id IS NULL;
    UPDATE public.sales_return_items sri SET tenant_id = sr.tenant_id FROM public.sales_returns sr WHERE sri.sales_return_id = sr.id AND sri.tenant_id IS NULL;
    UPDATE public.purchase_returns pr SET tenant_id = pi.tenant_id FROM public.purchase_invoices pi WHERE pr.purchase_invoice_id = pi.id AND pr.tenant_id IS NULL;
    UPDATE public.purchase_return_items pri SET tenant_id = pr.tenant_id FROM public.purchase_returns pr WHERE pri.purchase_return_id = pr.id AND pri.tenant_id IS NULL;

    -- ------------------------------------------------------------
    -- 3. Add audit columns (created_by_user_id, updated_by_user_id)
    -- ------------------------------------------------------------
    -- Add to all business tables
    ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.customer_cards ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.customer_groups ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.payment_types ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.pos_terminals ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.price_list ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.price_list_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.pos_reorder_requests ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.promotion_usage ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_invoice_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_return_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_events ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_floors ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_item_properties ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_item_variants ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_menu_categories ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_menu_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_notifications ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_order_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_orders ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_shipments ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_payment_methods ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_reservations ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_shifts ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_tables ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.res_void_requests ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.sales_invoice_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.sales_return_items ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.shipping_methods ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.transaction_details ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.stock_balances ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.warehouse_locations ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.stock_by_location ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.uoms ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.unit_conversions ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.product_barcodes ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.bundle_components ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.product_batches ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.product_serials ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
    ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS created_by_user_id UUID, ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

    -- Backfill created_by_user_id from tenant_users mapping where auth_user_id was set
    UPDATE public.addresses t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.branches t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.categories t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.customer_cards t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.customer_groups t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.customers t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.payment_types t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.pos_terminals t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.price_list t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.price_list_items t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.products t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.inventory t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.promotions t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.purchase_invoices t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.purchase_orders t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;
    UPDATE public.sales_invoices t SET created_by_user_id = tu.id FROM public.tenant_users tu WHERE t.created_by_user_id IS NULL AND t.auth_user_id = tu.auth_user_id;

    -- ------------------------------------------------------------
    -- 4. Update unique constraints and indexes
    -- ------------------------------------------------------------
    -- app_settings: drop (auth_user_id, key) unique constraint, add (tenant_id, key)
    ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_user_id_key_key;
    ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_auth_user_id_key_key;
    DROP INDEX IF EXISTS public.app_settings_user_id_key_key;
    DROP INDEX IF EXISTS public.app_settings_auth_user_id_key_key;
    CREATE UNIQUE INDEX IF NOT EXISTS app_settings_tenant_id_key_key ON public.app_settings(tenant_id, key);

    -- ------------------------------------------------------------
    -- 5. Drop auth_user_id columns from business tables
    -- ------------------------------------------------------------
    ALTER TABLE public.addresses DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.branches DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.categories DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.customer_cards DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.customer_groups DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.payment_types DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.permissions DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.pos_terminals DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.price_list DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.price_list_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.product_variants DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.products DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.inventory DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.pos_reorder_requests DROP COLUMN IF EXISTS auth_user_id, DROP COLUMN IF EXISTS requested_by_auth_user_id, DROP COLUMN IF EXISTS read_by_auth_user_id;
    ALTER TABLE public.promotion_usage DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.promotions DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.purchase_invoices DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.purchase_order_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.purchase_orders DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.purchase_return_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.purchase_returns DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.refunds DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_events DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_floors DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_item_properties DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_item_variants DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_menu_categories DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_menu_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_notifications DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_order_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_orders DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_shipments DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_payment_methods DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_reservations DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_shifts DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.res_tables DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.sales_invoice_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.sales_invoices DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.sales_return_items DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.sales_returns DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.shipments DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.shipping_rates DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.stores DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.suppliers DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.tax_rates DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.transaction_details DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.transactions DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.module_activity_types DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.permission_buttons DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.inventory_movements DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.stock_balances DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.stock_transfers DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.stock_adjustments DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.app_settings DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.warehouses DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.warehouse_locations DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.stock_by_location DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.brands DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.uoms DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.unit_conversions DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.product_barcodes DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.bundle_components DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.product_batches DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.product_serials DROP COLUMN IF EXISTS auth_user_id;
    ALTER TABLE public.goods_receipts DROP COLUMN IF EXISTS auth_user_id;

    -- ------------------------------------------------------------
    -- 6. Helper Functions for Tenant Scoping & Security
    -- ------------------------------------------------------------
    CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
    RETURNS UUID AS $func$
      SELECT COALESCE(tenant_id, parent_tenant_id)
      FROM public.tenant_users
      WHERE auth_user_id = auth.uid()
      LIMIT 1;
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;

    CREATE OR REPLACE FUNCTION public.get_my_user_id()
    RETURNS UUID AS $func$
      SELECT id
      FROM public.tenant_users
      WHERE auth_user_id = auth.uid()
      LIMIT 1;
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;

END $$;
