import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Phase 0 security hotfix — unit tests for the authorization preambles added
// to the previously unprotected server fns.
// ---------------------------------------------------------------------------

const prismaMock = {
  tenant_users: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  profiles: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  tenant_subscriptions: {
    findFirst: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}))

vi.mock('@/server/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
        inviteUserByEmail: vi.fn(),
      },
    },
  },
}))

// createServerFn must stay chainable so module-level definitions evaluate.
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      handler: (fn: unknown) => fn,
    }
    return chain
  },
}))

const requireAuthMock = vi.fn()
vi.mock('@/server/utils/auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}))

describe('requireUserAccess (server/fns/users.ts)', async () => {
  const { requireUserAccess } = await import('@/server/fns/users')

  const caller = {
    userId: 'caller-1',
    primaryRole: 'manager',
    roleNames: ['manager'],
    permissionNames: ['users.manage'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows self-service when allowSelf is set', async () => {
    requireAuthMock.mockResolvedValue({ ...caller, permissionNames: [] })

    await expect(
      requireUserAccess('token', 'caller-1', {
        allowSelf: true,
        permissions: ['users.manage'],
      })
    ).resolves.toMatchObject({ userId: 'caller-1' })
  })

  it('rejects a non-admin acting on another user', async () => {
    requireAuthMock.mockResolvedValue({ ...caller, permissionNames: [] })

    await expect(
      requireUserAccess('token', 'other-user', {
        allowSelf: true,
        permissions: ['users.manage'],
      })
    ).rejects.toThrow('Forbidden: Insufficient permissions')
  })

  it('rejects self-service actions when allowSelf is not set and perms are missing', async () => {
    requireAuthMock.mockResolvedValue({ ...caller, permissionNames: [] })

    await expect(
      requireUserAccess('token', 'caller-1', {
        permissions: ['users.manage'],
      })
    ).rejects.toThrow('Forbidden: Insufficient permissions')
  })

  it('rejects an admin acting on a user outside their tenant', async () => {
    requireAuthMock.mockResolvedValue(caller)
    // resolveTenantId: caller belongs to tenant-1
    prismaMock.tenant_users.findUnique.mockResolvedValue({
      parent_tenant_id: 'tenant-1',
    })
    // tenant members do not include the target
    prismaMock.tenant_users.findMany.mockResolvedValue([
      { auth_user_id: 'caller-1' },
      { auth_user_id: 'teammate-1' },
    ])
    prismaMock.profiles.findFirst.mockResolvedValue(null)
    prismaMock.tenant_subscriptions.findFirst.mockResolvedValue(null)

    await expect(
      requireUserAccess('token', 'outsider-9', {
        permissions: ['users.manage'],
      })
    ).rejects.toThrow('Forbidden: The requested user is outside your tenant')
  })

  it('allows an admin acting on a user inside their tenant', async () => {
    requireAuthMock.mockResolvedValue(caller)
    prismaMock.tenant_users.findUnique.mockResolvedValue({
      parent_tenant_id: 'tenant-1',
    })
    prismaMock.tenant_users.findMany.mockResolvedValue([
      { auth_user_id: 'caller-1' },
      { auth_user_id: 'teammate-1' },
    ])
    prismaMock.profiles.findFirst.mockResolvedValue(null)
    prismaMock.tenant_subscriptions.findFirst.mockResolvedValue(null)

    await expect(
      requireUserAccess('token', 'teammate-1', {
        permissions: ['users.manage'],
      })
    ).resolves.toMatchObject({ userId: 'caller-1' })
  })

  it('propagates authentication failures from requireAuth', async () => {
    requireAuthMock.mockRejectedValue(
      new Error('Unauthorized: Invalid session token')
    )

    await expect(
      requireUserAccess('bad-token', 'anyone', {
        permissions: ['users.manage'],
      })
    ).rejects.toThrow('Unauthorized: Invalid session token')
  })
})

describe('getTenantAuthUserIds (server/utils/tenant.ts)', async () => {
  const { getTenantAuthUserIds } = await import('@/server/utils/tenant')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only the caller when no tenant can be resolved', async () => {
    prismaMock.tenant_users.findUnique.mockResolvedValue(null)
    prismaMock.tenant_subscriptions.findFirst.mockResolvedValue(null)

    const ids = await getTenantAuthUserIds('lonely-user')
    expect(ids).toEqual(['lonely-user'])
  })

  it('includes tenant members and the owning account', async () => {
    prismaMock.tenant_users.findUnique.mockResolvedValue({
      parent_tenant_id: 'tenant-1',
    })
    prismaMock.tenant_users.findMany.mockResolvedValue([
      { auth_user_id: 'member-1' },
      { auth_user_id: 'member-2' },
    ])
    prismaMock.profiles.findFirst.mockResolvedValue({
      auth_user_id: 'owner-1',
    })
    prismaMock.tenant_subscriptions.findFirst.mockResolvedValue(null)

    const ids = await getTenantAuthUserIds('member-1')
    expect(ids).toEqual(
      expect.arrayContaining(['member-1', 'member-2', 'owner-1'])
    )
    expect(ids).not.toContain('outsider')
  })
})
