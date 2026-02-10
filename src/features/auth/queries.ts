// User Module Query Hook
// Fetches user module assignments from Supabase
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { supabase } from '@/lib/supabase'
import type { User } from './types'

export const userQueryKeys = {
  all: ['users'] as const,
  current: () => [...userQueryKeys.all, 'current'] as const,
  byClerkId: (clerkId: string) =>
    [...userQueryKeys.all, 'clerk', clerkId] as const,
}

// Get user by Clerk ID
async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkId)
    .single()

  if (error) {
    // User might not exist yet
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

// Hook to get current user's module access
export function useCurrentUserModules() {
  const { user: clerkUser, isLoaded } = useUser()

  return useQuery({
    queryKey: userQueryKeys.byClerkId(clerkUser?.id ?? ''),
    queryFn: () => getUserByClerkId(clerkUser!.id),
    enabled: isLoaded && !!clerkUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to check if user has access to a specific module
export function useHasModuleAccess(module: 'inventory' | 'restaurant') {
  const { data: user, isLoading } = useCurrentUserModules()

  return {
    hasAccess: user?.modules?.includes(module) ?? false,
    isPrimaryModule: user?.primary_module === module,
    isLoading,
  }
}
