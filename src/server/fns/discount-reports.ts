'use server'

import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import type { Prisma } from '@/generated/prisma/client'

export interface DiscountReportsFilter {
  startDate?: string
  endDate?: string
  branchId?: string
  channelId?: string
  promotionId?: string
}

export async function getDiscountAnalytics(
  authUserId: string,
  filter: DiscountReportsFilter = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.inv_promotion_usage_logsWhereInput = {
      tenant_id: tenantId,
    }

    if (filter.startDate || filter.endDate) {
      where.used_at = {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
      }
    }
    if (filter.branchId) {
      where.branch_id = filter.branchId
    }
    if (filter.channelId) {
      where.channel_id = filter.channelId
    }
    if (filter.promotionId) {
      where.promotion_id = filter.promotionId
    }

    // 1. Fetch usage logs
    const usageLogs = await prisma.inv_promotion_usage_logs.findMany({
      where,
      include: {
        promotion: { select: { name: true, promo_type: true, currency_code: true } },
        channels: { select: { name: true } },
        branches: { select: { name: true } },
      },
      orderBy: { used_at: 'desc' },
      take: 500,
    })

    // 2. Fetch invoice discounts
    const invoiceDiscounts = await prisma.inv_sales_invoice_discounts.findMany({
      where: { tenant_id: tenantId },
      include: {
        promotion: { select: { name: true } },
        coupon: { select: { code: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    })

    const totalDiscountAmount = usageLogs.reduce((sum, l) => sum + Number(l.discount_amount), 0)
    const totalTransactions = usageLogs.length
    const avgDiscountPerTx = totalTransactions > 0 ? totalDiscountAmount / totalTransactions : 0

    // Top promotions by discount given
    const promoMap = new Map<string, { name: string; count: number; totalAmount: number; promoType: string }>()
    usageLogs.forEach((l) => {
      const existing = promoMap.get(l.promotion_id) || {
        name: l.promotion.name,
        count: 0,
        totalAmount: 0,
        promoType: l.promotion.promo_type,
      }
      existing.count += 1
      existing.totalAmount += Number(l.discount_amount)
      promoMap.set(l.promotion_id, existing)
    })

    const topPromotions = Array.from(promoMap.entries())
      .map(([id, val]) => ({
        id,
        name: val.name,
        count: val.count,
        totalAmount: Number(val.totalAmount.toFixed(2)),
        promoType: val.promoType,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)

    // Discount by source
    const sourceMap: Record<string, number> = {
      promotion: 0,
      coupon: 0,
      manual: 0,
      customer_group: 0,
      price_list: 0,
    }
    invoiceDiscounts.forEach((d) => {
      const src = d.discount_source || 'promotion'
      sourceMap[src] = (sourceMap[src] || 0) + Number(d.discount_amount)
    })

    // Discount by branch
    const branchMap = new Map<string, number>()
    usageLogs.forEach((l) => {
      const bName = l.branches?.name ?? 'Main Branch'
      branchMap.set(bName, (branchMap.get(bName) || 0) + Number(l.discount_amount))
    })
    const discountsByBranch = Array.from(branchMap.entries()).map(([name, amount]) => ({
      name,
      amount: Number(amount.toFixed(2)),
    }))

    // Usage over time (by day)
    const dayMap = new Map<string, { date: string; amount: number; count: number }>()
    usageLogs.forEach((l) => {
      const day = l.used_at.toISOString().split('T')[0]
      const existing = dayMap.get(day) || { date: day, amount: 0, count: 0 }
      existing.amount += Number(l.discount_amount)
      existing.count += 1
      dayMap.set(day, existing)
    })
    const discountsOverTime = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    return {
      summary: {
        totalDiscountAmount: Number(totalDiscountAmount.toFixed(2)),
        totalTransactions,
        avgDiscountPerTx: Number(avgDiscountPerTx.toFixed(2)),
        currencyCode: usageLogs[0]?.promotion.currency_code ?? 'QAR',
      },
      topPromotions,
      discountsBySource: Object.entries(sourceMap).map(([source, amount]) => ({
        source,
        amount: Number(amount.toFixed(2)),
      })),
      discountsByBranch,
      discountsOverTime,
      recentLogs: usageLogs.slice(0, 50).map((l) => ({
        id: l.id,
        promotionName: l.promotion.name,
        discountAmount: Number(l.discount_amount),
        channelName: l.channels?.name ?? null,
        branchName: l.branches?.name ?? null,
        usedAt: l.used_at.toISOString(),
      })),
    }
  })
}
