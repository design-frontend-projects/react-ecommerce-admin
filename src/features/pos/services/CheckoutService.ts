import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils/invoice-generator'
import type { CheckoutRequestType } from '../schemas/checkout'
import type { CheckoutResponse } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs/server'

export async function processCheckout(data: CheckoutRequestType): Promise<CheckoutResponse> {
  try {
    const session = await auth()
    const clerk_user_id = session?.userId
    
    // In strict environments, we might require auth. For demo, we fallback if missing or return error.
    if (!clerk_user_id) {
       // fallback for server environments running anonymously or return error
       // throw new Error('Unauthorized')
    }

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

    // Run within a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const orderId = invoiceNo.replace('INV', 'ORD')
      
      // 1. Create Sales Invoice
      const invoice = await tx.sales_invoices.create({
        data: {
          clerk_user_id: clerk_user_id || 'system',
          branch_id: branchId,
          store_id: storeId,
          customer_id: customerId,
          invoice_no: invoiceNo,
          order_id: orderId,
          invoice_date: new Date(),
          status: 'paid', // directly completed/paid
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

      // 1.5 Create initial shipment
      const shipment = await tx.shipments.create({
        data: {
          order_id: 0, // Placeholder, will fix schema if needed or use reference
          status: 'prepared',
          notes: `Shipment for Order ${orderId}`,
          carrier: 'Standard Delivery',
          tracking_number: `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        }
      })

      // Link shipment back to invoice
      await tx.sales_invoices.update({
        where: { id: invoice.id },
        data: { shipment_id: shipment.shipment_id }
      })

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
