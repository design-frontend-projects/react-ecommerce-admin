import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { POReceiveDialog } from '@/features/purchase-orders/components/po-receive-dialog'
import { POProvider, usePOContext } from '@/features/purchase-orders/components/po-provider'
import React from 'react'

// Mock hooks
const mockMutateAsync = vi.fn()
const mockUpdateStatusAsync = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('@/features/branches/hooks/use-branches', () => ({
  useBranches: () => ({
    data: [
      { id: 'branch-1', name: 'Main Kitchen' },
      { id: 'branch-2', name: 'Downtown Branch' },
    ],
  }),
}))

const mockPOData = {
  id: 'po-test-123',
  po_id: 'po-test-123',
  status: 'pending',
  suppliers: { name: 'Ahmed Hassan' },
  purchase_order_items: [
    {
      id: 'item-uuid-row-1',
      po_id: 'po-test-123',
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      quantity_ordered: 100,
      received_quantity: 0,
      unit_cost: 25,
      subtotal: 2500,
      uom_id: 'uom-kg',
      uoms: { id: 'uom-kg', name: 'Kilogram', code: 'kg' },
      products: {
        name: 'checkin',
        product_variants: [{ id: 'var-1', sku: 'checkik-112-V1' }],
      },
    },
    {
      id: 'item-uuid-row-2',
      po_id: 'po-test-123',
      product_id: 'prod-2',
      product_variant_id: 'var-2',
      quantity_ordered: 140,
      received_quantity: 0,
      unit_cost: 15,
      subtotal: 2100,
      uom_id: 'uom-kg',
      uoms: { id: 'uom-kg', name: 'Kilogram', code: 'kg' },
      products: {
        name: 'cheese',
        product_variants: [{ id: 'var-2', sku: 'CHESSE-11-V2' }],
      },
    },
  ],
}

vi.mock('@/features/purchase-orders/hooks/use-purchase-orders', () => ({
  usePurchaseOrder: () => ({
    data: mockPOData,
  }),
  useUpdatePurchaseOrderStatus: () => ({
    mutateAsync: mockUpdateStatusAsync,
    isPending: false,
  }),
}))

vi.mock('@/features/purchase-orders/hooks/use-purchase-order-items', () => ({
  useBatchReceiveItems: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

function TestWrapper() {
  const { setOpen, setCurrentRow } = usePOContext()

  React.useEffect(() => {
    setCurrentRow(mockPOData as any)
    setOpen('receive')
  }, [setCurrentRow, setOpen])

  return <POReceiveDialog />
}

describe('POReceiveDialog Multi-Row Quantity Isolation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  test('editing row 1 "Receive Now" quantity does NOT affect row 2', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <POProvider>
          <TestWrapper />
        </POProvider>
      </QueryClientProvider>
    )

    // Verify products are rendered
    expect(screen.getByText('checkin')).toBeInTheDocument()
    expect(screen.getByText('cheese')).toBeInTheDocument()

    // Find all number inputs for Receive Now
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)

    const row1Input = inputs[0] as HTMLInputElement
    const row2Input = inputs[1] as HTMLInputElement

    // Initially both should be empty with placeholder '0'
    expect(row1Input.value).toBe('')
    expect(row2Input.value).toBe('')

    // Type 10 into Row 1
    fireEvent.change(row1Input, { target: { value: '10' } })

    // Row 1 should be 10, Row 2 MUST remain empty / untouched
    expect(row1Input.value).toBe('10')
    expect(row2Input.value).toBe('')

    // Now type 25 into Row 2
    fireEvent.change(row2Input, { target: { value: '25' } })

    // Both rows must have their independent values
    expect(row1Input.value).toBe('10')
    expect(row2Input.value).toBe('25')
  })

  test('caps quantity to remaining ordered amount and submits correctly', async () => {
    mockMutateAsync.mockResolvedValue({ success: true })
    mockUpdateStatusAsync.mockResolvedValue({ success: true })

    render(
      <QueryClientProvider client={queryClient}>
        <POProvider>
          <TestWrapper />
        </POProvider>
      </QueryClientProvider>
    )

    const inputs = screen.getAllByRole('spinbutton')
    const row1Input = inputs[0] as HTMLInputElement

    // Try entering 200 (greater than ordered 100)
    fireEvent.change(row1Input, { target: { value: '200' } })
    // Should be clamped to 100
    expect(row1Input.value).toBe('100')

    // Select branch
    const branchSelect = screen.getByRole('combobox')
    fireEvent.change(branchSelect, { target: { value: 'branch-1' } })

    // Click Confirm Receive
    const confirmBtn = screen.getByRole('button', { name: /confirm receive/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        po_id: 'po-test-123',
        store_id: 'branch-1',
        items: [
          {
            po_item_id: 'item-uuid-row-1',
            item_id: 'item-uuid-row-1',
            variant_id: 'var-1',
            qty_to_receive: 100,
            unit_cost: 25,
          },
        ],
      })
    })
  })
})
