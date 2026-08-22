import { z } from 'zod'

export const lookupTypeItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number(),
  values_count: z.number(),
  custom_count: z.number(),
  system_count: z.number(),
})

export type LookupTypeItem = z.infer<typeof lookupTypeItemSchema>

export const lookupValueItemSchema = z.object({
  id: z.string(),
  lookup_type_id: z.string(),
  tenant_id: z.string().nullable().optional(),
  code: z.string(),
  name: z.string(),
  name_ar: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  parent_id: z.string().nullable().optional(),
  is_default: z.boolean(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  is_tenant_custom: z.boolean(),
  sort_order: z.number(),
  type_code: z.string().optional(),
  type_name: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type LookupValueItem = z.infer<typeof lookupValueItemSchema>

export type TreeLookupValueNode = {
  id: string
  lookup_type_id: string
  tenant_id?: string | null
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  color?: string | null
  icon?: string | null
  metadata?: Record<string, unknown> | null
  parent_id?: string | null
  is_default: boolean
  is_system: boolean
  is_active: boolean
  is_tenant_custom: boolean
  sort_order: number
  depth: number
  type_code: string
  type_name: string
  children: TreeLookupValueNode[]
}

export const treeLookupValueNodeSchema: z.ZodType<TreeLookupValueNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    lookup_type_id: z.string(),
    tenant_id: z.string().nullable().optional(),
    code: z.string(),
    name: z.string(),
    name_ar: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
    parent_id: z.string().nullable().optional(),
    is_default: z.boolean(),
    is_system: z.boolean(),
    is_active: z.boolean(),
    is_tenant_custom: z.boolean(),
    sort_order: z.number(),
    depth: z.number(),
    type_code: z.string(),
    type_name: z.string(),
    children: z.array(treeLookupValueNodeSchema),
  })
)

export const lookupTypeTreeNodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  domain: z.string(),
  domain_label: z.string(),
  domain_label_ar: z.string().optional(),
  domain_icon: z.string().optional(),
  sort_order: z.number(),
  values_count: z.number(),
  active_count: z.number(),
  custom_count: z.number(),
  system_count: z.number(),
  values_tree: z.array(treeLookupValueNodeSchema),
  flat_values: z.array(lookupValueItemSchema).optional(),
})

export type LookupTypeTreeNode = z.infer<typeof lookupTypeTreeNodeSchema>

export const lookupDomainCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  labelAr: z.string().optional(),
  icon: z.string(),
  description: z.string(),
  types: z.array(lookupTypeTreeNodeSchema),
  typesCount: z.number(),
  valuesCount: z.number(),
})

export type LookupDomainCategory = z.infer<typeof lookupDomainCategorySchema>

export const lookupTreeStatsSchema = z.object({
  total_catalogs: z.number(),
  total_values: z.number(),
  total_active_values: z.number(),
  total_custom_values: z.number(),
  total_system_values: z.number(),
  max_hierarchy_depth: z.number(),
})

export type LookupTreeStats = z.infer<typeof lookupTreeStatsSchema>

export const lookupTreeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    domains: z.array(lookupDomainCategorySchema),
    types: z.array(lookupTypeTreeNodeSchema),
    stats: lookupTreeStatsSchema,
  }),
})

export type LookupTreeResponseData = z.infer<typeof lookupTreeResponseSchema>['data']

export const lookupTypeListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(lookupTypeItemSchema),
})

export const lookupValueListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    lookupType: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      is_system: z.boolean(),
    }),
    values: z.array(lookupValueItemSchema),
  }),
})

export const lookupValueFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(50, 'Code max 50 characters.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores.'),
  name: z.string().min(1, 'Display name is required.').max(150, 'Name max 150 characters.'),
  nameAr: z.string().max(150, 'Arabic name max 150 characters.').optional().nullable(),
  description: z.string().max(500, 'Description max 500 characters.').optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  parentId: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  metadataJson: z.string().optional().nullable(),
})

export type LookupValueFormValues = z.infer<typeof lookupValueFormSchema>

export const lookupTypeFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(50, 'Code max 50 characters.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores.'),
  name: z.string().min(1, 'Catalog name is required.').max(150, 'Name max 150 characters.'),
  description: z.string().max(500, 'Description max 500 characters.').optional().nullable(),
  sortOrder: z.number().int().default(0),
})

export type LookupTypeFormValues = z.infer<typeof lookupTypeFormSchema>
