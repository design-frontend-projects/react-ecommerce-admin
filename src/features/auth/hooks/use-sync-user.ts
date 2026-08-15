import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useUser } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

export function useSyncUser() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { profile, setProfile } = useAuthStore((state) => state.auth)

  const { mutate: sync } = useMutation({
    mutationFn: async (params: {
      auth_user_id: string
      email: string
      first_name?: string
      last_name?: string
      phone?: string
    }) => {
      const { data: existing } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('auth_user_id', params.auth_user_id)
        .maybeSingle()

      if (existing) return existing

      const { data: created, error } = await supabase
        .from('tenant_users')
        .insert([
          {
            auth_user_id: params.auth_user_id,
            email: params.email,
            first_name: params.first_name || null,
            last_name: params.last_name || null,
            phone: params.phone || null,
            is_active: true,
            default_role: 'super_admin',
            is_restuarant_user: true,
            modules: ['inventory', 'restaurant'],
            onboarding_complete: false,
          },
        ])
        .select()
        .maybeSingle()

      if (error) throw error
      return created
    },
    onSuccess: (data) => {
      if (data) {
        setProfile(data)
      }
    },
  })

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !profile) {
      sync({
        auth_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        first_name: user.firstName ?? '',
        last_name: user.lastName ?? '',
        phone: (user.publicMetadata?.phone_number as string) ?? '',
      })
    }
  }, [isLoaded, isSignedIn, user, profile, sync])

  return {
    isLoading: isLoaded && isSignedIn && !profile,
    profile,
  }
}
