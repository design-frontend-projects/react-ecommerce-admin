import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuthQuery } from '@/hooks/use-auth-query'
import {
  createButton,
  deleteButton,
  fetchButtons,
  updateButton,
} from '../data/actions'
import type { CreateButtonInput, UpdateButtonInput } from '../data/schema'
import { navigationQueryKey } from './use-navigation'
import { screensQueryKey } from './use-screens'

export const buttonsQueryKey = ['rbac-buttons'] as const

/** Permission-button catalog (server GET is gated by `screens.view`). */
export function useButtons(enabled = true) {
  return useAuthQuery({
    queryKey: buttonsQueryKey,
    queryFn: (getToken) => fetchButtons(getToken),
    enabled,
    rbac: { permission: 'screens.view' },
    staleTime: 60_000,
  })
}

function useInvalidateButtonData() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: buttonsQueryKey })
    // Screen rows render button codes; the sidebar maps buttons → permissions.
    void queryClient.invalidateQueries({ queryKey: screensQueryKey })
    void queryClient.invalidateQueries({ queryKey: navigationQueryKey })
  }
}

export function useCreateButton() {
  const invalidate = useInvalidateButtonData()

  return useAuthMutation({
    mutationFn: (getToken, input: CreateButtonInput) =>
      createButton(getToken, input),
    rbac: { permission: 'buttons.manage' },
    onSuccess: () => {
      toast.success('Button created.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create the button.')
    },
  })
}

export function useUpdateButton() {
  const invalidate = useInvalidateButtonData()

  return useAuthMutation({
    mutationFn: (getToken, input: UpdateButtonInput) =>
      updateButton(getToken, input),
    rbac: { permission: 'buttons.manage' },
    onSuccess: () => {
      toast.success('Button updated.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update the button.')
    },
  })
}

export function useDeleteButton() {
  const invalidate = useInvalidateButtonData()

  return useAuthMutation({
    mutationFn: (getToken, buttonId: string) =>
      deleteButton(getToken, buttonId),
    rbac: { permission: 'buttons.manage' },
    onSuccess: () => {
      toast.success('Button deleted.')
      invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to delete the button.')
    },
  })
}
