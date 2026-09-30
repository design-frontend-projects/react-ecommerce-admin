import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StockMovementDrawer } from '@/features/stock-balances/components/stock-movement-drawer'
import * as stockBalancesHook from '@/features/stock-balances/hooks/use-stock-balances'
import { fetchStockBalanceMovements } from '@/features/stock-balances/data/actions'
import * as authorizedRequestModule from '@/lib/authorized-request'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      if (defaultVal && typeof defaultVal === 'object' && 'defaultValue' in defaultVal) {
        return (defaultVal as any).defaultValue
      }
      return _key
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: ({ children }: any) => children,
}))

describe('StockMovementDrawer & Actions Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchStockBalanceMovements unwraps object envelope { movements: [...] } correctly', async () => {
    const mockMovements = [
      {
        id: 'mov-1',
        product_variant_id: 'var-1',
        movement_type: 'purchase',
        quantity_delta: 10,
        qty_before: 0,
        qty_after: 10,
        movement_date: '2026-09-29T12:00:00Z',
      },
    ]

    vi.spyOn(authorizedRequestModule, 'authorizedRequest').mockResolvedValueOnce({
      success: true,
      data: {
        movements: mockMovements,
        totalCount: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
    })

    const result = await fetchStockBalanceMovements(
      vi.fn().mockResolvedValue('fake-token'),
      'var-1',
      { warehouseId: 'wh-1' }
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('mov-1')
  })

  it('fetchStockBalanceMovements handles raw array { data: [...] } without error', async () => {
    const mockMovements = [
      {
        id: 'mov-2',
        product_variant_id: 'var-2',
        movement_type: 'sale',
        quantity_delta: -5,
        qty_before: 10,
        qty_after: 5,
        movement_date: '2026-09-29T13:00:00Z',
      },
    ]

    vi.spyOn(authorizedRequestModule, 'authorizedRequest').mockResolvedValueOnce({
      success: true,
      data: mockMovements,
    })

    const result = await fetchStockBalanceMovements(
      vi.fn().mockResolvedValue('fake-token'),
      'var-2'
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('mov-2')
  })

  it('StockMovementDrawer does not crash when movements is an object envelope { movements: [...] }', () => {
    vi.spyOn(stockBalancesHook, 'useStockBalanceMovements').mockReturnValue({
      data: {
        movements: [
          {
            id: 'mov-1',
            movement_type: 'purchase',
            quantity_delta: 20,
            movement_date: '2026-09-29T12:00:00Z',
            condition: 'good',
          },
        ],
      } as any,
      isLoading: false,
    } as any)

    render(
      <StockMovementDrawer
        currentRow={
          {
            id: 'row-1',
            product_variant_id: 'var-1',
            warehouse_id: 'wh-1',
            qty_on_hand: 20,
            qty_reserved: 0,
            qty_available: 20,
            product_variants: {
              sku: 'TEST-SKU-1',
              products: { name: 'Test Product 1' },
            },
          } as any
        }
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('1 Record(s)')).toBeInTheDocument()
    expect(screen.getByText('+20')).toBeInTheDocument()
  })

  it('StockMovementDrawer renders empty state without throwing when movements is empty', () => {
    vi.spyOn(stockBalancesHook, 'useStockBalanceMovements').mockReturnValue({
      data: [] as any,
      isLoading: false,
    } as any)

    render(
      <StockMovementDrawer
        currentRow={
          {
            id: 'row-2',
            product_variant_id: 'var-2',
            qty_on_hand: 0,
            qty_reserved: 0,
            qty_available: 0,
          } as any
        }
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText('No inventory movements recorded yet')).toBeInTheDocument()
  })
})
