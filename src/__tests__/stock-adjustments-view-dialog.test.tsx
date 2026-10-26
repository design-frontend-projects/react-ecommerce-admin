import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdjustmentViewDialog } from '@/features/stock-adjustments/components/view-dialog'
import type { AdjustmentDetail, AdjustmentListItem } from '@/features/stock-adjustments/data/schema'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock hooks
const mockApplyMutateAsync = vi.fn().mockResolvedValue({})
const mockCancelMutateAsync = vi.fn().mockResolvedValue({})

const mockDetail: AdjustmentDetail = {
  id: '01953e5e-6277-7000-8000-000000000001',
  status: 'draft',
  type: 'manual',
  notes: 'Quarterly inventory count variance reconciliation',
  warehouse_id: 'wh-1234',
  store_id: null,
  created_at: '2026-10-26T12:00:00Z',
  approved_at: null,
  warehouses: {
    id: 'wh-1234',
    name: 'Central Logistics Warehouse',
    code: 'WH-01',
  },
  stores: null,
  stock_adjustment_items: [
    {
      id: 'item-1',
      product_variant_id: 'var-101',
      location_id: null,
      qty_before: 50,
      qty_after: 65,
      qty_adjusted: 15,
      unit_cost: 12.5,
      reason: 'count_correction',
      product_variants: {
        id: 'var-101',
        sku: 'COF-ETH-500G',
        barcode: '890123456789',
        name: 'Dark Roast 500g',
        weight: 0.5,
        cost_price: 12.5,
        price: 24.0,
        products: {
          id: 'prod-101',
          name: 'Ethiopian Single Origin Beans',
          sku: 'COF-ETH',
          barcode: '890123456789',
          uom: 'BAG',
          brands: { name: 'Artisan Beans' },
          categories: { name: 'Specialty Coffee' },
        },
      },
    },
    {
      id: 'item-2',
      product_variant_id: 'var-102',
      location_id: null,
      qty_before: 20,
      qty_after: 15,
      qty_adjusted: -5,
      unit_cost: 8.0,
      reason: 'damage',
      product_variants: {
        id: 'var-102',
        sku: 'TEA-MAT-100G',
        barcode: '890123456790',
        name: 'Ceremonial Matcha 100g',
        weight: 0.1,
        cost_price: 8.0,
        price: 18.0,
        products: {
          id: 'prod-102',
          name: 'Organic Ceremonial Grade Matcha',
          sku: 'TEA-MAT',
          barcode: '890123456790',
          uom: 'CAN',
          brands: { name: 'Zen Organics' },
          categories: { name: 'Green Tea' },
        },
      },
    },
  ],
}

let mockHookLoading = false
let currentDetailData: AdjustmentDetail | undefined = mockDetail

vi.mock('@/features/stock-adjustments/hooks/use-stock-adjustments', () => ({
  useAdjustment: () => ({
    data: currentDetailData,
    isLoading: mockHookLoading,
  }),
  useApplyAdjustment: () => ({
    mutateAsync: mockApplyMutateAsync,
    isPending: false,
  }),
  useCancelAdjustment: () => ({
    mutateAsync: mockCancelMutateAsync,
    isPending: false,
  }),
}))

// Mock RBAC Can component to render children
vi.mock('@/components/rbac/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderDialog(adjustmentListItem: AdjustmentListItem = mockDetail) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdjustmentViewDialog
        adjustment={adjustmentListItem}
        open={true}
        onOpenChange={vi.fn()}
      />
    </QueryClientProvider>
  )
}

describe('AdjustmentViewDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentDetailData = mockDetail
    mockHookLoading = false
  })

  it('renders adjustment reference ID, location, and metadata', () => {
    renderDialog()

    // Title reference: ADJ-01953E5E
    expect(screen.getByText('ADJ-01953E5E')).toBeInTheDocument()

    // Facility badge: Central Logistics Warehouse (WH-01)
    expect(screen.getByText('Central Logistics Warehouse')).toBeInTheDocument()
    expect(screen.getByText('(WH-01)')).toBeInTheDocument()

    // Status: draft
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders rich KPI cards with net delta units and total valuation', () => {
    renderDialog()

    // Adjusted items card: 2 Items
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Adjusted Lines')).toBeInTheDocument()

    // Net Delta: 15 + (-5) = +10 Units
    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('Net Delta')).toBeInTheDocument()

    // Valuation impact: 15 * 12.5 + (-5) * 8.0 = 187.5 - 40 = $147.50
    expect(screen.getAllByText('$147.50').length).toBeGreaterThan(0)
    expect(screen.getByText('Impact Valuation')).toBeInTheDocument()
  })

  it('renders rich product and variant names, SKUs, and UOM in the line items', () => {
    renderDialog()

    // Line 1: Ethiopian Single Origin Beans, SKU COF-ETH-500G, BAG
    expect(
      screen.getAllByText('Ethiopian Single Origin Beans')[0]
    ).toBeInTheDocument()
    expect(screen.getAllByText('COF-ETH-500G')[0]).toBeInTheDocument()
    expect(screen.getByText('BAG')).toBeInTheDocument()
    expect(screen.getAllByText('+15')[0]).toBeInTheDocument()

    // Line 2: Organic Ceremonial Grade Matcha, SKU TEA-MAT-100G, CAN
    expect(
      screen.getAllByText('Organic Ceremonial Grade Matcha')[0]
    ).toBeInTheDocument()
    expect(screen.getAllByText('TEA-MAT-100G')[0]).toBeInTheDocument()
    expect(screen.getByText('CAN')).toBeInTheDocument()
    expect(screen.getAllByText('-5')[0]).toBeInTheDocument()
  })

  it('shows the prominent "Approve & Apply to Stock" button for draft adjustment and handles confirmation', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Prominent action button in dialog footer
    const approveBtn = screen.getByRole('button', {
      name: /Approve & Apply to Stock/i,
    })
    expect(approveBtn).toBeInTheDocument()

    // Click to open confirmation dialog
    await user.click(approveBtn)

    // Confirmation modal should show title and details
    expect(
      screen.getByText('Approve & Apply Stock Adjustment')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This will atomically update/i)
    ).toBeInTheDocument()

    // Confirm button in alert dialog
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply/i })
    await user.click(confirmBtn)

    // Verify applyAdjustment mutation was called with the adjustment ID
    await waitFor(() => {
      expect(mockApplyMutateAsync).toHaveBeenCalledWith(mockDetail.id)
    })
  })

  it('displays approved banner and hides pending action buttons when adjustment is approved', () => {
    currentDetailData = {
      ...mockDetail,
      status: 'approved',
      approved_at: '2026-10-26T14:30:00Z',
    }
    renderDialog(currentDetailData)

    // Status: approved
    expect(screen.getByText('Approved')).toBeInTheDocument()

    // Announcement banner
    expect(
      screen.getByText(/This adjustment has been/i)
    ).toBeInTheDocument()

    // Pending buttons should NOT be present
    expect(
      screen.queryByRole('button', { name: /Approve & Apply to Stock/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Cancel Adjustment/i })
    ).not.toBeInTheDocument()
  })
})
