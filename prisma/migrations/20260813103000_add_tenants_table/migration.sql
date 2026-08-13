-- ============================================================
-- Tenant Status Enum
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
        CREATE TYPE tenant_status AS ENUM (
            'pending',
            'trial',
            'active',
            'past_due',
            'suspended',
            'cancelled',
            'archived'
        );
    END IF;
END $$;

-- ============================================================
-- Tenant Type Enum
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type') THEN
        CREATE TYPE tenant_type AS ENUM (
            'company',
            'restaurant',
            'retail',
            'market',
            'pharmacy',
            'service',
            'other'
        );
    END IF;
END $$;

-- ============================================================
-- Tenants Table
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_code VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,

    slug VARCHAR(150) NOT NULL,

    display_name VARCHAR(255),

    legal_name VARCHAR(255),

    type tenant_type NOT NULL DEFAULT 'company',

    status tenant_status NOT NULL DEFAULT 'pending',

    logo_url TEXT,

    domain VARCHAR(255),

    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',

    locale VARCHAR(20) NOT NULL DEFAULT 'en-US',

    currency_code CHAR(3) NOT NULL DEFAULT 'USD',

    country_code CHAR(2),

    default_branch_id UUID,

    current_subscription_id UUID,

    created_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- --------------------------------------------------------
    -- Constraints
    -- --------------------------------------------------------

    CONSTRAINT uq_tenants_tenant_code
        UNIQUE (tenant_code),

    CONSTRAINT uq_tenants_slug
        UNIQUE (slug),

    CONSTRAINT uq_tenants_domain
        UNIQUE (domain),

    CONSTRAINT chk_tenants_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT chk_tenants_slug_format
        CHECK (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    CONSTRAINT chk_tenants_currency_code
        CHECK (
            currency_code ~ '^[A-Z]{3}$'
        ),

    CONSTRAINT chk_tenants_country_code
        CHECK (
            country_code IS NULL
            OR country_code ~ '^[A-Z]{2}$'
        ),

    CONSTRAINT chk_tenants_deleted_status
        CHECK (
            deleted_at IS NULL
            OR status IN ('cancelled', 'archived')
        )
);

-- ============================================================
-- Table Comment
-- ============================================================

COMMENT ON TABLE tenants IS
'Stores the organizations/companies that use the SaaS platform. A tenant represents an isolated business account and owns its users, branches, modules, settings, subscriptions, and business data.';

-- ============================================================
-- Column Comments
-- ============================================================

COMMENT ON COLUMN tenants.id IS
'Internal immutable UUID identifying the tenant. Used as the primary tenant identifier throughout the platform.';

COMMENT ON COLUMN tenants.tenant_code IS
'Human-readable unique tenant code used by administrators, support teams, reports, and internal operations. Example: TEN-000125.';

COMMENT ON COLUMN tenants.name IS
'Primary business name of the tenant.';

COMMENT ON COLUMN tenants.slug IS
'URL-safe unique identifier for the tenant. Example: al-noor-medical-center.';

COMMENT ON COLUMN tenants.display_name IS
'Optional business/brand name displayed in the application UI.';

COMMENT ON COLUMN tenants.legal_name IS
'Official registered legal name of the organization, primarily used for contracts, invoices, tax documents, and legal records.';

COMMENT ON COLUMN tenants.type IS
'Business category of the tenant. This is informational and should not be used as the mechanism for enabling application modules.';

COMMENT ON COLUMN tenants.status IS
'Current lifecycle state of the tenant. Controls whether the tenant is pending, active, suspended, cancelled, archived, or in another billing/access state.';

COMMENT ON COLUMN tenants.logo_url IS
'URL or storage path of the tenant logo. The actual image should normally be stored in object storage such as Supabase Storage rather than PostgreSQL.';

COMMENT ON COLUMN tenants.domain IS
'Optional custom domain associated with the tenant. Useful for white-label SaaS and custom tenant domains.';

COMMENT ON COLUMN tenants.timezone IS
'Default IANA timezone used for tenant-level date/time operations. Example: Africa/Cairo, Asia/Dubai, Europe/London.';

COMMENT ON COLUMN tenants.locale IS
'Default locale/language of the tenant. Example: en-US, ar-EG, ar-SA, fr-FR.';

COMMENT ON COLUMN tenants.currency_code IS
'Default ISO 4217 three-letter currency code used by the tenant. Example: USD, EUR, EGP, AED.';

COMMENT ON COLUMN tenants.country_code IS
'ISO 3166-1 alpha-2 country code representing the tenant primary operating country. Example: EG, AE, SA.';

COMMENT ON COLUMN tenants.default_branch_id IS
'Optional reference to the tenant primary/default branch or location. The referenced branch must belong to this tenant.';

COMMENT ON COLUMN tenants.current_subscription_id IS
'Optional reference to the tenant current subscription. Detailed subscription and billing information should be stored in dedicated subscription tables.';

COMMENT ON COLUMN tenants.created_by IS
'Identifier of the platform user or identity that created the tenant. The exact foreign-key target depends on the authentication architecture.';

COMMENT ON COLUMN tenants.created_at IS
'Timestamp when the tenant was created. Stored with timezone information.';

COMMENT ON COLUMN tenants.updated_at IS
'Timestamp when the tenant record was last modified.';

COMMENT ON COLUMN tenants.deleted_at IS
'Timestamp indicating when the tenant was soft-deleted. NULL means the tenant has not been soft-deleted.';

COMMENT ON COLUMN tenants.metadata IS
'Optional JSONB extension area for non-critical tenant metadata that does not justify a dedicated relational column. Core business data should not be stored here.';

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenants_status
    ON tenants(status);

CREATE INDEX IF NOT EXISTS idx_tenants_type
    ON tenants(type);

CREATE INDEX IF NOT EXISTS idx_tenants_created_at
    ON tenants(created_at);

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at
    ON tenants(deleted_at);

CREATE INDEX IF NOT EXISTS idx_tenants_country_code
    ON tenants(country_code);

CREATE INDEX IF NOT EXISTS idx_tenants_metadata
    ON tenants
    USING GIN(metadata);

-- ============================================================
-- Updated At Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;

CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Foreign Keys and Column Enhancements for Related Tables
-- ============================================================

-- Add tenant_id to branches
ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id
    ON branches(tenant_id);

-- Add tenant_id to tenant_subscriptions
ALTER TABLE tenant_subscriptions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id
    ON tenant_subscriptions(tenant_id);

-- Add tenant_id to tenant_users
ALTER TABLE tenant_users
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id
    ON tenant_users(tenant_id);

-- Foreign Key Constraints from Tenants to default_branch and current_subscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tenants_default_branch'
    ) THEN
        ALTER TABLE tenants
            ADD CONSTRAINT fk_tenants_default_branch
            FOREIGN KEY (default_branch_id)
            REFERENCES branches(id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tenants_current_subscription'
    ) THEN
        ALTER TABLE tenants
            ADD CONSTRAINT fk_tenants_current_subscription
            FOREIGN KEY (current_subscription_id)
            REFERENCES tenant_subscriptions(id)
            ON DELETE SET NULL;
    END IF;
END $$;
