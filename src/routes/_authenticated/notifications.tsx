import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { UserRole } from '@/types/user-role.enum'
import {
  Bell,
  Send,
  FileText,
  History,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Loader2,
  Sparkles,
  Inbox,
  CheckCheck,
  Search,
  Volume2,
  ExternalLink,
  RefreshCw,
  Radio,
  SlidersHorizontal,
  Layers,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import type {
  NotificationSeverity,
  NotificationTargetType,
  NotificationTemplateItem,
  NotificationChannelItem,
  UserNotificationItem,
} from '@/features/notifications/data/schema'
import {
  useUserNotifications,
  useAdminNotifications,
} from '@/features/notifications/hooks/use-notifications'
import { useNotificationPreferences } from '@/features/notifications/hooks/use-notification-preferences'

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationCenterPage,
})

interface NotificationHistoryRecipient {
  id: string
  is_read: boolean
  read_at?: string | null
}

interface NotificationHistoryLogItem {
  id: string
  title: string
  content?: string
  message?: string
  severity: NotificationSeverity
  target_type: string
  target_role?: string | null
  created_at: string
  user_notifications?: NotificationHistoryRecipient[]
}

type NotificationChannelWithCount = NotificationChannelItem & {
  _count?: { notification_channel_members?: number }
}

