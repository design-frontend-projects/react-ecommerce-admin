// RBAC Hook for ResPOS
// Provides permission checking and employee context
import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useResposStore } from '@/stores/respos-store'
import { useEmployeeByUserId } from '../api/queries'
import {
  canAccessPayment,
  canApproveVoid,
  canOnlyRequestVoid,
  canOpenShift,
  getHighestRole,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  isAdmin,
} from '../lib/rbac'
import type { Permission, ResEmployeeWithRoles, RoleName } from '../types'

export function useResposAuth() {
  const { user, isLoaded: isClerkLoaded, isSignedIn } = useUser()
  const { currentEmployee, setCurrentEmployee } = useResposStore()

  const {
    data: employee,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useEmployeeByUserId(user?.id)

  // Sync employee to store
  useEffect(() => {
    if (employee && employee.id !== currentEmployee?.id) {
      setCurrentEmployee(employee)
    }
  }, [employee, currentEmployee?.id, setCurrentEmployee])

  const isLoading = !isClerkLoaded || isEmployeeLoading
  const isAuthenticated = isSignedIn && !!employee
  const isResposEmployee = !!employee

  return {
    // Loading state
    isLoading,
    isAuthenticated,
    isResposEmployee,
    error: employeeError,

    // Current user data
    clerkUser: user,
    employee: employee || null,

    // Permission helpers
    hasPermission: (permission: Permission) =>
      hasPermission(employee || null, permission),
    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(employee || null, permissions),
    hasRole: (roleName: RoleName) => hasRole(employee || null, roleName),
    hasAnyRole: (roleNames: RoleName[]) =>
      hasAnyRole(employee || null, roleNames),

    // Specific permission checks
    canAccessPayment: canAccessPayment(employee || null),
    canApproveVoid: canApproveVoid(employee || null),
    canOnlyRequestVoid: canOnlyRequestVoid(employee || null),
    isAdmin: isAdmin(employee || null),
    canOpenShift: canOpenShift(employee || null),
    highestRole: getHighestRole(employee || null),
  }
}

// Component guard for permission-based rendering
export function useRequirePermission(permission: Permission | Permission[]): {
  hasAccess: boolean
  isLoading: boolean
  employee: ResEmployeeWithRoles | null
} {
  const { employee, isLoading } = useResposAuth()

  const hasAccess = Array.isArray(permission)
    ? hasAnyPermission(employee, permission)
    : hasPermission(employee, permission)

  return {
    hasAccess,
    isLoading,
    employee,
  }
}

// Component guard for role-based rendering
export function useRequireRole(role: RoleName | RoleName[]): {
  hasAccess: boolean
  isLoading: boolean
  employee: ResEmployeeWithRoles | null
} {
  const { employee, isLoading } = useResposAuth()

  const hasAccess = Array.isArray(role)
    ? hasAnyRole(employee, role)
    : hasRole(employee, role)

  return {
    hasAccess,
    isLoading,
    employee,
  }
}
