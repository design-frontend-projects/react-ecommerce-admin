import { createHash } from 'node:crypto'

// =============================================================================
// CONTRACT TYPES (Per PROJECT.md § Interface Contracts)
// =============================================================================

export type DataScopeEnum = 'TENANT' | 'ASSIGNED_BRANCHES' | 'ASSIGNED_WAREHOUSES' | 'OWN_RECORDS'

export interface UserScopeContext {
  tenantId: string
  tenantUserId: string
  authUserId: string
  branchIds: string[]
  warehouseIds: string[]
  dataScope: DataScopeEnum
  isSuperAdmin: boolean
}

export interface ApprovalEvaluationInput {
  tenantId: string
  module: 'discount' | 'refund' | 'purchase_order' | 'stock_adjustment' | 'stock_transfer'
  amount: number
  requesterUserId: string
  requesterMaxAllowedPercent?: number
  requesterMaxAllowedAmount?: number
}

export interface ReviewApprovalInput {
  tenantId: string
  requestId: string
  module: string
  approverAuthUserId: string
  approverTenantUserId: string
  approverPermissions: string[]
  approverLimit?: number
  approved: boolean
  rejectionReason?: string
}

export interface AuditedDiff {
  _prevHash?: string
  _hash?: string
  _ip?: string | null
  _ua?: string | null
  _status?: 'SUCCESS' | 'DENIED' | 'FAILED'
  [key: string]: unknown
}

export interface SecurityAuditRecord {
  id: string
  actor_auth_user_id: string | null
  tenant_id: string | null
  action: string
  target_type: string
  target_id: string
  diff: AuditedDiff
  created_at: string | Date
}

export interface ProductSupplier {
  id: string
  product_id: string
  supplier_id: string
  unit_cost: number
  is_preferred?: boolean
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string
  cost_price?: number
  selling_price: number
  price_list_items?: Array<{
    id: string
    price_list_id: string
    price: number
    cost_price?: number
    margin?: number
    markup?: number
  }>
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  sku: string
  description?: string
  unit_cost?: number
  cost_price?: number
  product_suppliers?: ProductSupplier[]
  product_variants?: ProductVariant[]
}

export interface ProductImportRow {
  rowNumber: number
  name: string
  sku: string
  barcode?: string
  category_id?: string
  supplier_id?: string
  cost_price?: number
  selling_price?: number
}

export interface ImportErrorItem {
  row: number
  field: string
  value: unknown
  message: string
}

export interface MePermissionsResponse {
  success: boolean
  data: {
    userId: string
    tenantId: string | null
    tenantUserId: string | null
    roles: string[]
    isSuperAdmin: boolean
    isOwner: boolean
    permissions: string[]
    scopes: {
      tenantId: string
      branchIds: string[]
      warehouseIds: string[]
      storeIds: string[]
      ownRecordsOnly: boolean
    }
    modules: string[]
    screens: Record<string, boolean>
    buttons: Record<string, Record<string, string>>
  }
}

// =============================================================================
// AUTHORITATIVE REFERENCE IMPLEMENTATIONS OF CORE RBAC & ABAC CONTRACTS
// =============================================================================

export const SENTINEL_EMPTY_UUID = '00000000-0000-0000-0000-000000000000'
export const GENESIS_HASH = 'GENESIS_HASH_0000000000000000'

/**
 * Deterministic Tri-State Permission Precedence Resolution
 * Explicit Deny > Explicit Grant > Role Permissions Union > Wildcard (*)
 */
export function resolveEffectivePermissions(
  rolePermissionNames: string[],
  userGrants: string[],
  userDenies: string[],
  allPermissionNames: string[] = []
): string[] {
  const denySet = new Set(userDenies)
  const effective = new Set<string>()

  // 1. If roles contain wildcard '*', expand all permissions (or pass through if no list)
  const hasWildcardRole = rolePermissionNames.includes('*')
  if (hasWildcardRole) {
    if (allPermissionNames.length > 0) {
      for (const p of allPermissionNames) {
        if (!denySet.has(p)) {
          effective.add(p)
        }
      }
    } else {
      effective.add('*')
    }
  } else {
    // Standard role permissions
    for (const p of rolePermissionNames) {
      if (!denySet.has(p)) {
        effective.add(p)
      }
    }
  }

  // 2. Explicit direct user grants (cannot override explicit user denies)
  for (const p of userGrants) {
    if (!denySet.has(p)) {
      effective.add(p)
    }
  }

  // 3. Explicit user denies strictly remove matching permissions
  for (const d of userDenies) {
    effective.delete(d)
  }

  return Array.from(effective)
}

