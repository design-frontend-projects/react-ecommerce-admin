'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateLookupValueInput {
  code: string
  name: string
  nameAr?: string | null
  description?: string | null
  color?: string | null
  icon?: string | null
  metadata?: Record<string, unknown> | null
  parentId?: string | null
  isDefault?: boolean
  sortOrder?: number
}

export type UpdateLookupValueInput = Partial<CreateLookupValueInput> & {
  isActive?: boolean
}

function assertRequiredText(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(message, 400)
  }
}

/**
 * List all registered lookup types with counts of available values
 */
export async function listLookupTypes(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const types = await prisma.lookup_types.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    include: {
      lookup_values: {
        where: {
          OR: [
            { tenant_id: tenantId },
            { tenant_id: null },
          ],
          is_active: true,
        },
        select: { id: true, is_system: true, tenant_id: true },
      },
    },
  })

  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    is_system: t.is_system,
    is_active: t.is_active,
    sort_order: t.sort_order,
    values_count: t.lookup_values.length,
    custom_count: t.lookup_values.filter((v) => v.tenant_id === tenantId).length,
    system_count: t.lookup_values.filter((v) => v.tenant_id === null).length,
  }))
}

/**
 * List values for a specific lookup type in Union Mode (Tenant values + Global System defaults)
 */
export async function listLookupValues(
  authUserId: string,
  typeCode: string,
  includeInactive = false
) {
  const tenantId = await requireTenantId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  const values = await prisma.lookup_values.findMany({
    where: {
      lookup_type_id: lookupType.id,
      OR: [
        { tenant_id: tenantId },
        { tenant_id: null },
      ],
      ...(includeInactive ? {} : { is_active: true }),
    },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  })

  return {
    lookupType: {
      id: lookupType.id,
      code: lookupType.code,
      name: lookupType.name,
      description: lookupType.description,
      is_system: lookupType.is_system,
    },
    values: values.map((v) => ({
      id: v.id,
      lookup_type_id: v.lookup_type_id,
      tenant_id: v.tenant_id,
      code: v.code,
      name: v.name,
      name_ar: v.name_ar,
      description: v.description,
      color: v.color,
      icon: v.icon,
      metadata: v.metadata,
      is_default: v.is_default,
      is_system: v.is_system || v.tenant_id === null,
      is_active: v.is_active,
      is_tenant_custom: v.tenant_id === tenantId,
      sort_order: v.sort_order,
      created_at: v.created_at,
      updated_at: v.updated_at,
    })),
  }
}

/**
 * Create a new tenant-specific lookup value
 */
export async function createLookupValue(
  authUserId: string,
  typeCode: string,
  input: CreateLookupValueInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  assertRequiredText(input.code, 'A code is required.')
  assertRequiredText(input.name, 'A display name is required.')

  const normalizedCode = input.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

  // Check code uniqueness within this tenant & lookup type
  const duplicate = await prisma.lookup_values.findFirst({
    where: {
      lookup_type_id: lookupType.id,
      tenant_id: tenantId,
      code: normalizedCode,
    },
  })

  if (duplicate) {
    throw new ApiError(
      `A lookup value with code '${normalizedCode}' already exists in your account.`,
      409
    )
  }

  // If set as default, unset other defaults for this tenant
  if (input.isDefault) {
    await prisma.lookup_values.updateMany({
      where: { lookup_type_id: lookupType.id, tenant_id: tenantId },
      data: { is_default: false },
    })
  }

  const metaObj = {
    ...(typeof input.metadata === 'object' && input.metadata !== null ? input.metadata : {}),
    ...(input.parentId ? { parent_id: input.parentId } : {}),
  }

  return prisma.lookup_values.create({
    data: {
      lookup_type_id: lookupType.id,
      tenant_id: tenantId,
      code: normalizedCode,
      name: input.name.trim(),
      name_ar: input.nameAr?.trim() || null,
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      icon: input.icon?.trim() || null,
      metadata: metaObj,
      is_default: input.isDefault ?? false,
      is_system: false,
      is_active: true,
      sort_order: input.sortOrder ?? 0,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })
}

/**
 * Update an existing lookup value
 */
export async function updateLookupValue(
  authUserId: string,
  id: string,
  input: UpdateLookupValueInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  // If it's a global system record (tenant_id == null), tenant can only clone or customize non-destructive flags
  if (existing.tenant_id === null) {
    if (input.code !== undefined && input.code !== existing.code) {
      throw new ApiError('System default codes cannot be modified.', 403)
    }
  } else if (existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (input.name !== undefined) {
    assertRequiredText(input.name, 'A display name is required.')
  }

  if (input.isDefault && existing.tenant_id === tenantId) {
    await prisma.lookup_values.updateMany({
      where: { lookup_type_id: existing.lookup_type_id, tenant_id: tenantId },
      data: { is_default: false },
    })
  }

  const existingMeta =
    typeof existing.metadata === 'object' && existing.metadata !== null
      ? (existing.metadata as Record<string, unknown>)
      : {}

  let updatedMeta = input.metadata !== undefined ? (input.metadata as Record<string, unknown>) : existingMeta
  if (input.parentId !== undefined) {
    updatedMeta = {
      ...(updatedMeta || {}),
      parent_id: input.parentId || null,
    }
  }

  const data: Record<string, unknown> = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.nameAr !== undefined ? { name_ar: input.nameAr?.trim() || null } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.color !== undefined ? { color: input.color?.trim() || null } : {}),
    ...(input.icon !== undefined ? { icon: input.icon?.trim() || null } : {}),
    ...(input.metadata !== undefined || input.parentId !== undefined ? { metadata: updatedMeta } : {}),
    ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
    updated_by_user_id: tenantUserId,
  }

  return prisma.lookup_values.update({
    where: { id },
    data: data as Parameters<typeof prisma.lookup_values.update>[0]['data'],
  })
}

