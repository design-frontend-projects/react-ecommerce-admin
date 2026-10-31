import { getOptionalTenantContext } from '@/server/context/tenant-context'
import type { PrismaClient } from '@/generated/prisma/client'

/**
 * List of database models that strictly belong to a tenant and must be scoped.
 * Expanded to cover all multi-tenant tables across inventory, sales, purchasing,
 * pos, promotions, settings, and access control.
 */
export const TENANT_SCOPED_MODELS = new Set([
  // Core & Locations
  'warehouses',
  'warehouse_locations',
  'store_warehouses',
  'stores',
  'branches',
  'addresses',
  'channels',

  // Catalog & Products
  'products',
  'product_variants',
  'categories',
  'product_barcodes',
  'product_serials',
  'product_batches',
  'product_suppliers',
  'product_media',
  'attribute_definitions',
  'attribute_values',
  'product_variant_attributes',
  'bundle_components',
  'unit_conversions',
  'uoms',
  'price_list',
  'price_list_items',
  'price_list_assignments',

  // Inventory & Stock
  'inventory',
  'inventory_items',
  'inventory_movements',
  'stock_balances',
  'stock_by_location',
  'stock_adjustments',
  'stock_adjustment_items',
  'stock_transfers',
  'stock_transfer_items',
  'stock_transfer_shipments',
  'stock_transfer_shipment_items',
  'stock_transfer_receipts',
  'stock_transfer_receipt_items',
  'stock_transfer_item_batches',
  'stock_transfer_item_serials',
  'stock_counts',
  'stock_count_items',
  'stock_reservations',
  'inventory_transactions',
  'inventory_transaction_items',
  'inventory_audit_logs',
  'reorder_rules',
  'reorder_suggestions',

  // Purchasing & Suppliers
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'purchase_requisitions',
  'purchase_invoices',
  'purchase_invoice_items',
  'purchase_returns',
  'purchase_return_items',
  'goods_receipts',

  // Sales & Invoicing
  'sales_orders',
  'sales_order_items',
  'sales_invoices',
  'sales_invoice_items',
  'sales_returns',
  'sales_return_items',
  'sales_shipments',
  'sales_shipment_items',
  'sales_order_payments',
  'sales_invoice_payments',
  'customer_returns',
  'customer_return_items',
  'invoice_number_sequences',
  'payment_types',
  'tax_rates',
  'shipping_methods',
  'shipping_rates',
  'shipments',
  'refunds',
  'refund_items',

  // Customers
  'customers',
  'customer_groups',
  'customer_cards',

  // POS
  'pos_terminals',
  'pos_terminal_users',
  'pos_sessions',
  'pos_cash_movements',
  'pos_held_orders',
  'pos_user_pins',
  'pos_reorder_requests',

  // Promotions & Discounts
  'inv_promotions',
  'inv_promotion_rules',
  'inv_promotion_conditions',
  'inv_promotion_products',
  'inv_promotion_categories',
  'inv_promotion_brands',
  'inv_promotion_customer_groups',
  'inv_promotion_channels',
  'inv_promotion_stores',
  'inv_promotion_branches',
  'inv_coupons',
  'inv_coupon_redemptions',
  'inv_sales_invoice_discounts',
  'inv_sales_invoice_item_discounts',
  'inv_discount_approval_requests',
  'inv_promotion_usage_logs',
  'promotions',
  'promotion_usage',
  'promotion_menu_scopes',

  // Restaurant module
  'res_floors',
  'res_menu_items',
  'res_order_items',
  'res_reservations',
  'res_shipments',
  'res_events',
  'res_item_variants',
  'res_item_properties',
  'res_menu_categories',
  'res_void_requests',
  'res_orders',
  'res_tables',
  'res_shifts',
  'res_payment_methods',
  'res_notifications',

  // Notifications
  'notification_channels',
  'notification_channel_members',
  'notifications',
  'notification_recipients',
  'notification_templates',
  'notification_preferences',
  'notification_publish_queue',

  // Tenant Administration & Approvals
  'app_settings',
  'financial_transactions',
  'financial_transaction_details',
  'tenant_users',
  'tenant_user_branches',
  'tenant_user_warehouses',
  'tenant_activity_types',
  'approval_rules',
  'approval_requests',
  'security_audit_logs',
])

/**
 * Models that possess a composite unique constraint including tenant_id:
 * e.g. @@unique([tenant_id, id])
 */
const COMPOSITE_TENANT_ID_UNIQUE_MODELS = new Set([
  'product_variants', // @@unique([tenant_id, id])
])

/**
 * Safely constructs a tenant-scoped where clause.
 * - For `tenant_users`: strips client-supplied tenant_id, enforces activeTenantId or parent_tenant_id,
 *   and safely conjoins with any existing caller OR conditions via AND.
 * - For all other tenant models: unconditionally injects `tenant_id: activeTenantId`.
 */
function buildTenantWhere(
  modelName: string | undefined,
  activeTenantId: string,
  existingWhere?: Record<string, unknown>
): Record<string, unknown> {
  if (modelName === 'tenant_users') {
    const tenantFilter = {
      OR: [
        { tenant_id: activeTenantId },
        { parent_tenant_id: activeTenantId },
      ],
    }
    const { tenant_id: _tamperedTenantId, ...cleanWhere } = existingWhere || {}

    if (cleanWhere.OR) {
      return {
        AND: [cleanWhere, tenantFilter],
      }
    }
    return {
      ...cleanWhere,
      ...tenantFilter,
    }
  }

  return {
    ...(existingWhere || {}),
    tenant_id: activeTenantId,
  }
}

