import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { profileService } from '@/features/auth/services/profile-service'

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

      const profile = await profileService.getProfile(data.user.id)
      navigate({
        to: profile?.onboarding_complete ? '/' : '/complete-account',
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
