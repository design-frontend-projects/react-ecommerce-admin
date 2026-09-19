import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PosLayout } from '@/features/pos/components/pos-layout'
import { PosTerminalUsersPage } from '@/features/pos/pages/pos-terminal-users-page'
import { usePosStore } from '@/features/pos/store/use-pos-store'

const { mockTerminals, mockUsers, mockAssignments } = vi.hoisted(() => {
  const mockTerminals = [
    {
      id: 'term-1',
      name: 'Main Register',
      code: 'POS-01',
      storeId: 'store-1',
      branchId: 'branch-1',
      warehouseId: 'wh-1',
      defaultPriceListId: 'pl-1',
      status: 'active',
      hasActiveSession: false,
      activeSessionCashier: null,
      assignedCashiers: ['user-1'],
    },
  ]

  const mockUsers = [
    { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'cashier' },
    { id: 'user-2', name: 'Jane Cashier', email: 'jane@example.com', role: 'cashier' },
  ]

  const mockAssignments = [
    {
      id: 'assign-1',
      terminalId: 'term-1',
      terminalCode: 'POS-01',
      terminalName: 'Main Register',
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      userRole: 'cashier',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return { mockTerminals, mockUsers, mockAssignments }
})

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string) => defaultVal || _key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => children,
}))

// Mock router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useSearch: () => ({ terminalId: 'term-1' }),
  useLocation: () => ({ pathname: '/pos', search: {} }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: vi.fn(),
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  },
}))

vi.mock('@/features/pos/services/pos-client', () => ({
  posApi: {
    listTerminals: vi.fn().mockResolvedValue(mockTerminals),
    getTerminalStatus: vi.fn().mockResolvedValue({
      terminal: mockTerminals[0],
      activeSession: null,
      isAuthorized: true,
      requiresSession: true,
    }),
    listTerminalUsers: vi.fn().mockResolvedValue({
      assignments: mockAssignments,
      terminals: mockTerminals,
      users: mockUsers,
    }),
    assignTerminalUsers: vi.fn().mockResolvedValue({ success: true }),
    toggleTerminalUserStatus: vi.fn().mockResolvedValue({ success: true }),
    removeTerminalUser: vi.fn().mockResolvedValue({ success: true }),
    batchRemoveTerminalUsers: vi.fn().mockResolvedValue({ success: true }),
    getProducts: vi.fn().mockResolvedValue({ items: [], categories: [] }),
    listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    getSessionSummary: vi.fn().mockResolvedValue(null),
    getHeldOrders: vi.fn().mockResolvedValue([]),
  },
}))

describe('POS Terminal User Assignment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    usePosStore.getState().setTerminal(null)
    usePosStore.getState().setSession(null)
  })

  it('renders PosLayout without infinite loop', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosLayout />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Register')).toBeDefined()
    })
  })

  it('renders PosTerminalUsersPage without infinite loop', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosTerminalUsersPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Terminal Users')).toBeDefined()
    })
  })

  it('assigns user in PosTerminalUsersPage dialog via row click and submits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosTerminalUsersPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Terminal Users')).toBeDefined()
    })

    const assignBtns = screen.getAllByText(/Assign Cashier/i)
    fireEvent.click(assignBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Assign Cashiers to Terminal')).toBeDefined()
    })

    // Select cashier via row click
    const johnElements = screen.getAllByText('John Doe')
    fireEvent.click(johnElements[johnElements.length - 1])

    // Submit
    const submitBtn = screen.getByText(/Authorize 1 Cashier\(s\)/i)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Terminal Users')).toBeDefined()
    })
  })

  it('assigns user in PosTerminalUsersPage dialog via direct checkbox click and submits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PosTerminalUsersPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Terminal Users')).toBeDefined()
    })

    const assignBtns = screen.getAllByText(/Assign Cashier/i)
    fireEvent.click(assignBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Assign Cashiers to Terminal')).toBeDefined()
    })

    // Find the user checkbox directly by role
    const user2Checkbox = screen.getByRole('checkbox', { name: /Jane Cashier/i })
    fireEvent.click(user2Checkbox)

    const submitBtn = screen.getByText(/Authorize 1 Cashier\(s\)/i)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Terminal Users')).toBeDefined()
    })
  })
})
