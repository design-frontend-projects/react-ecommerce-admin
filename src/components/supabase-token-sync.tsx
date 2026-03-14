import { useEffect } from 'react'
import { useSession } from '@clerk/clerk-react'
import { setSupabaseTokenGetter } from '@/lib/supabase'

/**
 * SupabaseTokenSync
 *
 * This component handles the synchronization between Clerk's authentication session
 * and the Supabase client. It ensures that any request made via the `supabase`
 * client (from `@/lib/supabase`) includes the Clerk JWT for RLS.
 */
export function SupabaseTokenSync() {
  const { session } = useSession()

  useEffect(() => {
    if (!session) {
      setSupabaseTokenGetter(null)
      return
    }

    // Pass a getter function to Supabase.
    // This function will be called by Supabase's custom fetch implementation
    // right before making an actual network request.
    setSupabaseTokenGetter(async () => {
      try {
        // 'supabase' is the standard template name for Supabase-Clerk integrations
        return await session.getToken({ template: 'supabase' })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching Supabase token from Clerk:', error)
        return null
      }
    })
  }, [session])

  return null
}
