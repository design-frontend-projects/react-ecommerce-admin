import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import { getPrimaryRoleName } from '@/features/users/data/rbac'

export interface CompleteOnboardingInput {
  clerkId: string // We keep the name clerkId for backward compatibility but it expects the Supabase User ID
  firstName: string
  lastName: string
  phone?: string
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  // Use supabaseAdmin to get the user
  const {
    data: { user: authUser },
    error,
  } = await supabaseAdmin.auth.admin.getUserById(input.clerkId)

  if (error || !authUser) {
    throw new Error('Unable to resolve the user from Supabase Auth')
  }

  const email = authUser.email?.trim().toLowerCase()

  if (!email) {
    throw new Error('Unable to resolve the user email from Supabase Auth')
  }

  // Update Supabase user metadata
  const currentMetadata = authUser.user_metadata || {}
  await supabaseAdmin.auth.admin.updateUserById(input.clerkId, {
    user_metadata: {
      ...currentMetadata,
      firstName: input.firstName,
      lastName: input.lastName,
      onboardingComplete: true,
      invitedViaRbac: false,
    },
  })

  const primaryRole =
    typeof currentMetadata.role === 'string' && currentMetadata.role.trim()
      ? currentMetadata.role.trim().toLowerCase()
      : null

  const existingTenantUserByClerkId = await prisma.tenant_users.findUnique({
    where: { user_id: input.clerkId },
  })

  const existingTenantUserByEmail =
    existingTenantUserByClerkId ??
    (await prisma.tenant_users.findUnique({
      where: { email },
    }))

  const tenantUser = existingTenantUserByEmail
    ? await prisma.tenant_users.update({
        where: { id: existingTenantUserByEmail.id },
        data: {
          user_id: input.clerkId,
          email,
          first_name: input.firstName,
          last_name: input.lastName,
          default_role: primaryRole ?? existingTenantUserByEmail.default_role,
          updated_at: new Date(),
        },
      })
    : await prisma.tenant_users.create({
        data: {
          user_id: input.clerkId,
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
      user_id: input.clerkId,
    },
  })

  // Insert or update profile
  const existingProfile = await prisma.profiles.findUnique({
    where: { email },
  })

  if (existingProfile) {
    await prisma.profiles.update({
      where: { id: existingProfile.id },
      data: {
        user_id: input.clerkId,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        onboarding_complete: true,
        updated_at: new Date(),
      },
    })
  } else {
    await prisma.profiles.create({
      data: {
        user_id: input.clerkId,
        email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        is_owner: false, // Default logic, can be overridden based on metadata
        system_owner: false,
        onboarding_complete: true,
      },
    })
  }

  return {
    success: true,
  }
}
