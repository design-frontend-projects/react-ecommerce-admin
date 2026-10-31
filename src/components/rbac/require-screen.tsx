/**
 * src/components/rbac/require-screen.tsx
 *
 * Route-level fail-closed screen guard driven by the centralized permissions engine.
 */

import React, { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ForbiddenError } from '@/features/errors/forbidden'
import { usePermissions } from '@/hooks/use-permissions'
import { useUser } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

// Default to enabled (fail-closed) unless explicitly set to 'false'
const SCREEN_GUARD_ENABLED = import.meta.env.VITE_DB_NAV !== 'false'

const WHITELISTED_SYSTEM_PATHS = new Set([
  '/',
  '/profile',
  '/complete-account',
  '/force-password-change',
  '/subscription-required',
  '/403',
  '/errors/403',
])

export interface RequireScreenProps {
  children: React.ReactNode
  screen?: string
  fallback?: React.ReactNode
  redirectTo?: string
}

export function RequireScreen({
  children,
  screen,
  fallback = null,
  redirectTo,
}: RequireScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const { canAccessScreen, isLoading, data } = usePermissions()

  const targetPath = screen ?? location.pathname
  const isWhitelisted = WHITELISTED_SYSTEM_PATHS.has(targetPath)
  const isReady = isLoaded && (!isLoading || Boolean(data) || isWhitelisted)
  const allowed =
    !SCREEN_GUARD_ENABLED || isWhitelisted || (Boolean(user) && canAccessScreen(targetPath))

  useEffect(() => {
    if (isReady && !allowed && redirectTo) {
      navigate({ to: redirectTo as never }).catch(() => {})
    }
  }, [isReady, allowed, redirectTo, navigate])

  // Fail-closed while auth or permissions are loading (prevent flashing protected content)
  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!allowed) {
    return <>{fallback ?? <ForbiddenError />}</>
  }

  return <>{children}</>
}
