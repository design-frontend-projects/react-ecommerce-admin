'use server'

import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import type {
  PromotionStatus,
  InvPromotionRule,
  InvPromotionCondition,
} from '@/features/promotions/types'
import type {
  Prisma,
  inv_promotion_status_enum,
  inv_promotion_type_enum,
  inv_rule_action_type_enum,
  inv_promotion_scope_enum,
  inv_condition_field_enum,
  inv_condition_operator_enum,
} from '@/generated/prisma/client'

export interface GetPromotionsFilter {
  search?: string
  status?: PromotionStatus | 'all'
  promoType?: string
  channelId?: string
  branchId?: string
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}

export interface PromotionMutationInput {
  name: string
  code?: string | null
  description?: string | null
  status?: PromotionStatus
  promoType: string
  startDate: string
  endDate?: string | null
  timezone?: string
  priority?: number
  currencyId?: string | null
  currencyCode?: string
  minOrderAmount?: number
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  usagePerCustomer?: number | null
  dailyUsageLimit?: number | null
  allowStacking?: boolean
  stackingPriority?: number
  maxStackingCount?: number | null
  requiresCoupon?: boolean
  requiresApproval?: boolean
  autoApply?: boolean
  scopeProductType?: 'all' | 'selected'
  scopeCustomerType?: 'all' | 'selected'
  scopeChannelType?: 'all' | 'selected'
  scopeLocationType?: 'all' | 'selected'
  rules?: InvPromotionRule[]
  conditions?: InvPromotionCondition[]
  productIds?: { productId?: string; variantId?: string; isExcluded?: boolean }[]
  categoryIds?: { categoryId: string; isExcluded?: boolean }[]
  brandIds?: { brandId: string; isExcluded?: boolean }[]
  customerGroupIds?: { customerGroupId: string; isExcluded?: boolean }[]
  channelIds?: { channelId: string; isExcluded?: boolean }[]
  storeIds?: { storeId: string; isExcluded?: boolean }[]
  branchIds?: { branchId: string; isExcluded?: boolean }[]
}

