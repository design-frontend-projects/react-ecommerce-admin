import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  canTransition,
  assertValidTransition,
  isTerminalStatus,
  canCancelTransfer,
  canShipTransfer,
  canReceiveTransfer,
  canCloseTransfer,
  canEditDraft,
  type TransferStatus,
} from '@/server/domain/stock-transfer/transfer-state-machine'
import {
  validateTransferParties,
  validateTransferItems,
  validateStockAvailabilityForShipment,
  validateSerial,
} from '@/server/domain/stock-transfer/transfer-validation'
import { serializeTransfer } from '@/server/domain/stock-transfer/stock-transfer-service'
import { ApiError } from '@/server/utils/api-error'
import { Prisma } from '@/generated/prisma/client'

describe('Stock Transfer State Machine', () => {
  it('allows valid forward workflow transitions', () => {
    expect(canTransition('draft', 'pending_approval')).toBe(true)
    expect(canTransition('draft', 'approved')).toBe(true) // quick approval
    expect(canTransition('draft', 'cancelled')).toBe(true)

    expect(canTransition('pending_approval', 'approved')).toBe(true)
    expect(canTransition('pending_approval', 'rejected')).toBe(true)
    expect(canTransition('pending_approval', 'cancelled')).toBe(true)

    expect(canTransition('approved', 'ready_to_ship')).toBe(true)
    expect(canTransition('approved', 'shipped')).toBe(true)
    expect(canTransition('approved', 'partially_shipped')).toBe(true)

    expect(canTransition('ready_to_ship', 'shipped')).toBe(true)
    expect(canTransition('ready_to_ship', 'partially_shipped')).toBe(true)

    expect(canTransition('partially_shipped', 'partially_shipped')).toBe(true)
    expect(canTransition('partially_shipped', 'shipped')).toBe(true)
    expect(canTransition('partially_shipped', 'partially_received')).toBe(true)

    expect(canTransition('shipped', 'partially_received')).toBe(true)
    expect(canTransition('shipped', 'received')).toBe(true)

    expect(canTransition('partially_received', 'received')).toBe(true)
    expect(canTransition('partially_received', 'closed')).toBe(true)

    expect(canTransition('received', 'closed')).toBe(true)
  })

  it('rejects invalid or backward state transitions', () => {
    expect(canTransition('draft', 'shipped')).toBe(false)
    expect(canTransition('draft', 'received')).toBe(false)
    expect(canTransition('draft', 'closed')).toBe(false)

    expect(canTransition('shipped', 'draft')).toBe(false)
    expect(canTransition('shipped', 'approved')).toBe(false)

    // Terminal states cannot transition out
    expect(canTransition('closed', 'draft')).toBe(false)
    expect(canTransition('closed', 'approved')).toBe(false)
    expect(canTransition('rejected', 'approved')).toBe(false)
    expect(canTransition('cancelled', 'draft')).toBe(false)
  })

  it('assertValidTransition throws 409 ApiError on invalid transitions', () => {
    expect(() => assertValidTransition('draft', 'shipped', 'trans-123')).toThrow(ApiError)
    try {
      assertValidTransition('draft', 'shipped', 'trans-123')
    } catch (err: any) {
      expect(err.status).toBe(409)
      expect(err.message).toContain("cannot transition from 'draft' to 'shipped'")
    }
  })

  it('correctly identifies terminal statuses', () => {
    expect(isTerminalStatus('closed')).toBe(true)
    expect(isTerminalStatus('completed')).toBe(true)
    expect(isTerminalStatus('rejected')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)

    expect(isTerminalStatus('draft')).toBe(false)
    expect(isTerminalStatus('pending_approval')).toBe(false)
    expect(isTerminalStatus('approved')).toBe(false)
    expect(isTerminalStatus('shipped')).toBe(false)
    expect(isTerminalStatus('received')).toBe(false)
  })

  it('enforces cancellation rules', () => {
    expect(canCancelTransfer('draft')).toBe(true)
    expect(canCancelTransfer('pending_approval')).toBe(true)
    expect(canCancelTransfer('approved')).toBe(true)
    expect(canCancelTransfer('ready_to_ship')).toBe(true)

    // Dispatched items cannot simply be cancelled
    expect(canCancelTransfer('shipped')).toBe(false)
    expect(canCancelTransfer('partially_shipped')).toBe(false)
    expect(canCancelTransfer('received')).toBe(false)
    expect(canCancelTransfer('closed')).toBe(false)
  })

  it('enforces shipping and receiving operational capabilities', () => {
    expect(canShipTransfer('approved')).toBe(true)
    expect(canShipTransfer('ready_to_ship')).toBe(true)
    expect(canShipTransfer('partially_shipped')).toBe(true)
    expect(canShipTransfer('draft')).toBe(false)
    expect(canShipTransfer('shipped')).toBe(false)

    expect(canReceiveTransfer('shipped')).toBe(true)
    expect(canReceiveTransfer('partially_shipped')).toBe(true)
    expect(canReceiveTransfer('partially_received')).toBe(true)
    expect(canReceiveTransfer('in_transit')).toBe(true)
    expect(canReceiveTransfer('approved')).toBe(false)
    expect(canReceiveTransfer('draft')).toBe(false)

    expect(canCloseTransfer('received')).toBe(true)
    expect(canCloseTransfer('partially_received')).toBe(true)
    expect(canCloseTransfer('draft')).toBe(false)

    expect(canEditDraft('draft')).toBe(true)
    expect(canEditDraft('approved')).toBe(false)
    expect(canEditDraft('shipped')).toBe(false)
  })
})