/**
 * ABAC Query-Level Filter Builder (buildScopeWhere)
 * Generates typed Prisma where condition for database-level zero-trust scoping.
 */
export function buildScopeWhere<T extends Record<string, any>>(
  entity:
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
    | 'discount_approvals',
  ctx: UserScopeContext
): T {
  // Base condition: Mandatory Tenant Isolation
  const baseWhere: Record<string, any> = {
    tenant_id: ctx.tenantId,
  }

  // SuperAdmin and TENANT scope have organization-wide visibility within the tenant
  if (ctx.isSuperAdmin || ctx.dataScope === 'TENANT') {
    return baseWhere as T
  }

  // Scope: ASSIGNED_BRANCHES
  if (ctx.dataScope === 'ASSIGNED_BRANCHES') {
    const validBranchIds = ctx.branchIds
      .map((b) => (typeof b === 'string' ? b.trim() : b))
      .filter(Boolean) as string[]
    const branchFilter =
      validBranchIds.length > 0 ? { in: validBranchIds } : { in: [SENTINEL_EMPTY_UUID] }

    switch (entity) {
      case 'purchase_orders':
      case 'purchase_requisitions':
      case 'sales_orders':
      case 'sales_invoices':
      case 'pos_terminals':
      case 'discount_approvals':
        return { ...baseWhere, branch_id: branchFilter } as T

      case 'stock_transfers':
        return {
          ...baseWhere,
          OR: [{ from_branch_id: branchFilter }, { to_branch_id: branchFilter }],
        } as T

      default:
        return baseWhere as T
    }
  }

  // Scope: ASSIGNED_WAREHOUSES
  if (ctx.dataScope === 'ASSIGNED_WAREHOUSES') {
    const validWarehouseIds = ctx.warehouseIds
      .map((w) => (typeof w === 'string' ? w.trim() : w))
      .filter(Boolean) as string[]
    const whFilter =
      validWarehouseIds.length > 0 ? { in: validWarehouseIds } : { in: [SENTINEL_EMPTY_UUID] }

    switch (entity) {
      case 'inventory_items':
      case 'stock_balances':
      case 'stock_adjustments':
      case 'stock_counts':
      case 'goods_receipts':
      case 'purchase_orders':
        return { ...baseWhere, warehouse_id: whFilter } as T

      case 'stock_transfers':
        return {
          ...baseWhere,
          OR: [{ source_warehouse_id: whFilter }, { destination_warehouse_id: whFilter }],
        } as T

      default:
        return baseWhere as T
    }
  }

  // Scope: OWN_RECORDS
  if (ctx.dataScope === 'OWN_RECORDS') {
    switch (entity) {
      case 'purchase_requisitions':
      case 'discount_approvals':
        return { ...baseWhere, requested_by_user_id: ctx.tenantUserId } as T

      case 'stock_adjustments':
      case 'stock_transfers':
      case 'purchase_orders':
      case 'sales_orders':
      case 'products':
      default:
        return { ...baseWhere, created_by_user_id: ctx.tenantUserId } as T
    }
  }

  return baseWhere as T
}

/**
 * Reusable Approval Workflow Engine with Anti-Self-Approval
 */
export class ApprovalWorkflowEngine {
  static evaluateNeed(input: ApprovalEvaluationInput): {
    requiresApproval: boolean
    approvalLevel: 'none' | 'supervisor' | 'manager' | 'top_management'
    reason?: string
  } {
    if (input.amount <= 0) {
      return { requiresApproval: false, approvalLevel: 'none' }
    }

    if (
      input.requesterMaxAllowedPercent !== undefined &&
      input.amount > input.requesterMaxAllowedPercent
    ) {
      return {
        requiresApproval: true,
        approvalLevel: input.amount > 50 ? 'manager' : 'supervisor',
        reason: `Requested value exceeds user authorized limit of ${input.requesterMaxAllowedPercent}%.`,
      }
    }

    if (
      input.requesterMaxAllowedAmount !== undefined &&
      input.amount > input.requesterMaxAllowedAmount
    ) {
      const level =
        input.amount > 25000 ? 'top_management' : input.amount > 5000 ? 'manager' : 'supervisor'
      return {
        requiresApproval: true,
        approvalLevel: level,
        reason: `Requested amount of $${input.amount} exceeds authorized threshold of $${input.requesterMaxAllowedAmount}.`,
      }
    }

    return { requiresApproval: false, approvalLevel: 'none' }
  }

