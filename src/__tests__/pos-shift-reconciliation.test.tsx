import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PosSessionDialog } from '@/features/pos/components/pos-session-dialog'
import { usePosStore } from '@/features/pos/store/use-pos-store'
import * as posQueries from '@/features/pos/hooks/use-pos-queries'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string) => defaultVal || _key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => children,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('POS Shift Reconciliation & Closing Dialog', () => {
  let queryClient: QueryClient

  const mockSession = {
    id: 'session-123',
    status: 'open' as const,
    openedAt: new Date('2026-09-23T08:00:00Z').toISOString(),
    openingCash: 100,
    cashierName: 'John Cashier',
  }

  const mockTerminal = {
    id: 'term-1',
    name: 'Counter 01',
    code: 'POS-02',
    warehouseId: 'wh-1',
  }

  const mockSummary = {
    session: {
      id: 'session-123',
      opened_at: new Date('2026-09-23T08:00:00Z').toISOString(),
      opening_cash: 100,
    },
    openingCash: 100,
    cashSales: 250.5,
    cardSales: 180.0,
    otherSales: 0,
    totalSales: 430.5,
    cashIn: 50.0,
    cashOut: 20.0,
    cashRefunds: 15.5,
    // Expected = 100 + 250.50 + 50 - 20 - 15.50 = 365.00
    expectedCash: 365.0,
    actualCash: 365.0,
    discrepancy: 0,
    ordersCount: 4,
    invoicesCount: 4,
    shiftTimeframe: {
      openedAt: new Date('2026-09-23T08:00:00Z'),
      closedAt: null,
      isOpen: true,
      durationMinutes: 120,
    },
  }

  const mockCloseMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }

  const mockOpenMutation = {
    mutateAsync: vi.fn().mockResolvedValue({
      session: {
        id: 'new-session',
        opened_at: new Date().toISOString(),
        opening_cash: 50,
        cashier_name: 'Cashier',
      },
    }),
    isPending: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    usePosStore.setState({
      terminal: mockTerminal,
      session: mockSession,
    })

    vi.spyOn(posQueries, 'usePosSessionSummary').mockReturnValue({
      data: mockSummary,
      isLoading: false,
    } as any)

    vi.spyOn(posQueries, 'useCloseSessionMutation').mockReturnValue(
      mockCloseMutation as any
    )
    vi.spyOn(posQueries, 'useOpenSessionMutation').mockReturnValue(
      mockOpenMutation as any
    )
  })

  it('renders shift closing metrics correctly from collected transactions', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosSessionDialog
          open={true}
          onOpenChange={vi.fn()}
          mode='close'
        />
      </QueryClientProvider>
    )

    // Check title and terminal
    expect(screen.getByText('Close Shift & Reconcile Cash')).toBeDefined()
    expect(screen.getByText(/POS-02/)).toBeDefined()

    // Financial breakdown values
    expect(screen.getByText('+$250.50')).toBeDefined() // Cash Sales
    expect(screen.getByText('+$50.00')).toBeDefined() // Cash In
    expect(screen.getByText('-$20.00')).toBeDefined() // Cash Out
    expect(screen.getByText('-$15.50')).toBeDefined() // Cash Refunds
    expect(screen.getByText('$365.00')).toBeDefined() // Expected cash
    expect(screen.getByText('$180.00')).toBeDefined() // Card sales
  })

  it('auto-prefills the counted cash input with the collected expected amount', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosSessionDialog
          open={true}
          onOpenChange={vi.fn()}
          mode='close'
        />
      </QueryClientProvider>
    )

    const input = screen.getByLabelText(/Counted Cash in Drawer/i) as HTMLInputElement
    await waitFor(() => {
      expect(input.value).toBe('365.00')
    })

    // Balanced discrepancy message
    expect(screen.getByText('Drawer is perfectly balanced!')).toBeDefined()
  })

  it('updates discrepancy dynamically when counted cash is edited', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosSessionDialog
          open={true}
          onOpenChange={vi.fn()}
          mode='close'
        />
      </QueryClientProvider>
    )

    const input = screen.getByLabelText(/Counted Cash in Drawer/i) as HTMLInputElement

    // Simulate short drawer ($350 instead of $365)
    fireEvent.change(input, { target: { value: '350.00' } })
    await waitFor(() => {
      expect(screen.getByText(/Short by -\$15\.00/i)).toBeDefined()
    })

    // Simulate over drawer ($380 instead of $365)
    fireEvent.change(input, { target: { value: '380.00' } })
    await waitFor(() => {
      expect(screen.getByText(/Over by \+\$15\.00/i)).toBeDefined()
    })

    // Click "Match Expected" button to reset
    const matchBtn = screen.getByRole('button', { name: /Match Expected/i })
    fireEvent.click(matchBtn)

    await waitFor(() => {
      expect(input.value).toBe('365.00')
      expect(screen.getByText('Drawer is perfectly balanced!')).toBeDefined()
    })
  })

  it('submits shift closing with counted cash and notes', async () => {
    const handleSuccess = vi.fn()
    const handleOpenChange = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <PosSessionDialog
          open={true}
          onOpenChange={handleOpenChange}
          mode='close'
          onSuccess={handleSuccess}
        />
      </QueryClientProvider>
    )

    const input = screen.getByLabelText(/Counted Cash in Drawer/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '365.00' } })

    const notesInput = screen.getByLabelText(/Closing Notes/i) as HTMLTextAreaElement
    fireEvent.change(notesInput, { target: { value: 'End of evening shift, all balanced.' } })

    const submitBtn = screen.getByRole('button', { name: /Close & Reconcile Shift/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCloseMutation.mutateAsync).toHaveBeenCalledWith({
        sessionId: 'session-123',
        actualCash: 365,
        notes: 'End of evening shift, all balanced.',
      })
      expect(handleOpenChange).toHaveBeenCalledWith(false)
      expect(handleSuccess).toHaveBeenCalled()
      expect(usePosStore.getState().session).toBeNull()
    })
  })
})
