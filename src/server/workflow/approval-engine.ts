import prisma from '@/lib/prisma'
import { Prisma, type approval_status_enum, type PrismaClient } from '@/generated/prisma/client'
import type { approval_rulesModel } from '@/generated/prisma/models/approval_rules'
import { ApiError } from '@/server/utils/api-error'
import { getCachedPermissionNames } from '@/server/utils/auth'
import { logApprovalEvent } from '@/server/logging/security-audit'

// ============================================================================
// ERRORS
// ============================================================================

export class AntiSelfApprovalError extends ApiError {
  readonly code = 'ANTI_SELF_APPROVAL_VIOLATION'
  constructor(message = 'Requester cannot approve their own request') {
    const formatted = message.startsWith('ANTI_SELF_APPROVAL_VIOLATION')
      ? message
      : `ANTI_SELF_APPROVAL_VIOLATION: ${message}`
    super(formatted, 403)
    this.name = 'AntiSelfApprovalError'
  }
}

export class ApprovalWorkflowError extends ApiError {
  readonly code: string
  constructor(message: string, status = 400, code = 'APPROVAL_WORKFLOW_ERROR') {
    super(message, status)
    this.name = 'ApprovalWorkflowError'
    this.code = code
  }
}

// ============================================================================
// DOCUMENT LIFECYCLE & STATE MACHINE
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type DocumentLifecycleStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export const VALID_DOCUMENT_TRANSITIONS: Record<
  DocumentLifecycleStatus,
  readonly DocumentLifecycleStatus[]
> = {
  draft: ['pending_approval', 'approved', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: ['draft', 'cancelled'],
  cancelled: [],
}

export const VALID_REQUEST_TRANSITIONS: Record<
  ApprovalStatus,
  readonly ApprovalStatus[]
> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: [],
  rejected: [],
  cancelled: [],
}

export function canTransitionDocument(
  from: DocumentLifecycleStatus,
  to: DocumentLifecycleStatus
): boolean {
  if (from === to) return true
  const allowed = VALID_DOCUMENT_TRANSITIONS[from]
  return Boolean(allowed && allowed.includes(to))
}

