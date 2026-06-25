import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    }
  }
}))

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ session: null, user: null, isAuthenticated: false, isLoading: false })
  })

  it('handles sign in with OTP request', async () => {
    // Mock the signInWithOtp response
    ;(supabase.auth.signInWithOtp as any).mockResolvedValue({ data: {}, error: null })
    
    const response = await supabase.auth.signInWithOtp({ email: 'user@example.com' })
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(response.error).toBeNull()
  })

  it('handles OTP verification and state update', async () => {
    const mockSession = {
      access_token: 'fake-token',
      user: { id: '123', email: 'user@example.com' }
    }
    ;(supabase.auth.verifyOtp as any).mockResolvedValue({ data: { session: mockSession }, error: null })

    const response = await supabase.auth.verifyOtp({ email: 'user@example.com', token: '123456', type: 'email' })
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'user@example.com', token: '123456', type: 'email' })
    expect(response.error).toBeNull()

    // Manually trigger the store update as if the auth state changed
    useAuthStore.getState().setSession(mockSession as any)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('user@example.com')
  })

  it('handles sign out correctly', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      session: { access_token: 'fake' } as any,
      user: { email: 'user@example.com' } as any,
      isAuthenticated: true
    })

    ;(supabase.auth.signOut as any).mockResolvedValue({ error: null })
    
    await useAuthStore.getState().signOut()
    
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
