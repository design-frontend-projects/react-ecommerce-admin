'use server'

import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import type { ApprovalStatus, DiscountType } from '@/features/promotions/types'
import type { Prisma, inv_approval_status_enum, discount_type_enum } from '@/generated/prisma/client'

export interface GetApprovalsFilter {
  status?: ApprovalStatus | 'all'
  branchId?: string
  storeId?: string
  page?: number
  pageSize?: number
}

export interface CreateApprovalInput {
  branchId: string
  storeId?: string | null
  posTerminalId?: string | null
  salesInvoiceId?: string | null
  salesOrderId?: string | null
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  originalAmount: number
  userMaxAllowedPercent: number
  reason: string
}

export async function getDiscountApprovalRequests(
  authUserId: string,
  filter: GetApprovalsFilter = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Prisma.inv_discount_approval_requestsWhereInput = {
      tenant_id: tenantId,
    }

    if (filter.status && filter.status !== 'all') {
      where.status = filter.status as inv_approval_status_enum
    }

    if (filter.branchId) {
      where.branch_id = filter.branchId
    }

    if (filter.storeId) {
      where.store_id = filter.storeId
    }

    const [totalCount, rows] = await Promise.all([
      prisma.inv_discount_approval_requests.count({ where }),
      prisma.inv_discount_approval_requests.findMany({
        where,
        include: {
          branches: { select: { id: true, name: true } },
          stores: { select: { store_id: true, name: true } },
          sales_invoices: { select: { id: true, invoice_no: true } },
        },
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: pageSize,
      }),
    ])

    return {
      data: rows.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        branchId: r.branch_id,
        branchName: r.branches.name,
        storeId: r.store_id,
        storeName: r.stores?.name ?? null,
        posTerminalId: r.pos_terminal_id,
        requestedByUserId: r.requested_by_user_id,
        approvedByUserId: r.approved_by_user_id,
        salesInvoiceId: r.sales_invoice_id,
        invoiceNo: r.sales_invoices?.invoice_no ?? null,
        salesOrderId: r.sales_order_id,
        discountType: r.discount_type,
        discountValue: Number(r.discount_value),
        discountAmount: Number(r.discount_amount),
        originalAmount: Number(r.original_amount),
        userMaxAllowedPercent: Number(r.user_max_allowed_percent),
        status: r.status,
        reason: r.reason,
        rejectionReason: r.rejection_reason,
        reviewedAt: r.reviewed_at ? r.reviewed_at.toISOString() : null,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    }
  })
}

export async function createDiscountApprovalRequest(
  authUserId: string,
  input: CreateApprovalInput
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.inv_discount_approval_requests.create({
      data: {
        tenant_id: tenantId,
        branch_id: input.branchId,
        store_id: input.storeId || null,
        pos_terminal_id: input.posTerminalId || null,
        requested_by_user_id: authUserId,
        sales_invoice_id: input.salesInvoiceId || null,
        sales_order_id: input.salesOrderId || null,
        discount_type: input.discountType as discount_type_enum,
        discount_value: input.discountValue,
        discount_amount: input.discountAmount,
        original_amount: input.originalAmount,
        user_max_allowed_percent: input.userMaxAllowedPercent,
        status: 'pending',
        reason: input.reason,
      },
    })
  })
}

export async function reviewDiscountApprovalRequest(
  authUserId: string,
  requestId: string,
  approved: boolean,
  rejectionReason?: string
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await prisma.inv_discount_approval_requests.findFirst({
      where: { id: requestId, tenant_id: tenantId },
    })

    if (!existing) throw new Error('Discount approval request not found.')
    if (existing.status !== 'pending') {
      throw new Error(`Request is already ${existing.status}.`)
    }

    return prisma.inv_discount_approval_requests.update({
      where: { id: requestId, tenant_id: tenantId },
      data: {
        status: approved ? 'approved' : 'rejected',
        approved_by_user_id: authUserId,
        rejection_reason: approved ? null : rejectionReason || 'Rejected by supervisor',
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    })
  })
}
