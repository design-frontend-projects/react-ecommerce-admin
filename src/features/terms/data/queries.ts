import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const termsQueryKey = () => ['app_terms'] as const

export interface AppTerm {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  version: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type UpdateAppTermInput = {
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
}

export async function fetchActiveTerms(): Promise<AppTerm | null> {
  const { data, error } = await supabase
    .from('app_terms')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }
  return data
}

export function useActiveTerms() {
  return useQuery({
    queryKey: termsQueryKey(),
    queryFn: fetchActiveTerms,
  })
}

export function useUpdateTermsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAppTermInput) => {
      // Get the currently authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First, get any existing active terms to deactivate or update
      const { data: existing } = await supabase
        .from('app_terms')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Update the existing row
        const { data, error } = await supabase
          .from('app_terms')
          .update({
            title_en: input.title_en,
            title_ar: input.title_ar,
            content_en: input.content_en,
            content_ar: input.content_ar,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('app_terms')
          .insert({
            title_en: input.title_en,
            title_ar: input.title_ar,
            content_en: input.content_en,
            content_ar: input.content_ar,
            updated_by: user.id,
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: termsQueryKey() })
    },
  })
}
