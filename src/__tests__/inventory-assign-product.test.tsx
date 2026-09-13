import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InventoryActionDialog } from '@/features/inventory/components/inventory-action-dialog'
import { type Inventory } from '@/features/inventory/data/schema'

const mockCreateMutateAsync = vi.fn().mockResolvedValue({ inventory_id: 101 })
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ inventory_id: 102 })

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return key
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockProducts = [
  { id: 'prod-1', name: 'Cotton T-Shirt', sku: 'TSHIRT-01', has_variants: true },
  { id: 'prod-2', name: 'Wireless Mouse', sku: 'MOUSE-02', has_variants: false },
]

const mockVariantsProd1 = [
  {
    id: 'var-1',
    product_id: 'prod-1',
    sku: 'TSHIRT-RED-L',
    name: 'Red / Large',
    barcode: '123456789012',
    price: 29.99,
    weight: 0.25,
    is_active: true,
    attributes_label: 'Color: Red / Size: L',
  },
  {
    id: 'var-2',
    product_id: 'prod-1',
    sku: 'TSHIRT-BLU-M',
    name: 'Blue / Medium',
    barcode: '123456789013',
    price: 27.99,
    weight: 0.22,
    is_active: true,
    attributes_label: 'Color: Blue / Size: M',
  },
]

const mockStores = [
  { store_id: 'store-cairo', name: 'Cairo Downtown Store' },
  { store_id: 'store-alex', name: 'Alexandria Mall Store' },
]

const mockWarehouses = [
  { id: 'wh-main', code: 'MAIN', name: 'Central Global Hub', is_default: true, is_active: true },
  { id: 'wh-cairo', code: 'WH-CAI', name: 'Cairo Logistics Center', is_default: false, is_active: true },
  { id: 'wh-alex', code: 'WH-ALX', name: 'Alexandria Coastal Depot', is_default: false, is_active: true },
]

const mockStoreWarehousesCairo = [
  {
    id: 'sw-1',
    store_id: 'store-cairo',
    warehouse_id: 'wh-cairo',
    is_default: true,
    priority: 1,
    warehouses: { id: 'wh-cairo', code: 'WH-CAI', name: 'Cairo Logistics Center', is_default: false, is_active: true },
  },
]

const mockLocationsCairo = [
  {
    id: 'loc-1',
    code: 'BIN-A1',
    name: 'Apparel Rack A1',
    location_type: 'bin',
    path: 'Zone A > Rack 1 > Bin A1',
    is_pickable: true,
    is_receivable: true,
  },
  {
    id: 'loc-2',
    code: 'SHELF-B2',
    name: 'Bulk Shelf B2',
    location_type: 'shelf',
    path: 'Zone B > Shelf 2',
    is_pickable: true,
    is_receivable: false,
  },
]

vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useCreateInventory: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateInventory: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useInventoryProducts: () => ({
    data: mockProducts,
    isLoading: false,
  }),
  useProductVariants: (productId?: string) => ({
    data: productId === 'prod-1' ? mockVariantsProd1 : [],
    isLoading: false,
  }),
  useStores: () => ({
    data: mockStores,
    isLoading: false,
  }),
  useWarehouses: () => ({
    data: mockWarehouses,
    isLoading: false,
  }),
  useStoreWarehouses: (storeId?: string) => ({
    data: storeId === 'store-cairo' ? mockStoreWarehousesCairo : [],
    isLoading: false,
  }),
  useWarehouseLocations: (warehouseId?: string) => ({
    data: warehouseId === 'wh-cairo' ? mockLocationsCairo : [],
    isLoading: false,
  }),
  useStockBalancesForProduct: () => ({
    data: {
      items: [],
      metrics: { totalOnHand: 0, totalReserved: 0, totalAvailable: 0 },
      inSelectedLocation: { onHand: 0, available: 0, reserved: 0 },
      warehouseStock: { onHand: 0, available: 0, reserved: 0 },
      storeStock: { onHand: 0, available: 0, reserved: 0 },
      stockByWarehouse: {},
    },
    isLoading: false,
  }),
}))

