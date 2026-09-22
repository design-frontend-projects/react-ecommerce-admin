import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PosReceiptDialog, type ReceiptData } from '@/features/pos/components/pos-receipt-dialog'
import { PosCheckoutDialog } from '@/features/pos/components/pos-checkout-dialog'
import { usePosStore } from '@/features/pos/store/use-pos-store'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}))

// Mock checkout mutation
const mockMutateAsync = vi.fn()
vi.mock('@/features/pos/hooks/use-pos-queries', () => ({
  usePosCheckoutMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

const sampleReceipt: ReceiptData = {
  orderNumber: 'ORD-1001',
  invoiceNumber: 'INV-2001',
  date: new Date('2026-09-23T12:00:00Z'),
  storeName: 'Downtown Store',
  cashierName: 'Jane Cashier',
  terminalCode: 'TERM-01',
  customerName: 'Alice Johnson',
  customerPhone: '+1-555-888-9999',
  items: [
    {
      name: 'Artisan Coffee Beans',
      sku: 'COF-001',
      quantity: 2,
      unitPrice: 15,
      total: 30,
    },
  ],
  subtotal: 30,
  taxTotal: 3,
  totalAmount: 33,
  payments: [
    {
      method: 'cash',
      amount: 33,
    },
  ],
}

describe('POS Sale Completed Modal (PosReceiptDialog)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePosStore.setState({
      activeTab: 'checkout',
      customer: null,
    })
  })

  test('displays customer name and phone (name and phone only) when customer is selected', () => {
    render(
      <PosReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleReceipt}
      />
    )

    // Check customer name and phone are shown
    expect(screen.getByText('Alice Johnson')).toBeDefined()
    expect(screen.getByText('(+1-555-888-9999)')).toBeDefined()

    // Ensure email is NOT displayed (per requirement: just show name, phone only)
    expect(screen.queryByText(/alice@example\.com/i)).toBeNull()
  })

  test('pre-fills WhatsApp number field when customer has phone number', async () => {
    render(
      <PosReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleReceipt}
      />
    )

    // Find and click WhatsApp button to open popover
    const whatsappBtn = screen.getByRole('button', { name: /whatsapp/i })
    fireEvent.click(whatsappBtn)

    // The WhatsApp phone input field should be prefilled with customer's phone
    await waitFor(() => {
      const phoneInput = screen.getByPlaceholderText('+1234567890') as HTMLInputElement
      expect(phoneInput.value).toBe('+1-555-888-9999')
    })
  })

  test('prints customer details on receipt invoice when handlePrint is called', () => {
    const printMock = vi.fn()
    const closeMock = vi.fn()
    const writeMock = vi.fn()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: {
        write: writeMock,
        close: closeMock,
      },
      print: printMock,
      close: closeMock,
    } as unknown as Window)

    render(
      <PosReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleReceipt}
      />
    )

    const printBtn = screen.getByRole('button', { name: /print receipt/i })
    fireEvent.click(printBtn)

    expect(openSpy).toHaveBeenCalled()
    expect(writeMock).toHaveBeenCalled()
    const printedHtml = writeMock.mock.calls[0][0] as string

    // Verify printed HTML contains customer name and phone
    expect(printedHtml).toContain('Alice Johnson')
    expect(printedHtml).toContain('+1-555-888-9999')

    openSpy.mockRestore()
  })

  test('shows shipment details and allows switching to Shipments tab', () => {
    const shipmentReceipt: ReceiptData = {
      ...sampleReceipt,
      isShipment: true,
      shipmentDetails: {
        recipientName: 'Alice Johnson',
        recipientPhone: '+1-555-888-9999',
        deliveryAddress: '123 Main St, Suite 400',
        carrier: 'Express Delivery',
      },
    }

    const onOpenChangeMock = vi.fn()

    render(
      <PosReceiptDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        receipt={shipmentReceipt}
      />
    )

    // Shows shipment delivery address
    expect(screen.getByText(/123 Main St, Suite 400/i)).toBeDefined()

    // Click "Shipments Tab" button
    const shipmentTabButtons = screen.getAllByRole('button', { name: /shipments tab/i })
    expect(shipmentTabButtons.length).toBeGreaterThan(0)
    fireEvent.click(shipmentTabButtons[0])

    // Should close modal and set active tab to 'shipments'
    expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    expect(usePosStore.getState().activeTab).toBe('shipments')
  })
})

