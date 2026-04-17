import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAnalyticsOrders } from './queries'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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

describe('useAnalyticsOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches filtered res_orders analytics data with joins', async () => {
    const mockOrders = [
      {
        id: 'o1',
        status: 'paid',
        total_amount: 120,
        created_at: '2026-04-18T10:00:00.000Z',
        table: { id: 't1', table_number: 'T1', floor_id: 'f1' },
        order_items: [
          {
            id: 'oi1',
            quantity: 2,
            unit_price: 60,
            menu_item: { id: 'm1', name: 'Burger' },
          },
        ],
      },
    ]

    const order = vi.fn().mockResolvedValue({ data: mockOrders, error: null })
    const gte = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ gte })

    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useAnalyticsOrders({ days: 15 }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('res_orders')
    expect(gte).toHaveBeenCalledWith('created_at', expect.any(String))
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result.current.data).toEqual(mockOrders)
  })
})
