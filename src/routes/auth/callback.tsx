import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function finishCallback() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        navigate({ to: '/sign-in', replace: true })
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Ensure tenant_users record is provisioned for this user
      if (session?.access_token) {
        try {
          await fetch('/api/auth/provision-signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              firstName: data.user.user_metadata?.firstName,
              lastName: data.user.user_metadata?.lastName,
            }),
          })
        } catch (err) {
          console.error('Failed to auto-provision user on callback:', err)
        }
      }

      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('onboarding_complete, parent_tenant_id, tenants(onboarding_complete)')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      let tenantOnboardingComplete =
        (tenantUser?.tenants as any)?.onboarding_complete === true ||
        tenantUser?.onboarding_complete === true

      if (!tenantOnboardingComplete && data.user.id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('onboarding_complete')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()
        if (tenant?.onboarding_complete === true) {
          tenantOnboardingComplete = true
        }
      }

      const isStaffUser = tenantUser?.parent_tenant_id != null
      const isOnboardingComplete = tenantOnboardingComplete || isStaffUser

      navigate({
        to: isOnboardingComplete ? '/' : '/complete-account',
        replace: true,
      })
    }

    void finishCallback()
  }, [navigate])

  return (
    <div className='flex h-screen w-full items-center justify-center bg-background'>
      <Loader2 className='h-10 w-10 animate-spin text-primary' />
    </div>
  )
}

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})