/**
 * Wraps a base PrismaClient with multi-tenant query interception.
 * - Injects `tenant_id` into all `create` / `createMany` / `upsert` inputs automatically (Zero Trust).
 * - Applies `where: { tenant_id }` scoping on reads and mutations for all tenant-owned models.
 * - Rewrites `findUnique` and `findUniqueOrThrow` to `findFirst` / `findFirstOrThrow` when composite
 *   unique keys with tenant_id are absent, preventing PrismaClient runtime validation errors.
 * - Ensures mutations (update/delete) check tenant ownership before executing.
 */
export function createTenantExtendedPrisma(basePrisma: PrismaClient) {
  return basePrisma.$extends({
    name: 'multiTenantExtension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelName = model?.toLowerCase()
          const isTenantModel = modelName ? TENANT_SCOPED_MODELS.has(modelName) : false
          const tenantContext = getOptionalTenantContext()
          const activeTenantId = tenantContext?.tenantId

          // If no active tenant context or model is not tenant-scoped, proceed normally
          if (!activeTenantId || !isTenantModel) {
            return query(args)
          }

          interface ExtendedArgs {
            data?: Record<string, unknown> | Array<Record<string, unknown>>
            where?: Record<string, unknown>
            create?: Record<string, unknown>
            [key: string]: unknown
          }

          type ModelDelegate = {
            findFirst?: (args: unknown) => Promise<unknown>
            findFirstOrThrow?: (args: unknown) => Promise<unknown>
          }

          const extendedArgs: ExtendedArgs = { ...(args as ExtendedArgs) }

          // 1. Auto-inject tenant_id on write operations (enforcing activeTenantId over client inputs)
          if (operation === 'create') {
            extendedArgs.data = {
              ...((extendedArgs.data as Record<string, unknown>) || {}),
              tenant_id: activeTenantId,
            }
            return query(extendedArgs)
          }

          if (operation === 'createMany' && Array.isArray(extendedArgs.data)) {
            extendedArgs.data = (extendedArgs.data as Array<Record<string, unknown>>).map((item) => ({
              ...item,
              tenant_id: activeTenantId,
            }))
            return query(extendedArgs)
          }

          if (operation === 'upsert') {
            extendedArgs.create = {
              ...((extendedArgs.create as Record<string, unknown>) || {}),
              tenant_id: activeTenantId,
            }
            // For upsert where clause, combine tenant_id if model supports composite unique
            if (modelName && COMPOSITE_TENANT_ID_UNIQUE_MODELS.has(modelName)) {
              extendedArgs.where = {
                ...(extendedArgs.where || {}),
                tenant_id: activeTenantId,
              }
            }
            return query(extendedArgs)
          }

          // 2. Safe findUnique / findUniqueOrThrow rewrite to findFirst / findFirstOrThrow
          if (operation === 'findUnique') {
            const hasCompositeUnique =
              modelName && COMPOSITE_TENANT_ID_UNIQUE_MODELS.has(modelName)
            if (!hasCompositeUnique) {
              const delegate = (basePrisma as unknown as Record<string, ModelDelegate>)[model]
              if (delegate && typeof delegate.findFirst === 'function') {
                return delegate.findFirst({
                  ...extendedArgs,
                  where: buildTenantWhere(modelName, activeTenantId, extendedArgs.where),
                })
              }
            } else {
              extendedArgs.where = buildTenantWhere(modelName, activeTenantId, extendedArgs.where)
              return query(extendedArgs)
            }
          }

          if (operation === 'findUniqueOrThrow') {
            const hasCompositeUnique =
              modelName && COMPOSITE_TENANT_ID_UNIQUE_MODELS.has(modelName)
            if (!hasCompositeUnique) {
              const delegate = (basePrisma as unknown as Record<string, ModelDelegate>)[model]
              if (delegate && typeof delegate.findFirstOrThrow === 'function') {
                return delegate.findFirstOrThrow({
                  ...extendedArgs,
                  where: buildTenantWhere(modelName, activeTenantId, extendedArgs.where),
                })
              }
            } else {
              extendedArgs.where = buildTenantWhere(modelName, activeTenantId, extendedArgs.where)
              return query(extendedArgs)
            }
          }

          // 3. Auto-scope multi-record read & mutate operations with tenant_id filter
          if (
            [
              'findMany',
              'findFirst',
              'findFirstOrThrow',
              'count',
              'aggregate',
              'groupBy',
              'updateMany',
              'deleteMany',
            ].includes(operation)
          ) {
            extendedArgs.where = buildTenantWhere(modelName, activeTenantId, extendedArgs.where)
            return query(extendedArgs)
          }

          // 4. Safe update / delete handling
          if (['update', 'delete'].includes(operation)) {
            // Always enforce activeTenantId scoping on mutation where clause (Zero Trust & atomic isolation)
            extendedArgs.where = buildTenantWhere(modelName, activeTenantId, extendedArgs.where)

            const hasCompositeUnique =
              modelName && COMPOSITE_TENANT_ID_UNIQUE_MODELS.has(modelName)
            if (!hasCompositeUnique) {
              // Pre-flight check: verify record belongs to activeTenantId before mutating
              const delegate = (basePrisma as unknown as Record<string, ModelDelegate>)[model]
              if (delegate && typeof delegate.findFirst === 'function') {
                const existing = await delegate.findFirst({
                  where: extendedArgs.where,
                  select: { id: true },
                })
                if (!existing) {
                  throw new Error(
                    `P2025: Record to ${operation} in model '${model}' does not exist or does not belong to the active tenant.`
                  )
                }
              }
            }

            // DO NOT strip tenant_id: retain it so Prisma executes scoped SQL mutation and tests pass
            return query(extendedArgs)
          }

          return query(extendedArgs)
        },
      },
    },
  })
}
