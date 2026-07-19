import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Phase 2 — centralized authorization: withAuth wrapper + permission cache.
// ---------------------------------------------------------------------------

const requireAuthMock = vi.fn()

vi.mock('@/server/utils/auth', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/server/utils/auth')>()
  return {
    ...original,
    requireAuth: (...args: unknown[]) => requireAuthMock(...args),
  }
})

const resolveTenantIdMock = vi.fn()
vi.mock('@/server/utils/tenant', () => ({
  resolveTenantId: (...args: unknown[]) => resolveTenantIdMock(...args),
}))

const AUTHED_USER = {
  userId: 'user-1',
  primaryRole: 'admin',
  roleNames: ['admin'],
  permissionNames: ['access_control.users.manage', 'general.pos.access'],
}

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', { headers })
}

describe('withAuth (server/utils/with-auth.ts)', async () => {
  const { withAuth } = await import('@/server/utils/with-auth')
  const { PERMISSIONS } = await import(
    '@/features/users/data/permission-constants'
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 with the envelope when the bearer token is missing', async () => {
    const handler = vi.fn()
    const route = withAuth(PERMISSIONS.USERS_MANAGE, handler)

    const response = await route({ request: makeRequest() })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when requireAuth rejects with Forbidden', async () => {
    requireAuthMock.mockRejectedValue(
      new Error('Forbidden: Insufficient permissions')
    )
    const route = withAuth(PERMISSIONS.USERS_MANAGE, vi.fn())

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    expect(response.status).toBe(403)
    expect(requireAuthMock).toHaveBeenCalledWith('abc', [
      PERMISSIONS.USERS_MANAGE,
    ])
  })

  it('invokes the handler with auth context on success', async () => {
    requireAuthMock.mockResolvedValue(AUTHED_USER)
    const route = withAuth(PERMISSIONS.USERS_MANAGE, async ({ auth }) =>
      Response.json({ success: true, data: auth.userId })
    )

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toBe('user-1')
  })

  it('passes null requirement through as authenticated-only', async () => {
    requireAuthMock.mockResolvedValue(AUTHED_USER)
    const route = withAuth(null, async () =>
      Response.json({ success: true })
    )

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    expect(response.status).toBe(200)
    expect(requireAuthMock).toHaveBeenCalledWith('abc', [])
  })

  it('enforces allOf on top of requireAuth', async () => {
    requireAuthMock.mockResolvedValue({
      ...AUTHED_USER,
      permissionNames: ['general.pos.access'],
    })
    const route = withAuth(
      { allOf: [PERMISSIONS.POS_ACCESS, PERMISSIONS.USERS_MANAGE] },
      vi.fn()
    )

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    expect(response.status).toBe(403)
  })

  it('maps uncaught handler errors to a 500 envelope', async () => {
    requireAuthMock.mockResolvedValue(AUTHED_USER)
    const route = withAuth(PERMISSIONS.USERS_MANAGE, async () => {
      throw new Error('database exploded')
    })

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe('database exploded')
  })

  it('memoizes getTenantId within a request', async () => {
    requireAuthMock.mockResolvedValue(AUTHED_USER)
    resolveTenantIdMock.mockResolvedValue('tenant-1')
    const route = withAuth(null, async ({ getTenantId }) => {
      const first = await getTenantId()
      const second = await getTenantId()
      return Response.json({ success: true, data: { first, second } })
    })

    const response = await route({
      request: makeRequest({ authorization: 'Bearer abc' }),
    })
    const body = await response.json()
    expect(body.data).toEqual({ first: 'tenant-1', second: 'tenant-1' })
    expect(resolveTenantIdMock).toHaveBeenCalledTimes(1)
  })
})
