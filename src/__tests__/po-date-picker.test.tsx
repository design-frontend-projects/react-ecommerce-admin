import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PODatePicker, parseDateString } from '@/features/purchase-orders/components/po-date-picker'
import { format } from 'date-fns'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue?: string) => defaultValue || _key,
  }),
}))

describe('parseDateString utility', () => {
  it('returns undefined for undefined, null, or empty string', () => {
    expect(parseDateString(undefined)).toBeUndefined()
    expect(parseDateString(null)).toBeUndefined()
    expect(parseDateString('')).toBeUndefined()
  })

  it('correctly parses YYYY-MM-DD into a local Date without timezone offset', () => {
    const parsed = parseDateString('2026-09-23')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(8) // 0-indexed: 8 is September
    expect(parsed?.getDate()).toBe(23)
  })

  it('correctly parses ISO strings with T delimiter', () => {
    const parsed = parseDateString('2026-12-31T23:59:59.000Z')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(11) // December
    expect(parsed?.getDate()).toBe(31)
  })

  it('returns undefined for invalid date string', () => {
    expect(parseDateString('invalid-date')).toBeUndefined()
  })
})

describe('PODatePicker component', () => {
  it('renders with placeholder when no value is provided', () => {
    render(<PODatePicker value={null} onChange={vi.fn()} placeholder='Pick a date' />)
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  it('renders formatted date in regular mode', () => {
    render(<PODatePicker value='2026-09-23' onChange={vi.fn()} />)
    expect(screen.getByText('Sep 23, 2026')).toBeInTheDocument()
  })

  it('renders ISO date in compact mode as yyyy-MM-dd', () => {
    render(<PODatePicker value='2026-09-23' onChange={vi.fn()} compact />)
    expect(screen.getByText('2026-09-23')).toBeInTheDocument()
  })

  it('calls onChange with null when clear button is clicked', () => {
    const handleChange = vi.fn()
    render(<PODatePicker value='2026-09-23' onChange={handleChange} clearable />)

    const clearBtn = screen.getByLabelText('Clear')
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)

    expect(handleChange).toHaveBeenCalledWith(null)
  })

  it('opens popover when trigger is clicked and renders today action', () => {
    const handleChange = vi.fn()
    render(<PODatePicker value='2026-09-23' onChange={handleChange} />)

    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    const todayBtn = screen.getByText('Today')
    expect(todayBtn).toBeInTheDocument()

    fireEvent.click(todayBtn)
    expect(handleChange).toHaveBeenCalledWith(format(new Date(), 'yyyy-MM-dd'))
  })
})
