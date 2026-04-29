import prisma from '@/lib/prisma'
import { clerkBackend } from '@/server/clerk'
import { getPrimaryRoleName } from '@/features/users/data/rbac'

export interface CompleteOnboardingInput {
  clerkId: string
  firstName: string
  lastName: string
  phone?: string
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const clerkUser = await clerkBackend.users.getUser(input.clerkId)
  const email = clerkUser.emailAddresses[0]?.emailAddress?.trim().toLowerCase()

  if (!email) {
    throw new Error('Unable to resolve the user email from Clerk')
  }

  await clerkBackend.users.updateUser(input.clerkId, {
    firstName: input.firstName,
    lastName: input.lastName,
  })

  await clerkBackend.users.updateUserMetadata(input.clerkId, {
    publicMetadata: {
      ...(clerkUser.publicMetadata as Record<string, unknown>),
      onboardingComplete: true,
      invitedViaRbac: false,
    },
  })

  const metadata = clerkUser.publicMetadata as Record<string, unknown>
  const primaryRole =
    typeof metadata.role === 'string' && metadata.role.trim()
      ? metadata.role.trim().toLowerCase()
      : null

  const existingTenantUserByClerkId = await prisma.tenant_users.findUnique({
    where: { clerk_user_id: input.clerkId },
  })

  const existingTenantUserByEmail =
    existingTenantUserByClerkId ??
    (await prisma.tenant_users.findUnique({
      where: { email },
    }))

  const tenantUser =
    existingTenantUserByEmail
      ? await prisma.tenant_users.update({
          where: { id: existingTenantUserByEmail.id },
          data: {
            clerk_user_id: input.clerkId,
            email,
            first_name: input.firstName,
            last_name: input.lastName,
            default_role: primaryRole ?? existingTenantUserByEmail.default_role,
            updated_at: new Date(),
          },
        })
      : await prisma.tenant_users.create({
          data: {
            clerk_user_id: input.clerkId,
            email,
            first_name: input.firstName,
            last_name: input.lastName,
            is_active: true,
            is_restuarant_user: true,
            modules: ['inventory', 'restaurant'],
            default_role: primaryRole ?? getPrimaryRoleName([]),
          },
        })

  await prisma.user_roles.updateMany({
    where: { user_id: tenantUser.id },
    data: {
      clerk_user_id: input.clerkId,
    },
  })

  return {
    success: true,
  }
}