describe('Stock Transfer Validation Service', () => {
  it('throws error when source and destination are identical', async () => {
    const mockTx: any = {}
    await expect(
      validateTransferParties(mockTx, {
        tenantId: 'tenant-1',
        sourceWarehouseId: 'wh-1',
        destinationWarehouseId: 'wh-1',
      })
    ).rejects.toThrow('Source and destination cannot be the same.')
  })

  it('throws error when neither source nor destination is specified', async () => {
    const mockTx: any = {}
    await expect(
      validateTransferParties(mockTx, {
        tenantId: 'tenant-1',
      })
    ).rejects.toThrow('Both source and destination must be specified.')
  })

  it('throws error when warehouse is inactive', async () => {
    const mockTx: any = {
      warehouses: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'wh-1',
          name: 'Old Warehouse',
          is_active: false,
        }),
      },
    }

    await expect(
      validateTransferParties(mockTx, {
        tenantId: 'tenant-1',
        sourceWarehouseId: 'wh-1',
        destinationWarehouseId: 'wh-2',
      })
    ).rejects.toThrow("Source warehouse 'Old Warehouse' is inactive.")
  })

  it('rejects empty items list or non-positive quantity', async () => {
    const mockTx: any = {}
    await expect(validateTransferItems(mockTx, 'tenant-1', [])).rejects.toThrow(
      'A stock transfer must contain at least one item.'
    )

    await expect(
      validateTransferItems(mockTx, 'tenant-1', [
        { productVariantId: 'var-1', qty: 0 },
      ])
    ).rejects.toThrow('Item quantity must be strictly greater than zero.')
  })

  it('rejects transfer containing inactive product variants', async () => {
    const mockTx: any = {
      product_variants: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'var-1', sku: 'SKU-001', name: 'Item 1', is_active: false },
        ]),
      },
    }

    await expect(
      validateTransferItems(mockTx, 'tenant-1', [
        { productVariantId: 'var-1', qty: 5 },
      ])
    ).rejects.toThrow('Cannot transfer inactive product variant(s): SKU-001.')
  })

  it('detects insufficient stock during shipment validation', async () => {
    const mockTx: any = {
      inventory_items: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'inv-item-1',
          sku: 'COF-ETH-01',
        }),
      },
      stock_balances: {
        findMany: vi.fn().mockResolvedValue([
          {
            qty_on_hand: new Prisma.Decimal(10),
            qty_reserved: new Prisma.Decimal(8), // available is 2
          },
        ]),
      },
    }

    // Attempting to ship 5 when available is only 2
    await expect(
      validateStockAvailabilityForShipment(mockTx, 'tenant-1', 'wh-src-1', [
        { productVariantId: 'var-1', quantity: 5 },
      ])
    ).rejects.toThrow("Insufficient stock for SKU 'COF-ETH-01' in source warehouse. Available: 2, Requested to ship: 5.")
  })
})

