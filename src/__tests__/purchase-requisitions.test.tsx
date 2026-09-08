import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PRStatusBadge } from '@/features/purchase-requisitions/components/pr-status-badge'
import { PRMetrics } from '@/features/purchase-requisitions/components/pr-metrics'
import {
  PRSummaryDialog,
  type PRSummaryDraftData,
} from '@/features/purchase-requisitions/components/pr-summary-dialog'
import { RequisitionsProvider } from '@/features/purchase-requisitions/components/provider'
import {
  createRequisitionInputSchema,
  type RequisitionListItem,
} from '@/features/purchase-requisitions/data/schema'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user' },
  }),
}))

const queryClient = new QueryClient()

describe('Purchase Requisition Status Badge', () => {
  test('renders correct badge labels and variants for each status', () => {
    const { rerender } = render(<PRStatusBadge status='draft' />)
    expect(screen.getByText('Draft')).toBeInTheDocument()

    rerender(<PRStatusBadge status='submitted' />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()

    rerender(<PRStatusBadge status='approved' />)
    expect(screen.getByText('Approved')).toBeInTheDocument()

    rerender(<PRStatusBadge status='rejected' />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()

    rerender(<PRStatusBadge status='converted' />)
    expect(screen.getByText('Converted to PO')).toBeInTheDocument()

    rerender(<PRStatusBadge status='cancelled' />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})

describe('Purchase Requisition Metrics', () => {
  const sampleRequisitions: RequisitionListItem[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      requisition_number: 'PR-2026-0001',
      status: 'draft',
      source: 'manual',
      currency: 'USD',
      needed_by: '2026-09-20',
      notes: null,
      created_at: '2026-09-08T10:00:00Z',
      total_amount: 150,
      _count: { purchase_requisition_items: 2 },
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      requisition_number: 'PR-2026-0002',
      status: 'submitted',
      source: 'manual',
      currency: 'EUR',
      needed_by: '2026-09-25',
      notes: null,
      created_at: '2026-09-08T11:00:00Z',
      total_amount: 300,
      _count: { purchase_requisition_items: 1 },
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      requisition_number: 'PR-2026-0003',
      status: 'approved',
      source: 'low_stock_reorder',
      currency: 'USD',
      needed_by: '2026-09-22',
      notes: null,
      created_at: '2026-09-08T12:00:00Z',
      total_amount: 450,
      _count: { purchase_requisition_items: 3 },
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      requisition_number: 'PR-2026-0004',
      status: 'converted',
      source: 'manual',
      currency: 'USD',
      needed_by: null,
      notes: null,
      created_at: '2026-09-08T13:00:00Z',
      total_amount: 600,
      _count: { purchase_requisition_items: 1 },
    },
  ]

  test('calculates and renders accurate count metrics', () => {
    render(<PRMetrics data={sampleRequisitions} />)

    expect(screen.getByText('Total Requisitions')).toBeInTheDocument()
    expect(screen.getByText('Drafts')).toBeInTheDocument()
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
    expect(screen.getByText('Ready to Convert')).toBeInTheDocument()
    expect(screen.getByText('Converted to PO')).toBeInTheDocument()

    // 4 total requisitions
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})

describe('Purchase Requisition Summary Modal (Draft Mode)', () => {
  const sampleDraftData: PRSummaryDraftData = {
    storeId: 'store-1',
    storeName: 'Downtown Flagship',
    currency: 'SAR',
    neededBy: '2026-09-30',
    notes: 'Urgent stock requisition for weekend rush',
    items: [
      {
        productId: 'prod-1',
        productName: 'Single Origin Espresso Beans',
        productSku: 'SO-ESP-01',
        variantId: 'var-1',
        variantSku: 'SO-ESP-1KG',
        variantLabel: '1kg Vacuum Bag',
        uomId: 'uom-1',
        uomCode: 'kg',
        uomName: 'Kilogram',
        quantity: 20,
        unitCost: 45.0,
        subtotal: 900.0,
        supplierName: 'Bean Importers Ltd',
        reason: 'Daily espresso replenishment',
      },
      {
        productId: 'prod-2',
        productName: 'Full Cream Milk',
        productSku: 'MILK-FC-01',
        variantId: 'var-2',
        variantSku: 'MILK-FC-12L',
        variantLabel: '12L Case',
        uomId: 'uom-2',
        uomCode: 'case',
        uomName: 'Case',
        quantity: 10,
        unitCost: 60.0,
        subtotal: 600.0,
      },
    ],
  }

  test('renders summary draft preview with currency, store, items and triggers confirmation', () => {
    const onConfirmMock = vi.fn()
    const onOpenChangeMock = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <RequisitionsProvider>
          <PRSummaryDialog
            open={true}
            onOpenChange={onOpenChangeMock}
            draftData={sampleDraftData}
            onConfirmDraftSubmit={onConfirmMock}
          />
        </RequisitionsProvider>
      </QueryClientProvider>
    )

    // Check header
    expect(screen.getByText('DRAFT PREVIEW')).toBeInTheDocument()

    // Check store / location
    expect(screen.getByText('Downtown Flagship')).toBeInTheDocument()

    // Check line items
    expect(
      screen.getByText('Single Origin Espresso Beans')
    ).toBeInTheDocument()
    expect(screen.getByText('1kg Vacuum Bag')).toBeInTheDocument()
    expect(screen.getByText('Full Cream Milk')).toBeInTheDocument()
    expect(screen.getByText('12L Case')).toBeInTheDocument()

    // Check UOM tags
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('case')).toBeInTheDocument()

    // Check notes
    expect(
      screen.getByText('Urgent stock requisition for weekend rush')
    ).toBeInTheDocument()

    // Check currency and total: 900 + 600 = 1500 SAR (appears in KPI card and footer)
    expect(screen.getAllByText('SAR 1500.00').length).toBeGreaterThanOrEqual(1)

    // Click confirm button
    const confirmBtn = screen.getByRole('button', {
      name: /Confirm & Save Requisition/i,
    })
    expect(confirmBtn).toBeInTheDocument()
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).toHaveBeenCalledTimes(1)
  })
})

describe('Purchase Requisition Currency Validation', () => {
  const baseItem = {
    productVariantId: '11111111-1111-1111-1111-111111111111',
    qtyRequested: 10,
    estUnitCost: 25.5,
  }

  test('validates requisition with valid currency code from currencies table', () => {
    const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'QAR', 'KWD']
    for (const curr of currencies) {
      const parsed = createRequisitionInputSchema.safeParse({
        currency: curr,
        items: [baseItem],
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.currency).toBe(curr)
      }
    }
  })

  test('defaults to USD when currency is omitted', () => {
    const parsed = createRequisitionInputSchema.safeParse({
      items: [baseItem],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.currency).toBe('USD')
    }
  })

  test('rejects currency code longer than 3 characters', () => {
    const parsed = createRequisitionInputSchema.safeParse({
      currency: 'USDT',
      items: [baseItem],
    })
    expect(parsed.success).toBe(false)
  })
})

