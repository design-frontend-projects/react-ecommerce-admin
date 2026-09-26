import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InventoryActionDialog } from '@/features/inventory/components/inventory-action-dialog'
import { type Inventory } from '@/features/inventory/data/schema'

const mockCreateMutateAsync = vi.fn().mockResolvedValue({ id: 'inv-new-1', inventory_id: 101 })
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ id: 'inv-edit-1', inventory_id: 102 })

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

const mockUoms = [
  { id: 'uom-pcs', code: 'PCS', name: 'Pieces' },
  { id: 'uom-box', code: 'BOX', name: 'Box' },
]

const mockPaginatedVariants = {
  items: [
    {
      id: 'var-1',
      product_id: 'prod-1',
      sku: 'TSHIRT-RED-L',
      name: 'Red / Large',
      barcode: '123456789012',
      product_name: 'Cotton T-Shirt',
      brand_name: 'Antigravity Apparel',
      category_name: 'Apparel',
      price: 29.99,
      cost_price: 15.0,
      qty_on_hand: 50,
      qty_available: 45,
      qty_reserved: 5,
      is_assigned_to_inventory: false,
    },
    {
      id: 'var-2',
      product_id: 'prod-1',
      sku: 'TSHIRT-BLU-M',
      name: 'Blue / Medium',
      barcode: '123456789013',
      product_name: 'Cotton T-Shirt',
      brand_name: 'Antigravity Apparel',
      category_name: 'Apparel',
      price: 27.99,
      cost_price: 14.0,
      qty_on_hand: 20,
      qty_available: 20,
      qty_reserved: 0,
      is_assigned_to_inventory: true,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

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
  useProductVariantsPaginated: () => ({
    data: mockPaginatedVariants,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUomList: () => ({
    data: mockUoms,
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

describe('Assign Product Variant to Inventory Dialog', () => {
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

  it('renders the dialog with header and sections in add mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Assign Product Variant to Inventory')).toBeInTheDocument()
    expect(screen.getByText(/Product Variant \(Database Catalog\)/i)).toBeInTheDocument()
    expect(screen.getByText('Inventory Item Tracking & Policies')).toBeInTheDocument()
    expect(screen.getByText('Storage Facility & Warehouse Route')).toBeInTheDocument()
    expect(screen.getByText('Safety Stock & Replenishment Policies')).toBeInTheDocument()

    // Verify dialog takes 70%-80% screen width in medium and large screens
    const dialogContent = document.querySelector('[role="dialog"]')
    expect(dialogContent).toHaveClass('md:w-[80vw]')
    expect(dialogContent).toHaveClass('lg:w-[75vw]')
  })

  it('renders in edit mode with currentRow live stock status, locked badge, and pre-populated fields', () => {
    const editRow: Inventory = {
      id: 'inv-55',
      inventory_id: 55,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      sku: 'INV-TSHIRT-RED-L',
      barcode: '123456789012',
      tracking_type: 'NONE',
      is_stockable: true,
      is_sellable: true,
      is_purchasable: true,
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
      status: 'ACTIVE',
      is_active: true,
      last_count_date: '2026-09-10',
      product_variants: {
        id: 'var-1',
        sku: 'TSHIRT-RED-L',
        name: 'Red / Large',
        barcode: '123456789012',
        price: 29.99,
      },
      products: {
        id: 'prod-1',
        name: 'Cotton T-Shirt',
        sku: 'TSHIRT-01',
      },
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRow} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Edit Inventory Item')).toBeInTheDocument()
    expect(screen.getByText('Live Stock Status')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Locked in Edit Mode')).toBeInTheDocument()
    expect(screen.getByDisplayValue('INV-TSHIRT-RED-L')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('renders facility and warehouse route section with store and warehouse selection', () => {
    const editRowWithFacility: Inventory = {
      id: 'inv-99',
      inventory_id: 99,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      sku: 'INV-099',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} currentRow={editRowWithFacility} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Assigned Store')).toBeInTheDocument()
    expect(screen.getByText('Warehouse Facility')).toBeInTheDocument()
    expect(screen.getByText('Specific Bin / Storage Rack')).toBeInTheDocument()
  })

  it('submits updated inventory model fields including tracking policies and thresholds in edit mode', async () => {
    const user = userEvent.setup()
    const editRow: Inventory = {
      id: 'inv-104',
      inventory_id: 104,
      product_id: 'prod-1',
      product_variant_id: 'var-1',
      sku: 'INV-TSHIRT-RED-L',
      store_id: 'store-cairo',
      warehouse_id: 'wh-cairo',
      warehouse_location_id: 'loc-1',
      tracking_type: 'NONE',
      is_stockable: true,
      is_sellable: true,
      is_purchasable: true,
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
          id: 'inv-104',
          product_variant_id: 'var-1',
          sku: 'INV-TSHIRT-RED-L',
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

  it('opens variant table picker in add mode, selects a variant, and submits a new inventory item', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryActionDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )

    // Open table picker
    const pickerTrigger = screen.getByLabelText('Select Product Variant')
    expect(pickerTrigger).not.toBeDisabled()
    await user.click(pickerTrigger)

    // Table picker dialog should be open
    expect(screen.getByText('Select Product Variant')).toBeInTheDocument()
    expect(screen.getByText('TSHIRT-RED-L')).toBeInTheDocument()

    // Select the first available variant
    const selectButtons = screen.getAllByRole('button', { name: 'Select' })
    expect(selectButtons.length).toBeGreaterThanOrEqual(1)
    await user.click(selectButtons[0])

    // Verify selection populated SKU in form
    await waitFor(() => {
      expect(screen.getByDisplayValue('TSHIRT-RED-L')).toBeInTheDocument()
    })

    // Submit the form
    const registerBtn = screen.getByRole('button', { name: 'Register in Inventory' })
    await user.click(registerBtn)

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          product_variant_id: 'var-1',
          sku: 'TSHIRT-RED-L',
          barcode: '123456789012',
          is_stockable: true,
          is_sellable: true,
          is_purchasable: true,
          tracking_type: 'NONE',
        })
      )
    })
  })
})
