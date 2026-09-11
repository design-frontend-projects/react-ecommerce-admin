import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomersProvider, useCustomersContext } from '@/features/customers/components/customers-provider'
import { CustomerKpiCards } from '@/features/customers/components/customer-kpi-cards'
import { CustomerDetailSheet } from '@/features/customers/components/customer-detail-sheet'
import type { Customer } from '@/features/customers/hooks/use-customers'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/features/customers/hooks/use-customers', () => ({
  useCustomerCards: () => ({
    data: [
      {
        id: 'card-1',
        customer_id: 'cust-1',
        card_type: 'Visa',
        last_four_digits: '4242',
        expiry_month: 12,
        expiry_year: 2028,
        cardholder_name: 'Alice Johnson',
        billing_address: '123 Main St',
        is_default: true,
      },
    ],
    isLoading: false,
  }),
  useCreateCustomerCard: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCustomerCard: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    first_name: 'Alice',
    last_name: 'Johnson',
    code: 'CUST-1001',
    email: 'alice@example.com',
    phone: '+1 555-0101',
    address_line1: '123 Main St',
    address_line2: 'Suite 4',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
    date_of_birth: '1990-05-15',
    loyalty_points: 120,
    is_active: true,
    group_id: 'group-1',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: null,
    customer_groups: {
      id: 'group-1',
      name: 'VIP Gold',
      discount_percentage: 15,
      minimum_order_amount: 50,
    },
  },
  {
    id: 'cust-2',
    first_name: 'Bob',
    last_name: 'Smith',
    code: 'CUST-1002',
    email: 'bob@example.com',
    phone: '+1 555-0102',
    address_line1: '456 Elm St',
    address_line2: null,
    city: 'Los Angeles',
    state: 'CA',
    postal_code: '90001',
    country: 'USA',
    date_of_birth: null,
    loyalty_points: 0,
    is_active: false,
    group_id: null,
    created_at: '2026-02-15T12:00:00Z',
    updated_at: null,
  },
]

function KpiTestHarness() {
  const { filterStatus } = useCustomersContext()
  return (
    <div>
      <span data-testid='current-filter'>{filterStatus || 'none'}</span>
      <CustomerKpiCards data={mockCustomers} />
    </div>
  )
}

function SheetTestHarness() {
  const { setOpen, setCurrentRow } = useCustomersContext()
  return (
    <div>
      <button
        onClick={() => {
          setCurrentRow(mockCustomers[0])
          setOpen('view')
        }}
      >
        Open Sheet
      </button>
      <CustomerDetailSheet />
    </div>
  )
}

describe('Customers Module Redesign', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  it('renders KPI metrics correctly and updates filter state on click', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CustomersProvider>
          <KpiTestHarness />
        </CustomersProvider>
      </QueryClientProvider>
    )

    // Verify KPI numbers: Total = 2, Active = 1, Loyalty = 1, Grouped = 1
    expect(screen.getByText('Total Customers')).toBeInTheDocument()
    expect(screen.getByText('Active Customers')).toBeInTheDocument()
    expect(screen.getByText('Loyalty Members')).toBeInTheDocument()
    expect(screen.getByText('Group Members')).toBeInTheDocument()

    // Click on Active Customers card
    const activeCard = screen.getByText('Active Customers').closest('.cursor-pointer')!
    await user.click(activeCard)

    expect(screen.getByTestId('current-filter').textContent).toBe('active')

    // Click again to toggle off
    await user.click(activeCard)
    expect(screen.getByTestId('current-filter').textContent).toBe('none')
  })

  it('renders CustomerDetailSheet with complete 360 profile, code, and cards', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CustomersProvider>
          <SheetTestHarness />
        </CustomersProvider>
      </QueryClientProvider>
    )

    await user.click(screen.getByText('Open Sheet'))

    // Check customer name and code
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('CUST-1001')).toBeInTheDocument()
    expect(screen.getByText('VIP Gold')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()

    // Check payment card details
    expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })
})
