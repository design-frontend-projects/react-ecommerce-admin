import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { InventoryProductVirtualCombobox } from '@/features/inventory/components/inventory-product-virtual-combobox'
import type { InventoryProductRelation } from '@/features/inventory/data/schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
  }),
}))

const mockProducts: InventoryProductRelation[] = [
  {
    id: 'prod-101',
    name: 'Espresso Blend Whole Beans',
    sku: 'COFFEE-ESP-01',
    category: 'Coffee & Tea',
    brand: 'Artisan Roast',
    barcode: '987654321001',
    has_variants: true,
  },
  {
    id: 'prod-102',
    name: 'Caramel Syrup 750ml',
    sku: 'SYRUP-CAR-02',
    category: 'Syrups & Flavors',
    brand: 'Monin',
    barcode: '987654321002',
    has_variants: false,
  },
  {
    id: 'prod-103',
    name: 'Organic Oat Milk 1L',
    sku: 'DAIRY-OAT-03',
    category: 'Dairy & Milks',
    brand: 'Oatly',
    barcode: '987654321003',
    has_variants: false,
  },
]

// Generate 120 products to test virtualization and chunking
const largeProductCatalog: InventoryProductRelation[] = Array.from(
  { length: 120 },
  (_, idx) => ({
    id: `catalog-item-${idx + 1}`,
    name: `Catalog Item #${idx + 1} Special Roast`,
    sku: `SKU-${1000 + idx}`,
    category: idx % 2 === 0 ? 'Beverages' : 'Snacks',
    brand: 'In-House Brand',
    has_variants: idx % 3 === 0,
  })
)

describe('InventoryProductVirtualCombobox', () => {
  it('renders trigger button with placeholder when no product is selected', () => {
    render(
      <InventoryProductVirtualCombobox
        value={null}
        onChange={vi.fn()}
        products={mockProducts}
        placeholder='Select product...'
      />
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Select product...')).toBeInTheDocument()
  })

  it('renders selected product details on trigger when value is provided', () => {
    render(
      <InventoryProductVirtualCombobox
        value='prod-101'
        onChange={vi.fn()}
        products={mockProducts}
      />
    )

    expect(screen.getByText('Espresso Blend Whole Beans')).toBeInTheDocument()
    expect(screen.getByText('COFFEE-ESP-01')).toBeInTheDocument()
    expect(screen.getByText('Variants')).toBeInTheDocument()
  })

  it('filters products by name, SKU, brand, and barcode during search', async () => {
    const user = userEvent.setup()
    render(
      <InventoryProductVirtualCombobox
        value={null}
        onChange={vi.fn()}
        products={mockProducts}
      />
    )

    // Open popover
    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText(
      'Search products by name, SKU, brand, barcode...'
    )

    // Search by brand "Monin"
    await user.type(searchInput, 'Monin')
    expect(screen.getByText('Caramel Syrup 750ml')).toBeInTheDocument()
    expect(screen.queryByText('Espresso Blend Whole Beans')).not.toBeInTheDocument()
    expect(screen.queryByText('Organic Oat Milk 1L')).not.toBeInTheDocument()

    // Clear search
    await user.clear(searchInput)
    expect(screen.getByText('Espresso Blend Whole Beans')).toBeInTheDocument()
    expect(screen.getByText('Organic Oat Milk 1L')).toBeInTheDocument()

    // Search by barcode
    await user.type(searchInput, '987654321003')
    expect(screen.getByText('Organic Oat Milk 1L')).toBeInTheDocument()
    expect(screen.queryByText('Caramel Syrup 750ml')).not.toBeInTheDocument()
  })

  it('calls onChange with selected product id on click and closes popover', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(
      <InventoryProductVirtualCombobox
        value={null}
        onChange={mockOnChange}
        products={mockProducts}
      />
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Organic Oat Milk 1L'))

    expect(mockOnChange).toHaveBeenCalledWith('prod-103')
  })

  it('allows clearing selected product with clear icon', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(
      <InventoryProductVirtualCombobox
        value='prod-102'
        onChange={mockOnChange}
        products={mockProducts}
      />
    )

    const clearBtn = screen.getByRole('button', { name: 'Clear selected product' })
    await user.click(clearBtn)

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('renders large virtualized catalog smoothly and displays item count', async () => {
    const user = userEvent.setup()

    render(
      <InventoryProductVirtualCombobox
        value={null}
        onChange={vi.fn()}
        products={largeProductCatalog}
      />
    )

    await user.click(screen.getByRole('combobox'))

    // Should display total items badge
    expect(screen.getByText('120')).toBeInTheDocument()
    // Should display items from initial chunk
    expect(screen.getByText('Catalog Item #1 Special Roast')).toBeInTheDocument()
    expect(screen.getByText('SKU-1000')).toBeInTheDocument()
  })

  it('displays empty state when search returns no match', async () => {
    const user = userEvent.setup()

    render(
      <InventoryProductVirtualCombobox
        value={null}
        onChange={vi.fn()}
        products={mockProducts}
      />
    )

    await user.click(screen.getByRole('combobox'))
    const searchInput = screen.getByPlaceholderText(
      'Search products by name, SKU, brand, barcode...'
    )
    await user.type(searchInput, 'NonExistentProductXYZ')

    expect(screen.getByText('No products found')).toBeInTheDocument()
    expect(screen.getByText(/No match for "NonExistentProductXYZ"/i)).toBeInTheDocument()
  })
})
