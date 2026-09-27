import prisma from '@/lib/prisma'
import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import { ApiError } from '@/server/utils/api-error'
import {
  calculatePOLine,
  calculatePOTotals,
  validatePOCalculation,
  type POLineCalculationInput,
  type POHeaderAdjustments,
} from '@/features/purchase-orders/utils/po-calculations'

export type DbClient = PrismaClient | Prisma.TransactionClient

export interface CreatePurchaseOrderDto {
  supplier_id: string
  warehouse_id?: string | null
  branch_id?: string | null
  store_id?: string | null
  order_date?: string | Date
  expected_delivery_date?: string | Date | null
  currency_id?: string | null
  currency?: string | null
  shipping_amount?: number | string | null
  notes?: string | null
  items: Array<{
    product_variant_id: string
    quantity_ordered: number | string
    unit_cost: number | string
    discount_amount?: number | string | null
    tax_amount?: number | string | null
    uom_id?: string | null
  }>
}

export interface UpdatePurchaseOrderDto extends CreatePurchaseOrderDto {
  id: string
}

/**
 * Authoritative Server-Side Purchase Order Service
 * Enforces tenant isolation, strict validation, decimal precision, and zero-inventory-side-effect commitment.
 */
export class PurchaseOrderService {
  /**
   * Validate that all referenced entities belong to the caller's tenant.
   * Prevents cross-tenant injection of variants, suppliers, warehouses, or UOMs.
   */
  public static async validateTenantEntities(
    tenantId: string,
    dto: CreatePurchaseOrderDto,
    db: DbClient = prisma
  ) {
    // 1. Validate Supplier
    const supplier = await db.suppliers.findFirst({
      where: { id: dto.supplier_id, tenant_id: tenantId },
      select: { id: true, is_active: true },
    })
    if (!supplier) {
      throw new ApiError('Supplier does not exist or does not belong to this tenant organization.', 400)
    }

    // 2. Validate Warehouse (if specified)
    if (dto.warehouse_id) {
      const warehouse = await db.warehouses.findFirst({
        where: { id: dto.warehouse_id, tenant_id: tenantId },
        select: { id: true, is_active: true },
      })
      if (!warehouse) {
        throw new ApiError('Warehouse does not exist or does not belong to this tenant organization.', 400)
      }
    }

    // 3. Validate Variants
    const variantIds = Array.from(new Set(dto.items.map((it) => it.product_variant_id)))
    const variants = await db.product_variants.findMany({
      where: {
        id: { in: variantIds },
        tenant_id: tenantId,
      },
      select: { id: true, is_active: true, product_id: true },
    })

    const foundVariantIds = new Set(variants.map((v) => v.id))
    const allFound = variantIds.every((id) => foundVariantIds.has(id))
    if (!allFound || variants.length !== variantIds.length) {
      throw new ApiError('One or more selected product variants were not found, inactive, or belong to another tenant.', 400)
    }

    const inactiveVariant = variants.find((v) => v.is_active === false)
    if (inactiveVariant) {
      throw new ApiError('Cannot create purchase order with inactive product variants.', 400)
    }

    // 4. Validate UOMs (if specified)
    const uomIds = Array.from(
      new Set(dto.items.map((it) => it.uom_id).filter((u): u is string => Boolean(u)))
    )
    if (uomIds.length > 0 && db.uoms) {
      const uoms = await db.uoms.findMany({
        where: {
          id: { in: uomIds },
          OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        },
        select: { id: true },
      })
      if (uoms.length !== uomIds.length) {
        throw new ApiError('One or more selected UOMs are invalid for this organization.', 400)
      }
    }

    // 5. Validate Currency (if specified)
    if (dto.currency_id && db.currencies) {
      const currency = await db.currencies.findFirst({
        where: { id: dto.currency_id },
        select: { id: true, code: true },
      })
      if (!currency) {
        throw new ApiError('Specified currency not found.', 400)
      }
    }
  }

