'use server'

import { getDatabasePermissionNames } from '@/server/utils/auth'
import { getTenantRefundPolicy, type RefundPolicy } from './refund-policy'

export type ApprovalLevel = 'none' | 'supervisor' | 'manager' | 'top_management'

export interface RefundAuthorizationResult {
  authorized: boolean
  requiresApproval: boolean
  approvalLevel: ApprovalLevel
  requiresPin: boolean
  reason?: string
  allowedRefundMethods?: string[]
}

export interface EvaluateAuthorizationInput {
  tenantId: string
  authUserId: string
  amount: number
  originalInvoiceDate: Date
  originalPaymentMethod?: string | null
  requestedRefundMethod?: string | null
}

export interface EvaluatePolicyRulesInput {
  amount: number
  originalInvoiceDate: Date
  originalPaymentMethod?: string | null
  requestedRefundMethod?: string | null
  userPermissions: string[]
}

/**
 * Pure policy evaluation logic separated from database I/O for testability and speed.
 */
export function evaluateRefundPolicyRules(
  policy: RefundPolicy,
  input: EvaluatePolicyRulesInput
): RefundAuthorizationResult {
  const {
    amount,
    originalInvoiceDate,
    originalPaymentMethod,
    requestedRefundMethod,
    userPermissions,
  } = input

  // 1. Check user permissions
  const isSuperAdmin = userPermissions.includes('*')
  const hasOverride = isSuperAdmin || userPermissions.includes('pos.refund.override')
  const canCreate =
    isSuperAdmin ||
    userPermissions.includes('pos.refund.create') ||
    userPermissions.includes('pos.refund.manage')
  const canApproveStandard = isSuperAdmin || userPermissions.includes('pos.refund.approve')
  const canApproveHighValue = isSuperAdmin || userPermissions.includes('pos.refund.high_value')

  if (!canCreate) {
    return {
      authorized: false,
      requiresApproval: false,
      approvalLevel: 'none',
      requiresPin: false,
      reason: 'User lacks pos.refund.create permission',
    }
  }

  // 2. Allowed refund methods for original payment
  let allowedMethods = ['cash', 'store_credit']
  if (originalPaymentMethod && policy.allowed_refund_methods?.[originalPaymentMethod]) {
    allowedMethods = policy.allowed_refund_methods[originalPaymentMethod]
  }

  if (
    requestedRefundMethod &&
    !allowedMethods.includes(requestedRefundMethod) &&
    !hasOverride
  ) {
    return {
      authorized: false,
      requiresApproval: true,
      approvalLevel: 'manager',
      requiresPin: true,
      reason: `Refund method '${requestedRefundMethod}' is not permitted for original payment '${originalPaymentMethod ?? 'unknown'}'. Manager override required.`,
      allowedRefundMethods: allowedMethods,
    }
  }

  // 3. Check time limits (max_refund_days)
  const daysSinceSale = Math.floor(
    (Date.now() - new Date(originalInvoiceDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const isOverdue = daysSinceSale > policy.max_refund_days
  if (isOverdue && !hasOverride) {
    return {
      authorized: false,
      requiresApproval: true,
      approvalLevel: 'manager',
      requiresPin: true,
      reason: `Invoice is ${daysSinceSale} days old, exceeding policy limit of ${policy.max_refund_days} days. Manager approval required.`,
      allowedRefundMethods: allowedMethods,
    }
  }

  // 4. Check if PIN verification is required
  const requiresPin = amount >= policy.require_pin_above

  // 5. SuperAdmin or user with pos.refund.override can process directly
  if (hasOverride) {
    return {
      authorized: true,
      requiresApproval: false,
      approvalLevel: 'none',
      requiresPin,
      allowedRefundMethods: allowedMethods,
    }
  }

  // 6. Determine approval level based on amount thresholds
  if (amount > policy.require_top_management_above) {
    return {
      authorized: false,
      requiresApproval: true,
      approvalLevel: 'top_management',
      requiresPin,
      reason: `Amount ${amount.toFixed(2)} exceeds manager threshold of ${policy.require_top_management_above.toFixed(2)}. Top management approval required.`,
      allowedRefundMethods: allowedMethods,
    }
  }

  if (amount > policy.require_manager_above) {
    if (canApproveHighValue) {
      return {
        authorized: true,
        requiresApproval: false,
        approvalLevel: 'none',
        requiresPin,
        allowedRefundMethods: allowedMethods,
      }
    }
    return {
      authorized: false,
      requiresApproval: true,
      approvalLevel: 'manager',
      requiresPin,
      reason: `Amount ${amount.toFixed(2)} exceeds supervisor threshold of ${policy.require_manager_above.toFixed(2)}. Manager approval required.`,
      allowedRefundMethods: allowedMethods,
    }
  }

  if (amount > policy.require_supervisor_above) {
    if (canApproveStandard || canApproveHighValue) {
      return {
        authorized: true,
        requiresApproval: false,
        approvalLevel: 'none',
        requiresPin,
        allowedRefundMethods: allowedMethods,
      }
    }
    return {
      authorized: false,
      requiresApproval: true,
      approvalLevel: 'supervisor',
      requiresPin,
      reason: `Amount ${amount.toFixed(2)} exceeds cashier direct threshold of ${policy.require_supervisor_above.toFixed(2)}. Supervisor approval required.`,
      allowedRefundMethods: allowedMethods,
    }
  }

  // Amount is within cashier direct refund limit
  return {
    authorized: true,
    requiresApproval: false,
    approvalLevel: 'none',
    requiresPin,
    allowedRefundMethods: allowedMethods,
  }
}

/**
 * Server-side evaluation of refund authorization, required approval levels, and PIN policies.
 * Never trust the client for permissions or approval status.
 */
export async function evaluateRefundAuthorization(
  input: EvaluateAuthorizationInput
): Promise<RefundAuthorizationResult> {
  const {
    tenantId,
    authUserId,
    amount,
    originalInvoiceDate,
    originalPaymentMethod,
    requestedRefundMethod,
  } = input

  const [{ permissionNames }, policy] = await Promise.all([
    getDatabasePermissionNames(authUserId),
    getTenantRefundPolicy(tenantId),
  ])

  return evaluateRefundPolicyRules(policy, {
    amount,
    originalInvoiceDate,
    originalPaymentMethod,
    requestedRefundMethod,
    userPermissions: permissionNames,
  })
}
