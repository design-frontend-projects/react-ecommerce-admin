import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InventoryMovementsToolbar } from '@/features/inventory-movements/components/inventory-movements-toolbar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: any) => {
      if (typeof defaultValue === 'string') return defaultValue
      if (defaultValue && typeof defaultValue === 'object' && defaultValue.defaultValue) {
        return defaultValue.defaultValue
      }
      return key
    },
  }),
}))

describe('InventoryMovementsToolbar - User Story 2 (Filtering & Search)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces search input by 300ms before calling onSearchChange', () => {
    const handleSearchChange = vi.fn()
    render(
      <InventoryMovementsToolbar
        search=''
        onSearchChange={handleSearchChange}
        movementType='__all__'
        onMovementTypeChange={vi.fn()}
        locationId='__all__'
        onLocationIdChange={vi.fn()}
        dateFrom=''
        onDateFromChange={vi.fn()}
        dateTo=''
        onDateToChange={vi.fn()}
        onResetFilters={vi.fn()}
        locationOptions={[]}
      />
    )

    const searchInput = screen.getByPlaceholderText(
      'Search by SKU, variant name, barcode, or ref...'
    )
    fireEvent.change(searchInput, { target: { value: 'TSHIRT' } })

    // Immediately before 300ms, not called yet
    expect(handleSearchChange).not.toHaveBeenCalled()

    // Advance timers by 300ms
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(handleSearchChange).toHaveBeenCalledWith('TSHIRT')
  })

  it('triggers onResetFilters when the reset button is clicked', () => {
    const handleReset = vi.fn()
    render(
      <InventoryMovementsToolbar
        search='TSHIRT'
        onSearchChange={vi.fn()}
        movementType='purchase'
        onMovementTypeChange={vi.fn()}
        locationId='__all__'
        onLocationIdChange={vi.fn()}
        dateFrom=''
        onDateFromChange={vi.fn()}
        dateTo=''
        onDateToChange={vi.fn()}
        onResetFilters={handleReset}
        locationOptions={[]}
      />
    )

    const resetButton = screen.getByText('Reset')
    fireEvent.click(resetButton)

    expect(handleReset).toHaveBeenCalled()
  })

  it('triggers onDateFromChange and onDateToChange when date inputs change', () => {
    const handleDateFrom = vi.fn()
    const handleDateTo = vi.fn()
    render(
      <InventoryMovementsToolbar
        search=''
        onSearchChange={vi.fn()}
        movementType='__all__'
        onMovementTypeChange={vi.fn()}
        locationId='__all__'
        onLocationIdChange={vi.fn()}
        dateFrom=''
        onDateFromChange={handleDateFrom}
        dateTo=''
        onDateToChange={handleDateTo}
        onResetFilters={vi.fn()}
        locationOptions={[]}
      />
    )

    const fromInput = screen.getByLabelText('From Date')
    const toInput = screen.getByLabelText('To Date')

    fireEvent.change(fromInput, { target: { value: '2026-09-01' } })
    expect(handleDateFrom).toHaveBeenCalledWith('2026-09-01')

    fireEvent.change(toInput, { target: { value: '2026-09-25' } })
    expect(handleDateTo).toHaveBeenCalledWith('2026-09-25')
  })
})