/**
 * Soft delete / deactivate lookup value (or hard delete if custom and unreferenced)
 */
export async function deleteLookupValue(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (existing.tenant_id === null || existing.is_system) {
    throw new ApiError(
      'System default values cannot be deleted. You can deactivate them instead.',
      403
    )
  }

  if (existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  // Soft delete / deactivate by default to preserve historical integrity
  return prisma.lookup_values.update({
    where: { id },
    data: { is_active: false },
  })
}

/**
 * Toggle active status
 */
export async function toggleLookupValueActive(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (existing.tenant_id !== null && existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  return prisma.lookup_values.update({
    where: { id },
    data: {
      is_active: !existing.is_active,
      updated_by_user_id: tenantUserId,
    },
  })
}

/**
 * Batch reorder values within a lookup type
 */
export async function reorderLookupValues(
  authUserId: string,
  typeCode: string,
  orderedIds: string[]
) {
  const tenantId = await requireTenantId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lookup_values.updateMany({
        where: {
          id,
          lookup_type_id: lookupType.id,
          OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        },
        data: { sort_order: index + 1 },
      })
    )
  )

  return { success: true }
}

const DOMAIN_MAP: Record<string, { id: string; label: string; labelAr: string; icon: string; description: string }> = {
  // Inventory & Warehouse
  uom_category: { id: 'inventory', label: 'Inventory & Warehousing', labelAr: 'المخزون والمستودعات', icon: 'Package', description: 'Units, warehouses, stock adjustments and location hierarchies' },
  adjustment_reason: { id: 'inventory', label: 'Inventory & Warehousing', labelAr: 'المخزون والمستودعات', icon: 'Package', description: 'Units, warehouses, stock adjustments and location hierarchies' },
  warehouse_type: { id: 'inventory', label: 'Inventory & Warehousing', labelAr: 'المخزون والمستودعات', icon: 'Package', description: 'Units, warehouses, stock adjustments and location hierarchies' },
  location_type: { id: 'inventory', label: 'Inventory & Warehousing', labelAr: 'المخزون والمستودعات', icon: 'Package', description: 'Units, warehouses, stock adjustments and location hierarchies' },

  // Sales & POS Channels
  store_type: { id: 'sales', label: 'Sales & POS Channels', labelAr: 'المبيعات ونقاط البيع', icon: 'ShoppingCart', description: 'Stores, channels, registers and transaction categories' },
  sales_channel: { id: 'sales', label: 'Sales & POS Channels', labelAr: 'المبيعات ونقاط البيع', icon: 'ShoppingCart', description: 'Stores, channels, registers and transaction categories' },
  payment_status: { id: 'sales', label: 'Sales & POS Channels', labelAr: 'المبيعات ونقاط البيع', icon: 'ShoppingCart', description: 'Stores, channels, registers and transaction categories' },
  return_reason: { id: 'sales', label: 'Sales & POS Channels', labelAr: 'المبيعات ونقاط البيع', icon: 'ShoppingCart', description: 'Stores, channels, registers and transaction categories' },

  // Products & Pricing
  product_type: { id: 'pricing', label: 'Products & Pricing', labelAr: 'المنتجات والتسعير', icon: 'Tags', description: 'Product classifications, price lists, tax rules and promotions' },
  price_list_type: { id: 'pricing', label: 'Products & Pricing', labelAr: 'المنتجات والتسعير', icon: 'Tags', description: 'Product classifications, price lists, tax rules and promotions' },
  tax_classification: { id: 'pricing', label: 'Products & Pricing', labelAr: 'المنتجات والتسعير', icon: 'Tags', description: 'Product classifications, price lists, tax rules and promotions' },
  promotion_type: { id: 'pricing', label: 'Products & Pricing', labelAr: 'المنتجات والتسعير', icon: 'Tags', description: 'Product classifications, price lists, tax rules and promotions' },

  // CRM & Logistics
  customer_type: { id: 'crm', label: 'CRM & Logistics', labelAr: 'العملاء والخدمات اللوجستية', icon: 'Users', description: 'Customers, suppliers, carriers and address configurations' },
  supplier_category: { id: 'crm', label: 'CRM & Logistics', labelAr: 'العملاء والخدمات اللوجستية', icon: 'Users', description: 'Customers, suppliers, carriers and address configurations' },
  address_type: { id: 'crm', label: 'CRM & Logistics', labelAr: 'العملاء والخدمات اللوجستية', icon: 'Users', description: 'Customers, suppliers, carriers and address configurations' },
  shipment_carrier: { id: 'crm', label: 'CRM & Logistics', labelAr: 'العملاء والخدمات اللوجستية', icon: 'Users', description: 'Customers, suppliers, carriers and address configurations' },
}

