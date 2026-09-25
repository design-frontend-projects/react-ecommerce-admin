import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InventoryMovementsDrawer } from '@/features/inventory-movements/components/inventory-movements-drawer'
import type { MovementRow } from '@/features/inventory-movements/data/schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: any) => {
      if (typeof defaultValue === 'string') return defaultValue
      if (defaultValue && typeof defaultValue === 'object' && defaultValue.defaultValue) {
        return defaultValue.defaultValue
      }
      return key
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

const mockMovement: MovementRow = {
  id: 'mov-audit-1',
  movement_no: '2026-4412',
  movement_type: 'purchase',
  movement_date: '2026-09-25T10:00:00Z',
  occurred_at: '2026-09-25T10:00:00Z',
  created_at: '2026-09-25T10:00:00Z',
  quantity_delta: 150,
  qty: 150,
  qty_in: 150,
  qty_out: 0,
  qty_before: 50,
  qty_after: 200,
  unit_cost: 25.5,
  total_cost: 3825,
  warehouse_id: 'wh-main',
  store_id: null,
  branch_id: null,
  warehouse_location_id: 'loc-aisle-2',
  location_id: null,
  condition: 'good',
  batch_id: 'BATCH-2026-X',
  serial_id: 'SER-99901',
  reference_type: 'purchase_order',
  reference_id: 'PO-8812',
  source_document_type: 'Purchase Order',
  source_document_id: 'PO-8812',
  remarks: 'Air freight delivery received in full',
  notes: 'Checked by quality inspector',
  product_variant_id: 'var-99',
  product_variants: {
    id: 'var-99',
    sku: 'SKU-PREMIUM-JACKET',
    barcode: '7788990011',
    name: 'Winter Down Jacket - Navy L',
  },
  warehouses: {
    id: 'wh-main',
    name: 'Primary Hub Warehouse',
    code: 'PHW',
  },
  stores: null,
  branches: null,
  warehouse_locations: {
    id: 'loc-aisle-2',
    code: 'B2-S4',
    name: 'Bay 2 Shelf 4',
  },
}

describe('InventoryMovementsDrawer - User Story 3 (Audit Inspection Drawer)', () => {
  it('renders all detailed attributes when opened with a movement', () => {
    render(
      <InventoryMovementsDrawer
        movement={mockMovement}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    // Header & Movement Number
    expect(screen.getByText('Movement #2026-4412')).toBeInTheDocument()

    // Product Info
    expect(screen.getByText('SKU-PREMIUM-JACKET')).toBeInTheDocument()
    expect(screen.getByText('Winter Down Jacket - Navy L')).toBeInTheDocument()
    expect(screen.getByText('7788990011')).toBeInTheDocument()

    // Quantities & Balances
    expect(screen.getByText('+150')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()

    // Tracking
    expect(screen.getByText('BATCH-2026-X')).toBeInTheDocument()
    expect(screen.getByText('SER-99901')).toBeInTheDocument()

    // Valuation
    expect(screen.getByText('$25.50')).toBeInTheDocument()
    expect(screen.getByText('$3825.00')).toBeInTheDocument()

    // Location
    expect(screen.getByText('Primary Hub Warehouse (PHW)')).toBeInTheDocument()

    // Remarks & Notes
    expect(screen.getByText('Air freight delivery received in full')).toBeInTheDocument()
    expect(screen.getByText('Checked by quality inspector')).toBeInTheDocument()
  })

  it('does not render content when movement is null', () => {
    const { container } = render(
      <InventoryMovementsDrawer
        movement={null}
        open={false}
        onOpenChange={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
