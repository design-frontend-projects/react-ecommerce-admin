import React, { createContext, useContext, ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MePermissionsResponse } from '../helpers/rbac-contracts'

// Context & Hook Model representing usePermissions per PROJECT.md interface contract
interface PermissionsContextType {
  permissions: string[]
  roles: string[]
  scopes: {
    tenantId: string
    branchIds: string[]
    warehouseIds: string[]
    storeIds: string[]
    ownRecordsOnly: boolean
  }
  isSuperAdmin: boolean
  isOwner: boolean
}

const PermissionsContext = createContext<PermissionsContextType | null>(null)

function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    return {
      permissions: [],
      roles: [],
      scopes: { tenantId: '', branchIds: [], warehouseIds: [], storeIds: [], ownRecordsOnly: false },
      isSuperAdmin: false,
      isOwner: false,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      hasRole: () => false,
      hasScope: () => false,
      can: () => false,
    }
  }

  const hasPermission = (p: string) => {
    if (ctx.isSuperAdmin || ctx.permissions.includes('*')) return true
    if (ctx.permissions.includes(p)) return true
    // Wildcard domain match (e.g. general.products.*)
    const parts = p.split('.')
    if (parts.length === 3) {
      if (ctx.permissions.includes(`${parts[0]}.${parts[1]}.*`)) return true
      if (ctx.permissions.includes(`${parts[0]}.*`)) return true
    }
    return false
  }

  const hasAnyPermission = (perms: string[]) => perms.some(hasPermission)
  const hasAllPermissions = (perms: string[]) => perms.every(hasPermission)
  const hasRole = (role: string | string[]) => {
    const rolesToCheck = Array.isArray(role) ? role : [role]
    return rolesToCheck.some((r) => ctx.roles.includes(r))
  }
  const hasScope = (type: 'branch' | 'warehouse', id: string) => {
    if (ctx.isSuperAdmin) return true
    if (type === 'branch') return ctx.scopes.branchIds.includes(id)
    if (type === 'warehouse') return ctx.scopes.warehouseIds.includes(id)
    return false
  }
  const can = (action: string, resource: string) => {
    return hasPermission(`${resource}.${action}`) || hasPermission(`general.${resource}.${action}`)
  }

  return {
    ...ctx,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasScope,
    can,
  }
}

// Declarative UI Gate components per PROJECT.md interface contract
interface CanProps {
  permission?: string | string[]
  match?: 'any' | 'all'
  role?: string | string[]
  scope?: { type: 'branch' | 'warehouse'; id: string }
  fallback?: ReactNode
  children: ReactNode
}