const DEFAULT_DOMAIN = {
  id: 'general',
  label: 'General & Master Catalogs',
  labelAr: 'كتالوجات عامة ومخصصة',
  icon: 'Layers',
  description: 'Custom tenant catalogs and general system master reference lists',
}

export interface TreeLookupValueNode {
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

/**
 * Construct hierarchical nested tree for lookup values within a type
 */
function buildValuesTree(
  rawValues: Array<{
    id: string
    lookup_type_id: string
    tenant_id: string | null
    code: string
    name: string
    name_ar: string | null
    description: string | null
    color: string | null
    icon: string | null
    metadata: unknown
    is_default: boolean
    is_system: boolean
    is_active: boolean
    sort_order: number
  }>,
  typeCode: string,
  typeName: string,
  tenantId: string
): { tree: TreeLookupValueNode[]; maxDepth: number } {
  const nodeMap = new Map<string, TreeLookupValueNode>()
  const rootNodes: TreeLookupValueNode[] = []
  let maxDepth = 1

  // First pass: create node objects
  for (const v of rawValues) {
    const meta = typeof v.metadata === 'object' && v.metadata !== null ? (v.metadata as Record<string, unknown>) : {}
    const parentId = (meta.parent_id as string | undefined) || null

    const node: TreeLookupValueNode = {
      id: v.id,
      lookup_type_id: v.lookup_type_id,
      tenant_id: v.tenant_id,
      code: v.code,
      name: v.name,
      name_ar: v.name_ar,
      description: v.description,
      color: v.color,
      icon: v.icon,
      metadata: meta,
      parent_id: parentId,
      is_default: v.is_default,
      is_system: v.is_system || v.tenant_id === null,
      is_active: v.is_active,
      is_tenant_custom: v.tenant_id === tenantId,
      sort_order: v.sort_order ?? 0,
      depth: 0,
      type_code: typeCode,
      type_name: typeName,
      children: [],
    }
    nodeMap.set(v.id, node)
  }

  // Second pass: wire parents and roots
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!
      parent.children.push(node)
    } else {
      rootNodes.push(node)
    }
  }

  // Third pass: compute depths
  function assignDepth(nodes: TreeLookupValueNode[], depth: number) {
    if (depth > maxDepth) maxDepth = depth
    for (const n of nodes) {
      n.depth = depth
      if (n.children.length > 0) {
        assignDepth(n.children, depth + 1)
      }
    }
  }

  assignDepth(rootNodes, 1)

  return { tree: rootNodes, maxDepth }
}

/**
 * Fetch full tree hierarchy across all lookup types & values with domain categorization
 */
