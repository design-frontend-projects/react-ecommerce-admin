import { describe, it, expect } from 'vitest'
import { resolveScreenAccess } from '@/components/rbac/require-screen'
import { buildNavGroupsFromNavigation } from '@/components/layout/data/db-sidebar'
import {
  MODULE_SEEDS,
  SCREEN_SEEDS,
} from '@/features/access-control/data/seed-data'
import { BASE_PERMISSION_DEFINITIONS } from '@/features/users/data/rbac'

// ---------------------------------------------------------------------------
// Phase 3 — DB-driven navigation: route guard matching, payload mapping, and
// screens-catalog seed consistency.
// ---------------------------------------------------------------------------

describe('resolveScreenAccess (require-screen.tsx)', () => {
  const screens = {
    '/': true,
    '/products': true,
    '/users': false,
    '/inventory/stock-transfers': false,
  }

  it('returns the exact match verdict', () => {
    expect(resolveScreenAccess(screens, '/products')).toBe(true)
    expect(resolveScreenAccess(screens, '/users')).toBe(false)
  })

  it('matches sub-paths by longest prefix at a path boundary', () => {
    expect(resolveScreenAccess(screens, '/products/123/edit')).toBe(true)
    expect(resolveScreenAccess(screens, '/inventory/stock-transfers/42')).toBe(
      false
    )
  })

  it('does not treat the root route as a prefix for everything', () => {
    expect(resolveScreenAccess(screens, '/uncataloged')).toBeUndefined()
  })

  it('does not match partial segment names', () => {
    expect(resolveScreenAccess(screens, '/products-archive')).toBeUndefined()
  })

  it('returns undefined for uncataloged routes (fail-open signal)', () => {
    expect(resolveScreenAccess(screens, '/settings')).toBeUndefined()
  })
})

describe('buildNavGroupsFromNavigation (db-sidebar.ts)', () => {
  it('maps modules and screens onto the sidebar NavGroup shape', () => {
    const groups = buildNavGroupsFromNavigation({
      modules: [
        {
          code: 'general',
          name: 'General',
          sortOrder: 1,
          screens: [
            {
              code: 'dashboard',
              name: 'Dashboard',
              route: '/',
              icon: null,
              sortOrder: 1,
            },
            {
              code: 'products',
              name: 'Products',
              route: '/products',
              icon: 'products',
              sortOrder: 2,
            },
          ],
        },
      ],
      screens: { '/': true, '/products': true },
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]!.title).toBe('General')
    expect(groups[0]!.items.map((item) => item.title)).toEqual([
      'Dashboard',
      'Products',
    ])
    expect(groups[0]!.items[0]).toMatchObject({ url: '/' })
    // icons resolve to components (never undefined)
    for (const item of groups[0]!.items) {
      expect(item.icon).toBeTruthy()
    }
  })
})

describe('screens catalog seed consistency', () => {
  const moduleCodes = new Set(MODULE_SEEDS.map((module) => module.code))
  const basePermissionNames = new Set<string>(
    BASE_PERMISSION_DEFINITIONS.map((permission) => permission.name)
  )

  it('screen codes and routes are unique', () => {
    const codes = SCREEN_SEEDS.map((screen) => screen.code)
    const routes = SCREEN_SEEDS.map((screen) => screen.route)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('every screen references a seeded module', () => {
    for (const screen of SCREEN_SEEDS) {
      expect(
        moduleCodes.has(screen.moduleCode),
        `${screen.code} references unknown module ${screen.moduleCode}`
      ).toBe(true)
    }
  })

  it('every screen permission is a known base permission', () => {
    for (const screen of SCREEN_SEEDS) {
      for (const permission of screen.permissions) {
        expect(
          basePermissionNames.has(permission),
          `${screen.code} references unknown permission ${permission}`
        ).toBe(true)
      }
    }
  })

  it('every screen route is absolute', () => {
    for (const screen of SCREEN_SEEDS) {
      expect(screen.route.startsWith('/'), screen.code).toBe(true)
    }
  })
})
