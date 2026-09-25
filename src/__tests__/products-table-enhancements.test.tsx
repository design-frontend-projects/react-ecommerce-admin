import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  getColumns,
  computeTotalStock,
  getStockStatus,
} from '@/features/products/components/products-columns'
import { ProductsStats } from '@/features/products/components/products-stats'
import { ProductsTable } from '@/features/products/components/products-table'
import { ProductsProvider } from '@/features/products/components/products-provider'
import type { Product } from '@/features/products/data/schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (typeof opts === 'object' && opts?.defaultValue) return opts.defaultValue
      if (typeof opts === 'string') return opts
      return key
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn(),
  },
}))

if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
}

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Ergonomic Mouse',
    sku: 'WEM-001',
    barcode: '8901234567890',
    product_type: 'simple',
    is_active: true,
    categories: { id: 'cat-1', name: 'Electronics' },
    brands: { id: 'brand-1', name: 'LogiTech' },
    created_at: '2026-03-01T10:00:00Z',
    product_variants: [
      {
        id: 'var-1',
        sku: 'WEM-001-BLK',
        stock_balances: [{ qty_available: 15, qty_on_hand: 15, qty_reserved: 0 }],
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Mechanical Gaming Keyboard',
    sku: 'MGK-002',
    barcode: '8901234567891',
    product_type: 'variant',
    is_active: true,
    categories: { id: 'cat-1', name: 'Electronics' },
    brands: { id: 'brand-2', name: 'Corsair' },
    created_at: '2026-03-02T10:00:00Z',
    product_variants: [
      {
        id: 'var-2',
        sku: 'MGK-002-RED',
        stock_balances: [{ qty_available: 3, qty_on_hand: 3, qty_reserved: 0 }],
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'USB-C Fast Cable',
    sku: 'UFC-003',
    barcode: '8901234567892',
    product_type: 'simple',
    is_active: false,
    categories: { id: 'cat-2', name: 'Accessories' },
    brands: { id: 'brand-3', name: 'Anker' },
    created_at: '2026-03-03T10:00:00Z',
    product_variants: [
      {
        id: 'var-3',
        sku: 'UFC-003-WHT',
        stock_balances: [{ qty_available: 0, qty_on_hand: 0, qty_reserved: 0 }],
      },
    ],
  },
]

describe('Products Table Enhancements', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ProductsProvider>{ui}</ProductsProvider>
      </QueryClientProvider>
    )

  describe('Column Definitions & Price Removal', () => {
    const mockT = ((key: string, opts?: any) => opts?.defaultValue || key) as any
    const cols = getColumns(mockT)

    it('does NOT include a price column', () => {
      const priceCol = cols.find((c) => c.id === 'price' || (c as any).accessorKey === 'price')
      expect(priceCol).toBeUndefined()
    })

    it('contains name, sku, category, brand, stock, and status columns', () => {
      const columnIds = cols.map((c) => c.id || (c as any).accessorKey)
      expect(columnIds).toContain('name')
      expect(columnIds).toContain('sku')
      expect(columnIds).toContain('category')
      expect(columnIds).toContain('brand')
      expect(columnIds).toContain('stock')
      expect(columnIds).toContain('is_active')
      expect(columnIds).toContain('created_at')
    })

    it('configures stock column with numeric sorting', () => {
      const stockCol = cols.find((c) => c.id === 'stock') as any
      expect(stockCol).toBeDefined()
      expect(stockCol.sortingFn).toBe('basic')
      expect(typeof stockCol.accessorFn).toBe('function')
      expect(stockCol.accessorFn(mockProducts[0])).toBe(15)
    })
  })

  describe('Stock Computation & Status', () => {
    it('correctly calculates total available stock across variants', () => {
      expect(computeTotalStock(mockProducts[0])).toBe(15)
      expect(computeTotalStock(mockProducts[1])).toBe(3)
      expect(computeTotalStock(mockProducts[2])).toBe(0)
    })

    it('correctly classifies stock status into in_stock, low_stock, and out_of_stock', () => {
      expect(getStockStatus(mockProducts[0])).toBe('in_stock') // 15 > threshold 5
      expect(getStockStatus(mockProducts[1])).toBe('low_stock') // 3 <= threshold 5
      expect(getStockStatus(mockProducts[2])).toBe('out_of_stock') // 0
    })
  })

  describe('ProductsStats KPI Component', () => {
    it('renders KPI summary cards with counts', () => {
      const onSelect = vi.fn()
      renderWithProviders(
        <ProductsStats
          data={mockProducts}
          activeQuickFilter={null}
          onQuickFilterSelect={onSelect}
        />
      )

      expect(screen.getByText('Total Products')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // 3 total
      expect(screen.getByText('In Stock')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // 2 in stock
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument()
      expect(screen.getAllByText('1')).toHaveLength(2) // 1 low stock and 1 out of stock
      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('triggers onQuickFilterSelect when clicking a KPI card', async () => {
      const onSelect = vi.fn()
      renderWithProviders(
        <ProductsStats
          data={mockProducts}
          activeQuickFilter={null}
          onQuickFilterSelect={onSelect}
        />
      )

      const lowStockCard = screen.getByText('Low Stock Alert')
      await userEvent.click(lowStockCard)
      expect(onSelect).toHaveBeenCalledWith('low_stock')
    })
  })

  describe('ProductsTable Component', () => {
    it('renders table headers and rows without any price column', () => {
      renderWithProviders(<ProductsTable data={mockProducts} />)

      // Verify price column header is absent
      expect(screen.queryByText(/^Price$/i)).not.toBeInTheDocument()

      // Verify product rows render
      expect(screen.getByText('Wireless Ergonomic Mouse')).toBeInTheDocument()
      expect(screen.getByText('Mechanical Gaming Keyboard')).toBeInTheDocument()
      expect(screen.getByText('USB-C Fast Cable')).toBeInTheDocument()
    })

    it('renders quick filter pills with badges', () => {
      renderWithProviders(<ProductsTable data={mockProducts} />)

      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /In Stock/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Low Stock/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Out of Stock/i })).toBeInTheDocument()
    })

    it('renders sorting and export controls', () => {
      renderWithProviders(<ProductsTable data={mockProducts} />)

      // Verify Export button
      expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
    })
  })

  describe('SearchableSelect Component (Brand and Supplier Dropdowns)', () => {
    it('renders placeholder and opens searchable options on click', async () => {
      const onChange = vi.fn()
      const options = [
        { id: 'b-1', name: 'Apple', code: 'AAPL' },
        { id: 'b-2', name: 'Samsung', code: 'SMSN' },
        { id: 'b-3', name: 'Sony', code: 'SNY' },
      ]

      const { SearchableSelect } = await import(
        '@/components/custom-ui/searchable-select'
      )

      render(
        <SearchableSelect
          value={null}
          onChange={onChange}
          options={options}
          placeholder='Select brand'
          searchPlaceholder='Search brand...'
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Select brand')

      await userEvent.click(trigger)

      expect(screen.getByPlaceholderText('Search brand...')).toBeInTheDocument()
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('Samsung')).toBeInTheDocument()
      expect(screen.getByText('Sony')).toBeInTheDocument()

      // Select an option
      await userEvent.click(screen.getByText('Samsung'))
      expect(onChange).toHaveBeenCalledWith('b-2')
    })
    it('renders bilingual options with Arabic and English names and filters correctly', async () => {
      const onChange = vi.fn()
      const options = [
        { id: 'cat-1', name: 'Hot Beverages', name_ar: 'المشروبات الساخنة', description: 'Root Category' },
        { id: 'cat-2', name: 'Cold Beverages', name_ar: 'المشروبات الباردة', description: 'Root Category' },
        { id: 'cat-3', name: 'Espresso', name_ar: 'إسبريسو', description: 'Hot Beverages › Espresso' },
      ]

      const { SearchableSelect } = await import(
        '@/components/custom-ui/searchable-select'
      )

      const { rerender } = render(
        <SearchableSelect
          value={null}
          onChange={onChange}
          options={options}
          placeholder='Select category'
          searchPlaceholder='Search category...'
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Select category')

      await userEvent.click(trigger)

      // Verify both English and Arabic names are rendered
      expect(screen.getByText('Hot Beverages')).toBeInTheDocument()
      expect(screen.getByText('المشروبات الساخنة')).toBeInTheDocument()
      expect(screen.getByText('Cold Beverages')).toBeInTheDocument()
      expect(screen.getByText('المشروبات الباردة')).toBeInTheDocument()
      expect(screen.getByText('Espresso')).toBeInTheDocument()
      expect(screen.getByText('إسبريسو')).toBeInTheDocument()

      // Filter by Arabic name
      const searchInput = screen.getByPlaceholderText('Search category...')
      await userEvent.type(searchInput, 'إسبريسو')
      expect(screen.getByText('Espresso')).toBeInTheDocument()
      expect(screen.queryByText('Cold Beverages')).not.toBeInTheDocument()

      // Select the filtered option
      await userEvent.click(screen.getByText('Espresso'))
      expect(onChange).toHaveBeenCalledWith('cat-3')

      // Rerender with selected value to verify trigger displays both names
      rerender(
        <SearchableSelect
          value='cat-3'
          onChange={onChange}
          options={options}
          placeholder='Select category'
          searchPlaceholder='Search category...'
        />
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Espresso')
      expect(screen.getByRole('combobox')).toHaveTextContent('إسبريسو')
    })

    it('formatCategorySearchableOptions formats categories with hierarchy and Arabic names', async () => {
      const { formatCategorySearchableOptions } = await import(
        '@/features/products/hooks/use-product-options'
      )

      const rawCategories = [
        { id: 'c-1', name: 'Beverages', name_ar: 'المشروبات', parent_id: null },
        { id: 'c-2', name: 'Coffee', name_ar: 'قهوة', parent_id: 'c-1' },
      ]

      const formatted = formatCategorySearchableOptions(rawCategories)
      expect(formatted).toHaveLength(2)
      expect(formatted[0]).toEqual({
        id: 'c-1',
        name: 'Beverages',
        name_ar: 'المشروبات',
        description: undefined,
      })
      expect(formatted[1].id).toBe('c-2')
      expect(formatted[1].name).toBe('Coffee')
      expect(formatted[1].name_ar).toBe('قهوة')
      expect(formatted[1].description).toContain('Beverages')
      expect(formatted[1].description).toContain('المشروبات')
    })

    it('formatUomSearchableOptions formats UOMs with code and category', async () => {
      const { formatUomSearchableOptions } = await import(
        '@/features/products/hooks/use-product-options'
      )

      const rawUoms = [
        { id: 'u-1', name: 'Kilogram', code: 'kg', uom_category: 'Weight' },
        { id: 'u-2', name: 'Piece', code: 'pc' },
      ]

      const formatted = formatUomSearchableOptions(rawUoms)
      expect(formatted).toHaveLength(2)
      expect(formatted[0].id).toBe('u-1')
      expect(formatted[0].name).toBe('Kilogram')
      expect(formatted[0].description).toBe('Kilogram (kg) • Weight')
      expect(formatted[1].description).toBe('Piece (pc)')
    })

    it('formatSupplierSearchableOptions formats suppliers with code', async () => {
      const { formatSupplierSearchableOptions } = await import(
        '@/features/products/hooks/use-product-options'
      )

      const rawSuppliers = [
        { id: 's-1', name: 'Juhayna Food Industries', code: 'JUH' },
        { id: 's-2', name: 'Americana Group', code: null },
      ]

      const formatted = formatSupplierSearchableOptions(rawSuppliers)
      expect(formatted).toHaveLength(2)
      expect(formatted[0].id).toBe('s-1')
      expect(formatted[0].description).toBe('Juhayna Food Industries (JUH)')
      expect(formatted[1].description).toBe('Americana Group')
    })
  })

  describe('Server-Side Pagination & Search in ProductsTable', () => {
    it('supports server-side mode with manual pagination and invokes callbacks', async () => {
      const onPageChange = vi.fn()
      const onPageSizeChange = vi.fn()
      const onSearchChange = vi.fn()

      renderWithProviders(
        <ProductsTable
          data={mockProducts}
          totalCount={300}
          page={1}
          pageSize={20}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSearchChange={onSearchChange}
        />
      )

      // Verify page count text displays server-side total: Page 1 of 15 (300 / 20 = 15)
      expect(screen.getByText(/Page 1 of 15/i)).toBeInTheDocument()

      // Click next page button
      const nextBtn = screen.getByRole('button', { name: /Go to next page/i })
      await userEvent.click(nextBtn)
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('renders View Mode toggle buttons and allows switching to Grid View', async () => {
      renderWithProviders(
        <ProductsTable
          data={mockProducts}
          totalCount={3}
          page={1}
          pageSize={20}
        />
      )

      // Find Grid View button
      const gridBtn = screen.getByTitle('Grid View')
      expect(gridBtn).toBeInTheDocument()

      // Switch to Grid View
      await userEvent.click(gridBtn)

      // Verify products are still visible in Card View
      expect(screen.getByText('Wireless Ergonomic Mouse')).toBeInTheDocument()
      expect(screen.getByText('Mechanical Gaming Keyboard')).toBeInTheDocument()
      expect(screen.getByText('USB-C Fast Cable')).toBeInTheDocument()
    })

    it('renders Mobile Filter Drawer trigger button with badge count', () => {
      renderWithProviders(
        <ProductsTable
          data={mockProducts}
          selectedCategory='cat-1'
          selectedBrand='brand-1'
        />
      )

      // Verify Filters trigger button
      const filterBtn = screen.getByRole('button', { name: /Filters/i })
      expect(filterBtn).toBeInTheDocument()
      // Badge count 2 on the filter button
      expect(filterBtn).toHaveTextContent('2')
    })
  })
})
