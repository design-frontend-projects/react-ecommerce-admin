import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InventoryMovementsKpiRibbon } from '@/features/inventory-movements/components/inventory-movements-kpi-ribbon'
import { generateMovementsCsv } from '@/features/inventory-movements/components/inventory-movements-export'
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

describe('InventoryMovements KPI & CSV Export - User Story 4', () => {
  it('renders KPI ribbon cards with formatted summary metrics', () => {
    render(
      <InventoryMovementsKpiRibbon
        summary={{
          totalMovements: 1450,
          totalIn: 8200,
          totalOut: 3100,
          netDelta: 5100,
        }}
        isLoading={false}
      />
    )

    expect(screen.getByText('1,450')).toBeInTheDocument()
    expect(screen.getByText('+8,200')).toBeInTheDocument()
    expect(screen.getByText('-3,100')).toBeInTheDocument()
    expect(screen.getByText('+5,100')).toBeInTheDocument()
  })

  it('renders skeletons in KPI ribbon when isLoading is true', () => {
    const { container } = render(
      <InventoryMovementsKpiRibbon
        summary={undefined}
        isLoading={true}
      />
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(4)
  })

  it('generates sanitized UTF-8 CSV with Excel BOM and formula injection protection', () => {
    const mockRows: MovementRow[] = [
      {
        id: 'row-1',
        movement_no: '101',
        movement_type: 'purchase',
        movement_date: '2026-09-25T12:00:00Z',
        occurred_at: '2026-09-25T12:00:00Z',
        created_at: '2026-09-25T12:00:00Z',
        quantity_delta: 50,
        qty: 50,
        qty_in: 50,
        qty_out: 0,
        qty_before: 0,
        qty_after: 50,
        unit_cost: 15.75,
        total_cost: 787.5,
        warehouse_id: 'wh-1',
        store_id: null,
        branch_id: null,
        warehouse_location_id: null,
        location_id: null,
        condition: 'good',
        batch_id: 'B-100',
        serial_id: null,
        reference_type: 'purchase_order',
        reference_id: 'PO-1',
        source_document_type: null,
        source_document_id: null,
        remarks: '=cmd|"/C calc"!A0', // Potential CSV formula injection payload
        notes: null,
        product_variant_id: 'var-1',
        product_variants: {
          id: 'var-1',
          sku: 'SKU-001',
          barcode: '998877',
          name: 'Widget Standard',
        },
        warehouses: {
          id: 'wh-1',
          name: 'Warehouse North',
          code: 'WHN',
        },
        stores: null,
        branches: null,
        warehouse_locations: null,
      },
    ]

    const csv = generateMovementsCsv(mockRows)

    // Check UTF-8 BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff)

    // Check Headers
    expect(csv).toContain('Movement #')
    expect(csv).toContain('SKU')
    expect(csv).toContain('Inbound (+)')
    expect(csv).toContain('Outbound (-)')

    // Check Data
    expect(csv).toContain('"SKU-001"')
    expect(csv).toContain('"Widget Standard"')
    expect(csv).toContain('"Warehouse North (WHN)"')
    expect(csv).toContain('"15.75"')
    expect(csv).toContain('"787.50"')

    // Check Formula Injection Protection (prefixed with single quote and doubled internal quotes)
    expect(csv).toContain('"\'=cmd|""/C calc""!A0"')
  })
})