export async function getLookupTree(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const types = await prisma.lookup_types.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    include: {
      lookup_values: {
        where: {
          OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      },
    },
  })

  let totalValues = 0
  let totalActiveValues = 0
  let totalCustomValues = 0
  let totalSystemValues = 0
  let overallMaxDepth = 1

  type FormattedTypeNode = {
    id: string
    code: string
    name: string
    description: string | null
    is_system: boolean
    is_active: boolean
    domain: string
    domain_label: string
    domain_label_ar: string
    domain_icon: string
    sort_order: number
    values_count: number
    active_count: number
    custom_count: number
    system_count: number
    values_tree: TreeLookupValueNode[]
    flat_values: Array<{
      id: string
      lookup_type_id: string
      tenant_id: string | null
      code: string
      name: string
      name_ar: string | null
      description: string | null
      color: string | null
      icon: string | null
      metadata: Record<string, unknown>
      parent_id: string | null
      is_default: boolean
      is_system: boolean
      is_active: boolean
      is_tenant_custom: boolean
      sort_order: number
      type_code: string
      type_name: string
    }>
  }

  const domainBuckets = new Map<
    string,
    {
      id: string
      label: string
      labelAr: string
      icon: string
      description: string
      types: FormattedTypeNode[]
      typesCount: number
      valuesCount: number
    }
  >()

  const formattedTypes = types.map((t) => {
    const domainConfig = DOMAIN_MAP[t.code] || DEFAULT_DOMAIN
    const { tree: valuesTree, maxDepth } = buildValuesTree(
      t.lookup_values,
      t.code,
      t.name,
      tenantId
    )

    if (maxDepth > overallMaxDepth) overallMaxDepth = maxDepth

    const valuesCount = t.lookup_values.length
    const activeCount = t.lookup_values.filter((v) => v.is_active).length
    const customCount = t.lookup_values.filter((v) => v.tenant_id === tenantId).length
    const systemCount = t.lookup_values.filter((v) => v.tenant_id === null || v.is_system).length

    totalValues += valuesCount
    totalActiveValues += activeCount
    totalCustomValues += customCount
    totalSystemValues += systemCount

    const typeNode = {
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      is_system: t.is_system,
      is_active: t.is_active,
      domain: domainConfig.id,
      domain_label: domainConfig.label,
      domain_label_ar: domainConfig.labelAr,
      domain_icon: domainConfig.icon,
      sort_order: t.sort_order,
      values_count: valuesCount,
      active_count: activeCount,
      custom_count: customCount,
      system_count: systemCount,
      values_tree: valuesTree,
      flat_values: t.lookup_values.map((v) => {
        const meta = typeof v.metadata === 'object' && v.metadata !== null ? (v.metadata as Record<string, unknown>) : {}
        return {
          id: v.id,
          lookup_type_id: v.lookup_type_id,
          tenant_id: v.tenant_id,
          code: v.code,
          name: v.name,
          name_ar: v.name_ar,
          description: v.description,
          color: v.color,
          icon: v.icon,
          metadata: meta,
          parent_id: (meta.parent_id as string | undefined) || null,
          is_default: v.is_default,
          is_system: v.is_system || v.tenant_id === null,
          is_active: v.is_active,
          is_tenant_custom: v.tenant_id === tenantId,
          sort_order: v.sort_order ?? 0,
          type_code: t.code,
          type_name: t.name,
        }
      }),
    }

    if (!domainBuckets.has(domainConfig.id)) {
      domainBuckets.set(domainConfig.id, {
        id: domainConfig.id,
        label: domainConfig.label,
        labelAr: domainConfig.labelAr,
        icon: domainConfig.icon,
        description: domainConfig.description,
        types: [],
        typesCount: 0,
        valuesCount: 0,
      })
    }

    const bucket = domainBuckets.get(domainConfig.id)!
    bucket.types.push(typeNode)
    bucket.typesCount += 1
    bucket.valuesCount += valuesCount

    return typeNode
  })

  return {
    domains: Array.from(domainBuckets.values()),
    types: formattedTypes,
    stats: {
      total_catalogs: types.length,
      total_values: totalValues,
      total_active_values: totalActiveValues,
      total_custom_values: totalCustomValues,
      total_system_values: totalSystemValues,
      max_hierarchy_depth: overallMaxDepth,
    },
  }
}

export interface CreateLookupTypeInput {
  code: string
  name: string
  description?: string | null
  sortOrder?: number
}

/**
 * Create a new custom lookup catalog/type
 */
export async function createLookupType(
  authUserId: string,
  input: CreateLookupTypeInput
) {
  await requireTenantId(authUserId)

  assertRequiredText(input.code, 'A code is required.')
  assertRequiredText(input.name, 'A catalog name is required.')

  const normalizedCode = input.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const duplicate = await prisma.lookup_types.findUnique({
    where: { code: normalizedCode },
  })

  if (duplicate) {
    throw new ApiError(`Lookup catalog with code '${normalizedCode}' already exists.`, 409)
  }

  return prisma.lookup_types.create({
    data: {
      code: normalizedCode,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_system: false,
      is_active: true,
      sort_order: input.sortOrder ?? 99,
    },
  })
}

