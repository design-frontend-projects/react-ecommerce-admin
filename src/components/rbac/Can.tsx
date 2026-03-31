import { useUser } from '@clerk/clerk-react'
import React from 'react'

interface CanProps {
  /** The specific role required (e.g. 'super_admin', 'admin', 'manager') */
  role?: string | string[]
  /** Any child nodes to render if authorized */
  children: React.ReactNode
  /** Optional fallback to render if unauthorized */
  fallback?: React.ReactNode
}

/**
 * Authorization component that renders children only if the current user
 * has the required role(s) specified in their Clerk publicMetadata.
 */
export function Can({ role, children, fallback = null }: CanProps) {
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) {
    return <>{fallback}</>
  }

  // Get user role from Clerk public metadata
  const userRole = (user.publicMetadata as { role?: string })?.role

  if (!userRole) {
    return <>{fallback}</>
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(userRole)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
