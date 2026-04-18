import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OpenShiftDialog } from './shifts'

describe('OpenShiftDialog forced mode', () => {
  it('renders in non-dismissible mode with locked opening cash', async () => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    const { container } = render(
      <OpenShiftDialog
        open
        onOpenChange={onOpenChange}
        employeeName='Cashier User'
        isPending={false}
        defaultOpeningCash={150}
        nonDismissible
        showCancelButton={false}
        lockOpeningCash
        onSubmit={onSubmit}
      />
    )

    const openingCashInput = screen.getByRole('spinbutton')
    expect(openingCashInput).toHaveAttribute('readonly')
    expect(openingCashInput).toHaveValue(150)
    expect(
      screen.queryByRole('button', { name: /cancel/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^close$/i })
    ).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    const overlay = container.querySelector('[data-slot="dialog-overlay"]')
    if (overlay) {
      fireEvent.pointerDown(overlay)
      fireEvent.click(overlay)
    }
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    await userEvent.click(screen.getByRole('button', { name: /open shift/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ openingCash: 150 })
    )
  })
})
