import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UserNotificationItem,
  type SendNotificationInput,
  type NotificationTemplateItem,
  type NotificationChannelItem,
  type CreateTemplateInput,
} from '../data/schema'
import { useAuth } from '@/hooks/use-auth'
import { authorizedRequest } from '@/lib/api-client'
import { supabase } from '@/lib/supabase'

async function getAuthToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

import { useWebSocketNotifications } from './use-websocket-notifications'

export function useUserNotifications() {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const { isConnected, transport, socket } = useWebSocketNotifications()

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
    // Real-time WebSocket active: back off polling to 60s; if disconnected: poll every 15s
    refetchInterval: isConnected ? 60000 : 15000,
    refetchOnWindowFocus: true,
  })

  const markReadMutation = useMutation({
    mutationFn: async (userNotificationId: string) => {
      return authorizedRequest(getAuthToken, '/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ userNotificationId }),
      })
    },
    onMutate: async (userNotificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', 'user'] })
      const previous = queryClient.getQueryData(['notifications', 'user'])

      queryClient.setQueryData(
        ['notifications', 'user'],
        (old: { notifications: UserNotificationItem[]; unreadCount: number } | undefined) => {
          if (!old) return old
          const updated = old.notifications.map((n) =>
            n.id === userNotificationId || n.notification_id === userNotificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
          const newUnread = Math.max(0, old.unreadCount - 1)
          return { ...old, notifications: updated, unreadCount: newUnread }
        }
      )

      try {
        socket?.emit('notification:read', { notification_id: userNotificationId })
      } catch {
        // Socket emit is non-blocking best effort
      }

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', 'user'], context.previous)
      }
    },
    onSettled: () => {
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', 'user'] })
      const previous = queryClient.getQueryData(['notifications', 'user'])

      queryClient.setQueryData(
        ['notifications', 'user'],
        (old: { notifications: UserNotificationItem[]; unreadCount: number } | undefined) => {
          if (!old) return old
          const updated = old.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          }))
          return { ...old, notifications: updated, unreadCount: 0 }
        }
      )

      try {
        socket?.emit('notification:read_all')
      } catch {
        // Socket emit is non-blocking best effort
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', 'user'], context.previous)
      }
    },
    onSettled: () => {
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
    isConnected,
    transport,
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
      )) as { data?: unknown[] }
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

  // Channels query
  const channelsQuery = useQuery({
    queryKey: ['notifications', 'channels'],
    queryFn: async () => {
      const res = (await authorizedRequest(
        getAuthToken,
        '/api/notifications?mode=channels'
      )) as { data?: NotificationChannelItem[] }
      return res.data ?? []
    },
  })

  return {
    historyLog: historyQuery.data ?? [],
    isHistoryLoading: historyQuery.isLoading,
    refetchHistory: historyQuery.refetch,

    templates: templatesQuery.data ?? [],
    isTemplatesLoading: templatesQuery.isLoading,

    channels: channelsQuery.data ?? [],
    isChannelsLoading: channelsQuery.isLoading,

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
