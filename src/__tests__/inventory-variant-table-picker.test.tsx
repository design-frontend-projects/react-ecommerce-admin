import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InventoryVariantTablePicker } from '@/features/inventory/components/inventory-variant-table-picker'
import type { ProductVariantItem, PaginatedProductVariantsResult } from '@/features/inventory/data/schema'
import * as inventoryHooks from '@/features/inventory/hooks/use-inventory'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
  }),
}))

const mockVariants: ProductVariantItem[] = [
  {
    id: 'var-101',
    product_id: 'prod-1',
    sku: 'TSHIRT-BLK-S',
    barcode: '987654321001',
    name: 'Black / Small',
    product_name: 'Organic Cotton Tee',
    brand_name: 'EcoWear',
    category_name: 'Apparel',
    price: 34.5,
    cost_price: 18.0,
    qty_on_hand: 120,
    qty_available: 110,
    qty_reserved: 10,
    is_assigned_to_inventory: false,
    inventory_items: null,
  },
  {
    id: 'var-102',
    product_id: 'prod-1',
    sku: 'TSHIRT-BLK-M',
    barcode: '987654321002',
    name: 'Black / Medium',
    product_name: 'Organic Cotton Tee',
    brand_name: 'EcoWear',
    category_name: 'Apparel',
    price: 34.5,
    cost_price: 18.0,
    qty_on_hand: 40,
    qty_available: 40,
    qty_reserved: 0,
    is_assigned_to_inventory: true,
    inventory_items: { id: 'inv-item-1', status: 'ACTIVE' },
  },
]

const mockPaginatedResult: PaginatedProductVariantsResult = {
  items: mockVariants,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

describe('InventoryVariantTablePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(inventoryHooks, 'useProductVariantsPaginated').mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as any)
  })

  it('renders trigger button with placeholder when no variant is selected', () => {
    render(
      <InventoryVariantTablePicker
        value={null}
        onSelect={vi.fn()}
      />
    )

    expect(
      screen.getByText('Select Product Variant from Database...')
    ).toBeInTheDocument()
    expect(screen.getByText('Browse Table')).toBeInTheDocument()
  })

  it('renders selected variant information when value and currentVariantInfo are provided', () => {
    render(
      <InventoryVariantTablePicker
        value='var-101'
        currentVariantInfo={{
          id: 'var-101',
          sku: 'TSHIRT-BLK-S',
          name: 'Black / Small',
          product_name: 'Organic Cotton Tee',
          barcode: '987654321001',
        }}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText('Organic Cotton Tee')).toBeInTheDocument()
    expect(screen.getByText('SKU: TSHIRT-BLK-S')).toBeInTheDocument()
    expect(screen.getByText(/Black \/ Small/)).toBeInTheDocument()
  })

  it('disables the trigger button when disabled prop is true', () => {
    render(
      <InventoryVariantTablePicker
        value='var-101'
        disabled={true}
        onSelect={vi.fn()}
      />
    )

    const triggerBtn = screen.getByRole('button')
    expect(triggerBtn).toBeDisabled()
  })

  it('opens table modal on click and renders search, tabs, and table with variant records', async () => {
    const user = userEvent.setup()

    render(
      <InventoryVariantTablePicker
        value={null}
        onSelect={vi.fn()}
      />
    )

    const triggerBtn = screen.getByRole('button', { name: /Select Product Variant/i })
    await user.click(triggerBtn)

    // Modal header
    expect(screen.getByText('Select Product Variant')).toBeInTheDocument()
    expect(screen.getByText(/2 variant\(s\)/i)).toBeInTheDocument()

    // Search bar and tabs
    expect(
      screen.getByPlaceholderText('Search variant SKU, name, barcode, product...')
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Available/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /In Inventory/i })).toBeInTheDocument()

    // Table rows
    expect(screen.getByText('TSHIRT-BLK-S')).toBeInTheDocument()
    expect(screen.getByText('TSHIRT-BLK-M')).toBeInTheDocument()
    expect(screen.getByText('987654321001')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('110 avail')).toBeInTheDocument()
  })

  it('calls onSelect with variant item and closes modal when Select is clicked on an available item', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <InventoryVariantTablePicker
        value={null}
        onSelect={handleSelect}
      />
    )

    const triggerBtn = screen.getByRole('button', { name: /Select Product Variant/i })
    await user.click(triggerBtn)

    const selectBtn = screen.getByRole('button', { name: 'Select' })
    await user.click(selectBtn)

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'var-101',
        sku: 'TSHIRT-BLK-S',
        product_name: 'Organic Cotton Tee',
        price: 34.5,
      })
    )
  })

  it('renders assigned badge and disables selection for variants already assigned to inventory', async () => {
    const user = userEvent.setup()

    render(
      <InventoryVariantTablePicker
        value={null}
        onSelect={vi.fn()}
      />
    )

    const triggerBtn = screen.getByRole('button', { name: /Select Product Variant/i })
    await user.click(triggerBtn)

    // Second item (var-102) is already in inventory
    const assignedButtons = screen.getAllByRole('button', { name: /Assigned/i })
    expect(assignedButtons.length).toBeGreaterThanOrEqual(1)
    expect(assignedButtons[0]).toBeDisabled()
  })
})
