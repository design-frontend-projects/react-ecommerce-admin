import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRBACStore } from './store'
import type { Role } from './schema'

export function useUserRoles(clerkUserId: string | undefined | null) {
  const setRoles = useRBACStore((state) => state.setRoles)
  const setPermissions = useRBACStore((state) => state.setPermissions)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['userRoles', clerkUserId],
    queryFn: async () => {
      if (!clerkUserId) return []
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          tenant_id,
          roles (
            id,
            name,
            permissions
          )
        `)
        .eq('clerk_user_id', clerkUserId)

      if (error) throw error
      
      // The join returns an array or single object depending on relation, typically it's an array for single to single, or single object.
      // Assuming 'roles' is fetched as a single object per user_role because many-to-one
      const roles = data?.map((ur) => ur.roles as unknown as Role).filter(Boolean) || []
      const permissions = roles.flatMap(r => r.permissions || [])
      
      setRoles(roles)
      setPermissions(permissions)
      
      return roles
    },
    enabled: !!clerkUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Realtime subscription to dynamic role assignment updates
  useEffect(() => {
    if (!clerkUserId) return

    const channel = supabase
      .channel(`user-roles-${clerkUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `clerk_user_id=eq.${clerkUserId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['userRoles', clerkUserId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clerkUserId, queryClient])

  return query
}
