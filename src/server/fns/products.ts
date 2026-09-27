'use server'

import { ApiError } from '@/server/utils/api-error'
import {
  requireTenantId,
  resolveTenantUserId,
  isValidUuid,
} from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type {
  Prisma,
  product_type_enum,
  tracking_mode_enum,
  attribute_data_type_enum,
} from '@/generated/prisma/client'
import { BusinessEventNotifications } from '@/server/services/business-event-notifications'

// ── Types & Interfaces ───────────────────────────────────────────────────────

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string | string[]
  brandId?: string | string[]
  baseUomId?: string | string[]
  supplierId?: string | string[]
  productType?: string | string[]
  quickFilter?: string | null
  isActive?: boolean | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SupplierLinkInput {
  id?: string
  supplierId: string
  productVariantId?: string | null
  supplierProductCode?: string | null
  supplierBarcode?: string | null
  purchaseUomId?: string | null
  minimumOrderQty?: number
  leadTimeDays?: number
  unitCost?: number
  isPreferred?: boolean
  isActive?: boolean
}

export interface VariantAttributeInput {
  attributeDefinitionId: string
  attributeValueId: string
}

export interface VariantInput {
  id?: string
  sku: string
  barcode?: string | null
  name?: string | null
  taxRateId?: string | null
  weight?: number | null
  dimensions?: unknown
  isActive?: boolean
  expirationDate?: string | Date | null
  uomId?: string | null
  attributesLabel?: string | null
  price?: number
  costPrice?: number
  attributes?: VariantAttributeInput[]
}

export interface ProductMediaInput {
  id?: string
  variantId?: string | null
  storagePath: string
  fileName: string
  mimeType?: string
  fileSize?: number | bigint
  altText?: string | null
  sortOrder?: number
  isPrimary?: boolean
  isActive?: boolean
}

export interface CreateProductMasterInput {
  name: string
  nameAr?: string | null
  productCode?: string | null
  sku: string
  barcode?: string | null
  description?: string | null
  shortDescription?: string | null
  categoryId?: string | null
  brandId?: string | null
  baseUomId?: string | null
  supplierId?: string | null // Primary / legacy supplier
  productType?: product_type_enum | 'simple' | 'variant' | 'bundle' | 'service' | 'composite'
  productTypeId?: string | null
  trackingMode?: tracking_mode_enum | 'none' | 'batch' | 'serial' | 'batch_and_serial'
  weight?: number | null
  dimensions?: string | null
  isActive?: boolean
  isStockItem?: boolean
  reorderable?: boolean
  isBatchTracked?: boolean
  isSerialTracked?: boolean
  hasVariants?: boolean
  hasExpiration?: boolean
  isMarketplace?: boolean
  suppliers?: SupplierLinkInput[]
  variants?: VariantInput[]
  media?: ProductMediaInput[]
}

export type UpdateProductMasterInput = Partial<CreateProductMasterInput>

export interface AttributeDefinitionInput {
  code: string
  name: string
  nameAr?: string | null
  dataType?: attribute_data_type_enum | 'text' | 'number' | 'boolean' | 'color' | 'select'
  sortOrder?: number
  isActive?: boolean
  values?: Array<{
    value: string
    valueAr?: string | null
    colorHex?: string | null
    sortOrder?: number
  }>
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function sanitizeString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : ''
}

