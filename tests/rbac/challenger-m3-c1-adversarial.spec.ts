// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  const mockClient = {
    tenant_user_branches: {
      findMany: vi.fn(),
    },
    tenant_user_warehouses: {
      findMany: vi.fn(),
    },
    roles: {
      findMany: vi.fn(),
    },
    security_audit_logs: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    inv_discount_approval_requests: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    stock_adjustments: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stock_transfers: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    approval_requests: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    approval_rules: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => (typeof fn === 'function' ? fn(mockClient) : Promise.all(fn))),
  }
  return {
    default: mockClient,
  }
})

import {
  ApprovalWorkflowEngine,
  AntiSelfApprovalError,
} from '@/server/workflow/approval-engine'
import { reviewDiscountApprovalRequest } from '@/server/fns/discount-approvals'
import { approveAdjustment } from '@/server/fns/stock-adjustments'
import { approveTransfer } from '@/server/domain/stock-transfer/stock-transfer-service'
import {
  verifyAuditLogIntegrity,
  computeRecordHash,
  toCanonicalPayload,
  GENESIS_PREV_HASH,
} from '@/server/logging/security-audit'
import * as securityAudit from '@/server/logging/security-audit'
import { withServerFnAuth } from '@/server/utils/with-server-fn-auth'
import * as authUtils from '@/server/utils/auth'
import * as tenantUtils from '@/server/utils/tenant'
import { ApiError } from '@/server/utils/api-error'
import { Prisma } from '@/generated/prisma/client'

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const REQUESTER_AUTH_ID = 'user-requester-auth-001'
const REQUESTER_TENANT_USER_ID = 'tu-requester-001'
const APPROVER_AUTH_ID = 'user-approver-auth-002'
const APPROVER_TENANT_USER_ID = 'tu-approver-002'

