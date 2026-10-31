// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  return {
    default: {
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
        create: vi.fn(),
      },
      $transaction: vi.fn((fn: any) => fn(prisma)),
    },
  }
})
import {
  canonicalJsonStringify,
  computeRecordHash,
  isGenesisHash,
  GENESIS_PREV_HASH,
} from '@/server/logging/security-audit'
import {
  ApprovalWorkflowEngine,
  AntiSelfApprovalError,
  assertValidDocumentTransition,
  canTransitionDocument,
} from '@/server/workflow/approval-engine'
import { withServerFnAuth } from '@/server/utils/with-server-fn-auth'
import * as authUtils from '@/server/utils/auth'
import * as tenantContext from '@/server/context/tenant-context'

const TENANT_1 = '11111111-1111-1111-1111-111111111111'
const TENANT_2 = '22222222-2222-2222-2222-222222222222'

describe('Challenger M3 Adversarial Stress Suite', () => {
  describe('Challenge 1: Cryptographic Determinism & Key Ordering in canonicalJsonStringify', () => {
    it('produces identical serializations for deeply nested objects regardless of key order', () => {
      const objA = {
        z: 100,
        b: {
          beta: 'world',
          alpha: 'hello',
          nested: { y: 2, x: 1, arr: [{ d: 4, c: 3 }, { f: 6, e: 5 }] },
        },
        a: true,
        m: null,
      }

      const objB = {
        m: null,
        a: true,
        b: {
          nested: { arr: [{ c: 3, d: 4 }, { e: 5, f: 6 }], x: 1, y: 2 },
          alpha: 'hello',
          beta: 'world',
        },
        z: 100,
      }

      const strA = canonicalJsonStringify(objA)
      const strB = canonicalJsonStringify(objB)

      expect(strA).toBe(strB)
      expect(strA).toContain('"a":true')
      expect(strA).toContain('"nested":{"arr":[{"c":3,"d":4},{"e":5,"f":6}],"x":1,"y":2}')
    })

    it('ignores undefined values consistently while preserving null and empty objects', () => {
      const withUndefined = { a: 1, b: undefined, c: null, d: {} }
      const withoutUndefined = { a: 1, c: null, d: {} }

      expect(canonicalJsonStringify(withUndefined)).toBe(canonicalJsonStringify(withoutUndefined))
    })

    it('serializes Date instances into ISO strings deterministically', () => {
      const date = new Date('2026-10-31T12:00:00.000Z')
      const str = canonicalJsonStringify({ date })
      expect(str).toBe('{"date":"2026-10-31T12:00:00.000Z"}')
    })

    it('computes distinct SHA-256 hashes if a single bit/character in diff or metadata differs', () => {
      const payload1 = {
        id: 'rec-001',
        tenant_id: TENANT_1,
        actor_auth_user_id: 'user-001',
        action: 'role.created',
        resource_type: 'role',
        diff: { name: 'admin' },
        prev_record_hash: GENESIS_PREV_HASH,
        created_at: new Date('2026-10-31T10:00:00.000Z'),
      }

      const payload2 = {
        ...payload1,
        diff: { name: 'Admin' }, // Capital A
      }

      const hash1 = computeRecordHash(payload1)
      const hash2 = computeRecordHash(payload2)

      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
      expect(hash2).toMatch(/^[a-f0-9]{64}$/)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Challenge 2: Genesis Hash Validation & Tamper Surface', () => {
    it('correctly accepts recognized genesis representations and rejects invalid hashes', () => {
      expect(isGenesisHash(GENESIS_PREV_HASH)).toBe(true)
      expect(isGenesisHash('GENESIS')).toBe(true)
      expect(isGenesisHash('GENESIS_HASH_0000000000000000')).toBe(true)
      expect(isGenesisHash(null)).toBe(true)
      expect(isGenesisHash(undefined)).toBe(true)

      expect(isGenesisHash('0000000000000000000000000000000000000000000000000000000000000001')).toBe(false)
      expect(isGenesisHash('forged-hash')).toBe(false)
    })
  })

  describe('Challenge 3: Separation of Duties & Anti-Self-Approval in ApprovalWorkflowEngine', () => {
    let mockPrisma: any
    let engine: ApprovalWorkflowEngine

    beforeEach(() => {
      mockPrisma = {
        approval_rules: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        approval_requests: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          findUniqueOrThrow: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
          update: vi.fn(),
        },
      }
      engine = new ApprovalWorkflowEngine(mockPrisma as any)
    })

    it('strictly blocks approval when approverAuthUserId equals requested_by_user_id', async () => {
      const requestId = 'req-101'
      const userId = 'requester-user-aaa'

      mockPrisma.approval_requests.findFirst.mockResolvedValue({
        id: requestId,
        tenant_id: TENANT_1,
        module: 'discount',
        entity_type: 'discount_request',
        requested_by_user_id: userId,
        status: 'pending',
        requested_amount: 500,
        approval_rules: {
          enforce_separation_of_duties: true,
          approval_level: 'LEVEL_1',
        },
        metadata: {},
      })

      await expect(
        engine.review({
          tenantId: TENANT_1,
          requestId,
          approverAuthUserId: userId, // Same user attempting self-approval!
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)
    })

    it('strictly blocks approval when approverTenantUserId equals requested_by_user_id', async () => {
      const requestId = 'req-102'
      const tenantUserId = 'tu-requester-bbb'
      const authUserId = 'auth-different-id'

      mockPrisma.approval_requests.findFirst.mockResolvedValue({
        id: requestId,
        tenant_id: TENANT_1,
        module: 'stock_adjustment',
        entity_type: 'adjustment',
        requested_by_user_id: tenantUserId, // created with tenant_user_id
        status: 'pending',
        requested_amount: 1000,
        approval_rules: {
          enforce_separation_of_duties: true,
          approval_level: 'LEVEL_1',
        },
        metadata: {},
      })

      await expect(
        engine.review({
          tenantId: TENANT_1,
          requestId,
          approverAuthUserId: authUserId,
          approverTenantUserId: tenantUserId, // Matches requested_by_user_id
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)
    })

    it('prevents an approver from signing off on multiple tiers of the same request', async () => {
      const requestId = 'req-tier-1'
      const approverId = 'manager-tom'

      mockPrisma.approval_requests.findFirst.mockResolvedValue({
        id: requestId,
        tenant_id: TENANT_1,
        module: 'purchase_order',
        entity_type: 'order',
        requested_by_user_id: 'clerk-alice',
        status: 'pending',
        requested_amount: 50000,
        approval_rules: {
          enforce_separation_of_duties: true,
          approval_level: 'LEVEL_2',
        },
        metadata: {
          requiredLevels: ['LEVEL_1', 'LEVEL_2'],
          currentLevel: 'LEVEL_2',
          completedLevels: [
            {
              level: 'LEVEL_1',
              approvedBy: approverId, // Tom already approved Level 1
              approvedAt: new Date().toISOString(),
            },
          ],
        },
      })

      await expect(
        engine.review({
          tenantId: TENANT_1,
          requestId,
          approverAuthUserId: approverId, // Tom attempting to also approve Level 2
          decision: 'approve',
        })
      ).rejects.toThrow(AntiSelfApprovalError)
    })

    it('handles race conditions atomically: throws 409 Conflict if request was concurrently approved', async () => {
      const requestId = 'req-race-1'

      mockPrisma.approval_requests.findFirst.mockResolvedValue({
        id: requestId,
        tenant_id: TENANT_1,
        module: 'discount',
        entity_type: 'discount',
        requested_by_user_id: 'clerk-1',
        status: 'pending',
        requested_amount: 100,
        approval_rules: {
          enforce_separation_of_duties: false,
          approval_level: 'LEVEL_1',
        },
        metadata: {},
      })

      // Simulate concurrent update: database returned count = 0 because another process updated status first
      mockPrisma.approval_requests.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.approval_requests.findUnique.mockResolvedValue({
        id: requestId,
        status: 'approved',
      })

      await expect(
        engine.review({
          tenantId: TENANT_1,
          requestId,
          approverAuthUserId: 'manager-2',
          decision: 'approve',
        })
      ).rejects.toThrow(/already been processed/)
    })

    it('reports ineligibility in canUserApprove when self-approval or status is not pending', async () => {
      mockPrisma.approval_requests.findFirst.mockResolvedValue({
        id: 'req-check-1',
        tenant_id: TENANT_1,
        requested_by_user_id: 'user-self',
        status: 'pending',
        approval_rules: { enforce_separation_of_duties: true },
      })

      const res = await engine.canUserApprove(TENANT_1, 'req-check-1', 'user-self')
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('ANTI_SELF_APPROVAL_VIOLATION')
    })
  })

  describe('Challenge 4: State Machine Transitions (Document & Request)', () => {
    it('allows valid transitions: draft -> pending_approval -> approved -> cancelled', () => {
      expect(canTransitionDocument('draft', 'pending_approval')).toBe(true)
      expect(canTransitionDocument('pending_approval', 'approved')).toBe(true)
      expect(canTransitionDocument('approved', 'cancelled')).toBe(true)
    })

    it('rejects invalid transitions strictly', () => {
      expect(canTransitionDocument('approved', 'pending_approval')).toBe(false)
      expect(canTransitionDocument('approved', 'rejected')).toBe(false)
      expect(canTransitionDocument('cancelled', 'draft')).toBe(false)

      expect(() => {
        assertValidDocumentTransition('approved', 'draft', 'doc-123')
      }).toThrow(/Invalid document status transition for entity 'doc-123'/)
    })
  })

  describe('Challenge 5: withServerFnAuth Zero-Trust Context & Isolation', () => {
    it('throws 401 when no token or ambient session is supplied', async () => {
      const handler = vi.fn()
      const protectedFn = withServerFnAuth(
        { permissions: 'products.view' },
        handler
      )

      await expect(protectedFn(null as any)).rejects.toThrow(/Unauthorized/)
      expect(handler).not.toHaveBeenCalled()
    })

    it('rejects caller when permission requirement is unsatisfied', async () => {
      vi.spyOn(authUtils, 'requireAuth').mockResolvedValue({
        userId: 'user-cashier',
        tenantId: TENANT_1,
        tenantUserId: 'tu-cashier',
        roleNames: ['cashier'],
        roleIds: ['role-cashier'],
        permissionNames: ['pos.sales.create'],
        branchId: 'b-1',
        warehouseId: 'w-1',
        isSuperAdmin: false,
        isOwner: false,
      } as any)

      const handler = vi.fn()
      const protectedFn = withServerFnAuth(
        { permissions: 'admin.users.delete' },
        handler
      )

      await expect(
        protectedFn({ sessionToken: 'mock-valid-token' })
      ).rejects.toThrow(/Forbidden/)
      expect(handler).not.toHaveBeenCalled()
    })

    it('propagates tenant context and injects scopeFilter when authenticated and authorized', async () => {
      ;(prisma.tenant_user_branches.findMany as any).mockResolvedValue([{ branch_id: 'b-1' }])
      ;(prisma.tenant_user_warehouses.findMany as any).mockResolvedValue([{ warehouse_id: 'w-1' }])
      ;(prisma.roles.findMany as any).mockResolvedValue([{ data_scope: 'ASSIGNED_BRANCHES' }])

      vi.spyOn(authUtils, 'requireAuth').mockResolvedValue({
        userId: 'user-manager',
        tenantId: TENANT_1,
        tenantUserId: 'tu-manager',
        roleNames: ['manager'],
        roleIds: ['role-manager'],
        permissionNames: ['products.view'],
        branchId: 'b-1',
        warehouseId: 'w-1',
        isSuperAdmin: false,
        isOwner: false,
      } as any)

      let capturedContext: any = null
      let contextActiveDuringHandler = false

      const handler = vi.fn(async (_input, ctx) => {
        capturedContext = ctx
        contextActiveDuringHandler = tenantContext.getOptionalTenantContext()?.tenantId === TENANT_1
        return { success: true }
      })

      const protectedFn = withServerFnAuth(
        { permissions: 'products.view' },
        handler
      )

      const res = await protectedFn({
        sessionToken: 'mock-valid-token',
      })

      expect(res).toEqual({ success: true })
      expect(contextActiveDuringHandler).toBe(true)
      expect(capturedContext.tenantId).toBe(TENANT_1) // Protected: forces authorized tenant
      expect(typeof capturedContext.scopeFilter).toBe('function')
    })

    it('rejects cross-tenant injection when user attempts to access an unauthorized tenant', async () => {
      // Attacker is member of TENANT_1, but attempts to invoke server fn for TENANT_2
      vi.spyOn(authUtils, 'requireAuth').mockImplementation(async (_token, _perms, requestedTenantId) => {
        if (requestedTenantId === TENANT_2) {
          throw new Error('Forbidden: User account is inactive or blocked in this tenant')
        }
        return {
          userId: 'user-manager',
          tenantId: TENANT_1,
          tenantUserId: 'tu-manager',
          roleNames: ['manager'],
          roleIds: ['role-manager'],
          permissionNames: ['products.view'],
          branchId: 'b-1',
          warehouseId: 'w-1',
          isSuperAdmin: false,
          isOwner: false,
        } as any
      })

      const handler = vi.fn()
      const protectedFn = withServerFnAuth(
        { permissions: 'products.view' },
        handler
      )

      await expect(
        protectedFn({
          sessionToken: 'mock-valid-token',
          tenantId: TENANT_2, // Attacker injection
        })
      ).rejects.toThrow(/Forbidden/)
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
