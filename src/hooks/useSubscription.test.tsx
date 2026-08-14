import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSubscription } from './useSubscription'
import { useAuthStore } from '@/stores/auth-store'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

describe('useSubscription Hook', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      auth: {
        session: {
          access_token: 'fake-token',
          user: { id: 'user-123' },
        } as any,
        user: { id: 'user-123' } as any,
        profile: null,
        selectedBranchId: '',
        isInitializing: false,
        setUser: vi.fn(),
        setProfile: vi.fn(),
        setSession: vi.fn(),
        setSelectedBranchId: vi.fn(),
        setIsInitializing: vi.fn(),
        reset: vi.fn(),
      },
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns subscription status on 200 OK', async () => {
    const mockStatus = {
      tenant_id: 'tenant-123',
      status: 'paid',
      end_date: '2026-12-31T23:59:59Z',
      is_active: true,
      first_use: false,
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockStatus,
    } as Response)

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSubscription(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStatus)
  })

  it('returns null cleanly when API returns 404 (user has no subscription yet)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No subscription found' }),
    } as Response)

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSubscription(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('returns null cleanly on 401 Unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response)

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSubscription(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })
})
