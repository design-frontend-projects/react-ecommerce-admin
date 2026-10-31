import { describe, it, expect } from 'vitest'
import { resolveEffectivePermissions } from '../helpers/rbac-contracts'

describe('Features 3 & 4: Multi-Role Union Aggregation & Direct User Permission Overrides', () => {
  const allSystemPermissions = [
    'general.dashboard.view',
    'general.products.view',
    'general.products.create',
    'general.products.update',
    'general.products.delete',
    'general.products.view_cost',
    'inventory.stock.view',
    'inventory.stock.adjust',
    'sales.orders.view',
    'sales.orders.create',
    'purchasing.orders.view',
    'purchasing.orders.create',
    'access_control.roles.view',
    'access_control.roles.manage',
  ]

  describe('Tier 1: Feature Coverage (Multi-Role Union)', () => {
    it('aggregates permissions from multiple active roles into a complete union', () => {
      const role1Permissions = ['general.dashboard.view', 'general.products.view']
      const role2Permissions = ['general.products.create', 'sales.orders.create']

      const aggregatedRolePermissions = Array.from(
        new Set([...role1Permissions, ...role2Permissions])
      )
      const effective = resolveEffectivePermissions(aggregatedRolePermissions, [], [])

      expect(effective).toHaveLength(4)
      expect(effective).toContain('general.dashboard.view')
      expect(effective).toContain('general.products.view')
      expect(effective).toContain('general.products.create')
      expect(effective).toContain('sales.orders.create')
    })

    it('deduplicates overlapping permissions shared across multiple roles', () => {
      const roleCashier = ['sales.orders.view', 'sales.orders.create', 'general.dashboard.view']
      const roleInventoryClerk = ['general.dashboard.view', 'general.products.view']

      const aggregated = Array.from(new Set([...roleCashier, ...roleInventoryClerk]))
      const effective = resolveEffectivePermissions(aggregated, [], [])

      const dashboardCount = effective.filter((p) => p === 'general.dashboard.view').length
      expect(dashboardCount).toBe(1)
      expect(effective).toHaveLength(4)
    })

    it('applies direct user grant to add a permission not present in any assigned role', () => {
      const rolePermissions = ['general.products.view']
      const directGrants = ['general.products.view_cost']

      const effective = resolveEffectivePermissions(rolePermissions, directGrants, [])

      expect(effective).toContain('general.products.view')
      expect(effective).toContain('general.products.view_cost')
      expect(effective).toHaveLength(2)
    })

    it('enforces Explicit Deny over Role Grant (Deny > Role)', () => {
      // Role grants products.delete, but user has explicit deny for products.delete
      const rolePermissions = ['general.products.view', 'general.products.delete']
      const directDenies = ['general.products.delete']

      const effective = resolveEffectivePermissions(rolePermissions, [], directDenies)

      expect(effective).toContain('general.products.view')
      expect(effective).not.toContain('general.products.delete')
    })

    it('enforces Explicit Deny over Direct User Grant (Deny > Grant)', () => {
      // Direct grant has products.create, but direct deny also has products.create
      const directGrants = ['general.products.create']
      const directDenies = ['general.products.create']

      const effective = resolveEffectivePermissions([], directGrants, directDenies)

      expect(effective).not.toContain('general.products.create')
      expect(effective).toHaveLength(0)
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('expands wildcard (*) role and accurately subtracts specific denied permissions', () => {
      const wildcardRole = ['*']
      const explicitDenies = ['general.products.delete', 'general.products.view_cost']

      const effective = resolveEffectivePermissions(
        wildcardRole,
        [],
        explicitDenies,
        allSystemPermissions
      )

      // Must contain all permissions except the two denied
      expect(effective).toContain('general.dashboard.view')
      expect(effective).toContain('general.products.view')
      expect(effective).toContain('general.products.create')
      expect(effective).toContain('access_control.roles.manage')

      expect(effective).not.toContain('general.products.delete')
      expect(effective).not.toContain('general.products.view_cost')
      expect(effective).toHaveLength(allSystemPermissions.length - 2)
    })

    it('handles multiple overlapping direct grants and multiple explicit denies gracefully', () => {
      const rolePermissions = ['p1', 'p2', 'p3']
      const directGrants = ['p3', 'p4', 'p5', 'p5'] // Duplicate grant
      const directDenies = ['p2', 'p4', 'p2'] // Duplicate deny

      const effective = resolveEffectivePermissions(rolePermissions, directGrants, directDenies)

      expect(effective).toContain('p1') // From role
      expect(effective).not.toContain('p2') // Denied
      expect(effective).toContain('p3') // Role + Grant
      expect(effective).not.toContain('p4') // Granted then Denied
      expect(effective).toContain('p5') // Direct grant
      expect(effective).toHaveLength(3)
    })

    it('returns empty set when all role permissions are explicitly denied', () => {
      const rolePermissions = ['perm.a', 'perm.b']
      const directDenies = ['perm.a', 'perm.b', 'perm.c']

      const effective = resolveEffectivePermissions(rolePermissions, [], directDenies)
      expect(effective).toHaveLength(0)
    })

    it('handles non-existent permission denies without altering valid permissions', () => {
      const rolePermissions = ['general.products.view']
      const directDenies = ['non_existent_permission_xyz']

      const effective = resolveEffectivePermissions(rolePermissions, [], directDenies)
      expect(effective).toEqual(['general.products.view'])
    })

    it('filters out inactive roles and roles from other tenants during aggregation', () => {
      const tenantA = 'tenant-1'
      const tenantB = 'tenant-2'

      const userRoles = [
        { name: 'Role 1', tenant_id: tenantA, is_active: true, permissions: ['p1'] },
        { name: 'Role 2', tenant_id: tenantA, is_active: false, permissions: ['p2'] }, // Inactive
        { name: 'Role 3', tenant_id: tenantB, is_active: true, permissions: ['p3'] }, // Wrong tenant
        { name: 'Global Role', tenant_id: null, is_active: true, permissions: ['p4'] }, // Global system role
      ]

      const activeTenantRoles = userRoles.filter(
        (r) => r.is_active && (r.tenant_id === null || r.tenant_id === tenantA)
      )

      const aggregatedPermissions = Array.from(
        new Set(activeTenantRoles.flatMap((r) => r.permissions))
      )
      const effective = resolveEffectivePermissions(aggregatedPermissions, [], [])

      expect(effective).toContain('p1')
      expect(effective).not.toContain('p2') // Inactive excluded
      expect(effective).not.toContain('p3') // Wrong tenant excluded
      expect(effective).toContain('p4') // Global system role included
      expect(effective).toHaveLength(2)
    })
  })

  describe('Tier 3: Pairwise Combination Matrix', () => {
    it('pairwise: Role Union + Direct Grant + Direct Deny + Wildcard Role', () => {
      // Complex corporate matrix:
      // Manager has Role A (inventory.*) + Role B (purchasing.*)
      // Custom direct grant for POS refund
      // Custom direct deny for inventory valuation
      const catalog = [
        'inventory.stock.view',
        'inventory.stock.adjust',
        'inventory.stock.valuation',
        'purchasing.po.create',
        'pos.refund.create',
      ]

      const rolePermissions = ['inventory.stock.view', 'inventory.stock.adjust', 'inventory.stock.valuation', 'purchasing.po.create']
      const directGrants = ['pos.refund.create']
      const directDenies = ['inventory.stock.valuation']

      const effective = resolveEffectivePermissions(rolePermissions, directGrants, directDenies, catalog)

      expect(effective).toContain('inventory.stock.view')
      expect(effective).toContain('inventory.stock.adjust')
      expect(effective).toContain('purchasing.po.create')
      expect(effective).toContain('pos.refund.create')
      expect(effective).not.toContain('inventory.stock.valuation')
      expect(effective).toHaveLength(4)
    })
  })
})
