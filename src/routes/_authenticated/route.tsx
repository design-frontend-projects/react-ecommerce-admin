import { useRef, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

const AuthenticatedRoute = () => {
  const { isLoaded, userId } = useAuth()
  const navigate = useNavigate()
  const hasToasted = useRef(false)

  useEffect(() => {
    if (!isLoaded) {
      toast.error('You must be logged in to access this page.')
      hasToasted.current = true
      navigate({ to: '/sign-in' })
    }
    if (!userId && !hasToasted.current) {
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
