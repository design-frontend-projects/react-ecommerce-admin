import prisma from '@/lib/prisma'

export async function generateAutoPurchaseOrder(
  authUserId: string,
  supplierId: number,
  productId: number,
  quantityToOrder: number
) {
  // Create a purchase order request
  const order = await prisma.purchase_orders.create({
    data: {
      auth_user_id: authUserId,
      supplier_id: supplierId,
      status: 'pending',
      notes: 'System Auto-Reorder',
      purchase_order_items: {
        create: [
          {
            product_id: productId,
            quantity: quantityToOrder,
            unit_cost: 0, // Will be updated later or derived
            received_quantity: 0,
          },
        ],
      },
    },
    include: {
      purchase_order_items: true,
    },
  })

  return order
}
