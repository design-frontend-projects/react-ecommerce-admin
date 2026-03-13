import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'

const SystemLayout = () => {
  const { isSystemOwner, profile } = useSystemOwner()
  const navigate = useNavigate()

  // useEffect(() => {
  //   if (profile && !isSystemOwner) {
  //     navigate({ to: '/' })
  //   }
  // }, [profile, isSystemOwner, navigate])

  // if (!profile) {
  //   return <div>Loading...</div>
  // }

  // if (!isSystemOwner) {
  //   return null
  // }

  return <Outlet />
}

export const Route = createFileRoute('/_authenticated/_system')({
  component: SystemLayout,
})
