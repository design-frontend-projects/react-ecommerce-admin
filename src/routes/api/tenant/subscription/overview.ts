import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/lib/prisma'
import { isActiveSubscriptionStatus } from '@/lib/subscription_utils'
import { isValidUuid } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import type {
  PlatformSubscriptionPlan,
  SubscriptionTenantUser,
  TenantResourceUsageSummary,
  TenantSubscriptionOverview,
  TenantSubscriptionRecord,
} from '@/features/subscriptions/types'

function parseJsonStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((item) => String(item))
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item))
    } catch {
      return []
    }
  }
  return []
}

function parseJsonObject(val: unknown): Record<string, unknown> {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, unknown>
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  return {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeSubscriptionPlan(plan: any): PlatformSubscriptionPlan {
  return {
    id: String(plan.id),
    code: plan.code ?? null,
    name: String(plan.name ?? ''),
    description: plan.description ?? null,
    tier: plan.tier ?? 'starter',
    billing_interval: plan.billing_interval ?? 'month',
    duration_months: Number(plan.duration_months ?? 1),
    price: Number(plan.price ?? 0),
    currency: String(plan.currency ?? 'LE').trim(),
    setup_fee: Number(plan.setup_fee ?? 0),
    discount_percentage: Number(plan.discount_percentage ?? 0),
    trial_period_days: Number(plan.trial_period_days ?? 0),
    grace_period_days: Number(plan.grace_period_days ?? 7),
    max_branches: Number(plan.max_branches ?? 1),
    max_users: Number(plan.max_users ?? 3),
    max_stores: Number(plan.max_stores ?? 1),
    max_warehouses: Number(plan.max_warehouses ?? 1),
    max_products: Number(plan.max_products ?? 500),
    max_tables: Number(plan.max_tables ?? 20),
    max_pos_registers: Number(plan.max_pos_registers ?? 2),
    max_monthly_orders: Number(plan.max_monthly_orders ?? 1000),
    max_storage_mb: Number(plan.max_storage_mb ?? 1024),
    has_restaurant_pos: Boolean(plan.has_restaurant_pos),
    has_inventory_tracking: Boolean(plan.has_inventory_tracking ?? true),
    has_kitchen_display: Boolean(plan.has_kitchen_display),
    has_delivery_management: Boolean(plan.has_delivery_management),
    has_api_access: Boolean(plan.has_api_access),
    has_advanced_reports: Boolean(plan.has_advanced_reports),
    has_audit_logs: Boolean(plan.has_audit_logs),
    has_priority_support: Boolean(plan.has_priority_support),
    allowed_modules: Array.isArray(plan.allowed_modules)
      ? plan.allowed_modules
      : ['inventory'],
    features: parseJsonStringArray(plan.features),
    metadata: parseJsonObject(plan.metadata),
    is_active: Boolean(plan.is_active ?? true),
    is_public: Boolean(plan.is_public ?? true),
    is_popular: Boolean(plan.is_popular),
    sort_order: Number(plan.sort_order ?? 0),
    created_at: plan.created_at ? new Date(plan.created_at).toISOString() : null,
    updated_at: plan.updated_at ? new Date(plan.updated_at).toISOString() : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeTenantSubscription(sub: any): TenantSubscriptionRecord {
  return {
    id: String(sub.id),
    auth_user_id: String(sub.auth_user_id),
    email: String(sub.email ?? ''),
    status: sub.status ?? 'new',
    first_use: Boolean(sub.first_use),
    start_date: sub.start_date ? new Date(sub.start_date).toISOString() : null,
    end_date: sub.end_date ? new Date(sub.end_date).toISOString() : null,
    trial_ends_at: sub.trial_ends_at
      ? new Date(sub.trial_ends_at).toISOString()
      : null,
    grace_ends_at: sub.grace_ends_at
      ? new Date(sub.grace_ends_at).toISOString()
      : null,
    cancelled_at: sub.cancelled_at
      ? new Date(sub.cancelled_at).toISOString()
      : null,
    auto_renew: Boolean(sub.auto_renew ?? true),
    price_at_purchase: Number(sub.price_at_purchase ?? sub.subscriptions?.price ?? 0),
    currency: String(sub.currency ?? sub.subscriptions?.currency ?? 'LE').trim(),
    created_at: sub.created_at ? new Date(sub.created_at).toISOString() : null,
    updated_at: sub.updated_at ? new Date(sub.updated_at).toISOString() : null,
    commission_amount: Number(sub.commission_amount ?? 0),
    commission_type: String(sub.commission_type ?? 'subscription'),
    first_name: sub.first_name ?? null,
    last_name: sub.last_name ?? null,
    is_owner: sub.is_owner ?? null,
    tenant_id: sub.tenant_id ?? null,
    subscription_id: String(sub.subscription_id),
    payment_method: sub.payment_method ?? null,
    transfer_ref: sub.transfer_ref ?? null,
    billing_details: sub.billing_details
      ? parseJsonObject(sub.billing_details)
      : null,
    custom_max_branches: sub.custom_max_branches ?? null,
    custom_max_users: sub.custom_max_users ?? null,
    custom_max_stores: sub.custom_max_stores ?? null,
    custom_max_warehouses: sub.custom_max_warehouses ?? null,
    custom_max_products: sub.custom_max_products ?? null,
    custom_max_storage_mb: sub.custom_max_storage_mb ?? null,
    custom_features: sub.custom_features ?? null,
    subscriptions: sub.subscriptions
      ? serializeSubscriptionPlan(sub.subscriptions)
      : null,
  }
}

const GET = withAuth(null, async ({ auth, getTenantId }) => {
  const resolvedTenantId = await getTenantId()

  // Resolve canonical tenant record if available
  let tenantRecord = null
  if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
    tenantRecord = await prisma.tenants
      .findUnique({
        where: { id: resolvedTenantId },
        select: {
          id: true,
          name: true,
          display_name: true,
          tenant_code: true,
          status: true,
          currency_code: true,
          current_subscription_id: true,
        },
      })
      .catch(() => null)
  }

  if (!tenantRecord && isValidUuid(auth.userId)) {
    tenantRecord = await prisma.tenants
      .findFirst({
        where: { auth_user_id: auth.userId },
        select: {
          id: true,
          name: true,
          display_name: true,
          tenant_code: true,
          status: true,
          currency_code: true,
          current_subscription_id: true,
        },
      })
      .catch(() => null)
  }

  const effectiveTenantId = tenantRecord?.id ?? resolvedTenantId ?? null

  // Build tenant_subscriptions filter for this tenant
  const subWhereOr: Array<Record<string, unknown>> = []
  if (effectiveTenantId && isValidUuid(effectiveTenantId)) {
    subWhereOr.push({ tenant_id: effectiveTenantId })
  }
  if (isValidUuid(auth.userId)) {
    subWhereOr.push({ auth_user_id: auth.userId })
  }

  const rawHistory =
    subWhereOr.length > 0
      ? await prisma.tenant_subscriptions.findMany({
          where: { OR: subWhereOr },
          include: { subscriptions: true },
          orderBy: { created_at: 'desc' },
        })
      : []

  const subscriptionHistory = rawHistory.map(serializeTenantSubscription)

  // Resolve the single active subscription for the tenant
  let currentSubscription: TenantSubscriptionRecord | null = null
  if (tenantRecord?.current_subscription_id) {
    const byPointer = subscriptionHistory.find(
      (s) =>
        s.id === tenantRecord.current_subscription_id &&
        isActiveSubscriptionStatus(s.status)
    )
    if (byPointer) {
      currentSubscription = byPointer
    }
  }

  if (!currentSubscription) {
    currentSubscription =
      subscriptionHistory.find((s) => isActiveSubscriptionStatus(s.status)) ??
      subscriptionHistory[0] ??
      null
  }

  // Fetch platform available subscription plans
  let rawPlans = await prisma.subscriptions.findMany({
    where: { is_active: true, is_public: true },
    orderBy: [
      { sort_order: 'asc' },
      { duration_months: 'asc' },
      { price: 'asc' },
    ],
  })

  if (rawPlans.length === 0) {
    rawPlans = await prisma.subscriptions.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { duration_months: 'asc' }],
    })
  }

  if (rawPlans.length === 0) {
    rawPlans = await prisma.subscriptions.findMany({
      orderBy: [{ duration_months: 'asc' }],
    })
  }

  const availablePlans = rawPlans.map(serializeSubscriptionPlan)

  // Fetch related tenant_users
  const userWhereOr: Array<Record<string, unknown>> = []
  if (effectiveTenantId && isValidUuid(effectiveTenantId)) {
    userWhereOr.push({ tenant_id: effectiveTenantId })
    userWhereOr.push({ parent_tenant_id: effectiveTenantId })
  }
  if (isValidUuid(auth.userId)) {
    userWhereOr.push({ auth_user_id: auth.userId })
  }

  const rawTenantUsers =
    userWhereOr.length > 0
      ? await prisma.tenant_users.findMany({
          where: {
            deleted_at: null,
            OR: userWhereOr,
          },
          include: {
            branches: { select: { name: true } },
            stores: { select: { name: true } },
            user_roles: {
              include: {
                roles: { select: { name: true } },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        })
      : []

  const tenantUsers: SubscriptionTenantUser[] = rawTenantUsers.map((u) => {
    const roleSet = new Set<string>()
    if (u.default_role) roleSet.add(u.default_role)
    for (const ur of u.user_roles ?? []) {
      if (ur.roles?.name) roleSet.add(ur.roles.name)
    }

    return {
      id: u.id,
      auth_user_id: u.auth_user_id ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      avatar_url: u.avatar_url ?? null,
      primary_module: (u.primary_module as SubscriptionTenantUser['primary_module']) ?? 'inventory',
      modules: (Array.isArray(u.modules) ? u.modules : ['inventory']) as SubscriptionTenantUser['modules'],
      is_active: Boolean(u.is_active ?? true),
      is_blocked: Boolean(u.is_blocked ?? false),
      default_role: u.default_role ?? null,
      onboarding_complete: Boolean(u.onboarding_complete),
      last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
      created_at: u.created_at ? u.created_at.toISOString() : null,
      branch_name: u.branches?.name ?? null,
      store_name: u.stores?.name ?? null,
      roles: [...roleSet],
    }
  })

  // Fetch live resource usage counts for the tenant
  const usage: TenantResourceUsageSummary = {
    branches: 0,
    users: tenantUsers.filter((u) => u.is_active && !u.is_blocked).length,
    stores: 0,
    warehouses: 0,
    products: 0,
    tables: 0,
    posRegisters: 0,
    monthlyOrders: 0,
    storageMbUsed: 0,
  }

  if (effectiveTenantId && isValidUuid(effectiveTenantId)) {
    const [
      branchesCount,
      storesCount,
      warehousesCount,
      productsCount,
      posTerminalsCount,
      usageRecord,
    ] = await Promise.all([
      prisma.branches
        .count({ where: { tenant_id: effectiveTenantId, is_active: true } })
        .catch(() => 0),
      prisma.stores
        .count({ where: { tenant_id: effectiveTenantId, status: true } })
        .catch(() => 0),
      prisma.warehouses
        .count({ where: { tenant_id: effectiveTenantId, is_active: true } })
        .catch(() => 0),
      prisma.products
        .count({
          where: {
            tenant_id: effectiveTenantId,
            is_deleted: false,
            deleted_at: null,
          },
        })
        .catch(() => 0),
      prisma.pos_terminals
        .count({
          where: {
            tenant_id: effectiveTenantId,
            deleted_at: null,
          },
        })
        .catch(() => 0),
      prisma.tenant_subscription_usage
        .findUnique({ where: { tenant_id: effectiveTenantId } })
        .catch(() => null),
    ])

    usage.branches = branchesCount || usageRecord?.current_branches_count || 0
    usage.stores = storesCount || usageRecord?.current_stores_count || 0
    usage.warehouses =
      warehousesCount || usageRecord?.current_warehouses_count || 0
    usage.products = productsCount || usageRecord?.current_products_count || 0
    usage.posRegisters =
      posTerminalsCount || usageRecord?.current_pos_registers_count || 0
    usage.tables = usageRecord?.current_tables_count ?? 0
    usage.monthlyOrders = usageRecord?.current_monthly_orders ?? 0
    usage.storageMbUsed = Number(usageRecord?.current_storage_mb_used ?? 0)
  }

  const overview: TenantSubscriptionOverview = {
    tenant: tenantRecord
      ? {
          id: tenantRecord.id,
          name: tenantRecord.display_name || tenantRecord.name,
          tenant_code: tenantRecord.tenant_code,
          status: tenantRecord.status,
          currency_code: tenantRecord.currency_code?.trim() ?? null,
          current_subscription_id: tenantRecord.current_subscription_id,
        }
      : effectiveTenantId
        ? {
            id: effectiveTenantId,
            name: null,
            tenant_code: null,
            status: null,
            currency_code: null,
            current_subscription_id: currentSubscription?.id ?? null,
          }
        : null,
    currentSubscription,
    subscriptionHistory,
    availablePlans,
    tenantUsers,
    usage,
  }

  return Response.json({
    success: true,
    data: overview,
  })
})

export const Route = createFileRoute('/api/tenant/subscription/overview')({
  server: {
    handlers: {
      GET,
    },
  },
})

