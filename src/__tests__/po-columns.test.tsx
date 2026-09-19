import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { getPOColumns } from '@/features/purchase-orders/components/po-columns'
import type { PurchaseOrder } from '@/features/purchase-orders/hooks/use-purchase-orders'

describe('getPOColumns - Destination column', () => {
  const warehouses = [
    { id: 'wh-1', name: 'Cairo Central Warehouse' },
    { id: 'wh-2', name: 'Alexandria Hub' },
  ]

  const mockT = (key: string, fallback: string) => fallback

  it('renders destination warehouse name from direct warehouses relation', () => {
    const columns = getPOColumns(mockT, warehouses)
    const destColumn = columns.find((c) => c.id === 'destination')!

    const mockRow = {
      original: {
        po_id: '1',
        warehouse_id: 'wh-1',
        warehouses: { id: 'wh-1', name: 'Cairo Central Warehouse' },
      } as PurchaseOrder,
    }

    const { container } = render(
      // @ts-expect-error test cell render
      destColumn.cell({ row: mockRow })
    )

    expect(container).toHaveTextContent('Cairo Central Warehouse')
  })

  it('renders destination warehouse name from array relation', () => {
    const columns = getPOColumns(mockT, warehouses)
    const destColumn = columns.find((c) => c.id === 'destination')!

    const mockRow = {
      original: {
        po_id: '2',
        warehouse_id: 'wh-2',
        // PostgREST array format
        warehouses: [{ id: 'wh-2', name: 'Alexandria Hub' }] as unknown as { id: string; name: string },
      } as PurchaseOrder,
    }

    const { container } = render(
      // @ts-expect-error test cell render
      destColumn.cell({ row: mockRow })
    )

    expect(container).toHaveTextContent('Alexandria Hub')
  })

  it('resolves destination from cached warehouses array when relation is missing', () => {
    const columns = getPOColumns(mockT, warehouses)
    const destColumn = columns.find((c) => c.id === 'destination')!

    const mockRow = {
      original: {
        po_id: '3',
        warehouse_id: 'wh-1',
        warehouses: null,
      } as unknown as PurchaseOrder,
    }

    const { container } = render(
      // @ts-expect-error test cell render
      destColumn.cell({ row: mockRow })
    )

    expect(container).toHaveTextContent('Cairo Central Warehouse')
  })

  it('renders Unassigned when warehouse_id is null or unassigned', () => {
    const columns = getPOColumns(mockT, warehouses)
    const destColumn = columns.find((c) => c.id === 'destination')!

    const mockRow = {
      original: {
        po_id: '4',
        warehouse_id: null,
        warehouses: null,
      } as unknown as PurchaseOrder,
    }

    const { container } = render(
      // @ts-expect-error test cell render
      destColumn.cell({ row: mockRow })
    )

    expect(container).toHaveTextContent('Unassigned')
  })
})
