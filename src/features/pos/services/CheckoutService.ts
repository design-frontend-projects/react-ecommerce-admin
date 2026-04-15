import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils/invoice-generator'
import type { CheckoutRequestType } from '../schemas/checkout'
import type { CheckoutResponse } from '../types'
import { v4 as uuidv4 } from 'uuid'
// TODO: Implement session verification using @clerk/backend or TanStack Start helpers
// For now, we will use a fallback or expect clerk_user_id in the request if needed.

export async function processCheckout(data: CheckoutRequestType): Promise<CheckoutResponse> {
  try {
    const clerk_user_id = 'system' // Placeholder until proper auth is integrated

    const {
      branchId,
      storeId,
      customerId,
      paymentMethod,
      items,
      subtotal,
      totalAmount,
      discountTotal,
      taxTotal,
      notes
    } = data

    const invoiceNo = generateInvoiceNumber()

    // 1. Create Sales Invoice (which we'll treat as the Order for restaurant module)
    const result = await prisma.$transaction(async (tx) => {
      const orderId = uuidv4() // Use UUID for res_orders compatible reference
      
      const invoice = await tx.sales_invoices.create({
        data: {
          clerk_user_id: clerk_user_id || 'system',
          branch_id: branchId,
          store_id: storeId,
          customer_id: customerId,
          invoice_no: invoiceNo,
          invoice_date: new Date(),
          status: 'paid',
          subtotal: subtotal,
          total_amount: totalAmount,
          discount_amount: discountTotal,
          tax_amount: taxTotal,
          paid_amount: totalAmount,
          notes,
          sales_invoice_items: {
            create: items.map((item, index) => ({
              product_variant_id: item.productVariantId,
              line_no: index + 1,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_subtotal: item.quantity * item.unitPrice,
              line_total: (item.quantity * item.unitPrice) - (item.discountAmount || 0) + (item.taxAmount || 0),
              discount_amount: item.discountAmount || 0,
              tax_amount: item.taxAmount || 0,
            }))
          }
        }
      })

      // Create res_order entry to satisfy foreign key if res_orders is used as primary order store
      const resOrder = await tx.res_orders.create({
        data: {
          id: orderId,
          order_number: invoiceNo, // Linking by invoice number
          total_amount: totalAmount,
          subtotal: subtotal,
          tax_amount: taxTotal,
          discount_amount: discountTotal,
          status: 'completed',
          payment_method: paymentMethod,
          paid_at: new Date(),
          notes
        }
      })

      // 1.5 Create res_shipment if requested
      if (data.isShipment && data.shipment) {
        await tx.res_shipments.create({
          data: {
            order_id: resOrder.id,
            clerk_user_id: clerk_user_id || 'system',
            recipient_name: data.shipment.recipientName,
            recipient_phone: data.shipment.recipientPhone,
            delivery_address: data.shipment.deliveryAddress,
            city: data.shipment.city,
            state: data.shipment.state,
            postal_code: data.shipment.postalCode,
            notes: data.shipment.notes,
            status: 'pending'
          }
        })
      }

      // 2. Create Transaction for payment record
      // We will create the transaction
      const transactionId = uuidv4()
      const transactionRec = await tx.transactions.create({
        data: {
          id: transactionId,
          tenant_id: clerk_user_id || 'system',
          clerk_user_id: clerk_user_id || 'system',
          transaction_number: `TRN-${invoiceNo}`,
          transaction_type: 'sale',
          status: 'completed',
          subtotal: subtotal,
          total_amount: totalAmount,
          tax_amount: taxTotal,
          discount_amount: discountTotal,
          notes: `Payment for invoice ${invoiceNo} via ${paymentMethod}`
        }
      })

      // 3. Record Inventory Movements
      const movementPromises = items.map(item => 
        tx.inventory_movements.create({
          data: {
            clerk_user_id: clerk_user_id || 'system',
            branch_id: branchId,
            store_id: storeId,
            product_variant_id: item.productVariantId,
            movement_type: 'sale',
            reference_type: 'sales_invoice',
            reference_id: invoice.id,
            qty_out: item.quantity,
            movement_date: new Date(),
          }
        })
      )
      
      await Promise.all(movementPromises)

      // 4. Update Stock Balances if necessary
      // Here usually you would update stock_balances, deducting qty_available and qty_on_hand
      for (const item of items) {
        if (!storeId) continue;
        
        // Find existing stock balance for this variant in this store
        const existingStock = await tx.stock_balances.findUnique({
          where: {
            store_id_product_variant_id: {
              store_id: storeId,
              product_variant_id: item.productVariantId
            }
          }
        })
        
        if (existingStock) {
          await tx.stock_balances.update({
            where: { id: existingStock.id },
            data: {
              qty_on_hand: {
                decrement: item.quantity
              },
              last_movement_at: new Date()
            }
          })
        }
      }

      return { invoice, transactionRec }
    })

    return {
      success: true,
      invoiceNo: result.invoice.invoice_no,
      invoiceId: result.invoice.id,
      transactionId: result.transactionRec.id,
      timestamp: new Date().toISOString()
    }

  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('POS Checkout service error:', error)
    return {
      success: false,
      error: {
        code: 'CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Checkout completely failed'
      }
    }
  }
}
