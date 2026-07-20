import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchRBACCatalog } from '@/features/users/data/actions'
import { rbacCatalogQueryKey } from '@/features/users/hooks/use-roles-permissions'
import {
  createScreen,
  deleteScreen,
  fetchScreens,
  setScreenAccess,
  setScreenButtons,
  updateScreen,
} from '../data/actions'
import type {
  CreateScreenInput,
  SetScreenAccessInput,
  SetScreenButtonsInput,
  UpdateScreenInput,
} from '../data/schema'
import { navigationQueryKey } from './use-navigation'

export const screensQueryKey = ['rbac-screens'] as const

/** Full screens registry (modules → screens with roles/permissions/buttons). */
export function useScreens(enabled = true) {
  return useAuthQuery({
    queryKey: screensQueryKey,
    queryFn: (getToken) => fetchScreens(getToken),
    enabled,
    rbac: { permission: 'screens.view' },
    staleTime: 60_000,
  })
}

/**
 * Roles + permissions catalog for the "manage access" checklists. Shares the
 * `rbac-catalog` cache with the users feature but gates on the screens-admin
 * permission instead of `roles.manage`.
 */
export function useAccessCatalog(enabled = true) {
  return useAuthQuery({
    queryKey: rbacCatalogQueryKey,
    queryFn: (getToken) => fetchRBACCatalog(getToken),
    enabled,
    rbac: { permission: 'screens.manage' },
    staleTime: 60_000,
  })
}

function useInvalidateScreenData() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: screensQueryKey })
    // The DB-driven sidebar reads the same tables — keep it in sync.
    void queryClient.invalidateQueries({ queryKey: navigationQueryKey })
  }
}

export function useCreateScreen() {
  const invalidate = useInvalidateScreenData()

  return useAuthMutation({
    mutationFn: (getToken, input: CreateScreenInput) =>
      createScreen(getToken, input),
    rbac: { permission: 'screens.manage' },
    onSuccess: () => {
      toast.success('Screen created.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create the screen.')
    },
  })
}

export function useUpdateScreen() {
  const invalidate = useInvalidateScreenData()

  return useAuthMutation({
    mutationFn: (getToken, input: UpdateScreenInput) =>
      updateScreen(getToken, input),
    rbac: { permission: 'screens.manage' },
    onSuccess: () => {
      toast.success('Screen updated.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update the screen.')
    },
  })
}

export function useDeleteScreen() {
  const invalidate = useInvalidateScreenData()

  return useAuthMutation({
    mutationFn: (getToken, screenId: string) =>
      deleteScreen(getToken, screenId),
    rbac: { permission: 'screens.manage' },
    onSuccess: () => {
      toast.success('Screen deleted.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to delete the screen.')
    },
  })
}

/** Replace the role + permission grants that unlock a screen. */
export function useSetScreenAccess() {
  const invalidate = useInvalidateScreenData()

  return useAuthMutation({
    mutationFn: (getToken, input: SetScreenAccessInput) =>
      setScreenAccess(getToken, input),
    rbac: { permission: 'screens.manage' },
    onSuccess: () => {
      toast.success('Screen access saved.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to save screen access.')
    },
  })
}

/**
 * Replace the active permission-button set on a screen. The server upserts a
 * `<screen>.<button>` permission per button, so the RBAC catalog is
 * invalidated too.
 */
export function useSetScreenButtons() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateScreenData()

  return useAuthMutation({
    mutationFn: (getToken, input: SetScreenButtonsInput) =>
      setScreenButtons(getToken, input),
    rbac: { permission: 'buttons.manage' },
    onSuccess: () => {
      toast.success('Screen buttons saved.')
      invalidate()
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to save screen buttons.')
    },
  })
}
