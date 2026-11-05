import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  supplierInputSchema,
  supplierListItemSchema,
  type SupplierInput,
} from '@/features/suppliers/data/schema'
import { SuppliersProvider, useSuppliersContext } from '@/features/suppliers/components/suppliers-provider'
import { SupplierDeleteDialog } from '@/features/suppliers/components/supplier-delete-dialog'
import { SuppliersStats } from '@/features/suppliers/components/suppliers-stats'
import { SupplierDetailsSheet } from '@/features/suppliers/components/supplier-details-sheet'
import * as actions from '@/features/suppliers/data/actions'
import * as authorizedRequestModule from '@/lib/authorized-request'
import type { Supplier } from '@/features/suppliers/hooks/use-suppliers'

vi.mock('@/lib/authorized-request', () => ({
  authorizedRequest: vi.fn(),
}))

describe('Milestone 3 Empirical Stress Tests — Suppliers Module', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  describe('Focus Area 2: Zod Schema Validation Boundaries', () => {
    it('accepts both snake_case and camelCase input conventions cleanly', () => {
      const snakeInput: SupplierInput = {
        name: 'Snake Vendor',
        code: 'SNAKE-01',
        contact_person: 'Ahmed Ali',
        email: 'ahmed@vendor.com',
        phone: '+201111111111',
        address: '10 Industrial Zone, 6th of October',
        website: 'https://snakevendor.com',
        tax_number: 'TX-998877',
        payment_terms_days: 45,
        notes: 'Snake case payload test',
        is_preferred: true,
        is_active: true,
      }
      const parsedSnake = supplierInputSchema.safeParse(snakeInput)
      expect(parsedSnake.success).toBe(true)
      if (parsedSnake.success) {
        expect(parsedSnake.data.name).toBe('Snake Vendor')
        expect(parsedSnake.data.contact_person).toBe('Ahmed Ali')
        expect(parsedSnake.data.tax_number).toBe('TX-998877')
        expect(parsedSnake.data.payment_terms_days).toBe(45)
        expect(parsedSnake.data.is_preferred).toBe(true)
        expect(parsedSnake.data.is_active).toBe(true)
      }

      const camelInput = {
        name: 'Camel Vendor',
        code: 'CAMEL-01',
        contactPerson: 'Sarah Connor',
        email: 'sarah@camelvendor.com',
        phone: '+201222222222',
        address: '25 Tech Park, Smart Village',
        website: 'https://camelvendor.com',
        taxNumber: 'TX-112233',
        paymentTermsDays: 60,
        notes: 'Camel case payload test',
        isPreferred: true,
        isActive: false,
      }
      const parsedCamel = supplierInputSchema.safeParse(camelInput)
      expect(parsedCamel.success).toBe(true)
      if (parsedCamel.success) {
        expect(parsedCamel.data.name).toBe('Camel Vendor')
        expect(parsedCamel.data.contactPerson).toBe('Sarah Connor')
        expect(parsedCamel.data.taxNumber).toBe('TX-112233')
        expect(parsedCamel.data.paymentTermsDays).toBe(60)
        expect(parsedCamel.data.isPreferred).toBe(true)
        expect(parsedCamel.data.isActive).toBe(false)
      }
    })

    it('enforces boundaries on payment_terms_days (min: 0, integer, string coercion)', () => {
      // 0 is valid (immediate payment / COD)
      expect(supplierInputSchema.safeParse({ name: 'V', payment_terms_days: 0 }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', paymentTermsDays: 0 }).success).toBe(true)

      // String coercion of positive integers
      const coercedStr = supplierInputSchema.safeParse({ name: 'V', payment_terms_days: '30' as any })
      expect(coercedStr.success).toBe(true)
      if (coercedStr.success) {
        expect(coercedStr.data.payment_terms_days).toBe(30)
      }

      // Negative values must be rejected
      const negVal = supplierInputSchema.safeParse({ name: 'V', payment_terms_days: -1 })
      expect(negVal.success).toBe(false)

      const negStr = supplierInputSchema.safeParse({ name: 'V', payment_terms_days: '-15' as any })
      expect(negStr.success).toBe(false)

      // Floating points must be rejected (terms are in integer days)
      const floatVal = supplierInputSchema.safeParse({ name: 'V', payment_terms_days: 14.5 })
      expect(floatVal.success).toBe(false)

      // Non-numeric strings must be rejected
      const invalidStr = supplierInputSchema.safeParse({ name: 'V', payment_terms_days: 'thirty' as any })
      expect(invalidStr.success).toBe(false)

      // Null and undefined are allowed (unspecified payment terms)
      expect(supplierInputSchema.safeParse({ name: 'V', payment_terms_days: null }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', payment_terms_days: undefined }).success).toBe(true)
    })

    it('enforces email format boundaries and allows empty/null/undefined', () => {
      // Valid emails
      expect(supplierInputSchema.safeParse({ name: 'V', email: 'vendor@domain.com' }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', email: 'first.last+sub@company.co.uk' }).success).toBe(true)

      // Optional / empty representations
      expect(supplierInputSchema.safeParse({ name: 'V', email: '' }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', email: null }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', email: undefined }).success).toBe(true)

      // Invalid emails
      expect(supplierInputSchema.safeParse({ name: 'V', email: 'not-an-email' }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', email: '@domain.com' }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', email: 'missing-domain@' }).success).toBe(false)
    })

    it('enforces string length boundaries on code, name, website, and tax_number', () => {
      // Name: min 1, max 150
      expect(supplierInputSchema.safeParse({ name: '' }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'A'.repeat(150) }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'A'.repeat(151) }).success).toBe(false)

      // Code: max 50
      expect(supplierInputSchema.safeParse({ name: 'V', code: 'A'.repeat(50) }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', code: 'A'.repeat(51) }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', code: '' }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', code: null }).success).toBe(true)

      // Tax number: max 50
      expect(supplierInputSchema.safeParse({ name: 'V', tax_number: 'A'.repeat(50) }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', tax_number: 'A'.repeat(51) }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', taxNumber: 'A'.repeat(50) }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', taxNumber: 'A'.repeat(51) }).success).toBe(false)

      // Website: max 255
      expect(supplierInputSchema.safeParse({ name: 'V', website: 'https://' + 'a'.repeat(240) + '.com' }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', website: 'a'.repeat(256) }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', website: '' }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', website: null }).success).toBe(true)
    })

    it('validates RFC-compliant UUID relationships for supplier category and city', () => {
      const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      expect(supplierInputSchema.safeParse({ name: 'V', supplier_category_id: validUuid }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', supplierCategoryId: validUuid }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', city_id: validUuid }).success).toBe(true)
      expect(supplierInputSchema.safeParse({ name: 'V', cityId: validUuid }).success).toBe(true)

      expect(supplierInputSchema.safeParse({ name: 'V', supplier_category_id: 'non-uuid-string' }).success).toBe(false)
      expect(supplierInputSchema.safeParse({ name: 'V', city_id: '12345' }).success).toBe(false)
    })

    it('validates supplierListItemSchema with complete, partial, and null relation fields', () => {
      const item = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        name: 'Comprehensive Vendor',
        code: null,
        contact_person: null,
        email: null,
        phone: null,
        tax_number: null,
        payment_terms_days: null,
        address: null,
        website: null,
        notes: null,
        is_active: true,
        is_preferred: false,
        created_at: new Date(),
        _count: {
          products: 0,
          purchase_orders: 0,
        },
      }
      expect(supplierListItemSchema.safeParse(item).success).toBe(true)
    })

    it('empirically reveals boolean default collision bug in schema.ts', () => {
      // When caller submits snake_case with is_preferred: true, is_active: false
      const parsed = supplierInputSchema.parse({
        name: 'Collision Vendor',
        is_preferred: true,
        is_active: false,
      })

      // is_preferred parsed as true, BUT isPreferred defaulted to false!
      expect(parsed.is_preferred).toBe(true)
      expect(parsed.isPreferred).toBe(false)

      // is_active parsed as false, BUT isActive defaulted to true!
      expect(parsed.is_active).toBe(false)
      expect(parsed.isActive).toBe(true)

      // This proves that parsed.isActive and parsed.isPreferred contain conflicting values
      expect(parsed.is_preferred).not.toBe(parsed.isPreferred)
      expect(parsed.is_active).not.toBe(parsed.isActive)
    })
  })

  describe('Focus Area 3: Delete Dialog Dependency Blocking Logic', () => {
    const baseSupplier: Supplier = {
      id: 'sup-uuid-1234-5678',
      tenant_id: 'tenant-uuid-0000',
      name: 'Test Deletable Supplier',
      code: 'SUP-DEL-01',
      contact_person: 'Target Vendor',
      email: 'delete@test.com',
      phone: '+1234567890',
      tax_number: 'TX-999',
      payment_terms_days: 30,
      address: 'Industrial St',
      website: 'https://test.com',
      notes: null,
      is_preferred: false,
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    }

    function setupDeleteDialog(supplier: Supplier | null) {
      function Wrapper() {
        const { setOpen, setCurrentRow } = useSuppliersContext()
        return (
          <div>
            <button
              onClick={() => {
                setCurrentRow(supplier)
                setOpen('delete')
              }}
            >
              Trigger Delete
            </button>
            <SupplierDeleteDialog />
          </div>
        )
      }

      const utils = render(
        <QueryClientProvider client={queryClient}>
          <SuppliersProvider>
            <Wrapper />
          </SuppliersProvider>
        </QueryClientProvider>
      )
      fireEvent.click(screen.getByText('Trigger Delete'))
      return utils
    }

    it('blocks deletion when supplier has both products and purchase orders', () => {
      const blockedSupplier: Supplier = {
        ...baseSupplier,
        _count: { products: 12, purchase_orders: 8 },
      }
      setupDeleteDialog(blockedSupplier)

      expect(screen.getByText(/Cannot delete supplier: linked purchase orders or products exist/i)).toBeInTheDocument()
      expect(screen.getByText(/This supplier has 12 linked product\(s\) and 8 purchase order\(s\)/i)).toBeInTheDocument()

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).toBeDisabled()
    })

    it('blocks deletion when supplier has products but zero purchase orders', () => {
      const blockedSupplier: Supplier = {
        ...baseSupplier,
        _count: { products: 5, purchase_orders: 0 },
      }
      setupDeleteDialog(blockedSupplier)

      expect(screen.getByText(/Cannot delete supplier: linked purchase orders or products exist/i)).toBeInTheDocument()
      expect(screen.getByText(/This supplier has 5 linked product\(s\) and 0 purchase order\(s\)/i)).toBeInTheDocument()

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).toBeDisabled()
    })

    it('blocks deletion when supplier has zero products but active purchase orders', () => {
      const blockedSupplier: Supplier = {
        ...baseSupplier,
        _count: { products: 0, purchase_orders: 3 },
      }
      setupDeleteDialog(blockedSupplier)

      expect(screen.getByText(/Cannot delete supplier: linked purchase orders or products exist/i)).toBeInTheDocument()
      expect(screen.getByText(/This supplier has 0 linked product\(s\) and 3 purchase order\(s\)/i)).toBeInTheDocument()

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).toBeDisabled()
    })

    it('permits deletion when supplier has explicit 0 products and 0 purchase orders', () => {
      const safeSupplier: Supplier = {
        ...baseSupplier,
        _count: { products: 0, purchase_orders: 0 },
      }
      setupDeleteDialog(safeSupplier)

      expect(screen.queryByText(/Cannot delete supplier: linked purchase orders or products exist/i)).not.toBeInTheDocument()
      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).not.toBeDisabled()
    })

    it('permits deletion when supplier has undefined _count object', () => {
      const noCountSupplier: Supplier = {
        ...baseSupplier,
        _count: undefined,
      }
      setupDeleteDialog(noCountSupplier)

      expect(screen.queryByText(/Cannot delete supplier: linked purchase orders or products exist/i)).not.toBeInTheDocument()
      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).not.toBeDisabled()
    })

    it('defense-in-depth: clicking disabled delete button does not trigger mutation call', () => {
      const blockedSupplier: Supplier = {
        ...baseSupplier,
        _count: { products: 15, purchase_orders: 4 },
      }
      setupDeleteDialog(blockedSupplier)

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i })
      expect(deleteBtn).toBeDisabled()

      // Attempt to click anyway
      fireEvent.click(deleteBtn)
      expect(authorizedRequestModule.authorizedRequest).not.toHaveBeenCalled()
    })
  })

  describe('Focus Area 4: Additional Component Resilience and Edge Cases', () => {
    it('SuppliersStats handles empty array without NaN or division by zero', () => {
      render(<SuppliersStats data={[]} />)

      expect(screen.getByText('Total Suppliers')).toBeInTheDocument()
      expect(screen.getByText('Active Suppliers')).toBeInTheDocument()
      expect(screen.getByText('Preferred Suppliers')).toBeInTheDocument()
      expect(screen.getByText('Linked Products')).toBeInTheDocument()

      // All 4 metrics should be 0
      const zeroMetrics = screen.getAllByText('0')
      expect(zeroMetrics.length).toBeGreaterThanOrEqual(4)

      // Verify that no NaN string exists anywhere in the rendered markup
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    })

    it('SuppliersStats displays skeleton placeholders when isLoading is true', () => {
      const { container } = render(<SuppliersStats data={[]} isLoading={true} />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('SupplierDetailsSheet handles supplier with null optional fields gracefully', () => {
      const minimalSupplier: Supplier = {
        id: 's-min-1',
        tenant_id: 't-min-1',
        name: 'Minimal Vendor Ltd',
        code: null,
        contact_person: null,
        email: null,
        phone: null,
        tax_number: null,
        payment_terms_days: null,
        address: null,
        website: null,
        notes: null,
        is_preferred: false,
        is_active: true,
        created_at: null,
        _count: { products: 0, purchase_orders: 0 },
      }

      function TestSheet() {
        const { setOpen, setCurrentRow } = useSuppliersContext()
        return (
          <div>
            <button
              onClick={() => {
                setCurrentRow(minimalSupplier)
                setOpen('view')
              }}
            >
              Open Minimal Sheet
            </button>
            <SupplierDetailsSheet />
          </div>
        )
      }

      render(
        <QueryClientProvider client={queryClient}>
          <SuppliersProvider>
            <TestSheet />
          </SuppliersProvider>
        </QueryClientProvider>
      )

      fireEvent.click(screen.getByText('Open Minimal Sheet'))

      expect(screen.getByText('Minimal Vendor Ltd')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('MV')).toBeInTheDocument() // Initials avatar
    })
  })
})
