import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UserNotificationItem,
  type SendNotificationInput,
  type NotificationTemplateItem,
  type CreateTemplateInput,
} from '../data/schema'
import { useAuth } from '@/hooks/use-auth'
import { authorizedRequest } from '@/lib/api-client'
import { supabase } from '@/lib/supabase'

async function getAuthToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function useUserNotifications() {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', 'user'],
    queryFn: async () => {
      const res = (await authorizedRequest(getAuthToken, '/api/notifications')) as {
        data?: {
          notifications: UserNotificationItem[]
          unreadCount: number
        }
      }
      return res.data ?? { notifications: [], unreadCount: 0 }
    },
    enabled: !!isSignedIn,
    // Real-time polling every 10 seconds when app is open
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const markReadMutation = useMutation({
    mutationFn: async (userNotificationId: string) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ userNotificationId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'user'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAll: true }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'user'] })
    },
  })

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markAsRead: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    markAllAsRead: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
  }
}

export function useAdminNotifications() {
  const queryClient = useQueryClient()

  // Sent log query
  const historyQuery = useQuery({
    queryKey: ['notifications', 'admin_history'],
    queryFn: async () => {
      const res = (await authorizedRequest(
        getAuthToken,
        '/api/notifications?mode=admin_history'
      )) as { data?: any[] }
      return res.data ?? []
    },
  })

  // Templates query
  const templatesQuery = useQuery({
    queryKey: ['notifications', 'templates'],
    queryFn: async () => {
      const res = (await authorizedRequest(
        getAuthToken,
        '/api/notifications?mode=templates'
      )) as { data?: NotificationTemplateItem[] }
      return res.data ?? []
    },
  })

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async (payload: SendNotificationInput) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ action: 'send', payload }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: CreateTemplateInput) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_template', payload }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'templates'] })
    },
  })

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      payload,
    }: {
      templateId: string
      payload: Partial<CreateTemplateInput>
    }) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_template', templateId, payload }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'templates'] })
    },
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_template', templateId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'templates'] })
    },
  })

  return {
    historyLog: historyQuery.data ?? [],
    isHistoryLoading: historyQuery.isLoading,
    refetchHistory: historyQuery.refetch,

    templates: templatesQuery.data ?? [],
    isTemplatesLoading: templatesQuery.isLoading,

    sendNotification: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,

    createTemplate: createTemplateMutation.mutateAsync,
    isCreatingTemplate: createTemplateMutation.isPending,

    updateTemplate: updateTemplateMutation.mutateAsync,
    isUpdatingTemplate: updateTemplateMutation.isPending,

    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isDeletingTemplate: deleteTemplateMutation.isPending,
  }
}
