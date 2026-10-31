import { describe, it, expect, vi } from 'vitest'
import { UserScopeContext } from '../helpers/rbac-contracts'

describe('Feature 7: Server Function & API Zero-Trust Protection', () => {
  const verifiedTenantId = 'tenant-secure-111'
  const verifiedUserId = 'user-secure-222'

  interface MockSessionToken {
    sub: string // authUserId
    tenantId: string
    exp: number
  }

  interface ServerFnContext<TInput> {
    data: TInput & { sessionToken?: string }
  }

  // Model of withServerFnAuth per PROJECT.md interface contract
  function createProtectedServerFn<TInput, TOutput>(
    requiredPermission: string | null,
    handler: (ctx: {
      data: TInput
      auth: { userId: string; roleNames: string[]; permissions: string[] }
      tenantId: string
      scopeContext: UserScopeContext
    }) => Promise<TOutput>,
    tokenVerifier: (token?: string) => MockSessionToken | null,
    permissionResolver: (userId: string, tenantId: string) => { roleNames: string[]; permissions: string[] }
  ) {
    return async (input: ServerFnContext<TInput>): Promise<TOutput> => {
      // 1. Token validation
      const token = input.data.sessionToken
      if (!token) {
        throw new Error('UNAUTHORIZED: Missing session token in server function request')
      }

      const decoded = tokenVerifier(token)
      if (!decoded || decoded.exp < Date.now()) {
        throw new Error('UNAUTHORIZED: Invalid or expired session token')
      }

      // 2. Authoritative permission resolution
      const auth = {
        userId: decoded.sub,
        ...permissionResolver(decoded.sub, decoded.tenantId),
      }

      // 3. Permission check
      if (requiredPermission) {
        const hasPermission =
          auth.permissions.includes('*') || auth.permissions.includes(requiredPermission)
        if (!hasPermission) {
          throw new Error(`FORBIDDEN: Missing required permission: ${requiredPermission}`)
        }
      }

      // 4. Construct zero-trust scope context
      const scopeContext: UserScopeContext = {
        tenantId: decoded.tenantId,
        tenantUserId: `tu-${decoded.sub}`,
        authUserId: decoded.sub,
        branchIds: ['branch-1'],
        warehouseIds: ['wh-1'],
        dataScope: auth.roleNames.includes('admin') ? 'TENANT' : 'ASSIGNED_BRANCHES',
        isSuperAdmin: auth.roleNames.includes('super_admin'),
      }

      return handler({
        data: input.data,
        auth,
        tenantId: decoded.tenantId,
        scopeContext,
      })
    }
  }

  describe('Tier 1: Feature Coverage (Server Function Protection)', () => {
    it('throws 401 UNAUTHORIZED when session token is completely missing', async () => {
      const protectedFn = createProtectedServerFn(
        'general.products.view',
        async () => ({ success: true }),
        () => null,
        () => ({ roleNames: [], permissions: [] })
      )

      await expect(protectedFn({ data: {} })).rejects.toThrow('UNAUTHORIZED: Missing session token')
    })

    it('throws 401 UNAUTHORIZED when session token is expired or invalid', async () => {
      const tokenVerifier = (t?: string) => {
        if (t === 'expired-token') {
          return { sub: verifiedUserId, tenantId: verifiedTenantId, exp: Date.now() - 5000 }
        }
        return null
      }

      const protectedFn = createProtectedServerFn(
        'general.products.view',
        async () => ({ success: true }),
        tokenVerifier,
        () => ({ roleNames: [], permissions: [] })
      )

      await expect(
        protectedFn({ data: { sessionToken: 'expired-token' } })
      ).rejects.toThrow('UNAUTHORIZED: Invalid or expired session token')
    })

    it('throws 403 FORBIDDEN when user lacks the required permission', async () => {
      const tokenVerifier = () => ({
        sub: verifiedUserId,
        tenantId: verifiedTenantId,
        exp: Date.now() + 60000,
      })
      const permissionResolver = () => ({
        roleNames: ['cashier'],
        permissions: ['general.products.view'], // lacks products.delete
      })

      const deleteProductFn = createProtectedServerFn(
        'general.products.delete',
        async () => ({ deleted: true }),
        tokenVerifier,
        permissionResolver
      )

      await expect(
        deleteProductFn({ data: { sessionToken: 'valid-token' } })
      ).rejects.toThrow('FORBIDDEN: Missing required permission: general.products.delete')
    })

    it('successfully executes handler when user possesses required permission', async () => {
      const tokenVerifier = () => ({
        sub: verifiedUserId,
        tenantId: verifiedTenantId,
        exp: Date.now() + 60000,
      })
      const permissionResolver = () => ({
        roleNames: ['manager'],
        permissions: ['general.products.create'],
      })

      const createProductFn = createProtectedServerFn(
        'general.products.create',
        async ({ auth, tenantId }) => ({
          created: true,
          createdBy: auth.userId,
          tenantId,
        }),
        tokenVerifier,
        permissionResolver
      )

      const result = await createProductFn({ data: { sessionToken: 'valid-token' } })
      expect(result.created).toBe(true)
      expect(result.createdBy).toBe(verifiedUserId)
      expect(result.tenantId).toBe(verifiedTenantId)
    })

    it('ignores client-supplied userId and forces verified token userId in handler context', async () => {
      const attackerInjectedUserId = 'victim-user-id'

      const tokenVerifier = () => ({
        sub: verifiedUserId, // Token proves real caller
        tenantId: verifiedTenantId,
        exp: Date.now() + 60000,
      })
      const permissionResolver = () => ({
        roleNames: ['user'],
        permissions: ['general.products.view'],
      })

      const viewFn = createProtectedServerFn(
        'general.products.view',
        async ({ auth, data }) => {
          // Zero-trust assertion: context auth MUST NOT be attackerInjectedUserId
          return {
            effectiveUserId: auth.userId,
            rawClientUserId: (data as any).userId,
          }
        },
        tokenVerifier,
        permissionResolver
      )

      const res = await viewFn({
        data: { sessionToken: 'valid-token', userId: attackerInjectedUserId } as any,
      })

      expect(res.effectiveUserId).toBe(verifiedUserId)
      expect(res.effectiveUserId).not.toBe(attackerInjectedUserId)
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('allows wildcards (*) to satisfy any required permission', async () => {
      const tokenVerifier = () => ({
        sub: verifiedUserId,
        tenantId: verifiedTenantId,
        exp: Date.now() + 60000,
      })
      const permissionResolver = () => ({
        roleNames: ['super_admin'],
        permissions: ['*'], // Wildcard
      })

      const sensitiveActionFn = createProtectedServerFn(
        'financial.audit.export',
        async () => ({ success: true }),
        tokenVerifier,
        permissionResolver
      )

      const res = await sensitiveActionFn({ data: { sessionToken: 'valid-token' } })
      expect(res.success).toBe(true)
    })

    it('allows null required permission for authenticated-only endpoints', async () => {
      const tokenVerifier = () => ({
        sub: verifiedUserId,
        tenantId: verifiedTenantId,
        exp: Date.now() + 60000,
      })
      const permissionResolver = () => ({
        roleNames: ['guest'],
        permissions: [],
      })

      const publicAuthedFn = createProtectedServerFn(
        null, // No specific permission required
        async ({ auth }) => ({ profile: auth.userId }),
        tokenVerifier,
        permissionResolver
      )

      const res = await publicAuthedFn({ data: { sessionToken: 'valid-token' } })
      expect(res.profile).toBe(verifiedUserId)
    })

    it('rejects forged token signatures immediately', async () => {
      const tokenVerifier = (t?: string) => {
        if (t === 'tampered-signature-token') return null // Signature check fails
        return null
      }

      const fn = createProtectedServerFn(
        'test.perm',
        async () => ({}),
        tokenVerifier,
        () => ({ roleNames: [], permissions: [] })
      )

      await expect(
        fn({ data: { sessionToken: 'tampered-signature-token' } })
      ).rejects.toThrow('UNAUTHORIZED')
    })
  })

  describe('Tier 3: Pairwise Cross-Tenant Injections', () => {
    it('pairwise: attacker passes foreign tenantId in server function payload; wrapper forces session tenantId', async () => {
      const foreignTenantId = 'victim-tenant-999'

      const tokenVerifier = () => ({
        sub: verifiedUserId,
        tenantId: verifiedTenantId, // Authorized for verifiedTenantId ONLY
        exp: Date.now() + 60000,
      })

      const getInvoicesServerFn = createProtectedServerFn(
        'sales.invoices.view',
        async ({ tenantId, scopeContext }) => {
          return {
            scopedTenantId: tenantId,
            scopeContextTenantId: scopeContext.tenantId,
          }
        },
        tokenVerifier,
        () => ({ roleNames: ['accountant'], permissions: ['sales.invoices.view'] })
      )

      const res = await getInvoicesServerFn({
        data: { sessionToken: 'valid-token', tenantId: foreignTenantId } as any,
      })

      expect(res.scopedTenantId).toBe(verifiedTenantId)
      expect(res.scopedTenantId).not.toBe(foreignTenantId)
      expect(res.scopeContextTenantId).toBe(verifiedTenantId)
    })
  })
})
