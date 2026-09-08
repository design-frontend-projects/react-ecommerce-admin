import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { User } from '@supabase/supabase-js'
import {
  useStores,
  useStore,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
} from '@/features/stores/hooks/use-stores'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

// Mock auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: '22222222-2222-2222-2222-222222222222' },
  }),
  useUser: () => ({
    user: { id: '22222222-2222-2222-2222-222222222222' },
  }),
}))

vi.mock('@/hooks/use-auth-query', () => ({
  useAuthEnabled: () => ({ authEnabled: true }),
}))

// Mock supabase client
vi.mock('@/lib/supabase', () => {
  const queryBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }

  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  }
})

const getMockQueryBuilder = () =>
  supabase.from('stores') as unknown as MockQueryBuilder

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('Stores Multi-Tenancy & Error Prevention', () => {
  const mockTenantId = '11111111-1111-1111-1111-111111111111'
  const mockUserId = '22222222-2222-2222-2222-222222222222'

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      auth: {
        isInitializing: false,
        setIsInitializing: vi.fn(),
        user: { id: mockUserId } as unknown as User,
        setUser: vi.fn(),
        session: null,
        setSession: vi.fn(),
        profile: {
          id: mockUserId,
          tenant_id: mockTenantId,
          auth_user_id: mockUserId,
        },
        setProfile: vi.fn(),
        selectedBranchId: '',
        setSelectedBranchId: vi.fn(),
        reset: vi.fn(),
      },
    })
  })

  describe('useCreateStore', () => {
    it('successfully injects tenant_id and audit fields, and strips obsolete auth_user_id', async () => {
      const qb = getMockQueryBuilder()
      qb.maybeSingle.mockResolvedValueOnce({
        data: {
          store_id: '44444444-4444-4444-4444-444444444444',
          name: 'Downtown Store',
          tenant_id: mockTenantId,
        },
        error: null,
      })

      const { result } = renderHook(() => useCreateStore(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        name: 'Downtown Store',
        status: true,
        phone: '1234567890',
        city_id: '55555555-5555-5555-5555-555555555555',
        country_id: '66666666-6666-6666-6666-666666666666',
        branch_id: '',
        // Accidental or legacy auth_user_id passed in payload
        auth_user_id: 'user-to-strip',
      } as any)

      expect(supabase.from).toHaveBeenCalledWith('stores')
      expect(qb.insert).toHaveBeenCalledTimes(1)

      const payload = qb.insert.mock.calls[0][0]
      // Crucial: auth_user_id must be stripped to prevent PGRST204 error
      expect(payload.auth_user_id).toBeUndefined()
      // Tenant ID must be present
      expect(payload.tenant_id).toBe(mockTenantId)
      // Audit fields must be populated
      expect(payload.created_by_user_id).toBe(mockUserId)
      expect(payload.updated_by_user_id).toBe(mockUserId)
      // Empty string foreign key should be normalized to null
      expect(payload.branch_id).toBeNull()
      expect(payload.name).toBe('Downtown Store')
    })
  })

  describe('useUpdateStore', () => {
    it('scopes update by store_id and tenant_id, attaches updated_by_user_id, and strips auth_user_id', async () => {
      const qb = getMockQueryBuilder()
      qb.maybeSingle.mockResolvedValueOnce({
        data: {
          store_id: '44444444-4444-4444-4444-444444444444',
          name: 'Updated Store',
          tenant_id: mockTenantId,
        },
        error: null,
      })

      const { result } = renderHook(() => useUpdateStore(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        store_id: '44444444-4444-4444-4444-444444444444',
        name: 'Updated Store',
        auth_user_id: 'should-not-exist',
      } as any)

      expect(qb.update).toHaveBeenCalledTimes(1)
      const updatePayload = qb.update.mock.calls[0][0]
      expect(updatePayload.auth_user_id).toBeUndefined()
      expect(updatePayload.updated_by_user_id).toBe(mockUserId)

      expect(qb.eq).toHaveBeenCalledWith('store_id', '44444444-4444-4444-4444-444444444444')
      expect(qb.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })
  })

  describe('useStores and useDeleteStore', () => {
    it('scopes listing by tenant_id', async () => {
      const qb = getMockQueryBuilder()

      renderHook(() => useStores('test'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('stores')
        expect(qb.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
        expect(qb.ilike).toHaveBeenCalledWith('name', '%test%')
      })
    })

    it('scopes deletion by store_id and tenant_id', async () => {
      const qb = getMockQueryBuilder()

      const { result } = renderHook(() => useDeleteStore(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('44444444-4444-4444-4444-444444444444')

      expect(qb.delete).toHaveBeenCalledTimes(1)
      expect(qb.eq).toHaveBeenCalledWith('store_id', '44444444-4444-4444-4444-444444444444')
      expect(qb.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })
  })
})
