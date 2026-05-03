import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import { getPrimaryRoleName } from '@/features/users/data/rbac'

export interface CompleteOnboardingInput {
  authUserId: string
  firstName: string
  lastName: string
  phone?: string
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(input.authUserId)
  if (error || !data.user) {
    throw new Error('Unable to resolve the Supabase auth user')
  }

  const email = data.user.email?.trim().toLowerCase() ?? null
  const phone = input.phone?.trim() || data.user.phone || null
  const metadata = data.user.user_metadata ?? {}
  const primaryRole =
    typeof metadata.role === 'string' && metadata.role.trim()
      ? metadata.role.trim().toLowerCase()
      : null

  await supabaseAdmin.auth.admin.updateUserById(input.authUserId, {
    phone: phone ?? undefined,
    user_metadata: {
      ...metadata,
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: `${input.firstName} ${input.lastName}`.trim(),
      onboarding_complete: true,
    },
  })

  const existingTenantUser = await prisma.tenant_users.findFirst({
    where: {
      OR: [
        { auth_user_id: input.authUserId },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
  })

  const tenantUser = existingTenantUser
    ? await prisma.tenant_users.update({
        where: { id: existingTenantUser.id },
        data: {
          auth_user_id: input.authUserId,
          email,
          phone,
          first_name: input.firstName,
          last_name: input.lastName,
          default_role: primaryRole ?? existingTenantUser.default_role,
          onboarding_complete: true,
          updated_at: new Date(),
        },
      })
    : await prisma.tenant_users.create({
        data: {
          auth_user_id: input.authUserId,
          email,
          phone,
          first_name: input.firstName,
          last_name: input.lastName,
          is_active: true,
          is_restuarant_user: true,
          modules: ['inventory', 'restaurant'],
          default_role: primaryRole ?? getPrimaryRoleName([]),
          onboarding_complete: true,
        },
      })

  await prisma.profiles.upsert({
    where: { auth_user_id: input.authUserId },
    update: {
      email,
      phone,
      first_name: input.firstName,
      last_name: input.lastName,
      onboarding_complete: true,
      updated_at: new Date(),
    },
    create: {
      auth_user_id: input.authUserId,
      email,
      phone,
      first_name: input.firstName,
      last_name: input.lastName,
      is_owner: true,
      system_owner: false,
      onboarding_complete: true,
    },
  })

  await prisma.user_roles.updateMany({
    where: { user_id: tenantUser.id },
    data: {
      auth_user_id: input.authUserId,
    },
  })

  return {
    success: true,
  }
}
