import { z } from 'zod'

// ── Enums ───────────────────────────────────────────────────────────────────

export const notificationSeverityEnum = z.enum([
  'INFO',
  'WARNING',
  'ERROR',
  'SUCCESS',
  'CRITICAL',
])
export type NotificationSeverity = z.infer<typeof notificationSeverityEnum>

export const notificationTargetTypeEnum = z.enum([
  'ALL',
  'ROLE',
  'USER',
  'CHANNEL',
  'DEPARTMENT',
  'ENTITY',
  'CUSTOMER_GROUP',
  'STORE',
  'WAREHOUSE',
])
export type NotificationTargetType = z.infer<typeof notificationTargetTypeEnum>

export const notificationPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
  'critical',
])
export type NotificationPriority = z.infer<typeof notificationPriorityEnum>

export const notificationTypeEnum = z.enum([
  'system',
  'admin_message',
  'alert',
  'announcement',
  'task',
  'reminder',
])
export type NotificationType = z.infer<typeof notificationTypeEnum>

export const notificationChannelTypeEnum = z.enum([
  'tenant_wide',
  'role_based',
  'department_based',
  'entity_based',
  'user_specific',
  'customer_group',
  'store_based',
  'warehouse_based',
])
export type NotificationChannelType = z.infer<typeof notificationChannelTypeEnum>

export const notificationDeliveryStatusEnum = z.enum([
  'pending',
  'dispatched',
  'delivered',
  'failed',
  'expired',
])
export type NotificationDeliveryStatus = z.infer<typeof notificationDeliveryStatusEnum>

export const notificationSenderTypeEnum = z.enum([
  'system',
  'admin',
  'super_admin',
  'service',
])
export type NotificationSenderType = z.infer<typeof notificationSenderTypeEnum>

export const businessEventTypeEnum = z.enum([
  'purchase_order_received',
  'purchase_order_approved',
  'purchase_order_rejected',
  'product_added',
  'product_updated',
  'product_expiring_soon',
  'product_expired',
  'supplier_added',
  'supplier_updated',
  'customer_added',
  'customer_updated',
  'stock_low',
  'stock_reorder_needed',
  'stock_received',
  'stock_adjustment',
  'stock_transfer',
  'sales_order_created',
  'sales_invoice_created',
  'sales_return_created',
  'payment_received',
  'user_registered',
  'user_role_changed',
  'system_maintenance',
  'subscription_expiring',
  'custom',
])
export type BusinessEventType = z.infer<typeof businessEventTypeEnum>

// ── Models ──────────────────────────────────────────────────────────────────

export const notificationChannelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  channel_type: notificationChannelTypeEnum,
  is_active: z.boolean().default(true),
  is_system: z.boolean().default(false),
  target_role_id: z.string().uuid().nullable().optional(),
  target_branch_id: z.string().uuid().nullable().optional(),
  target_store_id: z.string().uuid().nullable().optional(),
  target_warehouse_id: z.string().uuid().nullable().optional(),
  target_customer_group_id: z.string().uuid().nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})
export type NotificationChannelItem = z.infer<typeof notificationChannelSchema>

export const notificationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  message: z.string().optional(),
  content: z.string().optional(), // backward compatibility alias for message
  type: notificationTypeEnum.default('system'),
  severity: notificationSeverityEnum.default('INFO'),
  priority: notificationPriorityEnum.default('normal'),
  target_type: notificationTargetTypeEnum.default('ALL'),
  notification_channel_id: z.string().uuid().nullable().optional(),
  target_role_id: z.string().uuid().nullable().optional(),
  target_role: z.string().nullable().optional(), // legacy UI compatibility
  target_user_id: z.string().uuid().nullable().optional(),
  target_customer_id: z.string().uuid().nullable().optional(),
  target_supplier_id: z.string().uuid().nullable().optional(),
  target_branch_id: z.string().uuid().nullable().optional(),
  target_store_id: z.string().uuid().nullable().optional(),
  target_warehouse_id: z.string().uuid().nullable().optional(),
  sender_type: notificationSenderTypeEnum.default('system'),
  sender_user_id: z.string().uuid().nullable().optional(),
  sender_id: z.string().uuid().nullable().optional(), // legacy UI alias
  sender_name: z.string().nullable().optional(),
  business_event_type: businessEventTypeEnum.nullable().optional(),
  source_entity_type: z.string().nullable().optional(),
  source_entity_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  idempotency_key: z.string().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  action_url: z.string().nullable().optional(),
  action_label: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  is_archived: z.boolean().default(false),
  expires_at: z.string().or(z.date()).nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})
