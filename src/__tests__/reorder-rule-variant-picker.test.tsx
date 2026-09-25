import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReorderRuleVariantPicker } from '@/features/reorder-rules/components/variant-picker'
import * as inventoryLookups from '@/hooks/use-inventory-lookups'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
  }),
}))

const mockVariants: inventoryLookups.VariantOption[] = [
  {
    id: 'var-1',
    sku: 'BEV-ESP-001',
    barcode: '1234567890123',
    price: 15,
    cost_price: 10,
    products: { name: 'Espresso Roast Beans 1kg' },
  },
  {
    id: 'var-2',
    sku: 'BEV-COLD-002',
    barcode: '1234567890124',
    price: 18,
    cost_price: 12,
    products: { name: 'Cold Brew Blend 1kg' },
  },
]

describe('ReorderRuleVariantPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(inventoryLookups, 'useVariantOptions').mockReturnValue({
      data: mockVariants,
      isLoading: false,
    } as any)
  })

  it('renders trigger button with placeholder when no variant is selected', () => {
    render(
      <ReorderRuleVariantPicker
        value=''
        onChange={vi.fn()}
        placeholder='Select variant...'
      />
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Select variant...')).toBeInTheDocument()
  })

  it('renders selected variant SKU and product name on trigger button', () => {
    render(
      <ReorderRuleVariantPicker
        value='var-1'
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('BEV-ESP-001')).toBeInTheDocument()
    expect(screen.getByText(/Espresso Roast Beans 1kg/)).toBeInTheDocument()
  })

  it('preserves initialVariant even if it is not in the server search results', () => {
    render(
      <ReorderRuleVariantPicker
        value='var-legacy'
        initialVariant={{
          id: 'var-legacy',
          sku: 'LEGACY-SKU-99',
          product_name: 'Old Discontinued Coffee',
        }}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('LEGACY-SKU-99')).toBeInTheDocument()
    expect(screen.getByText(/Old Discontinued Coffee/)).toBeInTheDocument()
  })

  it('opens popover on click and invokes onChange when a variant is selected', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(
      <ReorderRuleVariantPicker
        value=''
        onChange={mockOnChange}
      />
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Option should be in document
    const option = await screen.findByText('BEV-COLD-002')
    expect(option).toBeInTheDocument()

    await user.click(option)
    expect(mockOnChange).toHaveBeenCalledWith(
      'var-2',
      expect.objectContaining({ sku: 'BEV-COLD-002' })
    )
  })
})
