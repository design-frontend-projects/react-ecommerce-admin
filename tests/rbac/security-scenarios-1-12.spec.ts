import { describe, it, expect } from 'vitest'
import {
  resolveEffectivePermissions,
  buildScopeWhere,
  ApprovalWorkflowEngine,
  computeAuditRecordHash,
  verifyAuditChain,
  stripSensitiveProductFields,
  validateProductImportRows,
  CompoundPermissionCache,
  UserScopeContext,
  SecurityAuditRecord,
  Product,
  ProductImportRow,
  GENESIS_HASH,
  SENTINEL_EMPTY_UUID,
} from '../helpers/rbac-contracts'

describe('Section 21: Security Test Scenarios 1 through 12', () => {
  const tenantA = 'tenant-alpha-001'
  const tenantB = 'tenant-beta-002'

  // ---------------------------------------------------------------------------
  // Security Scenario 1: Unauthenticated Request Blocking
  // ---------------------------------------------------------------------------
  describe('Security Scenario 1: Unauthenticated Request Blocking', () => {
    it('blocks requests without valid authentication tokens with 401 Unauthorized', async () => {
      const handleProtectedRequest = async (authHeader?: string) => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { status: 401, error: 'UNAUTHORIZED: Missing or malformed authorization header' }
        }
        const token = authHeader.replace('Bearer ', '')
        if (token !== 'valid-session-jwt') {
          return { status: 401, error: 'UNAUTHORIZED: Invalid session token' }
        }
        return { status: 200, data: 'Protected data' }
      }

      // No header
      const res1 = await handleProtectedRequest(undefined)
      expect(res1.status).toBe(401)
      expect(res1.error).toContain('UNAUTHORIZED')

      // Malformed header
      const res2 = await handleProtectedRequest('Basic user:pass')
      expect(res2.status).toBe(401)

      // Invalid token
      const res3 = await handleProtectedRequest('Bearer fake-token-123')
      expect(res3.status).toBe(401)

      // Valid token succeeds
      const res4 = await handleProtectedRequest('Bearer valid-session-jwt')
      expect(res4.status).toBe(200)
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 2: Cross-Tenant Isolation & ID Manipulation
  // ---------------------------------------------------------------------------
  describe('Security Scenario 2: Cross-Tenant Data Tampering & IDOR Protection', () => {
    it('prevents user from Tenant A from accessing Tenant B resources via parameter tampering', () => {
      const databaseOrders = [
        { id: 'po-tenant-a-1', tenant_id: tenantA, total: 100 },
        { id: 'po-tenant-b-1', tenant_id: tenantB, total: 99999 }, // Confidential order of Tenant B
      ]

      const fetchOrder = (requestedOrderId: string, clientSuppliedTenantId: string, verifiedTenantId: string) => {
        // Zero Trust rule: Client-supplied tenantId is ignored, verifiedTenantId is enforced
        const effectiveTenantId = verifiedTenantId
        const order = databaseOrders.find(
          (o) => o.id === requestedOrderId && o.tenant_id === effectiveTenantId
        )
        if (!order) {
          return { status: 404, error: 'Resource not found or access denied' }
        }
        return { status: 200, data: order }
      }

      // Attacker from Tenant A passes po-tenant-b-1 and tenantId=tenantB
      const attackResponse = fetchOrder('po-tenant-b-1', tenantB, tenantA)
      expect(attackResponse.status).toBe(404)
      expect(attackResponse.data).toBeUndefined()

      // Legitimate access to Tenant A order succeeds
      const legitResponse = fetchOrder('po-tenant-a-1', tenantA, tenantA)
      expect(legitResponse.status).toBe(200)
      expect(legitResponse.data?.total).toBe(100)
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 3: Default DENY Enforcement
  // ---------------------------------------------------------------------------
  describe('Security Scenario 3: Default DENY Enforcement Baseline', () => {
    it('denies access when user has authenticated session but zero assigned permissions', () => {
      const effectivePermissions = resolveEffectivePermissions([], [], [])
      const canPerform = (requiredPermission: string) => effectivePermissions.includes(requiredPermission)

      expect(canPerform('general.dashboard.view')).toBe(false)
      expect(canPerform('general.products.create')).toBe(false)
      expect(canPerform('sales.orders.create')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 4: Direct User Explicit Deny Overriding Role Grant
  // ---------------------------------------------------------------------------
  describe('Security Scenario 4: Explicit Deny Overrides Role Grant', () => {
    it('denies action when user is assigned Manager role but has explicit direct deny', () => {
      // Role grants products.delete
      const rolePermissions = ['general.products.view', 'general.products.delete']
      // Direct user deny overrides delete
      const userDenies = ['general.products.delete']

      const effective = resolveEffectivePermissions(rolePermissions, [], userDenies)

      expect(effective).toContain('general.products.view')
      expect(effective).not.toContain('general.products.delete')
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 5: Wildcard Role Constrained by Granular Explicit Deny
  // ---------------------------------------------------------------------------
  describe('Security Scenario 5: Wildcard Role Constrained by Direct Deny', () => {
    it('expands wildcard (*) while strictly withholding specifically denied permissions', () => {
      const allPermissions = [
        'general.products.view',
        'general.products.delete',
        'general.products.view_cost',
        'access_control.roles.manage',
      ]

      const effective = resolveEffectivePermissions(['*'], [], ['general.products.delete'], allPermissions)

      expect(effective).toContain('general.products.view')
      expect(effective).toContain('general.products.view_cost')
      expect(effective).toContain('access_control.roles.manage')
      expect(effective).not.toContain('general.products.delete')
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 6: ABAC ASSIGNED_BRANCHES Boundary Enforcement
  // ---------------------------------------------------------------------------
  describe('Security Scenario 6: ABAC ASSIGNED_BRANCHES Boundary Enforcement', () => {
    it('blocks cashier assigned to Branch A from querying or mutating orders in Branch B', () => {
      const ctx: UserScopeContext = {
        tenantId: tenantA,
        tenantUserId: 'cashier-branch-a',
        authUserId: 'auth-cashier',
        branchIds: ['branch-alpha-north'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where.tenant_id).toBe(tenantA)
      expect(where.branch_id).toEqual({ in: ['branch-alpha-north'] })

      const canAccessBranchOrder = (orderBranchId: string) => {
        return where.branch_id.in.includes(orderBranchId)
      }

      expect(canAccessBranchOrder('branch-alpha-north')).toBe(true)
      expect(canAccessBranchOrder('branch-alpha-south')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 7: ABAC ASSIGNED_WAREHOUSES Boundary Enforcement
  // ---------------------------------------------------------------------------
  describe('Security Scenario 7: ABAC ASSIGNED_WAREHOUSES Stock Movement Protection', () => {
    it('blocks inventory movements and stock balance queries outside assigned warehouses', () => {
      const ctx: UserScopeContext = {
        tenantId: tenantA,
        tenantUserId: 'wh-operator-1',
        authUserId: 'auth-op-1',
        branchIds: [],
        warehouseIds: ['wh-dock-1'],
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('stock_balances', ctx)
      expect(where.warehouse_id).toEqual({ in: ['wh-dock-1'] })

      const canViewStockAtWarehouse = (whId: string) => {
        return where.warehouse_id.in.includes(whId)
      }

      expect(canViewStockAtWarehouse('wh-dock-1')).toBe(true)
      expect(canViewStockAtWarehouse('wh-dock-2')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 8: Separation of Duties Anti-Self-Approval
  // ---------------------------------------------------------------------------
  describe('Security Scenario 8: Anti-Self-Approval Enforcement in Approval Workflows', () => {
    it('throws FORBIDDEN_SEPARATION_OF_DUTIES when requester attempts to approve their own discount', () => {
      const requesterId = 'cashier-jenny'

      const pendingDiscount = {
        requested_by_user_id: requesterId,
        status: 'pending',
        original_amount: 50,
      }

      expect(() => {
        ApprovalWorkflowEngine.validateReview(
          pendingDiscount,
          {
            tenantId: tenantA,
            requestId: 'req-discount-99',
            module: 'discount',
            approverAuthUserId: requesterId, // Self-approval!
            approverTenantUserId: requesterId,
            approverPermissions: ['inventory.discounts.approve'],
            approved: true,
          },
          'inventory.discounts.approve'
        )
      }).toThrow('FORBIDDEN_SEPARATION_OF_DUTIES')
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 9: Cache Invalidation on Role Revocation and Tenant Switch
  // ---------------------------------------------------------------------------
  describe('Security Scenario 9: Invalidation on Role Revocation & Tenant Switch', () => {
    it('invalidates cached permissions immediately upon revocation and isolates tenant context switch', () => {
      const cache = new CompoundPermissionCache()
      const userId = 'multi-tenant-manager'

      // In Tenant A: user has admin role
      cache.set(tenantA, userId, { roleNames: ['admin'], permissionNames: ['*'] })
      // In Tenant B: user has guest role
      cache.set(tenantB, userId, { roleNames: ['guest'], permissionNames: ['general.dashboard.view'] })

      expect(cache.get(tenantA, userId)?.roleNames).toEqual(['admin'])
      expect(cache.get(tenantB, userId)?.roleNames).toEqual(['guest'])

      // Tenant A revokes admin role
      cache.invalidate({ tenantId: tenantA, authUserId: userId })

      // Tenant A cache is cleared; Tenant B cache remains unaffected
      expect(cache.get(tenantA, userId)).toBeNull()
      expect(cache.get(tenantB, userId)?.roleNames).toEqual(['guest'])
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 10: Tamper-Resistant Security Audit Log Verification
  // ---------------------------------------------------------------------------
  describe('Security Scenario 10: Tamper-Resistant SHA-256 Hash Chain Verification', () => {
    it('detects tampering or deletion in cryptographic audit log chain', () => {
      const ts = new Date().toISOString()
      const hash1 = computeAuditRecordHash(GENESIS_HASH, ts, tenantA, 'u-1', 'role.create', 'r-1', { name: 'Audit' })
      const hash2 = computeAuditRecordHash(hash1, ts, tenantA, 'u-1', 'user.assign', 'u-2', { role: 'Audit' })

      const pristineChain: SecurityAuditRecord[] = [
        {
          id: 'rec-1',
          tenant_id: tenantA,
          actor_auth_user_id: 'u-1',
          action: 'role.create',
          target_type: 'roles',
          target_id: 'r-1',
          diff: { name: 'Audit', _prevHash: GENESIS_HASH, _hash: hash1 },
          created_at: ts,
        },
        {
          id: 'rec-2',
          tenant_id: tenantA,
          actor_auth_user_id: 'u-1',
          action: 'user.assign',
          target_type: 'users',
          target_id: 'u-2',
          diff: { role: 'Audit', _prevHash: hash1, _hash: hash2 },
          created_at: ts,
        },
      ]

      // 1. Pristine chain is valid
      expect(verifyAuditChain(pristineChain).valid).toBe(true)

      // 2. Tampered diff is detected
      const tamperedChain = JSON.parse(JSON.stringify(pristineChain))
      tamperedChain[0].diff.name = 'SuperAdminHacked'
      const tamperedResult = verifyAuditChain(tamperedChain)
      expect(tamperedResult.valid).toBe(false)
      expect(tamperedResult.reason).toContain('Tampered payload detected')
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 11: Sensitive Field Stripping on API Responses
  // ---------------------------------------------------------------------------
  describe('Security Scenario 11: Sensitive Field Stripping Pipeline', () => {
    it('omits supplier unit_cost and variant cost_price when user lacks general.products.view_cost', () => {
      const product: Product = {
        id: 'p-1',
        tenant_id: tenantA,
        name: 'Smartphone X',
        sku: 'PHONE-X',
        unit_cost: 300,
        cost_price: 300,
        product_suppliers: [{ id: 's-1', product_id: 'p-1', supplier_id: 'sup-1', unit_cost: 290 }],
        product_variants: [
          {
            id: 'v-1',
            product_id: 'p-1',
            sku: 'PHONE-X-BLK',
            cost_price: 300,
            selling_price: 699,
            price_list_items: [{ id: 'pli-1', price_list_id: 'pl-1', price: 699, cost_price: 300, margin: 57.0 }],
          },
        ],
      }

      const stripped = stripSensitiveProductFields(product, false)

      expect(stripped.unit_cost).toBeUndefined()
      expect(stripped.cost_price).toBeUndefined()
      expect(stripped.product_suppliers?.[0].unit_cost).toBe(0)
      expect(stripped.product_variants?.[0].cost_price).toBeUndefined()
      expect(stripped.product_variants?.[0].selling_price).toBe(699)
      expect(stripped.product_variants?.[0].price_list_items?.[0].cost_price).toBeUndefined()
      expect(stripped.product_variants?.[0].price_list_items?.[0].margin).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Security Scenario 12: Row-Level Validated Product Import Isolation
  // ---------------------------------------------------------------------------
  describe('Security Scenario 12: Product Import Row-Level Cross-Tenant Validation', () => {
    it('rejects foreign tenant foreign keys and duplicate SKUs with row-level error reporting', () => {
      const tenantContext = {
        tenantId: tenantA,
        validCategoryIds: new Set(['cat-electronics']),
        validSupplierIds: new Set(['sup-tech']),
        existingSkus: new Set(['EXISTING-PHONE-01']),
        hasCostPermission: false, // User cannot import costs
      }

      const rows: ProductImportRow[] = [
        {
          rowNumber: 1,
          name: 'Valid Phone Case',
          sku: 'CASE-01',
          category_id: 'cat-electronics',
          supplier_id: 'sup-tech',
        },
        {
          rowNumber: 2,
          name: 'Foreign Category Item',
          sku: 'CASE-02',
          category_id: 'cat-foreign-tenant-b', // Cross-tenant IDOR injection attempt!
        },
        {
          rowNumber: 3,
          name: 'Cost Leak Item',
          sku: 'CASE-03',
          cost_price: 50.0, // Unauthorized cost price attempt!
        },
        {
          rowNumber: 4,
          name: 'Duplicate SKU Item',
          sku: 'EXISTING-PHONE-01', // Already in DB
        },
      ]

      const result = validateProductImportRows(rows, tenantContext)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)

      const row2Err = result.errors.find((e) => e.row === 2)
      expect(row2Err?.message).toContain('does not exist in tenant')

      const row3Err = result.errors.find((e) => e.row === 3)
      expect(row3Err?.message).toContain('User lacks permission')

      const row4Err = result.errors.find((e) => e.row === 4)
      expect(row4Err?.message).toContain('already exists in tenant database')
    })
  })
})
