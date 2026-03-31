import { clerkBackend } from '@/server/clerk'
import prisma from '@/lib/prisma'

export interface CompleteOnboardingInput {
  clerkId: string
  firstName: string
  lastName: string
  phone?: string
}

/**
 * Completes user onboarding after accepting an invitation.
 *
 * 1. Updates Clerk user metadata (onboardingComplete: true)
 * 2. Updates tenant_users record with profile details
 * 3. Updates employee_roles clerk_user_id from pending_ to actual
 */
export async function completeOnboarding(input: CompleteOnboardingInput): Promise<{
  success: boolean
}> {
  // 1. Update Clerk user public metadata
  await clerkBackend.users.updateUserMetadata(input.clerkId, {
    publicMetadata: {
      onboardingComplete: true,
    },
  })

  // 2. Update Clerk user profile
  await clerkBackend.users.updateUser(input.clerkId, {
    firstName: input.firstName,
    lastName: input.lastName,
  })

  // 3. Get the Clerk user to find email
  const clerkUser = await clerkBackend.users.getUser(input.clerkId)
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''

  // 4. Update tenant_users record - find by email and update clerk_user_id
  const tenantUser = await prisma.tenant_users.findUnique({
    where: { email },
  })

  if (tenantUser) {
    await prisma.tenant_users.update({
      where: { id: tenantUser.id },
      data: {
        clerk_user_id: input.clerkId,
        first_name: input.firstName,
        last_name: input.lastName,
        updated_at: new Date(),
      },
    })

    // 5. Update employee_roles to swap pending_ clerk ID with real one
    if (tenantUser.clerk_user_id.startsWith('pending_')) {
      await prisma.employee_roles.updateMany({
        where: { clerk_user_id: tenantUser.clerk_user_id },
        data: { clerk_user_id: input.clerkId },
      })
    }
  } else {
    // No pending record found - create one
    await prisma.tenant_users.create({
      data: {
        clerk_user_id: input.clerkId,
        email,
        first_name: input.firstName,
        last_name: input.lastName,
        is_active: true,
        is_restuarant_user: true,
        modules: ['inventory', 'restaurant'],
      },
    })
  }

  return { success: true }
}
