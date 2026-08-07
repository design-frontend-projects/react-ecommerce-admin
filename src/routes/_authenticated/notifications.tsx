import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
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
  ShieldAlert,
  Sparkles,
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import {
  type NotificationSeverity,
  type NotificationTargetType,
  type NotificationTemplateItem,
} from '@/features/notifications/data/schema'
import { useAdminNotifications } from '@/features/notifications/hooks/use-notifications'

export const Route = createFileRoute('/_authenticated/notifications')({
  component: AdminNotificationsPage,
})

function AdminNotificationsPage() {
  const { has } = useAuth()
  const isAdmin =
    has({ role: UserRole.Admin }) ||
    has({ role: UserRole.SuperAdmin }) ||
    has({ permission: 'general.notifications.manage' })

  const {
    historyLog,
    isHistoryLoading,
    templates,
    isTemplatesLoading,
    sendNotification,
    isSending,
    createTemplate,
    isCreatingTemplate,
    updateTemplate,
    isUpdatingTemplate,
    deleteTemplate,
  } = useAdminNotifications()

  // Form State for Sending Notification
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

  // Fetch users for target user selection
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

  if (!isAdmin) {
    return (
      <div className='flex min-h-screen flex-col'>
        <Header />
        <Main className='flex flex-col items-center justify-center p-8 text-center'>
          <ShieldAlert className='mb-4 h-16 w-16 text-destructive' />
          <h2 className='text-2xl font-bold'>Access Restricted</h2>
          <p className='mt-2 max-w-md text-muted-foreground'>
            You do not have administrative permissions to access the
            notification sender and template manager.
          </p>
        </Main>
      </div>
    )
  }

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      setTitle(tpl.header)
      setContent(tpl.content)
      setSeverity(tpl.severity)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendSuccessMsg('')
    try {
      const res = await sendNotification({
        title,
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
    setTemplateHeader(tpl.header)
    setTemplateContent(tpl.content)
    setTemplateSeverity(tpl.severity)
    setIsTemplateModalOpen(true)
  }

  const renderSeverityBadge = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'ERROR':
        return (
          <Badge
            variant='destructive'
            className='flex w-fit items-center gap-1 text-[10px] uppercase'
          >
            <AlertOctagon className='h-3 w-3' /> Error
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge
            variant='outline'
            className='flex w-fit items-center gap-1 border-amber-500 bg-amber-50 text-[10px] text-amber-700 uppercase dark:bg-amber-950 dark:text-amber-300'
          >
            <AlertTriangle className='h-3 w-3' /> Warning
          </Badge>
        )
      case 'SUCCESS':
        return (
          <Badge
            variant='outline'
            className='flex w-fit items-center gap-1 border-emerald-500 bg-emerald-50 text-[10px] text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300'
          >
            <CheckCircle2 className='h-3 w-3' /> Success
          </Badge>
        )
      case 'INFO':
      default:
        return (
          <Badge
            variant='secondary'
            className='flex w-fit items-center gap-1 text-[10px] uppercase'
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
        {/* Page Header */}
        <div className='flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
              <Bell className='h-6 w-6 text-primary' />
              Internal Notification Center
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Prepare header, content, templates, and dispatch real-time
              internal notifications to employees.
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
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

        <Tabs defaultValue='composer' className='space-y-6'>
          <TabsList className='grid w-full max-w-md grid-cols-3'>
            <TabsTrigger
              value='composer'
              className='flex items-center gap-2 text-xs font-semibold'
            >
              <Send className='h-3.5 w-3.5' /> Send Notification
            </TabsTrigger>
            <TabsTrigger
              value='templates'
              className='flex items-center gap-2 text-xs font-semibold'
            >
              <FileText className='h-3.5 w-3.5' /> Templates ({templates.length}
              )
            </TabsTrigger>
            <TabsTrigger
              value='history'
              className='flex items-center gap-2 text-xs font-semibold'
            >
              <History className='h-3.5 w-3.5' /> Sent Log ({historyLog.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTIFICATION COMPOSER */}
          <TabsContent value='composer'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
              <Card className='shadow-sm lg:col-span-2'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <Sparkles className='h-5 w-5 text-primary' />
                    Compose Notification
                  </CardTitle>
                  <CardDescription>
                    Fill in title, content, and select severity level and
                    recipients.
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

              {/* Preview Card */}
              <Card className='h-fit shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    How the notification will appear in employees' navbar bell.
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

          {/* TAB 2: TEMPLATES */}
          <TabsContent value='templates'>
            <Card className='shadow-sm'>
              <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                  <CardTitle className='text-lg'>
                    Notification Templates
                  </CardTitle>
                  <CardDescription>
                    Create and manage pre-written notification headers and
                    content for rapid reuse.
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
                    <Loader2 className='h-4 w-4 animate-spin' /> Loading
                    templates...
                  </div>
                ) : templates.length === 0 ? (
                  <div className='py-12 text-center text-muted-foreground'>
                    <FileText className='mx-auto mb-2 h-10 w-10 opacity-40' />
                    <p className='font-medium'>No templates created yet</p>
                    <p className='mt-1 text-xs'>
                      Click "Create Template" to save reusable notification
                      messages.
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
                                  const tabsElem = document.querySelector(
                                    '[data-value="composer"]'
                                  )
                                  if (tabsElem instanceof HTMLElement)
                                    tabsElem.click()
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
                                  if (
                                    confirm(`Delete template "${tpl.name}"?`)
                                  ) {
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

          {/* TAB 3: SENT LOG & HISTORY */}
          <TabsContent value='history'>
            <Card className='shadow-sm'>
              <CardHeader>
                <CardTitle className='text-lg'>
                  Sent Notifications Log
                </CardTitle>
                <CardDescription>
                  Audit history of all notifications sent to employees and their
                  read completion status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isHistoryLoading ? (
                  <div className='flex items-center justify-center gap-2 py-8 text-center text-muted-foreground'>
                    <Loader2 className='h-4 w-4 animate-spin' /> Loading history
                    log...
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
                      {historyLog.map((item: any) => {
                        const recipients = item.user_notifications || []
                        const totalRecipients = recipients.length
                        const readCount = recipients.filter(
                          (r: any) => r.is_read
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
                                {item.content}
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
                                  {readCount} / {totalRecipients} (
                                  {readPercentage}%)
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