  /**
   * Recalculates lines and totals with Decimal precision.
   * Throws ApiError if validation fails.
   */
  private static calculateAndValidate(dto: CreatePurchaseOrderDto) {
    const calcInputs: POLineCalculationInput[] = dto.items.map((item, index) => ({
      product_variant_id: item.product_variant_id,
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost,
      discount_amount: item.discount_amount,
      tax_amount: item.tax_amount,
      line_no: index + 1,
      uom_id: item.uom_id,
    }))

    const adjustments: POHeaderAdjustments = {
      shipping_amount: dto.shipping_amount,
    }

    // Validation
    const errors = validatePOCalculation(calcInputs, adjustments)
    if (errors.length > 0) {
      throw new ApiError(errors.map((e) => e.message).join(' | '), 400)
    }

    // Line calculations
    const calculatedLines = calcInputs.map((input) => calculatePOLine(input))
    // Totals calculations
    const calculatedTotals = calculatePOTotals(calculatedLines, adjustments)

    return { calculatedLines, calculatedTotals }
  }

  /**
   * Create Purchase Order with authoritative recalculation & strict isolation.
   * Note: Purchase Order creation NEVER increments inventory/stock.
   */
  public static async createPurchaseOrder(
    _authUserId: string,
    tenantId: string,
    tenantUserId: string | null,
    dto: CreatePurchaseOrderDto
  ) {
    await this.validateTenantEntities(tenantId, dto)
    const { calculatedLines, calculatedTotals } = this.calculateAndValidate(dto)

    // Resolve currency code
    let resolvedCurrency = dto.currency || 'USD'
    if (dto.currency_id) {
      const c = await prisma.currencies.findUnique({
        where: { id: dto.currency_id },
        select: { code: true },
      })
      if (c?.code) resolvedCurrency = c.code
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Header
      const createdPO = await tx.purchase_orders.create({
        data: {
          tenant_id: tenantId,
          supplier_id: dto.supplier_id,
          warehouse_id: dto.warehouse_id || null,
          branch_id: dto.branch_id || null,
          store_id: dto.store_id || null,
          order_date: dto.order_date ? new Date(dto.order_date) : new Date(),
          expected_delivery_date: dto.expected_delivery_date ? new Date(dto.expected_delivery_date) : null,
          currency_id: dto.currency_id || null,
          currency: resolvedCurrency,
          lifecycle_status: 'draft',
          subtotal: new Prisma.Decimal(calculatedTotals.dec_subtotal.toString()),
          discount_total: new Prisma.Decimal(calculatedTotals.dec_discount_total.toString()),
          tax_total: new Prisma.Decimal(calculatedTotals.dec_tax_total.toString()),
          shipping_amount: new Prisma.Decimal(calculatedTotals.dec_shipping_amount.toString()),
          grand_total: new Prisma.Decimal(calculatedTotals.dec_grand_total.toString()),
          notes: dto.notes || null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // 2. Create Items
      const itemsToCreate = calculatedLines.map((line) => ({
        tenant_id: tenantId,
        po_id: createdPO.id,
        line_no: line.line_no!,
        product_variant_id: line.product_variant_id,
        uom_id: line.uom_id || null,
        quantity_ordered: new Prisma.Decimal(line.dec_quantity.toString()),
        unit_cost: new Prisma.Decimal(line.dec_unit_cost.toString()),
        subtotal: new Prisma.Decimal(line.dec_subtotal.toString()),
        discount_amount: new Prisma.Decimal(line.dec_discount.toString()),
        tax_amount: new Prisma.Decimal(line.dec_tax.toString()),
        total_amount: new Prisma.Decimal(line.dec_total.toString()),
        received_quantity: new Prisma.Decimal('0.0000'),
        cancelled_qty: new Prisma.Decimal('0.0000'),
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }))

      await tx.purchase_order_items.createMany({
        data: itemsToCreate,
      })

      return createdPO
    })
  }

  /**
   * Update Purchase Order with authoritative recalculation & strict isolation.
   */
  public static async updatePurchaseOrder(
    _authUserId: string,
    tenantId: string,
    tenantUserId: string | null,
    dto: UpdatePurchaseOrderDto
  ) {
    const existing = await prisma.purchase_orders.findFirst({
      where: { id: dto.id, tenant_id: tenantId },
      select: { id: true, lifecycle_status: true },
    })
    if (!existing) {
      throw new ApiError('Purchase order not found.', 404)
    }

    if (existing.lifecycle_status && !['draft'].includes(existing.lifecycle_status)) {
      throw new ApiError(
        `Cannot edit purchase order in '${existing.lifecycle_status}' status. Only draft orders can be modified.`,
        400
      )
    }

    await this.validateTenantEntities(tenantId, dto)
    const { calculatedLines, calculatedTotals } = this.calculateAndValidate(dto)

    let resolvedCurrency = dto.currency || 'USD'
    if (dto.currency_id) {
      const c = await prisma.currencies.findUnique({
        where: { id: dto.currency_id },
        select: { code: true },
      })
      if (c?.code) resolvedCurrency = c.code
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Header
      const updatedPO = await tx.purchase_orders.update({
        where: { id: dto.id },
        data: {
          supplier_id: dto.supplier_id,
          warehouse_id: dto.warehouse_id || null,
          branch_id: dto.branch_id || null,
          store_id: dto.store_id || null,
          order_date: dto.order_date ? new Date(dto.order_date) : undefined,
          expected_delivery_date: dto.expected_delivery_date ? new Date(dto.expected_delivery_date) : null,
          currency_id: dto.currency_id || null,
          currency: resolvedCurrency,
          subtotal: new Prisma.Decimal(calculatedTotals.dec_subtotal.toString()),
          discount_total: new Prisma.Decimal(calculatedTotals.dec_discount_total.toString()),
          tax_total: new Prisma.Decimal(calculatedTotals.dec_tax_total.toString()),
          shipping_amount: new Prisma.Decimal(calculatedTotals.dec_shipping_amount.toString()),
          grand_total: new Prisma.Decimal(calculatedTotals.dec_grand_total.toString()),
          notes: dto.notes || null,
          updated_by_user_id: tenantUserId,
        },
      })

      // 2. Delete previous items and re-insert updated lines
      await tx.purchase_order_items.deleteMany({
        where: { po_id: dto.id, tenant_id: tenantId },
      })

      const itemsToCreate = calculatedLines.map((line) => ({
        tenant_id: tenantId,
        po_id: dto.id,
        line_no: line.line_no!,
        product_variant_id: line.product_variant_id,
        uom_id: line.uom_id || null,
        quantity_ordered: new Prisma.Decimal(line.dec_quantity.toString()),
        unit_cost: new Prisma.Decimal(line.dec_unit_cost.toString()),
        subtotal: new Prisma.Decimal(line.dec_subtotal.toString()),
        discount_amount: new Prisma.Decimal(line.dec_discount.toString()),
        tax_amount: new Prisma.Decimal(line.dec_tax.toString()),
        total_amount: new Prisma.Decimal(line.dec_total.toString()),
        received_quantity: new Prisma.Decimal('0.0000'),
        cancelled_qty: new Prisma.Decimal('0.0000'),
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }))

      await tx.purchase_order_items.createMany({
        data: itemsToCreate,
      })

      return updatedPO
    })
  }

  /**
   * Tenant-scoped fetch single Purchase Order with full details.
   */
  public static async getPurchaseOrderById(tenantId: string, id: string) {
    return await prisma.purchase_orders.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        suppliers: { select: { id: true, name: true, email: true, phone: true } },
        warehouses: { select: { id: true, name: true, code: true } },
        currencies: { select: { id: true, code: true, name: true, name_ar: true, symbol: true } },
        purchase_order_items: {
          orderBy: { line_no: 'asc' },
          include: {
            uoms: { select: { id: true, name: true, code: true, uom_category: true } },
            product_variants: {
              select: {
                id: true,
                sku: true,
                name: true,
                barcode: true,
                products: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    base_uom_id: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }
}

/**
 * Functional wrapper for validating Purchase Order payload without full execution.
 */
export async function validatePurchaseOrderPayload(
  tenantId: string,
  order: { supplier_id: string; warehouse_id?: string | null; order_date?: string | Date },
  items: Array<{ product_variant_id: string; quantity_ordered: number | string; unit_cost: number | string; uom_id?: string | null }>,
  prismaClient: DbClient = prisma
) {
  return PurchaseOrderService.validateTenantEntities(
    tenantId,
    { ...order, items } as CreatePurchaseOrderDto,
    prismaClient
  )
}

