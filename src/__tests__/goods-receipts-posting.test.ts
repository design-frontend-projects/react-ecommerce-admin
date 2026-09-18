import { describe, it, expect } from 'vitest'
import { createReceiptInputSchema, receiptItemInputSchema } from '@/features/goods-receipts/data/schema'

describe('Goods Receipts - Rejection & Posting Logic', () => {
  const validVariantId = 'eed58fc4-2884-4af8-b93a-101d93a17da2'
  const validWarehouseId = '896cd75e-67da-46ba-bcfe-22c5dac19929'
  const validPoId = 'a3bb39d2-cf83-4821-b51c-1e10da911fa1'
  const validPoItemId = '189deb18-01e1-4b8e-9cb3-383af7e1a8f3'

  it('validates receipt item with 100% rejected quantity and 0 accepted quantity', () => {
    const item = {
      productVariantId: validVariantId,
      qtyReceived: 100,
      acceptedQty: 0,
      rejectedQty: 100,
      rejectionReason: 'not good / damaged goods',
      unitCost: 40,
    }

    const parsed = receiptItemInputSchema.safeParse(item)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.qtyReceived).toBe(100)
      expect(parsed.data.acceptedQty).toBe(0)
      expect(parsed.data.rejectedQty).toBe(100)
      expect(parsed.data.rejectionReason).toBe('not good / damaged goods')
    }
  })

  it('validates createReceipt input schema with all rejected items', () => {
    const payload = {
      warehouseId: validWarehouseId,
      purchaseOrderId: validPoId,
      autoPost: true,
      items: [
        {
          purchaseOrderItemId: validPoItemId,
          productVariantId: validVariantId,
          qtyReceived: 100,
          acceptedQty: 0,
          rejectedQty: 100,
          rejectionReason: 'defective batch',
          unitCost: 25,
        },
      ],
    }

    const parsed = createReceiptInputSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(1)
      expect(parsed.data.items[0].acceptedQty).toBe(0)
      expect(parsed.data.items[0].rejectedQty).toBe(100)
    }
  })

  it('correctly calculates outstanding qty considering quantity_ordered, received_quantity, and cancelled_qty', () => {
    const poItems = [
      {
        id: 'item-1',
        quantity_ordered: 500,
        received_quantity: 400,
        cancelled_qty: 0,
      },
      {
        id: 'item-2',
        quantity_ordered: 200,
        received_quantity: 100,
        cancelled_qty: 50,
      },
      {
        id: 'item-3',
        quantity_ordered: 100,
        received_quantity: 80,
        cancelled_qty: 20,
      },
    ]

    const itemsWithOutstanding = poItems.map((item) => {
      const ordered = Number(item.quantity_ordered) || 0
      const received = Number(item.received_quantity) || 0
      const cancelled = Number(item.cancelled_qty) || 0
      const outstanding = Math.max(0, ordered - received - cancelled)
      return { ...item, outstanding_qty: outstanding }
    })

    expect(itemsWithOutstanding[0].outstanding_qty).toBe(100)
    expect(itemsWithOutstanding[1].outstanding_qty).toBe(50) // 200 - 100 - 50 = 50
    expect(itemsWithOutstanding[2].outstanding_qty).toBe(0)  // 100 - 80 - 20 = 0 (fulfilled/closed)
  })

  it('verifies two-way balance between received, accepted, and rejected quantities', () => {
    // When received is 100 and accepted is 0, rejected must be 100
    const qtyReceived = 100
    const rejectedQty = 100
    const acceptedQty = Math.max(0, qtyReceived - rejectedQty)

    expect(acceptedQty).toBe(0)
    expect(acceptedQty + rejectedQty).toBe(qtyReceived)

    // When received is 100 and accepted is 80, rejected must be 20
    const userAccepted = 80
    const autoRejected = Math.max(0, qtyReceived - userAccepted)

    expect(autoRejected).toBe(20)
    expect(userAccepted + autoRejected).toBe(qtyReceived)
  })

  it('keeps PO item open when accepted quantity is less than ordered and rejected is 0 (partial receipt)', () => {
    const quantityOrdered = 100
    const qtyReceived = 60
    const acceptedQty = 60
    const rejectedQty = 0 // not filled / 0

    // Accounted in this delivery
    const accounted = Math.max(qtyReceived, acceptedQty + rejectedQty)
    const newReceivedQty = accounted
    const outstandingQty = Math.max(0, quantityOrdered - newReceivedQty)

    // User can receive the remaining 40 items soon
    expect(outstandingQty).toBe(40)
    expect(outstandingQty > 0).toBe(true)

    // PO lifecycle status should be 'partially_received'
    const openItemsCount = outstandingQty > 0 ? 1 : 0
    const lifecycleStatus = openItemsCount === 0 ? 'received' : 'partially_received'
    expect(lifecycleStatus).toBe('partially_received')
  })

  it('closes PO item when partial acceptance + rejection accounts for full ordered quantity', () => {
    // Scenario: User ordered 500 units. Delivery arrives: 400 accepted, 100 rejected.
    const quantityOrdered = 500
    const qtyReceived = 500
    const acceptedQty = 400
    const rejectedQty = 100

    // Accounted units: accepted + rejected = 500
    const accounted = Math.max(qtyReceived, acceptedQty + rejectedQty)
    expect(accounted).toBe(500)

    const receivedQuantity = accounted
    const outstandingQty = Math.max(0, quantityOrdered - receivedQuantity)

    // Outstanding is 0 — all items accounted for, PO item is closed/fulfilled
    expect(outstandingQty).toBe(0)

    // Lifecycle status should transition to 'received'
    const openItemsCount = outstandingQty > 0 ? 1 : 0
    const lifecycleStatus = openItemsCount === 0 ? 'received' : 'partially_received'
    expect(lifecycleStatus).toBe('received')
  })

  it('handles multiple goods receipts completing a PO across deliveries', () => {
    const quantityOrdered = 100
    let currentReceivedQty = 0

    // Delivery 1: 60 arrived, all 60 accepted, 0 rejected
    const delivery1Accounted = Math.max(60, 60 + 0)
    currentReceivedQty += delivery1Accounted

    let outstanding = Math.max(0, quantityOrdered - currentReceivedQty)
    expect(outstanding).toBe(40)
    expect(outstanding > 0).toBe(true) // Still pending, user receives remainder soon

    // Delivery 2: Remaining 40 arrived, 30 accepted, 10 rejected
    const delivery2Accounted = Math.max(40, 30 + 10)
    currentReceivedQty += delivery2Accounted

    outstanding = Math.max(0, quantityOrdered - currentReceivedQty)
    expect(outstanding).toBe(0) // Completely fulfilled!

    const openItemsCount = outstanding > 0 ? 1 : 0
    const lifecycleStatus = openItemsCount === 0 ? 'received' : 'partially_received'
    expect(lifecycleStatus).toBe('received')
  })
})
