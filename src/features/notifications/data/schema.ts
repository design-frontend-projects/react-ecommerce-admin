import { z } from 'zod'

export const notificationSeverityEnum = z.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS'])
export type NotificationSeverity = z.infer<typeof notificationSeverityEnum>

export const notificationTargetTypeEnum = z.enum(['ALL', 'ROLE', 'USER'])
export type NotificationTargetType = z.infer<typeof notificationTargetTypeEnum>

export const notificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  severity: notificationSeverityEnum,
  target_type: notificationTargetTypeEnum,
  target_role: z.string().nullable().optional(),
  sender_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})

export type NotificationItem = z.infer<typeof notificationSchema>

export const userNotificationSchema = z.object({
  id: z.string().uuid(),
  notification_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_read: z.boolean(),
  read_at: z.string().or(z.date()).nullable().optional(),
  created_at: z.string().or(z.date()),
  notifications: notificationSchema.optional(),
})

export type UserNotificationItem = z.infer<typeof userNotificationSchema> & {
  notifications?: NotificationItem
}

export const sendNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  severity: notificationSeverityEnum,
  target_type: notificationTargetTypeEnum,
  target_role: z.string().optional(),
  target_user_ids: z.array(z.string().uuid()).optional(),
  template_id: z.string().uuid().optional(),
})

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>

export const notificationTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Template name is required').max(200),
  header: z.string().min(1, 'Header is required').max(255),
  content: z.string().min(1, 'Content is required'),
  severity: notificationSeverityEnum,
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
})

export type NotificationTemplateItem = z.infer<typeof notificationTemplateSchema>

export const createTemplateSchema = notificationTemplateSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