async function generateNextProductCode(tenantId: string): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT 'PRD-' || LPAD(
      (COALESCE(MAX(
        CASE
          WHEN product_code ~ '^PRD-[0-9]+$'
          THEN CAST(SUBSTRING(product_code FROM 5) AS INT)
          ELSE 0
        END
      ), 0) + 1)::TEXT,
      6, '0'
    ) AS code
    FROM products
    WHERE tenant_id = ${tenantId}::UUID
  `
  return result[0]?.code || `PRD-${Date.now().toString().slice(-6)}`
}

// ── Product Master Queries ───────────────────────────────────────────────────

export async function listProducts(
  authUserId: string,
  params: ProductQueryParams = {}
) {
  const tenantId = await requireTenantId(authUserId)

  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.min(Math.max(1, Number(params.pageSize || 20)), 100)
  const skip = (page - 1) * pageSize

  // Build where filter
  const where: Prisma.productsWhereInput = {
    tenant_id: tenantId,
    deleted_at: null,
    is_deleted: { not: true },
  }

  // Active filter
  if (params.isActive !== undefined && params.isActive !== null) {
    where.is_active = Boolean(params.isActive)
  }

  // Text search
  if (params.search && params.search.trim()) {
    const term = params.search.trim()
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { name_ar: { contains: term, mode: 'insensitive' } },
      { sku: { contains: term, mode: 'insensitive' } },
      { barcode: { contains: term, mode: 'insensitive' } },
      { product_code: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { short_description: { contains: term, mode: 'insensitive' } },
    ]
  }

  // Category filter
  if (params.categoryId) {
    const catList = Array.isArray(params.categoryId)
      ? params.categoryId.filter(Boolean)
      : [params.categoryId].filter(Boolean)
    if (catList.length > 0) {
      where.category_id = { in: catList }
    }
  }

  // Brand filter
  if (params.brandId) {
    const brandList = Array.isArray(params.brandId)
      ? params.brandId.filter(Boolean)
      : [params.brandId].filter(Boolean)
    if (brandList.length > 0) {
      where.brand_id = { in: brandList }
    }
  }

  // Base UOM filter
  if (params.baseUomId) {
    const uomList = Array.isArray(params.baseUomId)
      ? params.baseUomId.filter(Boolean)
      : [params.baseUomId].filter(Boolean)
    if (uomList.length > 0) {
      where.base_uom_id = { in: uomList }
    }
  }

  // Supplier filter (checks both primary supplier_id and product_suppliers junction)
  if (params.supplierId) {
    const supList = Array.isArray(params.supplierId)
      ? params.supplierId.filter(Boolean)
      : [params.supplierId].filter(Boolean)
    if (supList.length > 0) {
      where.OR = [
        ...(where.OR || []),
        { supplier_id: { in: supList } },
        { product_suppliers: { some: { supplier_id: { in: supList } } } },
      ]
    }
  }

  // Product Type filter
  if (params.productType) {
    const typeList = Array.isArray(params.productType)
      ? params.productType.filter(Boolean)
      : [params.productType].filter(Boolean)
    if (typeList.length > 0) {
      where.product_type = { in: typeList as product_type_enum[] }
    }
  }

  // Quick filters
  if (params.quickFilter === 'has_variants') {
    where.has_variants = true
  } else if (params.quickFilter === 'batch_tracked') {
    where.is_batch_tracked = true
  } else if (params.quickFilter === 'serial_tracked') {
    where.is_serial_tracked = true
  }

  // Sorting
  const sortBy = params.sortBy || 'created_at'
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'
  const orderBy: Prisma.productsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  }

  const [products, totalCount] = await Promise.all([
    prisma.products.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        categories: { select: { id: true, name: true, name_ar: true } },
        brands: { select: { id: true, name: true, name_ar: true, code: true } },
        base_uom: { select: { id: true, name: true, code: true } },
        product_types: {
          select: { id: true, name: true, name_ar: true, code: true, icon: true, color: true },
        },
        suppliers: { select: { id: true, name: true, code: true } },
        product_suppliers: {
          where: { is_active: true },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
                contact_person: true,
                email: true,
                phone: true,
              },
            },
            purchase_uom: { select: { id: true, name: true, code: true } },
          },
        },
        product_media: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
        },
        product_variants: {
          where: { is_active: { not: false } },
          include: {
            tax_rates: {
              select: { id: true, tax_type: true, rate: true, is_inclusive: true },
            },
            price_list_items: true,
            stock_balances: true,
            product_variant_attributes: {
              include: {
                attribute_definition: true,
                attribute_value: true,
              },
            },
          },
        },
      },
    }),
    prisma.products.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    products,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

export async function getProduct(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  if (!isValidUuid(id)) {
    throw new ApiError('Valid product ID is required.', 400)
  }

  const product = await prisma.products.findFirst({
    where: {
      id,
      tenant_id: tenantId,
      deleted_at: null,
      is_deleted: { not: true },
    },
    include: {
      categories: true,
      brands: true,
      base_uom: true,
      product_types: true,
      suppliers: true,
      product_suppliers: {
        include: {
          supplier: true,
          purchase_uom: true,
          product_variant: { select: { id: true, sku: true, name: true } },
        },
        orderBy: [{ is_preferred: 'desc' }, { created_at: 'asc' }],
      },
      product_media: {
        orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
      },
      product_variants: {
        include: {
          tax_rates: true,
          price_list_items: true,
          stock_balances: true,
          product_barcodes: true,
          product_variant_attributes: {
            include: {
              attribute_definition: true,
              attribute_value: true,
            },
          },
        },
      },
    },
  })

  if (!product) {
    throw new ApiError('Product not found.', 404)
  }

  return product
}

export async function getProductStats(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const [total, active, inactive, withVariants, batchTracked, serialTracked] =
    await Promise.all([
      prisma.products.count({
        where: { tenant_id: tenantId, deleted_at: null, is_deleted: { not: true } },
      }),
      prisma.products.count({
        where: {
          tenant_id: tenantId,
          is_active: true,
          deleted_at: null,
          is_deleted: { not: true },
        },
      }),
      prisma.products.count({
        where: {
          tenant_id: tenantId,
          is_active: false,
          deleted_at: null,
          is_deleted: { not: true },
        },
      }),
      prisma.products.count({
        where: {
          tenant_id: tenantId,
          has_variants: true,
          deleted_at: null,
          is_deleted: { not: true },
        },
      }),
      prisma.products.count({
        where: {
          tenant_id: tenantId,
          is_batch_tracked: true,
          deleted_at: null,
          is_deleted: { not: true },
        },
      }),
      prisma.products.count({
        where: {
          tenant_id: tenantId,
          is_serial_tracked: true,
          deleted_at: null,
          is_deleted: { not: true },
        },
      }),
    ])

  return {
    total,
    active,
    inactive,
    withVariants,
    batchTracked,
    serialTracked,
  }
}

// ── Product Master Mutations ─────────────────────────────────────────────────

export async function createProductMaster(
  authUserId: string,
  input: CreateProductMasterInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const name = sanitizeString(input.name)
  if (!name) {
    throw new ApiError('Product name is required.', 400)
  }
  const sku = sanitizeString(input.sku)
  if (!sku) {
    throw new ApiError('Product SKU is required.', 400)
  }

  // Check unique SKU within tenant
  const existingSku = await prisma.products.findFirst({
    where: {
      tenant_id: tenantId,
      sku,
      deleted_at: null,
      is_deleted: { not: true },
    },
    select: { id: true },
  })
  if (existingSku) {
    throw new ApiError(`Product with SKU '${sku}' already exists.`, 409)
  }

  // Generate or sanitize product_code
  let productCode = sanitizeString(input.productCode)
  if (!productCode) {
    productCode = await generateNextProductCode(tenantId)
  } else {
    const existingCode = await prisma.products.findFirst({
      where: {
        tenant_id: tenantId,
        product_code: productCode,
        deleted_at: null,
        is_deleted: { not: true },
      },
      select: { id: true },
    })
    if (existingCode) {
      throw new ApiError(`Product code '${productCode}' is already in use.`, 409)
    }
  }

  // Execute in transaction
  const createdProduct = await prisma.$transaction(async (tx) => {
    // 1. Create main product record
    const product = await tx.products.create({
      data: {
        tenant_id: tenantId,
        name,
        name_ar: input.nameAr ? sanitizeString(input.nameAr) : null,
        product_code: productCode,
        sku,
        barcode: input.barcode ? sanitizeString(input.barcode) : null,
        description: input.description ?? null,
        short_description: input.shortDescription ?? null,
        category_id: input.categoryId && isValidUuid(input.categoryId) ? input.categoryId : null,
        brand_id: input.brandId && isValidUuid(input.brandId) ? input.brandId : null,
        base_uom_id: input.baseUomId && isValidUuid(input.baseUomId) ? input.baseUomId : null,
        supplier_id: input.supplierId && isValidUuid(input.supplierId) ? input.supplierId : null,
        product_type: (input.productType as product_type_enum) || 'simple',
        product_type_id:
          input.productTypeId && isValidUuid(input.productTypeId) ? input.productTypeId : null,
        tracking_mode: (input.trackingMode as tracking_mode_enum) || 'none',
        weight: input.weight !== undefined && input.weight !== null ? Number(input.weight) : null,
        dimensions: input.dimensions ? String(input.dimensions) : null,
        is_active: input.isActive ?? true,
        is_stock_item: input.isStockItem ?? true,
        reorderable: input.reorderable ?? true,
        is_batch_tracked: input.isBatchTracked ?? false,
        is_serial_tracked: input.isSerialTracked ?? false,
        has_variants: input.hasVariants ?? (input.variants && input.variants.length > 1),
        has_expiration: input.hasExpiration ?? false,
        is_marketplace: input.isMarketplace ?? false,
        is_deleted: false,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    const productId = product.id

    // 2. Link Suppliers (multi-supplier junction)
    const supplierLinks = input.suppliers || []
    // If a primary supplier_id was given and not present in supplierLinks, add it as preferred
    if (
      input.supplierId &&
      isValidUuid(input.supplierId) &&
      !supplierLinks.some((s) => s.supplierId === input.supplierId)
    ) {
      supplierLinks.unshift({
        supplierId: input.supplierId,
        isPreferred: true,
        isActive: true,
      })
    }

    if (supplierLinks.length > 0) {
      for (const sup of supplierLinks) {
        if (!sup.supplierId || !isValidUuid(sup.supplierId)) continue
        await tx.product_suppliers.create({
          data: {
            tenant_id: tenantId,
            product_id: productId,
            product_variant_id:
              sup.productVariantId && isValidUuid(sup.productVariantId)
                ? sup.productVariantId
                : null,
            supplier_id: sup.supplierId,
            supplier_product_code: sup.supplierProductCode ?? null,
            supplier_barcode: sup.supplierBarcode ?? null,
            purchase_uom_id:
              sup.purchaseUomId && isValidUuid(sup.purchaseUomId) ? sup.purchaseUomId : null,
            minimum_order_qty: sup.minimumOrderQty ?? 0,
            lead_time_days: sup.leadTimeDays ?? 0,
            unit_cost: sup.unitCost ?? 0,
            is_preferred: Boolean(sup.isPreferred),
            is_active: sup.isActive ?? true,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }
    }

    // 3. Create Variants & Attributes
    const variants = input.variants && input.variants.length > 0
      ? input.variants
      : [
          {
            sku,
            barcode: input.barcode,
            name: name,
            uomId: input.baseUomId,
            isActive: true,
          },
        ]

    // Lookup tenant's default price list
    const defaultPriceList = await tx.price_list.findFirst({
      where: { tenant_id: tenantId, is_default: true },
      select: { id: true },
    })

    for (const v of variants) {
      const variantSku = sanitizeString(v.sku) || `${sku}-1`
      const variant = await tx.product_variants.create({
        data: {
          tenant_id: tenantId,
          product_id: productId,
          sku: variantSku,
          barcode: v.barcode ? sanitizeString(v.barcode) : null,
          name: v.name ? sanitizeString(v.name) : null,
          tax_rate_id: v.taxRateId && isValidUuid(v.taxRateId) ? v.taxRateId : null,
          weight: v.weight !== undefined && v.weight !== null ? Number(v.weight) : null,
          dimensions: v.dimensions ? (v.dimensions as Prisma.InputJsonValue) : undefined,
          uom_id: v.uomId && isValidUuid(v.uomId) ? v.uomId : null,
          is_active: v.isActive ?? true,
          expiration_date: v.expirationDate ? new Date(v.expirationDate) : null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Link attribute values
      if (v.attributes && v.attributes.length > 0) {
        for (const attr of v.attributes) {
          if (
            isValidUuid(attr.attributeDefinitionId) &&
            isValidUuid(attr.attributeValueId)
          ) {
            await tx.product_variant_attributes.create({
              data: {
                tenant_id: tenantId,
                product_variant_id: variant.id,
                attribute_definition_id: attr.attributeDefinitionId,
                attribute_value_id: attr.attributeValueId,
              },
            })
          }
        }
      }

      // Add to default price list if price provided and default price list exists
      if (defaultPriceList && (v.price !== undefined || v.costPrice !== undefined)) {
        await tx.price_list_items.create({
          data: {
            tenant_id: tenantId,
            price_list_id: defaultPriceList.id,
            product_id: productId,
            product_variant_id: variant.id,
            price: Number(v.price || 0),
            cost_price: Number(v.costPrice || 0),
            min_price: 0,
            max_discount_percent: 0,
            created_by_user_id: tenantUserId,
          },
        })
      }
    }

    // 4. Attach Media
    if (input.media && input.media.length > 0) {
      for (const m of input.media) {
        await tx.product_media.create({
          data: {
            tenant_id: tenantId,
            product_id: productId,
            variant_id: m.variantId && isValidUuid(m.variantId) ? m.variantId : null,
            storage_path: m.storagePath,
            file_name: m.fileName,
            mime_type: m.mimeType || 'image/jpeg',
            file_size: m.fileSize ? BigInt(m.fileSize) : null,
            alt_text: m.altText ?? null,
            sort_order: m.sortOrder ?? 0,
            is_primary: Boolean(m.isPrimary),
            is_active: m.isActive ?? true,
            created_by_user_id: tenantUserId,
          },
        })
      }
    }

    return product
  })

  // 5. Asynchronously trigger Domain Notification
  try {
    let categoryName = null
    if (createdProduct.category_id) {
      const cat = await prisma.categories.findUnique({
        where: { id: createdProduct.category_id },
        select: { name: true },
      })
      categoryName = cat?.name ?? null
    }

    await BusinessEventNotifications.notifyProductCreated({
      tenantId,
      productId: createdProduct.id,
      productCode: createdProduct.product_code,
      name: createdProduct.name,
      sku: createdProduct.sku,
      categoryName,
      createdByUserId: tenantUserId,
      actionUrl: `/products`,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-console
    console.warn('[Products Master] Notification trigger failed:', errorMsg)
  }

  return getProduct(authUserId, createdProduct.id)
}

export async function updateProductMaster(
  authUserId: string,
  id: string,
  input: UpdateProductMasterInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Valid product ID is required.', 400)
  }

  const existing = await prisma.products.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null, is_deleted: { not: true } },
    select: { id: true, sku: true, product_code: true },
  })
  if (!existing) {
    throw new ApiError('Product not found.', 404)
  }

  // If sku is updated, check uniqueness
  if (input.sku && input.sku !== existing.sku) {
    const sku = sanitizeString(input.sku)
    const duplicate = await prisma.products.findFirst({
      where: {
        tenant_id: tenantId,
        sku,
        id: { not: id },
        deleted_at: null,
        is_deleted: { not: true },
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new ApiError(`Product with SKU '${sku}' already exists.`, 409)
    }
  }

  // If product_code is updated, check uniqueness
  if (input.productCode && input.productCode !== existing.product_code) {
    const code = sanitizeString(input.productCode)
    const duplicate = await prisma.products.findFirst({
      where: {
        tenant_id: tenantId,
        product_code: code,
        id: { not: id },
        deleted_at: null,
        is_deleted: { not: true },
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new ApiError(`Product code '${code}' is already in use.`, 409)
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update main product scalar fields
    const dataToUpdate: Prisma.productsUpdateInput = {
      updated_at: new Date(),
      updated_by_user_id: tenantUserId,
    }

    if (input.name !== undefined) dataToUpdate.name = sanitizeString(input.name)
    if (input.nameAr !== undefined)
      dataToUpdate.name_ar = input.nameAr ? sanitizeString(input.nameAr) : null
    if (input.productCode !== undefined)
      dataToUpdate.product_code = input.productCode ? sanitizeString(input.productCode) : null
    if (input.sku !== undefined) dataToUpdate.sku = sanitizeString(input.sku)
    if (input.barcode !== undefined)
      dataToUpdate.barcode = input.barcode ? sanitizeString(input.barcode) : null
    if (input.description !== undefined) dataToUpdate.description = input.description
    if (input.shortDescription !== undefined)
      dataToUpdate.short_description = input.shortDescription
    if (input.categoryId !== undefined) {
      dataToUpdate.categories =
        input.categoryId && isValidUuid(input.categoryId)
          ? { connect: { id: input.categoryId } }
          : { disconnect: true }
    }
    if (input.brandId !== undefined) {
      dataToUpdate.brands =
        input.brandId && isValidUuid(input.brandId)
          ? { connect: { id: input.brandId } }
          : { disconnect: true }
    }
    if (input.baseUomId !== undefined) {
      dataToUpdate.base_uom =
        input.baseUomId && isValidUuid(input.baseUomId)
          ? { connect: { id: input.baseUomId } }
          : { disconnect: true }
    }
    if (input.supplierId !== undefined) {
      dataToUpdate.suppliers =
        input.supplierId && isValidUuid(input.supplierId)
          ? { connect: { id: input.supplierId } }
          : { disconnect: true }
    }
    if (input.productType !== undefined)
      dataToUpdate.product_type = input.productType as product_type_enum
    if (input.productTypeId !== undefined) {
      dataToUpdate.product_types =
        input.productTypeId && isValidUuid(input.productTypeId)
          ? { connect: { id: input.productTypeId } }
          : { disconnect: true }
    }
    if (input.trackingMode !== undefined)
      dataToUpdate.tracking_mode = input.trackingMode as tracking_mode_enum
    if (input.weight !== undefined)
      dataToUpdate.weight = input.weight != null ? Number(input.weight) : null
    if (input.dimensions !== undefined)
      dataToUpdate.dimensions = input.dimensions ? String(input.dimensions) : null
    if (input.isActive !== undefined) dataToUpdate.is_active = input.isActive
    if (input.isStockItem !== undefined) dataToUpdate.is_stock_item = input.isStockItem
    if (input.reorderable !== undefined) dataToUpdate.reorderable = input.reorderable
    if (input.isBatchTracked !== undefined)
      dataToUpdate.is_batch_tracked = input.isBatchTracked
    if (input.isSerialTracked !== undefined)
      dataToUpdate.is_serial_tracked = input.isSerialTracked
    if (input.hasVariants !== undefined) dataToUpdate.has_variants = input.hasVariants
    if (input.hasExpiration !== undefined)
      dataToUpdate.has_expiration = input.hasExpiration
    if (input.isMarketplace !== undefined)
      dataToUpdate.is_marketplace = input.isMarketplace

    await tx.products.update({
      where: { id },
      data: dataToUpdate,
    })

    // 2. Synchronize Suppliers if provided
    if (input.suppliers !== undefined) {
      const incoming = input.suppliers.filter((s) => s.supplierId && isValidUuid(s.supplierId))
      const incomingIds = incoming.map((s) => s.id).filter(Boolean) as string[]

      // Delete removed junction rows
      await tx.product_suppliers.deleteMany({
        where: {
          product_id: id,
          tenant_id: tenantId,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      })

      // Upsert incoming
      for (const sup of incoming) {
        if (sup.id && isValidUuid(sup.id)) {
          await tx.product_suppliers.update({
            where: { id: sup.id },
            data: {
              supplier_id: sup.supplierId,
              product_variant_id:
                sup.productVariantId && isValidUuid(sup.productVariantId)
                  ? sup.productVariantId
                  : null,
              supplier_product_code: sup.supplierProductCode ?? null,
              supplier_barcode: sup.supplierBarcode ?? null,
              purchase_uom_id:
                sup.purchaseUomId && isValidUuid(sup.purchaseUomId)
                  ? sup.purchaseUomId
                  : null,
              minimum_order_qty: sup.minimumOrderQty ?? 0,
              lead_time_days: sup.leadTimeDays ?? 0,
              unit_cost: sup.unitCost ?? 0,
              is_preferred: Boolean(sup.isPreferred),
              is_active: sup.isActive ?? true,
              updated_by_user_id: tenantUserId,
              updated_at: new Date(),
            },
          })
        } else {
          await tx.product_suppliers.create({
            data: {
              tenant_id: tenantId,
              product_id: id,
              product_variant_id:
                sup.productVariantId && isValidUuid(sup.productVariantId)
                  ? sup.productVariantId
                  : null,
              supplier_id: sup.supplierId,
              supplier_product_code: sup.supplierProductCode ?? null,
              supplier_barcode: sup.supplierBarcode ?? null,
              purchase_uom_id:
                sup.purchaseUomId && isValidUuid(sup.purchaseUomId)
                  ? sup.purchaseUomId
                  : null,
              minimum_order_qty: sup.minimumOrderQty ?? 0,
              lead_time_days: sup.leadTimeDays ?? 0,
              unit_cost: sup.unitCost ?? 0,
              is_preferred: Boolean(sup.isPreferred),
              is_active: sup.isActive ?? true,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })
        }
      }
    }

    // 3. Synchronize Variants if provided
    if (input.variants !== undefined) {
      const incomingVariants = input.variants.filter((v) => v.sku)
      for (const v of incomingVariants) {
        if (v.id && isValidUuid(v.id)) {
          await tx.product_variants.update({
            where: { id: v.id },
            data: {
              sku: sanitizeString(v.sku),
              barcode: v.barcode ? sanitizeString(v.barcode) : null,
              name: v.name ? sanitizeString(v.name) : null,
              tax_rate_id:
                v.taxRateId && isValidUuid(v.taxRateId) ? v.taxRateId : null,
              weight:
                v.weight !== undefined && v.weight !== null
                  ? Number(v.weight)
                  : null,
              dimensions: v.dimensions
                ? (v.dimensions as Prisma.InputJsonValue)
                : undefined,
              uom_id: v.uomId && isValidUuid(v.uomId) ? v.uomId : null,
              is_active: v.isActive ?? true,
              expiration_date: v.expirationDate
                ? new Date(v.expirationDate)
                : null,
              updated_by_user_id: tenantUserId,
              updated_at: new Date(),
            },
          })
        } else {
          await tx.product_variants.create({
            data: {
              tenant_id: tenantId,
              product_id: id,
              sku: sanitizeString(v.sku),
              barcode: v.barcode ? sanitizeString(v.barcode) : null,
              name: v.name ? sanitizeString(v.name) : null,
              tax_rate_id:
                v.taxRateId && isValidUuid(v.taxRateId) ? v.taxRateId : null,
              weight:
                v.weight !== undefined && v.weight !== null
                  ? Number(v.weight)
                  : null,
              dimensions: v.dimensions
                ? (v.dimensions as Prisma.InputJsonValue)
                : undefined,
              uom_id: v.uomId && isValidUuid(v.uomId) ? v.uomId : null,
              is_active: v.isActive ?? true,
              expiration_date: v.expirationDate
                ? new Date(v.expirationDate)
                : null,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })
        }
      }
    }
  })

  // Trigger update notification
  try {
    const updated = await prisma.products.findUnique({
      where: { id },
      select: { name: true, sku: true, product_code: true },
    })
    if (updated) {
      await BusinessEventNotifications.notifyProductUpdated({
        tenantId,
        productId: id,
        productCode: updated.product_code,
        name: updated.name,
        sku: updated.sku,
        updatedByUserId: tenantUserId,
      })
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-console
    console.warn('[Products Master] Update notification failed:', errorMsg)
  }

  return getProduct(authUserId, id)
}

export async function deleteProductMaster(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Valid product ID is required.', 400)
  }

  const existing = await prisma.products.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Product not found.', 404)
  }

  // Soft delete product and its variants
  await prisma.$transaction(async (tx) => {
    const now = new Date()

    await tx.products.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: now,
        is_active: false,
        updated_at: now,
        updated_by_user_id: tenantUserId,
      },
    })

    await tx.product_variants.updateMany({
      where: { product_id: id, tenant_id: tenantId },
      data: {
        is_active: false,
        updated_at: now,
        updated_by_user_id: tenantUserId,
      },
    })
  })

  return { success: true, id }
}

// ── Attributes Master Server Functions ──────────────────────────────────────

export async function listAttributeDefinitions(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  return prisma.attribute_definitions.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    include: {
      attribute_values: {
        where: { is_active: true },
        orderBy: [{ sort_order: 'asc' }, { value: 'asc' }],
      },
    },
  })
}

export async function createAttributeDefinition(
  authUserId: string,
  input: AttributeDefinitionInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const code = sanitizeString(input.code)
  const name = sanitizeString(input.name)
  if (!code || !name) {
    throw new ApiError('Attribute code and name are required.', 400)
  }

  const existing = await prisma.attribute_definitions.findFirst({
    where: { tenant_id: tenantId, code },
    select: { id: true },
  })
  if (existing) {
    throw new ApiError(`Attribute with code '${code}' already exists.`, 409)
  }

  return prisma.attribute_definitions.create({
    data: {
      tenant_id: tenantId,
      code,
      name,
      name_ar: input.nameAr ? sanitizeString(input.nameAr) : null,
      data_type: (input.dataType as attribute_data_type_enum) || 'text',
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
      attribute_values: input.values && input.values.length > 0
        ? {
            create: input.values.map((v) => ({
              tenant_id: tenantId,
              value: sanitizeString(v.value),
              value_ar: v.valueAr ? sanitizeString(v.valueAr) : null,
              color_hex: v.colorHex ? sanitizeString(v.colorHex) : null,
              sort_order: v.sortOrder ?? 0,
              created_by_user_id: tenantUserId,
            })),
          }
        : undefined,
    },
    include: {
      attribute_values: true,
    },
  })
}

export async function addAttributeValue(
  authUserId: string,
  definitionId: string,
  input: { value: string; valueAr?: string | null; colorHex?: string | null; sortOrder?: number }
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(definitionId)) {
    throw new ApiError('Valid attribute definition ID is required.', 400)
  }

  const value = sanitizeString(input.value)
  if (!value) {
    throw new ApiError('Attribute value is required.', 400)
  }

  return prisma.attribute_values.create({
    data: {
      tenant_id: tenantId,
      attribute_definition_id: definitionId,
      value,
      value_ar: input.valueAr ? sanitizeString(input.valueAr) : null,
      color_hex: input.colorHex ? sanitizeString(input.colorHex) : null,
      sort_order: input.sortOrder ?? 0,
      is_active: true,
      created_by_user_id: tenantUserId,
    },
  })
}
