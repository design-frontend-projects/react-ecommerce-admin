import prisma from '@/lib/prisma'

export interface EffectiveTenantQuotas {
  maxBranches: number // -1 = Unlimited
  maxUsers: number
  maxStores: number
  maxWarehouses: number
  maxProducts: number
  maxTables: number
  maxPosRegisters: number
  maxMonthlyOrders: number
  maxStorageMb: number
  hasRestaurantPos: boolean
  hasInventoryTracking: boolean
  hasKitchenDisplay: boolean
  hasDeliveryManagement: boolean
  hasApiAccess: boolean
  hasAdvancedReports: boolean
  hasAuditLogs: boolean
  hasPrioritySupport: boolean
  allowedModules: string[]
  planName: string
  planCode?: string | null
  subscriptionStatus: string
  isExpired: boolean
}

/**
 * Resolves the active subscription and effective resource quotas for a given tenant.
 * Custom overrides configured on `tenant_subscriptions` take precedence over catalog plan limits.
 */
export async function getEffectiveTenantLimits(
  tenantId: string
): Promise<EffectiveTenantQuotas | null> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    include: {
      tenant_subscriptions: {
        where: {
          status: {
            in: ['active', 'paid', 'trial', 'grace_period', 'new'],
          },
        },
        orderBy: { created_at: 'desc' },
        take: 1,
        include: {
          subscriptions: true,
        },
      },
    },
  })

  if (!tenant || !tenant.tenant_subscriptions.length) {
    return null
  }

  const activeSub = tenant.tenant_subscriptions[0]
  const plan = activeSub.subscriptions

  const now = new Date()
  const isExpired = activeSub.end_date ? new Date(activeSub.end_date) < now : false

  return {
    maxBranches: activeSub.custom_max_branches ?? plan.max_branches ?? 1,
    maxUsers: activeSub.custom_max_users ?? plan.max_users ?? 3,
    maxStores: activeSub.custom_max_stores ?? plan.max_stores ?? 1,
    maxWarehouses: activeSub.custom_max_warehouses ?? plan.max_warehouses ?? 1,
    maxProducts: activeSub.custom_max_products ?? plan.max_products ?? 500,
    maxTables: plan.max_tables ?? 20,
    maxPosRegisters: plan.max_pos_registers ?? 2,
    maxMonthlyOrders: plan.max_monthly_orders ?? 1000,
    maxStorageMb: activeSub.custom_max_storage_mb ?? plan.max_storage_mb ?? 1024,
    hasRestaurantPos: plan.has_restaurant_pos ?? false,
    hasInventoryTracking: plan.has_inventory_tracking ?? true,
    hasKitchenDisplay: plan.has_kitchen_display ?? false,
    hasDeliveryManagement: plan.has_delivery_management ?? false,
    hasApiAccess: plan.has_api_access ?? false,
    hasAdvancedReports: plan.has_advanced_reports ?? false,
    hasAuditLogs: plan.has_audit_logs ?? false,
    hasPrioritySupport: plan.has_priority_support ?? false,
    allowedModules: plan.allowed_modules ?? ['inventory'],
    planName: plan.name,
    planCode: plan.code,
    subscriptionStatus: activeSub.status,
    isExpired,
  }
}

/**
 * Checks if a tenant is eligible to create an additional branch.
 */
export async function canCreateBranch(
  tenantId: string
): Promise<{ allowed: boolean; current: number; max: number; reason?: string }> {
  const quotas = await getEffectiveTenantLimits(tenantId)
  if (!quotas) {
    return { allowed: false, current: 0, max: 0, reason: 'No active subscription found for tenant.' }
  }

  if (quotas.isExpired) {
    return { allowed: false, current: 0, max: quotas.maxBranches, reason: 'Subscription is expired.' }
  }

  if (quotas.maxBranches === -1) {
    return { allowed: true, current: 0, max: -1 }
  }

  const currentCount = await prisma.branches.count({
    where: { tenant_id: tenantId, is_active: true },
  })

  return {
    allowed: currentCount < quotas.maxBranches,
    current: currentCount,
    max: quotas.maxBranches,
    reason: currentCount >= quotas.maxBranches ? `Branch limit reached (${currentCount}/${quotas.maxBranches}). Please upgrade your plan.` : undefined,
  }
}

/**
 * Checks if a tenant is eligible to create an additional user account.
 */
export async function canCreateUser(
  tenantId: string
): Promise<{ allowed: boolean; current: number; max: number; reason?: string }> {
  const quotas = await getEffectiveTenantLimits(tenantId)
  if (!quotas) {
    return { allowed: false, current: 0, max: 0, reason: 'No active subscription found for tenant.' }
  }

  if (quotas.isExpired) {
    return { allowed: false, current: 0, max: quotas.maxUsers, reason: 'Subscription is expired.' }
  }

  if (quotas.maxUsers === -1) {
    return { allowed: true, current: 0, max: -1 }
  }

  const currentCount = await prisma.tenant_users.count({
    where: { tenant_id: tenantId, is_active: true },
  })

  return {
    allowed: currentCount < quotas.maxUsers,
    current: currentCount,
    max: quotas.maxUsers,
    reason: currentCount >= quotas.maxUsers ? `User seat limit reached (${currentCount}/${quotas.maxUsers}). Please upgrade your plan.` : undefined,
  }
}

/**
 * Checks if a tenant is eligible to create an additional store/point of sale.
 */
export async function canCreateStore(
  tenantId: string
): Promise<{ allowed: boolean; current: number; max: number; reason?: string }> {
  const quotas = await getEffectiveTenantLimits(tenantId)
  if (!quotas) {
    return { allowed: false, current: 0, max: 0, reason: 'No active subscription found for tenant.' }
  }

  if (quotas.maxStores === -1) {
    return { allowed: true, current: 0, max: -1 }
  }

  const currentCount = await prisma.stores.count({
    where: { tenant_id: tenantId, status: true },
  })

  return {
    allowed: currentCount < quotas.maxStores,
    current: currentCount,
    max: quotas.maxStores,
    reason: currentCount >= quotas.maxStores ? `Store limit reached (${currentCount}/${quotas.maxStores}).` : undefined,
  }
}
