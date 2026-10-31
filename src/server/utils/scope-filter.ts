/**
 * src/server/utils/scope-filter.ts
 *
 * Query-Level ABAC Scope Filter Generator.
 * Enforces Zero-Trust Database Scoping based on user's ABAC dataScope:
 * - TENANT: Scoped to active tenant.
 * - ASSIGNED_BRANCHES: Scoped to user's assigned branch(es).
 * - ASSIGNED_WAREHOUSES: Scoped to user's assigned warehouse(s).
 * - OWN_RECORDS: Scoped to records created or requested by the user.
 */

export type DataScopeType =
  | 'TENANT'
  | 'ASSIGNED_BRANCHES'
  | 'ASSIGNED_WAREHOUSES'
  | 'OWN_RECORDS'

export interface UserScopeContext {
  tenantId: string
  tenantUserId: string
  authUserId: string
  branchIds: string[]
  warehouseIds: string[]
  dataScope: DataScopeType
  isSuperAdmin: boolean
}

export type ScopedEntity =
  | 'products'
  | 'purchase_orders'
  | 'purchase_requisitions'
  | 'stock_transfers'
  | 'stock_adjustments'
  | 'stock_counts'
  | 'inventory_items'
  | 'stock_balances'
  | 'goods_receipts'
  | 'sales_orders'
  | 'sales_invoices'
  | 'pos_terminals'
  | 'discount_approvals'
  | 'approval_requests'
  | string

/**
 * Sentinel non-existent UUID used to safely fail-closed when a user has a restricted
 * scope (e.g. ASSIGNED_BRANCHES) but no assigned resources (branchIds is empty).
 */
export const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000'

/**
 * Normalizes entity name to lowercase singular/plural standard forms.
 */
function normalizeEntity(entity: string): string {
  const e = entity.toLowerCase().trim()
  if (e === 'product') return 'products'
  if (e === 'purchase_order') return 'purchase_orders'
  if (e === 'purchase_requisition') return 'purchase_requisitions'
  if (e === 'stock_transfer') return 'stock_transfers'
  if (e === 'stock_adjustment') return 'stock_adjustments'
  if (e === 'stock_count') return 'stock_counts'
  if (e === 'inventory_item') return 'inventory_items'
  if (e === 'stock_balance') return 'stock_balances'
  if (e === 'goods_receipt') return 'goods_receipts'
  if (e === 'sales_order') return 'sales_orders'
  if (e === 'sales_invoice') return 'sales_invoices'
  if (e === 'pos_terminal') return 'pos_terminals'
  if (e === 'discount_approval' || e === 'inv_discount_approval_requests') return 'discount_approvals'
  if (e === 'approval_request') return 'approval_requests'
  return e
}

/**
 * Safely merges user-supplied where conditions with mandatory ABAC scope where conditions.
 */
export function mergeWhere(
  existingWhere: Record<string, unknown> | undefined,
  scopeWhere: Record<string, unknown>
): Record<string, unknown> {
  if (!existingWhere || Object.keys(existingWhere).length === 0) {
    return scopeWhere
  }

  const existingKeys = Object.keys(existingWhere)
  const hasConflict = existingKeys.some(
    (k) => k in scopeWhere && k !== 'tenant_id'
  )

  if (hasConflict || existingWhere.OR || scopeWhere.OR) {
    if (Array.isArray(existingWhere.AND)) {
      return {
        AND: [...existingWhere.AND, scopeWhere],
      }
    }
    return {
      AND: [existingWhere, scopeWhere],
    }
  }

  return {
    ...existingWhere,
    ...scopeWhere,
  }
}

/**
 * Builds a typed Prisma where filter enforcing ABAC data scopes.
 * Always includes base tenant isolation (`tenant_id: ctx.tenantId`).
 */
