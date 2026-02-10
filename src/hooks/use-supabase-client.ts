import { useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { createClerkSupabaseClient, supabase } from '@/lib/supabase'

export function useSupabaseClient() {
  const { getToken } = useAuth()

  const getClient = useCallback(async () => {
    // We use the 'supabase' template as defined in Clerk dashboard
    const token = await getToken({ template: 'supabase' })
    if (token) {
      return createClerkSupabaseClient(token)
    }
    return supabase
  }, [getToken])

  return { getClient }
}
