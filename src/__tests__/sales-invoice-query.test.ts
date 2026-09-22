import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getInvoiceById,
  listSalesInvoices,
  getInvoiceDashboardStats,
  getInvoiceReports,
} from '@/server/fns/sales-invoice-engine'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    sales_invoices: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('2f2e33cb-68b7-4d80-8cb6-0c9997a63c64'),
  resolveTenantUserId: vi.fn().mockResolvedValue('user-uuid-1'),
}))

vi.mock('@/server/context/tenant-context', () => ({
  runWithTenantContext: vi.fn().mockImplementation((_ctx, fn) => fn()),
}))

describe('Sales Invoice Engine — Query Construction & Customer Relations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getInvoiceById constructs Prisma query without unknown customer_type or company_name fields', async () => {
    const mockInvoice = {
      id: '3e421cdf-4989-477d-a812-9c316282c215',
      invoice_no: 'INV-2026-000001',
      tenant_id: '2f2e33cb-68b7-4d80-8cb6-0c9997a63c64',
      status: 'issued',
      total_amount: 100,
      paid_amount: 50,
      due_amount: 50,
      customers: {
        id: 'cust-1',
        code: 'CUST-001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+123456789',
        address_line1: '123 Market St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
      },
      sales_invoice_items: [],
      sales_invoice_payments: [],
      warehouses: { id: 'w-1', name: 'Main', code: 'WH-01' },
      currencies: { id: 'curr-1', code: 'USD', symbol: '$' },
      channels: { id: 'ch-1', name: 'Retail Store', channel_type: 'retail' },
    }

    vi.mocked(prisma.sales_invoices.findFirst).mockResolvedValue(mockInvoice as any)

    const res = await getInvoiceById('auth-user-id', '3e421cdf-4989-477d-a812-9c316282c215')
    expect(res).toBeDefined()
    expect(res.id).toBe('3e421cdf-4989-477d-a812-9c316282c215')

    const findFirstCall = vi.mocked(prisma.sales_invoices.findFirst).mock.calls[0][0]
    expect(findFirstCall).toBeDefined()

    const customerSelect = findFirstCall?.include?.customers?.select
    expect(customerSelect).toBeDefined()

    // Assert that unknown fields are absent
    expect(customerSelect).not.toHaveProperty('customer_type')
    expect(customerSelect).not.toHaveProperty('company_name')

    // Assert that valid model fields exist
    expect(customerSelect).toHaveProperty('id', true)
    expect(customerSelect).toHaveProperty('first_name', true)
    expect(customerSelect).toHaveProperty('last_name', true)
    expect(customerSelect).toHaveProperty('email', true)
    expect(customerSelect).toHaveProperty('phone', true)
    expect(customerSelect).toHaveProperty('code', true)
    expect(customerSelect).toHaveProperty('address_line1', true)
  })

  it('listSalesInvoices constructs search and include without customer_type or company_name', async () => {
    vi.mocked(prisma.sales_invoices.count).mockResolvedValue(1)
    vi.mocked(prisma.sales_invoices.findMany).mockResolvedValue([
      {
        id: 'inv-1',
        invoice_no: 'INV-001',
        customers: {
          id: 'cust-1',
          code: 'CUST-001',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          phone: '+1987654321',
        },
        _count: { sales_invoice_items: 2, sales_invoice_payments: 1 },
      } as any,
    ])

    const res = await listSalesInvoices('auth-user-id', {
      search: 'Alice',
      page: 1,
      pageSize: 10,
    })

    expect(res.items).toHaveLength(1)

    const findManyCall = vi.mocked(prisma.sales_invoices.findMany).mock.calls[0][0]
    expect(findManyCall).toBeDefined()

    // Check customer select in include
    const customerSelect = findManyCall?.include?.customers?.select
    expect(customerSelect).not.toHaveProperty('customer_type')
    expect(customerSelect).not.toHaveProperty('company_name')
    expect(customerSelect).toHaveProperty('id', true)
    expect(customerSelect).toHaveProperty('code', true)

    // Check search where.OR
    const orClauses = findManyCall?.where?.OR as any[]
    expect(orClauses).toBeDefined()
    const customerOrClause = orClauses.find((c) => c.customers)
    expect(customerOrClause).toBeDefined()

    const customerFieldsSearched = customerOrClause.customers.OR.map((o: any) => Object.keys(o)[0])
    expect(customerFieldsSearched).not.toContain('company_name')
    expect(customerFieldsSearched).toContain('first_name')
    expect(customerFieldsSearched).toContain('last_name')
    expect(customerFieldsSearched).toContain('code')
  })

  it('getInvoiceDashboardStats and getInvoiceReports queries do not query company_name', async () => {
    vi.mocked(prisma.sales_invoices.aggregate).mockResolvedValue({
      _sum: { total_amount: 1000, paid_amount: 800, due_amount: 200, tax_amount: 50, discount_amount: 10 },
      _count: { id: 10 },
    } as any)
    vi.mocked(prisma.sales_invoices.groupBy).mockResolvedValue([])
    vi.mocked(prisma.sales_invoices.findMany).mockResolvedValue([])

    await getInvoiceDashboardStats('auth-user-id')

    const statsFindManyCall = vi.mocked(prisma.sales_invoices.findMany).mock.calls[0][0]
    expect(statsFindManyCall?.include?.customers?.select).not.toHaveProperty('company_name')

    // Test getInvoiceReports outstanding
    await getInvoiceReports('auth-user-id', { reportType: 'outstanding' })
    const outstandingCall = vi.mocked(prisma.sales_invoices.findMany).mock.calls[1][0]
    expect(outstandingCall?.include?.customers?.select).not.toHaveProperty('company_name')

    // Test getInvoiceReports sales
    await getInvoiceReports('auth-user-id', { reportType: 'sales' })
    const salesCall = vi.mocked(prisma.sales_invoices.findMany).mock.calls[2][0]
    expect(salesCall?.include?.customers?.select).not.toHaveProperty('company_name')
  })
})
