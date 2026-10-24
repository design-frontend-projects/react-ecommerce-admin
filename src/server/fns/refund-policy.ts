'use server'

import { z } from 'zod'
import prisma from '@/lib/prisma'
import { resolveTenantId } from '@/server/utils/tenant'
import { getDatabasePermissionNames } from '@/server/utils/auth'

export const REFUND_POLICY_SETTING_KEY = 'pos.refund_policy'

export interface RefundPolicy {
  // Amount thresholds per role
  cashier_max_amount: number
  supervisor_max_amount: number
  manager_max_amount: number

  // Approval requirements
  require_pin_above: number
  require_supervisor_above: number
  require_manager_above: number
  require_top_management_above: number

  // Refund method rules per original payment method
  allowed_refund_methods: Record<string, string[]>

  // Time & behavior limits
  max_refund_days: number
  allow_partial_refunds: boolean
  require_physical_return: boolean
}

export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  cashier_max_amount: 50,
  supervisor_max_amount: 500,
  manager_max_amount: 2000,

  require_pin_above: 0, // Always require initiating cashier/user PIN
  require_supervisor_above: 50,
  require_manager_above: 500,
  require_top_management_above: 2000,

  allowed_refund_methods: {
    cash: ['cash', 'store_credit', 'customer_wallet'],
    card: ['card', 'original_payment_method', 'store_credit'],
    bank_transfer: ['bank_transfer', 'store_credit'],
    store_credit: ['store_credit'],
    customer_wallet: ['customer_wallet', 'store_credit'],
    other: ['cash', 'store_credit'],
  },

  max_refund_days: 30,
  allow_partial_refunds: true,
  require_physical_return: true,
}

export const RefundPolicySchema = z.object({
  cashier_max_amount: z.number().min(0),
  supervisor_max_amount: z.number().min(0),
  manager_max_amount: z.number().min(0),
  require_pin_above: z.number().min(0),
  require_supervisor_above: z.number().min(0),
  require_manager_above: z.number().min(0),
  require_top_management_above: z.number().min(0),
  allowed_refund_methods: z.record(z.string(), z.array(z.string())),
  max_refund_days: z.number().min(1).max(365),
  allow_partial_refunds: z.boolean(),
  require_physical_return: z.boolean(),
})

/**
 * Fetch the active refund policy for a tenant with fallback to system defaults
 */
export async function getTenantRefundPolicy(tenantId: string): Promise<RefundPolicy> {
  try {
    const setting = await prisma.app_settings.findFirst({
      where: {
        tenant_id: tenantId,
        key: REFUND_POLICY_SETTING_KEY,
      },
    })

    if (!setting || !setting.value) {
      return DEFAULT_REFUND_POLICY
    }

    const parsed = typeof setting.value === 'string'
      ? JSON.parse(setting.value)
      : setting.value

    return {
      ...DEFAULT_REFUND_POLICY,
      ...parsed,
      allowed_refund_methods: {
        ...DEFAULT_REFUND_POLICY.allowed_refund_methods,
        ...(parsed.allowed_refund_methods ?? {}),
      },
    }
  } catch (err) {
    console.error(`Error loading refund policy for tenant ${tenantId}, using defaults:`, err)
    return DEFAULT_REFUND_POLICY
  }
}

/**
 * Update tenant refund policy
 */
export async function updateTenantRefundPolicy(
  authUserId: string,
  policyInput: Partial<RefundPolicy>
): Promise<{ success: boolean; policy: RefundPolicy }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const isAuthorized =
    permissionNames.includes('*') ||
    permissionNames.includes('general.settings.manage') ||
    permissionNames.includes('pos.refund.override')

  if (!isAuthorized) {
    throw new Error('Unauthorized: Insufficient permissions to update refund policy')
  }

  const currentPolicy = await getTenantRefundPolicy(tenantId)
  const merged = {
    ...currentPolicy,
    ...policyInput,
    allowed_refund_methods: {
      ...currentPolicy.allowed_refund_methods,
      ...(policyInput.allowed_refund_methods ?? {}),
    },
  }

  const validated = RefundPolicySchema.parse(merged)

  await prisma.app_settings.upsert({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: REFUND_POLICY_SETTING_KEY,
      },
    },
    update: {
      value: validated as any,
      group: 'pos',
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      key: REFUND_POLICY_SETTING_KEY,
      value: validated as any,
      group: 'pos',
      is_public: false,
    },
  })

  return { success: true, policy: validated }
}
