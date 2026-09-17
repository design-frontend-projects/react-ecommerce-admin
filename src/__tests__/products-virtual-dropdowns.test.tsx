import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VirtualSearchableSelect, type SearchableOption } from '@/components/custom-ui/virtual-searchable-select'
import { SearchableSelect } from '@/components/custom-ui/searchable-select'
import {
  formatCategorySearchableOptions,
  formatBrandSearchableOptions,
  type CategoryOption,
  type BrandOption,
} from '@/features/products/hooks/use-product-options'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
  }),
}))

const mockCategoryOptions: CategoryOption[] = [
  { id: 'cat-1', name: 'Beverages', name_ar: 'المشروبات', parent_id: null },
  { id: 'cat-2', name: 'Coffee', name_ar: 'قهوة', parent_id: 'cat-1' },
  { id: 'cat-3', name: 'Tea', name_ar: 'شاي', parent_id: 'cat-1' },
  { id: 'cat-4', name: 'Bakery', name_ar: 'المخبوزات', parent_id: null },
]

const mockBrandOptions: BrandOption[] = [
  { id: 'brand-1', name: 'Lavazza', name_ar: 'لافازا', code: 'LVZ' },
  { id: 'brand-2', name: 'Illy', name_ar: 'إيلي', code: 'ILLY' },
  { id: 'brand-3', name: 'Nestle', name_ar: 'نستله', code: 'NSTL' },
]

// Generate 120 categories to test virtualization & progressive chunking
const largeCategoryDataset: SearchableOption[] = Array.from(
  { length: 120 },
  (_, idx) => ({
    id: `cat-large-${idx + 1}`,
    name: `Category Level ${idx + 1} Gourmet`,
    name_ar: `فئة رقم ${idx + 1}`,
    code: `CAT-${100 + idx}`,
    description: `Root › Section ${idx + 1}`,
  })
)