function NotificationCenterPage() {
  const { has } = useAuth()
  const isAdmin =
    has({ role: UserRole.Admin }) ||
    has({ role: UserRole.SuperAdmin }) ||
    has({ permission: 'general.notifications.manage' })

  // User Notifications Hook (All authenticated users)
  const {
    notifications,
    unreadCount,
    isLoading: isUserLoading,
    refetch: refetchUserNotifications,
    markAsRead,
    isMarkingRead,
    markAllAsRead,
    isMarkingAllRead,
    isConnected,
    transport,
  } = useUserNotifications()

  // Notification Preferences Store (Zustand)
  const {
    soundEnabled,
    toastsEnabled,
    minSeverity,
    setSoundEnabled,
    setToastsEnabled,
    setMinSeverity,
    playTestSound,
  } = useNotificationPreferences()

  // Admin Notifications Hook (Admins & Managers)
  const {
    historyLog,
    isHistoryLoading,
    templates,
    isTemplatesLoading,
    channels,
    isChannelsLoading,
    sendNotification,
    isSending,
    createTemplate,
    isCreatingTemplate,
    updateTemplate,
    isUpdatingTemplate,
    deleteTemplate,
  } = useAdminNotifications()

  // Filter & Search State for Inbox
  const [activeTab, setActiveTab] = useState('inbox')
  const [inboxStatusFilter, setInboxStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [inboxSeverityFilter, setInboxSeverityFilter] = useState<string>('all')
  const [inboxSearch, setInboxSearch] = useState('')

  // Form State for Sending Broadcast
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [severity, setSeverity] = useState<NotificationSeverity>('INFO')
  const [targetType, setTargetType] = useState<NotificationTargetType>('ALL')
  const [targetRole, setTargetRole] = useState<string>('staff')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string>('')

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplateItem | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateHeader, setTemplateHeader] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [templateSeverity, setTemplateSeverity] =
    useState<NotificationSeverity>('INFO')

  // Fetch users for target user selection (Admin only)
  const { data: employees } = useQuery({
    queryKey: ['tenant_users', 'notification_target'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('id, auth_user_id, first_name, last_name, email, default_role')
        .eq('is_active', true)
        .order('first_name')
      if (error) throw error
      return data || []
    },
    enabled: isAdmin,
  })

  // Helpers to safely extract fields across relational / legacy models
  const getTitle = (n: UserNotificationItem) =>
    n.notifications?.title || (n as unknown as { title?: string }).title || 'Notification'

  const getMessage = (n: UserNotificationItem) =>
    n.notifications?.message ||
    n.notifications?.content ||
    (n as unknown as { message?: string; content?: string }).message ||
    (n as unknown as { message?: string; content?: string }).content ||
    ''

  const getSeverity = (n: UserNotificationItem): NotificationSeverity =>
    (n.notifications?.severity ||
      (n as unknown as { severity?: NotificationSeverity }).severity ||
      'INFO') as NotificationSeverity

  const getActionUrl = (n: UserNotificationItem) =>
    n.notifications?.action_url ||
    (n as unknown as { action_url?: string }).action_url ||
    null

  const getActionLabel = (n: UserNotificationItem) =>
    n.notifications?.action_label ||
    (n as unknown as { action_label?: string }).action_label ||
    'View Details'

  // Filtered Notifications for Inbox
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Status filter
      if (inboxStatusFilter === 'unread' && item.is_read) return false
      if (inboxStatusFilter === 'read' && !item.is_read) return false

      // Severity filter
      const itemSev = getSeverity(item)
      if (inboxSeverityFilter !== 'all' && itemSev !== inboxSeverityFilter) return false

      // Search filter
      if (inboxSearch.trim()) {
        const query = inboxSearch.toLowerCase()
        const t = getTitle(item).toLowerCase()
        const m = getMessage(item).toLowerCase()
        if (!t.includes(query) && !m.includes(query)) return false
      }

      return true
    })
  }, [notifications, inboxStatusFilter, inboxSeverityFilter, inboxSearch])

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      setTitle(tpl.header ?? tpl.title_template ?? '')
      setContent(tpl.content ?? tpl.message_template ?? '')
      setSeverity(tpl.severity)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendSuccessMsg('')
    try {
      const res = await sendNotification({
        title,
        message: content,
        content,
        severity,
        target_type: targetType,
        target_role: targetType === 'ROLE' ? targetRole : undefined,
        target_user_ids: targetType === 'USER' ? selectedUserIds : undefined,
        template_id: selectedTemplateId || undefined,
      })

      setSendSuccessMsg(
        `Successfully sent notification to ${res.data?.recipientsCount ?? 0} recipient(s)!`
      )
      // Reset form
      setTitle('')
      setContent('')
      setSeverity('INFO')
      setTargetType('ALL')
      setSelectedUserIds([])
      setSelectedTemplateId('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send notification')
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTemplate) {
        await updateTemplate({
          templateId: editingTemplate.id,
          payload: {
            name: templateName,
            header: templateHeader,
            content: templateContent,
            severity: templateSeverity,
          },
        })
      } else {
        await createTemplate({
          name: templateName,
          header: templateHeader,
          content: templateContent,
          severity: templateSeverity,
        })
      }
      setIsTemplateModalOpen(false)
      setEditingTemplate(null)
      setTemplateName('')
      setTemplateHeader('')
      setTemplateContent('')
      setTemplateSeverity('INFO')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const openCreateTemplateModal = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateHeader('')
    setTemplateContent('')
    setTemplateSeverity('INFO')
    setIsTemplateModalOpen(true)
  }

  const openEditTemplateModal = (tpl: NotificationTemplateItem) => {
    setEditingTemplate(tpl)
    setTemplateName(tpl.name)
    setTemplateHeader(tpl.header ?? tpl.title_template ?? '')
    setTemplateContent(tpl.content ?? tpl.message_template ?? '')
    setTemplateSeverity(tpl.severity)
    setIsTemplateModalOpen(true)
  }

  const renderSeverityBadge = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'CRITICAL':
      case 'ERROR':
        return (
          <Badge
            variant='destructive'
            className='flex w-fit items-center gap-1 text-[10px] font-semibold tracking-wide uppercase'
          >
            <AlertOctagon className='h-3 w-3' /> Error
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge
            variant='outline'
            className='flex w-fit items-center gap-1 border-amber-500 bg-amber-50 text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-950 dark:text-amber-300'
          >
            <AlertTriangle className='h-3 w-3' /> Warning
          </Badge>
        )
      case 'SUCCESS':
        return (
          <Badge
            variant='outline'
            className='flex w-fit items-center gap-1 border-emerald-500 bg-emerald-50 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300'
          >
            <CheckCircle2 className='h-3 w-3' /> Success
          </Badge>
        )
      case 'INFO':
      default:
        return (
          <Badge
            variant='secondary'
            className='flex w-fit items-center gap-1 text-[10px] font-semibold tracking-wide uppercase'
          >
            <Info className='h-3 w-3' /> Info
          </Badge>
        )
    }
  }

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <Header />
      <Main className='mx-auto w-full max-w-7xl flex-1 space-y-6 p-6'>
        {/* Page Top Header with Live Indicator */}
        <div className='flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Bell className='h-5 w-5' />
              </div>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>
                  Notification Center
                </h1>
                <p className='text-xs text-muted-foreground'>
                  Real-time alerts, business event updates, channels & dispatch manager
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status & Quick Unread Count */}
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
                isConnected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <Radio className='h-3 w-3' />
              {isConnected ? `Live (${transport})` : 'Polling fallback'}
            </Badge>

            {unreadCount > 0 && (
              <Badge className='bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground'>
                {unreadCount} Unread
              </Badge>
            )}
          </div>
        </div>

        {/* Global Success Alert Banner */}
        {sendSuccessMsg && (
          <div className='flex items-center justify-between rounded-lg border border-emerald-500/50 bg-emerald-50 p-4 text-emerald-800 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-200'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <CheckCircle2 className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
              {sendSuccessMsg}
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setSendSuccessMsg('')}
              className='h-7 text-xs text-emerald-700 hover:bg-emerald-200/50'
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
          <TabsList className='flex h-10 w-full max-w-2xl justify-start overflow-x-auto bg-muted/60 p-1'>
            {/* INBOX (Available to all users) */}
            <TabsTrigger
              value='inbox'
              className='flex items-center gap-2 text-xs font-semibold'
            >
              <Inbox className='h-3.5 w-3.5' />
              My Inbox
              {unreadCount > 0 && (
                <span className='ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary'>
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>

            {/* PREFERENCES (Available to all users) */}
            <TabsTrigger
              value='preferences'
              className='flex items-center gap-2 text-xs font-semibold'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              Preferences
            </TabsTrigger>

            {/* ADMIN / MANAGER GATED TABS */}
            {isAdmin && (
              <>
                <TabsTrigger
                  value='composer'
                  className='flex items-center gap-2 text-xs font-semibold'
                >
                  <Send className='h-3.5 w-3.5' /> Dispatch Broadcast
                </TabsTrigger>
                <TabsTrigger
                  value='channels'
                  className='flex items-center gap-2 text-xs font-semibold'
                >
                  <Layers className='h-3.5 w-3.5' /> Channels ({channels.length})
                </TabsTrigger>
                <TabsTrigger
                  value='templates'
                  className='flex items-center gap-2 text-xs font-semibold'
                >
                  <FileText className='h-3.5 w-3.5' /> Templates ({templates.length})
                </TabsTrigger>
                <TabsTrigger
                  value='history'
                  className='flex items-center gap-2 text-xs font-semibold'
                >
                  <History className='h-3.5 w-3.5' /> Sent Log ({historyLog.length})
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* TAB 1: INBOX (Accessible to all users) */}
          <TabsContent value='inbox' className='space-y-4'>
            {/* Filter & Action Controls Bar */}
            <Card className='shadow-xs'>
              <CardContent className='p-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  {/* Left Filters */}
                  <div className='flex flex-wrap items-center gap-2'>
                    {/* Search Input */}
                    <div className='relative w-full sm:w-60'>
                      <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
                      <Input
                        placeholder='Search notifications...'
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                        className='h-9 pl-9 text-xs'
                      />
                    </div>

                    {/* Status Select */}
                    <Select
                      value={inboxStatusFilter}
                      onValueChange={(v) => setInboxStatusFilter(v as 'all' | 'unread' | 'read')}
                    >
                      <SelectTrigger className='h-9 w-32 text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Status</SelectItem>
                        <SelectItem value='unread'>Unread Only</SelectItem>
                        <SelectItem value='read'>Read Only</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Severity Select */}
                    <Select
                      value={inboxSeverityFilter}
                      onValueChange={setInboxSeverityFilter}
                    >
                      <SelectTrigger className='h-9 w-36 text-xs'>
                        <SelectValue placeholder='All Severities' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Severities</SelectItem>
                        <SelectItem value='INFO'>Info</SelectItem>
                        <SelectItem value='SUCCESS'>Success</SelectItem>
                        <SelectItem value='WARNING'>Warning</SelectItem>
                        <SelectItem value='ERROR'>Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right Actions */}
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => refetchUserNotifications()}
                      className='h-9 gap-1 text-xs'
                    >
                      <RefreshCw className='h-3.5 w-3.5' /> Refresh
                    </Button>

                    <Button
                      variant='secondary'
                      size='sm'
                      disabled={unreadCount === 0 || isMarkingAllRead}
                      onClick={() => markAllAsRead()}
                      className='h-9 gap-1.5 text-xs font-semibold'
                    >
                      {isMarkingAllRead ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <CheckCheck className='h-3.5 w-3.5 text-primary' />
                      )}
                      Mark All as Read
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Items List */}
            {isUserLoading ? (
              <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground'>
                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                <p className='text-sm'>Loading your notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                  <Inbox className='h-6 w-6 opacity-40' />
                </div>
                <h3 className='text-base font-semibold text-foreground'>No notifications found</h3>
                <p className='max-w-xs text-xs text-muted-foreground'>
                  {inboxSearch || inboxStatusFilter !== 'all' || inboxSeverityFilter !== 'all'
                    ? 'No notifications match your active search and filter criteria.'
                    : "You're all caught up! New business alerts and messages will appear here in real time."}
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                <AnimatePresence>
                  {filteredNotifications.map((item) => {
                    const sev = getSeverity(item)
                    const actionUrl = getActionUrl(item)
                    const actionLabel = getActionLabel(item)
                    const notifId = item.id || item.notification_id

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          className={`transition-all duration-200 hover:shadow-md ${
                            !item.is_read
                              ? 'border-primary/40 bg-accent/15 dark:bg-accent/10'
                              : 'opacity-90 hover:opacity-100'
                          }`}
                        >
                          <CardContent className='p-4 sm:p-5'>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                              <div className='flex items-start gap-3'>
                                {/* Unread indicator dot */}
                                <div className='mt-1 flex items-center justify-center'>
                                  {!item.is_read ? (
                                    <span className='h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20' />
                                  ) : (
                                    <span className='h-2 w-2 rounded-full bg-muted-foreground/30' />
                                  )}
                                </div>

                                <div className='space-y-1'>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    {renderSeverityBadge(sev)}
                                    <h4
                                      className={`text-sm tracking-tight ${
                                        !item.is_read
                                          ? 'font-bold text-foreground'
                                          : 'font-semibold text-muted-foreground'
                                      }`}
                                    >
                                      {getTitle(item)}
                                    </h4>
                                  </div>

                                  <p className='text-xs leading-relaxed whitespace-pre-wrap text-foreground/90'>
                                    {getMessage(item)}
                                  </p>

                                  <div className='flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground'>
                                    <span>
                                      {new Date(item.created_at).toLocaleString([], {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })}
                                    </span>

                                    {item.delivery_status && (
                                      <span className='capitalize'>
                                        • Status: {item.delivery_status}
                                      </span>
                                    )}

                                    {item.is_read && item.read_at && (
                                      <span>
                                        • Read at{' '}
                                        {new Date(item.read_at).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions on notification card */}
                              <div className='flex items-center gap-2 self-end sm:self-center'>
                                {actionUrl && (
                                  <Button
                                    asChild
                                    size='sm'
                                    variant='outline'
                                    className='h-8 gap-1.5 text-xs font-semibold'
                                  >
                                    <a href={actionUrl} target='_blank' rel='noreferrer'>
                                      {actionLabel}
                                      <ExternalLink className='h-3 w-3' />
                                    </a>
                                  </Button>
                                )}

                                {!item.is_read && (
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    disabled={isMarkingRead}
                                    onClick={() => markAsRead(notifId)}
                                    className='h-8 gap-1 text-xs text-muted-foreground hover:text-foreground'
                                    title='Mark as read'
                                  >
                                    <Check className='h-3.5 w-3.5 text-emerald-500' />
                                    Mark Read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PREFERENCES (Accessible to all users) */}
          <TabsContent value='preferences'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              {/* Audio & Alert Settings */}
              <Card className='shadow-xs'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Volume2 className='h-5 w-5 text-primary' />
                    Auditory & Visual Alerts
                  </CardTitle>
                  <CardDescription>
                    Configure in-app chime synthesizer, minimum severity filters, and popup toast behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* Sound Chimes Toggle */}
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='pref-sound' className='text-sm font-semibold'>
                        Sound Effects & Chimes
                      </Label>
                      <p className='text-xs text-muted-foreground'>
                        Play real-time browser audio chime synthesized via Web Audio API.
                      </p>
                    </div>
                    <Switch
                      id='pref-sound'
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>

                  {/* Toast Popups Toggle */}
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='pref-toasts' className='text-sm font-semibold'>
                        In-App Toast Banners
                      </Label>
                      <p className='text-xs text-muted-foreground'>
                        Show floating toast banner alerts when critical business events occur.
                      </p>
                    </div>
                    <Switch
                      id='pref-toasts'
                      checked={toastsEnabled}
                      onCheckedChange={setToastsEnabled}
                    />
                  </div>

                  {/* Minimum Severity Selector */}
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='pref-min-sev' className='text-sm font-semibold'>
                        Minimum Alert Severity
                      </Label>
                      <p className='text-xs text-muted-foreground'>
                        Only trigger audio chimes for events at or above this severity.
                      </p>
                    </div>
                    <Select
                      value={minSeverity}
                      onValueChange={(val) => setMinSeverity(val as NotificationSeverity)}
                    >
                      <SelectTrigger id='pref-min-sev' className='w-32'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='INFO'>INFO & Up</SelectItem>
                        <SelectItem value='SUCCESS'>SUCCESS & Up</SelectItem>
                        <SelectItem value='WARNING'>WARNING & Up</SelectItem>
                        <SelectItem value='ERROR'>ERROR Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sound Synthesizer Preview / Test */}
                  <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                        Test Synthesizer Tone
                      </Label>
                      <Badge variant='outline' className='text-[10px]'>
                        Web Audio API
                      </Badge>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Select a severity tier below and play a live preview of the audio cue:
                    </p>
                    <div className='flex flex-wrap items-center gap-2 pt-1'>
                      {(['INFO', 'SUCCESS', 'WARNING', 'ERROR'] as NotificationSeverity[]).map(
                        (tier) => (
                          <Button
                            key={tier}
                            variant='outline'
                            size='sm'
                            onClick={() => playTestSound(tier)}
                            className='h-8 gap-1.5 text-xs'
                          >
                            <Volume2 className='h-3 w-3' />
                            {tier}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Channels Overview */}
              <Card className='shadow-xs'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Layers className='h-5 w-5 text-primary' />
                    Subscribed Notification Channels
                  </CardTitle>
                  <CardDescription>
                    Real-time topics and delivery streams configured for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-3'>
                    <div className='flex items-start justify-between rounded-lg border p-3.5'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-bold text-foreground'>
                            SYSTEM & BROADCASTS
                          </span>
                          <Badge variant='secondary' className='text-[9px] uppercase'>
                            Default
                          </Badge>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          Organization announcements, maintenance alerts, and system notifications.
                        </p>
                      </div>
                      <Badge variant='outline' className='border-emerald-500 text-emerald-600 text-[10px]'>
                        Subscribed
                      </Badge>
                    </div>

                    <div className='flex items-start justify-between rounded-lg border p-3.5'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-bold text-foreground'>
                            ORDER & INVENTORY UPDATES
                          </span>
                          <Badge variant='secondary' className='text-[9px] uppercase'>
                            Real-Time
                          </Badge>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          Purchase orders, low stock thresholds, goods receipt confirmations, and batch alerts.
                        </p>
                      </div>
                      <Badge variant='outline' className='border-emerald-500 text-emerald-600 text-[10px]'>
                        Subscribed
                      </Badge>
                    </div>

                    <div className='flex items-start justify-between rounded-lg border p-3.5'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-bold text-foreground'>
                            CUSTOMER & SUPPLIER EVENTS
                          </span>
                          <Badge variant='secondary' className='text-[9px] uppercase'>
                            B2B Channel
                          </Badge>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          Vendor onboarding, supplier communications, and CRM customer activities.
                        </p>
                      </div>
                      <Badge variant='outline' className='border-emerald-500 text-emerald-600 text-[10px]'>
                        Subscribed
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: CHANNELS (Admin / Manager only) */}
          {isAdmin && (
            <TabsContent value='channels'>
              <Card className='shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-lg'>
                    Tenant Notification Channels
                  </CardTitle>
                  <CardDescription>
                    Multi-tenant isolated Pub/Sub channels provisioned for roles, departments, customers, and suppliers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isChannelsLoading ? (
                    <div className='flex items-center justify-center gap-2 py-8 text-center text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin' /> Loading channels...
                    </div>
                  ) : channels.length === 0 ? (
                    <div className='py-12 text-center text-muted-foreground'>
                      <Layers className='mx-auto mb-2 h-10 w-10 opacity-40' />
                      <p className='font-medium'>No custom channels provisioned</p>
                      <p className='mt-1 text-xs'>
                        Channels are automatically created when new customers, suppliers, and branches are created.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Active Members</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(channels as NotificationChannelWithCount[]).map((chan) => (
                          <TableRow key={chan.id}>
                            <TableCell className='font-mono text-xs font-bold text-primary'>
                              {chan.code}
                            </TableCell>
                            <TableCell className='text-xs font-semibold'>
                              {chan.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline' className='text-[10px] uppercase'>
                                {chan.channel_type}
                              </Badge>
                            </TableCell>
                            <TableCell className='max-w-xs truncate text-xs text-muted-foreground'>
                              {chan.description || '—'}
                            </TableCell>
                            <TableCell className='text-xs font-semibold'>
                              {chan._count?.notification_channel_members ?? 0}
                            </TableCell>
                            <TableCell className='text-xs text-muted-foreground'>
                              {new Date(chan.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 4: COMPOSER (Admin / Manager only) */}
          {isAdmin && (
            <TabsContent value='composer'>
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                <Card className='shadow-sm lg:col-span-2'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <Sparkles className='h-5 w-5 text-primary' />
                      Dispatch Broadcast Notification
                    </CardTitle>
                    <CardDescription>
                      Publish internal notifications to employees across tenant-isolated channels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendNotification} className='space-y-5'>
                      {/* Template Quick Select */}
                      {templates.length > 0 && (
                        <div className='space-y-2 rounded-md border border-border/50 bg-muted/30 p-3'>
                          <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                            Quick Load from Template
                          </Label>
                          <Select
                            value={selectedTemplateId}
                            onValueChange={handleApplyTemplate}
                          >
                            <SelectTrigger className='h-9 bg-background'>
                              <SelectValue placeholder='Select a saved template to load...' />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((tpl) => (
                                <SelectItem key={tpl.id} value={tpl.id}>
                                  {tpl.name} ({tpl.severity})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Title / Header */}
                      <div className='space-y-2'>
                        <Label htmlFor='title' className='text-sm font-semibold'>
                          Notification Header / Title{' '}
                          <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='title'
                          required
                          placeholder='e.g. Mandatory Staff Meeting at 4:00 PM'
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className='h-10'
                        />
                      </div>

                      {/* Content */}
                      <div className='space-y-2'>
                        <Label
                          htmlFor='content'
                          className='text-sm font-semibold'
                        >
                          Content Body <span className='text-destructive'>*</span>
                        </Label>
                        <Textarea
                          id='content'
                          required
                          rows={4}
                          placeholder='Enter full notification details, instructions, or announcement content...'
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className='resize-y'
                        />
                      </div>

                      {/* Severity & Target Type Row */}
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label className='text-sm font-semibold'>
                            Severity Level
                          </Label>
                          <Select
                            value={severity}
                            onValueChange={(val) =>
                              setSeverity(val as NotificationSeverity)
                            }
                          >
                            <SelectTrigger className='h-10'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='INFO'>Info (Blue)</SelectItem>
                              <SelectItem value='SUCCESS'>
                                Success (Green)
                              </SelectItem>
                              <SelectItem value='WARNING'>
                                Warning (Amber)
                              </SelectItem>
                              <SelectItem value='ERROR'>Error (Red)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='space-y-2'>
                          <Label className='text-sm font-semibold'>
                            Target Audience
                          </Label>
                          <Select
                            value={targetType}
                            onValueChange={(val) =>
                              setTargetType(val as NotificationTargetType)
                            }
                          >
                            <SelectTrigger className='h-10'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='ALL'>
                                All Employees (Broadcast)
                              </SelectItem>
                              <SelectItem value='ROLE'>Specific Role</SelectItem>
                              <SelectItem value='USER'>
                                Specific Employee(s)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Role selector if ROLE target */}
                      {targetType === 'ROLE' && (
                        <div className='space-y-2 rounded-md border border-accent/40 bg-accent/20 p-3'>
                          <Label className='text-sm font-semibold'>
                            Select Target Role
                          </Label>
                          <Select
                            value={targetRole}
                            onValueChange={setTargetRole}
                          >
                            <SelectTrigger className='h-10 bg-background'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='manager'>Managers</SelectItem>
                              <SelectItem value='cashier'>Cashiers</SelectItem>
                              <SelectItem value='captain'>Captains</SelectItem>
                              <SelectItem value='kitchen'>
                                Kitchen Staff
                              </SelectItem>
                              <SelectItem value='staff'>General Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* User Multi-select if USER target */}
                      {targetType === 'USER' && (
                        <div className='space-y-2 rounded-md border border-accent/40 bg-accent/20 p-3'>
                          <Label className='text-sm font-semibold'>
                            Select Targeted Employees
                          </Label>
                          <div className='max-h-40 space-y-1.5 overflow-y-auto rounded-md border bg-background p-2'>
                            {employees?.map((emp) => {
                              const empId = emp.auth_user_id || emp.id
                              const isChecked = selectedUserIds.includes(empId)
                              return (
                                <label
                                  key={emp.id}
                                  className='flex cursor-pointer items-center gap-2.5 rounded p-1.5 text-xs hover:bg-muted'
                                >
                                  <input
                                    type='checkbox'
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUserIds([
                                          ...selectedUserIds,
                                          empId,
                                        ])
                                      } else {
                                        setSelectedUserIds(
                                          selectedUserIds.filter(
                                            (id) => id !== empId
                                          )
                                        )
                                      }
                                    }}
                                    className='rounded border-muted-foreground'
                                  />
                                  <span className='font-medium'>
                                    {emp.first_name || ''} {emp.last_name || ''}
                                  </span>
                                  <span className='text-[11px] text-muted-foreground'>
                                    ({emp.email || 'No email'})
                                  </span>
                                  {emp.default_role && (
                                    <Badge
                                      variant='outline'
                                      className='ml-auto text-[10px]'
                                    >
                                      {emp.default_role}
                                    </Badge>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className='flex justify-end pt-2'>
                        <Button
                          type='submit'
                          disabled={isSending || !title || !content}
                          className='flex h-10 w-full items-center gap-2 px-6 font-semibold sm:w-auto'
                        >
                          {isSending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Send className='h-4 w-4' />
                          )}
                          Send Notification
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Live Preview Card */}
                <Card className='h-fit shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base font-semibold'>
                      Live Preview
                    </CardTitle>
                    <CardDescription>
                      How the notification will appear in recipients' navbar bell and notification center.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3 rounded-lg border bg-accent/20 p-4'>
                      <div className='flex items-center justify-between'>
                        {renderSeverityBadge(severity)}
                        <span className='text-[10px] text-muted-foreground'>
                          Just now
                        </span>
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-foreground'>
                          {title || 'Notification Header'}
                        </h4>
                        <p className='mt-1 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground'>
                          {content ||
                            'Notification details will be displayed here...'}
                        </p>
                      </div>
                      <div className='flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground'>
                        <span>Target: {targetType}</span>
                        <span className='font-medium text-primary'>Unread</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* TAB 5: TEMPLATES (Admin / Manager only) */}
          {isAdmin && (
            <TabsContent value='templates'>
              <Card className='shadow-sm'>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg'>
                      Notification Templates
                    </CardTitle>
                    <CardDescription>
                      Create and manage pre-written notification headers and content for rapid reuse.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={openCreateTemplateModal}
                    size='sm'
                    className='flex items-center gap-1.5'
                  >
                    <Plus className='h-4 w-4' /> Create Template
                  </Button>
                </CardHeader>
                <CardContent>
                  {isTemplatesLoading ? (
                    <div className='flex items-center justify-center gap-2 py-8 text-center text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin' /> Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className='py-12 text-center text-muted-foreground'>
                      <FileText className='mx-auto mb-2 h-10 w-10 opacity-40' />
                      <p className='font-medium'>No templates created yet</p>
                      <p className='mt-1 text-xs'>
                        Click "Create Template" to save reusable notification messages.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Header</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Content Preview</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((tpl) => (
                          <TableRow key={tpl.id}>
                            <TableCell className='text-sm font-bold'>
                              {tpl.name}
                            </TableCell>
                            <TableCell className='text-xs font-medium'>
                              {tpl.header}
                            </TableCell>
                            <TableCell>
                              {renderSeverityBadge(tpl.severity)}
                            </TableCell>
                            <TableCell className='max-w-xs truncate text-xs text-muted-foreground'>
                              {tpl.content}
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='flex items-center justify-end gap-1'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    handleApplyTemplate(tpl.id)
                                    setActiveTab('composer')
                                  }}
                                  className='h-8 text-xs font-medium text-primary hover:text-primary/80'
                                >
                                  Use
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => openEditTemplateModal(tpl)}
                                  className='h-8 w-8'
                                >
                                  <Edit className='h-3.5 w-3.5 text-muted-foreground' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => {
                                    if (confirm(`Delete template "${tpl.name}"?`)) {
                                      deleteTemplate(tpl.id)
                                    }
                                  }}
                                  className='h-8 w-8 text-destructive hover:bg-destructive/10'
                                >
                                  <Trash2 className='h-3.5 w-3.5' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 6: SENT LOG & HISTORY (Admin / Manager only) */}
          {isAdmin && (
            <TabsContent value='history'>
              <Card className='shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-lg'>
                    Sent Notifications Log
                  </CardTitle>
                  <CardDescription>
                    Audit history of all notifications sent to employees and their read completion status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isHistoryLoading ? (
                    <div className='flex items-center justify-center gap-2 py-8 text-center text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin' /> Loading history log...
                    </div>
                  ) : historyLog.length === 0 ? (
                    <div className='py-12 text-center text-muted-foreground'>
                      <History className='mx-auto mb-2 h-10 w-10 opacity-40' />
                      <p className='font-medium'>
                        No sent notifications recorded yet
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Sent</TableHead>
                          <TableHead>Title / Header</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Recipients Read</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(historyLog as NotificationHistoryLogItem[]).map((item) => {
                          const recipients = item.user_notifications || []
                          const totalRecipients = recipients.length
                          const readCount = recipients.filter(
                            (r) => r.is_read
                          ).length
                          const readPercentage =
                            totalRecipients > 0
                              ? Math.round((readCount / totalRecipients) * 100)
                              : 0

                          return (
                            <TableRow key={item.id}>
                              <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                                {new Date(item.created_at).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </TableCell>
                              <TableCell>
                                <div className='text-xs font-semibold'>
                                  {item.title}
                                </div>
                                <div className='max-w-sm truncate text-[11px] text-muted-foreground'>
                                  {item.content || item.message}
                                </div>
                              </TableCell>
                              <TableCell>
                                {renderSeverityBadge(item.severity)}
                              </TableCell>
                              <TableCell className='text-xs font-medium uppercase'>
                                {item.target_type}{' '}
                                {item.target_role ? `(${item.target_role})` : ''}
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center gap-2'>
                                  <span className='text-xs font-bold'>
                                    {readCount} / {totalRecipients} ({readPercentage}%)
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* TEMPLATE CREATION / EDIT MODAL */}
        <Dialog
          open={isTemplateModalOpen}
          onOpenChange={setIsTemplateModalOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate
                  ? 'Edit Notification Template'
                  : 'Create Notification Template'}
              </DialogTitle>
              <DialogDescription>
                Define pre-set headers and content for fast future dispatching.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveTemplate} className='space-y-4 py-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='tpl-name' className='text-xs font-semibold'>
                  Template Internal Name
                </Label>
                <Input
                  id='tpl-name'
                  required
                  placeholder='e.g. Shift Reminder Template'
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='tpl-header' className='text-xs font-semibold'>
                  Header / Title
                </Label>
                <Input
                  id='tpl-header'
                  required
                  placeholder='e.g. Upcoming Shift Reminder'
                  value={templateHeader}
                  onChange={(e) => setTemplateHeader(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='tpl-content' className='text-xs font-semibold'>
                  Notification Content
                </Label>
                <Textarea
                  id='tpl-content'
                  required
                  rows={3}
                  placeholder='Template message text...'
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  Default Severity
                </Label>
                <Select
                  value={templateSeverity}
                  onValueChange={(val) =>
                    setTemplateSeverity(val as NotificationSeverity)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='INFO'>Info (Blue)</SelectItem>
                    <SelectItem value='SUCCESS'>Success (Green)</SelectItem>
                    <SelectItem value='WARNING'>Warning (Amber)</SelectItem>
                    <SelectItem value='ERROR'>Error (Red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className='pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsTemplateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={isCreatingTemplate || isUpdatingTemplate}
                >
                  {isCreatingTemplate || isUpdatingTemplate ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Save Template'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </div>
  )
}
