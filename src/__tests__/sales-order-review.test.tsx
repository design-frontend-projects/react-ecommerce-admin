import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  SalesOrderReviewDialog,
  type SalesOrderDraftData,
} from '@/features/sales-orders/components/review-dialog'
import { OrdersProvider } from '@/features/sales-orders/components/provider'
import {
  createOrderInputSchema,
  customerName,
} from '@/features/sales-orders/data/schema'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user' },
  }),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

describe('Sales Order Review Dialog & Schemas', () => {
  const sampleDraftData: SalesOrderDraftData = {
    orderNumber: 'DRAFT-PREVIEW',
    storeName: 'Downtown Flagship',
    storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    warehouseName: 'Central Logistics Hub',
    warehouseId: '4fa85f64-5717-4562-b3fc-2c963f66afa6',
    channelName: 'Online Web Store',
    channelId: '2fa85f64-5717-4562-b3fc-2c963f66afa6',
    customerName: 'Sarah Connor',
    customerId: '5fa85f64-5717-4562-b3fc-2c963f66afa6',
    customerPhone: '+1-555-0199',
    customerEmail: 'sarah@example.com',
    customerCode: 'CUST-009',
    orderDate: '2026-09-10T10:00:00Z',
    expectedDate: '2026-09-12',
    currency: 'USD',
    notes: 'Please pack in eco-friendly protective wrapping.',
    items: [
      {
        productName: 'Artisan Espresso Blend',
        productSku: 'ESP-ART-01',
        variantId: '6fa85f64-5717-4562-b3fc-2c963f66afa6',
        variantSku: 'ESP-500G',
        variantLabel: '500g Bag',
        uomId: '7fa85f64-5717-4562-b3fc-2c963f66afa6',
        uomCode: 'bag',
        uomName: 'Bag',
        quantity: 4,
        unitPrice: 18.0,
        discountAmount: 2.0,
        taxAmount: 3.5,
        subtotal: 73.5,
      },
    ],
    subtotal: 72.0,
    discountAmount: 2.0,
    taxAmount: 3.5,
    totalAmount: 73.5,
  }

  test('validates createOrderInputSchema with UUID customerId, storeId, channelId, and items', () => {
    const valid = createOrderInputSchema.safeParse({
      storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      customerId: '5fa85f64-5717-4562-b3fc-2c963f66afa6',
      channelId: '2fa85f64-5717-4562-b3fc-2c963f66afa6',
      warehouseId: '4fa85f64-5717-4562-b3fc-2c963f66afa6',
      currency: 'USD',
      items: [
        {
          productVariantId: '6fa85f64-5717-4562-b3fc-2c963f66afa6',
          qtyOrdered: 2,
          unitPrice: 25.5,
          discountAmount: 0,
          taxAmount: 2.5,
          uomId: '7fa85f64-5717-4562-b3fc-2c963f66afa6',
        },
      ],
    })

    expect(valid.success).toBe(true)
  })

  test('customerName formats properly or defaults to Walk-in', () => {
    expect(customerName(null)).toBe('Walk-in')
    expect(customerName(undefined)).toBe('Walk-in')
    expect(customerName({ first_name: 'John', last_name: 'Doe' })).toBe('John Doe')
    expect(customerName({ first_name: 'Alice', last_name: null })).toBe('Alice')
    expect(customerName({ first_name: null, last_name: null, code: '123' })).toBe('Customer #123')
  })

  test('renders draft review dialog with items, customer details, and print trigger', () => {
    const onConfirmDraftSubmit = vi.fn()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <QueryClientProvider client={queryClient}>
        <OrdersProvider>
          <SalesOrderReviewDialog
            open={true}
            draftData={sampleDraftData}
            onConfirmDraftSubmit={onConfirmDraftSubmit}
          />
        </OrdersProvider>
      </QueryClientProvider>
    )

    // Checks title and draft badge
    expect(screen.getByText('Sales Order Review & Print')).toBeDefined()
    expect(screen.getByText('DRAFT-PREVIEW')).toBeDefined()

    // Checks customer info
    expect(screen.getByText('Sarah Connor')).toBeDefined()
    expect(screen.getByText('Downtown Flagship')).toBeDefined()
    expect(screen.getAllByText('Online Web Store').length).toBeGreaterThan(0)
    expect(screen.getByText('Central Logistics Hub')).toBeDefined()

    // Checks item details
    expect(screen.getByText('Artisan Espresso Blend')).toBeDefined()
    expect(screen.getByText('ESP-500G')).toBeDefined()
    expect(screen.getByText('bag')).toBeDefined()

    // Checks totals
    expect(screen.getAllByText('$73.50').length).toBeGreaterThan(0)

    // Print button triggers window.print()
    const printButton = screen.getByRole('button', { name: /print/i })
    fireEvent.click(printButton)
    expect(printSpy).toHaveBeenCalled()

    // Confirm button triggers callback
    const confirmButton = screen.getByRole('button', {
      name: /confirm & create order/i,
    })
    fireEvent.click(confirmButton)
    expect(onConfirmDraftSubmit).toHaveBeenCalled()

    printSpy.mockRestore()
  })
})
