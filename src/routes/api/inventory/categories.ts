import { createFileRoute } from '@tanstack/react-router'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/server/fns/categories'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listCategories(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch categories')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as CreateCategoryInput
      const data = await createCategory(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create category')
    }
  }
)

const PATCH = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Category id is required.' } },
          { status: 400 }
        )
      }
      const body = (await request.json()) as UpdateCategoryInput
      const data = await updateCategory(userId, id, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update category')
    }
  }
)

const DELETE = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Category id is required.' } },
          { status: 400 }
        )
      }
      const data = await deleteCategory(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to delete category')
    }
  }
)

export const Route = createFileRoute('/api/inventory/categories')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
