import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SalesOrderPrintPage } from '@/features/sales-orders/pages/sales-order-print-page'
import { SalesOrderReportsPage } from '@/features/sales-orders/pages/sales-order-reports-page'
import {
  generatePrintDocumentHtml,
  printInNewWindow,
} from '@/features/sales-orders/utils/print-engine'

// Mock react-i18next using importOriginal to preserve initReactI18next
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, fallback: string) => fallback,
    }),
  }
})

// Mock ProfileDropdown, ThemeSwitch and ConfigDrawer to avoid full layout context tree in test
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div data-testid='profile-dropdown'>Profile</div>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div data-testid='theme-switch'>Theme</div>,
}))
vi.mock('@/components/layout/config-drawer', () => ({
  ConfigDrawer: () => null,
}))

// Mock useAuth & useUser & useSupabase
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user', email: 'admin@inventory.com' },
    isLoaded: true,
  }),
  useUser: () => ({
    user: {
      id: 'test-user',
      email: 'admin@inventory.com',
      user_metadata: { full_name: 'Admin User' },
    },
  }),
  useSupabase: () => ({
    signOut: vi.fn(),
  }),
}))

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: {
      to?: unknown
      children?: React.ReactNode
      [key: string]: unknown
    }) => (
      <a href={typeof to === 'string' ? to : '/'} {...props}>
        {children}
      </a>
    ),
    useParams: () => ({ orderId: 'ord-test-100' }),
    useSearch: () => ({ template: 'commercial', autoPrint: 'false' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/sales-orders/reports' }),
  }
})

// Mock currencies
vi.mock('@/features/currencies/hooks/use-currencies', () => ({
  useCurrencies: () => ({
    data: [
      { code: 'USD', symbol: '$' },
      { code: 'EUR', symbol: '€' },
    ],
  }),
}))

const sampleOrder = {
  id: 'ord-test-100',
  order_number: 'SO-2026-0099',
  status: 'confirmed',
  order_date: '2026-09-22T10:00:00Z',
  expected_date: '2026-09-25T18:00:00Z',
  currency: 'USD',
  subtotal: 120.0,
  discount_amount: 10.0,
  tax_amount: 5.0,
  total_amount: 115.0,
  notes: 'Handle with delicate care',
  stores: {
    store_id: 'store-1',
    name: 'Downtown Flagship',
    address: '123 Main St, Suite 400',
    phone: '+1 555-0199',
    email: 'store@inventory.com',
  },
  customers: {
    id: 'cust-1',
    first_name: 'John',
    last_name: 'Wick',
    code: 'CUST-007',
    email: 'john@continental.com',
    phone: '+1 555-9999',
    address_line1: 'Continental Hotel, Room 801',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
  },
  warehouses: {
    id: 'wh-1',
    name: 'Main Distribution Hub',
    code: 'WH-MAIN',
  },
  channels: {
    id: 'ch-1',
    name: 'Direct POS',
    code: 'POS',
  },
  sales_order_items: [
    {
      id: 'item-1',
      sales_order_id: 'ord-test-100',
      product_variant_id: 'var-1',
      line_no: 1,
      qty_ordered: 2,
      unit_price: 60.0,
      discount_amount: 10.0,
      tax_amount: 5.0,
      line_total: 115.0,
      product_variants: {
        id: 'var-1',
        sku: 'TACT-VEST-BLK',
        name: 'Tactical Vest (Black)',
        products: {
          id: 'prod-1',
          name: 'Custom Tailored Tactical Vest',
          sku: 'VEST-PRO',
        },
      },
      uoms: {
        id: 'uom-1',
        name: 'Piece',
        code: 'PCS',
      },
    },
  ],
}

