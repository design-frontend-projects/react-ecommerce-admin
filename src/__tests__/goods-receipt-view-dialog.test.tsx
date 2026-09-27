import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReceiptViewDialog } from '@/features/goods-receipts/components/view-dialog'
import type { ReceiptListItem } from '@/features/goods-receipts/data/schema'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock Can component to allow all actions
vi.mock('@/components/rbac/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockReceiptListItem: ReceiptListItem = {
  id: 'gr-001',
  receipt_number: 'GRN-2026-0001',
  status: 'draft',
  received_date: '2026-09-28T00:00:00.000Z',
  warehouse_id: 'wh-001',
  purchase_order_id: 'po-001',
  notes: 'Quality inspection passed for batch A',
  warehouses: { id: 'wh-001', name: 'Main Distribution Center', code: 'MDC-01' },
  suppliers: { id: 'sup-001', name: 'Global Supply Co', code: 'GSC-CORP' },
  purchase_orders: {
    id: 'po-001',
    po_number: 1042,
    lifecycle_status: 'approved',
    suppliers: { id: 'sup-001', name: 'Global Supply Co', code: 'GSC-CORP' },
  },
  posted_by_user: null,
  _count: { goods_receipt_items: 2 },
}

const mockDetailData = {
  ...mockReceiptListItem,
  goods_receipt_items: [
    {
      id: 'gri-1',
      product_variant_id: 'pv-01',
      qty_received: 10,
      accepted_qty: 8,
      rejected_qty: 2,
      rejection_reason: 'Scratched exterior casing',
      condition: 'damaged',
      unit_cost: 25.5,
      batch_id: 'batch-01',
      batch_number: 'BATCH-2026-X',
      expiry_date: '2027-01-01T00:00:00.000Z',
      serials: ['SN-1001', 'SN-1002'],
      product_variants: {
        id: 'pv-01',
        sku: 'ELEC-PRO-01',
        barcode: '8901234567890',
        name: 'Enterprise Router Pro',
        products: { name: 'Enterprise Router Series', sku: 'ELEC-PRO' },
      },
      warehouse_locations: {
        id: 'loc-01',
        code: 'A-01-B',
        path: 'Zone A / Rack 01 / Bin B',
        name: 'Rack 01',
      },
      product_batches: {
        id: 'batch-01',
        batch_number: 'BATCH-2026-X',
        expiry_date: '2027-01-01T00:00:00.000Z',
        status: 'active',
      },
    },
    {
      id: 'gri-2',
      product_variant_id: 'pv-02',
      qty_received: 5,
      accepted_qty: 5,
      rejected_qty: 0,
      rejection_reason: null,
      condition: 'good',
      unit_cost: 10.0,
      batch_id: null,
      batch_number: null,
      expiry_date: null,
      serials: [],
      product_variants: {
        id: 'pv-02',
        sku: 'CABLE-CAT6',
        barcode: '8901234567891',
        name: 'Cat6 Patch Cable 2m',
        products: { name: 'Networking Cables', sku: 'CABLE' },
      },
      warehouse_locations: {
        id: 'loc-02',
        code: 'B-02-C',
        path: 'Zone B / Shelf 02',
        name: 'Shelf 02',
      },
      product_batches: null,
    },
  ],
}

vi.mock('@/features/goods-receipts/hooks/use-goods-receipts', () => ({
  useReceipt: () => ({
    data: mockDetailData,
    isLoading: false,
  }),
  usePostReceipt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelReceipt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('ReceiptViewDialog UI/UX Enhancements', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const renderComponent = (props?: Partial<React.ComponentProps<typeof ReceiptViewDialog>>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReceiptViewDialog
          receipt={mockReceiptListItem}
          open={true}
          onOpenChange={vi.fn()}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  it('renders the dialog header with receipt number and warehouse information', () => {
    renderComponent()

    expect(screen.getAllByText('GRN-2026-0001').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Main Distribution Center/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/PO #1042/i).length).toBeGreaterThan(0)
  })

  it('renders the 4 Executive KPI Stat Cards correctly', () => {
    renderComponent()

    // 1. Total received: 10 + 5 = 15
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    // 2. Accepted: 8 + 5 = 13
    expect(screen.getAllByText('13').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/87%/).length).toBeGreaterThan(0)
    // 3. Rejected: 2
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    // 4. Valuation: (8 * 25.5) + (5 * 10) = 204 + 50 = $254.00
    expect(screen.getAllByText(/\$254\.00/).length).toBeGreaterThan(0)
  })

  it('renders the line items table with rejection reason and location badges', () => {
    renderComponent()

    expect(screen.getAllByText('Enterprise Router Series').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ELEC-PRO-01').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A-01-B').length).toBeGreaterThan(0)
    expect(screen.getByText(/Scratched exterior casing/i)).toBeInTheDocument()
  })

  it('allows navigating to Serials Directory tab and viewing serial numbers', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Find tab trigger for Serials Directory
    const serialsTab = screen.getByRole('tab', { name: /Serials Directory/i })
    expect(serialsTab).toBeInTheDocument()

    await user.click(serialsTab)

    expect(screen.getAllByText('SN-1001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SN-1002').length).toBeGreaterThan(0)
    expect(screen.getByText(/Copy All Serials/i)).toBeInTheDocument()
  })

  it('allows navigating to Audit & Movement tab and displays lifecycle timeline', async () => {
    const user = userEvent.setup()
    renderComponent()

    const auditTab = screen.getByRole('tab', { name: /Audit & Movement/i })
    expect(auditTab).toBeInTheDocument()

    await user.click(auditTab)

    expect(screen.getByText(/Document Lifecycle Timeline/i)).toBeInTheDocument()
    expect(screen.getByText(/Receipt Initiated/i)).toBeInTheDocument()
    expect(screen.getByText(/Inspection & Serials/i)).toBeInTheDocument()
    expect(screen.getByText(/Pending Warehouse Posting/i)).toBeInTheDocument()
  })

  it('renders Print Slip and Post/Cancel action buttons for draft receipt', () => {
    renderComponent()

    expect(screen.getByText(/Print Slip/i)).toBeInTheDocument()
    expect(screen.getByText(/Post receipt/i)).toBeInTheDocument()
    expect(screen.getByText(/Cancel receipt/i)).toBeInTheDocument()
  })
})
