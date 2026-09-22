'use server'

import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

// ---------------------------------------------------------------------------
// LIST suggestions (unchanged – already Prisma-based)
// ---------------------------------------------------------------------------

export async function listSuggestions(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.reorder_suggestions.findMany({
    where: { tenant_id: tenantId },
    include: {
      product_variants: {
        select: {
          id: true,
          sku: true,
          barcode: true,
          products: {
            select: {
              name: true,
            },
          },
        },
      },
      stores: {
        select: {
          store_id: true,
          name: true,
        },
      },
      suppliers: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { run_at: 'desc' },
  })
}

// ---------------------------------------------------------------------------
// RUN REORDER CHECK — Prisma 7 implementation
// Replaces the broken Supabase RPC `run_reorder_check`.
// Evaluates active reorder_rules against qty_available + on-order
// (open PO lines) and upserts one OPEN reorder_suggestion per rule.
// ---------------------------------------------------------------------------

interface StockAggRow {
  available: number
}

interface OnOrderRow {
  on_order: number
}

export async function runCheck(authUserId: string, storeId?: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  // 1. Fetch all active reorder rules for the tenant (filtered by store if given)
  const rules = await prisma.reorder_rules.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      ...(storeId ? { store_id: storeId } : {}),
    },
    orderBy: [{ store_id: 'asc' }, { product_variant_id: 'asc' }],
  })

  let suggestionsOpen = 0

  for (const rule of rules) {
    // 2. Compute available stock
    const stockRows = await prisma.$queryRawUnsafe<StockAggRow[]>(
      `SELECT COALESCE(SUM(
          COALESCE(qty_available, qty_on_hand - qty_reserved)
        ), 0)::float8 AS available
       FROM stock_balances
       WHERE tenant_id = $1::uuid
         AND product_variant_id = $2::uuid
         AND (
           ($3::uuid IS NOT NULL AND store_id = $3::uuid)
           OR ($3::uuid IS NULL AND $4::uuid IS NOT NULL AND warehouse_id = $4::uuid)
           OR ($3::uuid IS NULL AND $4::uuid IS NULL)
         )`,
      tenantId,
      rule.product_variant_id,
      rule.store_id ?? null,
      rule.warehouse_id ?? null,
    )
    const available = stockRows[0]?.available ?? 0

    // 3. Compute on-order quantity from open POs
    const onOrderRows = await prisma.$queryRawUnsafe<OnOrderRow[]>(
      `SELECT COALESCE(SUM(
          GREATEST(poi.quantity_ordered - COALESCE(poi.received_quantity, 0), 0)
        ), 0)::float8 AS on_order
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.po_id
       WHERE poi.tenant_id = $1::uuid
         AND poi.product_variant_id = $2::uuid
         AND (
           ($3::uuid IS NOT NULL AND (po.store_id = $3::uuid OR po.store_id IS NULL))
           OR ($3::uuid IS NULL AND $4::uuid IS NOT NULL AND (po.warehouse_id = $4::uuid OR po.warehouse_id IS NULL))
           OR ($3::uuid IS NULL AND $4::uuid IS NULL)
         )
         AND COALESCE(po.lifecycle_status::text, 'draft') IN ('approved', 'sent', 'partially_received')`,
      tenantId,
      rule.product_variant_id,
      rule.store_id ?? null,
      rule.warehouse_id ?? null,
    )
    const onOrder = onOrderRows[0]?.on_order ?? 0

    const reorderPoint = Number(rule.reorder_point) || 0
    const safetyStock = Number(rule.safety_stock) || 0

    if ((available + onOrder) <= (reorderPoint + safetyStock)) {
      // 4. Calculate suggested quantity
      let suggestQty = Number(rule.reorder_qty) || 0

      if (suggestQty <= 0) {
        const maxQty = Number(rule.max_qty) || 0
        const eoq = Number(rule.eoq) || 0
        suggestQty = Math.max(maxQty - available - onOrder, eoq, 0)
      }

      if (suggestQty <= 0) {
        // Fallback: at least enough to cross back over reorder_point + safety_stock
        suggestQty = Math.max((reorderPoint + safetyStock) - (available + onOrder) + 1, 1)
      }

      // 5. Upsert: one open suggestion per rule via raw SQL for ON CONFLICT on partial index
      await prisma.$queryRawUnsafe(
        `INSERT INTO reorder_suggestions
           (tenant_id, reorder_rule_id, product_variant_id, store_id, warehouse_id,
            qty_available_at_run, qty_on_order_at_run, suggested_qty,
            preferred_supplier_id, status, run_at,
            created_by_user_id, updated_by_user_id)
         VALUES
           ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
            $6, $7, $8,
            $9::uuid, 'open', now(),
            $10::uuid, $10::uuid)
         ON CONFLICT (reorder_rule_id) WHERE (status = 'open') DO UPDATE
           SET qty_available_at_run = EXCLUDED.qty_available_at_run,
               qty_on_order_at_run  = EXCLUDED.qty_on_order_at_run,
               suggested_qty        = EXCLUDED.suggested_qty,
               run_at               = now(),
               updated_at           = now(),
               updated_by_user_id   = EXCLUDED.updated_by_user_id`,
        tenantId,
        rule.id,
        rule.product_variant_id,
        rule.store_id ?? null,
        rule.warehouse_id ?? null,
        available,
        onOrder,
        suggestQty,
        rule.preferred_supplier_id ?? null,
        tenantUserId ?? null,
      )
      suggestionsOpen++
    } else {
      // 6. Demand satisfied — expire stale open suggestion for this rule
      await prisma.reorder_suggestions.updateMany({
        where: {
          reorder_rule_id: rule.id,
          status: 'open',
        },
        data: {
          status: 'expired',
          updated_at: new Date(),
        },
      })
    }
  }

  return { suggestions_open: suggestionsOpen }
}

