import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listSuggestions,
  runCheck,
  convertSuggestions,
  dismissSuggestion,
} from '@/server/fns/reorder-suggestions'
import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'

vi.mock('@/lib/prisma', () => ({
  default: {
    reorder_rules: {
      findMany: vi.fn(),
    },
    reorder_suggestions: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
    },
    stock_balances: {
      groupBy: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000001'),
  resolveTenantUserId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000002'),
}))

describe('reorder-suggestions server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSuggestions', () => {
    it('returns suggestions for the tenant with related variants and stores', async () => {
      const mockData = [
        {
          id: 'sug-1',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          suggested_qty: 25,
          status: 'open',
          product_variants: { id: 'var-1', sku: 'SKU-01', products: { name: 'Espresso Beans' } },
        },
      ]
      vi.mocked(prisma.reorder_suggestions.findMany).mockResolvedValue(mockData as any)

      const result = await listSuggestions('auth-user-id')
      expect(result).toEqual(mockData)
      expect(prisma.reorder_suggestions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: '00000000-0000-0000-0000-000000000001' },
        })
      )
    })
  })

  describe('runCheck', () => {
    it('triggers suggestion upsert when available + on_order <= reorder_point + safety_stock', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          product_variant_id: 'var-1',
          store_id: 'store-1',
          warehouse_id: null,
          reorder_point: 20,
          safety_stock: 5,
          reorder_qty: 50,
          preferred_supplier_id: 'sup-1',
          is_active: true,
        },
      ]
      vi.mocked(prisma.reorder_rules.findMany).mockResolvedValue(mockRules as any)

      // Query raw unsafe returns available: 10, on_order: 5 => total 15 <= 25 (threshold)
      vi.mocked(prisma.$queryRawUnsafe)
        .mockResolvedValueOnce([{ available: 10 }])
        .mockResolvedValueOnce([{ on_order: 5 }])
        .mockResolvedValueOnce([]) // upsert query

      const result = await runCheck('auth-user-id')
      expect(result).toEqual({ suggestions_open: 1 })
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(3)
    })

    it('expires stale suggestions when demand is already satisfied', async () => {
      const mockRules = [
        {
          id: 'rule-2',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          product_variant_id: 'var-2',
          store_id: 'store-1',
          warehouse_id: null,
          reorder_point: 10,
          safety_stock: 5,
          reorder_qty: 30,
          is_active: true,
        },
      ]
      vi.mocked(prisma.reorder_rules.findMany).mockResolvedValue(mockRules as any)

      // Query raw unsafe returns available: 50, on_order: 0 => total 50 > 15 (satisfied)
      vi.mocked(prisma.$queryRawUnsafe)
        .mockResolvedValueOnce([{ available: 50 }])
        .mockResolvedValueOnce([{ on_order: 0 }])

      vi.mocked(prisma.reorder_suggestions.updateMany).mockResolvedValue({ count: 1 })

      const result = await runCheck('auth-user-id')
      expect(result).toEqual({ suggestions_open: 0 })
      expect(prisma.reorder_suggestions.updateMany).toHaveBeenCalledWith({
        where: {
          reorder_rule_id: 'rule-2',
          status: 'open',
        },
        data: expect.objectContaining({
          status: 'expired',
        }),
      })
    })
  })

  describe('convertSuggestions', () => {
    it('throws 400 when no ids are selected', async () => {
      await expect(convertSuggestions('auth-user-id', [])).rejects.toThrow(ApiError)
    })

    it('successfully creates requisition and marks suggestions as converted', async () => {
      const mockOpenSuggestions = [
        {
          id: 'sug-1',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          product_variant_id: 'var-1',
          store_id: 'store-1',
          suggested_qty: 30,
          preferred_supplier_id: 'sup-1',
          status: 'open',
          product_variants: { id: 'var-1' },
        },
      ]

      vi.mocked(prisma.reorder_suggestions.findMany).mockResolvedValue(mockOpenSuggestions as any)
      vi.mocked(prisma.stores.findUnique).mockResolvedValue({
        store_id: 'store-1',
        branch_id: 'branch-1',
      } as any)
      vi.mocked(prisma.stock_balances.groupBy).mockResolvedValue([
        { product_variant_id: 'var-1', _avg: { avg_cost: 15.5 } },
      ] as any)

      const mockTx = {
        purchase_requisitions: {
          create: vi.fn().mockResolvedValue({ id: 'req-new-uuid' }),
        },
        purchase_requisition_items: {
          create: vi.fn().mockResolvedValue({ id: 'item-new-uuid' }),
        },
        reorder_suggestions: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx)
      })

      const res = await convertSuggestions('auth-user-id', ['sug-1'])
      expect(res).toEqual({
        requisition_id: 'req-new-uuid',
        suggestions_converted: 1,
      })
      expect(mockTx.purchase_requisitions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'reorder_engine',
            store_id: 'store-1',
            branch_id: 'branch-1',
          }),
        })
      )
      expect(mockTx.reorder_suggestions.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['sug-1'] },
            tenant_id: '00000000-0000-0000-0000-000000000001',
            status: 'open',
          },
          data: expect.objectContaining({
            status: 'converted',
            converted_requisition_id: 'req-new-uuid',
          }),
        })
      )
    })
  })

  describe('dismissSuggestion', () => {
    it('successfully dismisses an open suggestion', async () => {
      vi.mocked(prisma.reorder_suggestions.findFirst).mockResolvedValue({
        status: 'open',
      } as any)
      vi.mocked(prisma.reorder_suggestions.update).mockResolvedValue({
        id: 'sug-1',
        status: 'dismissed',
      } as any)

      const res = await dismissSuggestion('auth-user-id', 'sug-1')
      expect(res.status).toBe('dismissed')
      expect(prisma.reorder_suggestions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sug-1' },
          data: expect.objectContaining({ status: 'dismissed' }),
        })
      )
    })

    it('rejects dismissing a non-open suggestion', async () => {
      vi.mocked(prisma.reorder_suggestions.findFirst).mockResolvedValue({
        status: 'converted',
      } as any)

      await expect(dismissSuggestion('auth-user-id', 'sug-1')).rejects.toThrow(ApiError)
    })
  })
})
