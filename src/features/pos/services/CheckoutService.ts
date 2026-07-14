import { supabaseAdmin } from '@/server/supabase'
import { requireTenantId } from '@/server/utils/tenant'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils/invoice-generator'
import type { CheckoutRequestType } from '../schemas/checkout'
import type { CheckoutResponse } from '../types'

interface VariantInfo {
  id: string
  product_id: number
  product_type: string
  bundle_components: Array<{ component_variant_id: string; qty: number }>
}

/**
 * Loads product typing for the basket variants so bundles explode into their
 * component movements and service products post no movement at all.
 */
async function loadVariantInfo(
  variantIds: string[]
): Promise<Map<string, VariantInfo>> {
  const variants = (await prisma.product_variants.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      product_id: true,
      products: {
        select: {
          product_type: true,
          bundle_components: {
            select: { component_variant_id: true, qty: true },
          },
        },
      },
    },
  })) as Array<{
    id: string
    product_id: number
    products: {
      product_type: string
      bundle_components: Array<{ component_variant_id: string; qty: unknown }>
    } | null
  }>

  const map = new Map<string, VariantInfo>()
  for (const variant of variants) {
    map.set(variant.id, {
      id: variant.id,
      product_id: variant.product_id,
      product_type: variant.products?.product_type ?? 'simple',
      bundle_components: (variant.products?.bundle_components ?? []).map(
        (component) => ({
          component_variant_id: component.component_variant_id,
          qty: Number(component.qty),
        })
      ),
    })
  }
  return map
}

/**
 * POS checkout. Writes the business documents (sales invoice + items,
 * res_orders bridge row, transaction header + details) in one Prisma
 * transaction, then posts the stock effect through the SQL movement engine
 * (`apply_inventory_movements`) with per-line idempotency keys. If the engine
 * rejects the movements (e.g. insufficient stock), the invoice and transaction
 * are compensated to `cancelled`/`failed` and the checkout fails.
 */
export async function processCheckout(
  data: CheckoutRequestType,
  authUserId: string
): Promise<CheckoutResponse> {
  try {
    const tenantId = await requireTenantId(authUserId)

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
      notes,
    } = data

    const invoiceNo = generateInvoiceNumber()
    const variantInfo = await loadVariantInfo(
      items.map((item) => item.productVariantId)
    )

    const result = await prisma.$transaction(async (tx: any) => {
      const orderId = uuidv4()

      const invoice = await tx.sales_invoices.create({
        data: {
          auth_user_id: tenantId,
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
              line_total:
                item.quantity * item.unitPrice -
                (item.discountAmount || 0) +
                (item.taxAmount || 0),
              discount_amount: item.discountAmount || 0,
              tax_amount: item.taxAmount || 0,
            })),
          },
        },
        include: { sales_invoice_items: true },
      })

      const resOrder = await tx.res_orders.create({
        data: {
          id: orderId,
          order_number: invoiceNo,
          total_amount: totalAmount,
          subtotal: subtotal,
          tax_amount: taxTotal,
          discount_amount: discountTotal,
          status: 'completed',
          payment_method: paymentMethod,
          paid_at: new Date(),
          notes,
          auth_user_id: tenantId,
        },
      })

      if (data.isShipment && data.shipment) {
        await tx.res_shipments.create({
          data: {
            order_id: resOrder.id,
            auth_user_id: tenantId,
            recipient_name: data.shipment.recipientName,
            recipient_phone: data.shipment.recipientPhone,
            delivery_address: data.shipment.deliveryAddress,
            city: data.shipment.city,
            state: data.shipment.state,
            postal_code: data.shipment.postalCode,
            notes: data.shipment.notes,
            status: 'pending',
          },
        })
      }

      const transactionRec = await tx.transactions.create({
        data: {
          id: uuidv4(),
          tenant_id: tenantId,
          auth_user_id: tenantId,
          transaction_number: `TRN-${invoiceNo}`,
          transaction_type: 'sale',
          status: 'completed',
          subtotal: subtotal,
          total_amount: totalAmount,
          tax_amount: taxTotal,
          discount_amount: discountTotal,
          notes: `Payment for invoice ${invoiceNo} via ${paymentMethod}`,
          sales_invoice_id: invoice.id,
          transaction_details: {
            create: items.map((item, index) => ({
              tenant_id: tenantId,
              product_id:
                variantInfo.get(item.productVariantId)?.product_id ?? 0,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              discount_amount: item.discountAmount || 0,
              tax_amount: item.taxAmount || 0,
              subtotal: item.quantity * item.unitPrice,
              sales_invoice_item_id: invoice.sales_invoice_items[index]?.id,
              auth_user_id: tenantId,
            })),
          },
        },
      })

      return { invoice, transactionRec }
    })

    // Stock effect via the movement engine — sales never touch balances
    // directly. Bundles explode into component movements; services post none.
    if (storeId) {
      const movements: Array<Record<string, unknown>> = []
      for (const item of items) {
        const info = variantInfo.get(item.productVariantId)
        const productType = info?.product_type ?? 'simple'
        if (productType === 'service') continue

        const baseMovement = {
          tenant_id: tenantId,
          branch_id: branchId,
          store_id: storeId,
          movement_type: 'sale',
          reference_type: 'sales_invoice',
          reference_id: result.invoice.id,
          source_document_type: 'sales_invoice',
          source_document_id: result.invoice.id,
          remarks: `POS sale ${invoiceNo}`,
          created_by: authUserId,
        }

        if (
          productType === 'bundle' &&
          info &&
          info.bundle_components.length > 0
        ) {
          for (const component of info.bundle_components) {
            movements.push({
              ...baseMovement,
              product_variant_id: component.component_variant_id,
              qty: item.quantity * component.qty,
              idempotency_key: `pos:${result.invoice.id}:${item.productVariantId}:${component.component_variant_id}`,
            })
          }
        } else {
          movements.push({
            ...baseMovement,
            product_variant_id: item.productVariantId,
            qty: item.quantity,
            idempotency_key: `pos:${result.invoice.id}:${item.productVariantId}`,
          })
        }
      }

      if (movements.length > 0) {
        const { error: movementError } = await supabaseAdmin.rpc(
          'apply_inventory_movements',
          { p_movements: movements }
        )
        if (movementError) {
          // Compensate the documents so no "paid" invoice exists without stock
          await prisma.sales_invoices.update({
            where: { id: result.invoice.id },
            data: { status: 'cancelled' },
          })
          await prisma.transactions.update({
            where: { id: result.transactionRec.id },
            data: { status: 'failed' },
          })
          return {
            success: false,
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: movementError.message,
            },
          }
        }
      }
    }

    return {
      success: true,
      invoiceNo: result.invoice.invoice_no,
      invoiceId: result.invoice.id,
      transactionId: result.transactionRec.id,
      timestamp: new Date().toISOString(),
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        code: 'CHECKOUT_FAILED',
        message:
          error instanceof Error ? error.message : 'Checkout completely failed',
      },
    }
  }
}