// ---------------------------------------------------------------------------
// CONVERT suggestions → purchase requisition — Prisma $transaction
// ---------------------------------------------------------------------------

export async function convertSuggestions(authUserId: string, ids: string[]) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError('Select at least one suggestion to convert.', 400)
  }

  // Fetch open suggestions belonging to the tenant
  const openSuggestions = await prisma.reorder_suggestions.findMany({
    where: {
      id: { in: ids },
      tenant_id: tenantId,
      status: 'open',
    },
    include: {
      product_variants: {
        select: { id: true },
      },
    },
  })

  if (openSuggestions.length === 0) {
    throw new ApiError('No open suggestions found to convert.', 409)
  }

  // Determine store/branch for the requisition from the first suggestion
  const firstStoreId = openSuggestions[0].store_id ?? null
  let branchId: string | null = null
  if (firstStoreId) {
    const store = await prisma.stores.findUnique({
      where: { store_id: firstStoreId },
      select: { branch_id: true },
    })
    branchId = store?.branch_id ?? null
  }

  // Look up cost estimates from stock_balances avg_cost
  const variantIds = [...new Set(openSuggestions.map((s) => s.product_variant_id))]
  const costRows = await prisma.stock_balances.groupBy({
    by: ['product_variant_id'],
    where: {
      tenant_id: tenantId,
      product_variant_id: { in: variantIds },
    },
    _avg: { avg_cost: true },
  })
  const costMap = new Map(
    costRows.map((r) => [r.product_variant_id, Number(r._avg.avg_cost) || 0])
  )

  // Execute within a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create purchase requisition
    const requisition = await tx.purchase_requisitions.create({
      data: {
        tenant_id: tenantId,
        status: 'submitted',
        source: 'reorder_engine',
        requested_by: tenantUserId ?? 'System Reorder Engine',
        notes: 'Generated from reorder suggestions',
        store_id: firstStoreId,
        branch_id: branchId,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    // 2. Create requisition items
    const itemsData = openSuggestions.map((s) => ({
      requisition_id: requisition.id,
      product_variant_id: s.product_variant_id,
      qty_requested: s.suggested_qty,
      preferred_supplier_id: s.preferred_supplier_id,
      est_unit_cost: new Prisma.Decimal(costMap.get(s.product_variant_id) ?? 0),
      reason: 'Reorder point reached',
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    }))

    for (const item of itemsData) {
      await tx.purchase_requisition_items.create({ data: item })
    }

    // 3. Mark suggestions as converted
    const updated = await tx.reorder_suggestions.updateMany({
      where: {
        id: { in: ids },
        tenant_id: tenantId,
        status: 'open',
      },
      data: {
        status: 'converted',
        converted_requisition_id: requisition.id,
        updated_at: new Date(),
        updated_by_user_id: tenantUserId,
      },
    })

    return {
      requisition_id: requisition.id,
      suggestions_converted: updated.count,
    }
  })

  return result
}

// ---------------------------------------------------------------------------
// DISMISS suggestion (unchanged – already Prisma-based)
// ---------------------------------------------------------------------------

export async function dismissSuggestion(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = (await prisma.reorder_suggestions.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Suggestion not found.', 404)
  }
  if (existing.status !== 'open') {
    throw new ApiError('Only an open suggestion can be dismissed.', 409)
  }

  return prisma.reorder_suggestions.update({
    where: { id },
    data: {
      status: 'dismissed',
      updated_by_user_id: tenantUserId,
    },
  })
}
