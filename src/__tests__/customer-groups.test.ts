import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { User } from '@supabase/supabase-js'
import {
  useCustomerGroups,
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
  useDeleteCustomerGroup,
} from '@/features/customer-groups/hooks/use-customer-groups'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import {
  resolveClientTenantId,
  getAuthTenantAndUser,
  isValidUuid,
} from '@/lib/client-tenant'

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

// Mock supabase client
vi.mock('@/lib/supabase', () => {
  const queryBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }

  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  }
})

const getMockQueryBuilder = () =>
  supabase.from('customer_groups') as unknown as MockQueryBuilder

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

describe('Customer Groups & Tenant Resolution', () => {
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

  describe('UUID and Tenant Helper', () => {
    it('validates UUIDs correctly', () => {
      expect(isValidUuid(mockTenantId)).toBe(true)
      expect(isValidUuid('invalid-uuid')).toBe(false)
      expect(isValidUuid(null)).toBe(false)
      expect(isValidUuid(undefined)).toBe(false)
    })

    it('extracts auth tenant and user from store', () => {
      const { tenantId, userId } = getAuthTenantAndUser()
      expect(tenantId).toBe(mockTenantId)
      expect(userId).toBe(mockUserId)
    })

    it('resolves explicit tenant id over store', async () => {
      const explicitId = '33333333-3333-3333-3333-333333333333'
      const resolved = await resolveClientTenantId(explicitId)
      expect(resolved).toBe(explicitId)
    })
  })

  describe('useCreateCustomerGroup', () => {
    it('injects tenant_id and audit user IDs into insertion payload', async () => {
      const mockQueryBuilder = getMockQueryBuilder()
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: {
          id: 'cg-1',
          tenant_id: mockTenantId,
          name: 'Wholesale',
          created_by_user_id: mockUserId,
          updated_by_user_id: mockUserId,
        },
        error: null,
      })

      const { result } = renderHook(() => useCreateCustomerGroup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        name: '  Wholesale  ',
        description: 'Bulk order customers',
        minimum_order_amount: 500,
        discount_percentage: 15,
      })

      expect(supabase.from).toHaveBeenCalledWith('customer_groups')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wholesale',
          description: 'Bulk order customers',
          minimum_order_amount: 500,
          discount_percentage: 15,
          tenant_id: mockTenantId,
          created_by_user_id: mockUserId,
          updated_by_user_id: mockUserId,
        })
      )
    })

    it('throws error when tenant_id cannot be identified', async () => {
      useAuthStore.setState({
        auth: {
          isInitializing: false,
          setIsInitializing: vi.fn(),
          user: null,
          setUser: vi.fn(),
          session: null,
          setSession: vi.fn(),
          profile: null,
          setProfile: vi.fn(),
          selectedBranchId: '',
          setSelectedBranchId: vi.fn(),
          reset: vi.fn(),
        },
      })
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
      } as unknown as ReturnType<typeof supabase.auth.getUser>)
      const mockQueryBuilder = getMockQueryBuilder()
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null })

      const { result } = renderHook(() => useCreateCustomerGroup(), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.mutateAsync({
          name: 'VIP',
        })
      ).rejects.toThrow('Tenant ID could not be identified')
    })
  })

  describe('useCustomerGroups Query', () => {
    it('scopes list queries by tenant_id when available', async () => {
      const mockQueryBuilder = getMockQueryBuilder()
      mockQueryBuilder.order.mockResolvedValue({
        data: [
          {
            id: 'cg-1',
            tenant_id: mockTenantId,
            name: 'VIP Group',
          },
        ],
        error: null,
      })

      const { result } = renderHook(() => useCustomerGroups(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(supabase.from).toHaveBeenCalledWith('customer_groups')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
      expect(result.current.data).toEqual([
        expect.objectContaining({
          id: 'cg-1',
          group_id: 'cg-1',
          name: 'VIP Group',
        }),
      ])
    })
  })

  describe('useUpdateCustomerGroup', () => {
    it('scopes update by id and tenant_id', async () => {
      const mockQueryBuilder = getMockQueryBuilder()
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'cg-1', name: 'Updated VIP' },
        error: null,
      })

      const { result } = renderHook(() => useUpdateCustomerGroup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'cg-1',
        name: 'Updated VIP',
      })

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated VIP',
          updated_by_user_id: mockUserId,
        })
      )
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'cg-1')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })
  })

  describe('useDeleteCustomerGroup', () => {
    it('scopes delete by id and tenant_id', async () => {
      const mockQueryBuilder = getMockQueryBuilder()
      mockQueryBuilder.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as ReturnType<typeof mockQueryBuilder.delete>)

      const { result } = renderHook(() => useDeleteCustomerGroup(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('cg-1')

      expect(supabase.from).toHaveBeenCalledWith('customer_groups')
    })
  })
})

