import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export async function requireAuth() {
  // Check the zustand store first for fast synchronous check
  const state = useAuthStore.getState()
  
  if (state.isAuthenticated && state.session) {
    return state.session
  }

  // Fallback to checking supabase directly if store isn't populated yet
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw redirect({
      to: '/login',
      search: {
        // Option to include redirect URL
        // redirect: window.location.pathname
      }
    })
  }

  // Update store if we got a session
  if (session && !state.isAuthenticated) {
    state.setSession(session)
  }

  return session
}

export async function requireNoAuth() {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    throw redirect({
      to: '/' // redirect to dashboard if already authenticated
    })
  }
}