export function buildScopeWhere<T extends Record<string, unknown> = Record<string, unknown>>(
  entity: ScopedEntity,
  ctx: UserScopeContext,
  existingWhere?: Record<string, unknown>
): T {
  if (!ctx || !ctx.tenantId?.trim()) {
    throw new Error('UserScopeContext requires a valid, non-empty tenantId.')
  }

  // 1. Mandatory Base Filter: Strict Tenant Isolation
  const baseWhere: Record<string, unknown> = {
    tenant_id: ctx.tenantId.trim(),
  }

  // SuperAdmins and TENANT scope have full visibility across the tenant
  if (ctx.isSuperAdmin || ctx.dataScope === 'TENANT') {
    return mergeWhere(existingWhere, baseWhere) as T
  }

  const normalized = normalizeEntity(entity)
  let scopeWhere: Record<string, unknown>

  // 2. ASSIGNED_BRANCHES Scope
  if (ctx.dataScope === 'ASSIGNED_BRANCHES') {
    const validBranchIds = (ctx.branchIds || []).map((id) => id?.trim()).filter(Boolean)
    // Fail-closed: if user has no assigned branches, use sentinel non-matching UUID
    const branchFilter =
      validBranchIds.length > 0 ? { in: validBranchIds } : { in: [NON_EXISTENT_UUID] }

    switch (normalized) {
      case 'purchase_orders':
      case 'purchase_requisitions':
      case 'sales_orders':
      case 'sales_invoices':
      case 'pos_terminals':
      case 'discount_approvals':
        scopeWhere = { ...baseWhere, branch_id: branchFilter }
        break

      case 'stock_transfers':
        scopeWhere = {
          ...baseWhere,
          OR: [
            { from_branch_id: branchFilter },
            { to_branch_id: branchFilter },
          ],
        }
        break

      default:
        // Entities not partitioned by branch remain partitioned by tenant
        scopeWhere = baseWhere
        break
    }
  }

  // 3. ASSIGNED_WAREHOUSES Scope
  else if (ctx.dataScope === 'ASSIGNED_WAREHOUSES') {
    const validWarehouseIds = (ctx.warehouseIds || []).map((id) => id?.trim()).filter(Boolean)
    // Fail-closed: if user has no assigned warehouses, use sentinel non-matching UUID
    const whFilter =
      validWarehouseIds.length > 0 ? { in: validWarehouseIds } : { in: [NON_EXISTENT_UUID] }

    switch (normalized) {
      case 'stock_balances':
      case 'stock_adjustments':
      case 'stock_counts':
      case 'goods_receipts':
      case 'purchase_orders':
      case 'sales_orders':
      case 'sales_invoices':
      case 'pos_terminals':
        scopeWhere = { ...baseWhere, warehouse_id: whFilter }
        break

      case 'stock_transfers':
        scopeWhere = {
          ...baseWhere,
          OR: [
            { source_warehouse_id: whFilter },
            { destination_warehouse_id: whFilter },
          ],
        }
        break

      case 'inventory_items':
        scopeWhere = {
          ...baseWhere,
          stock_balances: {
            some: {
              warehouse_id: whFilter,
            },
          },
        }
        break

      default:
        // Entities not partitioned by warehouse remain partitioned by tenant
        scopeWhere = baseWhere
        break
    }
  }

  // 4. OWN_RECORDS Scope
  else if (ctx.dataScope === 'OWN_RECORDS') {
    const userIds = [ctx.tenantUserId, ctx.authUserId].map((id) => id?.trim()).filter(Boolean)
    const userFilter =
      userIds.length > 0
        ? userIds.length === 1
          ? userIds[0]
          : { in: userIds }
        : NON_EXISTENT_UUID

    switch (normalized) {
      case 'purchase_requisitions':
        scopeWhere = {
          ...baseWhere,
          OR: [
            { created_by_user_id: userFilter },
            { requested_by: typeof userFilter === 'string' ? userFilter : { in: userIds } },
          ],
        }
        break

      case 'discount_approvals':
      case 'approval_requests':
        scopeWhere = { ...baseWhere, requested_by_user_id: userFilter }
        break

      case 'stock_transfers':
        scopeWhere = {
          ...baseWhere,
          OR: [
            { created_by_user_id: userFilter },
            { requested_by_user_id: userFilter },
          ],
        }
        break

      case 'goods_receipts':
        scopeWhere = {
          ...baseWhere,
          OR: [
            { created_by_user_id: userFilter },
            { posted_by_user_id: userFilter },
          ],
        }
        break

      case 'products':
      case 'purchase_orders':
      case 'sales_orders':
      case 'sales_invoices':
      case 'stock_adjustments':
      case 'stock_counts':
      case 'inventory_items':
      case 'stock_balances':
      case 'pos_terminals':
      default:
        scopeWhere = { ...baseWhere, created_by_user_id: userFilter }
        break
    }
  } else {
    throw new Error(
      `UNSUPPORTED_DATA_SCOPE: Unrecognized dataScope '${ctx.dataScope}'. Default DENY enforced.`
    )
  }

  return mergeWhere(existingWhere, scopeWhere) as T
}
