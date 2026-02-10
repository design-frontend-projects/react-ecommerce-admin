import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const syncUser = async () => {
      try {
        const email = user.primaryEmailAddress?.emailAddress
        if (!email) return

        // Check if user exists in public.users
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('id, clerk_user_id')
          .eq('email', email)
          .single()

        if (findError && findError.code !== 'PGRST116') {
          throw findError
        }

        if (existingUser) {
          // If user exists but clerk_user_id is missing or different, update it
          if (existingUser.clerk_user_id !== user.id) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ clerk_user_id: user.id })
              .eq('id', existingUser.id)

            if (updateError) {
              throw updateError
            }
          }
        } else {
          // If user doesn't exist, create them
          // This handles self-signup flow
          const { error: createError } = await supabase.from('users').insert({
            clerk_user_id: user.id,
            email,
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            is_active: true,
            is_restuarant_user: true, // Default to true for now as per requirement context
            default_role: 'user',
          })

          if (createError) {
            throw createError
          }
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
    }

    syncUser()
  }, [user, isLoaded, isSignedIn])

  return null // This component does not render anything
}
