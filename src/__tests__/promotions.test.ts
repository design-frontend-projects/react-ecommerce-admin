import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
} from '@/features/promotions/hooks/use-promotions'
import { supabase } from '@/lib/supabase'
import { resolveClientTenantId } from '@/lib/client-tenant'

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

vi.mock('@/lib/supabase', () => {
  const queryBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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

vi.mock('@/lib/client-tenant', () => ({
  resolveClientTenantId: vi.fn().mockResolvedValue('tenant-uuid-1234'),
}))

describe('Promotions Hooks & Integration', () => {
  let queryClient: QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('fetches promotions and maps id and promotion_id correctly', async () => {
    const mockPromotions = [
      {
        id: 'promo-uuid-1',
        name: 'Summer Sale',
        code: 'SUMMER20',
        discount_type: 'percentage',
        discount_value: 20,
        minimum_purchase: 50,
        start_date: '2026-06-01T00:00:00Z',
        end_date: '2026-08-31T23:59:59Z',
        is_active: true,
        activities: ['dine_in', 'takeaway'],
        promo_type: 'order_discount',
        scopes: [],
      },
    ]

    const qb = supabase.from('promotions') as unknown as MockQueryBuilder
    qb.eq.mockResolvedValueOnce({ data: mockPromotions, error: null })

    const { result } = renderHook(() => usePromotions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe('promo-uuid-1')
    expect(result.current.data?.[0].promotion_id).toBe('promo-uuid-1')
    expect(result.current.data?.[0].name).toBe('Summer Sale')
    expect(qb.select).toHaveBeenCalledWith('*, scopes:promotion_menu_scopes(*)')
  })

  it('creates promotion with resolved tenant_id and replaces scopes', async () => {
    const qb = supabase.from('promotions') as unknown as MockQueryBuilder
    qb.maybeSingle.mockResolvedValueOnce({
      data: { id: 'promo-uuid-created', name: 'New Promo' },
      error: null,
    })

    const { result } = renderHook(() => useCreatePromotion(), { wrapper })

    await result.current.mutateAsync({
      name: 'New Promo',
      code: 'NEWPROMO',
      discount_type: 'fixed',
      discount_value: 10,
      activities: ['dine_in'],
      promo_type: 'order_discount',
      scopes: [],
    })

    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Promo',
        code: 'NEWPROMO',
        tenant_id: 'tenant-uuid-1234',
      })
    )
  })

  it('creates promotion with scopes when tenantId is null', async () => {
    vi.mocked(resolveClientTenantId).mockResolvedValueOnce(null)

    const qb = supabase.from('promotions') as unknown as MockQueryBuilder
    qb.maybeSingle.mockResolvedValueOnce({
      data: { id: 'promo-uuid-created', name: 'Null Tenant Promo' },
      error: null,
    })

    const { result } = renderHook(() => useCreatePromotion(), { wrapper })

    await result.current.mutateAsync({
      name: 'Null Tenant Promo',
      code: 'NULLTENANT',
      discount_type: 'fixed',
      discount_value: 5,
      activities: ['dine_in'],
      promo_type: 'item_discount',
      scopes: [
        {
          menu_item_id: 'item-1',
          scope_role: 'target',
        },
      ],
    })

    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Null Tenant Promo',
        code: 'NULLTENANT',
      })
    )
    expect(supabase.from).toHaveBeenCalledWith('promotion_menu_scopes')
  })

  it('updates promotion using id column', async () => {
    const qb = supabase.from('promotions') as unknown as MockQueryBuilder
    qb.maybeSingle.mockResolvedValueOnce({
      data: { id: 'promo-uuid-1', name: 'Updated Promo' },
      error: null,
    })

    const { result } = renderHook(() => useUpdatePromotion(), { wrapper })

    await result.current.mutateAsync({
      id: 'promo-uuid-1',
      name: 'Updated Promo',
      code: 'PROMO1',
      discount_type: 'percentage',
      discount_value: 15,
      activities: ['dine_in'],
      promo_type: 'order_discount',
    })

    expect(qb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Promo',
      })
    )
    expect(qb.eq).toHaveBeenCalledWith('id', 'promo-uuid-1')
  })

  it('deletes promotion using id column', async () => {
    const qb = supabase.from('promotions') as unknown as MockQueryBuilder
    qb.eq.mockResolvedValueOnce({ error: null })

    const { result } = renderHook(() => useDeletePromotion(), { wrapper })

    await result.current.mutateAsync('promo-uuid-delete')

    expect(qb.delete).toHaveBeenCalled()
    expect(qb.eq).toHaveBeenCalledWith('id', 'promo-uuid-delete')
  })
})