export type NotificationItem = z.infer<typeof notificationSchema>

export const notificationRecipientSchema = z.object({
  id: z.string().uuid(),
  notification_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  tenant_user_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().optional(), // legacy alias
  customer_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  delivery_status: notificationDeliveryStatusEnum.default('pending'),
  is_read: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  is_deleted: z.boolean().default(false),
  dispatched_at: z.string().or(z.date()).nullable().optional(),
  delivered_at: z.string().or(z.date()).nullable().optional(),
  read_at: z.string().or(z.date()).nullable().optional(),
  archived_at: z.string().or(z.date()).nullable().optional(),
  created_at: z.string().or(z.date()),
  retry_count: z.number().int().default(0),
  failure_reason: z.string().nullable().optional(),
  notifications: notificationSchema.optional(),
})
export type NotificationRecipientItem = z.infer<typeof notificationRecipientSchema>
export type UserNotificationItem = NotificationRecipientItem

// Legacy userNotificationSchema alias
export const userNotificationSchema = notificationRecipientSchema

export const sendNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().optional(),
  content: z.string().optional(), // backward compatibility
  severity: notificationSeverityEnum.default('INFO'),
  priority: notificationPriorityEnum.default('normal').optional(),
  type: notificationTypeEnum.default('admin_message').optional(),
  target_type: notificationTargetTypeEnum,
  notification_channel_id: z.string().uuid().optional(),
  target_role_id: z.string().uuid().optional(),
  target_role: z.string().optional(),
  target_user_ids: z.array(z.string().uuid()).optional(),
  target_customer_ids: z.array(z.string().uuid()).optional(),
  target_supplier_ids: z.array(z.string().uuid()).optional(),
  target_branch_id: z.string().uuid().optional(),
  target_store_id: z.string().uuid().optional(),
  target_warehouse_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  action_url: z.string().max(500).optional(),
  action_label: z.string().max(100).optional(),
  idempotency_key: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>

export const notificationTemplateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Template name is required').max(200),
  code: z.string().optional(),
  title_template: z.string().optional(),
  message_template: z.string().optional(),
  header: z.string().optional(), // legacy alias
  content: z.string().optional(), // legacy alias
  type: notificationTypeEnum.default('system').optional(),
  severity: notificationSeverityEnum.default('INFO'),
  priority: notificationPriorityEnum.default('normal').optional(),
  variables: z.array(z.string()).default([]).optional(),
  is_active: z.boolean().default(true).optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
})
export type NotificationTemplateItem = z.infer<typeof notificationTemplateSchema>

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  code: z.string().optional(),
  title_template: z.string().optional(),
  message_template: z.string().optional(),
  header: z.string().optional(),
  content: z.string().optional(),
  severity: notificationSeverityEnum.default('INFO'),
  priority: notificationPriorityEnum.default('normal').optional(),
  type: notificationTypeEnum.default('system').optional(),
  variables: z.array(z.string()).default([]).optional(),
  is_active: z.boolean().default(true).optional(),
})
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const notificationPreferenceSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  tenant_user_id: z.string().uuid().optional(),
  notification_channel_id: z.string().uuid().nullable().optional(),
  channel_code: z.string().optional(),
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(true),
  in_app_enabled: z.boolean().default(true),
  sound_enabled: z.boolean().default(true),
  mute_until: z.string().or(z.date()).nullable().optional(),
})
export type NotificationPreferenceItem = z.infer<typeof notificationPreferenceSchema>

export const notificationFilterSchema = z.object({
  status: z.enum(['all', 'unread', 'read', 'archived']).default('all'),
  severity: notificationSeverityEnum.optional(),
  type: notificationTypeEnum.optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>

