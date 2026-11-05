import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, beforeEach } from 'vitest'
import { SuppliersProvider, useSuppliersContext } from '@/features/suppliers/components/suppliers-provider'
import { SuppliersStats } from '@/features/suppliers/components/suppliers-stats'
import { SuppliersTable } from '@/features/suppliers/components/suppliers-table'
import { SupplierDetailsSheet } from '@/features/suppliers/components/supplier-details-sheet'
import { SupplierDeleteDialog } from '@/features/suppliers/components/supplier-delete-dialog'
import { type Supplier } from '@/features/suppliers/hooks/use-suppliers'

const sampleSuppliers: Supplier[] = [
  {
    id: 's1-1111-1111-1111-111111111111',
    tenant_id: 't1-1111-1111-1111-111111111111',
    name: 'Fresh Farm Produce',
    code: 'SUP-001',
    contact_person: 'Ali Mansour',
    email: 'ali@freshfarm.com',
    phone: '+201000000010',
    tax_number: 'TR-10293847',
    payment_terms_days: 30,
    address: 'Giza Agricultural Road, Cairo',
    website: 'https://freshfarm.com',
    notes: 'Premium organic vegetables and herbs.',
    is_preferred: true,
    is_active: true,
    created_at: '2026-01-15T00:00:00.000Z',
    _count: {
      products: 25,
      purchase_orders: 12,
    },
  },
  {
    id: 's2-2222-2222-2222-222222222222',
    tenant_id: 't1-1111-1111-1111-111111111111',
    name: 'Old Packaging Co',
    code: 'SUP-002',
    contact_person: 'Mona Nader',
    email: 'mona@oldpackaging.com',
    phone: '+201000000020',
    tax_number: 'TR-55443322',
    payment_terms_days: 15,
    address: '10th of Ramadan City',
    website: null,
    notes: null,
    is_preferred: false,
    is_active: false,
    created_at: '2026-02-01T00:00:00.000Z',
    _count: {
      products: 0,
      purchase_orders: 0,
    },
  },
]

describe('Suppliers Module Feature Suites', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  test('SuppliersStats accurately calculates totals, active, preferred, and linked products', () => {
    render(<SuppliersStats data={sampleSuppliers} />)

    // Total suppliers = 2
    expect(screen.getByText('Total Suppliers')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Active suppliers = 1 (Fresh Farm Produce)
    expect(screen.getByText('Active Suppliers')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)

    // Preferred suppliers = 1
    expect(screen.getByText('Preferred Suppliers')).toBeInTheDocument()

    // Linked Products = 25
    expect(screen.getByText('Linked Products')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  test('SuppliersTable renders dynamic columns, status badges, and vendor rows', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SuppliersProvider>
          <SuppliersTable data={sampleSuppliers} />
        </SuppliersProvider>
      </QueryClientProvider>
    )

    expect(screen.getByText('Fresh Farm Produce')).toBeInTheDocument()
    expect(screen.getByText('SUP-001')).toBeInTheDocument()
    expect(screen.getByText('Ali Mansour')).toBeInTheDocument()
    expect(screen.getByText('ali@freshfarm.com')).toBeInTheDocument()
    expect(screen.getByText('Old Packaging Co')).toBeInTheDocument()
    expect(screen.getByText('SUP-002')).toBeInTheDocument()
  })

  test('SupplierDetailsSheet displays complete vendor profile, contacts, terms, and notes', () => {
    function TestConsumer() {
      const { setOpen, setCurrentRow } = useSuppliersContext()
      return (
        <div>
          <button
            onClick={() => {
              setCurrentRow(sampleSuppliers[0])
              setOpen('view')
            }}
          >
            Open Details
          </button>
          <SupplierDetailsSheet />
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <SuppliersProvider>
          <TestConsumer />
        </SuppliersProvider>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByText('Open Details'))

    expect(screen.getByText('Supplier Profile')).toBeInTheDocument()
    expect(screen.getAllByText('Fresh Farm Produce').length).toBeGreaterThan(0)
    expect(screen.getByText(/Giza Agricultural Road, Cairo/i)).toBeInTheDocument()
    expect(screen.getByText('TR-10293847')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
    expect(screen.getByText('Premium organic vegetables and herbs.')).toBeInTheDocument()
  })

  test('SupplierDeleteDialog prevents deletion when supplier has linked dependencies', () => {
    function TestConsumer() {
      const { setOpen, setCurrentRow } = useSuppliersContext()
      return (
        <div>
          <button
            onClick={() => {
              setCurrentRow(sampleSuppliers[0]) // Has 25 products and 12 orders
              setOpen('delete')
            }}
          >
            Open Delete
          </button>
          <SupplierDeleteDialog />
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <SuppliersProvider>
          <TestConsumer />
        </SuppliersProvider>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByText('Open Delete'))

    expect(screen.getAllByText(/Delete Supplier/i).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/Cannot delete supplier: linked purchase orders or products exist/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This supplier has 25 linked product\(s\) and 12 purchase order\(s\)/i)
    ).toBeInTheDocument()

    // Confirm button should be disabled
    const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
    expect(deleteBtn).toBeDisabled()
  })

  test('SupplierDeleteDialog permits deletion when supplier has 0 linked dependencies', () => {
    function TestConsumer() {
      const { setOpen, setCurrentRow } = useSuppliersContext()
      return (
        <div>
          <button
            onClick={() => {
              setCurrentRow(sampleSuppliers[1]) // Has 0 products and 0 orders
              setOpen('delete')
            }}
          >
            Open Delete Safe
          </button>
          <SupplierDeleteDialog />
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <SuppliersProvider>
          <TestConsumer />
        </SuppliersProvider>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByText('Open Delete Safe'))

    expect(screen.getAllByText(/Delete Supplier/i).length).toBeGreaterThan(0)
    expect(
      screen.queryByText(/Cannot delete supplier: linked purchase orders or products exist/i)
    ).not.toBeInTheDocument()

    // Confirm button should NOT be disabled
    const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
    expect(deleteBtn).not.toBeDisabled()
  })
})
