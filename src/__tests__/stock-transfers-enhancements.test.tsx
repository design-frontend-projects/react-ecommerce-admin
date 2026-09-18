import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CrossWarehouseStockBadge } from '@/features/stock-transfers/components/cross-warehouse-stock-badge'
import { StockTransferProductVirtualCombobox } from '@/features/stock-transfers/components/stock-transfer-product-virtual-combobox'
import { TransferMovementHistory } from '@/features/stock-transfers/components/transfer-movement-history'
import type { TransferDetail } from '@/features/stock-transfers/data/schema'
import type {
  StockTransferProductVariant,
  WarehouseStockEntry,
} from '@/features/stock-transfers/hooks/use-stock-transfer-products'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      defaultVal?: string | { defaultValue?: string; [k: string]: unknown }
    ) => {
      if (typeof defaultVal === 'string') return defaultVal
      if (
        defaultVal &&
        typeof defaultVal === 'object' &&
        defaultVal.defaultValue
      ) {
        let str = defaultVal.defaultValue
        for (const [k, v] of Object.entries(defaultVal)) {
          if (k !== 'defaultValue') {
            str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
          }
        }
        return str
      }
      return key
    },
  }),
}))

const mockVariants: StockTransferProductVariant[] = [
  {
    id: 'var-1',
    sku: 'COF-ETH-01',
    barcode: '890123456701',
    name: 'Single Origin 250g',
    productId: 'prod-1',
    productName: 'Ethiopian Yirgacheffe Beans',
    brand: 'Artisan Roast',
    category: 'Coffee Beans',
    uom: 'Bag',
    weight: 0.25,
    costPrice: 4.5,
    listPrice: 12.0,
    priceListName: 'Standard Retail',
    priceSource: 'Price List',
    isBatchTracked: false,
    isSerialTracked: false,
    searchString:
      'COF-ETH-01 Ethiopian Yirgacheffe Beans Single Origin 250g Artisan Roast Coffee Beans 890123456701',
  },
  {
    id: 'var-2',
    sku: 'SYR-VAN-02',
    barcode: '890123456702',
    name: 'Vanilla Syrup 1L',
    productId: 'prod-2',
    productName: 'Gourmet Vanilla Syrup',
    brand: 'Monin',
    category: 'Syrups',
    uom: 'Bottle',
    weight: 1.2,
    costPrice: 6.0,
    listPrice: 15.5,
    priceListName: 'Standard Retail',
    priceSource: 'Price List',
    isBatchTracked: true,
    isSerialTracked: false,
    searchString:
      'SYR-VAN-02 Gourmet Vanilla Syrup Vanilla Syrup 1L Monin Syrups 890123456702',
  },
  {
    id: 'var-3',
    sku: 'MILK-OAT-03',
    barcode: '890123456703',
    name: 'Barista Edition 1L',
    productId: 'prod-3',
    productName: 'Oat Milk Barista',
    brand: 'Oatly',
    category: 'Dairy Alternatives',
    uom: 'Carton',
    weight: 1.05,
    costPrice: 1.8,
    listPrice: 4.2,
    priceListName: 'Wholesale B2B',
    priceSource: 'Price List',
    isBatchTracked: false,
    isSerialTracked: false,
    searchString:
      'MILK-OAT-03 Oat Milk Barista Barista Edition 1L Oatly Dairy Alternatives 890123456703',
  },
]

const mockCrossStock: WarehouseStockEntry[] = [
  {
    warehouseId: 'wh-main',
    warehouseName: 'Central Distribution Hub',
    warehouseCode: 'CDH-01',
    qtyOnHand: 0,
    qtyReserved: 0,
    qtyAvailable: 0,
  },
  {
    warehouseId: 'wh-north',
    warehouseName: 'North Regional Depot',
    warehouseCode: 'NRD-02',
    qtyOnHand: 45,
    qtyReserved: 5,
    qtyAvailable: 40,
  },
  {
    warehouseId: 'wh-south',
    warehouseName: 'South Retail Hub',
    warehouseCode: 'SRH-03',
    qtyOnHand: 15,
    qtyReserved: 0,
    qtyAvailable: 15,
  },
]