describe('Challenger 1 Adversarial Suite: SoD, Audit Tamper-Resistance & Server Function Auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. ANTI-SELF-APPROVAL (SEPARATION OF DUTIES) ADVERSARIAL PROBING
  // ===========================================================================
  describe('Area 1: Anti-Self-Approval SoD Probing Across All Approval Endpoints', () => {
    it('1.1 ApprovalWorkflowEngine.review(): strictly rejects self-approval attempt with HTTP 403 ANTI_SELF_APPROVAL_VIOLATION', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-sod-001',
            tenant_id: TENANT_ID,
            module: 'inventory',
            entity_type: 'stock_adjustment',
            requested_by_user_id: REQUESTER_AUTH_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('500'),
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
              required_permission: null,
              required_role_id: null,
            },
            metadata: {},
          }),
          updateMany: vi.fn(),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Requester attempts self-approval via approverAuthUserId
      const selfApprovalPromise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-sod-001',
        approverAuthUserId: REQUESTER_AUTH_ID,
        decision: 'approve',
      })

      await expect(selfApprovalPromise).rejects.toThrow(AntiSelfApprovalError)
      await expect(selfApprovalPromise).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.code).toBe('ANTI_SELF_APPROVAL_VIOLATION')
        expect(err.message).toContain('Requester cannot approve their own request')
        return true
      })
    })

    it('1.2 ApprovalWorkflowEngine.review(): strictly rejects self-rejection / review via approverTenantUserId match', async () => {
      const mockDb: any = {
        approval_requests: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'req-sod-002',
            tenant_id: TENANT_ID,
            module: 'discount',
            entity_type: 'invoice_discount',
            requested_by_user_id: REQUESTER_TENANT_USER_ID,
            status: 'pending',
            requested_amount: new Prisma.Decimal('200'),
            approval_rules: {
              enforce_separation_of_duties: true,
              approval_level: 'LEVEL_1',
              required_permission: null,
              required_role_id: null,
            },
            metadata: {},
          }),
        },
      }

      const engine = new ApprovalWorkflowEngine(mockDb)

      // Requester attempts review via approverTenantUserId matching requested_by_user_id
      const selfReviewPromise = engine.review({
        tenantId: TENANT_ID,
        requestId: 'req-sod-002',
        approverAuthUserId: 'different-auth-id-but-same-tenant-user',
        approverTenantUserId: REQUESTER_TENANT_USER_ID,
        decision: 'reject',
      })

      await expect(selfReviewPromise).rejects.toThrow(AntiSelfApprovalError)
      await expect(selfReviewPromise).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.code).toBe('ANTI_SELF_APPROVAL_VIOLATION')
        return true
      })
    })

    it('1.3 reviewDiscountApprovalRequest(): strictly rejects self-approval by requester', async () => {
      vi.spyOn(tenantUtils, 'requireTenantId').mockResolvedValue(TENANT_ID)
      ;(prisma.inv_discount_approval_requests.findFirst as any).mockResolvedValue({
        id: 'disc-req-001',
        tenant_id: TENANT_ID,
        requested_by_user_id: REQUESTER_AUTH_ID,
        status: 'pending',
        discount_amount: new Prisma.Decimal('50'),
      })

      // Requester attempts to approve their own discount request
      const reviewPromise = reviewDiscountApprovalRequest(
        REQUESTER_AUTH_ID,
        'disc-req-001',
        true
      )

      await expect(reviewPromise).rejects.toThrow(AntiSelfApprovalError)
      await expect(reviewPromise).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.code).toBe('ANTI_SELF_APPROVAL_VIOLATION')
        expect(err.message).toContain('Requester cannot approve their own request')
        return true
      })
    })

    it('1.4 approveAdjustment(): strictly rejects self-approval when approver is adjustment creator', async () => {
      vi.spyOn(tenantUtils, 'requireTenantId').mockResolvedValue(TENANT_ID)
      vi.spyOn(tenantUtils, 'resolveTenantUserId').mockResolvedValue(REQUESTER_TENANT_USER_ID)
      ;(prisma.stock_adjustments.findFirst as any).mockResolvedValue({
        id: 'adj-001',
        tenant_id: TENANT_ID,
        created_by_user_id: REQUESTER_TENANT_USER_ID,
        created_by: REQUESTER_AUTH_ID,
        status: 'pending',
        warehouses: { id: 'wh-001' },
      })

      // Creator attempts to approve their own stock adjustment
      const approvePromise = approveAdjustment(REQUESTER_AUTH_ID, 'adj-001')

      await expect(approvePromise).rejects.toThrow(AntiSelfApprovalError)
      await expect(approvePromise).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.code).toBe('ANTI_SELF_APPROVAL_VIOLATION')
        expect(err.message).toContain('Requester cannot approve their own request')
        return true
      })
    })

    it('1.5 approveTransfer(): strictly rejects self-approval when approver requested or created transfer', async () => {
      vi.spyOn(tenantUtils, 'requireTenantId').mockResolvedValue(TENANT_ID)
      vi.spyOn(tenantUtils, 'resolveTenantUserId').mockResolvedValue(REQUESTER_TENANT_USER_ID)
      
      const mockTx: any = {
        stock_transfers: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'xfer-001',
            tenant_id: TENANT_ID,
            requested_by_user_id: REQUESTER_TENANT_USER_ID,
            created_by_user_id: REQUESTER_TENANT_USER_ID,
            created_by: REQUESTER_AUTH_ID,
            status: 'pending_approval',
            stock_transfer_items: [],
          }),
        },
      }
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(mockTx)
      })

      // Requester attempts to approve their own stock transfer
      const transferPromise = approveTransfer(REQUESTER_AUTH_ID, 'xfer-001')

      await expect(transferPromise).rejects.toThrow(AntiSelfApprovalError)
      await expect(transferPromise).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.code).toBe('ANTI_SELF_APPROVAL_VIOLATION')
        expect(err.message).toContain('Requester cannot approve their own request')
        return true
      })
    })
  })

  // ===========================================================================
  // 2. AUDIT LOG TAMPER-RESISTANCE & INTEGRITY VERIFICATION
  // ===========================================================================
  describe('Area 2: Audit Log Tamper-Resistance & Hash Chain Verification', () => {
    function generatePristineAuditChain(count = 5) {
      const records: any[] = []
      let prevHash = GENESIS_PREV_HASH
      const baseTime = 1700000000000

      for (let i = 0; i < count; i++) {
        const id = `audit-rec-00${i + 1}`
        const createdAt = new Date(baseTime + i * 1000)
        const canonical = toCanonicalPayload({
          id,
          tenant_id: TENANT_ID,
          actor_auth_user_id: `actor-${i}`,
          actor_tenant_user_id: null,
          actor_email: `actor${i}@example.com`,
          action: `audit.action.${i}`,
          resource_type: 'role',
          resource_id: `res-${i}`,
          status: 'SUCCESS',
          severity: 'INFO',
          data_scope: null,
          diff: { field: `value_${i}` },
          metadata: { seq: i },
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          route: '/api/roles',
          prev_record_hash: prevHash,
          created_at: createdAt,
        })
        const recordHash = computeRecordHash(canonical)
        records.push({
          id,
          tenant_id: TENANT_ID,
          actor_auth_user_id: `actor-${i}`,
          actor_tenant_user_id: null,
          actor_email: `actor${i}@example.com`,
          action: `audit.action.${i}`,
          resource_type: 'role',
          resource_id: `res-${i}`,
          status: 'SUCCESS',
          severity: 'INFO',
          data_scope: null,
          diff: { field: `value_${i}` },
          metadata: { seq: i },
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          route: '/api/roles',
          prev_record_hash: prevHash,
          record_hash: recordHash,
          created_at: createdAt,
        })
        prevHash = recordHash
      }
      return records
    }

    it('2.1 verifyAuditLogIntegrity(): successfully verifies a pristine cryptographic ledger', async () => {
      const pristineChain = generatePristineAuditChain(5)
      ;(prisma.security_audit_logs.findMany as any).mockResolvedValue(pristineChain)

      const result = await verifyAuditLogIntegrity(TENANT_ID)

      expect(result.isValid).toBe(true)
      expect(result.totalRecords).toBe(5)
      expect(result.verifiedRecords).toBe(5)
      expect(result.tamperedRecords).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('2.2 verifyAuditLogIntegrity(): detects content tampering in record payload (HASH_MISMATCH)', async () => {
      const chain = generatePristineAuditChain(5)
      // Adversary tampers with the action and diff of record #2
      chain[2].action = 'role.tampered_privilege_escalation'
      chain[2].diff = { field: 'unauthorized_superadmin_grant' }

      ;(prisma.security_audit_logs.findMany as any).mockResolvedValue(chain)

      const result = await verifyAuditLogIntegrity(TENANT_ID)

      expect(result.isValid).toBe(false)
      expect(result.tamperedRecords).toBeGreaterThan(0)
      const mismatch = result.errors.find((e) => e.errorType === 'HASH_MISMATCH')
      expect(mismatch).toBeDefined()
      expect(mismatch?.recordId).toBe(chain[2].id)
      expect(mismatch?.message).toContain('Tampered content')
    })

    it('2.3 verifyAuditLogIntegrity(): detects altered prev_record_hash in chain link (BROKEN_CHAIN)', async () => {
      const chain = generatePristineAuditChain(5)
      // Adversary modifies the prev_record_hash of record #3
      chain[3].prev_record_hash = 'f'.repeat(64)

      ;(prisma.security_audit_logs.findMany as any).mockResolvedValue(chain)

      const result = await verifyAuditLogIntegrity(TENANT_ID)

      expect(result.isValid).toBe(false)
      const broken = result.errors.find((e) => e.errorType === 'BROKEN_CHAIN')
      expect(broken).toBeDefined()
      expect(broken?.recordId).toBe(chain[3].id)
      expect(broken?.message).toContain('Broken chain link')
    })

    it('2.4 verifyAuditLogIntegrity(): detects corrupted genesis record prev_record_hash (INVALID_GENESIS)', async () => {
      const chain = generatePristineAuditChain(4)
      // Adversary points genesis record to random hash instead of 64 zeroes
      chain[0].prev_record_hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      ;(prisma.security_audit_logs.findMany as any).mockResolvedValue(chain)

      const result = await verifyAuditLogIntegrity(TENANT_ID)

      expect(result.isValid).toBe(false)
      const invalidGen = result.errors.find((e) => e.errorType === 'INVALID_GENESIS')
      expect(invalidGen).toBeDefined()
      expect(invalidGen?.recordId).toBe(chain[0].id)
      expect(invalidGen?.message).toContain('invalid prev_record_hash')
    })

    it('2.5 verifyAuditLogIntegrity(): detects out-of-order / backdated timestamps (TIMESTAMP_OUT_OF_ORDER)', async () => {
      const chain = generatePristineAuditChain(4)
      // Adversary backdates record #2 to an earlier timestamp than record #1
      chain[2].created_at = new Date(new Date(chain[1].created_at).getTime() - 5000)

      ;(prisma.security_audit_logs.findMany as any).mockResolvedValue(chain)

      const result = await verifyAuditLogIntegrity(TENANT_ID)

      expect(result.isValid).toBe(false)
      const timeError = result.errors.find((e) => e.errorType === 'TIMESTAMP_OUT_OF_ORDER')
      expect(timeError).toBeDefined()
      expect(timeError?.recordId).toBe(chain[2].id)
      expect(timeError?.message).toContain('is earlier than predecessor timestamp')
    })
  })

  // ===========================================================================
  // 3. SERVER FUNCTION AUTH TOKEN EXTRACTION & REJECTION
  // ===========================================================================
  describe('Area 3: Server Function Token Extraction & Denial Handling', () => {
    it('3.1 withServerFnAuth: missing token throws HTTP 401 Unauthorized and dispatches logAccessDenied', async () => {
      const logSpy = vi.spyOn(securityAudit, 'logAccessDenied').mockResolvedValue({} as any)
      const handler = vi.fn()

      const protectedFn = withServerFnAuth(
        { resourceType: 'products', actionName: 'view' },
        handler
      )

      // Invoke without token
      const invocation = protectedFn({})

      await expect(invocation).rejects.toThrow(ApiError)
      await expect(invocation).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(401)
        expect(err.message).toContain('Unauthorized: Missing bearer token')
        return true
      })

      expect(handler).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'products',
          action: 'view',
          reason: expect.stringContaining('Unauthorized: Missing session or bearer token'),
        })
      )
    })

    it('3.2 withServerFnAuth: expired or invalid token throws HTTP 401 and dispatches logAccessDenied', async () => {
      const logSpy = vi.spyOn(securityAudit, 'logAccessDenied').mockResolvedValue({} as any)
      vi.spyOn(authUtils, 'requireAuth').mockRejectedValue(
        new Error('Unauthorized: Invalid session token')
      )
      const handler = vi.fn()

      const protectedFn = withServerFnAuth(
        { resourceType: 'sales', actionName: 'export' },
        handler
      )

      const invocation = protectedFn({ sessionToken: 'expired-or-invalid-jwt' })

      await expect(invocation).rejects.toThrow(ApiError)
      await expect(invocation).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(401)
        expect(err.message).toContain('Unauthorized: Invalid session token')
        return true
      })

      expect(handler).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'sales',
          action: 'export',
          reason: expect.stringContaining('Invalid session token'),
        })
      )
    })

    it('3.3 withServerFnAuth: blocked or inactive user account throws HTTP 403 Forbidden and dispatches logAccessDenied', async () => {
      const logSpy = vi.spyOn(securityAudit, 'logAccessDenied').mockResolvedValue({} as any)
      vi.spyOn(authUtils, 'requireAuth').mockRejectedValue(
        new Error('Forbidden: User account is inactive or blocked in this tenant')
      )
      const handler = vi.fn()

      const protectedFn = withServerFnAuth(
        { resourceType: 'inventory', actionName: 'transfer' },
        handler
      )

      const invocation = protectedFn({ sessionToken: 'blocked-user-token' })

      await expect(invocation).rejects.toThrow(ApiError)
      await expect(invocation).rejects.toSatisfy((err: any) => {
        expect(err.status).toBe(403)
        expect(err.message).toContain('blocked')
        return true
      })

      expect(handler).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'inventory',
          action: 'transfer',
          reason: expect.stringContaining('blocked'),
        })
      )
    })

    it('3.4 withServerFnAuth: extracts Bearer token from Request header when no explicit token passed', async () => {
      vi.spyOn(authUtils, 'requireAuth').mockResolvedValue({
        userId: APPROVER_AUTH_ID,
        tenantId: TENANT_ID,
        tenantUserId: APPROVER_TENANT_USER_ID,
        roleNames: ['admin'],
        roleIds: ['role-1'],
        permissionNames: ['products.create'],
        branchId: null,
        warehouseId: null,
        isSuperAdmin: false,
        isOwner: false,
      } as any)

      ;(prisma.tenant_user_branches.findMany as any).mockResolvedValue([])
      ;(prisma.tenant_user_warehouses.findMany as any).mockResolvedValue([])
      ;(prisma.roles.findMany as any).mockResolvedValue([{ data_scope: 'TENANT' }])

      let receivedContext: any = null
      const handler = vi.fn(async (input, ctx) => {
        receivedContext = ctx
        return { created: true, name: input.name }
      })

      const protectedFn = withServerFnAuth(
        { permissions: 'products.create' },
        handler
      )

      const dummyReq = new Request('https://app.example.com/api/products', {
        headers: {
          authorization: 'Bearer valid-extracted-bearer-token',
        },
      })

      const res = await protectedFn({ name: 'Product A' }, { request: dummyReq })

      expect(res).toEqual({ created: true, name: 'Product A' })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(receivedContext.tenantId).toBe(TENANT_ID)
      expect(receivedContext.user.userId).toBe(APPROVER_AUTH_ID)
      expect(typeof receivedContext.scopeFilter).toBe('function')
    })
  })
})
