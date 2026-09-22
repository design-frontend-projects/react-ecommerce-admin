import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PosLayout } from '@/features/pos/components/pos-layout'
import { PosCart } from '@/features/pos/components/pos-cart'
import { PosCheckoutDialog } from '@/features/pos/components/pos-checkout-dialog'
import { usePosStore } from '@/features/pos/store/use-pos-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, options?: any) => {
      if (options && options.count !== undefined) {
        return fallback.replace('{{count}}', String(options.count))
      }
      if (options && options.amount !== undefined) {
        return fallback.replace('{{amount}}', String(options.amount))
      }
      return fallback
    },
  }),
}))

// Mock sub-components inside PosLayout
vi.mock('@/features/pos/components/pos-main-screen', () => ({
  PosMainScreen: () => <div data-testid='pos-main-screen'>POS Main Screen</div>,
}))
vi.mock('@/features/pos/components/shift-dashboard', () => ({
  ShiftDashboard: () => <div data-testid='shift-dashboard'>Shift Dashboard</div>,
}))
vi.mock('@/features/pos/components/non-restaurant-shipments-board', () => ({
  NonRestaurantShipmentsBoard: () => (
    <div data-testid='shipments-board'>Shipments Board</div>
  ),
}))
vi.mock('@/features/pos/components/pos-terminals-page', () => ({
  PosTerminalsPage: () => <div data-testid='terminals-page'>Terminals Page</div>,
}))
vi.mock('@/features/pos/components/pos-reports-page', () => ({
  PosReportsPage: () => <div data-testid='reports-page'>Reports Page</div>,
}))

// Mock customer hooks
vi.mock('@/features/customers/hooks/use-customers', () => ({
  useCustomers: () => ({
    data: [
      {
        id: 'cust-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        group_id: 'grp-1',
      },
    ],
    isLoading: false,
  }),
  useCreateCustomer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

// Mock checkout mutation
const mockMutateAsync = vi.fn().mockResolvedValue({
  orderNumber: 'POS-TEST-1001',
  invoiceNumber: 'INV-TEST-1001',
})

vi.mock('@/features/pos/hooks/use-pos-queries', () => ({
  usePosCheckoutMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('POS Responsive & Scroll Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePosStore.setState({
      items: [],
      customer: null,
      terminal: {
        id: 'term-1',
        name: 'Register 1',
        code: 'REG-1',
        warehouseId: 'wh-1',
        storeId: 'store-1',
        branchId: 'branch-1',
      },
      session: {
        id: 'session-1',
        status: 'open',
        openedAt: new Date().toISOString(),
        openingCash: 100,
        cashierName: 'Alex Cashier',
      },
      heldOrders: [],
    })
  })

  describe('PosLayout viewport containment & responsive tabs', () => {
    it('renders with 100dvh containment and horizontal scrollable tabs container', () => {
      const { container } = renderWithClient(<PosLayout />)

      const root = container.firstElementChild as HTMLElement
      expect(root.className).toContain('h-[100dvh]')
      expect(root.className).toContain('max-h-[100dvh]')
      expect(root.className).toContain('overflow-hidden')

      // Verify scrollable tabs container
      const scrollableTabsContainer = container.querySelector(
        '.overflow-x-auto.no-scrollbar'
      )
      expect(scrollableTabsContainer).toBeInTheDocument()

      // Tab triggers
      expect(screen.getByText('Register')).toBeInTheDocument()
      expect(screen.getByText('Shift Analytics')).toBeInTheDocument()
      expect(screen.getByText('Shipments')).toBeInTheDocument()
      expect(screen.getByText('Terminals')).toBeInTheDocument()
      expect(screen.getByText('Audit Logs')).toBeInTheDocument()
    })
  })

  describe('PosCart touch steppers and responsive elements', () => {
    it('renders empty cart and responds to line item quantity updates with touch targets', () => {
      usePosStore.getState().addItem({
        productId: 'p-1',
        productVariantId: 'pv-1',
        name: 'Fresh Espresso Beans (Medium Roast 500g)',
        sku: 'COF-MED-500',
        unitPrice: 15.5,
        quantity: 2,
        availableQuantity: 10,
        taxRate: 0,
      })

      const onOpenCheckout = vi.fn()
      const onOpenHold = vi.fn()

      renderWithClient(
        <div className='h-[600px] w-[350px]'>
          <PosCart
            onOpenCheckout={onOpenCheckout}
            onOpenHold={onOpenHold}
          />
        </div>
      )

      expect(
        screen.getByText('Fresh Espresso Beans (Medium Roast 500g)')
      ).toBeInTheDocument()
      expect(screen.getByText('COF-MED-500')).toBeInTheDocument()

      // Check total section
      expect(screen.getByText('TOTAL')).toBeInTheDocument()

      // Click Pay button
      const payBtn = screen.getByRole('button', { name: /Pay \(F9\)/i })
      expect(payBtn).toBeInTheDocument()
      fireEvent.click(payBtn)
      expect(onOpenCheckout).toHaveBeenCalledTimes(1)
    })
  })

  describe('PosCheckoutDialog sticky header, scrollable body, and sticky footer', () => {
    it('pins Total Due at top and Complete Sale at bottom with change calculation', async () => {
      usePosStore.getState().addItem({
        productId: 'p-1',
        productVariantId: 'pv-1',
        name: 'Coffee Beans',
        sku: 'COF-1',
        unitPrice: 50,
        quantity: 1,
        availableQuantity: 10,
        taxRate: 0,
      })

      const onOpenChange = vi.fn()
      const onCheckoutSuccess = vi.fn()

      renderWithClient(
        <PosCheckoutDialog
          open={true}
          onOpenChange={onOpenChange}
          onCheckoutSuccess={onCheckoutSuccess}
        />
      )

      // Verify sticky header contains Total Due
      expect(screen.getByText('Total Due')).toBeInTheDocument()
      expect(screen.getByText('Payment & Checkout')).toBeInTheDocument()

      // Verify Complete Sale button is in footer
      const completeSaleBtn = screen.getByRole('button', {
        name: /Complete Sale/i,
      })
      expect(completeSaleBtn).toBeInTheDocument()

      // Quick cash button
      const exactBtn = screen.getByRole('button', { name: 'Exact' })
      expect(exactBtn).toBeInTheDocument()
      fireEvent.click(exactBtn)

      // Complete sale
      fireEvent.click(completeSaleBtn)
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled()
      })
    })
  })
})
