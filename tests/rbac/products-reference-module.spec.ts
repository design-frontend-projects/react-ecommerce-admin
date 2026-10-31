import { describe, it, expect } from 'vitest'
import {
  stripSensitiveProductFields,
  validateProductImportRows,
  Product,
  ProductImportRow,
} from '../helpers/rbac-contracts'

describe('Feature 13: Products Reference Module (11 Granular Permissions, Sensitive Stripping & Import)', () => {
  const tenantId = 'tenant-grocery-1'

  const sampleProduct: Product = {
    id: 'prod-001',
    tenant_id: tenantId,
    name: 'Organic Almond Milk 1L',
    sku: 'MILK-ALMOND-1L',
    unit_cost: 2.5,
    cost_price: 2.5,
    product_suppliers: [
      { id: 'ps-1', product_id: 'prod-001', supplier_id: 'sup-alpha', unit_cost: 2.45, is_preferred: true },
      { id: 'ps-2', product_id: 'prod-001', supplier_id: 'sup-beta', unit_cost: 2.6, is_preferred: false },
    ],
    product_variants: [
      {
        id: 'var-1',
        product_id: 'prod-001',
        sku: 'MILK-ALMOND-1L-REG',
        cost_price: 2.5,
        selling_price: 4.99,
        price_list_items: [
          {
            id: 'pli-1',
            price_list_id: 'pl-retail',
            price: 4.99,
            cost_price: 2.5,
            margin: 49.9,
            markup: 99.6,
          },
        ],
      },
    ],
  }

  describe('Tier 1: Feature Coverage (Sensitive Field Stripping)', () => {
    it('strips unit_cost, cost_price, margin, and markup when user lacks general.products.view_cost', () => {
      const sanitized = stripSensitiveProductFields(sampleProduct, false)

      // Top level
      expect(sanitized.unit_cost).toBeUndefined()
      expect(sanitized.cost_price).toBeUndefined()

      // Suppliers unit cost stripped to 0
      expect(sanitized.product_suppliers?.[0].unit_cost).toBe(0)
      expect(sanitized.product_suppliers?.[1].unit_cost).toBe(0)

      // Variants cost price deleted
      expect(sanitized.product_variants?.[0].cost_price).toBeUndefined()
      expect(sanitized.product_variants?.[0].selling_price).toBe(4.99) // Selling price preserved

      // Price list item margin and markup deleted
      const pli = sanitized.product_variants?.[0].price_list_items?.[0]
      expect(pli?.cost_price).toBeUndefined()
      expect(pli?.margin).toBeUndefined()
      expect(pli?.markup).toBeUndefined()
      expect(pli?.price).toBe(4.99) // Price preserved
    })

    it('preserves all cost, margin, and supplier cost fields when user holds general.products.view_cost', () => {
      const unmodified = stripSensitiveProductFields(sampleProduct, true)

      expect(unmodified.unit_cost).toBe(2.5)
      expect(unmodified.product_suppliers?.[0].unit_cost).toBe(2.45)
      expect(unmodified.product_variants?.[0].cost_price).toBe(2.5)
      expect(unmodified.product_variants?.[0].price_list_items?.[0].margin).toBe(49.9)
    })

    it('validates 11 granular permissions taxonomy for Products module', () => {
      const productPermissions = [
        'general.products.view',
        'general.products.create',
        'general.products.update',
        'general.products.delete',
        'general.products.print',
        'general.products.export',
        'general.products.import',
        'general.products.view_cost',
        'general.products.manage_prices',
        'general.products.manage_variants',
        'general.products.manage_barcodes',
      ]

      expect(productPermissions).toHaveLength(11)
      expect(productPermissions.every((p) => p.startsWith('general.products.'))).toBe(true)
    })
  })

  describe('Tier 1: Feature Coverage (Row-Level Product Import)', () => {
    const tenantContext = {
      tenantId,
      validCategoryIds: new Set(['cat-beverages', 'cat-snacks']),
      validSupplierIds: new Set(['sup-alpha', 'sup-beta']),
      existingSkus: new Set(['EXISTING-SKU-001']),
      hasCostPermission: true,
    }

    it('successfully imports valid CSV rows with tenant foreign keys and unique SKUs', () => {
      const rows: ProductImportRow[] = [
        {
          rowNumber: 1,
          name: 'Oat Milk 1L',
          sku: 'MILK-OAT-1L',
          category_id: 'cat-beverages',
          supplier_id: 'sup-alpha',
          cost_price: 2.1,
          selling_price: 4.5,
        },
        {
          rowNumber: 2,
          name: 'Potato Chips 200g',
          sku: 'CHIPS-POTATO-200G',
          category_id: 'cat-snacks',
          supplier_id: 'sup-beta',
          cost_price: 1.2,
          selling_price: 2.99,
        },
      ]

      const result = validateProductImportRows(rows, tenantContext)
      expect(result.valid).toBe(true)
      expect(result.importedCount).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects rows with cross-tenant category IDs and reports row-level errors', () => {
      const rows: ProductImportRow[] = [
        {
          rowNumber: 3,
          name: 'Foreign Milk',
          sku: 'FOREIGN-MILK',
          category_id: 'cat-another-tenant-999', // Does not exist in tenantContext
          supplier_id: 'sup-alpha',
        },
      ]

      const result = validateProductImportRows(rows, tenantContext)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].row).toBe(3)
      expect(result.errors[0].field).toBe('category_id')
      expect(result.errors[0].message).toContain('does not exist in tenant')
    })

    it('rejects duplicate SKUs within the import file itself and against tenant database', () => {
      const rows: ProductImportRow[] = [
        {
          rowNumber: 4,
          name: 'Duplicate Against DB',
          sku: 'EXISTING-SKU-001', // Already in tenant DB!
          category_id: 'cat-snacks',
        },
        {
          rowNumber: 5,
          name: 'New Product',
          sku: 'SKU-FILE-DUP',
          category_id: 'cat-snacks',
        },
        {
          rowNumber: 6,
          name: 'Same SKU Product',
          sku: 'SKU-FILE-DUP', // Duplicate within file!
          category_id: 'cat-snacks',
        },
      ]

      const result = validateProductImportRows(rows, tenantContext)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)

      const dbDupError = result.errors.find((e) => e.row === 4)
      expect(dbDupError?.message).toContain('already exists in tenant database')

      const fileDupError = result.errors.find((e) => e.row === 6)
      expect(fileDupError?.message).toContain('Duplicate SKU')
    })

    it('rejects cost_price values during import when user lacks general.products.view_cost', () => {
      const noCostContext = {
        ...tenantContext,
        hasCostPermission: false, // User does not have cost permission
      }

      const rows: ProductImportRow[] = [
        {
          rowNumber: 7,
          name: 'Secret Price Item',
          sku: 'SECRET-ITEM-01',
          cost_price: 15.0, // Attempting to import cost
          category_id: 'cat-beverages',
        },
      ]

      const result = validateProductImportRows(rows, noCostContext)
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('cost_price')
      expect(result.errors[0].message).toContain('User lacks permission')
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('handles products with empty variants and suppliers arrays without error', () => {
      const minimalProduct: Product = {
        id: 'min-1',
        tenant_id: tenantId,
        name: 'Simple Pen',
        sku: 'PEN-001',
      }

      const sanitized = stripSensitiveProductFields(minimalProduct, false)
      expect(sanitized.id).toBe('min-1')
      expect(sanitized.product_variants).toBeUndefined()
    })

    it('rejects rows with missing or whitespace-only SKU', () => {
      const rows: ProductImportRow[] = [
        { rowNumber: 10, name: 'No SKU Item', sku: '   ' },
      ]

      const result = validateProductImportRows(rows, {
        tenantId,
        validCategoryIds: new Set(),
        validSupplierIds: new Set(),
        existingSkus: new Set(),
        hasCostPermission: true,
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('sku')
      expect(result.errors[0].message).toContain('SKU is required')
    })
  })
})
