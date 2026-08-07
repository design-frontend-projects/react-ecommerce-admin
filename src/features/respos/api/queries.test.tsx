import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { useMenuCategories, useMenuItemsWithDetails } from './queries'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  },
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

describe('ResPOS Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch categories from Supabase', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Drinks',
        sort_order: 1,
        is_active: true,
        created_at: '2023-01-01',
      },
    ]

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockImplementationOnce(
      () =>
        ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi
            .fn()
            .mockResolvedValue({ data: mockCategories, error: null }),
        }) as any
    )

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMenuCategories(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategories)
  })

  it('should fetch menu items with details from Supabase', async () => {
    const mockItems = [
      {
        id: 'item1',
        name: 'Burger',
        base_price: 10,
        category_id: 'cat1',
        created_at: '',
        updated_at: '',
        is_available: true,
        is_active: true,
      },
    ]
    const mockVariants = [
      { id: 'v1', item_id: 'item1', name: 'Cheese', price_adjustment: 2 },
    ]
    const mockProperties = [
      { id: 'p1', item_id: 'item1', name: 'Spicy', options: [] },
    ]

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'res_menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        } as any
      }
      if (table === 'res_item_variants') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockVariants, error: null }),
        } as any
      }
      if (table === 'res_item_properties') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockProperties, error: null }),
        } as any
      }
      return {
        select: vi.fn().mockReturnThis(),
      } as any
    })

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMenuItemsWithDetails(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.[0].variants).toEqual(mockVariants)
    expect(result.current.data?.[0].properties).toEqual(mockProperties)
  })
})
