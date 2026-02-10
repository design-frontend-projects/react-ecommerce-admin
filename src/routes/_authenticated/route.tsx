import { useRef, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useUserSync } from '@/features/respos/hooks/use-user-sync'

const AuthenticatedRoute = () => {
  const { isLoaded, userId } = useAuth()
  const navigate = useNavigate()
  const hasToasted = useRef(false)

  // Sync Clerk user to public.users and res_employees
  useUserSync()

  useEffect(() => {
    if (isLoaded && !userId && !hasToasted.current) {
      toast.error('You must be logged in to access this page.')
      hasToasted.current = true
      navigate({ to: '/sign-in' })
    }
  }, [isLoaded, userId, navigate])

  if (!isLoaded || !userId) {
    return null
  }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
