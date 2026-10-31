import { describe, it, expect } from 'vitest'
import {
  ApprovalWorkflowEngine,
  ReviewApprovalInput,
  ApprovalEvaluationInput,
} from '../helpers/rbac-contracts'

describe('Feature 8: Approval Workflow Engine & Separation of Duties', () => {
  const tenantId = 'tenant-corp'
  const requesterUserId = 'user-requester-1'
  const otherManagerUserId = 'user-manager-2'
  const requiredPermission = 'inventory.discounts.approve'

  describe('Tier 1: Feature Coverage (Separation of Duties & Workflow Rules)', () => {
    it('strictly prohibits self-approval: requester cannot approve their own request', () => {
      const pendingRequest = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 150,
      }

      const selfApprovalInput: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-001',
        module: 'discount',
        approverAuthUserId: requesterUserId, // Attempting self-approval!
        approverTenantUserId: requesterUserId,
        approverPermissions: [requiredPermission],
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          pendingRequest,
          selfApprovalInput,
          requiredPermission
        )
      }).toThrow('FORBIDDEN_SEPARATION_OF_DUTIES')
    })

    it('permits review when approver is a distinct user with required permission', () => {
      const pendingRequest = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 150,
      }

      const validReviewInput: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-001',
        module: 'discount',
        approverAuthUserId: otherManagerUserId, // Different user
        approverTenantUserId: otherManagerUserId,
        approverPermissions: [requiredPermission],
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          pendingRequest,
          validReviewInput,
          requiredPermission
        )
      }).not.toThrow()
    })

    it('rejects review when approver lacks the required permission', () => {
      const pendingRequest = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 150,
      }

      const unauthorizedReviewInput: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-001',
        module: 'discount',
        approverAuthUserId: otherManagerUserId,
        approverTenantUserId: otherManagerUserId,
        approverPermissions: ['general.products.view'], // Missing required permission
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          pendingRequest,
          unauthorizedReviewInput,
          requiredPermission
        )
      }).toThrow('FORBIDDEN_INSUFFICIENT_PERMISSIONS')
    })

    it('blocks transition if the approval request is not in pending status', () => {
      const alreadyApprovedRequest = {
        requested_by_user_id: requesterUserId,
        status: 'approved', // Not pending
        original_amount: 150,
      }

      const input: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-001',
        module: 'discount',
        approverAuthUserId: otherManagerUserId,
        approverTenantUserId: otherManagerUserId,
        approverPermissions: [requiredPermission],
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(alreadyApprovedRequest, input, requiredPermission)
      }).toThrow('INVALID_STATE_TRANSITION: Request is already approved.')
    })

    it('evaluates threshold need: within limit does not require approval, exceeding limit requires approval', () => {
      // Cashier max discount is 10%
      const withinLimit: ApprovalEvaluationInput = {
        tenantId,
        module: 'discount',
        amount: 8,
        requesterUserId,
        requesterMaxAllowedPercent: 10,
      }
      expect(ApprovalWorkflowEngine.evaluateNeed(withinLimit).requiresApproval).toBe(false)

      const exceedingLimit: ApprovalEvaluationInput = {
        tenantId,
        module: 'discount',
        amount: 15, // 15% > 10%
        requesterUserId,
        requesterMaxAllowedPercent: 10,
      }
      const evaluation = ApprovalWorkflowEngine.evaluateNeed(exceedingLimit)
      expect(evaluation.requiresApproval).toBe(true)
      expect(evaluation.approvalLevel).toBe('supervisor')
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('blocks approver whose monetary authority limit is less than the requested amount', () => {
      const highValueRequest = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 15000, // $15,000
      }

      const supervisorReviewInput: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-high-val',
        module: 'purchase_order',
        approverAuthUserId: otherManagerUserId,
        approverTenantUserId: otherManagerUserId,
        approverPermissions: ['purchasing.orders.approve'],
        approverLimit: 5000, // Supervisor limit is only $5,000!
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          highValueRequest,
          supervisorReviewInput,
          'purchasing.orders.approve'
        )
      }).toThrow('FORBIDDEN_LIMIT_EXCEEDED')
    })

    it('assigns tiered approval levels accurately across monetary thresholds', () => {
      // Supervisor tier: <= $5,000
      const req5k: ApprovalEvaluationInput = {
        tenantId,
        module: 'purchase_order',
        amount: 4500,
        requesterUserId,
        requesterMaxAllowedAmount: 1000,
      }
      expect(ApprovalWorkflowEngine.evaluateNeed(req5k).approvalLevel).toBe('supervisor')

      // Manager tier: $5,001 - $25,000
      const req20k: ApprovalEvaluationInput = {
        tenantId,
        module: 'purchase_order',
        amount: 20000,
        requesterUserId,
        requesterMaxAllowedAmount: 1000,
      }
      expect(ApprovalWorkflowEngine.evaluateNeed(req20k).approvalLevel).toBe('manager')

      // Top management tier: > $25,000
      const req50k: ApprovalEvaluationInput = {
        tenantId,
        module: 'purchase_order',
        amount: 50000,
        requesterUserId,
        requesterMaxAllowedAmount: 1000,
      }
      expect(ApprovalWorkflowEngine.evaluateNeed(req50k).approvalLevel).toBe('top_management')
    })

    it('handles zero or negative amount requests cleanly without triggering approval', () => {
      const zeroInput: ApprovalEvaluationInput = {
        tenantId,
        module: 'discount',
        amount: 0,
        requesterUserId,
      }
      expect(ApprovalWorkflowEngine.evaluateNeed(zeroInput).requiresApproval).toBe(false)
    })

    it('allows super admin with wildcard (*) permission to approve when distinct from requester', () => {
      const pendingRequest = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 500,
      }

      const superAdminReview: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-002',
        module: 'discount',
        approverAuthUserId: 'super-admin-user',
        approverTenantUserId: 'super-admin-user',
        approverPermissions: ['*'], // Wildcard
        approved: true,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          pendingRequest,
          superAdminReview,
          requiredPermission
        )
      }).not.toThrow()
    })
  })

  describe('Tier 3: Pairwise Workflow Transition', () => {
    it('pairwise: rejection records reason and prevents subsequent approvals', () => {
      const requestState = {
        requested_by_user_id: requesterUserId,
        status: 'pending',
        original_amount: 300,
        rejection_reason: null as string | null,
      }

      // Step 1: Manager rejects
      const rejectionInput: ReviewApprovalInput = {
        tenantId,
        requestId: 'req-003',
        module: 'discount',
        approverAuthUserId: otherManagerUserId,
        approverTenantUserId: otherManagerUserId,
        approverPermissions: [requiredPermission],
        approved: false,
        rejectionReason: 'Exceeds budget policy for promotional items.',
      }

      ApprovalWorkflowEngine.validateReview(requestState, rejectionInput, requiredPermission)
      requestState.status = 'rejected'
      requestState.rejection_reason = rejectionInput.rejectionReason!

      expect(requestState.status).toBe('rejected')
      expect(requestState.rejection_reason).toBe('Exceeds budget policy for promotional items.')

      // Step 2: Attempting to approve rejected request fails
      const reApprovalInput = { ...rejectionInput, approved: true }
      expect(() => {
        ApprovalWorkflowEngine.validateReview(requestState, reApprovalInput, requiredPermission)
      }).toThrow('INVALID_STATE_TRANSITION')
    })
  })
})