describe('VirtualSearchableSelect (@tanstack/react-virtual dropdown)', () => {
  it('renders trigger button with placeholder when no category is selected', () => {
    render(
      <VirtualSearchableSelect
        value={null}
        onChange={vi.fn()}
        options={formatCategorySearchableOptions(mockCategoryOptions)}
        placeholder='Select category'
        searchPlaceholder='Search category...'
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('Select category')
  })

  it('renders selected category details with bilingual Arabic and English names', () => {
    const formattedCategories = formatCategorySearchableOptions(mockCategoryOptions)
    render(
      <VirtualSearchableSelect
        value='cat-2'
        onChange={vi.fn()}
        options={formattedCategories}
        placeholder='Select category'
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Coffee')
    expect(trigger).toHaveTextContent('قهوة')
  })

  it('filters categories by English and Arabic query during search', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedCategories = formatCategorySearchableOptions(mockCategoryOptions)

    render(
      <VirtualSearchableSelect
        value={null}
        onChange={onChange}
        options={formattedCategories}
        placeholder='Select category'
        searchPlaceholder='Search category...'
      />
    )

    // Open popover
    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText('Search category...')
    expect(searchInput).toBeInTheDocument()

    // Search by English name "Coffee"
    await user.type(searchInput, 'Coffee')
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
    expect(screen.queryByText('Bakery')).not.toBeInTheDocument()

    // Select filtered option
    await user.click(screen.getByText('Coffee'))
    expect(onChange).toHaveBeenCalledWith('cat-2')
  })

  it('filters categories by Arabic text query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedCategories = formatCategorySearchableOptions(mockCategoryOptions)

    render(
      <VirtualSearchableSelect
        value={null}
        onChange={onChange}
        options={formattedCategories}
        placeholder='Select category'
        searchPlaceholder='Search category...'
      />
    )

    await user.click(screen.getByRole('combobox'))
    const searchInput = screen.getByPlaceholderText('Search category...')

    // Search by Arabic name "شاي"
    await user.type(searchInput, 'شاي')
    expect(screen.getByText('Tea')).toBeInTheDocument()
    expect(screen.getByText('شاي')).toBeInTheDocument()
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()

    await user.click(screen.getByText('Tea'))
    expect(onChange).toHaveBeenCalledWith('cat-3')
  })

  it('renders brand options with code and bilingual names using SearchableSelect', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedBrands = formatBrandSearchableOptions(mockBrandOptions)

    render(
      <SearchableSelect
        value={null}
        onChange={onChange}
        options={formattedBrands}
        placeholder='Select brand'
        searchPlaceholder='Search brand...'
      />
    )

    await user.click(screen.getByRole('combobox'))

    // Verify brands rendered
    expect(screen.getByText('Lavazza')).toBeInTheDocument()
    expect(screen.getByText('(LVZ)')).toBeInTheDocument()
    expect(screen.getByText('لافازا')).toBeInTheDocument()
    expect(screen.getByText('Illy')).toBeInTheDocument()
    expect(screen.getByText('(ILLY)')).toBeInTheDocument()

    // Select brand
    await user.click(screen.getByText('Illy'))
    expect(onChange).toHaveBeenCalledWith('brand-2')
  })

  it('clears selection when trigger clear button (X) is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedBrands = formatBrandSearchableOptions(mockBrandOptions)

    render(
      <VirtualSearchableSelect
        value='brand-1'
        onChange={onChange}
        options={formattedBrands}
        placeholder='Select brand'
      />
    )

    const clearBtn = screen.getByLabelText('Clear selection')
    expect(clearBtn).toBeInTheDocument()

    await user.click(clearBtn)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('supports selecting "-- None --" option to reset value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedBrands = formatBrandSearchableOptions(mockBrandOptions)

    render(
      <VirtualSearchableSelect
        value='brand-1'
        onChange={onChange}
        options={formattedBrands}
        placeholder='Select brand'
        allowNone={true}
        noneLabel='-- No Brand --'
      />
    )

    await user.click(screen.getByRole('combobox'))

    const noneOption = screen.getByText('-- No Brand --')
    expect(noneOption).toBeInTheDocument()

    await user.click(noneOption)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('renders large virtualized catalog smoothly with total count badge and virtualized window', async () => {
    const user = userEvent.setup()

    render(
      <VirtualSearchableSelect
        value={null}
        onChange={vi.fn()}
        options={largeCategoryDataset}
        placeholder='Select category'
      />
    )

    await user.click(screen.getByRole('combobox'))

    // Should display total items badge
    expect(screen.getByText('120')).toBeInTheDocument()
    // First item is rendered in virtual window
    expect(screen.getByText('Category Level 1 Gourmet')).toBeInTheDocument()
    // Far-away items are virtualized away to preserve performance
    expect(screen.queryByText('Category Level 100 Gourmet')).not.toBeInTheDocument()
  })

  it('triggers onLoadMore when scrolling towards bottom in virtualized list', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()

    render(
      <VirtualSearchableSelect
        value={null}
        onChange={vi.fn()}
        options={largeCategoryDataset.slice(0, 20)}
        hasMore={true}
        onLoadMore={onLoadMore}
        placeholder='Select category'
      />
    )

    await user.click(screen.getByRole('combobox'))

    const scrollContainer = screen.getByRole('listbox')
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 900,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 200,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 800,
      configurable: true,
    })

    fireEvent.scroll(scrollContainer)

    expect(onLoadMore).toHaveBeenCalled()
  })

  it('supports keyboard navigation with ArrowDown, ArrowUp, and Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const formattedBrands = formatBrandSearchableOptions(mockBrandOptions)

    render(
      <VirtualSearchableSelect
        value={null}
        onChange={onChange}
        options={formattedBrands}
        placeholder='Select brand'
      />
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Press ArrowDown to navigate to first brand (Lavazza)
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, '{arrowdown}')
    await user.type(searchInput, '{enter}')

    expect(onChange).toHaveBeenCalledWith('brand-1')
  })

  it('displays loading indicator when isLoading is true', () => {
    render(
      <VirtualSearchableSelect
        value={null}
        onChange={vi.fn()}
        options={[]}
        isLoading={true}
        placeholder='Select category'
      />
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
