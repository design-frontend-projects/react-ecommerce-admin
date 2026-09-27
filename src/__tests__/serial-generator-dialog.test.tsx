import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SerialGeneratorDialog } from '@/features/goods-receipts/components/serial-generator-dialog'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

describe('SerialGeneratorDialog Component', () => {
  const mockOnApply = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with product name, required count, and derived prefix', () => {
    render(
      <SerialGeneratorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        productName='Apple iPhone 15 Pro'
        variantName='Titanium Blue 256GB'
        sku='AIP15P-256'
        requiredCount={3}
        currentSerials={[]}
        onApply={mockOnApply}
      />
    )

    // Check product name and details
    expect(screen.getByText('Apple iPhone 15 Pro')).toBeInTheDocument()
    expect(screen.getByText('(Titanium Blue 256GB)')).toBeInTheDocument()
    expect(screen.getByText('AIP15P-256')).toBeInTheDocument()

    // Prefix input should be prefilled with derived product prefix
    const prefixInput = screen.getByPlaceholderText('e.g. IPHONE-15') as HTMLInputElement
    expect(prefixInput.value).toBe('APPLE-IPHONE-15')

    // Live preview should show generated serials
    expect(screen.getAllByText('APPLE-IPHONE-15-001').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('APPLE-IPHONE-15-002')).toBeInTheDocument()
    expect(screen.getByText('APPLE-IPHONE-15-003')).toBeInTheDocument()
  })

  it('allows user to customize the prefix based on product name and updates preview', () => {
    render(
      <SerialGeneratorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        productName='MacBook Pro M3'
        requiredCount={2}
        currentSerials={[]}
        onApply={mockOnApply}
      />
    )

    const prefixInput = screen.getByPlaceholderText('e.g. IPHONE-15')
    fireEvent.change(prefixInput, { target: { value: 'MBP-CUSTOM' } })

    expect(screen.getByText('MBP-CUSTOM-001')).toBeInTheDocument()
    expect(screen.getByText('MBP-CUSTOM-002')).toBeInTheDocument()
  })

  it('applies quick acronym preset on click', () => {
    render(
      <SerialGeneratorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        productName='PlayStation 5 Console'
        requiredCount={2}
        currentSerials={[]}
        onApply={mockOnApply}
      />
    )

    // Acronym preset button should exist (PS5C-001)
    const acronymBtn = screen.getByRole('button', { name: /PS5C-001/i })
    fireEvent.click(acronymBtn)

    expect(screen.getAllByText('PS5C-001').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('PS5C-002')).toBeInTheDocument()
  })

  it('calls onApply with generated serials and closes modal on submit', () => {
    render(
      <SerialGeneratorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        productName='Dell XPS 15'
        requiredCount={2}
        currentSerials={[]}
        onApply={mockOnApply}
      />
    )

    const applyBtn = screen.getByRole('button', { name: /Apply 2 Serials/i })
    fireEvent.click(applyBtn)

    expect(mockOnApply).toHaveBeenCalledTimes(1)
    expect(mockOnApply).toHaveBeenCalledWith(
      ['DELL-XPS-15-001', 'DELL-XPS-15-002'],
      'replace'
    )
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('supports append mode when some serials already exist', () => {
    render(
      <SerialGeneratorDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        productName='Dell XPS 15'
        requiredCount={3}
        currentSerials={['DELL-XPS-15-001']}
        onApply={mockOnApply}
      />
    )

    // Should indicate missing count
    expect(screen.getByText(/Missing:/i)).toBeInTheDocument()

    // Default mode for partial list is append
    const applyBtn = screen.getByRole('button', { name: /Apply 2 Serials/i })
    fireEvent.click(applyBtn)

    expect(mockOnApply).toHaveBeenCalledWith(
      ['DELL-XPS-15-002', 'DELL-XPS-15-003'],
      'append'
    )
  })
})