  static validateReview(
    request: {
      requested_by_user_id: string
      status: string
      original_amount?: number
    },
    input: ReviewApprovalInput,
    requiredPermission: string
  ): void {
    // 1. Separation of duties check
    if (
      request.requested_by_user_id === input.approverAuthUserId ||
      request.requested_by_user_id === input.approverTenantUserId
    ) {
      throw new Error(
        'FORBIDDEN_SEPARATION_OF_DUTIES: Approver cannot be the same user who initiated the request.'
      )
    }

    // 2. Status check
    if (request.status !== 'pending') {
      throw new Error(`INVALID_STATE_TRANSITION: Request is already ${request.status}.`)
    }

    // 3. Permission check
    const hasPermission =
      input.approverPermissions.includes('*') ||
      input.approverPermissions.includes(requiredPermission)
    if (!hasPermission) {
      throw new Error(
        `FORBIDDEN_INSUFFICIENT_PERMISSIONS: Approver lacks required permission: ${requiredPermission}`
      )
    }

    // 4. Monetary authority limit check (if approver limit is specified)
    if (
      input.approverLimit !== undefined &&
      request.original_amount !== undefined &&
      request.original_amount > input.approverLimit
    ) {
      throw new Error(
        `FORBIDDEN_LIMIT_EXCEEDED: Amount $${request.original_amount} exceeds approver authority limit of $${input.approverLimit}.`
      )
    }
  }
}

/**
 * Cryptographic SHA-256 Hash Chaining for Security Audit Logs
 */
export function computeAuditRecordHash(
  prevHash: string,
  timestamp: string | Date,
  tenantId: string | null,
  actorAuthUserId: string | null,
  action: string,
  targetId: string,
  diff: unknown
): string {
  const tsStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString()
  const diffStr = JSON.stringify(diff ?? {})
  const rawPayload = `${prevHash}|${tsStr}|${tenantId ?? ''}|${actorAuthUserId ?? ''}|${action}|${targetId}|${diffStr}`
  return createHash('sha256').update(rawPayload).digest('hex')
}

/**
 * Audit Log Chain Verification
 * Verifies that no intermediate records were modified or deleted.
 */
