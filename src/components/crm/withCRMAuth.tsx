import React, { useEffect, useState } from 'react'
import { UserRole } from '@/types/user-role.enum'

// Mock authentication check hook for frontend
function useAuthRole() {
  // Hardcoded for demonstration, ideally from an auth provider (Clerk/Supabase)
  return { role: UserRole.Admin, loading: false }
}

export function withCRMAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithCRMAuth(props: P) {
    const { role, loading } = useAuthRole()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
      if (!loading) {
        if (role === UserRole.Admin || role === UserRole.Manager) {
          setAuthorized(true)
        }
      }
    }, [role, loading])

    if (loading) return <div>Loading CRM...</div>
    if (!authorized)
      return (
        <div className='p-6 text-red-500'>
          Access Denied: Requires Manager or Admin role.
        </div>
      )

    return <WrappedComponent {...props} />
  }
}
