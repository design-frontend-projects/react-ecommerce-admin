import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { LoginEmailForm } from '@/components/auth/LoginEmailForm'
import { LoginOtpForm } from '@/components/auth/LoginOtpForm'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { EmailFormData, OtpFormData } from '@/lib/validation/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const state = useAuthStore.getState()
    if (state.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true,
        },
      })
      
      if (error) throw error
      
      setEmail(data.email)
      toast.success('Check your email for the login code')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send login code'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (data: OtpFormData) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: 'email',
      })
      
      if (error) throw error
      
      if (authData.session) {
        useAuthStore.getState().setSession(authData.session)
        // TanStack Router will automatically handle the redirect in beforeLoad
        // if we navigate to the dashboard or it might require an explicit navigate
        navigate({ to: '/' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid login code'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      })
      if (error) throw error
      toast.success('A new code has been sent to your email')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend code'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-card p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to Bluewave POS
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {email ? 'Enter the code sent to your email' : 'Sign in or create an account to continue'}
          </p>
        </div>

        {!email ? (
          <LoginEmailForm onSubmit={handleEmailSubmit} isLoading={isLoading} />
        ) : (
          <LoginOtpForm
            email={email}
            onSubmit={handleOtpSubmit}
            onResend={handleResend}
            onBack={() => setEmail(null)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