describe('Stock Transfer Serialization', () => {
  it('safely converts BigInt and Decimals to serializable numbers and strings', () => {
    const rawTransfer = {
      id: 'trans-1',
      transfer_no: BigInt(10052),
      status: 'shipped' as TransferStatus,
      total_weight: new Prisma.Decimal(25.5),
      total_price_valuation: new Prisma.Decimal(120.75),
      total_cost_valuation: new Prisma.Decimal(85.0),
      stock_transfer_items: [
        {
          id: 'item-1',
          qty: new Prisma.Decimal(10),
          shipped_qty: new Prisma.Decimal(10),
          received_qty: new Prisma.Decimal(0),
          rejected_qty: new Prisma.Decimal(0),
          unit_cost: new Prisma.Decimal(8.5),
          stock_transfer_item_batches: [
            {
              id: 'batch-line-1',
              quantity: new Prisma.Decimal(10),
              unit_cost: new Prisma.Decimal(8.5),
            },
          ],
        },
      ],
      stock_transfer_shipments: [
        {
          id: 'ship-1',
          shipment_number: 'SHP-20260929-1234',
          stock_transfer_shipment_items: [
            {
              id: 'si-1',
              shipped_qty: new Prisma.Decimal(10),
              unit_cost: new Prisma.Decimal(8.5),
            },
          ],
        },
      ],
      stock_transfer_receipts: [],
      inventory_movements: [
        {
          id: 'mov-1',
          movement_no: BigInt(98765),
          quantity_delta: new Prisma.Decimal(-10),
          unit_cost: new Prisma.Decimal(8.5),
          total_cost: new Prisma.Decimal(-85),
          qty_before: new Prisma.Decimal(50),
          qty_after: new Prisma.Decimal(40),
        },
      ],
    }

    const serialized = serializeTransfer(rawTransfer)

    expect(serialized.transfer_no).toBe('10052')
    expect(serialized.total_weight).toBe(25.5)
    expect(serialized.total_price_valuation).toBe(120.75)
    expect(serialized.total_cost_valuation).toBe(85.0)

    expect(serialized.stock_transfer_items[0].qty).toBe(10)
    expect(serialized.stock_transfer_items[0].shipped_qty).toBe(10)
    expect(serialized.stock_transfer_items[0].stock_transfer_item_batches[0].quantity).toBe(10)

    expect(serialized.stock_transfer_shipments[0].stock_transfer_shipment_items[0].shipped_qty).toBe(10)

    expect(serialized.inventory_movements[0].movement_no).toBe('98765')
    expect(serialized.inventory_movements[0].quantity_delta).toBe(-10)
    expect(serialized.inventory_movements[0].qty_before).toBe(50)
    expect(serialized.inventory_movements[0].qty_after).toBe(40)
  })
})

describe('validateSerial for Stock Transfer', () => {
  it('throws 404 ApiError if serial does not exist', async () => {
    const mockTx: any = {
      product_serials: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    }

    await expect(
      validateSerial(mockTx, 'tenant-1', 'var-1', 'serial-123')
    ).rejects.toThrow("Product serial 'serial-123' not found for variant 'var-1'.")
  })

  it('throws 400 ApiError if serial is not in_stock', async () => {
    const mockTx: any = {
      product_serials: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'serial-123',
          serial_number: 'SN-999',
          status: 'damaged',
          warehouse_location_id: 'loc-1',
        }),
      },
    }

    await expect(
      validateSerial(mockTx, 'tenant-1', 'var-1', 'serial-123')
    ).rejects.toThrow("Product serial 'SN-999' is 'damaged' and cannot be transferred.")
  })

  it('allows serial when status is in_stock', async () => {
    const mockTx: any = {
      product_serials: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'serial-123',
          serial_number: 'SN-999',
          status: 'in_stock',
          warehouse_location_id: 'loc-1',
        }),
      },
    }

    await expect(
      validateSerial(mockTx, 'tenant-1', 'var-1', 'serial-123')
    ).resolves.toBeUndefined()
  })
})

