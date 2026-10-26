import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StockTransferProductVirtualCombobox } from '@/features/stock-transfers/components/stock-transfer-product-virtual-combobox'
import type { StockTransferProductVariant } from '@/features/stock-transfers/hooks/use-stock-transfer-products'

const mockInitialVariants: StockTransferProductVariant[] = [
  {
    id: 'var-initial-1',
    sku: 'SKU-001',
    barcode: '111111',
    name: 'Initial Product 1',
    productId: 'prod-1',
    productName: 'Initial Product 1',
    brand: 'Brand A',
    category: 'Category A',
    uom: 'PCS',
    weight: 0.5,
    costPrice: 10,
    listPrice: 20,
    priceListName: 'Standard',
    priceSource: 'API',
    isBatchTracked: false,
    isSerialTracked: false,
    searchString: 'sku-001 initial product 1 brand a category a 111111',
    sourceStock: {
      warehouseId: 'wh-main',
      warehouseName: 'Main Warehouse',
      warehouseCode: 'MAIN',
      qtyOnHand: 15,
      qtyReserved: 2,
      qtyAvailable: 13,
    },
  },
]

const mockServerVariant: StockTransferProductVariant = {
  id: 'var-db-999',
  sku: 'DB-SEARCH-999',
  barcode: '999999',
  name: 'Database Discovered Item',
  productId: 'prod-999',
  productName: 'Database Discovered Item',
  brand: 'Rare Brand',
  category: 'Speciality',
  uom: 'BOX',
  weight: 2.5,
  costPrice: 45,
  listPrice: 90,
  priceListName: 'Standard',
  priceSource: 'API',
  isBatchTracked: false,
  isSerialTracked: false,
  searchString: 'db-search-999 database discovered item rare brand speciality 999999',
  sourceStock: {
    warehouseId: 'wh-main',
    warehouseName: 'Main Warehouse',
    warehouseCode: 'MAIN',
    qtyOnHand: 50,
    qtyReserved: 5,
    qtyAvailable: 45,
  },
  alternativeWarehouses: [
    {
      warehouseId: 'wh-north',
      warehouseName: 'North Distribution Hub',
      warehouseCode: 'NORTH',
      qtyOnHand: 100,
      qtyReserved: 10,
      qtyAvailable: 90,
    },
  ],
}

let mockHookReturnValue = {
  data: [] as StockTransferProductVariant[],
  isLoading: false,
  isFetching: false,
}

vi.mock('@/features/stock-transfers/hooks/use-stock-transfer-products', async () => {
  const actual = await vi.importActual<any>(
    '@/features/stock-transfers/hooks/use-stock-transfer-products'
  )
  return {
    ...actual,
    useStockTransferProductVariants: (search?: string) => {
      if (search && search.toLowerCase().includes('database')) {
        return {
          data: [mockServerVariant],
          isLoading: false,
          isFetching: false,
        }
      }
      return mockHookReturnValue
    },
  }
})

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

describe('Dynamic Database Product Variant Search in Stock Transfers', () => {
  beforeEach(() => {
    mockHookReturnValue = {
      data: [],
      isLoading: false,
      isFetching: false,
    }
  })

  it('renders initial variants in the combobox dropdown', async () => {
    const user = userEvent.setup()
    render(
      <StockTransferProductVirtualCombobox
        variants={mockInitialVariants}
        onChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    expect(screen.getByText('SKU-001')).toBeInTheDocument()
    expect(screen.getByText('Initial Product 1')).toBeInTheDocument()
  })

  it('queries database via server search when item is not in initial variants and displays it', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <StockTransferProductVirtualCombobox
        variants={mockInitialVariants}
        debounceMs={50}
        enableServerSearch={true}
        onChange={handleChange}
      />
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    const searchInput = screen.getByPlaceholderText(/search sku, name, barcode/i)
    await user.type(searchInput, 'Database')

    // Wait for debounced search and server result to appear
    await waitFor(() => {
      expect(screen.getByText('DB-SEARCH-999')).toBeInTheDocument()
      expect(screen.getByText('Database Discovered Item')).toBeInTheDocument()
    })

    // Click the server searched item
    await user.click(screen.getByText('Database Discovered Item'))

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'var-db-999',
        sku: 'DB-SEARCH-999',
        name: 'Database Discovered Item',
      })
    )
  })

  it('shows database searching indicator when query is in-flight and not found in local items', async () => {
    mockHookReturnValue = {
      data: [],
      isLoading: false,
      isFetching: true, // Server search is actively in-flight
    }

    const user = userEvent.setup()

    render(
      <StockTransferProductVirtualCombobox
        variants={mockInitialVariants}
        debounceMs={50}
        enableServerSearch={true}
        onChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    const searchInput = screen.getByPlaceholderText(/search sku, name, barcode/i)
    await user.type(searchInput, 'UncachedProduct')

    // While fetching, should show searching database indicator instead of flash "No products found"
    await waitFor(() => {
      expect(
        screen.getByText(/Searching catalog database\.\.\./i)
      ).toBeInTheDocument()
    })
  })
})
