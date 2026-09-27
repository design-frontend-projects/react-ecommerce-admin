import { describe, it, expect, vi } from 'vitest'
import {
  calculatePOLine,
  calculatePOTotals,
  validatePOLine,
  checkDuplicateVariants,
} from '@/features/purchase-orders/utils/po-calculations'
import { SafeDecimal, toDecimal } from '@/features/purchase-orders/utils/decimal-math'
import { validatePurchaseOrderPayload } from '@/server/services/purchase-order-service'

describe('Purchase Order Calculations & Validation (Section 25)', () => {
  // ─── 1. Core Financial Calculation ─────────────────────────
  describe('Authoritative Calculation Formula', () => {
    it('computes exact formula: 10 * 100 = 1000, discount = 100, tax = 90, shipping = 20 -> grand_total = 1010', () => {
      // Line calculation:
      // gross_amount = 10 * 100 = 1000
      // net_before_tax = 1000 - 100 = 900
      // line_total = 900 + 90 = 990
      const line = calculatePOLine({
        quantity_ordered: 10,
        unit_cost: 100,
        discount_amount: 100,
        tax_amount: 90,
      })

      expect(line.subtotal).toBe(1000)
      expect(line.net_before_tax).toBe(900)
      expect(line.total_amount).toBe(990)

      // Header calculation:
      // subtotal = 1000
      // discount_total = 100
      // tax_total = 90
      // shipping = 20
      // grand_total = 1000 - 100 + 90 + 20 = 1010
      const headerTotals = calculatePOTotals(
        [
          {
            product_variant_id: 'var-1',
            quantity_ordered: 10,
            unit_cost: 100,
            discount_amount: 100,
            tax_amount: 90,
          },
        ],
        { shipping_amount: 20 }
      )

      expect(headerTotals.subtotal).toBe(1000)
      expect(headerTotals.discount_total).toBe(100)
      expect(headerTotals.tax_total).toBe(90)
      expect(headerTotals.shipping_amount).toBe(20)
      expect(headerTotals.grand_total).toBe(1010)
    })

    it('handles multiple lines and aggregates accurately without floating point drift', () => {
      const line1 = {
        product_variant_id: 'var-1',
        quantity_ordered: 0.1,
        unit_cost: 0.2, // 0.1 * 0.2 = 0.02
        discount_amount: 0.005,
        tax_amount: 0.003,
      }
      const line2 = {
        product_variant_id: 'var-2',
        quantity_ordered: 3,
        unit_cost: 33.3333,
        discount_amount: 0,
        tax_amount: 5,
      }

      const totals = calculatePOTotals([line1, line2], { shipping_amount: 15.5 })
      expect(totals.subtotal).toBeCloseTo(100.0199, 4)
      expect(totals.discount_total).toBe(0.005)
      expect(totals.tax_total).toBe(5.003)
      expect(totals.shipping_amount).toBe(15.5)
      expect(totals.grand_total).toBeCloseTo(100.0199 - 0.005 + 5.003 + 15.5, 4)
    })
  })

  // ─── 2. Fractional Quantity Validation ─────────────────────
  describe('Quantity Validation (Decimal 18, 4)', () => {
    it('allows valid fractional quantities (0.5 KG, 1.25 KG, 2.500 L, 10.5 meters)', () => {
      const resHalf = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 0.5,
        unit_cost: 10,
      })
      expect(resHalf.valid).toBe(true)

      const resFraction = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 1.25,
        unit_cost: 20,
      })
      expect(resFraction.valid).toBe(true)

      const resLiter = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 2.5,
        unit_cost: 12.3456,
      })
      expect(resLiter.valid).toBe(true)
    })

    it('rejects quantity = 0', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 0,
        unit_cost: 10,
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain('Quantity ordered must be greater than 0')
    })

    it('rejects negative quantity (quantity < 0)', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: -5,
        unit_cost: 10,
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain('Quantity ordered must be greater than 0')
    })
  })

  // ─── 3. Unit Cost Validation ───────────────────────────────
  describe('Unit Cost Validation', () => {
    it('rejects negative unit cost (unit_cost < 0)', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 1,
        unit_cost: -0.01,
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain('Unit cost must be greater than or equal to 0')
    })

    it('allows unit cost = 0 (free promotional sample / bonus item)', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 1,
        unit_cost: 0,
      })
      expect(res.valid).toBe(true)
    })
  })

  // ─── 4. Discount & Tax Validation ──────────────────────────
  describe('Discount & Tax Validation', () => {
    it('rejects negative discount', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 10,
        unit_cost: 10,
        discount_amount: -5,
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain('Discount amount must be greater than or equal to 0')
    })

    it('rejects discount > gross_amount', () => {
      // gross = 10 * 10 = 100, discount = 105 -> reject
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 10,
        unit_cost: 10,
        discount_amount: 105,
      })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('cannot exceed gross amount'))).toBe(true)
    })

    it('rejects negative tax', () => {
      const res = validatePOLine({
        product_variant_id: 'var-1',
        quantity_ordered: 10,
        unit_cost: 10,
        tax_amount: -2,
      })
      expect(res.valid).toBe(false)
      expect(res.errors).toContain('Tax amount must be greater than or equal to 0')
    })

    it('rejects negative shipping in calculatePOTotals', () => {
      expect(() =>
        calculatePOTotals(
          [
            {
              product_variant_id: 'var-1',
              quantity_ordered: 1,
              unit_cost: 10,
            },
          ],
          { shipping_amount: -10 }
        )
      ).toThrow('Shipping amount must be greater than or equal to 0')
    })
  })

  // ─── 5. Duplicate Variant Validation ───────────────────────
  describe('Duplicate Variant Validation (Section 14 & 20)', () => {
    it('rejects adding the same product_variant_id more than once to the same PO', () => {
      const duplicateItems = [
        { product_variant_id: 'variant-abc-123', quantity_ordered: 2, unit_cost: 10 },
        { product_variant_id: 'variant-abc-123', quantity_ordered: 5, unit_cost: 10 },
      ]

      const check = checkDuplicateVariants(duplicateItems)
      expect(check.hasDuplicates).toBe(true)
      expect(check.duplicateVariantIds).toContain('variant-abc-123')
    })

    it('passes when all product_variant_ids are distinct', () => {
      const distinctItems = [
        { product_variant_id: 'variant-abc-123', quantity_ordered: 2, unit_cost: 10 },
        { product_variant_id: 'variant-xyz-789', quantity_ordered: 5, unit_cost: 15 },
      ]

      const check = checkDuplicateVariants(distinctItems)
      expect(check.hasDuplicates).toBe(false)
      expect(check.duplicateVariantIds).toHaveLength(0)
    })
  })

  // ─── 6. Multi-Tenant Cross-Tenant Reference Protection ─────
  describe('Multi-Tenant Cross-Tenant Validation (Section 18 & 19)', () => {
    const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const supplierTenantA = '11111111-1111-1111-1111-111111111111'
    const variantTenantA = '22222222-2222-2222-2222-222222222222'
    const warehouseTenantA = '33333333-3333-3333-3333-333333333333'
    const variantTenantB = '44444444-4444-4444-4444-444444444444'

    it('rejects cross-tenant references when tenant A attempts to reference tenant B variant', async () => {
      // Mock prisma lookups
      const mockPrisma = {
        suppliers: {
          findFirst: vi.fn().mockResolvedValue({ id: supplierTenantA, tenant_id: tenantA }),
        },
        warehouses: {
          findFirst: vi.fn().mockResolvedValue({ id: warehouseTenantA, tenant_id: tenantA }),
        },
        product_variants: {
          findMany: vi.fn().mockResolvedValue([
            // Return only variants that match tenantA
            { id: variantTenantA, tenant_id: tenantA, is_active: true, uom_id: null },
          ]),
        },
        uoms: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      }

      await expect(
        validatePurchaseOrderPayload(
          tenantA,
          {
            supplier_id: supplierTenantA,
            warehouse_id: warehouseTenantA,
            order_date: '2026-09-27',
          },
          [
            // Attempting to include variant from Tenant B
            { product_variant_id: variantTenantB, quantity_ordered: 5, unit_cost: 10 },
          ],
          mockPrisma as any
        )
      ).rejects.toThrow(/not found, inactive, or belong to another tenant/)
    })

    it('rejects when tenant A attempts to reference a non-existent or tenant B supplier', async () => {
      const mockPrisma = {
        suppliers: {
          findFirst: vi.fn().mockResolvedValue(null), // Supplier not in tenant A
        },
      }

      await expect(
        validatePurchaseOrderPayload(
          tenantA,
          {
            supplier_id: 'supplier-from-tenant-b',
            order_date: '2026-09-27',
          },
          [{ product_variant_id: variantTenantA, quantity_ordered: 1, unit_cost: 10 }],
          mockPrisma as any
        )
      ).rejects.toThrow(/Supplier does not exist or does not belong to this tenant/)
    })

    it('rejects when a product variant is inactive', async () => {
      const mockPrisma = {
        suppliers: {
          findFirst: vi.fn().mockResolvedValue({ id: supplierTenantA, tenant_id: tenantA }),
        },
        warehouses: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        product_variants: {
          findMany: vi.fn().mockResolvedValue([
            { id: variantTenantA, tenant_id: tenantA, is_active: false }, // INACTIVE
          ]),
        },
        uoms: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      }

      await expect(
        validatePurchaseOrderPayload(
          tenantA,
          {
            supplier_id: supplierTenantA,
            order_date: '2026-09-27',
          },
          [{ product_variant_id: variantTenantA, quantity_ordered: 1, unit_cost: 10 }],
          mockPrisma as any
        )
      ).rejects.toThrow(/inactive/)
    })
  })
})