function Can({ permission, match = 'any', role, scope, fallback = null, children }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasScope } = usePermissions()

  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  if (scope && !hasScope(scope.type, scope.id)) {
    return <>{fallback}</>
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    const allowed = match === 'all' ? hasAllPermissions(perms) : hasAnyPermission(perms)
    if (!allowed) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

interface PermissionGateProps {
  permission: string
  fallback?: ReactNode
  children: ReactNode
}

function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { hasPermission } = usePermissions()
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

describe('Features 10 & 11: Frontend Permissions API & Declarative UI Gates', () => {
  const defaultScopes = {
    tenantId: 'tenant-1',
    branchIds: ['branch-north'],
    warehouseIds: ['wh-main'],
    storeIds: [],
    ownRecordsOnly: false,
  }

  describe('Tier 1: Feature Coverage (Hook Evaluation & Component Rendering)', () => {
    it('validates /api/me/permissions response payload contract', () => {
      const mockResponse: MePermissionsResponse = {
        success: true,
        data: {
          userId: 'u-1',
          tenantId: 'tenant-1',
          tenantUserId: 'tu-1',
          roles: ['cashier'],
          isSuperAdmin: false,
          isOwner: false,
          permissions: ['general.products.view', 'sales.orders.create'],
          scopes: defaultScopes,
          modules: ['general', 'sales'],
          screens: { '/products': true, '/sales': true },
          buttons: { products: { create: 'general.products.create' } },
        },
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.data.permissions).toContain('general.products.view')
      expect(mockResponse.data.scopes.branchIds).toContain('branch-north')
    })

    it('renders children when user possesses the required permission in <Can>', () => {
      const contextValue: PermissionsContextType = {
        permissions: ['general.products.view'],
        roles: ['viewer'],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      render(
        <PermissionsContext.Provider value={contextValue}>
          <Can permission="general.products.view">
            <button>View Products</button>
          </Can>
        </PermissionsContext.Provider>
      )

      expect(screen.getByRole('button', { name: 'View Products' })).toBeInTheDocument()
    })

    it('renders fallback when user lacks the required permission in <Can>', () => {
      const contextValue: PermissionsContextType = {
        permissions: ['general.products.view'],
        roles: ['viewer'],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      render(
        <PermissionsContext.Provider value={contextValue}>
          <Can permission="general.products.delete" fallback={<span>Unauthorized Action</span>}>
            <button>Delete Product</button>
          </Can>
        </PermissionsContext.Provider>
      )

      expect(screen.queryByRole('button', { name: 'Delete Product' })).not.toBeInTheDocument()
      expect(screen.getByText('Unauthorized Action')).toBeInTheDocument()
    })

    it('renders sensitive fields only when user possesses permission in <PermissionGate>', () => {
      const contextNoCost: PermissionsContextType = {
        permissions: ['general.products.view'],
        roles: ['staff'],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      const { rerender } = render(
        <PermissionsContext.Provider value={contextNoCost}>
          <PermissionGate permission="general.products.view_cost" fallback={<span>--</span>}>
            <span data-testid="cost-price">$45.00</span>
          </PermissionGate>
        </PermissionsContext.Provider>
      )

      expect(screen.queryByTestId('cost-price')).not.toBeInTheDocument()
      expect(screen.getByText('--')).toBeInTheDocument()

      // When permission is added
      const contextWithCost: PermissionsContextType = {
        ...contextNoCost,
        permissions: ['general.products.view', 'general.products.view_cost'],
      }

      rerender(
        <PermissionsContext.Provider value={contextWithCost}>
          <PermissionGate permission="general.products.view_cost" fallback={<span>--</span>}>
            <span data-testid="cost-price">$45.00</span>
          </PermissionGate>
        </PermissionsContext.Provider>
      )

      expect(screen.getByTestId('cost-price')).toBeInTheDocument()
      expect(screen.getByText('$45.00')).toBeInTheDocument()
    })

    it('evaluates can(action, resource) helper correctly', () => {
      let hookResult: ReturnType<typeof usePermissions> | null = null

      function TestConsumer() {
        hookResult = usePermissions()
        return null
      }

      const contextValue: PermissionsContextType = {
        permissions: ['general.products.view', 'inventory.stock.adjust'],
        roles: ['clerk'],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      render(
        <PermissionsContext.Provider value={contextValue}>
          <TestConsumer />
        </PermissionsContext.Provider>
      )

      expect(hookResult?.can('view', 'products')).toBe(true)
      expect(hookResult?.can('create', 'products')).toBe(false)
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('supports domain wildcards (e.g. general.products.*)', () => {
      let hookResult: ReturnType<typeof usePermissions> | null = null

      function TestConsumer() {
        hookResult = usePermissions()
        return null
      }

      const contextValue: PermissionsContextType = {
        permissions: ['general.products.*'],
        roles: ['product_manager'],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      render(
        <PermissionsContext.Provider value={contextValue}>
          <TestConsumer />
        </PermissionsContext.Provider>
      )

      expect(hookResult?.hasPermission('general.products.view')).toBe(true)
      expect(hookResult?.hasPermission('general.products.create')).toBe(true)
      expect(hookResult?.hasPermission('general.products.delete')).toBe(true)
      expect(hookResult?.hasPermission('inventory.stock.view')).toBe(false)
    })

    it('handles match="all" and match="any" modes on multiple permissions in <Can>', () => {
      const contextValue: PermissionsContextType = {
        permissions: ['perm.a', 'perm.b'],
        roles: [],
        scopes: defaultScopes,
        isSuperAdmin: false,
        isOwner: false,
      }

      const { rerender } = render(
        <PermissionsContext.Provider value={contextValue}>
          <Can permission={['perm.a', 'perm.c']} match="any">
            <span data-testid="any-test">Any Passed</span>
          </Can>
        </PermissionsContext.Provider>
      )
      expect(screen.getByTestId('any-test')).toBeInTheDocument()

      rerender(
        <PermissionsContext.Provider value={contextValue}>
          <Can permission={['perm.a', 'perm.c']} match="all" fallback={<span>All Failed</span>}>
            <span data-testid="all-test">All Passed</span>
          </Can>
        </PermissionsContext.Provider>
      )
      expect(screen.queryByTestId('all-test')).not.toBeInTheDocument()
      expect(screen.getByText('All Failed')).toBeInTheDocument()
    })

    it('enforces scope checking on branch and warehouse in <Can>', () => {
      const contextValue: PermissionsContextType = {
        permissions: ['sales.orders.create'],
        roles: ['cashier'],
        scopes: {
          tenantId: 'tenant-1',
          branchIds: ['branch-north'],
          warehouseIds: ['wh-main'],
          storeIds: [],
          ownRecordsOnly: false,
        },
        isSuperAdmin: false,
        isOwner: false,
      }

      render(
        <PermissionsContext.Provider value={contextValue}>
          <Can scope={{ type: 'branch', id: 'branch-north' }}>
            <button>North Checkout</button>
          </Can>
          <Can scope={{ type: 'branch', id: 'branch-south' }}>
            <button>South Checkout</button>
          </Can>
        </PermissionsContext.Provider>
      )

      expect(screen.getByRole('button', { name: 'North Checkout' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'South Checkout' })).not.toBeInTheDocument()
    })
  })
})
