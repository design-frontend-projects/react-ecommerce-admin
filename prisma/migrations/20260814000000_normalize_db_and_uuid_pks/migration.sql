-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "cash_movement_reason_enum" AS ENUM ('opening', 'closing', 'sale', 'purchase_refund', 'customer_refund', 'supplier_payment', 'customer_payment', 'expense', 'income', 'payout', 'adjustment');

-- CreateEnum
CREATE TYPE "cash_movement_type_enum" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "discount_type_enum" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "invoice_status_enum" AS ENUM ('draft', 'posted', 'partially_paid', 'paid', 'cancelled', 'refunded', 'returned', 'partially_returned');

-- CreateEnum
CREATE TYPE "movement_type_enum" AS ENUM ('opening_stock', 'sale', 'sale_return', 'purchase', 'purchase_return', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out', 'damage', 'expired', 'reserved', 'released', 'production_output', 'production_consumption', 'lost', 'found', 'cycle_count_in', 'cycle_count_out', 'reservation_conversion');

-- CreateEnum
CREATE TYPE "order_item_status" AS ENUM ('pending', 'preparing', 'ready', 'served');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('open', 'in_progress', 'ready', 'paid', 'void', 'void_pending');

-- CreateEnum
CREATE TYPE "payment_method_type_enum" AS ENUM ('cash', 'card', 'bank_transfer', 'wallet', 'cheque', 'mixed');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "reorder_request_status" AS ENUM ('pending', 'read');

-- CreateEnum
CREATE TYPE "price_list_types" AS ENUM ('retail', 'wholesale', 'vip', 'black_friday', 'valintine_day');

-- CreateEnum
CREATE TYPE "record_status" AS ENUM ('active', 'inactive', 'draft', 'posted', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('approved', 'rejected', 'waiting_manager', 'waiting_review');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "return_status_enum" AS ENUM ('draft', 'approved', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "session_status_enum" AS ENUM ('open', 'closed', 'suspended');

-- CreateEnum
CREATE TYPE "shipment_status_enum" AS ENUM ('prepared', 'pending', 'approved', 'in_transit', 'shipped', 'delivered', 'cancelled', 'failed', 'delayed', 'refundable');

-- CreateEnum
CREATE TYPE "shift_status" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "store_type" AS ENUM ('main', 'retail', 'damaged', 'returns', 'virtual');

-- CreateEnum
CREATE TYPE "subscription_commission_type" AS ENUM ('fixed', 'percentage', 'subscription');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('new', 'paid', 'canceled');

-- CreateEnum
CREATE TYPE "table_status" AS ENUM ('free', 'occupied', 'reserved', 'dirty');

-- CreateEnum
CREATE TYPE "transaction_type_enum" AS ENUM ('sale', 'purchase', 'payment_in', 'payment_out', 'refund', 'expense', 'income', 'opening_balance', 'adjustment');

-- CreateEnum
CREATE TYPE "transfer_status_enum" AS ENUM ('draft', 'in_transit', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "adjustment_status_enum" AS ENUM ('draft', 'pending', 'approved', 'cancelled');

-- CreateEnum
CREATE TYPE "adjustment_type_enum" AS ENUM ('manual', 'damage', 'stocktake');

-- CreateEnum
CREATE TYPE "adjustment_reason_enum" AS ENUM ('damage', 'expired', 'theft', 'data_entry_error', 'stocktake_discrepancy', 'other');

-- CreateEnum
CREATE TYPE "user_module" AS ENUM ('inventory', 'restaurant');

-- CreateEnum
CREATE TYPE "void_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "location_type_enum" AS ENUM ('zone', 'rack', 'shelf', 'bin');

-- CreateEnum
CREATE TYPE "product_type_enum" AS ENUM ('simple', 'variant', 'bundle', 'service', 'composite');

-- CreateEnum
CREATE TYPE "batch_status_enum" AS ENUM ('active', 'depleted', 'expired', 'blocked');

-- CreateEnum
CREATE TYPE "serial_status_enum" AS ENUM ('in_stock', 'reserved', 'sold', 'returned', 'damaged', 'in_transit', 'written_off');

-- CreateEnum
CREATE TYPE "po_lifecycle_status_enum" AS ENUM ('draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "receipt_status_enum" AS ENUM ('draft', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "requisition_status_enum" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled');

-- CreateEnum
CREATE TYPE "sales_order_status_enum" AS ENUM ('draft', 'confirmed', 'picking', 'packed', 'delivered', 'invoiced', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "stock_reservation_status_enum" AS ENUM ('active', 'consumed', 'released', 'expired');

-- CreateEnum
CREATE TYPE "stock_count_status_enum" AS ENUM ('draft', 'counting', 'review', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "reorder_suggestion_status_enum" AS ENUM ('open', 'converted', 'dismissed', 'expired');

-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "tenant_type" AS ENUM ('company', 'restaurant', 'retail', 'market', 'pharmacy', 'service', 'other');

-- CreateEnum
CREATE TYPE "notification_severity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS');

-- CreateEnum
CREATE TYPE "notification_target_type" AS ENUM ('ALL', 'ROLE', 'USER');

-- CreateTable
CREATE TABLE "activity_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "address_type" VARCHAR(30) DEFAULT 'billing',
    "line1" VARCHAR(255),
    "line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "country_id" UUID,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "address_type" VARCHAR(30) DEFAULT 'delivery',
    "line1" VARCHAR(255),
    "line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "city_id" UUID NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(20),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID,
    "tenant_id" UUID,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID,
    "is_active" BOOLEAN DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "country_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "phone_code" VARCHAR(10),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "currency_id" UUID,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "customer_id" UUID NOT NULL,
    "card_type" VARCHAR(20),
    "last_four_digits" CHAR(4) NOT NULL,
    "expiry_month" SMALLINT NOT NULL,
    "expiry_year" SMALLINT NOT NULL,
    "cardholder_name" VARCHAR(200) NOT NULL,
    "billing_address" TEXT,
    "is_default" BOOLEAN DEFAULT false,
    "tokenized_id" VARCHAR(100),
    "added_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "customer_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "minimum_order_amount" DECIMAL(10,2) DEFAULT 0,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200),
    "phone" VARCHAR(50),
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100) DEFAULT 'USA',
    "date_of_birth" DATE,
    "loyalty_points" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "group_id" UUID,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER DEFAULT 10,
    "max_stock_level" INTEGER DEFAULT 100,
    "location" VARCHAR(100),
    "last_restocked" TIMESTAMP(6),
    "auth_user_id" UUID DEFAULT auth.uid(),
    "store_id" UUID,
    "is_marketplace" BOOLEAN DEFAULT false,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(50),
    "resource" VARCHAR(100),
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "customer_id" UUID,
    "promotion_id" UUID,
    "sale_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "card_id" UUID,
    "status" VARCHAR(20) DEFAULT 'completed',
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "store_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "device_identifier" VARCHAR(255),
    "receipt_printer_name" VARCHAR(255),
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "group_id" UUID,
    "price" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "end_date" DATE,
    "is_active" BOOLEAN DEFAULT true,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "description" TEXT,
    "type" "price_list_types",
    "store_id" UUID,

    CONSTRAINT "price_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "price_list_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "min_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "max_discount_percent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "barcode" VARCHAR(100),
    "price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "stock_quantity" INTEGER DEFAULT 0,
    "min_stock" INTEGER DEFAULT 0,
    "weight" DECIMAL(10,2),
    "dimensions" JSONB,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "uom_id" UUID,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "supplier_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sku" VARCHAR(50) NOT NULL,
    "barcode" VARCHAR(100),
    "category_id" UUID,
    "weight" DECIMAL(8,2),
    "dimensions" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "reorder_level" DECIMAL,
    "product_name_embedding" vector,
    "auth_user_id" UUID,
    "store_id" TEXT,
    "has_variants" BOOLEAN DEFAULT false,
    "is_deleted" BOOLEAN DEFAULT false,
    "base_price" DECIMAL(10,2),
    "has_expiration" BOOLEAN DEFAULT false,
    "expiration_date" DATE,
    "is_marketplace" BOOLEAN DEFAULT false,
    "base_uom_id" UUID,
    "brand_id" UUID,
    "is_batch_tracked" BOOLEAN NOT NULL DEFAULT false,
    "is_serial_tracked" BOOLEAN NOT NULL DEFAULT false,
    "product_type" "product_type_enum" NOT NULL DEFAULT 'simple',

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_reorder_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "requested_by_auth_user_id" UUID NOT NULL,
    "requested_by_name" VARCHAR(255) NOT NULL,
    "requested_by_role" VARCHAR(100),
    "requested_quantity" INTEGER,
    "requested_min_stock" INTEGER,
    "status" "reorder_request_status" NOT NULL DEFAULT 'pending',
    "read_by_auth_user_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by_user_id" TEXT,
    "read_by_user_id" TEXT,

    CONSTRAINT "pos_reorder_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_owner" BOOLEAN NOT NULL DEFAULT true,
    "system_owner" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "activity" VARCHAR(100),
    "auth_user_id" UUID NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "is_user" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" UUID,
    "role" TEXT,
    "payment_method" VARCHAR(50),
    "transfer_ref" VARCHAR(100),
    "parent_auth_user_id" UUID NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "promotion_id" UUID NOT NULL,
    "customer_id" UUID,
    "sale_id" UUID,
    "used_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "order_id" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "customer_mobile" VARCHAR(50),
    "res_order_id" UUID,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "discount_type" "discount_type_enum",
    "discount_value" DECIMAL(10,2) NOT NULL,
    "minimum_purchase" DECIMAL(10,2) DEFAULT 0,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "usage_limit" INTEGER,
    "usage_per_customer" INTEGER DEFAULT 1,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "activities" TEXT[] DEFAULT ARRAY['dine_in', 'takeaway', 'delivery']::TEXT[],
    "buy_quantity" INTEGER,
    "get_discount_value" DECIMAL(10,2) DEFAULT 100,
    "get_quantity" INTEGER,
    "promo_type" VARCHAR(30) NOT NULL DEFAULT 'order_discount',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_menu_scopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promotion_id" UUID NOT NULL,
    "menu_item_id" UUID,
    "menu_category_id" UUID,
    "scope_role" VARCHAR(10) NOT NULL DEFAULT 'target',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_menu_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_invoice_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "tax_rate_id" UUID,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "description" VARCHAR(255),
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL,
    "discount_type" "discount_type_enum",
    "discount_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "branch_id" UUID NOT NULL,
    "store_id" UUID,
    "supplier_id" UUID NOT NULL,
    "invoice_no" VARCHAR(100) NOT NULL,
    "supplier_invoice_no" VARCHAR(100),
    "invoice_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMPTZ(6),
    "status" "invoice_status_enum" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_type" "discount_type_enum",
    "discount_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rounding_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "po_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "subtotal" DECIMAL,
    "received_quantity" DECIMAL,
    "product_variant_id" UUID,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "supplier_id" UUID NOT NULL,
    "order_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" DATE,
    "total_amount" DECIMAL(12,2),
    "status" VARCHAR(20) DEFAULT 'pending',
    "notes" TEXT,
    "po_number" INTEGER,
    "created_at" DATE,
    "discounnt_amount" DECIMAL,
    "shipping_amount" DECIMAL,
    "tax_amount" DECIMAL,
    "payment_status" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" TEXT,
    "branch_id" UUID,
    "closed_at" TIMESTAMPTZ(6),
    "lifecycle_status" "po_lifecycle_status_enum",
    "sent_at" TIMESTAMPTZ(6),
    "store_id" UUID,
    "warehouse_id" UUID,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_return_id" UUID NOT NULL,
    "purchase_invoice_item_id" UUID,
    "product_variant_id" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "batch_id" UUID,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_invoice_id" UUID,
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "branch_id" UUID NOT NULL,
    "store_id" UUID,
    "supplier_id" UUID,
    "return_no" VARCHAR(100) NOT NULL,
    "return_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "return_status_enum" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "sale_id" TEXT,
    "order_id" TEXT,
    "refund_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "reason" VARCHAR(255),
    "processed_by" TEXT,
    "notes" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "refund_status" "refund_status",
    "store_id" UUID,
    "sales_invoice_id" UUID,
    "branch_id" UUID,
    "created_by" TEXT,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "event_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "blocked_tables" UUID[] DEFAULT ARRAY[]::UUID[],
    "is_active" BOOLEAN DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_floors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_item_properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "item_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "options" JSONB DEFAULT '[]',
    "is_required" BOOLEAN DEFAULT false,
    "max_selections" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_item_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_item_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "item_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "price_adjustment" DECIMAL(10,2) DEFAULT 0,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_item_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_menu_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "icon" VARCHAR(50),
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "category_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "name_ar" VARCHAR(200),
    "description" TEXT,
    "description_ar" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "is_available" BOOLEAN DEFAULT true,
    "preparation_time" INTEGER DEFAULT 15,
    "allergens" JSONB DEFAULT '[]',
    "tags" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "recipient_id" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT,
    "data" JSONB DEFAULT '{}',
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "order_id" UUID,
    "item_id" UUID,
    "variant_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "properties" JSONB DEFAULT '[]',
    "notes" TEXT,
    "status" "order_item_status" DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "order_number" VARCHAR(20) NOT NULL,
    "table_id" UUID,
    "shift_id" UUID,
    "created_by" UUID,
    "customer_name" VARCHAR(200),
    "status" "order_status" DEFAULT 'open',
    "subtotal" DECIMAL(10,2) DEFAULT 0,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "discount_type" "discount_type_enum",
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "tip_amount" DECIMAL(10,2) DEFAULT 0,
    "total_amount" DECIMAL(10,2) DEFAULT 0,
    "payment_method" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "mobile_number" TEXT,
    "promotion_id" UUID,
    "promo_discount_amount" DECIMAL(10,2) DEFAULT 0,
    "received_amount" DECIMAL(10,2) DEFAULT 0,
    "change_amount" DECIMAL(10,2) DEFAULT 0,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "shipment_id" UUID,
    "applied_promotion_id" UUID,
    "order_type" VARCHAR(20),

    CONSTRAINT "res_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "order_id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "recipient_name" VARCHAR(200) NOT NULL,
    "recipient_phone" VARCHAR(50) NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "status" "shipment_status_enum" NOT NULL DEFAULT 'pending',
    "tracking_number" VARCHAR(100),
    "carrier" VARCHAR(100),
    "shipped_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "res_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "is_enabled" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_promotion_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "promotion_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_promotion_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL DEFAULT 'percent',
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_purchase" DECIMAL(10,2) DEFAULT 0,
    "max_usage" INTEGER,
    "usage_count" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "starts_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "table_id" UUID,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "party_size" INTEGER DEFAULT 2,
    "reservation_date" DATE NOT NULL,
    "reservation_time" TIME(6) NOT NULL,
    "duration_minutes" INTEGER DEFAULT 90,
    "status" "reservation_status" DEFAULT 'confirmed',
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "closed_by" TEXT,
    "opening_cash" DECIMAL(10,2) DEFAULT 0,
    "closing_cash" DECIMAL(10,2),
    "status" VARCHAR(20) DEFAULT 'open',
    "opened_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "opened_by" VARCHAR(255),
    "restaurant_id" VARCHAR(255),
    "branch_id" UUID,
    "expected_cash" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "cash_sales_total" DECIMAL(12,2),
    "movements_in_total" DECIMAL(12,2),
    "movements_out_total" DECIMAL(12,2),
    "original_closing_cash" DECIMAL(12,2),
    "original_variance" DECIMAL(12,2),
    "variance_comment" TEXT,
    "close_reason" TEXT,
    "closed_by_user_id" UUID,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "is_corrected" BOOLEAN NOT NULL DEFAULT false,
    "stale_notified_at" TIMESTAMPTZ(6),

    CONSTRAINT "res_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "floor_id" UUID,
    "table_number" VARCHAR(20) NOT NULL,
    "seats" INTEGER DEFAULT 4,
    "status" "table_status" DEFAULT 'free',
    "position_x" INTEGER DEFAULT 0,
    "position_y" INTEGER DEFAULT 0,
    "shape" VARCHAR(20) DEFAULT 'square',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "res_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_void_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "order_id" UUID,
    "requested_by" UUID,
    "approved_by" UUID,
    "reason" TEXT NOT NULL,
    "status" "void_request_status" DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "res_void_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2),
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "tax_rate_id" UUID,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "description" VARCHAR(255),
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "discount_type" "discount_type_enum",
    "discount_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "batch_id" UUID,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "branch_id" UUID NOT NULL,
    "store_id" UUID,
    "customer_id" UUID,
    "pos_terminal_id" UUID,
    "price_list_id" UUID,
    "channel" VARCHAR(20) DEFAULT 'counter',
    "invoice_no" VARCHAR(100) NOT NULL,
    "external_reference" VARCHAR(100),
    "invoice_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMPTZ(6),
    "status" "invoice_status_enum" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_type" "discount_type_enum",
    "discount_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rounding_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sales_return_id" UUID NOT NULL,
    "sales_invoice_item_id" UUID,
    "product_variant_id" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "batch_id" UUID,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "sales_invoice_id" UUID,
    "branch_id" UUID NOT NULL,
    "store_id" UUID,
    "customer_id" UUID,
    "return_no" VARCHAR(100) NOT NULL,
    "return_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "return_status_enum" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "order_id" UUID NOT NULL,
    "tracking_number" VARCHAR(100),
    "shipped_date" TIMESTAMP(6),
    "delivered_date" TIMESTAMP(6),
    "carrier" VARCHAR(100),
    "status" "shipment_status_enum" NOT NULL DEFAULT 'prepared',
    "notes" TEXT,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "carrier" VARCHAR(100),
    "estimated_days_min" INTEGER,
    "estimated_days_max" INTEGER,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "method_id" UUID NOT NULL,
    "destination_country" VARCHAR(100) DEFAULT 'USA',
    "destination_state" VARCHAR(100),
    "destination_postal_code" VARCHAR(20),
    "min_weight" DECIMAL(8,2) DEFAULT 0,
    "max_weight" DECIMAL(8,2),
    "min_order_amount" DECIMAL(10,2) DEFAULT 0,
    "max_order_amount" DECIMAL(10,2),
    "cost" DECIMAL(10,2) NOT NULL,
    "is_free" BOOLEAN DEFAULT false,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "auth_user_id" UUID DEFAULT auth.uid(),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "city_id" UUID,
    "country_id" UUID,
    "name" TEXT,
    "store_id" UUID NOT NULL,
    "status" BOOLEAN DEFAULT true,
    "branch_id" UUID,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "contact_person" VARCHAR(100),
    "email" VARCHAR(200),
    "phone" VARCHAR(50),
    "address" TEXT,
    "website" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "city_id" UUID,
    "is_preferred" BOOLEAN DEFAULT false,
    "is_system" BOOLEAN DEFAULT false,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "tax_type" VARCHAR(50) NOT NULL,
    "rate" DECIMAL NOT NULL,
    "description" TEXT,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
    "effective_to" DATE,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_inclusive" BOOLEAN DEFAULT false,
    "auth_user_id" UUID,
    "country_id" UUID,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subscription_id" UUID NOT NULL,
    "tenant_id" UUID,
    "status" "subscription_status" NOT NULL DEFAULT 'new',
    "first_use" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "commission_amount" DECIMAL(10,2) DEFAULT 0,
    "commission_type" "subscription_commission_type" NOT NULL DEFAULT 'subscription',
    "first_name" TEXT,
    "last_name" TEXT,
    "is_owner" BOOLEAN,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "display_name" VARCHAR(255),
    "legal_name" VARCHAR(255),
    "type" "tenant_type" NOT NULL DEFAULT 'company',
    "status" "tenant_status" NOT NULL DEFAULT 'pending',
    "logo_url" TEXT,
    "domain" VARCHAR(255),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "locale" VARCHAR(20) NOT NULL DEFAULT 'en-US',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "country_code" CHAR(2),
    "country_id" UUID,
    "currency_id" UUID,
    "default_branch_id" UUID,
    "current_subscription_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID DEFAULT auth.uid(),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "avatar_url" TEXT,
    "primary_module" "user_module" DEFAULT 'inventory',
    "modules" "user_module"[] DEFAULT ARRAY['inventory']::"user_module"[],
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "default_role" TEXT,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "is_restuarant_user" BOOLEAN DEFAULT false,
    "parent_tenant_id" UUID,
    "tenant_id" UUID,
    "refund_pin_code" DECIMAL,
    "id_number" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "sales_invoice_item_id" UUID,
    "sales_return_item_id" UUID,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "transaction_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "auth_user_id" UUID NOT NULL DEFAULT auth.uid(),
    "transaction_number" VARCHAR(50) NOT NULL,
    "transaction_type" "transaction_type_enum" NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) DEFAULT 0,
    "discount_amount" DECIMAL(12,2) DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "reference_transaction_id" UUID,
    "sales_invoice_id" UUID,
    "sales_return_id" UUID,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "role_id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("auth_user_id","role_id")
);

-- CreateTable
CREATE TABLE "business_activity_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_activity_types" (
    "tenant_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_activity_types_pkey" PRIMARY KEY ("tenant_id","activity_type_id")
);

-- CreateTable
CREATE TABLE "app_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_activity_types" (
    "module_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "module_activity_types_pkey" PRIMARY KEY ("module_id","activity_type_id")
);

-- CreateTable
CREATE TABLE "app_screens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "route" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "icon" VARCHAR(100),
    "module_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_roles" (
    "screen_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_roles_pkey" PRIMARY KEY ("screen_id","role_id")
);

-- CreateTable
CREATE TABLE "screen_permissions" (
    "screen_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_permissions_pkey" PRIMARY KEY ("screen_id","permission_id")
);

-- CreateTable
CREATE TABLE "permission_buttons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "permission_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_buttons" (
    "screen_id" UUID NOT NULL,
    "button_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_buttons_pkey" PRIMARY KEY ("screen_id","button_id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "tenant_user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("tenant_user_id","permission_id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "store_id" UUID,
    "product_variant_id" UUID NOT NULL,
    "movement_type" "movement_type_enum" NOT NULL,
    "reference_type" VARCHAR(100),
    "reference_id" UUID,
    "qty_in" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_out" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "movement_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batch_id" UUID,
    "dest_store_id" UUID,
    "dest_warehouse_location_id" UUID,
    "idempotency_key" TEXT,
    "movement_group_id" UUID,
    "qty_after" DECIMAL(18,4),
    "qty_before" DECIMAL(18,4),
    "reason_code" VARCHAR(40),
    "source_document_id" UUID,
    "source_document_type" VARCHAR(40),
    "warehouse_id" UUID,
    "warehouse_location_id" UUID,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "qty_on_hand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_available" DECIMAL(18,4),
    "avg_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "last_movement_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "from_store_id" UUID NOT NULL,
    "to_store_id" UUID NOT NULL,
    "from_branch_id" UUID,
    "to_branch_id" UUID,
    "status" "transfer_status_enum" NOT NULL DEFAULT 'draft',
    "reference_no" VARCHAR(50),
    "notes" TEXT,
    "created_by" TEXT,
    "shipped_by" TEXT,
    "received_by" TEXT,
    "shipped_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stock_transfer_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batch_id" UUID,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "status" "adjustment_status_enum" NOT NULL DEFAULT 'draft',
    "type" "adjustment_type_enum" NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stock_adjustment_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "qty_before" DECIMAL(18,4) NOT NULL,
    "qty_after" DECIMAL(18,4) NOT NULL,
    "qty_adjusted" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" "adjustment_reason_enum",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batch_id" UUID,

    CONSTRAINT "stock_adjustment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "group" VARCHAR(50),
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "auth_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "store_id" UUID,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "parent_id" UUID,
    "location_type" "location_type_enum" NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120),
    "path" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_pickable" BOOLEAN NOT NULL DEFAULT true,
    "is_receivable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_by_location" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "warehouse_location_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_id" UUID,
    "qty_on_hand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "last_movement_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_by_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(30),
    "logo_url" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uoms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "uom_category" VARCHAR(30) NOT NULL DEFAULT 'count',
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "uoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "from_uom_id" UUID NOT NULL,
    "to_uom_id" UUID NOT NULL,
    "factor" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "barcode" VARCHAR(64) NOT NULL,
    "barcode_type" VARCHAR(20) NOT NULL DEFAULT 'EAN13',
    "uom_id" UUID,
    "qty_per_scan" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_product_id" UUID NOT NULL,
    "component_variant_id" UUID NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "uom_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "bundle_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_number" VARCHAR(60) NOT NULL,
    "supplier_id" UUID,
    "manufacture_date" DATE,
    "expiry_date" DATE,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "batch_status_enum" NOT NULL DEFAULT 'active',
    "received_reference_type" VARCHAR(40),
    "received_reference_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_serials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_id" UUID,
    "serial_number" VARCHAR(80) NOT NULL,
    "status" "serial_status_enum" NOT NULL DEFAULT 'in_stock',
    "store_id" UUID,
    "warehouse_location_id" UUID,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "received_at" TIMESTAMPTZ(6),
    "sold_at" TIMESTAMPTZ(6),
    "received_reference_type" VARCHAR(40),
    "received_reference_id" UUID,
    "last_reference_type" VARCHAR(40),
    "last_reference_id" UUID,
    "warranty_until" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "product_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_serials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "movement_id" UUID NOT NULL,
    "serial_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "receipt_number" VARCHAR(30) NOT NULL DEFAULT ('GR-'::text || lpad((nextval('goods_receipts_seq'::regclass))::text, 6, '0'::text)),
    "purchase_order_id" UUID,
    "supplier_id" UUID,
    "store_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "status" "receipt_status_enum" NOT NULL DEFAULT 'draft',
    "received_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "posted_by" TEXT,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goods_receipt_id" UUID NOT NULL,
    "purchase_order_item_id" UUID,
    "product_variant_id" UUID NOT NULL,
    "qty_received" DECIMAL(18,4) NOT NULL,
    "uom_id" UUID,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "warehouse_location_id" UUID,
    "batch_id" UUID,
    "batch_number" VARCHAR(60),
    "expiry_date" DATE,
    "serial_numbers" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requisitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "requisition_number" VARCHAR(30) NOT NULL DEFAULT ('PR-'::text || lpad((nextval('purchase_requisitions_seq'::regclass))::text, 6, '0'::text)),
    "branch_id" UUID,
    "store_id" UUID,
    "status" "requisition_status_enum" NOT NULL DEFAULT 'draft',
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "requested_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "converted_purchase_order_id" UUID,
    "needed_by" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requisition_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "qty_requested" DECIMAL(18,4) NOT NULL,
    "uom_id" UUID,
    "preferred_supplier_id" UUID,
    "est_unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" VARCHAR(30) NOT NULL DEFAULT ('SO-'::text || lpad((nextval('sales_orders_seq'::regclass))::text, 6, '0'::text)),
    "customer_id" UUID,
    "branch_id" UUID,
    "store_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "status" "sales_order_status_enum" NOT NULL DEFAULT 'draft',
    "order_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" DATE,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sales_invoice_id" UUID,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sales_order_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "qty_ordered" DECIMAL(18,4) NOT NULL,
    "qty_reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_fulfilled" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "uom_id" UUID,
    "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "batch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_id" UUID,
    "warehouse_location_id" UUID,
    "qty" DECIMAL(18,4) NOT NULL,
    "qty_consumed" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "stock_reservation_status_enum" NOT NULL DEFAULT 'active',
    "reference_type" VARCHAR(40) NOT NULL DEFAULT 'sales_order',
    "reference_id" UUID,
    "reference_item_id" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_counts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "count_number" VARCHAR(30) NOT NULL DEFAULT ('SC-'::text || lpad((nextval('stock_counts_seq'::regclass))::text, 6, '0'::text)),
    "store_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "warehouse_location_id" UUID,
    "category_id" UUID,
    "status" "stock_count_status_enum" NOT NULL DEFAULT 'draft',
    "is_blind" BOOLEAN NOT NULL DEFAULT false,
    "snapshot_at" TIMESTAMPTZ(6),
    "counted_by" TEXT,
    "reviewed_by" TEXT,
    "posted_by" TEXT,
    "posted_at" TIMESTAMPTZ(6),
    "posted_adjustment_id" UUID,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stock_count_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "warehouse_location_id" UUID,
    "batch_id" UUID,
    "qty_snapshot" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_counted" DECIMAL(18,4),
    "variance" DECIMAL(18,4),
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "counted_at" TIMESTAMPTZ(6),
    "counted_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "min_qty" DECIMAL(18,4),
    "max_qty" DECIMAL(18,4),
    "safety_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reorder_point" DECIMAL(18,4) NOT NULL,
    "reorder_qty" DECIMAL(18,4),
    "eoq" DECIMAL(18,4),
    "lead_time_days" INTEGER,
    "preferred_supplier_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "reorder_rule_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "qty_available_at_run" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qty_on_order_at_run" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "suggested_qty" DECIMAL(18,4) NOT NULL,
    "preferred_supplier_id" UUID,
    "status" "reorder_suggestion_status_enum" NOT NULL DEFAULT 'open',
    "converted_requisition_id" UUID,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" UUID DEFAULT auth.uid(),

    CONSTRAINT "reorder_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_auth_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "diff" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rbac_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_cash_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shift_id" UUID NOT NULL,
    "branch_id" UUID,
    "movement_type" "cash_movement_type_enum" NOT NULL,
    "reason" "cash_movement_reason_enum" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "order_id" UUID,
    "created_by" UUID,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "res_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_shift_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shift_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(40) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "res_shift_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_shift_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" VARCHAR(255) NOT NULL,
    "branch_id" UUID,
    "variance_threshold" DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    "require_comment_over_threshold" BOOLEAN NOT NULL DEFAULT true,
    "stale_shift_hours" INTEGER NOT NULL DEFAULT 12,
    "auto_close_hours" INTEGER NOT NULL DEFAULT 24,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "res_shift_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "severity" "notification_severity" NOT NULL DEFAULT 'INFO',
    "target_type" "notification_target_type" NOT NULL DEFAULT 'ALL',
    "target_role" VARCHAR(100),
    "sender_id" UUID,
    "template_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "auth_user_id" UUID DEFAULT auth.uid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "header" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "severity" "notification_severity" NOT NULL DEFAULT 'INFO',
    "created_by" UUID,
    "auth_user_id" UUID DEFAULT auth.uid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_code_key" ON "activity_types"("code");

-- CreateIndex
CREATE INDEX "idx_audit_logs_activity_type_id" ON "audit_logs"("activity_type_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_profile_id" ON "audit_logs"("profile_id");

-- CreateIndex
CREATE INDEX "idx_addresses_tenant_id" ON "addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_addresses_tenant_id" ON "res_addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_branches_city_id" ON "branches"("city_id");

-- CreateIndex
CREATE INDEX "idx_branches_tenant_id" ON "branches"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_categories_tenant_id" ON "categories"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_cities_country_id" ON "cities"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_country_id_key" ON "cities"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "idx_customer_cards_customer" ON "customer_cards"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_cards_tenant_id" ON "customer_cards"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_customer_groups_tenant_id" ON "customer_groups"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "idx_customers_tenant_id" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_customers_email" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "idx_inventory_tenant_id" ON "inventory"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_inventory_quantity" ON "inventory"("quantity") WHERE (quantity < reorder_level);

-- CreateIndex
CREATE UNIQUE INDEX "payment_types_name_key" ON "payment_types"("name");

-- CreateIndex
CREATE INDEX "idx_payment_types_tenant_id" ON "payment_types"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "idx_pos_sales_tenant_id" ON "pos_sales"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_pos_sales_customer" ON "pos_sales"("customer_id");

-- CreateIndex
CREATE INDEX "idx_pos_sales_date" ON "pos_sales"("sale_date");

-- CreateIndex
CREATE INDEX "idx_price_list_tenant_id" ON "price_list"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_price_list_active" ON "price_list"("is_active") WHERE (is_active = true);

-- CreateIndex
CREATE INDEX "idx_price_list_group" ON "price_list"("group_id");

-- CreateIndex
CREATE INDEX "idx_price_list_product" ON "price_list"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_product_group_active" ON "price_list"("product_id", "group_id");

-- CreateIndex
CREATE INDEX "idx_price_list_items_tenant_id" ON "price_list_items"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_product_variant_id_key" ON "price_list_items"("price_list_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "idx_product_variants_uom_id" ON "product_variants"("uom_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_tenant_id" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_sku" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_supplier" ON "products"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_products_brand_id" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "idx_products_tenant_category" ON "products"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "idx_pos_reorder_requests_product" ON "pos_reorder_requests"("product_id");

-- CreateIndex
CREATE INDEX "idx_pos_reorder_requests_variant" ON "pos_reorder_requests"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_email" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_branch_id" ON "profiles"("branch_id");

-- CreateIndex
CREATE INDEX "idx_promotion_usage_tenant_id" ON "promotion_usage"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_promotion_usage_res_order" ON "promotion_usage"("res_order_id");

-- CreateIndex
CREATE INDEX "idx_promotion_usage_promo_mobile" ON "promotion_usage"("promotion_id", "customer_mobile");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "idx_promotions_tenant_id" ON "promotions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_promotions_active_dates" ON "promotions"("start_date", "end_date") WHERE (is_active = true);

-- CreateIndex
CREATE INDEX "idx_promotions_code" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "idx_promotions_tenant_active" ON "promotions"("tenant_id", "is_active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_promotion_menu_scopes_promotion" ON "promotion_menu_scopes"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_promotion_menu_scopes_item" ON "promotion_menu_scopes"("menu_item_id");

-- CreateIndex
CREATE INDEX "idx_promotion_menu_scopes_category" ON "promotion_menu_scopes"("menu_category_id");

-- CreateIndex
CREATE INDEX "idx_purchase_invoices_tenant_id" ON "purchase_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_tenant_id" ON "purchase_order_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_variant" ON "purchase_order_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_po" ON "purchase_order_items"("po_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_tenant_id" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_supplier" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_lifecycle_status" ON "purchase_orders"("lifecycle_status");

-- CreateIndex
CREATE INDEX "idx_refunds_tenant_id" ON "refunds"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_refunds_order" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "idx_refunds_sale" ON "refunds"("sale_id");

-- CreateIndex
CREATE INDEX "idx_res_events_tenant_id" ON "res_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_events_date" ON "res_events"("event_date");

-- CreateIndex
CREATE INDEX "idx_res_floors_tenant_id" ON "res_floors"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_item_properties_tenant_id" ON "res_item_properties"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_item_variants_tenant_id" ON "res_item_variants"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_item_variants_item" ON "res_item_variants"("item_id");

-- CreateIndex
CREATE INDEX "idx_res_menu_categories_tenant_id" ON "res_menu_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_menu_items_tenant_id" ON "res_menu_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_menu_items_category" ON "res_menu_items"("category_id");

-- CreateIndex
CREATE INDEX "idx_res_notifications_tenant_id" ON "res_notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_notifications_recipient" ON "res_notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "idx_res_notifications_unread" ON "res_notifications"("recipient_id", "is_read") WHERE (is_read = false);

-- CreateIndex
CREATE INDEX "idx_res_order_items_tenant_id" ON "res_order_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_order_items_order" ON "res_order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "res_orders_order_number_key" ON "res_orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_res_orders_tenant_id" ON "res_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_orders_shift" ON "res_orders"("shift_id");

-- CreateIndex
CREATE INDEX "idx_res_orders_status" ON "res_orders"("status");

-- CreateIndex
CREATE INDEX "idx_res_orders_table" ON "res_orders"("table_id");

-- CreateIndex
CREATE INDEX "idx_res_orders_applied_promotion" ON "res_orders"("applied_promotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "res_shipments_order_id_key" ON "res_shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_res_shipments_tenant_id" ON "res_shipments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_shipments_order_id" ON "res_shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_res_payment_methods_tenant_id" ON "res_payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_promotion_usage_tenant_id" ON "res_promotion_usage"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "res_promotions_code_key" ON "res_promotions"("code");

-- CreateIndex
CREATE INDEX "idx_res_promotions_tenant_id" ON "res_promotions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_reservations_tenant_id" ON "res_reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_reservations_date" ON "res_reservations"("reservation_date");

-- CreateIndex
CREATE INDEX "idx_res_reservations_table" ON "res_reservations"("table_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_res_shifts_one_open_per_user" ON "res_shifts"("auth_user_id") WHERE ((status)::text = 'open'::text);

-- CreateIndex
CREATE INDEX "idx_res_shifts_tenant_id" ON "res_shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_shifts_restaurant_id" ON "res_shifts"("restaurant_id");

-- CreateIndex
CREATE INDEX "idx_res_shifts_status" ON "res_shifts"("status");

-- CreateIndex
CREATE INDEX "idx_res_shifts_branch_id" ON "res_shifts"("branch_id");

-- CreateIndex
CREATE INDEX "idx_res_shifts_needs_review" ON "res_shifts"("needs_review") WHERE (needs_review);

-- CreateIndex
CREATE INDEX "idx_res_shifts_opened_at" ON "res_shifts"("opened_at");

-- CreateIndex
CREATE INDEX "idx_res_tables_tenant_id" ON "res_tables"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_tables_floor_id" ON "res_tables"("floor_id");

-- CreateIndex
CREATE INDEX "idx_res_tables_status" ON "res_tables"("status");

-- CreateIndex
CREATE INDEX "idx_res_void_requests_tenant_id" ON "res_void_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_res_void_requests_order" ON "res_void_requests"("order_id");

-- CreateIndex
CREATE INDEX "idx_res_void_requests_status" ON "res_void_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_sale_items_tenant_id" ON "sale_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_sale_items_product" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_sale_items_sale" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "idx_sales_invoices_tenant_id" ON "sales_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_sales_invoices_tenant_status_date" ON "sales_invoices"("tenant_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX "idx_shipments_tenant_id" ON "shipments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_shipments_order" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_shipping_methods_tenant_id" ON "shipping_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_shipping_rates_tenant_id" ON "shipping_rates"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_shipping_rates_method" ON "shipping_rates"("method_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_rate_specificity" ON "shipping_rates"("method_id", "destination_country", "destination_state", "destination_postal_code", "min_weight");

-- CreateIndex
CREATE INDEX "idx_suppliers_tenant_id" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tax_rates_tenant_id" ON "tax_rates"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tax_rates_active_dates" ON "tax_rates"("effective_from", "effective_to") WHERE (is_active = true);

-- CreateIndex
CREATE INDEX "idx_tenant_subscriptions_status" ON "tenant_subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_tenant_subscriptions_tenant_id" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "idx_tenants_status" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "idx_tenants_type" ON "tenants"("type");

-- CreateIndex
CREATE INDEX "idx_tenants_created_at" ON "tenants"("created_at");

-- CreateIndex
CREATE INDEX "idx_tenants_deleted_at" ON "tenants"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_tenants_country_code" ON "tenants"("country_code");

-- CreateIndex
CREATE INDEX "idx_tenants_country_id" ON "tenants"("country_id");

-- CreateIndex
CREATE INDEX "idx_tenants_currency_id" ON "tenants"("currency_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "tenant_users"("email");

-- CreateIndex
CREATE INDEX "idx_users_primary_module" ON "tenant_users"("primary_module");

-- CreateIndex
CREATE INDEX "idx_tenant_users_tenant_id" ON "tenant_users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_transaction_details_product" ON "transaction_details"("product_id");

-- CreateIndex
CREATE INDEX "idx_transaction_details_tenant" ON "transaction_details"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_transaction_details_transaction" ON "transaction_details"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_td_invoice_item" ON "transaction_details"("sales_invoice_item_id");

-- CreateIndex
CREATE INDEX "idx_td_return_item" ON "transaction_details"("sales_return_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_number_key" ON "transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "idx_transactions_number" ON "transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "idx_transactions_tenant" ON "transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_transactions_invoice" ON "transactions"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "idx_transactions_return" ON "transactions"("sales_return_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_activity_types_code_key" ON "business_activity_types"("code");

-- CreateIndex
CREATE INDEX "idx_tenant_activity_types_activity" ON "tenant_activity_types"("activity_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_modules_code_key" ON "app_modules"("code");

-- CreateIndex
CREATE INDEX "idx_module_activity_types_activity" ON "module_activity_types"("activity_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_screens_code_key" ON "app_screens"("code");

-- CreateIndex
CREATE UNIQUE INDEX "app_screens_route_key" ON "app_screens"("route");

-- CreateIndex
CREATE INDEX "idx_app_screens_module" ON "app_screens"("module_id");

-- CreateIndex
CREATE INDEX "idx_screen_roles_role" ON "screen_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_screen_permissions_permission" ON "screen_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_buttons_code_key" ON "permission_buttons"("code");

-- CreateIndex
CREATE INDEX "idx_screen_buttons_button" ON "screen_buttons"("button_id");

-- CreateIndex
CREATE INDEX "idx_screen_buttons_permission" ON "screen_buttons"("permission_id");

-- CreateIndex
CREATE INDEX "idx_user_permissions_permission" ON "user_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_inv_mov_variant_date" ON "inventory_movements"("product_variant_id", "movement_date" DESC);

-- CreateIndex
CREATE INDEX "idx_inv_mov_store_date" ON "inventory_movements"("store_id", "movement_date" DESC);

-- CreateIndex
CREATE INDEX "idx_inv_mov_reference" ON "inventory_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "idx_inv_mov_source_doc" ON "inventory_movements"("source_document_type", "source_document_id");

-- CreateIndex
CREATE INDEX "idx_inv_mov_group" ON "inventory_movements"("movement_group_id");

-- CreateIndex
CREATE INDEX "idx_inv_mov_batch" ON "inventory_movements"("batch_id");

-- CreateIndex
CREATE INDEX "idx_inv_mov_tenant_date" ON "inventory_movements"("auth_user_id", "movement_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_inv_mov_idempotency" ON "inventory_movements"("auth_user_id", "idempotency_key") WHERE (idempotency_key IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_stock_balances_tenant_variant" ON "stock_balances"("tenant_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_store_id_product_variant_id_key" ON "stock_balances"("store_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_transfers_tenant_id" ON "stock_transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_stock_transfers_from_store_id" ON "stock_transfers"("from_store_id");

-- CreateIndex
CREATE INDEX "idx_stock_transfers_to_store_id" ON "stock_transfers"("to_store_id");

-- CreateIndex
CREATE INDEX "idx_stock_transfers_status" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "idx_stock_transfer_items_transfer_id" ON "stock_transfer_items"("stock_transfer_id");

-- CreateIndex
CREATE INDEX "idx_stock_transfer_items_variant_id" ON "stock_transfer_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_adjustments_tenant_id" ON "stock_adjustments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_stock_adjustments_store_id" ON "stock_adjustments"("store_id");

-- CreateIndex
CREATE INDEX "idx_stock_adjustments_status" ON "stock_adjustments"("status");

-- CreateIndex
CREATE INDEX "idx_stock_adjustment_items_adjustment_id" ON "stock_adjustment_items"("stock_adjustment_id");

-- CreateIndex
CREATE INDEX "idx_stock_adjustment_items_variant_id" ON "stock_adjustment_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "app_settings_group_idx" ON "app_settings"("group");

-- CreateIndex
CREATE INDEX "idx_warehouses_tenant_id" ON "warehouses"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_warehouses_branch_id" ON "warehouses"("branch_id");

-- CreateIndex
CREATE INDEX "idx_warehouses_store_id" ON "warehouses"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_warehouses_tenant_code" ON "warehouses"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_warehouse_locations_tenant_id" ON "warehouse_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_warehouse_locations_warehouse_id" ON "warehouse_locations"("warehouse_id");

-- CreateIndex
CREATE INDEX "idx_warehouse_locations_parent_id" ON "warehouse_locations"("parent_id");

-- CreateIndex
CREATE INDEX "idx_stock_by_location_store_variant" ON "stock_by_location"("store_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_by_location_tenant_id" ON "stock_by_location"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_stock_by_location_warehouse_id" ON "stock_by_location"("warehouse_id");

-- CreateIndex
CREATE INDEX "idx_stock_by_location_batch_id" ON "stock_by_location"("batch_id");

-- CreateIndex
CREATE INDEX "idx_brands_tenant_id" ON "brands"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_brands_tenant_name" ON "brands"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_uoms_tenant_id" ON "uoms"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_uoms_tenant_code" ON "uoms"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_unit_conversions_tenant_id" ON "unit_conversions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_unit_conversions_variant_id" ON "unit_conversions"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_product_barcodes_variant_id" ON "product_barcodes"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_product_barcodes_barcode" ON "product_barcodes"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_barcodes_tenant_barcode" ON "product_barcodes"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "idx_bundle_components_tenant_id" ON "bundle_components"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_bundle_components_component" ON "bundle_components"("component_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_bundle_components_pair" ON "bundle_components"("parent_product_id", "component_variant_id");

-- CreateIndex
CREATE INDEX "idx_product_batches_tenant_id" ON "product_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_product_batches_variant_id" ON "product_batches"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_product_batches_expiry_date" ON "product_batches"("expiry_date");

-- CreateIndex
CREATE INDEX "idx_product_batches_status" ON "product_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_batches_tenant_variant_number" ON "product_batches"("tenant_id", "product_variant_id", "batch_number");

-- CreateIndex
CREATE INDEX "idx_product_serials_tenant_id" ON "product_serials"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_product_serials_variant_id" ON "product_serials"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_product_serials_status" ON "product_serials"("status");

-- CreateIndex
CREATE INDEX "idx_product_serials_store_id" ON "product_serials"("store_id");

-- CreateIndex
CREATE INDEX "idx_product_serials_batch_id" ON "product_serials"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_serials_tenant_variant_number" ON "product_serials"("tenant_id", "product_variant_id", "serial_number");

-- CreateIndex
CREATE INDEX "idx_inventory_movement_serials_serial" ON "inventory_movement_serials"("serial_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_movement_serials_pair" ON "inventory_movement_serials"("movement_id", "serial_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipts_tenant_id" ON "goods_receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipts_po_id" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipts_store_id" ON "goods_receipts"("store_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipts_status" ON "goods_receipts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_goods_receipts_tenant_number" ON "goods_receipts"("tenant_id", "receipt_number");

-- CreateIndex
CREATE INDEX "idx_goods_receipt_items_receipt" ON "goods_receipt_items"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipt_items_variant" ON "goods_receipt_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipt_items_po_item" ON "goods_receipt_items"("purchase_order_item_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requisitions_tenant_id" ON "purchase_requisitions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requisitions_status" ON "purchase_requisitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_purchase_requisitions_tenant_number" ON "purchase_requisitions"("tenant_id", "requisition_number");

-- CreateIndex
CREATE INDEX "idx_purchase_requisition_items_requisition" ON "purchase_requisition_items"("requisition_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requisition_items_variant" ON "purchase_requisition_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_sales_orders_tenant_id" ON "sales_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_sales_orders_store_id" ON "sales_orders"("store_id");

-- CreateIndex
CREATE INDEX "idx_sales_orders_status" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "idx_sales_orders_customer_id" ON "sales_orders"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sales_orders_tenant_number" ON "sales_orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "idx_sales_order_items_order" ON "sales_order_items"("sales_order_id");

-- CreateIndex
CREATE INDEX "idx_sales_order_items_variant" ON "sales_order_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_reservations_store_variant_status" ON "stock_reservations"("store_id", "product_variant_id", "status");

-- CreateIndex
CREATE INDEX "idx_stock_reservations_tenant_id" ON "stock_reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_stock_reservations_reference" ON "stock_reservations"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "idx_stock_counts_tenant_id" ON "stock_counts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_stock_counts_store_id" ON "stock_counts"("store_id");

-- CreateIndex
CREATE INDEX "idx_stock_counts_status" ON "stock_counts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_counts_tenant_number" ON "stock_counts"("tenant_id", "count_number");

-- CreateIndex
CREATE INDEX "idx_stock_count_items_count" ON "stock_count_items"("stock_count_id");

-- CreateIndex
CREATE INDEX "idx_stock_count_items_variant" ON "stock_count_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "idx_reorder_rules_tenant_id" ON "reorder_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_reorder_rules_store_id" ON "reorder_rules"("store_id");

-- CreateIndex
CREATE INDEX "idx_reorder_rules_active" ON "reorder_rules"("is_active") WHERE (is_active = true);

-- CreateIndex
CREATE UNIQUE INDEX "uq_reorder_rules_variant_store" ON "reorder_rules"("product_variant_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reorder_suggestions_open_rule" ON "reorder_suggestions"("reorder_rule_id") WHERE (status = 'open'::reorder_suggestion_status_enum);

-- CreateIndex
CREATE INDEX "idx_reorder_suggestions_tenant_id" ON "reorder_suggestions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_reorder_suggestions_status" ON "reorder_suggestions"("status");

-- CreateIndex
CREATE INDEX "idx_rbac_audit_created_at" ON "rbac_audit"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_rbac_audit_target" ON "rbac_audit"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_res_cash_movements_created_at" ON "res_cash_movements"("created_at");

-- CreateIndex
CREATE INDEX "idx_res_cash_movements_shift_id" ON "res_cash_movements"("shift_id");

-- CreateIndex
CREATE INDEX "idx_res_shift_audit_created_at" ON "res_shift_audit"("created_at");

-- CreateIndex
CREATE INDEX "idx_res_shift_audit_shift_id" ON "res_shift_audit"("shift_id");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_target_type" ON "notifications"("target_type");

-- CreateIndex
CREATE INDEX "idx_user_notifications_user_id" ON "user_notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_notifications_is_read" ON "user_notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_user_notifications_user_unread" ON "user_notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_cards" ADD CONSTRAINT "customer_cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "customer_cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_list"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_base_uom_id_fkey" FOREIGN KEY ("base_uom_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_reorder_requests" ADD CONSTRAINT "pos_reorder_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pos_reorder_requests" ADD CONSTRAINT "pos_reorder_requests_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_res_order_id_fkey" FOREIGN KEY ("res_order_id") REFERENCES "res_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_menu_scopes" ADD CONSTRAINT "promotion_menu_scopes_menu_category_id_fkey" FOREIGN KEY ("menu_category_id") REFERENCES "res_menu_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_menu_scopes" ADD CONSTRAINT "promotion_menu_scopes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "res_menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_menu_scopes" ADD CONSTRAINT "promotion_menu_scopes_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_invoice_item_id_fkey" FOREIGN KEY ("purchase_invoice_item_id") REFERENCES "purchase_invoice_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_return_id_fkey" FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_item_properties" ADD CONSTRAINT "res_item_properties_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "res_menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_item_variants" ADD CONSTRAINT "res_item_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "res_menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_menu_items" ADD CONSTRAINT "res_menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "res_menu_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_order_items" ADD CONSTRAINT "res_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "res_menu_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_order_items" ADD CONSTRAINT "res_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "res_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_order_items" ADD CONSTRAINT "res_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "res_item_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_orders" ADD CONSTRAINT "res_orders_applied_promotion_id_fkey" FOREIGN KEY ("applied_promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_orders" ADD CONSTRAINT "res_orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "res_promotions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_orders" ADD CONSTRAINT "res_orders_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "res_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_orders" ADD CONSTRAINT "res_orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "res_tables"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_shipments" ADD CONSTRAINT "res_shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "res_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_promotion_usage" ADD CONSTRAINT "res_promotion_usage_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "res_promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_reservations" ADD CONSTRAINT "res_reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "res_tables"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_shifts" ADD CONSTRAINT "res_shifts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_tables" ADD CONSTRAINT "res_tables_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "res_floors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_void_requests" ADD CONSTRAINT "res_void_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "res_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_pos_terminal_id_fkey" FOREIGN KEY ("pos_terminal_id") REFERENCES "pos_terminals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_list"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_invoice_item_id_fkey" FOREIGN KEY ("sales_invoice_item_id") REFERENCES "sales_invoice_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "shipping_methods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_default_branch_id_fkey" FOREIGN KEY ("default_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_current_subscription_id_fkey" FOREIGN KEY ("current_subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_parent_tenant_id_fkey" FOREIGN KEY ("parent_tenant_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_sales_invoice_item_id_fkey" FOREIGN KEY ("sales_invoice_item_id") REFERENCES "sales_invoice_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_sales_return_item_id_fkey" FOREIGN KEY ("sales_return_item_id") REFERENCES "sales_return_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reference_transaction_id_fkey" FOREIGN KEY ("reference_transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_activity_types" ADD CONSTRAINT "tenant_activity_types_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "business_activity_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_activity_types" ADD CONSTRAINT "tenant_activity_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_activity_types" ADD CONSTRAINT "module_activity_types_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "business_activity_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_activity_types" ADD CONSTRAINT "module_activity_types_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "app_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_screens" ADD CONSTRAINT "app_screens_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "app_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_roles" ADD CONSTRAINT "screen_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_roles" ADD CONSTRAINT "screen_roles_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "app_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_permissions" ADD CONSTRAINT "screen_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_permissions" ADD CONSTRAINT "screen_permissions_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "app_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_buttons" ADD CONSTRAINT "screen_buttons_button_id_fkey" FOREIGN KEY ("button_id") REFERENCES "permission_buttons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_buttons" ADD CONSTRAINT "screen_buttons_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_buttons" ADD CONSTRAINT "screen_buttons_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "app_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_dest_store_id_fkey" FOREIGN KEY ("dest_store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_stock_transfer_id_fkey" FOREIGN KEY ("stock_transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_stock_adjustment_id_fkey" FOREIGN KEY ("stock_adjustment_id") REFERENCES "stock_adjustments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_by_location" ADD CONSTRAINT "stock_by_location_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_by_location" ADD CONSTRAINT "stock_by_location_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_by_location" ADD CONSTRAINT "stock_by_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_by_location" ADD CONSTRAINT "stock_by_location_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_by_location" ADD CONSTRAINT "stock_by_location_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_from_uom_id_fkey" FOREIGN KEY ("from_uom_id") REFERENCES "uoms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_to_uom_id_fkey" FOREIGN KEY ("to_uom_id") REFERENCES "uoms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_converted_po_fkey" FOREIGN KEY ("converted_purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_supplier_fkey" FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_posted_adjustment_id_fkey" FOREIGN KEY ("posted_adjustment_id") REFERENCES "stock_adjustments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_preferred_supplier_id_fkey" FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_converted_requisition_fkey" FOREIGN KEY ("converted_requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_reorder_rule_id_fkey" FOREIGN KEY ("reorder_rule_id") REFERENCES "reorder_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("store_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_supplier_fkey" FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_cash_movements" ADD CONSTRAINT "res_cash_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "res_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_cash_movements" ADD CONSTRAINT "res_cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "res_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "res_shift_audit" ADD CONSTRAINT "res_shift_audit_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "res_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

