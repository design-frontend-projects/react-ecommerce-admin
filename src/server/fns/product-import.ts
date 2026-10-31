/**
 * src/server/fns/product-import.ts
 *
 * Row-Level Validated CSV Product Import Server Function.
 * Enforces:
 * 1. Zero-trust wrapper with `products.import` permission check.
 * 2. RFC-4180 CSV parsing with BOM stripping and header normalization.
 * 3. Batch foreign-key resolution and tenant ownership verification.
 * 4. SKU & barcode uniqueness validation (within CSV batch and tenant DB).
 * 5. Price & numeric validation (selling_price >= 0, cost_price >= 0).
 * 6. Atomic rollback on error with structured reporting: { row, field, error }.
 * 7. Security audit logging via logSensitiveOperation('data.import').
 */

'use server'

import prisma from '@/lib/prisma'
import { withServerFnAuth, type AuthorizedContext } from '@/server/utils/with-server-fn-auth'
import { logSensitiveOperation } from '@/server/logging/security-audit'
import { isValidUuid } from '@/server/utils/tenant'

// ── Types & Contracts ────────────────────────────────────────────────────────

export interface ProductImportRowError {
  row: number // 1-based CSV line number (row 1 is header, row 2 is first data line)
  field: string
  error: string
  value?: unknown
}

export interface ProductImportResult {
  success: boolean
  importedCount: number
  totalRows: number
  errors: ProductImportRowError[]
}

export interface ProductImportInput {
  csvContent?: string
  rows?: Array<Record<string, unknown>>
  warehouseId?: string
}

// ── RFC-4180 CSV Parser ──────────────────────────────────────────────────────

export function parseCsvRecords(csvText: string): {
  headers: string[]
  rows: Array<{ rowNumber: number; data: Record<string, string> }>
} {
  let text = csvText
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const lines: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        i++ // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField)
      currentField = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \r\n
      }
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((f) => f.trim().length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
    } else {
      currentField += char
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some((f) => f.trim().length > 0)) {
      lines.push(currentRow)
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Header normalization: lowercase, replace spaces/dashes with underscores
  const rawHeaders = lines[0]
  const normalizedHeaders = rawHeaders.map((h) =>
    h.trim().toLowerCase().replace(/[\s-]+/g, '_')
  )

  const rows: Array<{ rowNumber: number; data: Record<string, string> }> = []
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r]
    const rowObj: Record<string, string> = {}
    for (let c = 0; c < normalizedHeaders.length; c++) {
      const header = normalizedHeaders[c]
      if (header) {
        rowObj[header] = (line[c] ?? '').trim()
      }
    }
    rows.push({
      rowNumber: r + 1, // Row 1 is header, so row index + 1 is 1-based line number in CSV
      data: rowObj,
    })
  }

  return { headers: normalizedHeaders, rows }
}

// ── Row Validation & Import Pipeline ─────────────────────────────────────────

