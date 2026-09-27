'use server'

import { ApiError } from '@/server/utils/api-error'
import {
  resolveTenantId,
  requireTenantId,
  resolveTenantUserId,
  isValidUuid,
} from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import { BusinessEventNotifications } from '@/server/services/business-event-notifications'

export interface CreateCustomerInput {
  firstName: string
  lastName?: string | null
  code?: string | null
  email?: string | null
  phone?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  groupId?: string | null
  isActive?: boolean
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>

function assertName(firstName: unknown): asserts firstName is string {
  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw new ApiError('First name is required.', 400)
  }
}

export async function listCustomers(authUserId: string, search?: string) {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId || !isValidUuid(tenantId)) {
    return []
  }

  const where: any = {
    tenant_id: tenantId,
    deleted_at: null,
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { first_name: { contains: q, mode: 'insensitive' } },
      { last_name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ]
  }

  return prisma.customers.findMany({
    where,
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    include: {
      customer_groups: {
        select: { id: true, name: true },
      },
      notification_channel: {
        select: { id: true, code: true, name: true },
      },
    },
  })
}

export async function getCustomer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  if (!isValidUuid(id)) {
    throw new ApiError('Invalid customer id.', 400)
  }

  const customer = await prisma.customers.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: {
      customer_groups: true,
      notification_channel: true,
    },
  })
  if (!customer) {
    throw new ApiError('Customer not found.', 404)
  }
  return customer
}

export async function createCustomer(
  authUserId: string,
  input: CreateCustomerInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  assertName(input.firstName)

  const groupId = input.groupId && isValidUuid(input.groupId) ? input.groupId : null

  const customer = await prisma.customers.create({
    data: {
      tenant_id: tenantId,
      first_name: input.firstName.trim(),
      last_name: input.lastName?.trim() || '',
      code: input.code?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address_line1: input.addressLine1?.trim() || null,
      address_line2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      country: input.country?.trim() || 'USA',
      group_id: groupId,
      is_active: input.isActive ?? true,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })

  // Auto-provision dedicated customer notification channel and trigger business event notification
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer'
  try {
    await BusinessEventNotifications.notifyCustomerCreated({
      tenantId,
      customerId: customer.id,
      name: fullName,
      email: customer.email,
      phone: customer.phone,
      createdByUserId: tenantUserId,
    })
  } catch (err: any) {
    console.warn('[createCustomer] Notification dispatch deferred:', err?.message)
  }

  return customer
}

export async function updateCustomer(
  authUserId: string,
  id: string,
  input: UpdateCustomerInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Invalid customer id.', 400)
  }

  const existing = await prisma.customers.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Customer not found.', 404)
  }

  if (input.firstName !== undefined) {
    assertName(input.firstName)
  }

  const groupId =
    input.groupId !== undefined
      ? input.groupId && isValidUuid(input.groupId)
        ? input.groupId
        : null
      : undefined

  const data: Record<string, unknown> = {
    ...(input.firstName !== undefined ? { first_name: input.firstName.trim() } : {}),
    ...(input.lastName !== undefined ? { last_name: input.lastName.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
    ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
    ...(input.addressLine1 !== undefined ? { address_line1: input.addressLine1?.trim() || null } : {}),
    ...(input.addressLine2 !== undefined ? { address_line2: input.addressLine2?.trim() || null } : {}),
    ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
    ...(input.state !== undefined ? { state: input.state?.trim() || null } : {}),
    ...(input.postalCode !== undefined ? { postal_code: input.postalCode?.trim() || null } : {}),
    ...(input.country !== undefined ? { country: input.country?.trim() || 'USA' } : {}),
    ...(groupId !== undefined ? { group_id: groupId } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    updated_by_user_id: tenantUserId,
    updated_at: new Date(),
  }

  return prisma.customers.update({
    where: { id },
    data,
  })
}

export async function deleteCustomer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Invalid customer id.', 400)
  }

  const existing = await prisma.customers.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: {
      _count: {
        select: {
          sales_invoices: true,
        },
      },
    },
  })
  if (!existing) {
    throw new ApiError('Customer not found.', 404)
  }

  // Soft delete
  return prisma.customers.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      is_active: false,
      updated_by_user_id: tenantUserId,
    },
  })
}
