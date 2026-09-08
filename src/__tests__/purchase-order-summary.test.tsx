import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  POSummaryDialog,
  type POSummaryDraftData,
} from '@/features/purchase-orders/components/po-summary-dialog'
import { POProvider } from '@/features/purchase-orders/components/po-provider'
import {
  POProductVariantPicker,
  POProductSelect,
  POVariantSelect,
} from '@/features/purchase-orders/components/po-product-variant-picker'
import { type Product } from '@/features/products/data/schema'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user' },
  }),
}))

const queryClient = new QueryClient()

describe('Purchase Order Summary Modal & Product Variant Picker', () => {
  const sampleDraftData: POSummaryDraftData = {
    supplierId: '101',
    supplierName: 'Acme Coffee Suppliers',
    orderDate: '2026-09-10',
    expectedDeliveryDate: '2026-09-15',
    notes: 'Please deliver to loading dock #2 with refrigeration.',
    items: [
      {
        productId: 1,
        productName: 'Organic Espresso Beans',
        productSku: 'ESP-ORG-01',
        variantId: 'var-1',
        variantSku: 'ESP-1KG',
        variantLabel: '1kg Bag',
        uomId: 'uom-1',
        uomCode: 'kg',
        uomName: 'Kilogram',
        quantity: 10,
        unitCost: 15.5,
        subtotal: 155.0,
      },
      {
        productId: 2,
        productName: 'Oat Milk Barista Edition',
        productSku: 'OAT-BAR-01',
        variantId: 'var-2',
        variantSku: 'OAT-1L-CASE',
        variantLabel: '1L Case (12 pack)',
        uomId: 'uom-2',
        uomCode: 'carton',
        uomName: 'Carton',
        quantity: 5,
        unitCost: 24.0,
        subtotal: 120.0,
      },
    ],
    totalAmount: 275.0,
  }

  test('POSummaryDialog renders in draft review mode with KPI metrics and line items', () => {
    const onConfirmMock = vi.fn()
    const onOpenChangeMock = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <POProvider>
          <POSummaryDialog
            open={true}
            onOpenChange={onOpenChangeMock}
            draftData={sampleDraftData}
            onConfirmDraftSubmit={onConfirmMock}
          />
        </POProvider>
      </QueryClientProvider>
    )

    // Check header and PO number badge
    expect(screen.getByText('Purchase Order Summary')).toBeInTheDocument()
    expect(screen.getByText('DRAFT PREVIEW')).toBeInTheDocument()

    // Check supplier details
    expect(screen.getByText('Acme Coffee Suppliers')).toBeInTheDocument()

    // Check KPIs
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Total Units')).toBeInTheDocument()
    expect(screen.getByText('$275.00')).toBeInTheDocument()

    // Check line items table and UOM
    expect(screen.getByText('UOM')).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('carton')).toBeInTheDocument()
    expect(screen.getByText('Organic Espresso Beans')).toBeInTheDocument()
    expect(screen.getByText('ESP-1KG')).toBeInTheDocument()
    expect(screen.getByText('Oat Milk Barista Edition')).toBeInTheDocument()
    expect(screen.getByText('OAT-1L-CASE')).toBeInTheDocument()

    // Check notes
    expect(
      screen.getByText('Please deliver to loading dock #2 with refrigeration.')
    ).toBeInTheDocument()

    // Click confirm button
    const confirmBtn = screen.getByRole('button', {
      name: /confirm & create order/i,
    })
    expect(confirmBtn).toBeInTheDocument()
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).toHaveBeenCalledTimes(1)

    // Click back to edit button
    const backBtn = screen.getByRole('button', { name: /back to edit/i })
    expect(backBtn).toBeInTheDocument()
    fireEvent.click(backBtn)
    expect(onOpenChangeMock).toHaveBeenCalledWith(false)
  })

  test('POProductVariantPicker displays product and variant information', () => {
    const products: Product[] = [
      {
        name: 'Single Origin Coffee',
        sku: 'SOC-01',
        is_active: true,
        product_type: 'simple',
        tracking_mode: 'none',
        is_stock_item: true,
        reorderable: true,
        has_variants: true,
        is_deleted: false,
        product_id: 1,
      },
    ]

    const variantsMap = new Map([
      [
        1,
        [
          {
            id: 'v-100',
            sku: 'SOC-ROAST-MED',
            attributes_label: 'Medium Roast',
            price: 20,
            cost_price: 12.5,
            stock_quantity: 45,
          },
        ],
      ],
    ])

    const onSelectProductMock = vi.fn()
    const onSelectVariantMock = vi.fn()

    render(
      <POProductVariantPicker
        productId={1}
        variantId='v-100'
        products={products}
        variantsByProductId={variantsMap}
        onSelectProduct={onSelectProductMock}
        onSelectVariant={onSelectVariantMock}
      />
    )

    // Verify selected product name and SKU are displayed
    expect(screen.getByText('Single Origin Coffee')).toBeInTheDocument()
    expect(screen.getByText('(SOC-01)')).toBeInTheDocument()

    // Verify variant SKU and cost info are rendered
    expect(screen.getByText('SOC-ROAST-MED')).toBeInTheDocument()
    expect(screen.getByText(/Default Cost: \$12\.50/i)).toBeInTheDocument()
  })

  test('POVariantSelect shows disabled state with placeholder when no product is selected', () => {
    const onSelectVariantMock = vi.fn()
    render(
      <POVariantSelect
        productId=''
        variantId={null}
        variants={[]}
        onSelectVariant={onSelectVariantMock}
      />
    )

    expect(screen.getByText('Select product first')).toBeInTheDocument()
    const button = screen.getByRole('combobox')
    expect(button).toBeDisabled()
  })

  test('POProductSelect and POVariantSelect operate as 2 separate dropdowns with UUIDs', () => {
    const uuidProdId = '1796a5fa-29f1-4cd5-96bf-16f7995aab05'
    const uuidVarId = '23b60c46-c170-4059-a574-7d8f31903be3'

    const products: Product[] = [
      {
        id: uuidProdId,
        product_id: uuidProdId,
        name: 'Whole Milk',
        sku: 'ML-01',
        is_active: true,
        product_type: 'simple',
        tracking_mode: 'none',
        is_stock_item: true,
        reorderable: true,
        has_variants: true,
        is_deleted: false,
      },
    ]

    const variantsMap = new Map([
      [
        uuidProdId,
        [
          {
            id: uuidVarId,
            sku: 'ML-1-V1',
            name: '1 Litre',
            price: 5.0,
            cost_price: 3.5,
            stock_quantity: 100,
          },
        ],
      ],
    ])

    const onSelectProductMock = vi.fn()
    const onSelectVariantMock = vi.fn()

    const { rerender } = render(
      <div className='flex gap-2'>
        <POProductSelect
          productId={uuidProdId}
          products={products}
          variantsByProductId={variantsMap}
          onSelectProduct={onSelectProductMock}
        />
        <POVariantSelect
          productId={uuidProdId}
          variantId={uuidVarId}
          variants={variantsMap.get(uuidProdId)!}
          onSelectVariant={onSelectVariantMock}
        />
      </div>
    )

    // Separate Product Dropdown displays selected product name and SKU
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText('(ML-01)')).toBeInTheDocument()

    // Separate Variant Dropdown displays selected variant SKU and name
    expect(screen.getByText('ML-1-V1')).toBeInTheDocument()
    expect(screen.getByText('(1 Litre)')).toBeInTheDocument()

    // Variant Dropdown is NOT disabled when product is selected
    const triggers = screen.getAllByRole('combobox')
    expect(triggers).toHaveLength(2)
    expect(triggers[0]).not.toBeDisabled()
    expect(triggers[1]).not.toBeDisabled()
  })
})