// Mock useOrder and useOrders
vi.mock('@/features/sales-orders/hooks/use-sales-orders', () => ({
  useOrder: (id?: string) => ({
    data: id === 'ord-test-100' ? sampleOrder : null,
    isLoading: false,
    error: id === 'ord-not-found' ? new Error('Not found') : null,
  }),
  useOrders: () => ({
    data: [
      sampleOrder,
      {
        id: 'ord-test-101',
        order_number: 'SO-2026-0100',
        status: 'draft',
        order_date: '2026-09-23T11:00:00Z',
        currency: 'USD',
        subtotal: 50.0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 50.0,
        stores: { name: 'Online Web Store' },
        customers: { first_name: 'Alice', last_name: 'Wonder' },
      },
    ],
    isLoading: false,
  }),
}))

describe('Sales Order Print Report & Analytics', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  test('generatePrintDocumentHtml generates complete standalone HTML with print media CSS', () => {
    const html = generatePrintDocumentHtml('<div>Printable Report Content</div>', {
      documentTitle: 'Sales Order SO-2026-0099',
      pageMargin: '12mm',
      autoPrint: false,
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Sales Order SO-2026-0099</title>')
    expect(html).toContain('Printable Report Content')
    expect(html).toContain('@page')
    expect(html).toContain('size: A4 portrait')
    expect(html).toContain('-webkit-print-color-adjust: exact !important')
  })

  test('printInNewWindow triggers window.print in test environments', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onComplete = vi.fn()

    printInNewWindow('<div>Sample Print Content</div>', { onComplete })

    expect(printSpy).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()

    printSpy.mockRestore()
  })

  test('SalesOrderPrintPage renders complete printable report with order specifications and items', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <QueryClientProvider client={queryClient}>
        <SalesOrderPrintPage orderId='ord-test-100' />
      </QueryClientProvider>
    )

    // Checks header & document badge
    expect(screen.getAllByText('SO-2026-0099').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/John Wick/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Downtown Flagship/i).length).toBeGreaterThan(0)

    // Checks item details
    expect(screen.getAllByText(/Custom Tailored Tactical Vest/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('TACT-VEST-BLK').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PCS').length).toBeGreaterThan(0)

    // Checks totals
    expect(screen.getAllByText('$115.00').length).toBeGreaterThan(0)

    // Print button triggers window.print()
    const printBtn = screen.getByRole('button', { name: /print report/i })
    fireEvent.click(printBtn)
    expect(printSpy).toHaveBeenCalled()

    printSpy.mockRestore()
  })

  test('SalesOrderPrintPage switches to Packing Slip template smoothly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SalesOrderPrintPage orderId='ord-test-100' />
      </QueryClientProvider>
    )

    const packingSlipBtn = screen.getByRole('button', { name: /packing slip/i })
    fireEvent.click(packingSlipBtn)

    expect(screen.getAllByText(/PACKING & DELIVERY SLIP/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Warehouse Fulfillment Checklist/i).length).toBeGreaterThan(0)
  })

  test('SalesOrderReportsPage renders executive KPIs and orders ledger with print links', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <QueryClientProvider client={queryClient}>
        <SalesOrderReportsPage />
      </QueryClientProvider>
    )

    // Verify Title & Metrics
    expect(screen.getByText('Sales Order Reports & Analytics')).toBeDefined()
    expect(screen.getByText('Total Orders')).toBeDefined()
    expect(screen.getByText('Total Pipeline')).toBeDefined()
    expect(screen.getByText('Avg Order Value')).toBeDefined()

    // Verify Orders in Ledger
    expect(screen.getByText('SO-2026-0099')).toBeDefined()
    expect(screen.getByText('SO-2026-0100')).toBeDefined()

    // Overview print button
    const printOverviewBtn = screen.getByRole('button', { name: /print overview/i })
    fireEvent.click(printOverviewBtn)
    expect(printSpy).toHaveBeenCalled()

    printSpy.mockRestore()
  })

  test('SalesOrderPrintPage renders not found fallback when order does not exist', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SalesOrderPrintPage orderId='ord-not-found' />
      </QueryClientProvider>
    )

    expect(screen.getByText('Sales Order Report Not Found')).toBeDefined()
    expect(screen.getByText(/Return to Sales Orders/i)).toBeDefined()
  })
})