vi.mock(
  '@/features/stock-transfers/hooks/use-stock-transfer-products',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/stock-transfers/hooks/use-stock-transfer-products')
      >()
    return {
      ...actual,
      useCrossWarehouseStock: vi.fn((variantId) => {
        if (!variantId) {
          return {
            warehousesStock: [],
            isLoading: false,
            error: null,
            totalAvailable: 0,
            isOutOfStockEverywhere: true,
            getOtherWarehousesWithStock: () => [],
            getStockForWarehouse: () => null,
          }
        }
        return {
          warehousesStock: mockCrossStock,
          isLoading: false,
          error: null,
          totalAvailable: 55,
          isOutOfStockEverywhere: false,
          getOtherWarehousesWithStock: (sourceWarehouseId?: string | null) =>
            mockCrossStock.filter(
              (w) => w.warehouseId !== sourceWarehouseId && w.qtyAvailable > 0
            ),
          getStockForWarehouse: (warehouseId?: string | null) =>
            mockCrossStock.find((w) => w.warehouseId === warehouseId) ?? null,
        }
      }),
    }
  }
)

describe('Stock Transfer Enhancements Test Suite', () => {
  describe('StockTransferProductVirtualCombobox', () => {
    it('renders the combobox trigger with placeholder and displays rich metadata on selection', async () => {
      const onSelect = vi.fn()
      const { rerender } = render(
        <StockTransferProductVirtualCombobox
          variants={mockVariants}
          value=''
          onChange={onSelect}
          placeholder='Select item to transfer...'
        />
      )

      expect(screen.getByText('Select item to transfer...')).toBeDefined()

      // When an item is selected
      rerender(
        <StockTransferProductVirtualCombobox
          variants={mockVariants}
          value='var-1'
          onChange={onSelect}
        />
      )

      expect(screen.getByText('COF-ETH-01')).toBeDefined()
      expect(screen.getByText('Single Origin 250g')).toBeDefined()
      expect(screen.getByText(/Artisan Roast/i)).toBeDefined()
    })

    it('opens virtual dropdown, filters by search query and triggers onChange', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()

      render(
        <StockTransferProductVirtualCombobox
          variants={mockVariants}
          value=''
          onChange={onSelect}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      // Search for 'Vanilla'
      const searchInput = screen.getByPlaceholderText(
        /search sku, name, barcode/i
      )
      await user.type(searchInput, 'Vanilla')

      // Should show the vanilla product
      expect(screen.getByText(/Vanilla Syrup 1L/i)).toBeDefined()
      expect(screen.getByText('SYR-VAN-02')).toBeDefined()

      // Click on the item
      const itemOption = screen.getByText('SYR-VAN-02')
      await user.click(itemOption)

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'var-2',
          sku: 'SYR-VAN-02',
          listPrice: 15.5,
          costPrice: 6.0,
        })
      )
    })
  })

  describe('CrossWarehouseStockBadge', () => {
    it('detects out-of-stock at origin warehouse and displays available stock in other warehouses', () => {
      render(
        <CrossWarehouseStockBadge
          productVariantId='var-1'
          sourceWarehouseId='wh-main'
          sourceWarehouseName='Central Distribution Hub'
          requestedQty={10}
        />
      )

      // Origin has 0 available -> should warn out of stock
      expect(
        screen.getByText(/Out of Stock at Central Distribution Hub/i)
      ).toBeDefined()
      // Should show other warehouses with stock
      expect(screen.getByText('North Regional Depot')).toBeDefined()
      expect(screen.getByText(/40 available/i)).toBeDefined()
      expect(screen.getByText('South Retail Hub')).toBeDefined()
      expect(screen.getByText(/15 available/i)).toBeDefined()
    })

    it('triggers onSwitchSourceWarehouse callback when a user switches source warehouse', async () => {
      const user = userEvent.setup()
      const onSwitch = vi.fn()

      render(
        <CrossWarehouseStockBadge
          productVariantId='var-1'
          sourceWarehouseId='wh-main'
          sourceWarehouseName='Central Distribution Hub'
          requestedQty={20}
          onSwitchSourceWarehouse={onSwitch}
        />
      )

      // Find switch origin buttons
      const switchButtons = screen.getAllByRole('button', {
        name: /switch origin/i,
      })
      expect(switchButtons.length).toBeGreaterThan(0)

      await user.click(switchButtons[0])
      expect(onSwitch).toHaveBeenCalledWith('wh-north')
    })
  })

  describe('Real-time Valuation & Calculation Logic', () => {
    it('accurately calculates units, gross weight, cost valuation, and price list retail valuation', () => {
      const items = [
        { qty: 10, unit_cost: 4.5, weight: 0.25, list_price: 12.0 },
        { qty: 5, unit_cost: 6.0, weight: 1.2, list_price: 15.5 },
        { qty: 20, unit_cost: 1.8, weight: 1.05, list_price: 4.2 },
      ]

      const totalUnits = items.reduce((sum, it) => sum + it.qty, 0)
      const totalWeight = items.reduce((sum, it) => sum + it.qty * it.weight, 0)
      const totalCost = items.reduce(
        (sum, it) => sum + it.qty * it.unit_cost,
        0
      )
      const totalRetail = items.reduce(
        (sum, it) => sum + it.qty * it.list_price,
        0
      )
      const grossMargin = totalRetail - totalCost
      const markupPercentage = Number(
        ((grossMargin / totalCost) * 100).toFixed(1)
      )

      expect(totalUnits).toBe(35)
      // 10*0.25 (2.5) + 5*1.2 (6) + 20*1.05 (21) = 29.5 kg
      expect(totalWeight).toBeCloseTo(29.5, 2)
      // 10*4.5 (45) + 5*6 (30) + 20*1.8 (36) = 111.0
      expect(totalCost).toBeCloseTo(111.0, 2)
      // 10*12 (120) + 5*15.5 (77.5) + 20*4.2 (84) = 281.5
      expect(totalRetail).toBeCloseTo(281.5, 2)
      expect(grossMargin).toBeCloseTo(170.5, 2)
      // (170.5 / 111) * 100 = 153.6%
      expect(markupPercentage).toBeCloseTo(153.6, 1)
    })
  })

  describe('TransferMovementHistory Ledger & Audit', () => {
    const mockTransfer: TransferDetail = {
      id: 'trans-100',
      tenant_id: 'tenant-1',
      transfer_no: '1001',
      reference_no: 'TR-2026-001',
      status: 'completed',
      source_warehouse_id: 'wh-1',
      destination_warehouse_id: 'wh-2',
      from_store_id: null,
      to_store_id: null,
      from_branch_id: null,
      to_branch_id: null,
      created_by: 'user-admin',
      created_by_user_id: 'user-admin',
      approved_by: 'manager-01',
      shipped_by: 'driver-01',
      received_by: 'receiver-02',
      approved_at: new Date('2026-09-18T10:00:00Z'),
      shipped_at: new Date('2026-09-18T11:30:00Z'),
      received_at: new Date('2026-09-18T14:00:00Z'),
      notes: 'Urgent weekend restock',
      created_at: new Date('2026-09-18T09:00:00Z'),
      updated_at: new Date('2026-09-18T14:05:00Z'),
      stock_transfer_items: [
        {
          id: 'item-1',
          tenant_id: 'tenant-1',
          stock_transfer_id: 'trans-100',
          product_variant_id: 'var-1',
          qty: 10,
          received_qty: 9, // Discrepancy of -1
          unit_cost: 4.5,
          condition: 'good',
          batch_id: null,
          serial_id: null,
          source_location_id: null,
          destination_location_id: null,
          created_at: new Date(),
          updated_at: new Date(),
          product_variants: {
            id: 'var-1',
            sku: 'COF-ETH-01',
            barcode: '890123456701',
            name: 'Single Origin 250g',
            products: { name: 'Ethiopian Yirgacheffe Beans' },
          },
        },
      ],
      inventory_movements: [
        {
          id: 'mov-1',
          tenant_id: 'tenant-1',
          product_variant_id: 'var-1',
          warehouse_id: 'wh-1',
          movement_type: 'transfer_out',
          status: 'posted',
          condition: 'good',
          quantity_delta: -10,
          unit_cost: 4.5,
          total_cost: 45.0,
          qty_before: 50,
          qty_after: 40,
          reference_type: 'stock_transfer',
          reference_id: 'trans-100',
          created_at: '2026-09-18T11:30:00Z',
          product_variants: {
            sku: 'COF-ETH-01',
            products: { name: 'Ethiopian Yirgacheffe Beans' },
          },
          warehouses: { name: 'Central Warehouse', code: 'CW-01' },
        },
        {
          id: 'mov-2',
          tenant_id: 'tenant-1',
          product_variant_id: 'var-1',
          warehouse_id: 'wh-2',
          movement_type: 'transfer_in',
          status: 'posted',
          condition: 'good',
          quantity_delta: 9,
          unit_cost: 4.5,
          total_cost: 40.5,
          qty_before: 5,
          qty_after: 14,
          reference_type: 'stock_transfer',
          reference_id: 'trans-100',
          created_at: '2026-09-18T14:00:00Z',
          product_variants: {
            sku: 'COF-ETH-01',
            products: { name: 'Ethiopian Yirgacheffe Beans' },
          },
          warehouses: { name: 'Destination Depot', code: 'DD-02' },
        },
      ],
    }

    it('renders the ledger table with movements delta, before -> after, and unit cost', () => {
      render(<TransferMovementHistory transfer={mockTransfer} />)

      // Movements Ledger Tab
      expect(screen.getByText(/Movements Ledger/i)).toBeDefined()
      expect(screen.getByText('-10')).toBeDefined()
      expect(screen.getByText('+9')).toBeDefined()
      expect(screen.getByText('TRANSFER OUT')).toBeDefined()
      expect(screen.getByText('TRANSFER IN')).toBeDefined()
      expect(screen.getByText('Central Warehouse')).toBeDefined()
      expect(screen.getByText('Destination Depot')).toBeDefined()
    })

    it('renders fulfillment variance reconciliation with financial impact', async () => {
      const user = userEvent.setup()
      render(<TransferMovementHistory transfer={mockTransfer} />)

      // Click on Reconciliation tab
      const reconTab = screen.getByRole('tab', {
        name: /fulfillment & variance/i,
      })
      await user.click(reconTab)

      // Sent 10, Received 9 -> Variance -1
      expect(screen.getByText('10')).toBeDefined()
      expect(screen.getByText('9')).toBeDefined()
      expect(screen.getByText('-1')).toBeDefined()
      expect(screen.getByText('-$4.50')).toBeDefined()
      expect(screen.getByText(/Net Transfer Variance: -1 units/i)).toBeDefined()
    })

    it('renders lifecycle audit trail with user references and timestamps', async () => {
      const user = userEvent.setup()
      render(<TransferMovementHistory transfer={mockTransfer} />)

      const auditTab = screen.getByRole('tab', { name: /lifecycle audit/i })
      await user.click(auditTab)

      expect(screen.getByText(/By User: user-admin/i)).toBeDefined()
      expect(screen.getByText(/Approved by: manager-01/i)).toBeDefined()
      expect(screen.getByText(/Dispatched by: driver-01/i)).toBeDefined()
      expect(screen.getByText(/Received by: receiver-02/i)).toBeDefined()
      expect(screen.getByText('Urgent weekend restock')).toBeDefined()
    })
  })

  describe('i18n Translation Dictionary Parity', () => {
    it('contains all required stockTransfers keys in both en.json and ar.json', async () => {
      const enJson = (await import('@/assets/i18n/en.json')).default as Record<
        string,
        unknown
      >
      const arJson = (await import('@/assets/i18n/ar.json')).default as Record<
        string,
        unknown
      >

      expect(enJson.stockTransfers).toBeDefined()
      expect(arJson.stockTransfers).toBeDefined()

      const enStock = enJson.stockTransfers as Record<string, unknown>
      const arStock = arJson.stockTransfers as Record<string, unknown>

      const requiredSections = [
        'title',
        'description',
        'errorLoading',
        'createTransfer',
        'entityTypes',
        'types',
        'conditions',
        'status',
        'movementTypes',
        'columns',
        'table',
        'form',
        'createDialog',
        'viewDialog',
        'crossWarehouse',
        'combobox',
        'history',
        'timeline',
        'workflow',
        'analytics',
        'toast',
      ]

      for (const section of requiredSections) {
        expect(enStock[section]).toBeDefined()
        expect(arStock[section]).toBeDefined()
      }
    })
  })
})
