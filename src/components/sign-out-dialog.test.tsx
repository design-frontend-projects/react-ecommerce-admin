import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignOutDialog } from './sign-out-dialog'

const mockNavigate = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue(undefined)
const mockAuthReset = vi.fn()
const mockResposState = {
  setCurrentEmployee: vi.fn(),
  setSelectedTable: vi.fn(),
  setSelectedFloorId: vi.fn(),
  clearCart: vi.fn(),
}

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ href: '/respos/pos' }),
}))

vi.mock('@/hooks/use-auth', () => ({
  useSupabase: () => ({ signOut: mockSignOut }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { auth: { reset: () => void } }) => unknown
  ) => selector({ auth: { reset: mockAuthReset } }),
}))

vi.mock('@/stores/respos-store', () => ({
  useResposStore: {
    getState: () => mockResposState,
  },
}))

describe('SignOutDialog', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockSignOut.mockClear()
    mockAuthReset.mockClear()
    Object.values(mockResposState).forEach((fn) => fn.mockClear())
  })

  it('renders confirm dialog when open', () => {
    render(<SignOutDialog open onOpenChange={vi.fn()} />)

    // Should show the sign-out confirmation
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('signs out and navigates to sign-in on confirm', async () => {
    const onOpenChange = vi.fn()
    render(<SignOutDialog open onOpenChange={onOpenChange} />)

    // Find and click the confirm/destructive button
    const confirmButton = screen.getByRole('button', {
      name: /sign out|confirm|signOutDialog\.confirmText/i,
    })
    await userEvent.click(confirmButton)

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
    expect(mockAuthReset).toHaveBeenCalledTimes(1)
    expect(mockResposState.setCurrentEmployee).toHaveBeenCalledWith(null)
    expect(mockResposState.clearCart).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/sign-in', replace: true })
    )
  })
})