export function assertValidDocumentTransition(
  from: DocumentLifecycleStatus,
  to: DocumentLifecycleStatus,
  entityId?: string
): void {
  if (!canTransitionDocument(from, to)) {
    const idMsg = entityId ? ` for entity '${entityId}'` : ''
    throw new ApprovalWorkflowError(
      `Invalid document status transition${idMsg}: cannot transition from '${from}' to '${to}'. Allowed: [${(VALID_DOCUMENT_TRANSITIONS[from] || []).join(', ')}]`,
      400,
      'INVALID_STATUS_TRANSITION'
    )
  }
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CompletedLevel {
  level: string
  approvedBy: string
  approvedAt: string
  decisionReason?: string | null
}

export interface EvaluateApprovalInput {
  tenantId: string
  module: string
  entityType: string
  action?: string
  amount?: number | Prisma.Decimal | null
  currency?: string
  requestedByUserId?: string
}

export interface EvaluationResult {
  requiresApproval: boolean
  matchedRules: approval_rulesModel[]
  primaryRule: approval_rulesModel | null
  requiredLevels: string[]
  reason?: string
}

export interface SubmitApprovalInput {
  tenantId: string
  module: string
  entityType: string
  entityId: string
  action?: string
  amount?: number | Prisma.Decimal | null
  currency?: string
  requestedByUserId: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface ReviewApprovalInput {
  tenantId: string
  requestId: string
  approverAuthUserId: string
  approverTenantUserId?: string | null
  decision: 'approve' | 'reject'
  decisionReason?: string
  metadata?: Record<string, unknown>
}

export interface CancelApprovalInput {
  tenantId: string
  requestId: string
  cancelledByUserId: string
  reason?: string
}

// ============================================================================
// APPROVAL WORKFLOW ENGINE
// ============================================================================

export class ApprovalWorkflowEngine {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Evaluate whether an operation requires approval and find matching rules.
   */
  async evaluate(input: EvaluateApprovalInput): Promise<EvaluationResult> {
    const { tenantId, module, entityType, action, amount } = input
    const numericAmount = amount != null ? Number(amount) : 0

    const rules = await this.db.approval_rules.findMany({
      where: {
        tenant_id: tenantId,
        module: module.toLowerCase(),
        entity_type: entityType.toLowerCase(),
        ...(action
          ? {
              OR: [
                { action: action.toLowerCase() },
                { action: null },
                { action: '' },
              ],
            }
          : {}),
        is_active: true,
      },
      orderBy: [{ min_amount: 'asc' }, { created_at: 'asc' }],
    })

    if (rules.length === 0) {
      return {
        requiresApproval: false,
        matchedRules: [],
        primaryRule: null,
        requiredLevels: [],
        reason: 'No approval rules configured for this entity type.',
      }
    }

    // Filter rules matching the amount threshold
    const matchedRules = rules.filter((rule) => {
      const min = rule.min_amount != null ? Number(rule.min_amount) : 0
      const max = rule.max_amount != null ? Number(rule.max_amount) : Infinity
      return numericAmount >= min && numericAmount <= max
    })

    if (matchedRules.length === 0) {
      return {
        requiresApproval: false,
        matchedRules: [],
        primaryRule: null,
        requiredLevels: [],
        reason: `Amount (${numericAmount}) is below the minimum threshold required for approval.`,
      }
    }

    const requiredLevels = matchedRules
      .map((r) => r.approval_level || 'LEVEL_1')
      .filter((lvl, idx, arr) => arr.indexOf(lvl) === idx)

    return {
      requiresApproval: true,
      matchedRules,
      primaryRule: matchedRules[0],
      requiredLevels,
      reason: `Approval required by rule: ${matchedRules[0].name} (${requiredLevels.join(' -> ')})`,
    }
  }

  /**
   * Submit an entity for approval.
   * If no rule matches, returns { requiresApproval: false, status: 'approved' }.
   * If a rule matches, creates a pending approval_requests record.
   */
  async submit(input: SubmitApprovalInput) {
    const evaluation = await this.evaluate({
      tenantId: input.tenantId,
      module: input.module,
      entityType: input.entityType,
      action: input.action,
      amount: input.amount,
      requestedByUserId: input.requestedByUserId,
    })

    if (!evaluation.requiresApproval || !evaluation.primaryRule) {
      return {
        requiresApproval: false,
        status: 'approved' as ApprovalStatus,
        requestId: null,
        request: null,
      }
    }

    const numericAmount =
      input.amount != null ? new Prisma.Decimal(input.amount.toString()) : null

    const initialMetadata: Record<string, unknown> = {
      ...(input.metadata || {}),
      requiredLevels: evaluation.requiredLevels,
      completedLevels: [],
      currentLevel: evaluation.requiredLevels[0] || 'LEVEL_1',
      matchedRuleIds: evaluation.matchedRules.map((r) => r.id),
      history: [
        {
          action: 'submitted',
          userId: input.requestedByUserId,
          timestamp: new Date().toISOString(),
          reason: input.reason || null,
        },
      ],
    }

    const request = await this.db.approval_requests.create({
      data: {
        tenant_id: input.tenantId,
        rule_id: evaluation.primaryRule.id,
        module: input.module.toLowerCase(),
        entity_type: input.entityType.toLowerCase(),
        entity_id: input.entityId,
        requested_by_user_id: input.requestedByUserId,
        status: 'pending' as approval_status_enum,
        requested_amount: numericAmount,
        currency: input.currency || 'USD',
        reason: input.reason || null,
        metadata: initialMetadata as object,
      },
    })

    await logApprovalEvent({
      action: 'approval.requested',
      tenantId: input.tenantId,
      actorAuthUserId: input.requestedByUserId,
      requestId: request.id,
      documentType: `${input.module}.${input.entityType}`,
      amount: input.amount != null ? Number(input.amount) : null,
      metadata: { entityId: input.entityId },
    }).catch(() => {})

    return {
      requiresApproval: true,
      status: 'pending' as ApprovalStatus,
      requestId: request.id,
      request,
    }
  }

  /**
   * Review (approve or reject) an approval request.
   * Enforces Separation of Duties, status guards, role/permission requirements, and atomic concurrency.
   */
  async review(input: ReviewApprovalInput) {
    const {
      tenantId,
      requestId,
      approverAuthUserId,
      approverTenantUserId,
      decision,
      decisionReason,
    } = input

    // 1. Fetch request with rule
    const request = await this.db.approval_requests.findFirst({
      where: { id: requestId, tenant_id: tenantId },
      include: { approval_rules: true },
    })

    if (!request) {
      throw new ApiError('Approval request not found.', 404)
    }

    // 2. Status guard (Idempotency & Race Condition Guard)
    if (request.status === 'approved') {
      throw new ApiError('Request has already been approved.', 409)
    }
    if (request.status === 'rejected') {
      throw new ApiError('Request has already been rejected.', 409)
    }
    if (request.status === 'cancelled') {
      throw new ApiError('Cannot review a cancelled request.', 400)
    }
    if (request.status !== 'pending') {
      throw new ApiError(
        `Request is not in pending status (current status: ${request.status}).`,
        409
      )
    }

    // 3. Separation of Duties (Anti-Self-Approval)
    const rule = request.approval_rules
    const enforceSoD = rule ? rule.enforce_separation_of_duties : true

    if (enforceSoD) {
      const isSelfApproval =
        request.requested_by_user_id === approverAuthUserId ||
        (approverTenantUserId != null &&
          request.requested_by_user_id === approverTenantUserId)

      if (isSelfApproval) {
        await logApprovalEvent({
          action: 'approval.anti_self_approval_violation',
          tenantId,
          actorAuthUserId: approverAuthUserId,
          requestId,
          documentType: `${request.module}.${request.entity_type}`,
          amount:
            request.requested_amount != null
              ? Number(request.requested_amount)
              : null,
          metadata: { reason: 'Requester attempted to approve own request' },
        }).catch(() => {})

        throw new AntiSelfApprovalError('Requester cannot approve their own request')
      }

      // Multi-tier SoD: prevent same approver from approving multiple tiers
      const meta = (request.metadata as Record<string, unknown>) || {}
      const completedLevels = (meta.completedLevels as CompletedLevel[]) || []
      const alreadyApprovedPrior = completedLevels.some(
        (c) =>
          c.approvedBy === approverAuthUserId ||
          (approverTenantUserId && c.approvedBy === approverTenantUserId)
      )
      if (alreadyApprovedPrior && decision === 'approve') {
        throw new AntiSelfApprovalError(
          'Approver has already signed off on an earlier level for this request'
        )
      }
    }

    // 4. Approver eligibility check (role & permission)
    if (rule) {
      if (rule.required_permission || rule.required_role_id) {
        const userAccess = await getCachedPermissionNames(
          approverAuthUserId,
          tenantId
        )
        if (
          rule.required_role_id &&
          !userAccess.roleIds.includes(rule.required_role_id)
        ) {
          throw new ApiError(
            'Forbidden: Approver lacks the required role to review this request.',
            403
          )
        }
        if (
          rule.required_permission &&
          !userAccess.permissionNames.includes(rule.required_permission) &&
          !userAccess.permissionNames.includes('*')
        ) {
          throw new ApiError(
            `Forbidden: Approver lacks required permission '${rule.required_permission}'.`,
            403
          )
        }
      }
    }

    const now = new Date()
    const meta = (request.metadata as Record<string, unknown>) || {}
    const requiredLevels: string[] = (meta.requiredLevels as string[]) || []
    const completedLevels: CompletedLevel[] =
      (meta.completedLevels as CompletedLevel[]) || []
    const currentLevel =
      (meta.currentLevel as string | undefined) ||
      rule?.approval_level ||
      'LEVEL_1'

    // 5. Handle REJECTION
    if (decision === 'reject') {
      const updated = await this.db.approval_requests.updateMany({
        where: { id: requestId, tenant_id: tenantId, status: 'pending' },
        data: {
          status: 'rejected' as approval_status_enum,
          approved_by_user_id: approverAuthUserId,
          decision_reason: decisionReason || 'Rejected by reviewer',
          reviewed_at: now,
          updated_at: now,
        },
      })

      if (updated.count === 0) {
        const fresh = await this.db.approval_requests.findUnique({
          where: { id: requestId },
        })
        throw new ApiError(
          `Request has already been processed: current status is '${fresh?.status}'.`,
          409
        )
      }

      await logApprovalEvent({
        action: 'approval.rejected',
        tenantId,
        actorAuthUserId: approverAuthUserId,
        requestId,
        documentType: `${request.module}.${request.entity_type}`,
        amount:
          request.requested_amount != null
            ? Number(request.requested_amount)
            : null,
        rejectionReason: decisionReason,
      }).catch(() => {})

      return this.db.approval_requests.findUniqueOrThrow({
        where: { id: requestId },
      })
    }

    // 6. Handle APPROVAL (Check Multi-Tier Progression)
    completedLevels.push({
      level: currentLevel,
      approvedBy: approverAuthUserId,
      approvedAt: now.toISOString(),
      decisionReason: decisionReason || null,
    })

    const remainingLevels = requiredLevels.filter(
      (lvl) => !completedLevels.some((c) => c.level === lvl)
    )

    if (remainingLevels.length > 0) {
      // Advance to next tier while remaining in pending status
      const nextLevel = remainingLevels[0]
      const nextRule = await this.db.approval_rules.findFirst({
        where: {
          tenant_id: tenantId,
          module: request.module,
          entity_type: request.entity_type,
          approval_level: nextLevel,
          is_active: true,
        },
      })

      const updated = await this.db.approval_requests.updateMany({
        where: { id: requestId, tenant_id: tenantId, status: 'pending' },
        data: {
          rule_id: nextRule ? nextRule.id : request.rule_id,
          metadata: {
            ...meta,
            completedLevels,
            currentLevel: nextLevel,
            history: [
              ...((meta.history as unknown[]) || []),
              {
                action: 'tier_approved',
                tier: currentLevel,
                userId: approverAuthUserId,
                timestamp: now.toISOString(),
                decisionReason: decisionReason || null,
              },
            ],
          },
          updated_at: now,
        },
      })

      if (updated.count === 0) {
        const fresh = await this.db.approval_requests.findUnique({
          where: { id: requestId },
        })
        throw new ApiError(
          `Request has already been processed: current status is '${fresh?.status}'.`,
          409
        )
      }

      return this.db.approval_requests.findUniqueOrThrow({
        where: { id: requestId },
      })
    }

    // Final level approved: Transition request to 'approved'
    const updated = await this.db.approval_requests.updateMany({
      where: { id: requestId, tenant_id: tenantId, status: 'pending' },
      data: {
        status: 'approved' as approval_status_enum,
        approved_by_user_id: approverAuthUserId,
        decision_reason: decisionReason || 'Approved',
        reviewed_at: now,
        metadata: {
          ...meta,
          completedLevels,
          currentLevel: null,
          history: [
            ...((meta.history as unknown[]) || []),
            {
              action: 'final_approved',
              tier: currentLevel,
              userId: approverAuthUserId,
              timestamp: now.toISOString(),
              decisionReason: decisionReason || null,
            },
          ],
        },
        updated_at: now,
      },
    })

    if (updated.count === 0) {
      const fresh = await this.db.approval_requests.findUnique({
        where: { id: requestId },
      })
      throw new ApiError(
        `Request has already been processed: current status is '${fresh?.status}'.`,
        409
      )
    }

    await logApprovalEvent({
      action: 'approval.approved',
      tenantId,
      actorAuthUserId: approverAuthUserId,
      requestId,
      documentType: `${request.module}.${request.entity_type}`,
      amount:
        request.requested_amount != null
          ? Number(request.requested_amount)
          : null,
    }).catch(() => {})

    return this.db.approval_requests.findUniqueOrThrow({
      where: { id: requestId },
    })
  }

  /**
   * Cancel a pending approval request.
   */
  async cancel(input: CancelApprovalInput) {
    const { tenantId, requestId, cancelledByUserId, reason } = input

    const request = await this.db.approval_requests.findFirst({
      where: { id: requestId, tenant_id: tenantId },
    })

    if (!request) {
      throw new ApiError('Approval request not found.', 404)
    }
    if (request.status !== 'pending') {
      throw new ApiError(
        `Cannot cancel request with status '${request.status}'.`,
        400
      )
    }

    const now = new Date()
    const meta = (request.metadata as Record<string, unknown>) || {}

    await this.db.approval_requests.update({
      where: { id: requestId },
      data: {
        status: 'cancelled' as approval_status_enum,
        decision_reason: reason || 'Cancelled by user',
        reviewed_at: now,
        metadata: {
          ...meta,
          history: [
            ...((meta.history as unknown[]) || []),
            {
              action: 'cancelled',
              userId: cancelledByUserId,
              timestamp: now.toISOString(),
              reason,
            },
          ],
        },
        updated_at: now,
      },
    })

    await logApprovalEvent({
      action: 'approval.cancelled',
      tenantId,
      actorAuthUserId: cancelledByUserId,
      requestId,
      documentType: `${request.module}.${request.entity_type}`,
      amount:
        request.requested_amount != null
          ? Number(request.requested_amount)
          : null,
      metadata: { reason },
    }).catch(() => {})

    return this.db.approval_requests.findUniqueOrThrow({
      where: { id: requestId },
    })
  }

  /**
   * Check if a user is eligible to approve a request (for UI button gating).
   */
  async canUserApprove(
    tenantId: string,
    requestId: string,
    authUserId: string,
    tenantUserId?: string | null
  ) {
    const request = await this.db.approval_requests.findFirst({
      where: { id: requestId, tenant_id: tenantId },
      include: { approval_rules: true },
    })
    if (!request || request.status !== 'pending') {
      return { eligible: false, reason: 'Request is not pending' }
    }

    const rule = request.approval_rules
    const enforceSoD = rule ? rule.enforce_separation_of_duties : true

    if (enforceSoD) {
      if (
        request.requested_by_user_id === authUserId ||
        (tenantUserId && request.requested_by_user_id === tenantUserId)
      ) {
        return {
          eligible: false,
          reason:
            'ANTI_SELF_APPROVAL_VIOLATION: Requester cannot approve their own request',
        }
      }
      const meta = (request.metadata as Record<string, unknown>) || {}
      const completedLevels = (meta.completedLevels as CompletedLevel[]) || []
      if (completedLevels.some((c) => c.approvedBy === authUserId)) {
        return {
          eligible: false,
          reason: 'Approver has already approved a prior level',
        }
      }
    }

    if (rule?.required_permission || rule?.required_role_id) {
      const userAccess = await getCachedPermissionNames(authUserId, tenantId)
      if (
        rule.required_role_id &&
        !userAccess.roleIds.includes(rule.required_role_id)
      ) {
        return { eligible: false, reason: 'Lacks required role' }
      }
      if (
        rule.required_permission &&
        !userAccess.permissionNames.includes(rule.required_permission) &&
        !userAccess.permissionNames.includes('*')
      ) {
        return { eligible: false, reason: 'Lacks required permission' }
      }
    }

    return { eligible: true }
  }
}

export const approvalWorkflowEngine = new ApprovalWorkflowEngine()
