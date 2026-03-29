import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string | null
  is_owner: boolean
  system_owner: boolean
  created_at: string
  updated_at: string
}

export const profilesKeys = {
  all: ['profiles'] as const,
  list: () => [...profilesKeys.all, 'list'] as const,
  detail: (id: string) => [...profilesKeys.all, 'detail', id] as const,
}

export function useProfiles() {
  return useQuery({
    queryKey: profilesKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<Profile> & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesKeys.all })
      toast.success('Profile updated successfully')
    },
    onError: (error: any) => {
      toast.error(`Error updating profile: ${error.message}`)
    },
  })
}

export function useToggleSystemOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      profileId,
      isActive,
    }: {
      profileId: string
      isActive: boolean
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ system_owner: isActive })
        .eq('id', profileId)
        .select()
        .maybeSingle()

      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesKeys.all })
      toast.success('System owner status updated')
    },
    onError: (error: any) => {
      toast.error(`Error toggling system owner: ${error.message}`)
    },
  })
}
