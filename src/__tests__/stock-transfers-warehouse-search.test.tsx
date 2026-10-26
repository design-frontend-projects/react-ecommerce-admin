import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CrossWarehouseStockBadge } from '@/features/stock-transfers/components/cross-warehouse-stock-badge'
import { StockTransferProductVirtualCombobox } from '@/features/stock-transfers/components/stock-transfer-product-virtual-combobox'
import type { StockTransferProductVariant } from '@/features/stock-transfers/hooks/use-stock-transfer-products'

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

vi.mock('@/features/stock-transfers/hooks/use-stock-transfer-products', async () => {
  const actual = await vi.importActual<any>(
    '@/features/stock-transfers/hooks/use-stock-transfer-products'
  )
  return {
    ...actual,
    useCrossWarehouseStock: vi.fn().mockReturnValue({
      isLoading: false,
      isFetching: false,
      warehousesStock: [],
      getStockForWarehouse: vi.fn().mockReturnValue({
        warehouseId: 'wh-main',
        warehouseName: 'Main Warehouse',
        warehouseCode: 'MAIN',
        qtyOnHand: 2,
        qtyReserved: 0,
        qtyAvailable: 2,
      }),
      getOtherWarehousesWithStock: vi.fn().mockReturnValue([
        {
          warehouseId: 'wh-north',
          warehouseName: 'North Distribution Hub',
          warehouseCode: 'NORTH',
          qtyOnHand: 40,
          qtyReserved: 5,
          qtyAvailable: 35,
        },
        {
          warehouseId: 'wh-south',
          warehouseName: 'South Facility',
          warehouseCode: 'SOUTH',
          qtyOnHand: 4,
          qtyReserved: 0,
          qtyAvailable: 4,
        },
      ]),
    }),
    useStockTransferProductVariants: vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    }),
  }
})

describe('Stock Transfers - Warehouse Inventory & Alternative Search', () => {
  const mockVariantWithAlternatives: StockTransferProductVariant = {
    id: 'var-espresso',
    sku: 'ESP-ROAST-01',
    barcode: '123456789012',
    name: 'Espresso Blend 1kg',
    productId: 'prod-esp',
    productName: 'Signature Espresso Blend',
    brand: 'Antigravity Roasters',
    category: 'Coffee Beans',
    uom: 'Bag',
    weight: 1.0,
    costPrice: 12.5,
    listPrice: 22.0,
    priceListName: 'Standard Retail',
    priceSource: 'Price List',
    isBatchTracked: false,
    isSerialTracked: false,
    searchString: 'esp-roast-01 espresso blend antigravity roasters',
    sourceStock: {
      warehouseId: 'wh-main',
      warehouseName: 'Main Warehouse',
      warehouseCode: 'MAIN',
      qtyOnHand: 2,
      qtyReserved: 0,
      qtyAvailable: 2,
    },
    alternativeWarehouses: [
      {
        warehouseId: 'wh-north',
        warehouseName: 'North Distribution Hub',
        warehouseCode: 'NORTH',
        qtyOnHand: 40,
        qtyReserved: 5,
        qtyAvailable: 35,
      },
      {
        warehouseId: 'wh-south',
        warehouseName: 'South Facility',
        warehouseCode: 'SOUTH',
        qtyOnHand: 4,
        qtyReserved: 0,
        qtyAvailable: 4,
      },
    ],
  }

  it('renders available quantity and alternative warehouse chips in the virtual combobox dropdown', async () => {
    const user = userEvent.setup()
    render(
      <StockTransferProductVirtualCombobox
        sourceWarehouseId='wh-main'
        sourceWarehouseName='Main Warehouse'
        variants={[mockVariantWithAlternatives]}
        onChange={vi.fn()}
      />
    )

    // Open combobox
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Should display source warehouse on-hand available badge
    expect(screen.getByText('2 in origin')).toBeInTheDocument()

    // Should display alternative warehouse chip NORTH: 35
    expect(screen.getByText('NORTH:')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('displays CrossWarehouseStockBadge when requested quantity exceeds source warehouse available stock', () => {
    const handleSwitch = vi.fn()

    render(
      <CrossWarehouseStockBadge
        productVariantId='var-espresso'
        sourceWarehouseId='wh-main'
        sourceWarehouseName='Main Warehouse'
        requestedQty={10} // source has 2 available, requested is 10
        variant={mockVariantWithAlternatives}
        onSwitchSourceWarehouse={handleSwitch}
      />
    )

    // Alert header indicating insufficient stock
    expect(
      screen.getByText(/Insufficient Stock at Main Warehouse/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/2 available, 10 requested/i)).toBeInTheDocument()

    // North Hub has 35 available >= 10 -> Should have "Can Fulfill" badge
    expect(screen.getByText('North Distribution Hub')).toBeInTheDocument()
    expect(screen.getByText('Can Fulfill')).toBeInTheDocument()
    expect(screen.getByText(/35 available/i)).toBeInTheDocument()

    // South Facility has 4 available < 10 -> Should show available count without "Can Fulfill"
    expect(screen.getByText('South Facility')).toBeInTheDocument()
    expect(screen.getByText(/4 available/i)).toBeInTheDocument()
  })

  it('triggers onSwitchSourceWarehouse when clicking Switch Origin on an alternative warehouse', async () => {
    const user = userEvent.setup()
    const handleSwitch = vi.fn()

    render(
      <CrossWarehouseStockBadge
        productVariantId='var-espresso'
        sourceWarehouseId='wh-main'
        sourceWarehouseName='Main Warehouse'
        requestedQty={10}
        variant={mockVariantWithAlternatives}
        onSwitchSourceWarehouse={handleSwitch}
      />
    )

    const switchButtons = screen.getAllByRole('button', {
      name: /Switch Origin/i,
    })
    expect(switchButtons.length).toBeGreaterThan(0)

    // Click switch origin for the first alternative (wh-north)
    await user.click(switchButtons[0])
    expect(handleSwitch).toHaveBeenCalledWith('wh-north')
  })
})
