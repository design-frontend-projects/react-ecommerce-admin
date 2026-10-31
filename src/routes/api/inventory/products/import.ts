/**
 * src/routes/api/inventory/products/import.ts
 *
 * REST endpoint for bulk CSV product import.
 * Protected by `products.import`.
 */

import { createFileRoute } from '@tanstack/react-router'
import { withAuth } from '@/server/utils/with-auth'
import { executeProductImport, type ProductImportInput } from '@/server/fns/product-import'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { buildScopeWhere, type ScopedEntity } from '@/server/utils/scope-filter'
import type { AuthorizedContext } from '@/server/utils/with-server-fn-auth'
import prisma from '@/lib/prisma'

const POST = withAuth(
  [
    PERMISSIONS.PRODUCTS_IMPORT,
    PERMISSIONS.PRODUCTS_MANAGE,
  ],
  async ({ request, auth, tenantId, scopeContext }) => {
    try {
      const effectiveTenantId =
        request.headers.get('x-tenant-id')?.trim() ||
        tenantId ||
        auth.tenantId ||
        null

      if (!effectiveTenantId) {
        return Response.json(
          { success: false, error: { message: 'Tenant ID required for product import.' } },
          { status: 400 }
        )
      }

      let input: ProductImportInput

      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const warehouseId = formData.get('warehouseId') as string | null
        if (!file) {
          return Response.json(
            { success: false, error: { message: 'CSV file is required.' } },
            { status: 400 }
          )
        }
        const csvContent = await file.text()
        input = { csvContent, warehouseId: warehouseId || undefined }
      } else {
        const body = await request.json()
        input = body as ProductImportInput
      }

      const defaultScopeContext = scopeContext ?? {
        tenantId: effectiveTenantId,
        tenantUserId: auth.tenantUserId || '',
        authUserId: auth.userId,
        branchIds: auth.branchId ? [auth.branchId] : [],
        warehouseIds: auth.warehouseId ? [auth.warehouseId] : [],
        dataScope: 'ASSIGNED_BRANCHES' as const,
        isSuperAdmin: auth.roleNames.includes('super_admin'),
      }

      const ctx: AuthorizedContext = {
        user: auth,
        tenantId: effectiveTenantId,
        tenantUserId: auth.tenantUserId || '',
        branchIds: auth.branchId ? [auth.branchId] : [],
        warehouseIds: auth.warehouseId ? [auth.warehouseId] : [],
        dataScope: 'ASSIGNED_BRANCHES',
        scopeContext: defaultScopeContext,
        tenantPrisma: prisma,
        scopeFilter: <T extends Record<string, unknown> = Record<string, unknown>>(
          entity: ScopedEntity,
          existingWhere?: Record<string, unknown>
        ): T => buildScopeWhere<T>(entity, defaultScopeContext, existingWhere),
        request,
      }

      const result = await executeProductImport(input, ctx)

      if (!result.success) {
        return Response.json(
          { success: false, data: result },
          { status: 422 }
        )
      }

      return Response.json({ success: true, data: result })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed'
      return Response.json(
        { success: false, error: { message } },
        { status: 500 }
      )
    }
  }
)

export const Route = createFileRoute('/api/inventory/products/import')({
  server: {
    handlers: {
      POST,
    },
  },
})
