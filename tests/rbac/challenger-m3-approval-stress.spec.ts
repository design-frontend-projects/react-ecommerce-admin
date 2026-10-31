/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ApprovalWorkflowEngine,
  AntiSelfApprovalError,
  ApprovalWorkflowError,
  VALID_DOCUMENT_TRANSITIONS,
  VALID_REQUEST_TRANSITIONS,
  canTransitionDocument,
  assertValidDocumentTransition,
  type CompletedLevel,
} from '@/server/workflow/approval-engine'
import {
  canonicalJsonStringify,
  computeRecordHash,
  isGenesisHash,
  toCanonicalPayload,
  GENESIS_PREV_HASH,
} from '@/server/logging/security-audit'
import { ApiError } from '@/server/utils/api-error'
import { Prisma } from '@/generated/prisma/client'

describe('Challenger M3 Empirical Stress Suite: Backend Protection, Approvals & Tamper-Resistant Audit', () => {
  const TENANT_ID = 'tenant-corp-m3'
  const REQUESTER_AUTH_ID = 'auth-requester-001'
  const REQUESTER_TENANT_ID = 'tu-requester-001'
  const APPROVER_1_AUTH_ID = 'auth-manager-001'
  const APPROVER_1_TENANT_ID = 'tu-manager-001'
  const APPROVER_2_AUTH_ID = 'auth-director-002'
  const APPROVER_2_TENANT_ID = 'tu-director-002'

  // ===========================================================================
  // SECTION 1: Concurrency & Race Conditions in ApprovalWorkflowEngine.review()
  // ===========================================================================
  describe('Challenge 1: Concurrency & Atomic Race Conditions in Approval Reviews (HTTP 409 Conflict)', () => {
    it('atomic race condition: simultaneous approval attempts on the same pending request yield exactly 1 success and 1 HTTP 409 Conflict', async () => {
      // Simulate database state with atomic update concurrency
      let dbRequestStatus: string = 'pending'
      let updateManyCallCount = 0

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockImplementation(async () => ({
            id: 'req-race-001',
            tenant_id: TENANT_ID,
            rule_id: 'rule-single',
            module: 'inventory',
            entity_type: 'stock_adjustment',
            entity_id: 'adj-001',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending', // Both concurrent reads see pending initially
            requested_amount: new Prisma.Decimal('1500'),
            metadata: {
              requiredLevels: ['LEVEL_1'],
              completedLevels: [],
              currentLevel: 'LEVEL_1',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
              required_permission: null,
              required_role_id: null,
            },
          })),
          updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
            updateManyCallCount++
            // Atomic DB guard: only succeeds if DB row is still pending
            if (where.status === 'pending' && dbRequestStatus === 'pending') {
              dbRequestStatus = data.status || 'approved'
              return { count: 1 }
            }
            // Second concurrent transaction sees count: 0 (row already modified)
            return { count: 0 }
          }),
          findUnique: vi.fn().mockImplementation(async () => ({
            id: 'req-race-001',
            status: dbRequestStatus, // Returns 'approved' after first caller succeeds
          })),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-race-001',
            tenant_id: TENANT_ID,
            status: dbRequestStatus,
            approved_by_user_id: APPROVER_1_AUTH_ID,
          })),
        },
        approval_rules: {
          findFirst: vi.fn(),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Fire 2 concurrent approval reviews simultaneously
      const caller1Promise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-race-001',
        approverAuthUserId: APPROVER_1_AUTH_ID,
        decision: 'approve',
        decisionReason: 'First reviewer approval',
      })

      const caller2Promise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-race-001',
        approverAuthUserId: APPROVER_2_AUTH_ID,
        decision: 'approve',
        decisionReason: 'Second concurrent reviewer approval',
      })

      const results = await Promise.allSettled([caller1Promise, caller2Promise])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')

      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)

      const error = (rejected[0] as PromiseRejectedResult).reason as ApiError
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(409)
      expect(error.message).toContain("Request has already been processed: current status is 'approved'")
      expect(updateManyCallCount).toBe(2)
      expect(dbRequestStatus).toBe('approved')
    })

    it('atomic race condition: simultaneous approve vs reject race yields exactly 1 winner and 1 HTTP 409 Conflict', async () => {
      let dbRequestStatus: string = 'pending'

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockImplementation(async () => ({
            id: 'req-race-002',
            tenant_id: TENANT_ID,
            rule_id: 'rule-single',
            module: 'sales',
            entity_type: 'discount',
            entity_id: 'disc-001',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('200'),
            metadata: {
              requiredLevels: ['LEVEL_1'],
              completedLevels: [],
              currentLevel: 'LEVEL_1',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
              required_permission: null,
              required_role_id: null,
            },
          })),
          updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
            // First caller locks row and transitions to rejected
            if (where.status === 'pending' && dbRequestStatus === 'pending') {
              dbRequestStatus = data.status
              return { count: 1 }
            }
            return { count: 0 }
          }),
          findUnique: vi.fn().mockImplementation(async () => ({
            id: 'req-race-002',
            status: dbRequestStatus,
          })),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-race-002',
            tenant_id: TENANT_ID,
            status: dbRequestStatus,
          })),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Caller A rejects, Caller B approves simultaneously
      const rejectPromise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-race-002',
        approverAuthUserId: APPROVER_1_AUTH_ID,
        decision: 'reject',
        decisionReason: 'Budget limit exceeded',
      })

      const approvePromise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-race-002',
        approverAuthUserId: APPROVER_2_AUTH_ID,
        decision: 'approve',
      })

      const results = await Promise.allSettled([rejectPromise, approvePromise])
      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')

      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)

      const err = (rejected[0] as PromiseRejectedResult).reason as ApiError
      expect(err.status).toBe(409)
      expect(err.message).toContain('Request has already been processed')
    })

    it('idempotency guard: reviewing an already approved request immediately throws HTTP 409 Conflict', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-already-approved',
            tenant_id: TENANT_ID,
            status: 'approved',
            approval_rules: null,
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-already-approved',
          approverAuthUserId: APPROVER_1_AUTH_ID,
          decision: 'approve',
        })
      ).rejects.toThrow(new ApiError('Request has already been approved.', 409))
    })

    it('idempotency guard: reviewing an already rejected request immediately throws HTTP 409 Conflict', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-already-rejected',
            tenant_id: TENANT_ID,
            status: 'rejected',
            approval_rules: null,
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-already-rejected',
          approverAuthUserId: APPROVER_1_AUTH_ID,
          decision: 'approve',
        })
      ).rejects.toThrow(new ApiError('Request has already been rejected.', 409))
    })

    it('invalid status guard: reviewing a cancelled request throws HTTP 400', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-cancelled',
            tenant_id: TENANT_ID,
            status: 'cancelled',
            approval_rules: null,
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-cancelled',
          approverAuthUserId: APPROVER_1_AUTH_ID,
          decision: 'approve',
        })
      ).rejects.toThrow(new ApiError('Cannot review a cancelled request.', 400))
    })
  })

  // ===========================================================================
  // SECTION 2: Multi-Tier Approval Progression & Separation of Duties (SoD)
  // ===========================================================================
  describe('Challenge 2: Multi-Tier Approval Progression & Multi-Tier SoD Protection', () => {
    it('multi-tier progression: advances LEVEL_1 -> LEVEL_2 while keeping request pending', async () => {
      let currentMetadata: any = {
        requiredLevels: ['LEVEL_1', 'LEVEL_2'],
        completedLevels: [] as CompletedLevel[],
        currentLevel: 'LEVEL_1',
      }
      let currentRuleId = 'rule-level-1'

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockImplementation(async () => ({
            id: 'req-multitier-001',
            tenant_id: TENANT_ID,
            rule_id: currentRuleId,
            module: 'purchasing',
            entity_type: 'purchase_order',
            entity_id: 'po-101',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('15000'),
            metadata: currentMetadata,
            approval_rules: {
              id: currentRuleId,
              enforce_separation_of_duties: true,
              approval_level: currentMetadata.currentLevel,
              required_permission: null,
              required_role_id: null,
            },
          })),
          updateMany: vi.fn().mockImplementation(async ({ data }) => {
            if (data.metadata) {
              currentMetadata = data.metadata
            }
            if (data.rule_id) {
              currentRuleId = data.rule_id
            }
            return { count: 1 }
          }),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-multitier-001',
            tenant_id: TENANT_ID,
            status: 'pending',
            metadata: currentMetadata,
          })),
        },
        approval_rules: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rule-level-2',
            approval_level: 'LEVEL_2',
            is_active: true,
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Step 1: Approver 1 approves LEVEL_1
      const tier1Result = await engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-multitier-001',
        approverAuthUserId: APPROVER_1_AUTH_ID,
        approverTenantUserId: APPROVER_1_TENANT_ID,
        decision: 'approve',
        decisionReason: 'Supervisor tier approved',
      })

      expect(tier1Result.status).toBe('pending')
      expect(currentMetadata.currentLevel).toBe('LEVEL_2')
      expect(currentMetadata.completedLevels).toHaveLength(1)
      expect(currentMetadata.completedLevels[0].level).toBe('LEVEL_1')
      expect(currentMetadata.completedLevels[0].approvedBy).toBe(APPROVER_1_AUTH_ID)
    })

    it('multi-tier SoD violation: same approver is strictly forbidden from approving LEVEL_2', async () => {
      const completedLevels: CompletedLevel[] = [
        {
          level: 'LEVEL_1',
          approvedBy: APPROVER_1_AUTH_ID,
          approvedAt: new Date().toISOString(),
          decisionReason: 'Tier 1 approved',
        },
      ]

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-multitier-sod',
            tenant_id: TENANT_ID,
            rule_id: 'rule-level-2',
            module: 'purchasing',
            entity_type: 'purchase_order',
            entity_id: 'po-101',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('15000'),
            metadata: {
              requiredLevels: ['LEVEL_1', 'LEVEL_2'],
              completedLevels,
              currentLevel: 'LEVEL_2',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_2',
              required_permission: null,
              required_role_id: null,
            },
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Approver 1 attempts to approve LEVEL_2 after having signed off on LEVEL_1
      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-multitier-sod',
          approverAuthUserId: APPROVER_1_AUTH_ID, // SAME approver!
          approverTenantUserId: APPROVER_1_TENANT_ID,
          decision: 'approve',
          decisionReason: 'Attempting to self-complete multi-tier approval',
        })
      ).rejects.toThrow(
        new AntiSelfApprovalError(
          'Approver has already signed off on an earlier level for this request'
        )
      )
    })

    it('requester SoD violation: original requester cannot approve their own request at any tier', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-requester-self',
            tenant_id: TENANT_ID,
            rule_id: 'rule-level-1',
            module: 'sales',
            entity_type: 'discount',
            entity_id: 'disc-202',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('500'),
            metadata: {
              requiredLevels: ['LEVEL_1'],
              completedLevels: [],
              currentLevel: 'LEVEL_1',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
            },
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Requester attempts self-approval
      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-requester-self',
          approverAuthUserId: REQUESTER_AUTH_ID, // Requester!
          approverTenantUserId: REQUESTER_TENANT_ID,
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)
    })

    it('multi-tier completion: distinct Approver 2 approves LEVEL_2, transitioning request to approved', async () => {
      let finalStatus = 'pending'
      const completedLevels: CompletedLevel[] = [
        {
          level: 'LEVEL_1',
          approvedBy: APPROVER_1_AUTH_ID,
          approvedAt: new Date().toISOString(),
          decisionReason: 'Tier 1 approved',
        },
      ]

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-multitier-finish',
            tenant_id: TENANT_ID,
            rule_id: 'rule-level-2',
            module: 'purchasing',
            entity_type: 'purchase_order',
            entity_id: 'po-101',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('15000'),
            metadata: {
              requiredLevels: ['LEVEL_1', 'LEVEL_2'],
              completedLevels,
              currentLevel: 'LEVEL_2',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_2',
              required_permission: null,
              required_role_id: null,
            },
          }),
          updateMany: vi.fn().mockImplementation(async ({ data }) => {
            finalStatus = data.status
            return { count: 1 }
          }),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-multitier-finish',
            tenant_id: TENANT_ID,
            status: finalStatus,
            approved_by_user_id: APPROVER_2_AUTH_ID,
          })),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      const finalResult = await engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-multitier-finish',
        approverAuthUserId: APPROVER_2_AUTH_ID, // Distinct approver!
        approverTenantUserId: APPROVER_2_TENANT_ID,
        decision: 'approve',
        decisionReason: 'Director final approval',
      })

      expect(finalResult.status).toBe('approved')
      expect(finalStatus).toBe('approved')
    })

    it('canUserApprove gating helper accurately verifies eligibility at each state', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-gate-check',
            tenant_id: TENANT_ID,
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            metadata: {
              completedLevels: [
                {
                  level: 'LEVEL_1',
                  approvedBy: APPROVER_1_AUTH_ID,
                  approvedAt: new Date().toISOString(),
                },
              ],
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              required_permission: null,
              required_role_id: null,
            },
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Requester check -> ineligible
      const requesterCheck = await engine.canUserApprove(
        TENANT_ID,
        'req-gate-check',
        REQUESTER_AUTH_ID,
        REQUESTER_TENANT_ID
      )
      expect(requesterCheck.eligible).toBe(false)
      expect(requesterCheck.reason).toContain('ANTI_SELF_APPROVAL_VIOLATION')

      // Prior tier approver check -> ineligible
      const priorApproverCheck = await engine.canUserApprove(
        TENANT_ID,
        'req-gate-check',
        APPROVER_1_AUTH_ID,
        APPROVER_1_TENANT_ID
      )
      expect(priorApproverCheck.eligible).toBe(false)
      expect(priorApproverCheck.reason).toContain('Approver has already approved a prior level')

      // Distinct fresh approver -> eligible
      const freshApproverCheck = await engine.canUserApprove(
        TENANT_ID,
        'req-gate-check',
        APPROVER_2_AUTH_ID,
        APPROVER_2_TENANT_ID
      )
      expect(freshApproverCheck.eligible).toBe(true)
    })
  })

  // ===========================================================================
  // SECTION 3: Amount Thresholds & Boundary Conditions
  // ===========================================================================
  describe('Challenge 3: Amount Threshold Rules & Boundary Evaluations', () => {
    const tieredRules = [
      {
        id: 'rule-tier-1',
        tenant_id: TENANT_ID,
        module: 'purchasing',
        entity_type: 'purchase_order',
        action: null,
        min_amount: new Prisma.Decimal('500'),
        max_amount: new Prisma.Decimal('4999.99'),
        approval_level: 'LEVEL_1',
        name: 'PO Supervisor Approval ($500 - $4,999.99)',
        is_active: true,
        enforce_separation_of_duties: true,
      },
      {
        id: 'rule-tier-2',
        tenant_id: TENANT_ID,
        module: 'purchasing',
        entity_type: 'purchase_order',
        action: null,
        min_amount: new Prisma.Decimal('5000'),
        max_amount: new Prisma.Decimal('50000'),
        approval_level: 'LEVEL_2',
        name: 'PO Director Approval ($5,000 - $50,000)',
        is_active: true,
        enforce_separation_of_duties: true,
      },
    ]

    const mockDb: any = {
      approval_rules: {
        findMany: vi.fn().mockImplementation(async ({ where }) => {
          return tieredRules.filter(
            (r) =>
              r.module === where.module &&
              r.entity_type === where.entity_type &&
              r.is_active === true
          )
        }),
      },
      approval_requests: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'req-created-threshold',
          ...data,
        })),
      },
    }

    const engine = new ApprovalWorkflowEngine(mockDb)

    it('sub-threshold: document with amount below minimum threshold ($499 < $500) requires NO approval', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 499,
      })

      expect(evaluation.requiresApproval).toBe(false)
      expect(evaluation.matchedRules).toHaveLength(0)
      expect(evaluation.reason).toContain('is below the minimum threshold required for approval')

      // Submit automatically approves without creating approval_requests record
      const submission = await engine.submit({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        entityId: 'po-small-01',
        amount: 499,
        requestedByUserId: REQUESTER_AUTH_ID,
      })

      expect(submission.requiresApproval).toBe(false)
      expect(submission.status).toBe('approved')
      expect(submission.requestId).toBeNull()
      expect(mockDb.approval_requests.create).not.toHaveBeenCalled()
    })

    it('exact minimum boundary: document with amount exactly at min_amount ($500) triggers LEVEL_1 approval', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 500,
      })

      expect(evaluation.requiresApproval).toBe(true)
      expect(evaluation.primaryRule?.approval_level).toBe('LEVEL_1')
      expect(evaluation.requiredLevels).toEqual(['LEVEL_1'])

      const submission = await engine.submit({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        entityId: 'po-min-01',
        amount: 500,
        requestedByUserId: REQUESTER_AUTH_ID,
      })

      expect(submission.requiresApproval).toBe(true)
      expect(submission.status).toBe('pending')
      expect(submission.requestId).toBe('req-created-threshold')
      expect(mockDb.approval_requests.create).toHaveBeenCalled()
    })

    it('tier escalation: document with amount $5,000 escalates to LEVEL_2', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 5000,
      })

      expect(evaluation.requiresApproval).toBe(true)
      expect(evaluation.primaryRule?.approval_level).toBe('LEVEL_2')
      expect(evaluation.requiredLevels).toEqual(['LEVEL_2'])
    })

    it('exact maximum boundary: document with amount $50,000 matches LEVEL_2 upper limit', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 50000,
      })

      expect(evaluation.requiresApproval).toBe(true)
      expect(evaluation.primaryRule?.id).toBe('rule-tier-2')
    })

    it('beyond maximum threshold: document with amount exceeding configured rules ($50,000.01) matches no rules', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 50000.01,
      })

      expect(evaluation.requiresApproval).toBe(false)
      expect(evaluation.matchedRules).toHaveLength(0)
    })

    it('zero and negative amounts: require no approval', async () => {
      const zeroEval = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: 0,
      })
      expect(zeroEval.requiresApproval).toBe(false)

      const negEval = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'purchasing',
        entityType: 'purchase_order',
        amount: -100,
      })
      expect(negEval.requiresApproval).toBe(false)
    })

    it('unconfigured entity type: evaluate safely returns requiresApproval: false', async () => {
      const evaluation = await engine.evaluate({
        tenantId: TENANT_ID,
        module: 'unknown_module',
        entityType: 'unknown_entity',
        amount: 100000,
      })

      expect(evaluation.requiresApproval).toBe(false)
      expect(evaluation.reason).toContain('No approval rules configured')
    })
  })

  // ===========================================================================
  // SECTION 4: Document Lifecycle & State Machine Transitions
  // ===========================================================================
  describe('Challenge 4: Document Lifecycle State Machine & Invalid Status Transitions', () => {
    it('verifies valid document state transitions', () => {
      expect(canTransitionDocument('draft', 'pending_approval')).toBe(true)
      expect(canTransitionDocument('draft', 'approved')).toBe(true)
      expect(canTransitionDocument('draft', 'cancelled')).toBe(true)

      expect(canTransitionDocument('pending_approval', 'approved')).toBe(true)
      expect(canTransitionDocument('pending_approval', 'rejected')).toBe(true)
      expect(canTransitionDocument('pending_approval', 'cancelled')).toBe(true)

      expect(canTransitionDocument('approved', 'cancelled')).toBe(true)
      expect(canTransitionDocument('rejected', 'draft')).toBe(true)
    })

    it('assertValidDocumentTransition throws on illegal transitions', () => {
      // Illegal: approved -> draft
      expect(() => {
        assertValidDocumentTransition('approved', 'draft', 'doc-123')
      }).toThrow(ApprovalWorkflowError)

      // Illegal: approved -> pending_approval
      expect(() => {
        assertValidDocumentTransition('approved', 'pending_approval', 'doc-123')
      }).toThrow('Invalid document status transition')

      // Illegal: cancelled -> any other status
      expect(() => {
        assertValidDocumentTransition('cancelled', 'pending_approval', 'doc-123')
      }).toThrow('Invalid document status transition')
    })

    it('cancelling a pending approval request transitions to cancelled with decisionReason', async () => {
      let cancelledStatus = 'pending'
      let decisionReason: string | null = null

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-to-cancel',
            tenant_id: TENANT_ID,
            status: 'pending',
            module: 'purchasing',
            entity_type: 'purchase_order',
            metadata: {},
          }),
          update: vi.fn().mockImplementation(async ({ data }) => {
            cancelledStatus = data.status
            decisionReason = data.decision_reason
            return {
              id: 'req-to-cancel',
              status: cancelledStatus,
              decision_reason: decisionReason,
            }
          }),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-to-cancel',
            status: cancelledStatus,
            decision_reason: decisionReason,
          })),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      const result = await engine.cancel({
        tenantId: TENANT_ID,
        requestId: 'req-to-cancel',
        cancelledByUserId: REQUESTER_AUTH_ID,
        reason: 'Order no longer required by customer',
      })

      expect(result.status).toBe('cancelled')
      expect(cancelledStatus).toBe('cancelled')
      expect(decisionReason).toBe('Order no longer required by customer')
    })

    it('cancelling an already approved or rejected request throws HTTP 400', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-already-approved-cancel',
            tenant_id: TENANT_ID,
            status: 'approved',
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      await expect(
        engine.cancel({
          tenantId: TENANT_ID,
          requestId: 'req-already-approved-cancel',
          cancelledByUserId: REQUESTER_AUTH_ID,
          reason: 'Attempted late cancel',
        })
      ).rejects.toThrow(new ApiError("Cannot cancel request with status 'approved'.", 400))
    })
  })

  // ===========================================================================
  // SECTION 5: Cryptographic Audit Hash Chaining & Tamper Resistance
  // ===========================================================================
  describe('Challenge 5: Cryptographic SHA-256 Audit Hash Chaining & Tamper Detection', () => {
    it('canonicalJsonStringify produces identical hashes regardless of object key order', () => {
      const obj1 = { z: 1, a: 2, m: { nestedB: true, nestedA: 'val' } }
      const obj2 = { a: 2, m: { nestedA: 'val', nestedB: true }, z: 1 }

      expect(canonicalJsonStringify(obj1)).toBe(canonicalJsonStringify(obj2))
    })

    it('computeRecordHash generates 64-character hex SHA-256 hash incorporating prev_record_hash', () => {
      const payload = toCanonicalPayload({
        id: 'rec-001',
        tenant_id: TENANT_ID,
        actor_auth_user_id: REQUESTER_AUTH_ID,
        action: 'order.created',
        resource_type: 'sales_orders',
        resource_id: 'order-123',
        status: 'SUCCESS',
        severity: 'INFO',
        diff: { total: 100 },
        prev_record_hash: GENESIS_PREV_HASH,
        created_at: new Date('2026-10-31T12:00:00Z'),
      })

      const hash1 = computeRecordHash(payload)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)

      // Tampering any attribute changes hash
      const tamperedPayload = { ...payload, action: 'order.deleted' }
      const hash2 = computeRecordHash(tamperedPayload)
      expect(hash2).not.toBe(hash1)
    })

    it('isGenesisHash correctly recognizes all valid genesis sentinel hashes', () => {
      expect(isGenesisHash(null)).toBe(true)
      expect(isGenesisHash(undefined)).toBe(true)
      expect(isGenesisHash(GENESIS_PREV_HASH)).toBe(true)
      expect(isGenesisHash('GENESIS')).toBe(true)
      expect(isGenesisHash('GENESIS_HASH_0000000000000000')).toBe(true)
      expect(isGenesisHash('invalid_hash')).toBe(false)
    })
  })

  // ===========================================================================
  // SECTION 6: High-Concurrency Burst & Multi-Tier Tri-Approver Segregation
  // ===========================================================================
  describe('Challenge 6: High-Concurrency Burst & 3-Tier Multi-Approver Segregation', () => {
    it('high-concurrency race burst: 10 simultaneous approval attempts yield exactly 1 success and 9 HTTP 409 Conflicts', async () => {
      let isClaimed = false
      let successCount = 0
      let conflictCount = 0

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockImplementation(async () => ({
            id: 'req-burst-10',
            tenant_id: TENANT_ID,
            rule_id: 'rule-single',
            module: 'inventory',
            entity_type: 'stock_adjustment',
            entity_id: 'adj-burst-01',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('1000'),
            metadata: {
              requiredLevels: ['LEVEL_1'],
              completedLevels: [],
              currentLevel: 'LEVEL_1',
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
            },
          })),
          updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
            if (where.status === 'pending' && !isClaimed) {
              isClaimed = true
              return { count: 1 }
            }
            return { count: 0 }
          }),
          findUnique: vi.fn().mockImplementation(async () => ({
            id: 'req-burst-10',
            status: 'approved',
          })),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-burst-10',
            status: 'approved',
          })),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Dispatch 10 simultaneous approval attempts
      const callers = Array.from({ length: 10 }, (_, i) =>
        engine
          .review({
            tenantId: TENANT_ID,
            requestId: 'req-burst-10',
            approverAuthUserId: `approver-concurrent-${i + 1}`,
            decision: 'approve',
          })
          .then(() => {
            successCount++
          })
          .catch((err: ApiError) => {
            if (err.status === 409) {
              conflictCount++
            } else {
              throw err
            }
          })
      )

      await Promise.all(callers)

      expect(successCount).toBe(1)
      expect(conflictCount).toBe(9)
    })

    it('3-tier approval progression: enforces distinct approvers across all 3 tiers', async () => {
      let completedLevels: CompletedLevel[] = []
      let currentLevel = 'LEVEL_1'
      let finalStatus = 'pending'

      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockImplementation(async () => ({
            id: 'req-3-tier',
            tenant_id: TENANT_ID,
            rule_id: `rule-${currentLevel.toLowerCase()}`,
            module: 'purchasing',
            entity_type: 'purchase_order',
            entity_id: 'po-3tier',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: finalStatus,
            requested_amount: new Prisma.Decimal('100000'),
            metadata: {
              requiredLevels: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'],
              completedLevels: [...completedLevels],
              currentLevel,
            },
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: currentLevel,
            },
          })),
          updateMany: vi.fn().mockImplementation(async ({ data }) => {
            if (data.metadata?.completedLevels) {
              completedLevels = data.metadata.completedLevels
            }
            if (data.metadata?.currentLevel !== undefined) {
              currentLevel = data.metadata.currentLevel
            }
            if (data.status) {
              finalStatus = data.status
            }
            return { count: 1 }
          }),
          findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
            id: 'req-3-tier',
            status: finalStatus,
            metadata: { completedLevels, currentLevel },
          })),
        },
        approval_rules: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => ({
            id: `rule-${where.approval_level.toLowerCase()}`,
            approval_level: where.approval_level,
            is_active: true,
          })),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Tier 1: Approver 1 approves
      const tier1 = await engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-3-tier',
        approverAuthUserId: 'user-manager-1',
        decision: 'approve',
      })
      expect(tier1.status).toBe('pending')
      expect(completedLevels).toHaveLength(1)
      expect(currentLevel).toBe('LEVEL_2')

      // Tier 2: Approver 1 attempts to approve Tier 2 -> BLOCKED by SoD
      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-3-tier',
          approverAuthUserId: 'user-manager-1', // Same user!
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)

      // Tier 2: Approver 2 approves
      const tier2 = await engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-3-tier',
        approverAuthUserId: 'user-director-2', // Distinct user!
        decision: 'approve',
      })
      expect(tier2.status).toBe('pending')
      expect(completedLevels).toHaveLength(2)
      expect(currentLevel).toBe('LEVEL_3')

      // Tier 3: Approver 1 attempts to approve Tier 3 -> BLOCKED by SoD
      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-3-tier',
          approverAuthUserId: 'user-manager-1',
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)

      // Tier 3: Approver 2 attempts to approve Tier 3 -> BLOCKED by SoD
      await expect(
        engine.review({
          tenantId: TENANT_ID,
          requestId: 'req-3-tier',
          approverAuthUserId: 'user-director-2',
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)

      // Tier 3: Approver 3 approves Tier 3 -> Final Approval
      const tier3 = await engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-3-tier',
        approverAuthUserId: 'user-vp-3', // Third distinct user!
        decision: 'approve',
      })
      expect(tier3.status).toBe('approved')
      expect(finalStatus).toBe('approved')
      expect(completedLevels).toHaveLength(3)
    })
  })
})

