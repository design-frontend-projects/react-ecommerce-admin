import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CompoundPermissionCache } from '../helpers/rbac-contracts'

describe('Feature 5: Compound Permission Cache & Tenant Switching Context Reset', () => {
  let cache: CompoundPermissionCache

  const tenantA = 'tenant-aaa-111'
  const tenantB = 'tenant-bbb-222'
  const userId = 'user-xyz-999'

  beforeEach(() => {
    cache = new CompoundPermissionCache()
  })

  describe('Tier 1: Feature Coverage (Compound Key & Retrieval)', () => {
    it('constructs compound cache key formatted as ${tenantId}:${userId}', () => {
      const key = CompoundPermissionCache.buildKey(tenantA, userId)
      expect(key).toBe(`${tenantA}:${userId}`)
    })

    it('stores and retrieves cached permissions for a specific tenant and user', () => {
      cache.set(tenantA, userId, {
        roleNames: ['cashier'],
        permissionNames: ['sales.orders.create', 'sales.orders.view'],
      })

      const entry = cache.get(tenantA, userId)
      expect(entry).not.toBeNull()
      expect(entry?.roleNames).toEqual(['cashier'])
      expect(entry?.permissionNames).toEqual(['sales.orders.create', 'sales.orders.view'])
    })

    it('isolates cached permissions for the same user across different tenants', () => {
      // User is Cashier in Tenant A
      cache.set(tenantA, userId, {
        roleNames: ['cashier'],
        permissionNames: ['sales.orders.create'],
      })

      // Same user is Super Admin in Tenant B
      cache.set(tenantB, userId, {
        roleNames: ['super_admin'],
        permissionNames: ['*'],
      })

      const cachedA = cache.get(tenantA, userId)
      const cachedB = cache.get(tenantB, userId)

      expect(cachedA?.roleNames).toEqual(['cashier'])
      expect(cachedA?.permissionNames).toEqual(['sales.orders.create'])

      expect(cachedB?.roleNames).toEqual(['super_admin'])
      expect(cachedB?.permissionNames).toEqual(['*'])
    })

    it('invalidates cache specifically for an authUserId across all tenants', () => {
      cache.set(tenantA, userId, { roleNames: ['cashier'], permissionNames: ['p1'] })
      cache.set(tenantB, userId, { roleNames: ['admin'], permissionNames: ['p2'] })
      cache.set(tenantA, 'other-user', { roleNames: ['staff'], permissionNames: ['p3'] })

      expect(cache.size()).toBe(3)

      cache.invalidate({ authUserId: userId })

      expect(cache.get(tenantA, userId)).toBeNull()
      expect(cache.get(tenantB, userId)).toBeNull()
      // Other user entry in Tenant A remains intact
      expect(cache.get(tenantA, 'other-user')).not.toBeNull()
      expect(cache.size()).toBe(1)
    })

    it('invalidates cache specifically for a tenantId when tenant roles change', () => {
      cache.set(tenantA, 'user-1', { roleNames: ['r1'], permissionNames: ['p1'] })
      cache.set(tenantA, 'user-2', { roleNames: ['r2'], permissionNames: ['p2'] })
      cache.set(tenantB, 'user-1', { roleNames: ['r3'], permissionNames: ['p3'] })

      cache.invalidate({ tenantId: tenantA })

      expect(cache.get(tenantA, 'user-1')).toBeNull()
      expect(cache.get(tenantA, 'user-2')).toBeNull()
      expect(cache.get(tenantB, 'user-1')).not.toBeNull()
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('evicts cache entry automatically when TTL expires', async () => {
      const shortTtlMs = 50
      cache.set(tenantA, userId, { roleNames: ['temp'], permissionNames: ['p'] }, shortTtlMs)

      expect(cache.get(tenantA, userId)).not.toBeNull()

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60))

      expect(cache.get(tenantA, userId)).toBeNull()
    })

    it('clears entire cache when invalidate() is called with no arguments', () => {
      cache.set(tenantA, 'u1', { roleNames: ['r'], permissionNames: [] })
      cache.set(tenantB, 'u2', { roleNames: ['r'], permissionNames: [] })
      expect(cache.size()).toBe(2)

      cache.invalidate()
      expect(cache.size()).toBe(0)
    })

    it('handles non-existent key lookups and invalidations without throwing', () => {
      expect(cache.get('non-existent-tenant', 'non-existent-user')).toBeNull()

      expect(() => {
        cache.invalidate({ authUserId: 'phantom-user' })
        cache.invalidate({ tenantId: 'phantom-tenant' })
      }).not.toThrow()
    })

    it('overwrites previous cached permissions cleanly when updated before TTL', () => {
      cache.set(tenantA, userId, {
        roleNames: ['role-old'],
        permissionNames: ['old.perm'],
      })

      cache.set(tenantA, userId, {
        roleNames: ['role-new'],
        permissionNames: ['new.perm.1', 'new.perm.2'],
      })

      const updated = cache.get(tenantA, userId)
      expect(updated?.roleNames).toEqual(['role-new'])
      expect(updated?.permissionNames).toEqual(['new.perm.1', 'new.perm.2'])
    })

    it('handles rapid sequential tenant switches cleanly', () => {
      const switchTenantContext = (fromTenant: string, toTenant: string, user: string) => {
        // Step 1: Invalidate fromTenant
        cache.invalidate({ tenantId: fromTenant, authUserId: user })
        // Step 2: Context reloads for toTenant
        cache.set(toTenant, user, {
          roleNames: [`role-of-${toTenant}`],
          permissionNames: [`perm-of-${toTenant}`],
        })
      }

      // Initial state: in Tenant A
      cache.set(tenantA, userId, { roleNames: ['role-A'], permissionNames: ['perm-A'] })

      // Switch: A -> B
      switchTenantContext(tenantA, tenantB, userId)
      expect(cache.get(tenantA, userId)).toBeNull()
      expect(cache.get(tenantB, userId)?.roleNames).toEqual(['role-of-tenant-bbb-222'])

      // Switch: B -> A
      switchTenantContext(tenantB, tenantA, userId)
      expect(cache.get(tenantB, userId)).toBeNull()
      expect(cache.get(tenantA, userId)?.roleNames).toEqual(['role-of-tenant-aaa-111'])
    })
  })

  describe('Tier 3: Pairwise Tenant Switching Life Cycle', () => {
    it('pairwise: instant revocation on direct user override mutation during active session', () => {
      // 1. Initial cached access: Cashier has products.view
      cache.set(tenantA, userId, {
        roleNames: ['cashier'],
        permissionNames: ['general.products.view'],
      })
      expect(cache.get(tenantA, userId)?.permissionNames).toContain('general.products.view')

      // 2. Admin grants explicit override: general.products.create
      const onUserPermissionOverrideChanged = (tId: string, uId: string, newPerms: string[]) => {
        cache.invalidate({ tenantId: tId, authUserId: uId })
        cache.set(tId, uId, { roleNames: ['cashier'], permissionNames: newPerms })
      }

      onUserPermissionOverrideChanged(tenantA, userId, [
        'general.products.view',
        'general.products.create',
      ])

      // 3. User immediately sees updated permissions without stale cache
      const fresh = cache.get(tenantA, userId)
      expect(fresh?.permissionNames).toContain('general.products.create')
    })
  })
})
