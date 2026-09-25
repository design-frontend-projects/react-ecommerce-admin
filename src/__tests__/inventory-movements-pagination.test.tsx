import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InventoryMovementsTable } from '@/features/inventory-movements/components/inventory-movements-table'
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

const mockMovements: MovementRow[] = [
  {
    id: 'mov-1',
    movement_no: '1001',
    movement_type: 'purchase',
    movement_date: '2026-09-25T10:00:00Z',
    occurred_at: '2026-09-25T10:00:00Z',
    created_at: '2026-09-25T10:00:00Z',
    quantity_delta: 50,
    qty: 50,
    qty_in: 50,
    qty_out: 0,
    qty_before: 100,
    qty_after: 150,
    unit_cost: 20,
    total_cost: 1000,
    warehouse_id: 'wh-1',
    store_id: null,
    branch_id: null,
    warehouse_location_id: 'loc-1',
    location_id: null,
    condition: 'good',
    batch_id: 'BATCH-A',
    serial_id: null,
    reference_type: 'purchase_order',
    reference_id: 'PO-99',
    source_document_type: 'Purchase Order',
    source_document_id: 'PO-99',
    remarks: 'Received fresh stock',
    notes: null,
    product_variant_id: 'var-1',
    product_variants: {
      id: 'var-1',
      sku: 'SKU-APPLE-01',
      barcode: '12345678',
      name: 'Organic Red Apple',
    },
    warehouses: {
      id: 'wh-1',
      name: 'Central Warehouse',
      code: 'CWH',
    },
    stores: null,
    branches: null,
    warehouse_locations: {
      id: 'loc-1',
      code: 'A1-S2',
      name: 'Aisle 1',
    },
  },
  {
    id: 'mov-2',
    movement_no: '1002',
    movement_type: 'sale',
    movement_date: '2026-09-25T11:00:00Z',
    occurred_at: '2026-09-25T11:00:00Z',
    created_at: '2026-09-25T11:00:00Z',
    quantity_delta: -10,
    qty: -10,
    qty_in: 0,
    qty_out: 10,
    qty_before: 150,
    qty_after: 140,
    unit_cost: 20,
    total_cost: 200,
    warehouse_id: 'wh-1',
    store_id: null,
    branch_id: null,
    warehouse_location_id: null,
    location_id: null,
    condition: 'good',
    batch_id: null,
    serial_id: null,
    reference_type: 'sales_order',
    reference_id: 'SO-101',
    source_document_type: 'Sales Order',
    source_document_id: 'SO-101',
    remarks: 'Customer delivery',
    notes: null,
    product_variant_id: 'var-1',
    product_variants: {
      id: 'var-1',
      sku: 'SKU-APPLE-01',
      barcode: '12345678',
      name: 'Organic Red Apple',
    },
    warehouses: {
      id: 'wh-1',
      name: 'Central Warehouse',
      code: 'CWH',
    },
    stores: null,
    branches: null,
    warehouse_locations: null,
  },
]

describe('InventoryMovementsTable - User Story 1 (Pagination & Browsing)', () => {
  it('renders skeleton rows when isLoading is true', () => {
    const { container } = render(
      <InventoryMovementsTable
        movements={[]}
        totalCount={0}
        page={1}
        pageSize={20}
        totalPages={1}
        isLoading={true}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders movement records with SKU, location, and formatted deltas', () => {
    render(
      <InventoryMovementsTable
        movements={mockMovements}
        totalCount={2}
        page={1}
        pageSize={20}
        totalPages={1}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )

    expect(screen.getAllByText('SKU-APPLE-01').length).toBe(2)
    expect(screen.getAllByText('Central Warehouse (CWH)').length).toBe(2)
    expect(screen.getByText('+50')).toBeInTheDocument()
    expect(screen.getByText('-10')).toBeInTheDocument()
    expect(screen.getByText('#1001')).toBeInTheDocument()
    expect(screen.getByText('#1002')).toBeInTheDocument()
  })

  it('renders empty state message when movements array is empty', () => {
    render(
      <InventoryMovementsTable
        movements={[]}
        totalCount={0}
        page={1}
        pageSize={20}
        totalPages={1}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )

    expect(
      screen.getByText('No movements found.')
    ).toBeInTheDocument()
  })

  it('triggers onRowClick when a table row is clicked', () => {
    const handleRowClick = vi.fn()
    render(
      <InventoryMovementsTable
        movements={mockMovements}
        totalCount={2}
        page={1}
        pageSize={20}
        totalPages={1}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onRowClick={handleRowClick}
      />
    )

    const firstRowSku = screen.getAllByText('SKU-APPLE-01')[0]
    fireEvent.click(firstRowSku)

    expect(handleRowClick).toHaveBeenCalledWith(mockMovements[0])
  })
})
