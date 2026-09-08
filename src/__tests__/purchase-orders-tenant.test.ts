import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { User } from '@supabase/supabase-js'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  usePurchaseOrders,
} from '@/features/purchase-orders/hooks/use-purchase-orders'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: '22222222-2222-2222-2222-222222222222' },
  }),
}))

// Mock useAuthEnabled
vi.mock('@/hooks/use-auth-query', () => ({
  useAuthEnabled: () => ({
    authEnabled: true,
  }),
}))

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
  then: (onfulfilled?: (value: unknown) => unknown) => Promise<unknown>
}

let poQueryBuilder: MockQueryBuilder
let itemsQueryBuilder: MockQueryBuilder

const createMockBuilder = (): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: (fn?: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(fn),
  }
  return builder
}

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'purchase_order_items') {
          return itemsQueryBuilder
        }
        return poQueryBuilder
      }),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  }
})

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

describe('Purchase Orders Multi-Tenant & Audit Isolation', () => {
  const mockTenantId = '11111111-1111-1111-1111-111111111111'
  const mockUserId = '22222222-2222-2222-2222-222222222222'

  beforeEach(() => {
    vi.clearAllMocks()

    poQueryBuilder = createMockBuilder()
    itemsQueryBuilder = createMockBuilder()

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

  it('injects tenant_id and audit fields when creating a purchase order and line items', async () => {
    const mockCreatedPo = {
      id: 'po-123',
      tenant_id: mockTenantId,
      supplier_id: 'supplier-456',
      total_amount: 150,
    }

    poQueryBuilder.maybeSingle.mockResolvedValue({
      data: mockCreatedPo,
      error: null,
    })

    itemsQueryBuilder.insert.mockResolvedValue({
      data: null,
      error: null,
    })

    const { result } = renderHook(() => useCreatePurchaseOrder(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      order: {
        supplier_id: 'supplier-456',
        order_date: '2026-09-10',
        expected_delivery_date: '2026-09-15',
        notes: 'Test delivery notes',
      },
      items: [
        {
          product_id: 'prod-1',
          product_variant_id: 'var-1',
          quantity_ordered: 10,
          unit_cost: 15,
          subtotal: 150,
        },
      ],
    })

    // Verify purchase_orders insert contains tenant_id and audit fields
    expect(poQueryBuilder.insert).toHaveBeenCalledTimes(1)
    const insertedPo = poQueryBuilder.insert.mock.calls[0][0]
    expect(insertedPo.tenant_id).toBe(mockTenantId)
    expect(insertedPo.supplier_id).toBe('supplier-456')
    expect(insertedPo.total_amount).toBe(150)
    expect(insertedPo.created_by_user_id).toBe(mockUserId)
    expect(insertedPo.updated_by_user_id).toBe(mockUserId)

    // Verify purchase_order_items insert contains tenant_id and audit fields
    expect(itemsQueryBuilder.insert).toHaveBeenCalledTimes(1)
    const insertedItems = itemsQueryBuilder.insert.mock.calls[0][0]
    expect(insertedItems).toHaveLength(1)
    expect(insertedItems[0].tenant_id).toBe(mockTenantId)
    expect(insertedItems[0].po_id).toBe('po-123')
    expect(insertedItems[0].product_id).toBe('prod-1')
    expect(insertedItems[0].product_variant_id).toBe('var-1')
    expect(insertedItems[0].created_by_user_id).toBe(mockUserId)
    expect(insertedItems[0].updated_by_user_id).toBe(mockUserId)
  })

  it('injects tenant_id and scopes queries when updating a purchase order', async () => {
    const mockUpdatedPo = {
      id: 'po-123',
      tenant_id: mockTenantId,
      supplier_id: 'supplier-456',
      total_amount: 200,
    }

    poQueryBuilder.maybeSingle.mockResolvedValue({
      data: mockUpdatedPo,
      error: null,
    })

    itemsQueryBuilder.insert.mockResolvedValue({
      data: null,
      error: null,
    })

    const { result } = renderHook(() => useUpdatePurchaseOrder(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      id: 'po-123',
      order: {
        supplier_id: 'supplier-456',
        order_date: '2026-09-10',
      },
      items: [
        {
          product_id: 'prod-2',
          product_variant_id: 'var-2',
          quantity_ordered: 5,
          unit_cost: 40,
          subtotal: 200,
        },
      ],
    })

    // Verify purchase_orders update
    expect(poQueryBuilder.update).toHaveBeenCalledTimes(1)
    const updateCall = poQueryBuilder.update.mock.calls[0][0]
    expect(updateCall.updated_by_user_id).toBe(mockUserId)
    expect(poQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)

    // Verify items re-inserted with tenant_id
    expect(itemsQueryBuilder.insert).toHaveBeenCalledTimes(1)
    const insertedItems = itemsQueryBuilder.insert.mock.calls[0][0]
    expect(insertedItems[0].tenant_id).toBe(mockTenantId)
    expect(insertedItems[0].po_id).toBe('po-123')
  })

  it('filters purchase orders listing by tenant_id', async () => {
    poQueryBuilder.order.mockResolvedValue({
      data: [
        {
          id: 'po-1',
          tenant_id: mockTenantId,
          order_date: '2026-09-10',
          suppliers: { name: 'Acme' },
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => usePurchaseOrders(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(poQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
    expect(result.current.data?.[0].id).toBe('po-1')
  })

  it('rejects creation when tenant_id cannot be resolved', async () => {
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
    poQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useCreatePurchaseOrder(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({
        order: {
          supplier_id: 'supplier-456',
          order_date: '2026-09-10',
        },
        items: [],
      })
    ).rejects.toThrow('Tenant ID could not be identified')
  })
})
