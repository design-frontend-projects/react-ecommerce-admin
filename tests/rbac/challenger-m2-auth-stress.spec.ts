/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDatabasePermissionNames,
  getCachedPermissionNames,
  invalidatePermissionCache,
  requireAuth,
} from '@/server/utils/auth'
import {
  resolveEffectivePermissions,
  hasPermission,
  hasAnyPermission,
} from '@/features/users/data/rbac'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      tenant_users: {
        findFirst: vi.fn(),
      },
      roles: {
        findFirst: vi.fn(),
      },
      permissions: {
        findMany: vi.fn(),
      },
    },
  }
})

vi.mock('@/server/supabase', () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
      },
    },
  }
})

vi.mock('@/server/utils/tenant', () => {
  return {
    resolveTenantId: vi.fn(),
  }
})

const TENANT_1 = '11111111-1111-1111-1111-111111111111'
const TENANT_2 = '22222222-2222-2222-2222-222222222222'
const AUTH_USER_1 = 'aaaa1111-0000-0000-0000-000000000001'
const AUTH_USER_2 = 'bbbb2222-0000-0000-0000-000000000002'

describe('Challenger M2 Auth Engine Empirical Stress Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidatePermissionCache() // Clear in-memory cache between tests
  })

  // ===========================================================================
  // SECTION 1: Multi-Role Permission Union & Precedence Resolution
  // ===========================================================================
  describe('1. Multi-Role Permission Union & Precedence (Deny > Grant > Role > Wildcard)', () => {
    it('unions permissions from multiple active roles without duplicates', () => {
      const role1Perms = ['general.products.create', 'general.products.view']
      const role2Perms = ['general.products.delete', 'general.products.view', 'pos.sale.create']

      const effective = resolveEffectivePermissions(
        [...role1Perms, ...role2Perms],
        [],
        []
      )

      expect(effective).toContain('general.products.create')
      expect(effective).toContain('general.products.view')
      expect(effective).toContain('general.products.delete')
      expect(effective).toContain('pos.sale.create')
      // Deduplicated count
      const viewCount = effective.filter((p) => p === 'general.products.view').length
      expect(viewCount).toBe(1)
    })

    it('precedence: explicit user deny strictly overrides role grants', () => {
      const rolePerms = ['general.products.create', 'general.products.delete']
      const userGrants: string[] = []
      const userDenies = ['general.products.delete']

      const effective = resolveEffectivePermissions(rolePerms, userGrants, userDenies)

      expect(effective).toContain('general.products.create')
      expect(effective).not.toContain('general.products.delete')
    })

    it('precedence: explicit user deny strictly overrides direct user grants (Deny > Grant)', () => {
      const rolePerms = ['general.dashboard.view']
      // Conflicting direct grant and direct deny on the same permission
      const userGrants = ['general.products.create']
      const userDenies = ['general.products.create']

      const effective = resolveEffectivePermissions(rolePerms, userGrants, userDenies)

      expect(effective).toContain('general.dashboard.view')
      expect(effective).not.toContain('general.products.create')
    })

    it('precedence: explicit user deny overrides wildcard (*) and retains other universe permissions', () => {
      const allKnown = [
        'general.dashboard.view',
        'general.products.create',
        'general.products.delete',
        'pos.sale.create',
      ]
      const rolePerms = ['*']
      const userDenies = ['general.products.delete']

      const effective = resolveEffectivePermissions(rolePerms, [], userDenies, allKnown)

      expect(effective).not.toContain('*')
      expect(effective).not.toContain('general.products.delete')
      expect(effective).toContain('general.dashboard.view')
      expect(effective).toContain('general.products.create')
      expect(effective).toContain('pos.sale.create')
    })

    it('bidirectional alias handling in denies: denying legacy name removes canonical name', () => {
      // Legacy alias: 'products.delete' -> 'general.products.manage' or 'general.products.view'
      // Legacy 'products.view' -> canonical 'general.products.view'
      const rolePerms = ['general.products.view', 'general.dashboard.view']
      const userDenies = ['products.view'] // Legacy spelling

      const effective = resolveEffectivePermissions(rolePerms, [], userDenies)

      expect(effective).not.toContain('general.products.view')
      expect(effective).not.toContain('products.view')
      expect(effective).toContain('general.dashboard.view')
    })

    it('bidirectional alias handling in denies: denying canonical name removes legacy alias', () => {
      const rolePerms = ['products.view', 'general.dashboard.view']
      const userDenies = ['general.products.view'] // Canonical spelling

      const effective = resolveEffectivePermissions(rolePerms, [], userDenies)

      expect(effective).not.toContain('general.products.view')
      expect(effective).not.toContain('products.view')
      expect(effective).toContain('general.dashboard.view')
    })

    it('DB resolver live query: filters out inactive roles and roles belonging to another tenant', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-1',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: true,
        is_blocked: false,
        default_role: null,
        user_roles: [
          {
            roles: {
              id: 'role-active-t1',
              name: 'Role Active T1',
              tenant_id: TENANT_1,
              is_active: true,
              role_permissions: [
                { permissions: { name: 'general.products.create' } },
              ],
            },
          },
          {
            roles: {
              id: 'role-inactive-t1',
              name: 'Role Inactive T1',
              tenant_id: TENANT_1,
              is_active: false, // Inactive! Must be filtered out
              role_permissions: [
                { permissions: { name: 'general.products.delete' } },
              ],
            },
          },
          {
            roles: {
              id: 'role-other-tenant',
              name: 'Role Tenant 2',
              tenant_id: TENANT_2, // Belongs to Tenant 2! Must be filtered out
              is_active: true,
              role_permissions: [
                { permissions: { name: 'access_control.roles.manage' } },
              ],
            },
          },
          {
            roles: {
              id: 'role-system-global',
              name: 'Global System Role',
              tenant_id: null, // Global system role! Must be included
              is_active: true,
              role_permissions: [
                { permissions: { name: 'general.dashboard.view' } },
              ],
            },
          },
        ],
        user_permissions: [],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(false)
      expect(result.roleNames).toContain('Role Active T1')
      expect(result.roleNames).toContain('Global System Role')
      expect(result.roleNames).not.toContain('Role Inactive T1')
      expect(result.roleNames).not.toContain('Role Tenant 2')

      expect(result.permissionNames).toContain('general.products.create')
      expect(result.permissionNames).toContain('general.dashboard.view')
      expect(result.permissionNames).not.toContain('general.products.delete')
      expect(result.permissionNames).not.toContain('access_control.roles.manage')
    })
  })

  // ===========================================================================
  // SECTION 2: Default DENY on Missing, Inactive, Blocked, or Role-less Users
  // ===========================================================================
  describe('2. Default DENY Enforcement on Missing, Inactive, Blocked Accounts', () => {
    it('denies access (isBlocked=true, permissionNames=[]) when tenant_users row does not exist', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce(null)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(true)
      expect(result.permissionNames).toEqual([])
      expect(result.roleNames).toEqual([])
      expect(result.tenantUserId).toBeNull()
    })

    it('denies access when tenant_users record has is_active: false', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-inactive',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: false,
        is_blocked: false,
        default_role: 'admin',
        user_roles: [],
        user_permissions: [],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(true)
      expect(result.permissionNames).toEqual([])
      expect(result.roleNames).toEqual([])
    })

    it('denies access when tenant_users record has is_blocked: true regardless of permissions', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-blocked',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: true,
        is_blocked: true,
        default_role: 'super_admin',
        user_roles: [
          {
            roles: {
              id: 'role-admin',
              name: 'super_admin',
              tenant_id: null,
              is_active: true,
              role_permissions: [{ permissions: { name: '*' } }],
            },
          },
        ],
        user_permissions: [],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(true)
      expect(result.permissionNames).toEqual([])
      expect(result.roleNames).toEqual([])
    })

    it('denies access when user is active but has zero roles and zero direct grants', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-no-roles',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: true,
        is_blocked: false,
        default_role: null,
        user_roles: [],
        user_permissions: [],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(true)
      expect(result.permissionNames).toEqual([])
      expect(result.roleNames).toEqual([])
    })

    it('denies access when assigned role has zero role_permissions mapped', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-empty-role',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: true,
        is_blocked: false,
        default_role: null,
        user_roles: [
          {
            roles: {
              id: 'role-empty',
              name: 'Empty Role',
              tenant_id: TENANT_1,
              is_active: true,
              role_permissions: [], // No permissions!
            },
          },
        ],
        user_permissions: [],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(result.isBlocked).toBe(true)
      expect(result.permissionNames).toEqual([])
    })

    it('requireAuth: throws Forbidden error when blocked user attempts to access protected resource', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: AUTH_USER_1 } as any },
        error: null,
      })

      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-blocked',
        tenant_id: TENANT_1,
        is_active: true,
        is_blocked: true,
        user_roles: [],
        user_permissions: [],
      } as any)

      await expect(
        requireAuth('fake-token', 'general.products.view', TENANT_1)
      ).rejects.toThrow(/Forbidden: User account is inactive or blocked in this tenant/i)
    })

    it('requireAuth: probing security posture when requiredPermissions is empty for blocked user', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: AUTH_USER_1 } as any },
        error: null,
      })

      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-blocked',
        tenant_id: TENANT_1,
        is_active: true,
        is_blocked: true,
        user_roles: [],
        user_permissions: [],
      } as any)

      // Verified secure behavior:
      // When called with no requiredPermissions, requireAuth strictly denies blocked users
      await expect(
        requireAuth('fake-token', undefined, TENANT_1)
      ).rejects.toThrow(/Forbidden: User account is inactive or blocked in this tenant/i)
    })
  })

  // ===========================================================================
  // SECTION 3: Compound Cache Isolation & Tenant Switching
  // ===========================================================================
  describe('3. Compound Cache Isolation & Dynamic Tenant Switching', () => {
    it('isolates cache per ${tenantId}:${authUserId} - same user in two tenants has isolated permissions', async () => {
      // Setup: In Tenant 1, user is Cashier with pos.sale.create
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-t1',
        tenant_id: TENANT_1,
        is_active: true,
        is_blocked: false,
        user_roles: [
          {
            roles: {
              id: 'role-cashier',
              name: 'cashier',
              tenant_id: TENANT_1,
              is_active: true,
              role_permissions: [{ permissions: { name: 'pos.sale.create' } }],
            },
          },
        ],
        user_permissions: [],
      } as any)

      const permsT1 = await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      expect(permsT1.roleNames).toEqual(['cashier'])
      expect(permsT1.permissionNames).toContain('pos.sale.create')
      expect(permsT1.permissionNames).not.toContain('access_control.roles.manage')

      // Setup: In Tenant 2, same user is Admin with access_control.roles.manage
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-t2',
        tenant_id: TENANT_2,
        is_active: true,
        is_blocked: false,
        user_roles: [
          {
            roles: {
              id: 'role-admin',
              name: 'admin',
              tenant_id: TENANT_2,
              is_active: true,
              role_permissions: [
                { permissions: { name: 'access_control.roles.manage' } },
              ],
            },
          },
        ],
        user_permissions: [],
      } as any)

      const permsT2 = await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      expect(permsT2.roleNames).toEqual(['admin'])
      expect(permsT2.permissionNames).toContain('access_control.roles.manage')
      expect(permsT2.permissionNames).not.toContain('pos.sale.create')

      // Subsequent read from Tenant 1 must hit cache and return Cashier, not Admin
      const cachedT1 = await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      expect(cachedT1.roleNames).toEqual(['cashier'])
      expect(cachedT1.permissionNames).toContain('pos.sale.create')
      expect(cachedT1.permissionNames).not.toContain('access_control.roles.manage')

      // Prisma findFirst should only have been called twice (once per tenant)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(2)
    })

    it('cache invalidation: targeting specific { authUserId, tenantId } does not invalidate other tenants', async () => {
      // Prime cache for Tenant 1 and Tenant 2
      vi.mocked(prisma.tenant_users.findFirst)
        .mockResolvedValueOnce({
          id: 'tu-t1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [
            {
              roles: {
                id: 'r1',
                name: 'r1',
                tenant_id: TENANT_1,
                is_active: true,
                role_permissions: [{ permissions: { name: 'p1' } }],
              },
            },
          ],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-t2',
          tenant_id: TENANT_2,
          is_active: true,
          is_blocked: false,
          user_roles: [
            {
              roles: {
                id: 'r2',
                name: 'r2',
                tenant_id: TENANT_2,
                is_active: true,
                role_permissions: [{ permissions: { name: 'p2' } }],
              },
            },
          ],
          user_permissions: [],
        } as any)

      await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(2)

      // Invalidate ONLY Tenant 1 for AUTH_USER_1
      invalidatePermissionCache({ authUserId: AUTH_USER_1, tenantId: TENANT_1 })

      // Tenant 2 must still be cached (should NOT call Prisma)
      const cachedT2 = await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      expect(cachedT2.permissionNames).toContain('p2')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(2)

      // Tenant 1 was invalidated, so querying Tenant 1 must call Prisma again
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-t1',
        tenant_id: TENANT_1,
        is_active: true,
        is_blocked: false,
        user_roles: [
          {
            roles: {
              id: 'r1-updated',
              name: 'r1-updated',
              tenant_id: TENANT_1,
              is_active: true,
              role_permissions: [{ permissions: { name: 'p1-updated' } }],
            },
          },
        ],
        user_permissions: [],
      } as any)

      const refetchedT1 = await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      expect(refetchedT1.permissionNames).toContain('p1-updated')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(3)
    })

    it('cache invalidation: string argument invalidates all tenant entries for that authUserId', async () => {
      // Prime cache for Tenant 1 and Tenant 2 for AUTH_USER_1, and Tenant 1 for AUTH_USER_2
      vi.mocked(prisma.tenant_users.findFirst)
        .mockResolvedValueOnce({
          id: 'tu-1-1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r1', tenant_id: TENANT_1, is_active: true, role_permissions: [{ permissions: { name: 'p1' } }] } }],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-1-2',
          tenant_id: TENANT_2,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r2', tenant_id: TENANT_2, is_active: true, role_permissions: [{ permissions: { name: 'p2' } }] } }],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-2-1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r3', tenant_id: TENANT_1, is_active: true, role_permissions: [{ permissions: { name: 'p3' } }] } }],
          user_permissions: [],
        } as any)

      await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      await getCachedPermissionNames(AUTH_USER_2, TENANT_1)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(3)

      // Invalidate AUTH_USER_1 across all tenants
      invalidatePermissionCache(AUTH_USER_1)

      // AUTH_USER_2 on TENANT_1 must STILL be cached!
      const cachedUser2 = await getCachedPermissionNames(AUTH_USER_2, TENANT_1)
      expect(cachedUser2.permissionNames).toContain('p3')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(3)
    })

    it('cache invalidation: tenantId option invalidates all users in that tenant', async () => {
      vi.mocked(prisma.tenant_users.findFirst)
        .mockResolvedValueOnce({
          id: 'tu-1-1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r1', tenant_id: TENANT_1, is_active: true, role_permissions: [{ permissions: { name: 'p1' } }] } }],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-2-1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r2', tenant_id: TENANT_1, is_active: true, role_permissions: [{ permissions: { name: 'p2' } }] } }],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-1-2',
          tenant_id: TENANT_2,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'r3', tenant_id: TENANT_2, is_active: true, role_permissions: [{ permissions: { name: 'p3' } }] } }],
          user_permissions: [],
        } as any)

      await getCachedPermissionNames(AUTH_USER_1, TENANT_1)
      await getCachedPermissionNames(AUTH_USER_2, TENANT_1)
      await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(3)

      // Invalidate entire TENANT_1
      invalidatePermissionCache({ tenantId: TENANT_1 })

      // TENANT_2 entry must still be cached
      const cachedT2 = await getCachedPermissionNames(AUTH_USER_1, TENANT_2)
      expect(cachedT2.permissionNames).toContain('p3')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(3)
    })

    it('dynamic tenant context switching via runWithTenantContext', async () => {
      vi.mocked(prisma.tenant_users.findFirst)
        .mockResolvedValueOnce({
          id: 'tu-t1',
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'role-t1', tenant_id: TENANT_1, is_active: true, role_permissions: [{ permissions: { name: 'perm-t1' } }] } }],
          user_permissions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'tu-t2',
          tenant_id: TENANT_2,
          is_active: true,
          is_blocked: false,
          user_roles: [{ roles: { name: 'role-t2', tenant_id: TENANT_2, is_active: true, role_permissions: [{ permissions: { name: 'perm-t2' } }] } }],
          user_permissions: [],
        } as any)

      // Running in TENANT_1 context without passing explicit tenantId to getCachedPermissionNames
      await runWithTenantContext({ tenantId: TENANT_1 }, async () => {
        const perms = await getCachedPermissionNames(AUTH_USER_1)
        expect(perms.tenantId).toBe(TENANT_1)
        expect(perms.permissionNames).toContain('perm-t1')
      })

      // Running in TENANT_2 context without passing explicit tenantId
      await runWithTenantContext({ tenantId: TENANT_2 }, async () => {
        const perms = await getCachedPermissionNames(AUTH_USER_1)
        expect(perms.tenantId).toBe(TENANT_2)
        expect(perms.permissionNames).toContain('perm-t2')
      })
    })

    it('empirical stress harness: cache bounding & LRU eviction under capacity pressure (>5,000 entries)', async () => {
      // Mock DB resolver to dynamically return distinct permission per user
      vi.mocked(prisma.tenant_users.findFirst).mockImplementation(async (args: any) => {
        const authUserId = args?.where?.auth_user_id ?? 'user-mock'
        return {
          id: `tu-${authUserId}`,
          tenant_id: TENANT_1,
          is_active: true,
          is_blocked: false,
          user_roles: [
            {
              roles: {
                id: `role-${authUserId}`,
                name: 'worker',
                tenant_id: TENANT_1,
                is_active: true,
                role_permissions: [{ permissions: { name: `perm-${authUserId}` } }],
              },
            },
          ],
          user_permissions: [],
        } as any
      })

      // 1. Warm cache with user-0
      await getCachedPermissionNames('user-0', TENANT_1)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(1)

      // 2. Warm cache with user-1
      await getCachedPermissionNames('user-1', TENANT_1)
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(2)

      // 3. Flood cache with distinct entries up to 5,001 (total distinct keys: 5,002)
      // At user-4999, cache reaches exactly 5,000 entries.
      // At user-5000, cache capacity is exceeded -> user-0 is evicted.
      // At user-5001, cache capacity is exceeded -> user-1 is evicted.
      for (let i = 2; i <= 5001; i++) {
        await getCachedPermissionNames(`user-${i}`, TENANT_1)
      }
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5002)

      // 4. Query recently inserted entry (user-5000) -> MUST BE A CACHE HIT (no DB call)
      // Also touches user-5000, moving it to the tail of the LRU map.
      const hitRecent = await getCachedPermissionNames('user-5000', TENANT_1)
      expect(hitRecent.permissionNames).toContain('perm-user-5000')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5002)

      // 5. Query user-0 -> MUST HAVE BEEN EVICTED by LRU policy when user-5000 was inserted
      // Re-inserting user-0 at capacity (5,000) evicts the next oldest key: user-2!
      const evictedOld = await getCachedPermissionNames('user-0', TENANT_1)
      expect(evictedOld.permissionNames).toContain('perm-user-0')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5003) // 1 new DB call due to cache miss

      // 6. Query user-2 -> MUST HAVE BEEN EVICTED when user-0 was re-inserted above
      // Re-inserting user-2 evicts the next oldest key: user-3!
      const evictedUser2 = await getCachedPermissionNames('user-2', TENANT_1)
      expect(evictedUser2.permissionNames).toContain('perm-user-2')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5004) // cache miss (evicted)

      // 7. Query user-5000 (touched in step 4) -> MUST STILL BE CACHED (no DB call)
      const hitUser5000Again = await getCachedPermissionNames('user-5000', TENANT_1)
      expect(hitUser5000Again.permissionNames).toContain('perm-user-5000')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5004) // still 5004!

      // 8. Query user-3 -> MUST HAVE BEEN EVICTED when user-2 was re-inserted
      const evictedUser3 = await getCachedPermissionNames('user-3', TENANT_1)
      expect(evictedUser3.permissionNames).toContain('perm-user-3')
      expect(prisma.tenant_users.findFirst).toHaveBeenCalledTimes(5005) // cache miss (evicted)
    })
  })

  // ===========================================================================
  // SECTION 4: Additional Edge Cases & Boundary Conditions
  // ===========================================================================
  describe('4. Additional Adversarial Edge Cases & Boundary Conditions', () => {
    it('bearer token parser: enforces Bearer prefix and non-empty token string', async () => {
      const { getBearerToken } = await import('@/server/utils/auth')

      // Missing header
      expect(() => getBearerToken(new Request('http://localhost'))).toThrow(
        /Unauthorized: Missing bearer token/i
      )

      // Malformed header (Basic auth)
      expect(() =>
        getBearerToken(
          new Request('http://localhost', {
            headers: { authorization: 'Basic dXNlcjpwYXNz' },
          })
        )
      ).toThrow(/Unauthorized: Missing bearer token/i)

      // Bearer with only whitespace
      expect(() =>
        getBearerToken(
          new Request('http://localhost', {
            headers: { authorization: 'Bearer    ' },
          })
        )
      ).toThrow(/Unauthorized: Missing bearer token/i)

      // Valid Bearer token
      const valid = getBearerToken(
        new Request('http://localhost', {
          headers: { authorization: 'Bearer valid.jwt.token' },
        })
      )
      expect(valid).toBe('valid.jwt.token')
    })

    it('default_role fallback: uses tenantUser.default_role when user_roles is empty', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-fallback',
        tenant_id: TENANT_1,
        branch_id: null,
        warehouse_id: null,
        is_active: true,
        is_blocked: false,
        default_role: 'cashier',
        user_roles: [], // empty user_roles
        user_permissions: [],
      } as any)

      vi.mocked(prisma.roles.findFirst).mockResolvedValueOnce({
        id: 'role-cashier-id',
        name: 'cashier',
        tenant_id: TENANT_1,
        is_active: true,
        role_permissions: [
          { permissions: { name: 'pos.sale.create' } },
        ],
      } as any)

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(prisma.roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: 'cashier',
            is_active: true,
          }),
        })
      )
      expect(result.roleNames).toEqual(['cashier'])
      expect(result.permissionNames).toContain('pos.sale.create')
    })

    it('wildcard expansion triggers permissions.findMany when explicit denies are present', async () => {
      vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
        id: 'tu-admin-deny',
        tenant_id: TENANT_1,
        is_active: true,
        is_blocked: false,
        default_role: null,
        user_roles: [
          {
            roles: {
              id: 'role-admin',
              name: 'super_admin',
              tenant_id: null,
              is_active: true,
              role_permissions: [{ permissions: { name: '*' } }],
            },
          },
        ],
        user_permissions: [
          {
            is_granted: false, // Explicit Deny!
            permissions: { name: 'general.products.delete' },
          },
        ],
      } as any)

      vi.mocked(prisma.permissions.findMany).mockResolvedValueOnce([
        { name: 'general.products.create' } as any,
        { name: 'general.products.view' } as any,
        { name: 'general.products.delete' } as any,
        { name: 'general.dashboard.view' } as any,
      ])

      const result = await getDatabasePermissionNames(AUTH_USER_1, TENANT_1)

      expect(prisma.permissions.findMany).toHaveBeenCalledTimes(1)
      expect(result.permissionNames).toContain('general.products.create')
      expect(result.permissionNames).toContain('general.products.view')
      expect(result.permissionNames).toContain('general.dashboard.view')
      expect(result.permissionNames).not.toContain('general.products.delete')
      expect(result.permissionNames).not.toContain('*')
    })

    it('hasPermission evaluates 2-part and 3-part hierarchy wildcards', () => {
      // module.* covers module.resource.action
      expect(hasPermission(['general.*'], 'general.products.view')).toBe(true)
      expect(hasPermission(['general.*'], 'general.settings.manage')).toBe(true)
      expect(hasPermission(['general.*'], 'inventory.stock.view')).toBe(false)

      // module.resource.* covers module.resource.action
      expect(hasPermission(['general.products.*'], 'general.products.view')).toBe(true)
      expect(hasPermission(['general.products.*'], 'general.products.delete')).toBe(true)
      expect(hasPermission(['general.products.*'], 'general.settings.manage')).toBe(false)

      // global wildcard * covers everything
      expect(hasPermission(['*'], 'any.arbitrary.permission')).toBe(true)

      // empty required permission always passes
      expect(hasPermission([], '')).toBe(true)
    })

    it('hasAnyPermission checks logical OR across required list', () => {
      const userPerms = ['general.dashboard.view', 'pos.sale.create']

      expect(
        hasAnyPermission(userPerms, ['general.products.create', 'pos.sale.create'])
      ).toBe(true)

      expect(
        hasAnyPermission(userPerms, ['general.products.create', 'general.products.delete'])
      ).toBe(false)
    })
  })
})
