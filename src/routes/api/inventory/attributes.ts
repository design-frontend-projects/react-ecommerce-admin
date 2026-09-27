import { createFileRoute } from '@tanstack/react-router'
import {
  addAttributeValue,
  createAttributeDefinition,
  listAttributeDefinitions,
  type AttributeDefinitionInput,
} from '@/server/fns/products'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PRODUCTS_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listAttributeDefinitions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch attributes')
  }
})

const POST = withAuth(
  PERMISSIONS.PRODUCTS_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const url = new URL(request.url)
      const definitionId = url.searchParams.get('definitionId')

      if (definitionId) {
        // Adding a value to an existing definition
        const body = (await request.json()) as {
          value: string
          valueAr?: string | null
          colorHex?: string | null
          sortOrder?: number
        }
        const data = await addAttributeValue(userId, definitionId, body)
        return Response.json({ success: true, data })
      }

      // Creating a new attribute definition
      const body = (await request.json()) as AttributeDefinitionInput
      const data = await createAttributeDefinition(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create attribute')
    }
  }
)

export const Route = createFileRoute('/api/inventory/attributes')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
