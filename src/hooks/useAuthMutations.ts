import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { EmailFormData, OtpFormData } from '@/lib/validation/auth'

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: async (data: EmailFormData) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true,
        },
      })
      
      if (error) throw error
      return { success: true, email: data.email }
    },
  })
}

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: async (data: OtpFormData) => {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: 'email',
      })
      
      if (error) throw error
      
      if (authData.session) {
        useAuthStore.getState().auth.setSession(authData.session)
      }
      
      return authData
    },
  })
}