describe('POS Checkout Dialog Shipment Option (PosCheckoutDialog)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient()
    usePosStore.setState({
      terminal: {
        id: 'term-1',
        name: 'POS Register 1',
        code: 'POS-01',
        warehouseId: 'wh-1',
      },
      session: {
        id: 'sess-1',
        status: 'open',
        cashierName: 'Jane Cashier',
      },
      customer: {
        id: 'cust-1',
        name: 'Bob Smith',
        phone: '+1-987-654-3210',
        email: 'bob@example.com',
      },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productVariantId: 'var-1',
          name: 'Item A',
          sku: 'SKU-A',
          unitPrice: 50,
          quantity: 1,
          subtotal: 50,
          discountAmount: 0,
          taxAmount: 0,
          total: 50,
        },
      ],
      activeTab: 'checkout',
    })
  })

  test('shows option to send order with shipment and pre-fills customer info', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosCheckoutDialog
          open={true}
          onOpenChange={vi.fn()}
          onCheckoutSuccess={vi.fn()}
        />
      </QueryClientProvider>
    )

    // Verify shipment toggle is present
    const toggle = screen.getByRole('switch', { name: /send with shipment/i })
    expect(toggle).toBeDefined()
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    // Click toggle to enable shipment
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    // Recipient name and phone should be pre-filled from customer
    const recipientInput = screen.getByPlaceholderText(/Bob Smith/i) as HTMLInputElement
    expect(recipientInput.value).toBe('Bob Smith')

    const phoneInput = screen.getByPlaceholderText(/\+1-987-654-3210/i) as HTMLInputElement
    expect(phoneInput.value).toBe('+1-987-654-3210')
  })

  test('submits shipment details and forwards customer info to onCheckoutSuccess', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      orderId: 'ord-123',
      orderNumber: 'POS-ORD-123',
      invoiceId: 'inv-123',
      invoiceNumber: 'INV-123',
    })

    const onCheckoutSuccessMock = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <PosCheckoutDialog
          open={true}
          onOpenChange={vi.fn()}
          onCheckoutSuccess={onCheckoutSuccessMock}
        />
      </QueryClientProvider>
    )

    // Enable shipment
    const toggle = screen.getByRole('switch', { name: /send with shipment/i })
    fireEvent.click(toggle)

    // Enter delivery address
    const addressInput = screen.getByPlaceholderText(/Street address/i)
    fireEvent.change(addressInput, { target: { value: '789 Oak Avenue' } })

    // Click Complete Sale button
    const submitBtn = screen.getByRole('button', { name: /complete sale/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })

    const mutationCallPayload = mockMutateAsync.mock.calls[0][0]
    expect(mutationCallPayload.isShipment).toBe(true)
    expect(mutationCallPayload.shipment.recipientName).toBe('Bob Smith')
    expect(mutationCallPayload.shipment.recipientPhone).toBe('+1-987-654-3210')
    expect(mutationCallPayload.shipment.deliveryAddress).toBe('789 Oak Avenue')

    // Verify onCheckoutSuccess was called with customerName and customerPhone (name & phone only)
    expect(onCheckoutSuccessMock).toHaveBeenCalled()
    const receiptData = onCheckoutSuccessMock.mock.calls[0][0] as ReceiptData
    expect(receiptData.customerName).toBe('Bob Smith')
    expect(receiptData.customerPhone).toBe('+1-987-654-3210')
    expect(receiptData.isShipment).toBe(true)
    expect(receiptData.shipmentDetails?.deliveryAddress).toBe('789 Oak Avenue')
  })
})
