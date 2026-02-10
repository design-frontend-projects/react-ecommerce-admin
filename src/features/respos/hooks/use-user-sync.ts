// Hook to sync Clerk user with public.users and res_employees tables
// Runs on authenticated route mount to ensure DB records exist
import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function useUserSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || hasSynced.current) return

    const syncUser = async () => {
      try {
        const clerkUserId = user.id
        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses[0]?.emailAddress ||
          ''
        const firstName = user.firstName || ''
        const lastName = user.lastName || ''
        const avatarUrl = user.imageUrl || null

        // Check if public.users record exists
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id, default_role')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle()

        if (fetchError) {
          return
        }

        if (!existingUser) {
          // Check if this is the first user (assign super_admin)
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

          const isFirstUser = (count ?? 0) === 0
          const defaultRole = isFirstUser ? 'super_admin' : 'user'

          // Insert public.users record
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUserId,
              email,
              first_name: firstName,
              last_name: lastName,
              avatar_url: avatarUrl,
              default_role: defaultRole,
              is_restuarant_user: true,
              is_active: true,
            })
            .select('id')
            .single()

          if (insertError) {
            return
          }

          // Check if res_employees record exists
          const { data: existingEmployee } = await supabase
            .from('res_employees')
            .select('id')
            .eq('user_id', clerkUserId)
            .maybeSingle()

          if (!existingEmployee && newUser) {
            // Create res_employees record
            const { data: employee, error: empError } = await supabase
              .from('res_employees')
              .insert({
                user_id: clerkUserId,
                first_name: firstName,
                last_name: lastName,
                email,
                avatar_url: avatarUrl,
                is_active: true,
              })
              .select('id')
              .single()

            if (empError) {
              return
            }

            // If super_admin, assign the super_admin role
            if (isFirstUser && employee) {
              const { data: superAdminRole } = await supabase
                .from('res_roles')
                .select('id')
                .eq('name', 'super_admin')
                .maybeSingle()

              if (superAdminRole) {
                await supabase.from('res_employee_roles').insert({
                  employee_id: employee.id,
                  role_id: superAdminRole.id,
                })
              }
            }
          }
        }

        hasSynced.current = true
      } catch {
        toast.error('Failed to sync user')
      }
    }

    syncUser()
  }, [isLoaded, isSignedIn, user])
}
