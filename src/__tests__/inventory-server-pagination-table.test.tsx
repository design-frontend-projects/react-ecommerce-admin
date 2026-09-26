import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InventoryTable } from '@/features/inventory/components/inventory-table'
import { InventoryKpiCards } from '@/features/inventory/components/inventory-kpi-cards'
import { InventoryProvider } from '@/features/inventory/components/inventory-provider'
import type { Inventory, InventoryMetrics } from '@/features/inventory/data/schema'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, defaultVal?: string | { defaultValue?: string }) => {
        if (typeof defaultVal === 'string') return defaultVal
        return defaultVal?.defaultValue || key
      },
      i18n: { language: 'en' },
    }),
  }
})

vi.mock('@/components/rbac/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useWarehouses: () => ({
    data: [
      { id: 'wh-1', code: 'MAIN', name: 'Main Central Warehouse' },
      { id: 'wh-2', code: 'EAST', name: 'East Coast Depot' },
    ],
    isLoading: false,
  }),
}))

const mockInventoryData: Inventory[] = [
  {
    id: 'inv-1',
    inventory_id: 'inv-1',
    tenant_id: 'tenant-123',
    product_variant_id: 'var-1',
    product_id: 'prod-1',
    sku: 'INV-TSHIRT-BLK-S',
    barcode: '111222333444',
    is_stockable: true,
    is_sellable: true,
    is_purchasable: true,
    tracking_type: 'NONE',
    status: 'ACTIVE',
    is_active: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    qty_on_hand: 50,
    qty_available: 45,
    qty_reserved: 5,
    avg_cost: 15.5,
    reorder_point: 20,
    min_quantity: 10,
    products: {
      id: 'prod-1',
      name: 'Organic Cotton T-Shirt',
      sku: 'TSHIRT-CORE',
    },
    product_variants: {
      id: 'var-1',
      name: 'Black / Small',
      sku: 'TSHIRT-BLK-S',
    },
    warehouses: {
      id: 'wh-1',
      code: 'MAIN',
      name: 'Main Central Warehouse',
    },
  },
  {
    id: 'inv-2',
    inventory_id: 'inv-2',
    tenant_id: 'tenant-123',
    product_variant_id: 'var-2',
    product_id: 'prod-1',
    sku: 'INV-TSHIRT-BLK-M',
    barcode: '111222333445',
    is_stockable: true,
    is_sellable: true,
    is_purchasable: true,
    tracking_type: 'NONE',
    status: 'ACTIVE',
    is_active: true,
    created_at: '2026-09-02T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
    qty_on_hand: 5,
    qty_available: 5,
    qty_reserved: 0,
    avg_cost: 16.0,
    reorder_point: 10,
    min_quantity: 10,
    products: {
      id: 'prod-1',
      name: 'Organic Cotton T-Shirt',
      sku: 'TSHIRT-CORE',
    },
    product_variants: {
      id: 'var-2',
      name: 'Black / Medium',
      sku: 'TSHIRT-BLK-M',
    },
    warehouses: {
      id: 'wh-1',
      code: 'MAIN',
      name: 'Main Central Warehouse',
    },
  },
]

describe('Inventory Table Server-Side Pagination & Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers, rows, and pagination controls with server pagination props', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <InventoryProvider>
        <InventoryTable
          data={mockInventoryData}
          totalCount={100}
          totalPages={5}
          page={1}
          pageSize={20}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isServer={true}
        />
      </InventoryProvider>
    )

    // Verify row contents render
    expect(screen.getAllByText('Organic Cotton T-Shirt').length).toBe(2)
    expect(screen.getByText('INV-TSHIRT-BLK-S')).toBeDefined()
    expect(screen.getByText('INV-TSHIRT-BLK-M')).toBeDefined()

    // Verify pagination page text "Page 1 of 5"
    expect(screen.getByText(/Page 1 of 5/i)).toBeDefined()
  })

  it('triggers debounced onSearchChange when user types in search input', async () => {
    const onSearchChange = vi.fn()

    render(
      <InventoryProvider>
        <InventoryTable
          data={mockInventoryData}
          totalCount={2}
          totalPages={1}
          page={1}
          pageSize={20}
          search=''
          onSearchChange={onSearchChange}
          isServer={true}
        />
      </InventoryProvider>
    )

    const searchInput = screen.getByPlaceholderText(/Search product name, SKU, variant.../i)
    fireEvent.change(searchInput, { target: { value: 'Organic' } })

    // Wait for 300ms debounce
    await waitFor(
      () => {
        expect(onSearchChange).toHaveBeenCalledWith('Organic')
      },
      { timeout: 1000 }
    )
  })

  it('renders global metrics correctly in InventoryKpiCards', () => {
    const mockMetrics: InventoryMetrics = {
      totalItems: 450,
      inStockCount: 380,
      lowStockCount: 45,
      outOfStockCount: 25,
      totalValuation: 125000,
      withVariantsCount: 410,
    }

    render(
      <InventoryProvider>
        <InventoryKpiCards data={mockInventoryData} metrics={mockMetrics} />
      </InventoryProvider>
    )

    // Should render global counts, not just length of mockInventoryData (2)
    expect(screen.getByText('450')).toBeDefined()
    expect(screen.getByText('380')).toBeDefined()
    expect(screen.getByText('45')).toBeDefined()
    expect(screen.getByText('25')).toBeDefined()
    expect(screen.getByText('$125,000')).toBeDefined()
    expect(screen.getByText(/410 Variants/i)).toBeDefined()
  })

  it('renders skeleton rows when isLoading is true and data is empty', () => {
    render(
      <InventoryProvider>
        <InventoryTable
          data={[]}
          totalCount={0}
          totalPages={1}
          page={1}
          pageSize={20}
          isLoading={true}
          isServer={true}
        />
      </InventoryProvider>
    )

    // Verify skeleton rows are rendered
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })
})
