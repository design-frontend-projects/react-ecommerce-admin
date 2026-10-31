import React, { ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Interface model for Dynamic Sidebar Navigation per PROJECT.md interface contract
interface NavItem {
  title: string
  url: string
  permission?: string
  roles?: string[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function filterNavGroupsForUser(
  groups: NavGroup[],
  userPermissions: string[],
  userRoles: string[],
  isSuperAdmin: boolean = false
): NavGroup[] {
  if (isSuperAdmin || userPermissions.includes('*')) {
    return groups
  }

  const result: NavGroup[] = []

  for (const group of groups) {
    const authorizedItems = group.items.filter((item) => {
      // FAIL-CLOSED: If no permission or roles defined, default to DENY
      if (!item.permission && (!item.roles || item.roles.length === 0)) {
        return false // Block unmapped items
      }

      // Check permission
      if (item.permission && userPermissions.includes(item.permission)) {
        return true
      }

      // Check role
      if (item.roles && item.roles.some((r) => userRoles.includes(r))) {
        return true
      }

      return false
    })

    // OMIT EMPTY MODULES: Only include group if it has at least 1 authorized screen
    if (authorizedItems.length > 0) {
      result.push({
        ...group,
        items: authorizedItems,
      })
    }
  }

  return result
}

// Layout Screen Guard Model (RequireScreen) per PROJECT.md contract
interface RequireScreenProps {
  currentPath: string
  routePermissionsMap: Record<string, string>
  userPermissions: string[]
  isSuperAdmin?: boolean
  children: ReactNode
}

function RequireScreen({
  currentPath,
  routePermissionsMap,
  userPermissions,
  isSuperAdmin = false,
  children,
}: RequireScreenProps) {
  // Fail-closed default: if screen is mapped, user must have required permission
  const requiredPermission = routePermissionsMap[currentPath]

  if (isSuperAdmin || userPermissions.includes('*')) {
    return <>{children}</>
  }

  // If route is mapped and user lacks permission -> 403 Forbidden
  if (requiredPermission && !userPermissions.includes(requiredPermission)) {
    return (
      <div data-testid="forbidden-error">
        <h1>403 Forbidden</h1>
        <p>Access denied to screen: {currentPath}</p>
      </div>
    )
  }

  // If route is unmapped, fail-closed
  if (!requiredPermission) {
    return (
      <div data-testid="forbidden-error">
        <h1>403 Forbidden</h1>
        <p>Unmapped screen defaults to DENY</p>
      </div>
    )
  }

  return <>{children}</>
}

describe('Feature 12: Dynamic Navigation Filtering & Direct Route Blocking', () => {
  const fullNavigationCatalog: NavGroup[] = [
    {
      title: 'General',
      items: [
        { title: 'Dashboard', url: '/dashboard', permission: 'general.dashboard.view' },
        { title: 'Products', url: '/products', permission: 'general.products.view' },
      ],
    },
    {
      title: 'Purchasing',
      items: [
        { title: 'Purchase Orders', url: '/purchase-orders', permission: 'purchasing.orders.view' },
        { title: 'Requisitions', url: '/purchase-requisitions', permission: 'purchasing.requisitions.view' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { title: 'Users', url: '/users', permission: 'access_control.users.view' },
        { title: 'Roles', url: '/roles', permission: 'access_control.roles.view' },
      ],
    },
    {
      title: 'Unconfigured Module',
      items: [
        { title: 'Mystery Screen', url: '/mystery' }, // No permission defined!
      ],
    },
  ]

  const routePermissionsMap: Record<string, string> = {
    '/dashboard': 'general.dashboard.view',
    '/products': 'general.products.view',
    '/purchase-orders': 'purchasing.orders.view',
    '/purchase-requisitions': 'purchasing.requisitions.view',
    '/users': 'access_control.users.view',
    '/roles': 'access_control.roles.view',
  }

  describe('Tier 1: Feature Coverage (Sidebar Filtering & Route Guard)', () => {
    it('filters out unauthorized screens and removes completely empty modules', () => {
      // User only has permissions for Products
      const userPermissions = ['general.products.view']
      const filtered = filterNavGroupsForUser(fullNavigationCatalog, userPermissions, [])

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('General')
      expect(filtered[0].items).toHaveLength(1)
      expect(filtered[0].items[0].title).toBe('Products')

      // Purchasing and Administration modules are completely omitted
      expect(filtered.some((g) => g.title === 'Purchasing')).toBe(false)
      expect(filtered.some((g) => g.title === 'Administration')).toBe(false)
    })

    it('enforces fail-closed: items without permissions or roles are omitted from sidebar', () => {
      const userPermissions = ['general.dashboard.view']
      const filtered = filterNavGroupsForUser(fullNavigationCatalog, userPermissions, [])

      expect(filtered.some((g) => g.title === 'Unconfigured Module')).toBe(false)
    })

    it('renders child screen when user has required permission in <RequireScreen>', () => {
      render(
        <RequireScreen
          currentPath="/products"
          routePermissionsMap={routePermissionsMap}
          userPermissions={['general.products.view']}
        >
          <div data-testid="products-screen">Product Management Catalog</div>
        </RequireScreen>
      )

      expect(screen.getByTestId('products-screen')).toBeInTheDocument()
      expect(screen.queryByTestId('forbidden-error')).not.toBeInTheDocument()
    })

    it('renders 403 Forbidden when user attempts direct URL navigation to unauthorized route', () => {
      render(
        <RequireScreen
          currentPath="/roles"
          routePermissionsMap={routePermissionsMap}
          userPermissions={['general.products.view']} // Lacks access_control.roles.view
        >
          <div data-testid="roles-screen">Roles Management</div>
        </RequireScreen>
      )

      expect(screen.queryByTestId('roles-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('forbidden-error')).toBeInTheDocument()
      expect(screen.getByText(/403 Forbidden/)).toBeInTheDocument()
      expect(screen.getByText(/Access denied to screen: \/roles/)).toBeInTheDocument()
    })

    it('allows SuperAdmin to view all navigation groups and access all routes', () => {
      const filtered = filterNavGroupsForUser(fullNavigationCatalog, ['*'], [], true)
      expect(filtered).toHaveLength(fullNavigationCatalog.length)

      render(
        <RequireScreen
          currentPath="/roles"
          routePermissionsMap={routePermissionsMap}
          userPermissions={['*']}
          isSuperAdmin={true}
        >
          <div data-testid="roles-screen-admin">Roles Management Admin</div>
        </RequireScreen>
      )

      expect(screen.getByTestId('roles-screen-admin')).toBeInTheDocument()
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('blocks access to unmapped routes by default (fail-closed)', () => {
      render(
        <RequireScreen
          currentPath="/unmapped-internal-tool"
          routePermissionsMap={routePermissionsMap}
          userPermissions={['general.products.view']}
        >
          <div>Secret Tool</div>
        </RequireScreen>
      )

      expect(screen.getByTestId('forbidden-error')).toBeInTheDocument()
      expect(screen.getByText(/Unmapped screen defaults to DENY/)).toBeInTheDocument()
    })

    it('returns empty array when user has empty permissions and empty roles', () => {
      const filtered = filterNavGroupsForUser(fullNavigationCatalog, [], [])
      expect(filtered).toHaveLength(0)
    })
  })
})
