import { executeCompleteTenantOnboarding } from '@/server/fns/complete-onboarding'
import { provisionSignupUser } from '@/server/fns/provision-signup-user'
import { mapActivityToTenantType } from '@/server/utils/tenant-utils'
import { describe, expect, test, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tenants: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant_users: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant_subscriptions: {
      create: vi.fn(),
    },
    countries: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    currencies: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    subscriptions: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}))

vi.mock('@/server/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'auth-user-123',
              email: 'test@example.com',
              user_metadata: {},
            },
          },
        }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  },
}))

describe('Tenant Onboarding Utilities', () => {
  test('mapActivityToTenantType correctly maps UI business activities to tenant_type enum', () => {
    expect(mapActivityToTenantType('restuarant')).toBe('restaurant')
    expect(mapActivityToTenantType('restaurant')).toBe('restaurant')
    expect(mapActivityToTenantType('market')).toBe('retail')
    expect(mapActivityToTenantType('pharmacy')).toBe('retail')
    expect(mapActivityToTenantType('clothes')).toBe('retail')
    expect(mapActivityToTenantType('electronic')).toBe('retail')
    expect(mapActivityToTenantType('unknown')).toBe('company')
  })
})

describe('provisionSignupUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('creates new tenant_users record with onboarding_complete: false if not found', async () => {
    prismaMock.tenant_users.findFirst
      .mockResolvedValueOnce(null) // by auth_user_id
      .mockResolvedValueOnce(null) // by email

    prismaMock.tenant_users.create.mockResolvedValueOnce({
      id: 'tu-1',
      auth_user_id: 'auth-user-123',
      email: 'newowner@test.com',
      onboarding_complete: false,
    } as any)

    const result = await provisionSignupUser({
      authUserId: 'auth-user-123',
      email: 'newowner@test.com',
      firstName: 'John',
      lastName: 'Doe',
    })

    expect(result.isNew).toBe(true)
    expect(result.onboardingComplete).toBe(false)
    expect(result.authUserId).toBe('auth-user-123')
    expect(prismaMock.tenant_users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auth_user_id: 'auth-user-123',
          email: 'newowner@test.com',
          default_role: 'super_admin',
          onboarding_complete: false,
        }),
      })
    )
  })

  test('returns existing tenant_users record when matched by auth_user_id', async () => {
    prismaMock.tenant_users.findFirst.mockResolvedValueOnce({
      id: 'tu-existing',
      auth_user_id: 'auth-user-123',
      email: 'existing@test.com',
      onboarding_complete: false,
    } as any)

    const result = await provisionSignupUser({
      authUserId: 'auth-user-123',
      email: 'existing@test.com',
    })

    expect(result.isNew).toBe(false)
    expect(result.id).toBe('tu-existing')
  })

  test('links and updates tenant_users record when matched by email', async () => {
    prismaMock.tenant_users.findFirst
      .mockResolvedValueOnce(null) // by auth_user_id
      .mockResolvedValueOnce({
        id: 'tu-invited',
        auth_user_id: null,
        email: 'invited@test.com',
        onboarding_complete: false,
      } as any) // by email

    prismaMock.tenant_users.update.mockResolvedValueOnce({
      id: 'tu-invited',
      auth_user_id: 'auth-user-456',
      email: 'invited@test.com',
      onboarding_complete: false,
    } as any)

    const result = await provisionSignupUser({
      authUserId: 'auth-user-456',
      email: 'invited@test.com',
      firstName: 'Jane',
    })

    expect(result.isNew).toBe(false)
    expect(result.authUserId).toBe('auth-user-456')
    expect(prismaMock.tenant_users.update).toHaveBeenCalled()
  })
})

describe('executeCompleteTenantOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('pre-check returns early if tenant already has onboarding_complete: true', async () => {
    prismaMock.tenants.findFirst.mockResolvedValueOnce({
      id: 'tenant-existing-1',
      tenant_code: 'TNT-12345',
      onboarding_complete: true,
    } as any)

    const result = await executeCompleteTenantOnboarding({
      authUserId: 'auth-user-123',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'My Restaurant',
      countryId: 'US',
      activity: 'restaurant',
      paymentMethod: 'cash',
      subscriptionId: 'sub-1',
    })

    expect(result.success).toBe(true)
    expect(result.tenantId).toBe('tenant-existing-1')
    expect(result.tenantCode).toBe('TNT-12345')
    // Should not run transaction or create new tenant
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test('creates new tenant with onboarding_complete: true when running onboarding', async () => {
    // 1. Pre-check: no existing completed tenant, slug/code check returns null
    prismaMock.tenants.findFirst.mockResolvedValue(null)

    // 2. Country lookup
    prismaMock.countries.findUnique.mockResolvedValue({
      id: 'c-1',
      code: 'USA',
      name: 'United States',
      currencies: { id: 'curr-1', code: 'USD' },
    } as any)
    prismaMock.countries.findFirst.mockResolvedValue({
      id: 'c-1',
      code: 'USA',
      name: 'United States',
      currencies: { id: 'curr-1', code: 'USD' },
    } as any)

    // 3. Subscriptions lookup
    prismaMock.subscriptions.findUnique.mockResolvedValue({
      id: 'sub-1',
      duration_months: 1,
    } as any)
    prismaMock.subscriptions.findFirst.mockResolvedValue({
      id: 'sub-1',
      duration_months: 1,
    } as any)

    // Mock $transaction callback execution
    const mockTx = {
      tenants: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'new-tenant-1',
          tenant_code: 'TNT-99999',
          onboarding_complete: true,
        }),
        update: vi.fn(),
      },
      tenant_subscriptions: {
        create: vi.fn().mockResolvedValue({
          id: 'ts-1',
        }),
      },
      tenant_users: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'tu-1',
          onboarding_complete: true,
        }),
        update: vi.fn(),
      },
      roles: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'role-superadmin',
          name: 'super_admin',
        }),
      },
      user_roles: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      business_activity_types: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'act-rest',
          code: 'restaurant',
          name: 'Restaurant',
        }),
      },
      tenant_activity_types: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    }

    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      return cb(mockTx)
    })

    const result = await executeCompleteTenantOnboarding({
      authUserId: 'auth-user-123',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Awesome Bistro',
      countryId: 'c-1',
      activity: 'restaurant',
      paymentMethod: 'cash',
      subscriptionId: 'sub-1',
    })

    expect(result.success).toBe(true)
    expect(result.tenantId).toBe('new-tenant-1')
    expect(mockTx.tenants.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auth_user_id: 'auth-user-123',
          name: 'Awesome Bistro',
          onboarding_complete: true,
        }),
      })
    )
  })
})
