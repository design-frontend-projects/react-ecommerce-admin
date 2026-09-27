import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReceiptCreateDialog } from '@/features/goods-receipts/components/create-dialog'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock lookups & hooks
vi.mock('@/hooks/use-inventory-lookups', () => ({
  useWarehouseOptions: () => ({
    data: [{ id: 'wh-1', name: 'Central Warehouse', code: 'WH-01' }],
  }),
}))

const mockPoDetails = {
  header: {
    id: 'po-1001',
    po_number: 1001,
    order_date: '2026-09-20T00:00:00.000Z',
    expected_delivery_date: '2026-09-30T00:00:00.000Z',
    currency: 'USD',
    lifecycle_status: 'approved',
    po_total: 5000,
    supplier: { id: 'sup-1', name: 'Apple Authorized Distributor', code: 'SUP-APP' },
    warehouse: { id: 'wh-1', name: 'Central Warehouse', code: 'WH-01' },
    notes: 'Urgent electronics delivery',
  },
  summary: {
    total_lines: 2,
    ordered_quantity: 8,
    received_quantity: 0,
    remaining_quantity: 8,
    rejected_quantity: 0,
    po_total: 5000,
  },
  items: [
    {
      id: 'poi-1',
      po_id: 'po-1001',
      line_no: 1,
      product_variant_id: 'pv-iphone-15',
      product_name: 'iPhone 15 Pro Max',
      variant_name: 'Natural Titanium 256GB',
      sku: 'IPHONE15-PM-256',
      barcode: '194253000001',
      uom: { id: 'uom-unit', name: 'Unit', code: 'UNIT' },
      quantity_ordered: 5,
      previously_received_qty: 0,
      cancelled_qty: 0,
      remaining_quantity: 5,
      unit_cost: 1100,
      total_amount: 5500,
      receiving_status: 'pending',
      is_batch_tracked: false,
      is_serial_tracked: true,
      has_expiration: false,
      available_batches: [],
    },
    {
      id: 'poi-2',
      po_id: 'po-1001',
      line_no: 2,
      product_variant_id: 'pv-usb-c-cable',
      product_name: 'USB-C Fast Charging Cable',
      variant_name: '1m Braided White',
      sku: 'CBL-USBC-1M',
      barcode: '194253000002',
      uom: { id: 'uom-unit', name: 'Unit', code: 'UNIT' },
      quantity_ordered: 3,
      previously_received_qty: 0,
      cancelled_qty: 0,
      remaining_quantity: 3,
      unit_cost: 15,
      total_amount: 45,
      receiving_status: 'pending',
      is_batch_tracked: false,
      is_serial_tracked: false,
      has_expiration: false,
      available_batches: [],
    },
  ],
  receipts_history: [],
}

vi.mock('@/features/goods-receipts/hooks/use-goods-receipts', () => ({
  useWarehouseLocations: () => ({
    data: [{ id: 'loc-1', code: 'A1-01', name: 'Main Aisle 1' }],
  }),
  useReceivablePoSearch: () => ({
    data: {
      items: [
        {
          id: 'po-1001',
          po_number: 1001,
          lifecycle_status: 'approved',
          suppliers: { name: 'Apple Authorized Distributor' },
          warehouses: { name: 'Central Warehouse' },
          items_count: 2,
          remaining_quantity: 8,
        },
      ],
    },
    isLoading: false,
  }),
  usePoReceivingDetails: () => ({
    data: mockPoDetails,
    isLoading: false,
  }),
  useCreateReceipt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('Goods Receipt Serial Number Generation Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders Auto Generate button and custom button for serial-tracked items', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReceiptCreateDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    // Verify PO line items are shown
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument()
    expect(screen.getByText('USB-C Fast Charging Cable')).toBeInTheDocument()

    // iPhone line should have Serial Numbers Tracking section
    expect(screen.getByText(/Serial Numbers Tracking/i)).toBeInTheDocument()

    // Buttons for generating serials
    const autoGenBtn = screen.getByRole('button', { name: /Auto Generate/i })
    expect(autoGenBtn).toBeInTheDocument()

    const customBtn = screen.getByRole('button', { name: /Custom\.\.\./i })
    expect(customBtn).toBeInTheDocument()
  })

  it('generates serial numbers based on product name when clicking Auto Generate', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReceiptCreateDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    const autoGenBtn = screen.getByRole('button', { name: /Auto Generate/i })
    fireEvent.click(autoGenBtn)

    // Textarea should now contain generated serial numbers based on product name "iPhone 15 Pro Max"
    const textarea = screen.getByPlaceholderText(
      /Enter serial numbers separated by comma or new lines/i
    ) as HTMLTextAreaElement

    expect(textarea.value).toContain('IPHONE-15-PRO-001')
    expect(textarea.value).toContain('IPHONE-15-PRO-002')
    expect(textarea.value).toContain('IPHONE-15-PRO-003')
    expect(textarea.value).toContain('IPHONE-15-PRO-004')
    expect(textarea.value).toContain('IPHONE-15-PRO-005')

    // Count should show 5 / 5
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  it('opens custom generator dialog and generates customized serials', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReceiptCreateDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    const customBtn = screen.getByRole('button', { name: /Custom\.\.\./i })
    fireEvent.click(customBtn)

    // Dialog title should appear
    expect(screen.getByRole('heading', { name: /Generate Serial Numbers/i })).toBeInTheDocument()

    // Customize prefix
    const prefixInput = screen.getByPlaceholderText('e.g. IPHONE-15')
    fireEvent.change(prefixInput, { target: { value: 'APPLE-15PM' } })

    // Apply button
    const applyBtn = screen.getByRole('button', { name: /Apply 5 Serials/i })
    fireEvent.click(applyBtn)

    // Check textarea in main form
    const textarea = screen.getByPlaceholderText(
      /Enter serial numbers separated by comma or new lines/i
    ) as HTMLTextAreaElement

    expect(textarea.value).toContain('APPLE-15PM-001')
    expect(textarea.value).toContain('APPLE-15PM-005')
  })

  it('supports bulk generating all missing serials from top action button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReceiptCreateDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    // Top bulk button should exist because iPhone 15 Pro Max is missing serials
    const bulkBtn = screen.getByRole('button', { name: /Generate All Missing Serials/i })
    expect(bulkBtn).toBeInTheDocument()

    fireEvent.click(bulkBtn)

    const textarea = screen.getByPlaceholderText(
      /Enter serial numbers separated by comma or new lines/i
    ) as HTMLTextAreaElement

    expect(textarea.value).toContain('IPHONE-15-PRO-001')
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })
})
