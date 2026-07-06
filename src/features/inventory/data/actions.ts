import prisma from '@/lib/prisma'
import { generateAutoPurchaseOrder } from '@/features/purchase-orders/data/actions'
import { getSettingByKey } from '@/features/settings/data/actions'

export async function checkAndTriggerReorder(inventoryId: number) {
  const inventoryItem = await prisma.inventory.findUnique({
    where: { inventory_id: inventoryId },
    include: {
      products: {
        include: {
          suppliers: true,
        },
      },
    },
  })

  if (!inventoryItem || !inventoryItem.products) return

  // Check if stock is low
  const reorderLevel = inventoryItem.reorder_level || 0
  const isLowStock = inventoryItem.quantity <= reorderLevel
  if (!isLowStock) return

  // Check if supplier is preferred
  const supplier = inventoryItem.products.suppliers
  if (!supplier || !supplier.is_preferred) return

  // Check if tenant has auto_reorder enabled
  const authUserId = inventoryItem.auth_user_id
  if (!authUserId) return

  // Fetch business settings
  const businessSetting = await getSettingByKey(authUserId, 'business')
  let isAutoReorderEnabled = false

  if (businessSetting && businessSetting.value) {
    const value =
      typeof businessSetting.value === 'string'
        ? JSON.parse(businessSetting.value)
        : businessSetting.value

    isAutoReorderEnabled = value.auto_reorder === true
  }

  // If not enabled via settings, fallback to checking rbac_tenants via tenant user email matching
  // (In a real app, you'd accurately link auth_user_id to rbac_tenants)
  if (!isAutoReorderEnabled) {
    // Find tenant_id via rbac_tenant_users? Let's just rely on Business settings for MVP as implemented in T014.
  }

  if (isAutoReorderEnabled) {
    // Determine quantity to order (e.g. max_stock_level - quantity)
    const maxStock = inventoryItem.max_stock_level || reorderLevel * 2 || 10
    const quantityToOrder = Math.max(1, maxStock - inventoryItem.quantity)

    await generateAutoPurchaseOrder(
      authUserId,
      supplier.supplier_id,
      inventoryItem.product_id,
      quantityToOrder
    )
  }
}
