import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import {
  VirtualSearchableMultiSelect,
  type SearchableOption,
} from '@/components/custom-ui/virtual-searchable-multi-select'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
  }),
}))

const mockCategoryOptions: SearchableOption[] = [
  { id: 'cat-1', name: 'Beverages', name_ar: 'المشروبات' },
  { id: 'cat-2', name: 'Coffee', name_ar: 'قهوة', description: 'Beverages › Coffee' },
  { id: 'cat-3', name: 'Tea', name_ar: 'شاي', description: 'Beverages › Tea' },
  { id: 'cat-4', name: 'Bakery', name_ar: 'المخبوزات' },
  { id: 'cat-5', name: 'Dairy & Cheese', name_ar: 'ألبان وأجبان' },
]

describe('VirtualSearchableMultiSelect (@tanstack/react-virtual multi-select dropdown)', () => {
  it('renders trigger button with placeholder when no items are selected', () => {
    render(
      <VirtualSearchableMultiSelect
        values={[]}
        onChange={vi.fn()}
        options={mockCategoryOptions}
        placeholder="Select categories"
        searchPlaceholder="Search categories..."
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('Select categories')
  })

  it('renders selected count badge and removable chips when values are provided', () => {
    render(
      <VirtualSearchableMultiSelect
        values={['cat-1', 'cat-2']}
        onChange={vi.fn()}
        options={mockCategoryOptions}
        placeholder="Select categories"
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('2 selected')
    expect(trigger).toHaveTextContent('Beverages, Coffee')

    // Chips rendered below trigger
    expect(screen.getByText('Beverages')).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove Beverages')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove Coffee')).toBeInTheDocument()
  })

  it('filters items by English and Arabic query during search', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <VirtualSearchableMultiSelect
        values={[]}
        onChange={onChange}
        options={mockCategoryOptions}
        placeholder="Select categories"
        searchPlaceholder="Search categories..."
      />
    )

    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText('Search categories...')
    expect(searchInput).toBeInTheDocument()

    // Type English search "Tea"
    await user.type(searchInput, 'Tea')
    expect(screen.getByText('Tea')).toBeInTheDocument()
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
    expect(screen.queryByText('Bakery')).not.toBeInTheDocument()

    // Clear search and type Arabic search "قهوة"
    await user.clear(searchInput)
    await user.type(searchInput, 'قهوة')
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('قهوة')).toBeInTheDocument()
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
  })

  it('toggles selection when an option is clicked and calls onChange with updated array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <VirtualSearchableMultiSelect
        values={['cat-1']}
        onChange={onChange}
        options={mockCategoryOptions}
        placeholder="Select categories"
      />
    )

    await user.click(screen.getByRole('combobox'))

    // Click on Coffee to add it
    await user.click(screen.getByText('Coffee'))
    expect(onChange).toHaveBeenCalledWith(['cat-1', 'cat-2'])
  })

  it('supports selecting and deselecting all filtered items', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <VirtualSearchableMultiSelect
        values={[]}
        onChange={onChange}
        options={mockCategoryOptions}
        placeholder="Select categories"
      />
    )

    await user.click(screen.getByRole('combobox'))

    const selectAllBtn = screen.getByText('Select All')
    expect(selectAllBtn).toBeInTheDocument()

    await user.click(selectAllBtn)
    expect(onChange).toHaveBeenCalledWith(['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5'])
  })

  it('removes an item when the badge remove button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <VirtualSearchableMultiSelect
        values={['cat-1', 'cat-2']}
        onChange={onChange}
        options={mockCategoryOptions}
        placeholder="Select categories"
      />
    )

    const removeBtn = screen.getByLabelText('Remove Beverages')
    await user.click(removeBtn)

    expect(onChange).toHaveBeenCalledWith(['cat-2'])
  })

  it('clears all selected items when the trigger clear button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <VirtualSearchableMultiSelect
        values={['cat-1', 'cat-2']}
        onChange={onChange}
        options={mockCategoryOptions}
        placeholder="Select categories"
      />
    )

    const clearAllBtn = screen.getByLabelText('Clear all selections')
    await user.click(clearAllBtn)

    expect(onChange).toHaveBeenCalledWith([])
  })
})