export async function getPromotions(authUserId: string, filter: GetPromotionsFilter = {}) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Prisma.inv_promotionsWhereInput = {
      tenant_id: tenantId,
    }

    if (filter.status && filter.status !== 'all') {
      where.status = filter.status as inv_promotion_status_enum
    }

    if (filter.promoType) {
      where.promo_type = filter.promoType as inv_promotion_type_enum
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim()
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (filter.branchId) {
      where.branches = {
        some: { branch_id: filter.branchId, is_excluded: false },
      }
    }

    if (filter.channelId) {
      where.channels = {
        some: { channel_id: filter.channelId, is_excluded: false },
      }
    }

    if (filter.startDate) {
      where.start_date = { gte: new Date(filter.startDate) }
    }

    if (filter.endDate) {
      where.end_date = { lte: new Date(filter.endDate) }
    }

    const [totalCount, rows] = await Promise.all([
      prisma.inv_promotions.count({ where }),
      prisma.inv_promotions.findMany({
        where,
        include: {
          rules: { orderBy: { sort_order: 'asc' } },
          currencies: { select: { code: true, symbol: true, name: true } },
          _count: {
            select: {
              coupons: true,
              usage_logs: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
        skip,
        take: pageSize,
      }),
    ])

    return {
      data: rows.map((r) => ({
        ...r,
        currency_code: r.currency_code ?? r.currencies?.code ?? 'QAR',
        currencyCode: r.currency_code ?? r.currencies?.code ?? 'QAR',
        startDate: r.start_date.toISOString(),
        endDate: r.end_date ? r.end_date.toISOString() : null,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
        minOrderAmount: r.min_order_amount ? Number(r.min_order_amount) : 0,
        maxDiscountAmount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
        couponCount: r._count.coupons,
        redemptionCount: r._count.usage_logs,
      })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    }
  })
}

export async function getPromotionById(authUserId: string, promotionId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const [promo, usageLogsAgg] = await Promise.all([
      prisma.inv_promotions.findFirst({
        where: { id: promotionId, tenant_id: tenantId },
        include: {
          rules: {
            orderBy: { sort_order: 'asc' },
            include: {
              free_product_variant: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          conditions: { orderBy: { sort_order: 'asc' } },
          products: {
            include: {
              products: { select: { id: true, name: true, sku: true } },
              product_variants: { select: { id: true, name: true, sku: true } },
            },
          },
          categories: {
            include: {
              categories: { select: { id: true, name: true } },
            },
          },
          brands: {
            include: {
              brands: { select: { id: true, name: true } },
            },
          },
          customer_groups: {
            include: {
              customer_groups: { select: { id: true, name: true } },
            },
          },
          channels: {
            include: {
              channels: { select: { id: true, name: true } },
            },
          },
          stores: {
            include: {
              stores: { select: { store_id: true, name: true } },
            },
          },
          branches: {
            include: {
              branches: { select: { id: true, name: true } },
            },
          },
          coupons: {
            orderBy: { created_at: 'desc' },
            take: 50,
          },
          usage_logs: {
            orderBy: { used_at: 'desc' },
            take: 50,
            include: {
              sales_invoices: { select: { invoice_no: true } },
              sales_orders: { select: { order_number: true } },
              customers: { select: { first_name: true, last_name: true } },
            },
          },
          currencies: {
            select: { id: true, code: true, symbol: true, name: true },
          },
        },
      }),
      prisma.inv_promotion_usage_logs.aggregate({
        where: { promotion_id: promotionId, tenant_id: tenantId },
        _sum: { discount_amount: true },
      }),
    ])

    if (!promo) return null

    const resolvedCurrencyCode = promo.currency_code ?? promo.currencies?.code ?? 'QAR'
    const distributedDiscount = Number(usageLogsAgg._sum.discount_amount ?? 0)

    return {
      ...promo,
      current_discount_amount: distributedDiscount,
      currentDiscountAmount: distributedDiscount,
      currency_code: resolvedCurrencyCode,
      currencyCode: resolvedCurrencyCode,
      currency: promo.currencies,
      startDate: promo.start_date.toISOString(),
      endDate: promo.end_date ? promo.end_date.toISOString() : null,
      createdAt: promo.created_at.toISOString(),
      updatedAt: promo.updated_at.toISOString(),
      minOrderAmount: promo.min_order_amount ? Number(promo.min_order_amount) : 0,
      maxDiscountAmount: promo.max_discount_amount ? Number(promo.max_discount_amount) : null,
      rules: promo.rules.map((r) => ({
        ...r,
        action_type: r.rule_type,
        ruleType: r.rule_type,
        discountValue: Number(r.discount_value),
        getDiscountPercent: r.get_discount_percent ? Number(r.get_discount_percent) : 100,
        tierMinQuantity: r.tier_min_quantity ? Number(r.tier_min_quantity) : null,
        tierMinAmount: r.tier_min_amount ? Number(r.tier_min_amount) : null,
        freeVariantName: r.free_product_variant?.name ?? r.free_product_variant?.sku ?? null,
      })),
      usage_logs: promo.usage_logs.map((log) => ({
        ...log,
        customers: log.customers
          ? {
              ...log.customers,
              name: [log.customers.first_name, log.customers.last_name].filter(Boolean).join(' ') || null,
            }
          : null,
      })),
    }
  })
}

export async function createPromotion(authUserId: string, input: PromotionMutationInput) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // Determine currency code
    let curCode = input.currencyCode ?? 'QAR'
    if (input.currencyId) {
      const cur = await prisma.currencies.findUnique({
        where: { id: input.currencyId },
        select: { code: true },
      })
      if (cur) curCode = cur.code
    }

    return prisma.$transaction(async (tx) => {
      const newPromo = await tx.inv_promotions.create({
        data: {
          tenant_id: tenantId,
          name: input.name,
          code: input.code || null,
          description: input.description || null,
          status: (input.status as inv_promotion_status_enum) ?? 'draft',
          promo_type: (input.promoType as inv_promotion_type_enum) ?? 'percentage',
          start_date: new Date(input.startDate),
          end_date: input.endDate ? new Date(input.endDate) : null,
          timezone: input.timezone ?? 'Asia/Qatar',
          priority: input.priority ?? 0,
          currency_id: input.currencyId || null,
          currency_code: curCode,
          min_order_amount: input.minOrderAmount ?? 0,
          max_discount_amount: input.maxDiscountAmount || null,
          usage_limit: input.usageLimit || null,
          usage_per_customer: input.usagePerCustomer ?? 1,
          daily_usage_limit: input.dailyUsageLimit || null,
          allow_stacking: input.allowStacking ?? false,
          stacking_priority: input.stackingPriority ?? 0,
          max_stacking_count: input.maxStackingCount ?? 1,
          requires_coupon: input.requiresCoupon ?? false,
          requires_approval: input.requiresApproval ?? false,
          auto_apply: input.autoApply ?? true,
          scope_product_type: (input.scopeProductType as inv_promotion_scope_enum) ?? 'all',
          scope_customer_type: (input.scopeCustomerType as inv_promotion_scope_enum) ?? 'all',
          scope_channel_type: (input.scopeChannelType as inv_promotion_scope_enum) ?? 'all',
          scope_location_type: (input.scopeLocationType as inv_promotion_scope_enum) ?? 'all',
          created_by_user_id: authUserId,
        },
      })

      // 1. Rules
      if (input.rules && input.rules.length > 0) {
        await tx.inv_promotion_rules.createMany({
          data: input.rules.map((r, idx) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            rule_type: (r.ruleType as inv_rule_action_type_enum) ?? 'percentage_discount',
            discount_value: r.discountValue ?? 0,
            apply_to: r.applyTo ?? 'matching_items',
            buy_quantity: r.buyQuantity || null,
            get_quantity: r.getQuantity || null,
            get_discount_percent: r.getDiscountPercent ?? 100,
            get_product_variant_id: r.getProductVariantId || null,
            tier_min_quantity: r.tierMinQuantity || null,
            tier_min_amount: r.tierMinAmount || null,
            sort_order: r.sortOrder ?? idx,
          })),
        })
      }

      // 2. Conditions
      if (input.conditions && input.conditions.length > 0) {
        await tx.inv_promotion_conditions.createMany({
          data: input.conditions.map((c, idx) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            group_id: c.groupId ?? 'group_1',
            logical_operator: c.logicalOperator ?? 'AND',
            field: c.field as inv_condition_field_enum,
            operator: (c.operator as inv_condition_operator_enum) ?? 'gte',
            value: c.value,
            sort_order: c.sortOrder ?? idx,
          })),
        })
      }

      // 3. Product scopes
      if (input.productIds && input.productIds.length > 0) {
        await tx.inv_promotion_products.createMany({
          data: input.productIds.map((p) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            product_id: p.productId || null,
            product_variant_id: p.variantId || null,
            is_excluded: p.isExcluded ?? false,
          })),
        })
      }

      // 4. Category scopes
      if (input.categoryIds && input.categoryIds.length > 0) {
        await tx.inv_promotion_categories.createMany({
          data: input.categoryIds.map((c) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            category_id: c.categoryId,
            is_excluded: c.isExcluded ?? false,
          })),
        })
      }

      // 5. Brand scopes
      if (input.brandIds && input.brandIds.length > 0) {
        await tx.inv_promotion_brands.createMany({
          data: input.brandIds.map((b) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            brand_id: b.brandId,
            is_excluded: b.isExcluded ?? false,
          })),
        })
      }

      // 6. Customer group scopes
      if (input.customerGroupIds && input.customerGroupIds.length > 0) {
        await tx.inv_promotion_customer_groups.createMany({
          data: input.customerGroupIds.map((g) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            customer_group_id: g.customerGroupId,
            is_excluded: g.isExcluded ?? false,
          })),
        })
      }

      // 7. Channel scopes
      if (input.channelIds && input.channelIds.length > 0) {
        await tx.inv_promotion_channels.createMany({
          data: input.channelIds.map((ch) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            channel_id: ch.channelId,
            is_excluded: ch.isExcluded ?? false,
          })),
        })
      }

      // 8. Store scopes
      if (input.storeIds && input.storeIds.length > 0) {
        await tx.inv_promotion_stores.createMany({
          data: input.storeIds.map((s) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            store_id: s.storeId,
            is_excluded: s.isExcluded ?? false,
          })),
        })
      }

      // 9. Branch scopes
      if (input.branchIds && input.branchIds.length > 0) {
        await tx.inv_promotion_branches.createMany({
          data: input.branchIds.map((b) => ({
            tenant_id: tenantId,
            promotion_id: newPromo.id,
            branch_id: b.branchId,
            is_excluded: b.isExcluded ?? false,
          })),
        })
      }

      return newPromo
    })
  })
}