export async function executeProductImport(
  input: ProductImportInput,
  ctx: AuthorizedContext
): Promise<ProductImportResult> {
  const { tenantId, user, tenantUserId } = ctx

  // 1. Extract raw records
  let rawRecords: Array<{ rowNumber: number; data: Record<string, unknown> }> = []

  if (input.csvContent) {
    const parsed = parseCsvRecords(input.csvContent)
    if (parsed.rows.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalRows: 0,
        errors: [{ row: 1, field: 'csvContent', error: 'CSV content is empty or contains no data rows.' }],
      }
    }
    rawRecords = parsed.rows
  } else if (input.rows && input.rows.length > 0) {
    rawRecords = input.rows.map((r, idx) => ({
      rowNumber: idx + 1,
      data: r,
    }))
  } else {
    return {
      success: false,
      importedCount: 0,
      totalRows: 0,
      errors: [{ row: 1, field: 'input', error: 'No CSV content or rows provided for import.' }],
    }
  }

  const errors: ProductImportRowError[] = []
  const validRows: Array<{
    rowNumber: number
    name: string
    nameAr?: string | null
    sku: string
    barcode?: string | null
    description?: string | null
    shortDescription?: string | null
    categoryId?: string | null
    brandId?: string | null
    supplierId?: string | null
    warehouseId?: string | null
    baseUomId?: string | null
    productType: string
    sellingPrice?: number
    costPrice?: number
    initialStock?: number
    weight?: number | null
    dimensions?: string | null
  }> = []

  // Track seen in batch for CSV-batch uniqueness
  const seenSkus = new Map<string, number>()
  const seenBarcodes = new Map<string, number>()

  // Collect unique FKs for pre-fetching
  const candidateCategoryIds = new Set<string>()
  const candidateSupplierIds = new Set<string>()
  const candidateWarehouseIds = new Set<string>()
  const candidateBrandIds = new Set<string>()
  const candidateUomIds = new Set<string>()
  const candidateSkus = new Set<string>()
  const candidateBarcodes = new Set<string>()

  // 2. Syntactic & Type Validation Pass
  for (const record of rawRecords) {
    const { rowNumber, data } = record

    // Required fields: name, sku
    const name = String(data.name || data.product_name || '').trim()
    if (!name) {
      errors.push({ row: rowNumber, field: 'name', error: 'Product name is required.' })
    }

    const sku = String(data.sku || data.product_code || '').trim()
    if (!sku) {
      errors.push({ row: rowNumber, field: 'sku', error: 'Product SKU is required.' })
    } else {
      // Check duplicate SKU in CSV batch
      if (seenSkus.has(sku)) {
        errors.push({
          row: rowNumber,
          field: 'sku',
          error: `Duplicate SKU '${sku}' found in row ${seenSkus.get(sku)}.`,
          value: sku,
        })
      } else {
        seenSkus.set(sku, rowNumber)
        candidateSkus.add(sku)
      }
    }

    const barcode = data.barcode ? String(data.barcode).trim() : null
    if (barcode) {
      if (seenBarcodes.has(barcode)) {
        errors.push({
          row: rowNumber,
          field: 'barcode',
          error: `Duplicate barcode '${barcode}' found in row ${seenBarcodes.get(barcode)}.`,
          value: barcode,
        })
      } else {
        seenBarcodes.set(barcode, rowNumber)
        candidateBarcodes.add(barcode)
      }
    }

    // Price numeric validation
    let sellingPrice: number | undefined
    const rawPrice = data.selling_price ?? data.price
    if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '') {
      const num = Number(rawPrice)
      if (Number.isNaN(num) || num < 0) {
        errors.push({
          row: rowNumber,
          field: 'selling_price',
          error: 'Selling price must be a valid non-negative number.',
          value: rawPrice,
        })
      } else {
        sellingPrice = num
      }
    }

    let costPrice: number | undefined
    const rawCost = data.cost_price ?? data.unit_cost ?? data.cost
    if (rawCost !== undefined && rawCost !== null && String(rawCost).trim() !== '') {
      const num = Number(rawCost)
      if (Number.isNaN(num) || num < 0) {
        errors.push({
          row: rowNumber,
          field: 'cost_price',
          error: 'Cost price must be a valid non-negative number.',
          value: rawCost,
        })
      } else {
        costPrice = num
      }
    }

    let initialStock: number | undefined
    const rawStock = data.initial_stock ?? data.stock ?? data.quantity
    if (rawStock !== undefined && rawStock !== null && String(rawStock).trim() !== '') {
      const num = Number(rawStock)
      if (Number.isNaN(num) || num < 0) {
        errors.push({
          row: rowNumber,
          field: 'initial_stock',
          error: 'Initial stock must be a non-negative number.',
          value: rawStock,
        })
      } else {
        initialStock = num
      }
    }

    let weight: number | null = null
    if (data.weight !== undefined && data.weight !== null && String(data.weight).trim() !== '') {
      const num = Number(data.weight)
      if (Number.isNaN(num) || num < 0) {
        errors.push({
          row: rowNumber,
          field: 'weight',
          error: 'Weight must be a non-negative number.',
          value: data.weight,
        })
      } else {
        weight = num
      }
    }

    // Foreign Key format validation
    const categoryId = data.category_id ? String(data.category_id).trim() : null
    if (categoryId) {
      if (!isValidUuid(categoryId)) {
        errors.push({ row: rowNumber, field: 'category_id', error: 'Invalid UUID format for category_id.', value: categoryId })
      } else {
        candidateCategoryIds.add(categoryId)
      }
    }

    const supplierId = data.supplier_id ? String(data.supplier_id).trim() : null
    if (supplierId) {
      if (!isValidUuid(supplierId)) {
        errors.push({ row: rowNumber, field: 'supplier_id', error: 'Invalid UUID format for supplier_id.', value: supplierId })
      } else {
        candidateSupplierIds.add(supplierId)
      }
    }

    const warehouseId = (data.warehouse_id ? String(data.warehouse_id).trim() : null) || input.warehouseId || null
    if (warehouseId) {
      if (!isValidUuid(warehouseId)) {
        errors.push({ row: rowNumber, field: 'warehouse_id', error: 'Invalid UUID format for warehouse_id.', value: warehouseId })
      } else {
        candidateWarehouseIds.add(warehouseId)
      }
    }

    const brandId = data.brand_id ? String(data.brand_id).trim() : null
    if (brandId) {
      if (!isValidUuid(brandId)) {
        errors.push({ row: rowNumber, field: 'brand_id', error: 'Invalid UUID format for brand_id.', value: brandId })
      } else {
        candidateBrandIds.add(brandId)
      }
    }

    const baseUomId = data.base_uom_id ?? data.uom_id ? String(data.base_uom_id ?? data.uom_id).trim() : null
    if (baseUomId) {
      if (!isValidUuid(baseUomId)) {
        errors.push({ row: rowNumber, field: 'base_uom_id', error: 'Invalid UUID format for base_uom_id.', value: baseUomId })
      } else {
        candidateUomIds.add(baseUomId)
      }
    }

    if (name && sku) {
      validRows.push({
        rowNumber,
        name,
        nameAr: data.name_ar ? String(data.name_ar).trim() : null,
        sku,
        barcode,
        description: data.description ? String(data.description).trim() : null,
        shortDescription: data.short_description ? String(data.short_description).trim() : null,
        categoryId,
        brandId,
        supplierId,
        warehouseId,
        baseUomId,
        productType: String(data.product_type || 'simple').toLowerCase(),
        sellingPrice,
        costPrice,
        initialStock,
        weight,
        dimensions: data.dimensions ? String(data.dimensions).trim() : null,
      })
    }
  }

  // 3. Batch Database Pre-fetching for O(N) Tenant Ownership & Uniqueness Checks
  const [
    dbCategories,
    dbSuppliers,
    dbWarehouses,
    dbBrands,
    dbUoms,
    existingDbProducts,
    existingDbVariants,
    existingDbBarcodes,
    existingDbProductBarcodes,
  ] = await Promise.all([
    candidateCategoryIds.size > 0
      ? prisma.categories.findMany({
          where: {
            id: { in: Array.from(candidateCategoryIds) },
            OR: [{ tenant_id: tenantId }, { tenant_id: null }],
            deleted_at: null,
          },
          select: { id: true },
        })
      : [],
    candidateSupplierIds.size > 0
      ? prisma.suppliers.findMany({
          where: {
            id: { in: Array.from(candidateSupplierIds) },
            OR: [{ tenant_id: tenantId }, { tenant_id: null }, { is_system: true }],
            is_active: true,
          },
          select: { id: true },
        })
      : [],
    candidateWarehouseIds.size > 0
      ? prisma.warehouses.findMany({
          where: {
            id: { in: Array.from(candidateWarehouseIds) },
            tenant_id: tenantId,
            is_active: true,
          },
          select: { id: true },
        })
      : [],
    candidateBrandIds.size > 0
      ? prisma.brands.findMany({
          where: {
            id: { in: Array.from(candidateBrandIds) },
            is_active: true,
          },
          select: { id: true },
        })
      : [],
    candidateUomIds.size > 0
      ? prisma.uoms.findMany({
          where: {
            id: { in: Array.from(candidateUomIds) },
            OR: [{ tenant_id: tenantId }, { tenant_id: null }, { is_system: true }],
            is_active: true,
          },
          select: { id: true },
        })
      : [],
    candidateSkus.size > 0
      ? prisma.products.findMany({
          where: {
            tenant_id: tenantId,
            sku: { in: Array.from(candidateSkus) },
            deleted_at: null,
            is_deleted: { not: true },
          },
          select: { sku: true },
        })
      : [],
    candidateSkus.size > 0
      ? prisma.product_variants.findMany({
          where: {
            tenant_id: tenantId,
            sku: { in: Array.from(candidateSkus) },
          },
          select: { sku: true },
        })
      : [],
    candidateBarcodes.size > 0
      ? prisma.product_barcodes.findMany({
          where: {
            tenant_id: tenantId,
            barcode: { in: Array.from(candidateBarcodes) },
          },
          select: { barcode: true },
        })
      : [],
    candidateBarcodes.size > 0
      ? prisma.products.findMany({
          where: {
            tenant_id: tenantId,
            barcode: { in: Array.from(candidateBarcodes) },
            deleted_at: null,
            is_deleted: { not: true },
          },
          select: { barcode: true },
        })
      : [],
  ])

  const validCatIds = new Set(dbCategories.map((c) => c.id))
  const validSupIds = new Set(dbSuppliers.map((s) => s.id))
  const validWhIds = new Set(dbWarehouses.map((w) => w.id))
  const validBrandIds = new Set(dbBrands.map((b) => b.id))
  const validUomIds = new Set(dbUoms.map((u) => u.id))

  const existingSkusInTenant = new Set([
    ...existingDbProducts.map((p) => p.sku),
    ...existingDbVariants.map((v) => v.sku).filter(Boolean),
  ])
  const existingBarcodesInTenant = new Set([
    ...existingDbBarcodes.map((b) => b.barcode).filter(Boolean),
    ...existingDbProductBarcodes.map((p) => p.barcode).filter(Boolean),
  ])

  // 4. Row-by-Row Tenant Ownership & Uniqueness Evaluation
  for (const row of validRows) {
    // Tenant SKU uniqueness
    if (existingSkusInTenant.has(row.sku)) {
      errors.push({
        row: row.rowNumber,
        field: 'sku',
        error: `Product with SKU '${row.sku}' already exists in your organization.`,
        value: row.sku,
      })
    }

    // Tenant Barcode uniqueness
    if (row.barcode && existingBarcodesInTenant.has(row.barcode)) {
      errors.push({
        row: row.rowNumber,
        field: 'barcode',
        error: `Barcode '${row.barcode}' already exists in your organization.`,
        value: row.barcode,
      })
    }

    // Tenant FK ownership checks
    if (row.categoryId && !validCatIds.has(row.categoryId)) {
      errors.push({
        row: row.rowNumber,
        field: 'category_id',
        error: `Category '${row.categoryId}' not found or belongs to another organization.`,
        value: row.categoryId,
      })
    }

    if (row.supplierId && !validSupIds.has(row.supplierId)) {
      errors.push({
        row: row.rowNumber,
        field: 'supplier_id',
        error: `Supplier '${row.supplierId}' not found or belongs to another organization.`,
        value: row.supplierId,
      })
    }

    if (row.warehouseId && !validWhIds.has(row.warehouseId)) {
      errors.push({
        row: row.rowNumber,
        field: 'warehouse_id',
        error: `Warehouse '${row.warehouseId}' not found or belongs to another organization.`,
        value: row.warehouseId,
      })
    }

    if (row.brandId && !validBrandIds.has(row.brandId)) {
      errors.push({
        row: row.rowNumber,
        field: 'brand_id',
        error: `Brand '${row.brandId}' not found.`,
        value: row.brandId,
      })
    }

    if (row.baseUomId && !validUomIds.has(row.baseUomId)) {
      errors.push({
        row: row.rowNumber,
        field: 'base_uom_id',
        error: `UOM '${row.baseUomId}' not found or belongs to another organization.`,
        value: row.baseUomId,
      })
    }
  }

  // 5. Atomic Rollback: If any errors exist, do NOT write anything
  if (errors.length > 0) {
    errors.sort((a, b) => a.row - b.row || a.field.localeCompare(b.field))
    return {
      success: false,
      importedCount: 0,
      totalRows: rawRecords.length,
      errors,
    }
  }

  // 6. Transactional Write
  const defaultPriceList = await prisma.price_list.findFirst({
    where: { tenant_id: tenantId, is_default: true },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    for (const item of validRows) {
      // 1. Create main product record
      const product = await tx.products.create({
        data: {
          tenant_id: tenantId,
          name: item.name,
          name_ar: item.nameAr,
          sku: item.sku,
          barcode: item.barcode,
          description: item.description,
          short_description: item.shortDescription,
          category_id: item.categoryId,
          brand_id: item.brandId,
          supplier_id: item.supplierId,
          base_uom_id: item.baseUomId,
          product_type: (item.productType as 'simple' | 'variant' | 'bundle' | 'service' | 'composite') || 'simple',
          weight: item.weight !== null ? item.weight : undefined,
          dimensions: item.dimensions,
          is_active: true,
          is_deleted: false,
          created_by_user_id: tenantUserId || undefined,
          updated_by_user_id: tenantUserId || undefined,
        },
      })

      // 2. Create default product variant
      const variant = await tx.product_variants.create({
        data: {
          tenant_id: tenantId,
          product_id: product.id,
          sku: item.sku,
          barcode: item.barcode,
          name: item.name,
          uom_id: item.baseUomId,
          is_active: true,
          created_by_user_id: tenantUserId || undefined,
          updated_by_user_id: tenantUserId || undefined,
        },
      })

      // 3. Create barcode record if barcode provided
      if (item.barcode) {
        await tx.product_barcodes.create({
          data: {
            tenant_id: tenantId,
            product_variant_id: variant.id,
            barcode: item.barcode,
            barcode_type: 'code128',
            is_primary: true,
            created_by_user_id: tenantUserId || undefined,
            updated_by_user_id: tenantUserId || undefined,
          },
        })
      }

      // 4. Create supplier link if supplier provided
      if (item.supplierId) {
        await tx.product_suppliers.create({
          data: {
            tenant_id: tenantId,
            product_id: product.id,
            product_variant_id: variant.id,
            supplier_id: item.supplierId,
            unit_cost: item.costPrice || 0,
            is_preferred: true,
            is_active: true,
            created_by_user_id: tenantUserId || undefined,
            updated_by_user_id: tenantUserId || undefined,
          },
        })
      }

      // 5. Attach prices to default price list
      if (defaultPriceList && (item.sellingPrice !== undefined || item.costPrice !== undefined)) {
        await tx.price_list_items.create({
          data: {
            tenant_id: tenantId,
            price_list_id: defaultPriceList.id,
            product_id: product.id,
            product_variant_id: variant.id,
            price: item.sellingPrice || 0,
            cost_price: item.costPrice || 0,
            created_by_user_id: tenantUserId || undefined,
          },
        })
      }

      // 6. Initial inventory item registration if warehouse provided
      if (item.warehouseId) {
        await tx.inventory_items.create({
          data: {
            tenant_id: tenantId,
            product_variant_id: variant.id,
            sku: item.sku,
            barcode: item.barcode,
            is_stockable: true,
            is_sellable: true,
            is_purchasable: true,
            is_active: true,
            created_by_user_id: tenantUserId || undefined,
            updated_by_user_id: tenantUserId || undefined,
          },
        })
      }
    }
  })

  // 7. Security Audit Logging for Sensitive Bulk Operation
  await logSensitiveOperation({
    action: 'data.import',
    tenantId,
    actorAuthUserId: user.userId,
    resourceType: 'products',
    recordCount: validRows.length,
    metadata: {
      totalRows: rawRecords.length,
      importedCount: validRows.length,
      success: true,
    },
  }).catch(() => {
    // Fail-safe: do not fail import if background audit logging encounters an issue
  })

  return {
    success: true,
    importedCount: validRows.length,
    totalRows: rawRecords.length,
    errors: [],
  }
}

/**
 * Universal server function protected with `products.import` permission.
 */
export const importProductsCsv = withServerFnAuth<ProductImportInput, ProductImportResult>(
  {
    permissions: 'products.import',
    actionName: 'products.import',
    resourceType: 'products',
  },
  async (input, ctx) => executeProductImport(input, ctx)
)
