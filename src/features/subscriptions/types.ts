export type SubscriptionTierType =
  | 'free_trial'
  | 'starter'
  | 'growth'
  | 'professional'
  | 'enterprise'
  | 'custom'

export type BillingIntervalType =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'half_year'
  | 'year'
  | 'lifetime'
  | 'custom'

export type SubscriptionStatusType =
  | 'new'
  | 'paid'
  | 'canceled'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'grace_period'
  | 'paused'

export type UserModuleType = 'inventory' | 'restaurant'

export interface PlatformSubscriptionPlan {
  id: string
  code: string | null
  name: string
  description: string | null
  tier: SubscriptionTierType
  billing_interval: BillingIntervalType
  duration_months: number
  price: number
  currency: string
  setup_fee: number
  discount_percentage: number
  trial_period_days: number
  grace_period_days: number

  // Resource Limits & Quotas (-1 for unlimited)
  max_branches: number
  max_users: number
  max_stores: number
  max_warehouses: number
  max_products: number
  max_tables: number
  max_pos_registers: number
  max_monthly_orders: number
  max_storage_mb: number

  // Feature Flags
  has_restaurant_pos: boolean
  has_inventory_tracking: boolean
  has_kitchen_display: boolean
  has_delivery_management: boolean
  has_api_access: boolean
  has_advanced_reports: boolean
  has_audit_logs: boolean
  has_priority_support: boolean

  // Modularity & Custom JSON Metadata
  allowed_modules: UserModuleType[]
  features: string[]
  metadata: Record<string, unknown>

  // Display & Operational Flags
  is_active: boolean
  is_public: boolean
  is_popular: boolean
  sort_order: number

  created_at: string | null
  updated_at: string | null
}

export interface TenantSubscriptionRecord {
  id: string
  auth_user_id: string
  email: string
  status: SubscriptionStatusType
  first_use: boolean
  start_date: string | null
  end_date: string | null
  trial_ends_at: string | null
  grace_ends_at: string | null
  cancelled_at: string | null
  auto_renew: boolean
  price_at_purchase: number
  currency: string
  created_at: string | null
  updated_at: string | null
  commission_amount: number
  commission_type: string
  first_name: string | null
  last_name: string | null
  is_owner: boolean | null
  tenant_id: string | null
  subscription_id: string
  payment_method: string | null
  transfer_ref: string | null
  billing_details: Record<string, unknown> | null

  // Tenant Custom Quota Overrides
  custom_max_branches: number | null
  custom_max_users: number | null
  custom_max_stores: number | null
  custom_max_warehouses: number | null
  custom_max_products: number | null
  custom_max_storage_mb: number | null
  custom_features: string[] | Record<string, unknown> | null

  subscriptions: PlatformSubscriptionPlan | null
}

export interface SubscriptionTenantUser {
  id: string
  auth_user_id: string | null
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  primary_module: UserModuleType | null
  modules: UserModuleType[]
  is_active: boolean
  is_blocked: boolean
  default_role: string | null
  onboarding_complete: boolean
  last_login_at: string | null
  created_at: string | null
  branch_name: string | null
  store_name: string | null
  roles: string[]
}

export interface TenantResourceUsageSummary {
  branches: number
  users: number
  stores: number
  warehouses: number
  products: number
  tables: number
  posRegisters: number
  monthlyOrders: number
  storageMbUsed: number
}

export interface TenantSubscriptionOverview {
  tenant: {
    id: string | null
    name: string | null
    tenant_code: string | null
    status: string | null
    currency_code: string | null
    current_subscription_id: string | null
  } | null
  currentSubscription: TenantSubscriptionRecord | null
  subscriptionHistory: TenantSubscriptionRecord[]
  availablePlans: PlatformSubscriptionPlan[]
  tenantUsers: SubscriptionTenantUser[]
  usage: TenantResourceUsageSummary
}