describe('Assign Product to Inventory Dialog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('renders the dialog with header and fields in add mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Assign Product to Inventory')).toBeInTheDocument()
    expect(screen.getByText('Product & Variant Selection')).toBeInTheDocument()
    expect(screen.getByText('Storage Facility & Warehouse Route')).toBeInTheDocument()
    expect(screen.getByText('Safety Stock & Replenishment Policies')).toBeInTheDocument()
  })

  it('renders in edit mode with currentRow live stock status and pre-populated fields', () => {
    const editRow: Inventory = {
      inventory_id: 55,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
      reorder_point: 15,
      min_quantity: 15,
      max_quantity: 250,
      safety_stock: 5,
      reorder_quantity: 50,
      unit_cost: 18.5,
      lead_time_days: 3,
      aisle: 'A1',
      rack: 'R2',
      shelf: 'S3',
      bin: 'B4',
      qty_on_hand: 80,
      qty_available: 70,
      qty_reserved: 10,
      condition: 'good',
      last_count_date: '2026-09-10',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRow} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Edit Inventory Settings')).toBeInTheDocument()
    expect(screen.getByText('Live Stock Balance (from stock_balances)')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('renders variant overview card when an edit row has a variant selected', () => {
    const editRowWithVariant: Inventory = {
      inventory_id: 88,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
      reorder_point: 20,
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRowWithVariant} />
      </QueryClientProvider>
    )

    // Should display selected variant card
    expect(screen.getAllByText('Red / Large').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('TSHIRT-RED-L').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Color: Red / Size: L').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('123456789012')).toBeInTheDocument()
    expect(screen.getAllByText('$29.99').length).toBeGreaterThanOrEqual(1)
  })

  it('renders selected location overview card when warehouse location is assigned', () => {
    const editRowWithLoc: Inventory = {
      inventory_id: 99,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRowWithLoc} />
      </QueryClientProvider>
    )

    expect(screen.getAllByText('Apparel Rack A1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BIN-A1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Zone A > Rack 1 > Bin A1')).toBeInTheDocument()
    expect(screen.getByText('Pickable')).toBeInTheDocument()
    expect(screen.getByText('Receivable')).toBeInTheDocument()
  })

  it('displays standard product banner when editing or selecting a product without variants', () => {
    const simpleProductRow: Inventory = {
      inventory_id: 42,
      product_id: 'prod-2',
      product_variant_id: null,
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={simpleProductRow} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Standard Catalog Product')).toBeInTheDocument()
    expect(
      screen.getByText('This product has no variants. Inventory is tracked directly on the base SKU.')
    ).toBeInTheDocument()
  })

  it('renders store connected warehouse logistics route and fulfillment preview', () => {
    const editRowWithStore: Inventory = {
      inventory_id: 103,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRowWithStore} />
      </QueryClientProvider>
    )

    // Verify store route banner and warehouse preview card
    expect(screen.getByText('Cairo Downtown Store Logistics Route')).toBeInTheDocument()
    expect(screen.getAllByText('Cairo Logistics Center').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('WH-CAI').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Store Primary Hub')).toBeInTheDocument()
  })

  it('submits enhanced inventory model fields including coordinates and safety stock', async () => {
    const user = userEvent.setup()
    const editRow: Inventory = {
      inventory_id: 104,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
      reorder_point: 20,
      safety_stock: 12,
      reorder_quantity: 100,
      unit_cost: 25.5,
      lead_time_days: 5,
      aisle: 'Aisle-3',
      rack: 'Rack-7',
      shelf: 'Shelf-B',
      bin: 'Bin-42',
      notes: 'Fragile apparel goods handle with care',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRow} />
      </QueryClientProvider>
    )

    const submitBtn = screen.getByRole('button', { name: 'Save Changes' })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory_id: 104,
          product_id: 'prod-1',
          product_variant_id: 'var-1',
          store_id: 'store-cairo',
          warehouse_id: 'wh-cairo',
          warehouse_location_id: 'loc-1',
          safety_stock: 12,
          reorder_quantity: 100,
          unit_cost: 25.5,
          lead_time_days: 5,
          aisle: 'Aisle-3',
          rack: 'Rack-7',
          shelf: 'Shelf-B',
          bin: 'Bin-42',
          notes: 'Fragile apparel goods handle with care',
        })
      )
    })
  })
})

