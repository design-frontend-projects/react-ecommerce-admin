-- Migration: inv_promotions_and_discounts_module
-- Authoritative ERP Promotions, Discounts & Coupons module (prefixed with inv_)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_promotion_status_enum') THEN
        CREATE TYPE inv_promotion_status_enum AS ENUM ('draft', 'active', 'paused', 'scheduled', 'expired', 'archived');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_promotion_type_enum') THEN
        CREATE TYPE inv_promotion_type_enum AS ENUM ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_item', 'order_discount', 'tiered');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_rule_action_type_enum') THEN
        CREATE TYPE inv_rule_action_type_enum AS ENUM ('percentage_discount', 'fixed_discount', 'buy_x_get_y', 'free_item', 'bundle_fixed_price');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_promotion_scope_enum') THEN
        CREATE TYPE inv_promotion_scope_enum AS ENUM ('all', 'selected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_condition_field_enum') THEN
        CREATE TYPE inv_condition_field_enum AS ENUM (
            'order_subtotal', 'item_quantity', 'customer_group', 'product_category',
            'product_brand', 'sales_channel', 'store', 'branch',
            'customer_first_order', 'customer_order_count', 'day_of_week', 'time_of_day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_condition_operator_enum') THEN
        CREATE TYPE inv_condition_operator_enum AS ENUM ('eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in', 'not_in', 'between');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_coupon_status_enum') THEN
        CREATE TYPE inv_coupon_status_enum AS ENUM ('active', 'expired', 'exhausted', 'disabled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_discount_source_enum') THEN
        CREATE TYPE inv_discount_source_enum AS ENUM ('promotion', 'coupon', 'manual', 'customer_group', 'price_list');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_approval_status_enum') THEN
        CREATE TYPE inv_approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inv_promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name varchar(200) NOT NULL,
    code varchar(50),
    description text,
    status inv_promotion_status_enum NOT NULL DEFAULT 'draft',
    promo_type inv_promotion_type_enum NOT NULL DEFAULT 'percentage',
    start_date timestamptz NOT NULL,
    end_date timestamptz,
    timezone varchar(50) NOT NULL DEFAULT 'Asia/Qatar',
    priority integer NOT NULL DEFAULT 0,
    currency_id uuid REFERENCES public.currencies(id) ON DELETE SET NULL,
    currency_code varchar(10) DEFAULT 'QAR',
    min_order_amount numeric(18, 4) DEFAULT 0,
    max_discount_amount numeric(18, 4),
    usage_limit integer,
    usage_per_customer integer DEFAULT 1,
    daily_usage_limit integer,
    current_usage_count integer NOT NULL DEFAULT 0,
    allow_stacking boolean NOT NULL DEFAULT false,
    stacking_priority integer NOT NULL DEFAULT 0,
    max_stacking_count integer DEFAULT 1,
    requires_coupon boolean NOT NULL DEFAULT false,
    requires_approval boolean NOT NULL DEFAULT false,
    auto_apply boolean NOT NULL DEFAULT true,
    scope_product_type inv_promotion_scope_enum NOT NULL DEFAULT 'all',
    scope_customer_type inv_promotion_scope_enum NOT NULL DEFAULT 'all',
    scope_channel_type inv_promotion_scope_enum NOT NULL DEFAULT 'all',
    scope_location_type inv_promotion_scope_enum NOT NULL DEFAULT 'all',
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    rule_type inv_rule_action_type_enum NOT NULL DEFAULT 'percentage_discount',
    discount_value numeric(18, 4) NOT NULL DEFAULT 0,
    apply_to varchar(50) NOT NULL DEFAULT 'matching_items',
    buy_quantity integer,
    get_quantity integer,
    get_discount_percent numeric(5, 2) DEFAULT 100,
    get_product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
    tier_min_quantity numeric(18, 4),
    tier_min_amount numeric(18, 4),
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_conditions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    group_id varchar(50) DEFAULT 'group_1',
    logical_operator varchar(10) NOT NULL DEFAULT 'AND',
    field inv_condition_field_enum NOT NULL,
    operator inv_condition_operator_enum NOT NULL DEFAULT 'gte',
    value text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_customer_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    customer_group_id uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(store_id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    is_excluded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    code varchar(50) NOT NULL,
    description text,
    status inv_coupon_status_enum NOT NULL DEFAULT 'active',
    max_usages integer,
    max_usages_per_customer integer DEFAULT 1,
    current_usages integer NOT NULL DEFAULT 0,
    min_order_amount numeric(18, 4),
    start_date timestamptz,
    end_date timestamptz,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    is_single_use boolean NOT NULL DEFAULT false,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_inv_coupons_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.inv_coupon_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    coupon_id uuid NOT NULL REFERENCES public.inv_coupons(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    sales_invoice_id uuid REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid
);

CREATE TABLE IF NOT EXISTS public.inv_sales_invoice_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    promotion_id uuid REFERENCES public.inv_promotions(id) ON DELETE SET NULL,
    coupon_id uuid REFERENCES public.inv_coupons(id) ON DELETE SET NULL,
    discount_source inv_discount_source_enum NOT NULL DEFAULT 'promotion',
    discount_type discount_type_enum NOT NULL DEFAULT 'percentage',
    discount_rate numeric(18, 4),
    discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
    reason text,
    applied_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_sales_invoice_item_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sales_invoice_item_id uuid NOT NULL REFERENCES public.sales_invoice_items(id) ON DELETE CASCADE,
    sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    promotion_id uuid REFERENCES public.inv_promotions(id) ON DELETE SET NULL,
    promotion_rule_id uuid REFERENCES public.inv_promotion_rules(id) ON DELETE SET NULL,
    coupon_id uuid REFERENCES public.inv_coupons(id) ON DELETE SET NULL,
    discount_source inv_discount_source_enum NOT NULL DEFAULT 'promotion',
    discount_type discount_type_enum NOT NULL DEFAULT 'percentage',
    discount_rate numeric(18, 4),
    discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
    original_unit_price numeric(18, 4) NOT NULL DEFAULT 0,
    final_unit_price numeric(18, 4) NOT NULL DEFAULT 0,
    quantity numeric(18, 4) NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_discount_approval_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(store_id) ON DELETE SET NULL,
    pos_terminal_id uuid REFERENCES public.pos_terminals(id) ON DELETE SET NULL,
    requested_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    sales_invoice_id uuid REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    discount_type discount_type_enum NOT NULL DEFAULT 'percentage',
    discount_value numeric(18, 4) NOT NULL DEFAULT 0,
    discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
    original_amount numeric(18, 4) NOT NULL DEFAULT 0,
    user_max_allowed_percent numeric(5, 2) NOT NULL DEFAULT 0,
    status inv_approval_status_enum NOT NULL DEFAULT 'pending',
    reason text NOT NULL,
    rejection_reason text,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_promotion_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES public.inv_promotions(id) ON DELETE CASCADE,
    sales_invoice_id uuid REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    discount_amount numeric(18, 4) NOT NULL DEFAULT 0,
    channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
    store_id uuid REFERENCES public.stores(store_id) ON DELETE SET NULL,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    used_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_promotions_tenant_status ON public.inv_promotions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_promotions_dates ON public.inv_promotions(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_inv_promotions_code ON public.inv_promotions(tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_inv_promo_rules_promo ON public.inv_promotion_rules(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_conditions_promo ON public.inv_promotion_conditions(promotion_id);

CREATE INDEX IF NOT EXISTS idx_inv_promo_products_promo ON public.inv_promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_products_product ON public.inv_promotion_products(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_products_variant ON public.inv_promotion_products(product_variant_id);

CREATE INDEX IF NOT EXISTS idx_inv_promo_categories_promo ON public.inv_promotion_categories(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_categories_cat ON public.inv_promotion_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_inv_promo_brands_promo ON public.inv_promotion_brands(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_brands_brand ON public.inv_promotion_brands(brand_id);

CREATE INDEX IF NOT EXISTS idx_inv_promo_cust_groups_promo ON public.inv_promotion_customer_groups(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_cust_groups_group ON public.inv_promotion_customer_groups(customer_group_id);

CREATE INDEX IF NOT EXISTS idx_inv_promo_channels_promo ON public.inv_promotion_channels(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_stores_promo ON public.inv_promotion_stores(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_promo_branches_promo ON public.inv_promotion_branches(promotion_id);

CREATE INDEX IF NOT EXISTS idx_inv_coupons_tenant_code ON public.inv_coupons(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_inv_coupons_promo ON public.inv_coupons(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_coupon_redemptions_coupon ON public.inv_coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_inv_coupon_redemptions_cust ON public.inv_coupon_redemptions(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_inv_inv_discounts_invoice ON public.inv_sales_invoice_discounts(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_item_discounts_item ON public.inv_sales_invoice_item_discounts(sales_invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_item_discounts_invoice ON public.inv_sales_invoice_item_discounts(sales_invoice_id);

CREATE INDEX IF NOT EXISTS idx_inv_approvals_tenant_status ON public.inv_discount_approval_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_usage_logs_promo ON public.inv_promotion_usage_logs(promotion_id);
CREATE INDEX IF NOT EXISTS idx_inv_usage_logs_cust ON public.inv_promotion_usage_logs(tenant_id, customer_id);

-- Enable RLS
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'inv_promotions',
        'inv_promotion_rules',
        'inv_promotion_conditions',
        'inv_promotion_products',
        'inv_promotion_categories',
        'inv_promotion_brands',
        'inv_promotion_customer_groups',
        'inv_promotion_channels',
        'inv_promotion_stores',
        'inv_promotion_branches',
        'inv_coupons',
        'inv_coupon_redemptions',
        'inv_sales_invoice_discounts',
        'inv_sales_invoice_item_discounts',
        'inv_discount_approval_requests',
        'inv_promotion_usage_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_authenticated_all'
        ) THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl || '_authenticated_all', tbl);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_anon_select'
        ) THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true);', tbl || '_anon_select', tbl);
        END IF;
    END LOOP;
END $$;
