import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StockLedgerPage } from '@/features/inventory/pages/stock-ledger'
import { fetchMovements } from '@/features/inventory-movements/data/actions'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | { defaultValue?: string; [k: string]: unknown }) => {
      if (typeof defaultVal === 'string') return defaultVal
      if (defaultVal && typeof defaultVal === 'object' && defaultVal.defaultValue) {
        let str = defaultVal.defaultValue
        for (const [k, v] of Object.entries(defaultVal)) {
          if (k !== 'defaultValue') {
            str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
          }
        }
        return str
      }
      return key
    },
  }),
}))

vi.mock('@/stores/auth-store', () => {
  const mockState = {
    auth: {
      user: { id: 'user-123', email: 'test@example.com' },
      session: { user: { id: 'user-123' }, access_token: 'mock-token' },
      isInitializing: false,
    },
  }
  const store = (selector: (state: typeof mockState) => unknown) => selector(mockState)
  store.getState = () => mockState
  store.setState = vi.fn()
  return { useAuthStore: store }
})

import { supabase } from '@/lib/supabase'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true,
    has: () => true,
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ store_id: 'store-1', name: 'Downtown Store' }],
        error: null,
      }),
    }),
  },
}))

vi.mock('@/features/inventory-movements/data/actions', () => ({
  fetchMovements: vi.fn(),
}))

describe('StockLedgerPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ store_id: 'store-1', name: 'Downtown Store' }],
        error: null,
      }),
    } as any)
  })

  it('renders movement records and running balance without attempting to access PrismaClient directly in the browser', async () => {
    vi.mocked(fetchMovements).mockResolvedValue([
      {
        id: 'mov-1',
        movement_type: 'opening_stock',
        movement_date: '2026-09-01T10:00:00Z',
        qty: 100,
        quantity_delta: 100,
        unit_cost: 10,
        total_cost: 1000,
        product_variant_id: 'var-1',
        store_id: 'store-1',
        reference_id: 'REF-001',
        reference_type: 'opening',
        product_variants: {
          id: 'var-1',
          sku: 'SKU-COFFEE-01',
        },
        stores: {
          store_id: 'store-1',
          name: 'Downtown Store',
        },
      } as any,
      {
        id: 'mov-2',
        movement_type: 'sale',
        movement_date: '2026-09-02T15:00:00Z',
        qty: -20,
        quantity_delta: -20,
        unit_cost: 10,
        total_cost: 200,
        product_variant_id: 'var-1',
        store_id: 'store-1',
        reference_id: 'INV-001',
        reference_type: 'sale',
        product_variants: {
          id: 'var-1',
          sku: 'SKU-COFFEE-01',
        },
        stores: {
          store_id: 'store-1',
          name: 'Downtown Store',
        },
      } as any,
    ])

    render(
      <QueryClientProvider client={queryClient}>
        <StockLedgerPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(fetchMovements).toHaveBeenCalled()
      expect(screen.getAllByText('SKU-COFFEE-01').length).toBe(2)
    })

    expect(screen.getAllByText('Downtown Store').length).toBe(2)
    expect(screen.getByText('+100')).toBeInTheDocument()
    expect(screen.getByText('-20')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument() // Running balance for the latest entry
  })
})
