'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'

// ============================================================================
// TYPES
// ============================================================================

export interface PriceResolutionContext {
  terminalId: string
  storeId?: string | null
  channelId?: string | null
  customerId?: string | null
  customerGroupId?: string | null
  warehouseId?: string | null
}

export interface ResolvedVariantPrice {
  productVariantId: string
  sku: string | null
  productName: string | null
  variantName: string | null
  unitPrice: Prisma.Decimal
  costPrice: Prisma.Decimal
  minPrice: Prisma.Decimal
  maxDiscountPercent: Prisma.Decimal
  priceListId: string | null
  priceListName: string | null
  taxRateId: string | null
  taxRate: Prisma.Decimal
  taxInclusive: boolean
  stockAvailable: Prisma.Decimal
  stockOnHand: Prisma.Decimal
}

// ============================================================================
// PRICING RESOLVER
// ============================================================================

/**
 * Resolves pricing for a list of product variants in POS context.
 * 
 * Priority order:
 * 1. Terminal's default price list
 * 2. Store + Channel price list assignment
 * 3. Customer group price list
 * 4. Global/default price list
 * 5. Variant's base_price fallback
 */
export async function resolvePosVariantPrices(
  authUserId: string,
  variantIds: string[],
  context: PriceResolutionContext
): Promise<ResolvedVariantPrice[]> {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    if (variantIds.length === 0) return []

    // 1. Load terminal for its default price list
    const terminal = await prisma.pos_terminals.findFirst({
      where: { id: context.terminalId, tenant_id: tenantId },
      select: { default_price_list_id: true, store_id: true, warehouse_id: true },
    })

    const storeId = context.storeId ?? terminal?.store_id ?? null
    const warehouseId = context.warehouseId ?? terminal?.warehouse_id ?? null

    // 2. Build candidate price list IDs in priority order
    const candidatePriceListIds: string[] = []

    // Priority 1: Terminal's default
    if (terminal?.default_price_list_id) {
      candidatePriceListIds.push(terminal.default_price_list_id)
    }

    // Priority 2-4: Price list assignments (Store+Channel, Channel, CustomerGroup, Global)
    const assignments = await prisma.price_list_assignments.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        price_list: { is_active: true },
        OR: [
          // Store + Channel
          ...(storeId && context.channelId
            ? [{ store_id: storeId, channel_id: context.channelId }]
            : []),
          // Channel only
          ...(context.channelId
            ? [{ channel_id: context.channelId, store_id: null }]
            : []),
          // Store only
          ...(storeId ? [{ store_id: storeId, channel_id: null }] : []),
          // Customer group
          ...(context.customerGroupId
            ? [{ customer_group_id: context.customerGroupId }]
            : []),
          // Global
          { assignment_type: 'GLOBAL' as const },
        ],
      },
      select: {
        price_list_id: true,
        assignment_type: true,
      },
      orderBy: { created_at: 'asc' },
    })

    for (const a of assignments) {
      if (!candidatePriceListIds.includes(a.price_list_id)) {
        candidatePriceListIds.push(a.price_list_id)
      }
    }

    // 3. Load all price list items for the candidate lists (or fallback) and requested variants
    const priceItems =
      candidatePriceListIds.length > 0
        ? await prisma.price_list_items.findMany({
            where: {
              price_list_id: { in: candidatePriceListIds },
              product_variant_id: { in: variantIds },
              tenant_id: tenantId,
            },
            include: {
              price_list: { select: { id: true, name: true } },
            },
          })
        : await prisma.price_list_items.findMany({
            where: {
              product_variant_id: { in: variantIds },
              tenant_id: tenantId,
            },
            include: {
              price_list: { select: { id: true, name: true } },
            },
          })

    // Build lookup: variantId -> best price item (first matching in priority or fallback)
    const variantPriceMap = new Map<string, (typeof priceItems)[0]>()
    for (const vid of variantIds) {
      if (candidatePriceListIds.length > 0) {
        for (const plId of candidatePriceListIds) {
          const match = priceItems.find(
            (pi) => pi.product_variant_id === vid && pi.price_list_id === plId
          )
          if (match) {
            variantPriceMap.set(vid, match)
            break
          }
        }
      } else {
        const match = priceItems.find((pi) => pi.product_variant_id === vid)
        if (match) {
          variantPriceMap.set(vid, match)
        }
      }
    }

    // 4. Load variants with product info and active tax rate
    const now = new Date()
    const [variants, activeTaxRate] = await Promise.all([
      prisma.product_variants.findMany({
        where: { id: { in: variantIds } },
        include: {
          products: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.tax_rates.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
          effective_from: { lte: now },
          OR: [
            { effective_to: null },
            { effective_to: { gte: now } },
          ],
        },
        orderBy: { effective_from: 'desc' },
      }),
    ])

    // 5. Load stock balances for the target warehouse
    const stockBalances = warehouseId
      ? await prisma.stock_balances.findMany({
          where: {
            product_variant_id: { in: variantIds },
            warehouse_id: warehouseId,
            tenant_id: tenantId,
          },
          select: {
            product_variant_id: true,
            qty_on_hand: true,
            qty_available: true,
          },
        })
      : []

    const stockMap = new Map(
      stockBalances.map((sb) => [sb.product_variant_id, sb])
    )

    // 6. Assemble resolved prices
    return variants.map((v): ResolvedVariantPrice => {
      const priceItem = variantPriceMap.get(v.id)
      const stock = stockMap.get(v.id)
      const basePrice = priceItem?.price ?? new Prisma.Decimal(0)

      return {
        productVariantId: v.id,
        sku: v.sku,
        productName: v.products?.name ?? null,
        variantName: v.name,
        unitPrice: priceItem?.price ?? basePrice,
        costPrice: priceItem?.cost_price ?? new Prisma.Decimal(0),
        minPrice: priceItem?.min_price ?? new Prisma.Decimal(0),
        maxDiscountPercent: priceItem?.max_discount_percent ?? new Prisma.Decimal(100),
        priceListId: priceItem?.price_list_id ?? null,
        priceListName: priceItem?.price_list?.name ?? null,
        taxRateId: activeTaxRate?.id ?? null,
        taxRate: activeTaxRate?.rate ?? new Prisma.Decimal(0),
        taxInclusive: activeTaxRate?.is_inclusive ?? false,
        stockAvailable: stock?.qty_available ?? new Prisma.Decimal(0),
        stockOnHand: stock?.qty_on_hand ?? new Prisma.Decimal(0),
      }
    })
  })
}

/**
 * Resolves the POS channel ID for the tenant.
 * Looks for a channel with code 'POS' or creates one if missing.
 */
export async function resolvePosChannelId(tenantId: string): Promise<string> {
  const channel = await prisma.channels.findFirst({
    where: {
      tenant_id: tenantId,
      code: { in: ['POS', 'pos'] },
    },
    select: { id: true },
  })

  if (channel) return channel.id

  // Auto-create POS channel
  const newChannel = await prisma.channels.create({
    data: {
      tenant_id: tenantId,
      code: 'POS',
      name: 'Point of Sale',
      description: 'In-store retail point of sale channel',
      is_active: true,
    },
  })

  return newChannel.id
}
