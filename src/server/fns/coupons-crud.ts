'use server'

import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import type { CouponStatus } from '@/features/promotions/types'
import type { Prisma, inv_coupon_status_enum } from '@/generated/prisma/client'

export interface GetCouponsFilter {
  search?: string
  status?: CouponStatus | 'all'
  promotionId?: string
  customerId?: string
  page?: number
  pageSize?: number
}

export interface CouponMutationInput {
  promotionId: string
  code: string
  description?: string | null
  status?: CouponStatus
  maxUsages?: number | null
  maxUsagesPerCustomer?: number | null
  minOrderAmount?: number | null
  startDate?: string | null
  endDate?: string | null
  customerId?: string | null
  isSingleUse?: boolean
}

export interface BulkCouponGenerateInput {
  promotionId: string
  prefix?: string
  count: number
  maxUsages?: number
  maxUsagesPerCustomer?: number
  minOrderAmount?: number
  startDate?: string
  endDate?: string
  isSingleUse?: boolean
}

export async function getCoupons(authUserId: string, filter: GetCouponsFilter = {}) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Prisma.inv_couponsWhereInput = {
      tenant_id: tenantId,
    }

    if (filter.status && filter.status !== 'all') {
      where.status = filter.status as inv_coupon_status_enum
    }

    if (filter.promotionId) {
      where.promotion_id = filter.promotionId
    }

    if (filter.customerId) {
      where.customer_id = filter.customerId
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim()
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { promotion: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [totalCount, rows] = await Promise.all([
      prisma.inv_coupons.count({ where }),
      prisma.inv_coupons.findMany({
        where,
        include: {
          promotion: { select: { id: true, name: true, promo_type: true, currency_code: true } },
          customers: { select: { id: true, first_name: true, last_name: true, email: true } },
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    return {
      data: rows.map((c) => ({
        id: c.id,
        tenantId: c.tenant_id,
        promotionId: c.promotion_id,
        promotionName: c.promotion.name,
        promotionType: c.promotion.promo_type,
        currencyCode: c.promotion.currency_code ?? 'QAR',
        code: c.code,
        description: c.description,
        status: c.status,
        maxUsages: c.max_usages,
        maxUsagesPerCustomer: c.max_usages_per_customer,
        currentUsages: c.current_usages,
        redemptionCount: c._count.redemptions,
        minOrderAmount: c.min_order_amount ? Number(c.min_order_amount) : null,
        startDate: c.start_date ? c.start_date.toISOString() : null,
        endDate: c.end_date ? c.end_date.toISOString() : null,
        customerId: c.customer_id,
        customerName: c.customers
          ? `${c.customers.first_name} ${c.customers.last_name}`
          : null,
        isSingleUse: c.is_single_use,
        createdAt: c.created_at.toISOString(),
        updatedAt: c.updated_at.toISOString(),
      })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    }
  })
}

export async function createCoupon(authUserId: string, input: CouponMutationInput) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // Validate unique code per tenant
    const existing = await prisma.inv_coupons.findFirst({
      where: {
        tenant_id: tenantId,
        code: { equals: input.code.trim(), mode: 'insensitive' },
      },
    })
    if (existing) {
      throw new Error(`Coupon code '${input.code}' already exists for this tenant.`)
    }

    return prisma.inv_coupons.create({
      data: {
        tenant_id: tenantId,
        promotion_id: input.promotionId,
        code: input.code.trim().toUpperCase(),
        description: input.description || null,
        status: (input.status as inv_coupon_status_enum) ?? 'active',
        max_usages: input.maxUsages || null,
        max_usages_per_customer: input.maxUsagesPerCustomer ?? 1,
        min_order_amount: input.minOrderAmount || null,
        start_date: input.startDate ? new Date(input.startDate) : null,
        end_date: input.endDate ? new Date(input.endDate) : null,
        customer_id: input.customerId || null,
        is_single_use: input.isSingleUse ?? false,
        created_by_user_id: authUserId,
      },
    })
  })
}

export async function updateCoupon(
  authUserId: string,
  couponId: string,
  input: Partial<CouponMutationInput>
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    if (input.code) {
      const existing = await prisma.inv_coupons.findFirst({
        where: {
          tenant_id: tenantId,
          code: { equals: input.code.trim(), mode: 'insensitive' },
          id: { not: couponId },
        },
      })
      if (existing) {
        throw new Error(`Coupon code '${input.code}' is already used by another coupon.`)
      }
    }

    return prisma.inv_coupons.update({
      where: { id: couponId, tenant_id: tenantId },
      data: {
        promotion_id: input.promotionId,
        code: input.code ? input.code.trim().toUpperCase() : undefined,
        description: input.description,
        status: input.status ? (input.status as inv_coupon_status_enum) : undefined,
        max_usages: input.maxUsages,
        max_usages_per_customer: input.maxUsagesPerCustomer,
        min_order_amount: input.minOrderAmount,
        start_date: input.startDate ? new Date(input.startDate) : undefined,
        end_date: input.endDate ? new Date(input.endDate) : undefined,
        customer_id: input.customerId,
        is_single_use: input.isSingleUse,
        updated_by_user_id: authUserId,
        updated_at: new Date(),
      },
    })
  })
}

export async function changeCouponStatus(
  authUserId: string,
  couponId: string,
  status: CouponStatus
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.inv_coupons.update({
      where: { id: couponId, tenant_id: tenantId },
      data: {
        status: status as inv_coupon_status_enum,
        updated_by_user_id: authUserId,
        updated_at: new Date(),
      },
    })
  })
}

export async function deleteCoupon(authUserId: string, couponId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const usageCount = await prisma.inv_coupon_redemptions.count({
      where: { coupon_id: couponId },
    })

    if (usageCount > 0) {
      return prisma.inv_coupons.update({
        where: { id: couponId, tenant_id: tenantId },
        data: {
          status: 'disabled',
          updated_by_user_id: authUserId,
          updated_at: new Date(),
        },
      })
    }

    return prisma.inv_coupons.delete({
      where: { id: couponId, tenant_id: tenantId },
    })
  })
}

export async function generateBulkCoupons(
  authUserId: string,
  input: BulkCouponGenerateInput
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const prefix = input.prefix ? input.prefix.trim().toUpperCase() : 'PROMO'
    const count = Math.min(Math.max(1, input.count), 500) // limit max 500 at a time

    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
      codes.push(`${prefix}-${randomSuffix}`)
    }

    await prisma.inv_coupons.createMany({
      data: codes.map((c) => ({
        tenant_id: tenantId,
        promotion_id: input.promotionId,
        code: c,
        description: `Generated in batch for promotion`,
        status: 'active',
        max_usages: input.maxUsages ?? 1,
        max_usages_per_customer: input.maxUsagesPerCustomer ?? 1,
        min_order_amount: input.minOrderAmount || null,
        start_date: input.startDate ? new Date(input.startDate) : null,
        end_date: input.endDate ? new Date(input.endDate) : null,
        is_single_use: input.isSingleUse ?? true,
        created_by_user_id: authUserId,
      })),
      skipDuplicates: true,
    })

    return {
      generatedCount: codes.length,
      sampleCodes: codes.slice(0, 10),
    }
  })
}
