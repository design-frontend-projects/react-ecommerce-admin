import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignOutDialog } from './sign-out-dialog'

const mockNavigate = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue(undefined)
const mockAuthReset = vi.fn()
const mockCloseShift = vi.fn().mockResolvedValue(undefined)
const mockResposState = {
  setActiveShift: vi.fn(),
  setCurrentEmployee: vi.fn(),
  setSelectedTable: vi.fn(),
  setSelectedFloorId: vi.fn(),
  clearCart: vi.fn(),
}

let mockActiveShift: { opening_cash: number } | null = { opening_cash: 120 }
let mockIsShiftLoading = false
let mockIsCashier = true

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ href: '/respos/pos' }),
}))

vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ signOut: mockSignOut }),
  useUser: () => ({ user: { id: 'user_1' } }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    has: ({ role }: { role: string }) => role === 'cashier' && mockIsCashier,
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { auth: { reset: () => void } }) => unknown) =>
    selector({ auth: { reset: mockAuthReset } }),
}))

vi.mock('@/stores/respos-store', () => ({
  useResposStore: {
    getState: () => mockResposState,
  },
}))

vi.mock('@/features/respos/api/queries', () => ({
  useActiveShift: () => ({
    data: mockActiveShift,
    isLoading: mockIsShiftLoading,
  }),
}))

vi.mock('@/features/respos/hooks/use-shift', () => ({
  useShift: () => ({
    closeShift: mockCloseShift,
    isClosing: false,
  }),
}))

vi.mock('@/features/respos/pages/shifts', () => ({
  CloseShiftDialog: ({
    open,
    onSubmit,
  }: {
    open: boolean
    onSubmit: (values: { closingCash: number; notes?: string }) => Promise<void>
  }) =>
    open ? (
      <button
        type='button'
        onClick={() => onSubmit({ closingCash: 150, notes: 'close note' })}
      >
        mock-close-shift-submit
      </button>
    ) : null,
}))

describe('SignOutDialog', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockSignOut.mockClear()
    mockAuthReset.mockClear()
    mockCloseShift.mockClear()
    Object.values(mockResposState).forEach((fn) => fn.mockClear())
    mockActiveShift = { opening_cash: 120 }
    mockIsShiftLoading = false
    mockIsCashier = true
  })

  it('shows shift-aware actions when cashier has active shift', () => {
    render(<SignOutDialog open onOpenChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /close shift first/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /proceed sign out/i })
    ).toBeInTheDocument()
  })

  it('proceeds sign out directly when user chooses proceed', async () => {
    const onOpenChange = vi.fn()
    render(<SignOutDialog open onOpenChange={onOpenChange} />)

    await userEvent.click(
      screen.getByRole('button', { name: /proceed sign out/i })
    )

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
    expect(mockAuthReset).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/sign-in', replace: true })
    )
  })

  it('closes shift then signs out when user selects close shift first', async () => {
    function StatefulDialog() {
      const [open, setOpen] = useState(true)
      return <SignOutDialog open={open} onOpenChange={setOpen} />
    }

    render(<StatefulDialog />)

    await userEvent.click(
      screen.getByRole('button', { name: /close shift first/i })
    )

    await userEvent.click(
      screen.getByRole('button', { name: /mock-close-shift-submit/i })
    )

    await waitFor(() =>
      expect(mockCloseShift).toHaveBeenCalledWith(
        'user_1',
        150,
        'close note'
      )
    )
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockAuthReset).toHaveBeenCalledTimes(1)
  })
})