export function verifyAuditChain(records: SecurityAuditRecord[]): {
  valid: boolean
  brokenAtRecordId?: string
  reason?: string
} {
  if (records.length === 0) return { valid: true }

  for (let i = 0; i < records.length; i++) {
    const current = records[i]
    const expectedPrevHash =
      i === 0 ? GENESIS_HASH : records[i - 1].diff._hash ?? GENESIS_HASH

    if (current.diff._prevHash && current.diff._prevHash !== expectedPrevHash) {
      return {
        valid: false,
        brokenAtRecordId: current.id,
        reason: `Hash chain broken at index ${i}: _prevHash ${current.diff._prevHash} does not match preceding hash ${expectedPrevHash}`,
      }
    }

    // Recompute hash excluding _hash itself
    const { _hash, _prevHash, ...pureDiff } = current.diff
    const recomputedHash = computeAuditRecordHash(
      expectedPrevHash,
      current.created_at,
      current.tenant_id,
      current.actor_auth_user_id,
      current.action,
      current.target_id,
      pureDiff
    )

    if (current.diff._hash && current.diff._hash !== recomputedHash) {
      return {
        valid: false,
        brokenAtRecordId: current.id,
        reason: `Tampered payload detected at record ${current.id}: stored hash ${_hash} does not match recomputed hash ${recomputedHash}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Sensitive Field Stripping Pipeline for Products Reference Module
 */
export function stripSensitiveProductFields<T extends Partial<Product>>(
  product: T,
  hasViewCost: boolean
): T {
  if (hasViewCost) return product

  const sanitized = { ...product }

  if ('unit_cost' in sanitized) {
    delete (sanitized as any).unit_cost
  }
  if ('cost_price' in sanitized) {
    delete (sanitized as any).cost_price
  }

  if (sanitized.product_suppliers) {
    sanitized.product_suppliers = sanitized.product_suppliers.map((s) => ({
      ...s,
      unit_cost: 0,
    }))
  }

  if (sanitized.product_variants) {
    sanitized.product_variants = sanitized.product_variants.map((v) => {
      const vSanitized = { ...v }
      if ('cost_price' in vSanitized) {
        delete (vSanitized as any).cost_price
      }
      if (vSanitized.price_list_items) {
        vSanitized.price_list_items = vSanitized.price_list_items.map((pli: any) => {
          const { cost_price, margin, markup, ...rest } = pli
          return rest
        })
      }
      return vSanitized
    })
  }

  return sanitized
}

/**
 * Row-Level Product Import Validator
 */
export function validateProductImportRows(
  rows: ProductImportRow[],
  tenantContext: {
    tenantId: string
    validCategoryIds: Set<string>
    validSupplierIds: Set<string>
    existingSkus: Set<string>
    hasCostPermission: boolean
  }
): {
  valid: boolean
  importedCount: number
  errors: ImportErrorItem[]
} {
  const errors: ImportErrorItem[] = []
  const seenSkusInFile = new Set<string>()

  for (const row of rows) {
    // 1. Mandatory SKU
    if (!row.sku || row.sku.trim() === '') {
      errors.push({
        row: row.rowNumber,
        field: 'sku',
        value: row.sku,
        message: 'SKU is required and cannot be empty.',
      })
      continue
    }

    // 2. Uniqueness in file
    if (seenSkusInFile.has(row.sku)) {
      errors.push({
        row: row.rowNumber,
        field: 'sku',
        value: row.sku,
        message: `Duplicate SKU '${row.sku}' found within the import file.`,
      })
    } else {
      seenSkusInFile.add(row.sku)
    }

    // 3. Uniqueness against tenant DB
    if (tenantContext.existingSkus.has(row.sku)) {
      errors.push({
        row: row.rowNumber,
        field: 'sku',
        value: row.sku,
        message: `SKU '${row.sku}' already exists in tenant database.`,
      })
    }

    // 4. Foreign key cross-tenant check (Category)
    if (row.category_id && !tenantContext.validCategoryIds.has(row.category_id)) {
      errors.push({
        row: row.rowNumber,
        field: 'category_id',
        value: row.category_id,
        message: `Category '${row.category_id}' does not exist in tenant '${tenantContext.tenantId}'.`,
      })
    }

    // 5. Foreign key cross-tenant check (Supplier)
    if (row.supplier_id && !tenantContext.validSupplierIds.has(row.supplier_id)) {
      errors.push({
        row: row.rowNumber,
        field: 'supplier_id',
        value: row.supplier_id,
        message: `Supplier '${row.supplier_id}' does not exist in tenant '${tenantContext.tenantId}'.`,
      })
    }

    // 6. Cost permission check
    if (row.cost_price !== undefined && !tenantContext.hasCostPermission) {
      errors.push({
        row: row.rowNumber,
        field: 'cost_price',
        value: row.cost_price,
        message: 'Unauthorized: User lacks permission to import or set product cost prices.',
      })
    }
  }

  return {
    valid: errors.length === 0,
    importedCount: errors.length === 0 ? rows.length : 0,
    errors,
  }
}

/**
 * Compound In-Memory Permission Cache
 */
export class CompoundPermissionCache {
  private cache = new Map<
    string,
    {
      roleNames: string[]
      permissionNames: string[]
      expiresAt: number
    }
  >()

  static buildKey(tenantId: string, authUserId: string): string {
    return `${tenantId}:${authUserId}`
  }

  set(
    tenantId: string,
    authUserId: string,
    data: { roleNames: string[]; permissionNames: string[] },
    ttlMs: number = 30000
  ): void {
    const key = CompoundPermissionCache.buildKey(tenantId, authUserId)
    this.cache.set(key, {
      ...data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  get(
    tenantId: string,
    authUserId: string
  ): { roleNames: string[]; permissionNames: string[] } | null {
    const key = CompoundPermissionCache.buildKey(tenantId, authUserId)
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return {
      roleNames: entry.roleNames,
      permissionNames: entry.permissionNames,
    }
  }

  invalidate(options?: { authUserId?: string; tenantId?: string }): void {
    if (!options?.authUserId && !options?.tenantId) {
      this.cache.clear()
      return
    }

    for (const key of Array.from(this.cache.keys())) {
      const [kTenantId, kUserId] = key.split(':')
      if (options.authUserId && options.tenantId) {
        if (kTenantId === options.tenantId && kUserId === options.authUserId) {
          this.cache.delete(key)
        }
      } else if (options.authUserId && kUserId === options.authUserId) {
        this.cache.delete(key)
      } else if (options.tenantId && kTenantId === options.tenantId) {
        this.cache.delete(key)
      }
    }
  }

  size(): number {
    return this.cache.size
  }
}
