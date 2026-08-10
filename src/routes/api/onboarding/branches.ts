import { createFileRoute } from '@tanstack/react-router'
import { createOnboardingBranches } from '@/server/fns/onboarding-branches'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json()) as {
    branches?: Array<{
      name?: string
      cityId?: string
      address?: string
      phone?: string
    }>
  }

  if (!body.branches || !Array.isArray(body.branches) || body.branches.length === 0) {
    return jsonError('At least one branch is required.', 400)
  }

  // Validate each branch has required fields
  for (const branch of body.branches) {
    if (!branch.name?.trim()) {
      return jsonError('Each branch must have a name.', 400)
    }
    if (!branch.cityId?.trim()) {
      return jsonError('Each branch must have a city.', 400)
    }
  }

  try {
    const result = await createOnboardingBranches(
      {
        branches: body.branches.map((b) => ({
          name: b.name!.trim(),
          cityId: b.cityId!.trim(),
          address: b.address?.trim(),
          phone: b.phone?.trim(),
        })),
      },
      { authUserId: auth.userId }
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create branches.',
      400
    )
  }
})

export const Route = createFileRoute('/api/onboarding/branches')({
  server: {
    handlers: {
      POST,
    },
  },
})
