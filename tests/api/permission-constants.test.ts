import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BASE_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSION_NAMES,
  LEGACY_PERMISSION_ALIASES,
  PERMISSION_LEGACY_NAMES,
  expandPermissionNames,
  hasPermission,
  resolveEffectivePermissions,
  toPermissionName,
} from '@/features/users/data/rbac'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const BASE_NAMES = BASE_PERMISSION_DEFINITIONS.map((p) => p.name)

describe('permission catalog parity', () => {
  it('every PERMISSIONS constant exists in the base catalog, and vice versa', () => {
    const constantValues = Object.values(PERMISSIONS)
    expect([...constantValues].sort()).toEqual([...BASE_NAMES].sort())
  })

  it('every base permission is a 3-part module.resource.action name', () => {
    for (const name of BASE_NAMES) {
      expect(name).toMatch(/^[a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+$/)
    }
  })

  it('every base permission has a legacy 2-part alias', () => {
    const aliasTargets = new Set(Object.values(LEGACY_PERMISSION_ALIASES))
    for (const name of BASE_NAMES) {
      expect(aliasTargets.has(name), `missing legacy alias for ${name}`).toBe(
        true
      )
    }
  })

  it('alias maps are exact inverses', () => {
    for (const [legacy, canonical] of Object.entries(
      LEGACY_PERMISSION_ALIASES
    )) {
      expect(PERMISSION_LEGACY_NAMES[canonical]).toBe(legacy)
    }
  })

  it('every role default references a known base permission', () => {
    const known = new Set([...BASE_NAMES, '*'])
    for (const [role, names] of Object.entries(
      DEFAULT_ROLE_PERMISSION_NAMES
    )) {
      for (const name of names) {
        expect(known.has(name), `${role} references unknown ${name}`).toBe(
          true
        )
      }
    }
  })

  it('the rename migration covers every legacy alias pair', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20260719130000_rename_permissions_three_part/migration.sql'
      ),
      'utf-8'
    )
    for (const [legacy, canonical] of Object.entries(
      LEGACY_PERMISSION_ALIASES
    )) {
      expect(sql, `migration missing ${legacy}`).toContain(`'${legacy}'`)
      expect(sql, `migration missing ${canonical}`).toContain(`'${canonical}'`)
    }
  })
})

describe('transitional permission matching', () => {
  it('a legacy check passes against a store holding canonical names', () => {
    expect(
      hasPermission(['access_control.users.manage'], 'users.manage')
    ).toBe(true)
  })

  it('a canonical check passes against a store holding legacy names', () => {
    expect(
      hasPermission(['users.manage'], 'access_control.users.manage')
    ).toBe(true)
  })

  it('module.* wildcard covers module.resource.action', () => {
    expect(
      hasPermission(['inventory.*'], 'inventory.purchasing.manage')
    ).toBe(true)
  })

  it('module.resource.* wildcard covers actions under the resource', () => {
    expect(
      hasPermission(['restaurant.orders.*'], 'restaurant.orders.approve')
    ).toBe(true)
    expect(
      hasPermission(['restaurant.orders.*'], 'restaurant.shifts.manage')
    ).toBe(false)
  })

  it('bare * still grants everything', () => {
    expect(hasPermission(['*'], 'inventory.stock.manage')).toBe(true)
    expect(hasPermission(['*'], 'inventory.manage')).toBe(true)
  })

  it('unrelated permissions still fail', () => {
    expect(hasPermission(['general.pos.access'], 'users.manage')).toBe(false)
  })

  it('toPermissionName resolves legacy resources to canonical names', () => {
    expect(toPermissionName('users', 'read')).toBe('access_control.users.view')
    expect(toPermissionName('inventory', 'update')).toBe(
      'inventory.stock.manage'
    )
    expect(toPermissionName('shifts', 'use')).toBe('restaurant.shifts.use')
  })

  it('a deny stored under the legacy spelling removes the canonical grant', () => {
    const effective = resolveEffectivePermissions(
      ['access_control.users.manage', 'general.pos.access'],
      [],
      ['users.manage']
    )
    expect(hasPermission(effective, 'access_control.users.manage')).toBe(false)
    expect(hasPermission(effective, 'general.pos.access')).toBe(true)
  })

  it('expanding a wildcard exposes both spellings for every base permission', () => {
    const expanded = new Set(expandPermissionNames(['*']))
    expect(expanded.has('access_control.users.manage')).toBe(true)
    expect(expanded.has('users.manage')).toBe(true)
  })
})

describe('role defaults keep their pre-rename capabilities', () => {
  const legacyChecks: Record<string, string[]> = {
    admin: ['users.manage', 'roles.manage', 'inventory.manage', 'pos.access'],
    manager: ['products.manage', 'purchasing.manage', 'sales.manage'],
    cashier: ['orders.create', 'pos.access', 'shifts.use'],
    captain: ['orders.manage', 'pos.access'],
    kitchen: ['orders.view', 'dashboard.view'],
    staff: ['orders.create', 'inventory.view'],
  }

  for (const [role, checks] of Object.entries(legacyChecks)) {
    it(`${role} still satisfies its legacy permission checks`, () => {
      const rolePerms = DEFAULT_ROLE_PERMISSION_NAMES[role]
      expect(rolePerms, `no defaults for ${role}`).toBeDefined()
      for (const check of checks) {
        expect(
          hasPermission([...rolePerms!], check),
          `${role} lost ${check}`
        ).toBe(true)
      }
    })
  }
})
