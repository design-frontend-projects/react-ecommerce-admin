import { getOptionalTenantContext } from '@/server/context/tenant-context'
import type { PrismaClient } from '@/generated/prisma/client'

/**
 * List of database models that strictly belong to a tenant and must be scoped.
 */
export const TENANT_SCOPED_MODELS = new Set([
  'warehouses',
  'warehouse_locations',
  'inventory',
  'inventory_movements',
  'inventory_movement_serials',
  'stock_balances',
  'stock_adjustments',
  'stock_transfers',
  'categories',
  'customers',
  'customer_groups',
  'customer_cards',
  'stores',
  'price_list',
  'product_barcodes',
  'product_serials',
  'purchase_orders',
  'purchase_invoices',
  'purchase_returns',
  'goods_receipts',
  'sales_invoice_items',
  'sales_return_items',
  'addresses',
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
])

/**
 * Wraps a base PrismaClient with multi-tenant query interception.
 * - Injects `tenant_id` into all `create` / `createMany` / `upsert` inputs automatically.
 * - Applies `where: { tenant_id }` scoping on reads and mutations for all tenant-owned models.
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

          const extendedArgs = { ...args } as any

          // 1. Auto-inject tenant_id on write operations
          if (operation === 'create') {
            extendedArgs.data = {
              ...(extendedArgs.data || {}),
              tenant_id: extendedArgs.data?.tenant_id ?? activeTenantId,
            }
          } else if (operation === 'createMany' && Array.isArray(extendedArgs.data)) {
            extendedArgs.data = extendedArgs.data.map((item: any) => ({
              ...item,
              tenant_id: item.tenant_id ?? activeTenantId,
            }))
          } else if (operation === 'upsert') {
            extendedArgs.create = {
              ...(extendedArgs.create || {}),
              tenant_id: extendedArgs.create?.tenant_id ?? activeTenantId,
            }
            extendedArgs.where = {
              ...(extendedArgs.where || {}),
              tenant_id: activeTenantId,
            }
          }

          // 2. Auto-scope read & mutate operations with tenant_id filter
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
            extendedArgs.where = {
              ...(extendedArgs.where || {}),
              tenant_id: activeTenantId,
            }
          } else if (['update', 'delete', 'findUnique', 'findUniqueOrThrow'].includes(operation)) {
            // For unique lookups, combine where clause with tenant_id where possible
            if (extendedArgs.where && typeof extendedArgs.where === 'object') {
              extendedArgs.where = {
                ...extendedArgs.where,
                tenant_id: activeTenantId,
              }
            }
          }

          return query(extendedArgs)
        },
      },
    },
  })
}
