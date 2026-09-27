import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  POProductSelect,
  POVariantSelect,
  type VariantOption,
} from '@/features/purchase-orders/components/po-product-variant-picker'
import { useDebounce } from '@/features/purchase-orders/hooks/use-po-product-search'
import * as poSearchHooks from '@/features/purchase-orders/hooks/use-po-product-search'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal: string, opts?: Record<string, unknown>) => {
      let res = defaultVal || _key
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          res = res.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
        }
      }
      return res
    },
    i18n: { language: 'en' },
  }),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'test-user' },
  }),
}))

describe('Purchase Order Server-Driven Product Search & On-Demand Variants', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  test('useDebounce hook updates value after delay', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ val, delay }) => useDebounce(val, delay),
      { initialProps: { val: 'initial', delay: 300 } }
    )

    expect(result.current).toBe('initial')

    rerender({ val: 'updated', delay: 300 })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('updated')
    vi.useRealTimers()
  })

  test('POProductSelect displays pre-resolved selectedProductInfo instantly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <POProductSelect
          productId='prod-123'
          selectedProductInfo={{
            name: 'Colombian Roast Coffee',
            sku: 'COF-COL-01',
          }}
          onSelectProduct={vi.fn()}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Colombian Roast Coffee')).toBeInTheDocument()
    expect(screen.getByText('(COF-COL-01)')).toBeInTheDocument()
  })

  test('POProductSelect in server mode renders search input and results', async () => {
    const mockProducts = [
      {
        id: 'p-1',
        name: 'Whole Milk Organic',
        sku: 'MLK-01',
        categories: { id: 'c-1', name: 'Dairy' },
        product_variants: [{ id: 'v-1' }, { id: 'v-2' }],
      },
      {
        id: 'p-2',
        name: 'Single Variant Bread',
        sku: 'BRD-01',
        categories: { id: 'c-2', name: 'Bakery' },
        product_variants: [{ id: 'v-3' }],
      },
    ]

    vi.spyOn(poSearchHooks, 'usePOProductSearch').mockReturnValue({
      products: mockProducts,
      totalCount: 2,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetching: false,
      isFetchingNextPage: false,
      isLoading: false,
    } as unknown as ReturnType<typeof poSearchHooks.usePOProductSearch>)

    const onSelectProductMock = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <POProductSelect
          productId={null}
          onSelectProduct={onSelectProductMock}
        />
      </QueryClientProvider>
    )

    // Open combobox popover
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    // Verify search input is present
    expect(
      screen.getByPlaceholderText('Search product by name or SKU...')
    ).toBeInTheDocument()

    // Verify products are rendered with variant counts and categories
    expect(screen.getByText('Whole Milk Organic')).toBeInTheDocument()
    expect(screen.getByText('MLK-01')).toBeInTheDocument()
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getByText('2 variants')).toBeInTheDocument()

    expect(screen.getByText('Single Variant Bread')).toBeInTheDocument()
    expect(screen.getByText('1 variant')).toBeInTheDocument()

    // Select a product
    fireEvent.click(screen.getByText('Whole Milk Organic'))
    expect(onSelectProductMock).toHaveBeenCalledWith('p-1', mockProducts[0])
  })

  test('POVariantSelect shows disabled state when no product is selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <POVariantSelect
          productId={null}
          variantId={null}
          onSelectVariant={vi.fn()}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Select product first')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  test('POVariantSelect shows no variants configured when product has 0 variants', () => {
    vi.spyOn(poSearchHooks, 'usePOVariants').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof poSearchHooks.usePOVariants>)

    render(
      <QueryClientProvider client={queryClient}>
        <POVariantSelect
          productId='prod-zero'
          variantId={null}
          onSelectVariant={vi.fn()}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('No variants configured')).toBeInTheDocument()
  })

  test('POVariantSelect auto-selects single variant and populates cost price', async () => {
    const singleVariant: VariantOption = {
      id: 'var-only-1',
      sku: 'SINGLE-VAR-SKU',
      name: 'Standard Package',
      price: 15.0,
      cost_price: 9.5,
      stock_quantity: 50,
    }

    vi.spyOn(poSearchHooks, 'usePOVariants').mockReturnValue({
      data: [singleVariant],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof poSearchHooks.usePOVariants>)

    const onSelectVariantMock = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <POVariantSelect
          productId='prod-single'
          variantId={null}
          onSelectVariant={onSelectVariantMock}
        />
      </QueryClientProvider>
    )

    // Should automatically call onSelectVariant with id and cost price
    await waitFor(() => {
      expect(onSelectVariantMock).toHaveBeenCalledWith(
        'var-only-1',
        9.5,
        singleVariant
      )
    })
  })

  test('POVariantSelect renders multiple variants and user can pick one', () => {
    const mockVariants: VariantOption[] = [
      {
        id: 'var-1',
        sku: 'VAR-1KG',
        attributes_label: '1kg pack',
        price: 20.0,
        cost_price: 12.0,
        stock_quantity: 10,
      },
      {
        id: 'var-2',
        sku: 'VAR-500G',
        attributes_label: '500g pack',
        price: 11.0,
        cost_price: 6.5,
        stock_quantity: 25,
      },
    ]

    render(
      <QueryClientProvider client={queryClient}>
        <POVariantSelect
          productId='prod-multi'
          variantId='var-1'
          variants={mockVariants}
          onSelectVariant={vi.fn()}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('VAR-1KG')).toBeInTheDocument()
    expect(screen.getByText('(1kg pack)')).toBeInTheDocument()
  })
})
