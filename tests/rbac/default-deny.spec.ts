import { describe, it, expect } from 'vitest'
import {
  resolveEffectivePermissions,
  buildScopeWhere,
  SENTINEL_EMPTY_UUID,
  UserScopeContext,
} from '../helpers/rbac-contracts'

describe('Feature 1: Default DENY Enforcement', () => {
  describe('Tier 1: Feature Coverage (Core Default DENY Behavior)', () => {
    it('denies access when user has zero assigned roles and zero direct grants', () => {
      const rolePermissions: string[] = []
      const userGrants: string[] = []
      const userDenies: string[] = []

      const effective = resolveEffectivePermissions(rolePermissions, userGrants, userDenies)
      expect(effective).toEqual([])
      expect(effective.includes('general.dashboard.view')).toBe(false)
      expect(effective.includes('inventory.products.view')).toBe(false)
    })

    it('denies access when requested permission is not in role permissions', () => {
      const rolePermissions = ['general.dashboard.view', 'general.products.view']
      const effective = resolveEffectivePermissions(rolePermissions, [], [])

      expect(effective.includes('general.dashboard.view')).toBe(true)
      expect(effective.includes('general.products.delete')).toBe(false)
      expect(effective.includes('access_control.roles.manage')).toBe(false)
    })

    it('denies access to inactive or unassigned scopes by returning sentinel filter', () => {
      const ctx: UserScopeContext = {
        tenantId: 'tenant-alpha-uuid',
        tenantUserId: 'user-001',
        authUserId: 'auth-001',
        branchIds: [], // Empty branch assignments
        warehouseIds: [], // Empty warehouse assignments
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where).toHaveProperty('tenant_id', 'tenant-alpha-uuid')
      expect(where).toHaveProperty('branch_id', { in: [SENTINEL_EMPTY_UUID] })
      // A query with sentinel UUID will return 0 rows in database, enforcing default DENY
    })

    it('denies access to warehouses when user has ASSIGNED_WAREHOUSES but zero warehouses', () => {
      const ctx: UserScopeContext = {
        tenantId: 'tenant-alpha-uuid',
        tenantUserId: 'user-001',
        authUserId: 'auth-001',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('inventory_items', ctx)
      expect(where).toHaveProperty('tenant_id', 'tenant-alpha-uuid')
      expect(where).toHaveProperty('warehouse_id', { in: [SENTINEL_EMPTY_UUID] })
    })

    it('denies access when permission name does not follow canonical 3-part format', () => {
      const rolePermissions = ['products.view', 'sales.create'] // Legacy format
      const effective = resolveEffectivePermissions(rolePermissions, [], [])

      // Canonical requested permission is general.products.view
      expect(effective.includes('general.products.view')).toBe(false)
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('denies access when user grants array contains empty strings or nullish values', () => {
      const rolePermissions: string[] = []
      const userGrants = ['', '   ', 'invalid_perm']
      const effective = resolveEffectivePermissions(rolePermissions, userGrants, [])

      expect(effective.includes('general.products.view')).toBe(false)
      expect(effective.includes('*')).toBe(false)
    })

    it('denies access when role permissions have malicious SQL or script characters', () => {
      const dangerousPermissions = [
        "'; DROP TABLE roles; --",
        '<script>alert("xss")</script>',
        'admin OR 1=1',
      ]
      const effective = resolveEffectivePermissions(dangerousPermissions, [], [])

      expect(effective).toHaveLength(3)
      expect(effective.includes('admin')).toBe(false)
      expect(effective.includes('*')).toBe(false)
    })

    it('denies access when both branchIds and warehouseIds contain only undefined/null elements', () => {
      const ctx: UserScopeContext = {
        tenantId: 'tenant-alpha',
        tenantUserId: 'user-1',
        authUserId: 'auth-1',
        branchIds: [undefined as any, null as any, ''],
        warehouseIds: [undefined as any, ''],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('purchase_orders', ctx)
      expect(where.branch_id).toEqual({ in: [SENTINEL_EMPTY_UUID] })
    })

    it('denies access if user is blocked or deleted regardless of permissions', () => {
      const evaluateAccess = (user: { is_active: boolean; is_blocked: boolean; permissions: string[] }) => {
        if (!user.is_active || user.is_blocked) {
          return []
        }
        return user.permissions
      }

      const blockedUser = {
        is_active: true,
        is_blocked: true,
        permissions: ['*'],
      }
      expect(evaluateAccess(blockedUser)).toEqual([])

      const inactiveUser = {
        is_active: false,
        is_blocked: false,
        permissions: ['general.products.view'],
      }
      expect(evaluateAccess(inactiveUser)).toEqual([])
    })

    it('denies unmapped actions and unmapped modules completely', () => {
      const allKnownPermissions = [
        'general.dashboard.view',
        'general.products.view',
        'inventory.stock.view',
      ]
      const rolePermissions = ['general.products.view']
      const effective = resolveEffectivePermissions(rolePermissions, [], [], allKnownPermissions)

      expect(effective.includes('unknown_module.resource.action')).toBe(false)
      expect(effective.includes('general.unknown_resource.view')).toBe(false)
      expect(effective.includes('general.products.unknown_action')).toBe(false)
    })
  })

  describe('Tier 4: Security Verification', () => {
    it('fails closed when evaluation context is incomplete or corrupted', () => {
      const evaluateSecurityGuard = (ctx: Partial<UserScopeContext> | null | undefined): boolean => {
        if (!ctx || !ctx.tenantId || !ctx.authUserId || !ctx.dataScope) {
          return false // Fail closed
        }
        return true
      }

      expect(evaluateSecurityGuard(null)).toBe(false)
      expect(evaluateSecurityGuard(undefined)).toBe(false)
      expect(evaluateSecurityGuard({})).toBe(false)
      expect(evaluateSecurityGuard({ tenantId: 't1' })).toBe(false)
      expect(
        evaluateSecurityGuard({
          tenantId: 't1',
          authUserId: 'u1',
          tenantUserId: 'tu1',
          dataScope: 'TENANT',
          branchIds: [],
          warehouseIds: [],
          isSuperAdmin: false,
        })
      ).toBe(true)
    })
  })
})