export async function updatePromotion(
  authUserId: string,
  promotionId: string,
  input: PromotionMutationInput
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.$transaction(async (tx) => {
      let curCode = input.currencyCode ?? 'QAR'
      if (input.currencyId) {
        const cur = await tx.currencies.findUnique({
          where: { id: input.currencyId },
          select: { code: true },
        })
        if (cur) curCode = cur.code
      }

      const updated = await tx.inv_promotions.update({
        where: { id: promotionId, tenant_id: tenantId },
        data: {
          name: input.name,
          code: input.code || null,
          description: input.description || null,
          status: input.status ? (input.status as inv_promotion_status_enum) : undefined,
          promo_type: input.promoType ? (input.promoType as inv_promotion_type_enum) : undefined,
          start_date: new Date(input.startDate),
          end_date: input.endDate ? new Date(input.endDate) : null,
          timezone: input.timezone ?? 'Asia/Qatar',
          priority: input.priority ?? 0,
          currency_id: input.currencyId || null,
          currency_code: curCode,
          min_order_amount: input.minOrderAmount ?? 0,
          max_discount_amount: input.maxDiscountAmount || null,
          usage_limit: input.usageLimit || null,
          usage_per_customer: input.usagePerCustomer ?? 1,
          daily_usage_limit: input.dailyUsageLimit || null,
          allow_stacking: input.allowStacking ?? false,
          stacking_priority: input.stackingPriority ?? 0,
          max_stacking_count: input.maxStackingCount ?? 1,
          requires_coupon: input.requiresCoupon ?? false,
          requires_approval: input.requiresApproval ?? false,
          auto_apply: input.autoApply ?? true,
          scope_product_type: input.scopeProductType ? (input.scopeProductType as inv_promotion_scope_enum) : undefined,
          scope_customer_type: input.scopeCustomerType ? (input.scopeCustomerType as inv_promotion_scope_enum) : undefined,
          scope_channel_type: input.scopeChannelType ? (input.scopeChannelType as inv_promotion_scope_enum) : undefined,
          scope_location_type: input.scopeLocationType ? (input.scopeLocationType as inv_promotion_scope_enum) : undefined,
          updated_by_user_id: authUserId,
          updated_at: new Date(),
        },
      })

      // Replace child relations
      if (input.rules) {
        await tx.inv_promotion_rules.deleteMany({ where: { promotion_id: promotionId } })
        if (input.rules.length > 0) {
          await tx.inv_promotion_rules.createMany({
            data: input.rules.map((r, idx) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              rule_type: (r.ruleType as inv_rule_action_type_enum) ?? 'percentage_discount',
              discount_value: r.discountValue ?? 0,
              apply_to: r.applyTo ?? 'matching_items',
              buy_quantity: r.buyQuantity || null,
              get_quantity: r.getQuantity || null,
              get_discount_percent: r.getDiscountPercent ?? 100,
              get_product_variant_id: r.getProductVariantId || null,
              tier_min_quantity: r.tierMinQuantity || null,
              tier_min_amount: r.tierMinAmount || null,
              sort_order: r.sortOrder ?? idx,
            })),
          })
        }
      }

      if (input.conditions) {
        await tx.inv_promotion_conditions.deleteMany({ where: { promotion_id: promotionId } })
        if (input.conditions.length > 0) {
          await tx.inv_promotion_conditions.createMany({
            data: input.conditions.map((c, idx) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              group_id: c.groupId ?? 'group_1',
              logical_operator: c.logicalOperator ?? 'AND',
              field: c.field as inv_condition_field_enum,
              operator: (c.operator as inv_condition_operator_enum) ?? 'gte',
              value: c.value,
              sort_order: c.sortOrder ?? idx,
            })),
          })
        }
      }

      if (input.productIds) {
        await tx.inv_promotion_products.deleteMany({ where: { promotion_id: promotionId } })
        if (input.productIds.length > 0) {
          await tx.inv_promotion_products.createMany({
            data: input.productIds.map((p) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              product_id: p.productId || null,
              product_variant_id: p.variantId || null,
              is_excluded: p.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.categoryIds) {
        await tx.inv_promotion_categories.deleteMany({ where: { promotion_id: promotionId } })
        if (input.categoryIds.length > 0) {
          await tx.inv_promotion_categories.createMany({
            data: input.categoryIds.map((c) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              category_id: c.categoryId,
              is_excluded: c.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.brandIds) {
        await tx.inv_promotion_brands.deleteMany({ where: { promotion_id: promotionId } })
        if (input.brandIds.length > 0) {
          await tx.inv_promotion_brands.createMany({
            data: input.brandIds.map((b) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              brand_id: b.brandId,
              is_excluded: b.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.customerGroupIds) {
        await tx.inv_promotion_customer_groups.deleteMany({ where: { promotion_id: promotionId } })
        if (input.customerGroupIds.length > 0) {
          await tx.inv_promotion_customer_groups.createMany({
            data: input.customerGroupIds.map((g) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              customer_group_id: g.customerGroupId,
              is_excluded: g.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.channelIds) {
        await tx.inv_promotion_channels.deleteMany({ where: { promotion_id: promotionId } })
        if (input.channelIds.length > 0) {
          await tx.inv_promotion_channels.createMany({
            data: input.channelIds.map((ch) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              channel_id: ch.channelId,
              is_excluded: ch.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.storeIds) {
        await tx.inv_promotion_stores.deleteMany({ where: { promotion_id: promotionId } })
        if (input.storeIds.length > 0) {
          await tx.inv_promotion_stores.createMany({
            data: input.storeIds.map((s) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              store_id: s.storeId,
              is_excluded: s.isExcluded ?? false,
            })),
          })
        }
      }

      if (input.branchIds) {
        await tx.inv_promotion_branches.deleteMany({ where: { promotion_id: promotionId } })
        if (input.branchIds.length > 0) {
          await tx.inv_promotion_branches.createMany({
            data: input.branchIds.map((b) => ({
              tenant_id: tenantId,
              promotion_id: promotionId,
              branch_id: b.branchId,
              is_excluded: b.isExcluded ?? false,
            })),
          })
        }
      }

      return updated
    })
  })
}

export async function changePromotionStatus(
  authUserId: string,
  promotionId: string,
  status: PromotionStatus
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.inv_promotions.update({
      where: { id: promotionId, tenant_id: tenantId },
      data: {
        status: status as inv_promotion_status_enum,
        updated_by_user_id: authUserId,
        updated_at: new Date(),
      },
    })
  })
}

export async function duplicatePromotion(authUserId: string, promotionId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await getPromotionById(authUserId, promotionId)
    if (!existing) throw new Error('Promotion not found')

    const duplicateInput: PromotionMutationInput = {
      name: `${existing.name} (Copy)`,
      code: existing.code ? `${existing.code}_COPY_${Date.now().toString().slice(-4)}` : null,
      description: existing.description,
      status: 'draft',
      promoType: existing.promo_type,
      startDate: new Date().toISOString(),
      endDate: existing.endDate,
      timezone: existing.timezone,
      priority: existing.priority,
      currencyId: existing.currency_id,
      currencyCode: existing.currency_code ?? 'QAR',
      minOrderAmount: existing.minOrderAmount,
      maxDiscountAmount: existing.maxDiscountAmount,
      usageLimit: existing.usage_limit,
      usagePerCustomer: existing.usage_per_customer,
      dailyUsageLimit: existing.daily_usage_limit,
      allowStacking: existing.allow_stacking,
      stackingPriority: existing.stacking_priority,
      maxStackingCount: existing.max_stacking_count,
      requiresCoupon: existing.requires_coupon,
      requiresApproval: existing.requires_approval,
      autoApply: existing.auto_apply,
      scopeProductType: existing.scope_product_type as 'all' | 'selected',
      scopeCustomerType: existing.scope_customer_type as 'all' | 'selected',
      scopeChannelType: existing.scope_channel_type as 'all' | 'selected',
      scopeLocationType: existing.scope_location_type as 'all' | 'selected',
      rules:
        existing.rules?.map((r) => ({
          ruleType: r.rule_type,
          discountValue: Number(r.discount_value),
          applyTo: r.apply_to,
          buyQuantity: r.buy_quantity ?? undefined,
          getQuantity: r.get_quantity ?? undefined,
          getDiscountPercent: r.get_discount_percent ? Number(r.get_discount_percent) : undefined,
          getProductVariantId: r.get_product_variant_id ?? undefined,
          tierMinQuantity: r.tier_min_quantity ? Number(r.tier_min_quantity) : undefined,
          tierMinAmount: r.tier_min_amount ? Number(r.tier_min_amount) : undefined,
          sortOrder: r.sort_order,
        })) || [],
      conditions:
        existing.conditions?.map((c) => ({
          groupId: c.group_id ?? undefined,
          logicalOperator: c.logical_operator as 'AND' | 'OR',
          field: c.field,
          operator: c.operator,
          value: c.value,
          sortOrder: c.sort_order,
        })) || [],
      productIds: existing.products?.map((p) => ({
        productId: p.product_id || undefined,
        variantId: p.product_variant_id || undefined,
        isExcluded: p.is_excluded,
      })),
      categoryIds: existing.categories?.map((c) => ({
        categoryId: c.category_id,
        isExcluded: c.is_excluded,
      })),
      brandIds: existing.brands?.map((b) => ({
        brandId: b.brand_id,
        isExcluded: b.is_excluded,
      })),
      customerGroupIds: existing.customer_groups?.map((g) => ({
        customerGroupId: g.customer_group_id,
        isExcluded: g.is_excluded,
      })),
      channelIds: existing.channels?.map((ch) => ({
        channelId: ch.channel_id,
        isExcluded: ch.is_excluded,
      })),
      storeIds: existing.stores?.map((s) => ({
        storeId: s.store_id,
        isExcluded: s.is_excluded,
      })),
      branchIds: existing.branches?.map((b) => ({
        branchId: b.branch_id,
        isExcluded: b.is_excluded,
      })),
    }

    return createPromotion(authUserId, duplicateInput)
  })
}

export async function deletePromotion(authUserId: string, promotionId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // If promotion has usage logs, archive it rather than hard delete to protect invoice audit history
    const usageCount = await prisma.inv_promotion_usage_logs.count({
      where: { promotion_id: promotionId },
    })

    if (usageCount > 0) {
      return prisma.inv_promotions.update({
        where: { id: promotionId, tenant_id: tenantId },
        data: {
          status: 'archived',
          updated_by_user_id: authUserId,
          updated_at: new Date(),
        },
      })
    }

    return prisma.inv_promotions.delete({
      where: { id: promotionId, tenant_id: tenantId },
    })
  })
}

export async function getPromotionUsageStats(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const [
      totalPromotions,
      activePromotions,
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      usageLogs,
    ] = await Promise.all([
      prisma.inv_promotions.count({ where: { tenant_id: tenantId } }),
      prisma.inv_promotions.count({ where: { tenant_id: tenantId, status: 'active' } }),
      prisma.inv_coupons.count({ where: { tenant_id: tenantId } }),
      prisma.inv_coupons.count({ where: { tenant_id: tenantId, status: 'active' } }),
      prisma.inv_promotion_usage_logs.count({ where: { tenant_id: tenantId } }),
      prisma.inv_promotion_usage_logs.findMany({
        where: { tenant_id: tenantId },
        select: { discount_amount: true, used_at: true },
        orderBy: { used_at: 'desc' },
        take: 100,
      }),
    ])

    const totalDiscountGiven = usageLogs.reduce((sum, l) => sum + Number(l.discount_amount), 0)

    return {
      totalPromotions,
      activePromotions,
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountGiven,
      recentUsage: usageLogs.slice(0, 10).map((l) => ({
        discountAmount: Number(l.discount_amount),
        usedAt: l.used_at.toISOString(),
      })),
    }
  })
}

export async function getPromotionLookupData(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const [
      currencies,
      categories,
      brands,
      customerGroups,
      channels,
      stores,
      branches,
      products,
      productVariants,
    ] = await Promise.all([
      prisma.currencies.findMany({
        where: { is_active: true },
        select: { id: true, code: true, name: true, symbol: true },
        orderBy: { code: 'asc' },
      }),
      prisma.categories.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, name_ar: true },
        orderBy: { name: 'asc' },
      }),
      prisma.brands.findMany({
        where: { is_active: true },
        select: { id: true, name: true, name_ar: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.customer_groups.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, name: true, discount_percentage: true },
        orderBy: { name: 'asc' },
      }),
      prisma.channels.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.stores.findMany({
        where: { tenant_id: tenantId, status: true },
        select: { store_id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.branches.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.products.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, sku: true, category_id: true, brand_id: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      prisma.product_variants.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, sku: true, product_id: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ])

    return {
      currencies,
      categories,
      brands,
      customerGroups: customerGroups.map((g) => ({
        id: g.id,
        name: g.name,
        discountPercentage: g.discount_percentage ? Number(g.discount_percentage) : 0,
      })),
      channels,
      stores: stores.map((s) => ({ id: s.store_id, name: s.name })),
      branches,
      products,
      productVariants,
    }
  })
}
