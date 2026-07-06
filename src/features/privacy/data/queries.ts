import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PrivacyPolicy {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  version: string | null
  is_active: boolean
  updated_at: string
}

export function useActivePrivacy() {
  return useQuery({
    queryKey: ['privacy', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_privacy')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }
      return (data as PrivacyPolicy) || null
    },
  })
}

export function useUpdatePrivacyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      title_en: string
      title_ar: string
      content_en: string
      content_ar: string
    }) => {
      const { data: userResponse } = await supabase.auth.getUser()
      if (!userResponse.user) {
        throw new Error('Not authenticated')
      }

      // First, set all existing active privacy policies to inactive
      await supabase
        .from('app_privacy')
        .update({ is_active: false })
        .eq('is_active', true)

      // Then insert the new active one
      const { data, error } = await supabase
        .from('app_privacy')
        .insert({
          title_en: payload.title_en,
          title_ar: payload.title_ar,
          content_en: payload.content_en,
          content_ar: payload.content_ar,
          is_active: true,
          updated_by: userResponse.user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'active'] })
    },
  })
}
