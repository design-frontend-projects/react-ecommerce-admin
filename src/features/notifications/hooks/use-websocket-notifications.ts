import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  UserNotificationItem,
  NotificationItem,
  NotificationType,
  NotificationTargetType,
} from '../data/schema'
import { playNotificationSound } from '../lib/notification-sound'
import { useNotificationPreferences } from './use-notification-preferences'

export { playNotificationSound }

export interface RealtimeNotificationEnvelope {
  v: number
  id: string
  tenant_id: string
  channel_id?: string | null
  type: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'CRITICAL'
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical'
  target_type: string
  title: string
  message: string
  action?: {
    url?: string | null
    label?: string | null
  }
  metadata?: Record<string, unknown>
  idempotency_key?: string | null
  created_at: string
}

let sharedSocket: Socket | null = null

export function useWebSocketNotifications() {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState<string>('polling')
  const [activeSocket, setActiveSocket] = useState<Socket | null>(() => sharedSocket)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function initSocket() {
      if (!isSignedIn) {
        if (sharedSocket) {
          sharedSocket.disconnect()
          sharedSocket = null
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token || isCancelled) return

      if (sharedSocket && sharedSocket.connected) {
        setIsConnected(true)
        setActiveSocket(sharedSocket)
        setTransport(sharedSocket.io.engine.transport.name)
        return
      }

      const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin

      const socket = io(wsUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      })

      socketRef.current = socket
      sharedSocket = socket
      setActiveSocket(socket)

      socket.on('connect', () => {
        if (isCancelled) return
        setIsConnected(true)
        setTransport(socket.io.engine.transport.name)

        socket.io.engine.on('upgrade', (rawTransport) => {
          if (!isCancelled) {
            setTransport(rawTransport.name)
          }
        })
      })

      socket.on('disconnect', () => {
        if (!isCancelled) {
          setIsConnected(false)
        }
      })

      socket.on('connect_error', () => {
        if (!isCancelled) {
          setIsConnected(false)
        }
      })

      // ── Real-time Notification Event ───────────────────────────────────────
      socket.on('notification:new', (payload: RealtimeNotificationEnvelope) => {
        const preferences = useNotificationPreferences.getState()

        // 1. Play auditory alert if enabled
        if (preferences.soundEnabled) {
          playNotificationSound(payload.severity)
        }

        // 2. Display interactive Toast if enabled
        if (preferences.toastsEnabled) {
          const actionButton = payload.action?.url
            ? {
                label: payload.action.label || 'View',
                onClick: () => {
                  if (payload.action?.url) {
                    window.location.href = payload.action.url
                  }
                },
              }
            : undefined

          if (payload.severity === 'CRITICAL' || payload.severity === 'ERROR') {
            toast.error(payload.title, {
              description: payload.message,
              action: actionButton,
              duration: 8000,
            })
          } else if (payload.severity === 'WARNING') {
            toast.warning(payload.title, {
              description: payload.message,
              action: actionButton,
              duration: 6000,
            })
          } else if (payload.severity === 'SUCCESS') {
            toast.success(payload.title, {
              description: payload.message,
              action: actionButton,
              duration: 5000,
            })
          } else {
            toast.info(payload.title, {
              description: payload.message,
              action: actionButton,
              duration: 5000,
            })
          }
        }

        // 3. Optimistically prepend new notification to TanStack Query cache
        queryClient.setQueryData(
          ['notifications', 'user'],
          (old: { notifications: UserNotificationItem[]; unreadCount: number } | undefined) => {
            const newItem: UserNotificationItem = {
              id: payload.id,
              notification_id: payload.id,
              tenant_id: payload.tenant_id,
              is_read: false,
              is_archived: false,
              is_deleted: false,
              retry_count: 0,
              delivery_status: 'delivered',
              created_at: payload.created_at,
              notifications: {
                id: payload.id,
                tenant_id: payload.tenant_id,
                title: payload.title,
                message: payload.message,
                content: payload.message,
                severity: payload.severity,
                priority: payload.priority,
                type: payload.type as NotificationType,
                target_type: payload.target_type as NotificationTargetType,
                action_url: payload.action?.url,
                action_label: payload.action?.label,
                metadata: payload.metadata ?? {},
                is_active: true,
                is_archived: false,
                created_at: payload.created_at,
                updated_at: payload.created_at,
              } as NotificationItem,
            }

            if (!old) {
              return {
                notifications: [newItem],
                unreadCount: 1,
              }
            }

            // Check if already in cache (deduplication)
            if (old.notifications.some((n) => n.id === payload.id || n.notification_id === payload.id)) {
              return old
            }

            return {
              notifications: [newItem, ...old.notifications],
              unreadCount: old.unreadCount + 1,
            }
          }
        )
      })

      // ── Unread count broadcast ─────────────────────────────────────────────
      socket.on('notification:unread_count', (data: { count: number }) => {
        queryClient.setQueryData(
          ['notifications', 'user'],
          (old: { notifications: UserNotificationItem[]; unreadCount: number } | undefined) => {
            if (!old) return { notifications: [], unreadCount: data.count }
            return { ...old, unreadCount: data.count }
          }
        )
      })
    }

    void initSocket()

    return () => {
      isCancelled = true
    }
  }, [isSignedIn, queryClient])

  return {
    isConnected,
    transport,
    socket: activeSocket,
  }
}
