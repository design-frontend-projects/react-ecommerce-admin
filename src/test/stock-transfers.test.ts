import { describe, it, expect } from 'vitest'
import { createTransferInputSchema } from '../features/stock-transfers/data/schema'
import { serializeTransfer } from '../server/fns/stock-transfers'

describe('Stock Transfers Validation & Serialization Suite', () => {
  const dummyVariantId = '1796a5fa-29f1-4cd5-96bf-16f7995aab05'
  const sourceWhId = '4bb8357f-f772-4660-84c1-eb83cb7d29bc'
  const destWhId = '5cc8357f-f772-4660-84c1-eb83cb7d29bd'
  const sourceStoreId = '6f42ec73-67c4-42f5-b732-c6c7e3f2d251'
  const destStoreId = '7f42ec73-67c4-42f5-b732-c6c7e3f2d252'
  const sourceBranchId = '8f42ec73-67c4-42f5-b732-c6c7e3f2d253'
  const destBranchId = '9f42ec73-67c4-42f5-b732-c6c7e3f2d254'

  describe('createTransferInputSchema Validation', () => {
    it('validates a correct warehouse transfer with empty optional fields (default HTML inputs)', () => {
      const input = {
        transferType: 'warehouse',
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: destWhId,
        fromStoreId: null,
        toStoreId: null,
        fromBranchId: null,
        toBranchId: null,
        referenceNo: '',
        notes: '',
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 5,
            unitCost: 10.5,
            condition: 'good' as const,
            sourceLocationId: null,
            destinationLocationId: null,
            batchId: '', // Empty string from input
            serialId: '', // Empty string from input
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referenceNo).toBeNull()
        expect(result.data.notes).toBeNull()
        expect(result.data.items[0].batchId).toBeNull()
        expect(result.data.items[0].serialId).toBeNull()
        expect(result.data.items[0].qty).toBe(5)
      }
    })

    it('rejects submission when productVariantId is empty', () => {
      const input = {
        transferType: 'warehouse',
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: destWhId,
        items: [
          {
            productVariantId: '',
            qty: 1,
            unitCost: 0,
            condition: 'good',
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const variantIssue = result.error.issues.find(
          (issue) => issue.path.join('.') === 'items.0.productVariantId'
        )
        expect(variantIssue).toBeDefined()
        expect(variantIssue?.message).toContain('variant')
      }
    })

    it('rejects identical source and destination warehouses', () => {
      const input = {
        transferType: 'warehouse',
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: sourceWhId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 1,
            unitCost: 0,
            condition: 'good',
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path.join('.') === 'destinationWarehouseId'
        )
        expect(issue).toBeDefined()
        expect(issue?.message).toBe('Destination warehouse must differ from source warehouse.')
      }
    })

    it('validates store-to-store transfer routing', () => {
      const input = {
        transferType: 'store',
        fromStoreId: sourceStoreId,
        toStoreId: destStoreId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 2,
            unitCost: 15,
            condition: 'good' as const,
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects identical store-to-store routing', () => {
      const input = {
        transferType: 'store',
        fromStoreId: sourceStoreId,
        toStoreId: sourceStoreId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 2,
            unitCost: 15,
            condition: 'good',
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'toStoreId')
        expect(issue).toBeDefined()
        expect(issue?.message).toBe('Destination store must differ from source store.')
      }
    })

    it('validates branch-to-branch transfer routing', () => {
      const input = {
        transferType: 'branch',
        fromBranchId: sourceBranchId,
        toBranchId: destBranchId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 3,
            unitCost: 20,
            condition: 'good' as const,
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects identical branch-to-branch routing', () => {
      const input = {
        transferType: 'branch',
        fromBranchId: sourceBranchId,
        toBranchId: sourceBranchId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 3,
            unitCost: 20,
            condition: 'good',
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'toBranchId')
        expect(issue).toBeDefined()
        expect(issue?.message).toBe('Destination branch must differ from source branch.')
      }
    })

    it('rejects invalid quantity <= 0', () => {
      const input = {
        transferType: 'warehouse',
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: destWhId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 0,
            unitCost: 10,
            condition: 'good',
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'items.0.qty')
        expect(issue).toBeDefined()
      }
    })

    it('accepts valid UUIDs in batchId and serialId', () => {
      const validBatchId = '3aa8357f-f772-4660-84c1-eb83cb7d29ba'
      const validSerialId = '4bb8357f-f772-4660-84c1-eb83cb7d29bb'
      const input = {
        transferType: 'warehouse',
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: destWhId,
        items: [
          {
            productVariantId: dummyVariantId,
            qty: 1,
            unitCost: 5,
            condition: 'good' as const,
            batchId: validBatchId,
            serialId: validSerialId,
          },
        ],
      }

      const result = createTransferInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items[0].batchId).toBe(validBatchId)
        expect(result.data.items[0].serialId).toBe(validSerialId)
      }
    })
  })

  describe('serializeTransfer Utility', () => {
    it('safely serializes BigInt transfer_no and Decimal values into standard JSON types', () => {
      const rawRecord = {
        id: 'mock-transfer-uuid',
        transfer_no: BigInt(10025),
        status: 'draft',
        stock_transfer_items: [
          {
            id: 'mock-item-1',
            qty: { toNumber: () => 15.5 },
            unit_cost: { toNumber: () => 42.99 },
          },
          {
            id: 'mock-item-2',
            qty: 10,
            unit_cost: null,
          },
        ],
      }

      const serialized = serializeTransfer(rawRecord)
      expect(typeof serialized.transfer_no).toBe('string')
      expect(serialized.transfer_no).toBe('10025')
      expect(serialized.stock_transfer_items[0].qty).toBe(15.5)
      expect(serialized.stock_transfer_items[0].unit_cost).toBe(42.99)
      expect(serialized.stock_transfer_items[1].qty).toBe(10)
      expect(serialized.stock_transfer_items[1].unit_cost).toBeNull()
    })

    it('handles null transfer_no without errors', () => {
      const rawRecord = {
        id: 'mock-transfer-uuid',
        transfer_no: null,
        stock_transfer_items: [],
      }

      const serialized = serializeTransfer(rawRecord)
      expect(serialized.transfer_no).toBeNull()
    })
  })
})
