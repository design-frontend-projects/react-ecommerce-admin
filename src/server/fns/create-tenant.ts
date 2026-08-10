'use server'

import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import { generateTempPassword } from '@/server/utils/temp-password'

export interface CreateTenantInput {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  redirectTo?: string
}

export interface CreateTenantCaller {
  authUserId: string
}

export interface CreateTenantResult {
  authUserId: string
  temporaryPassword?: string
}

export async function createTenant(
  input: CreateTenantInput,
  _caller: CreateTenantCaller
): Promise<CreateTenantResult> {
  const email = input.email.trim().toLowerCase()

  // Check for existing profile with this email
  const existingProfile = await prisma.profiles.findUnique({ where: { email } })
  if (existingProfile) {
    throw new Error('A user with this email already exists.')
  }

  const appUrl =
    process.env.VITE_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:5177'

  const redirectTo = input.redirectTo || `${appUrl}/complete-account`

  let authUserId: string
  let temporaryPassword: string | undefined

  // 1. Send Supabase Auth invitation email with redirectTo set to /complete-account (matching SignUp flow)
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        onboardingComplete: false,
        isTenantOwner: true,
      },
      redirectTo,
    })

  if (!inviteError && inviteData?.user) {
    authUserId = inviteData.user.id
  } else {
    // Fallback: If inviteUserByEmail fails (e.g. SMTP unavailable in local dev), create user with temporary password
    temporaryPassword = generateTempPassword()
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          firstName: input.firstName ?? '',
          lastName: input.lastName ?? '',
          onboardingComplete: false,
          force_password_change: true,
        },
      })

    if (authError || !authData.user) {
      throw new Error(
        inviteError?.message ||
          authError?.message ||
          'Failed to create user in Supabase Auth.'
      )
    }

    authUserId = authData.user.id
  }

  // 2. Create profile only (is_owner = true, onboarding_complete = false)
  //    NO tenant_users row — created during onboarding
  try {
    await prisma.profiles.create({
      data: {
        auth_user_id: authUserId,
        email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        phone: input.phone ?? null,
        is_owner: true,
        system_owner: false,
        onboarding_complete: false,
      },
    })
  } catch (error) {
    // Compensation: remove orphaned auth user
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined)
    throw error
  }

  return {
    authUserId,
    temporaryPassword,
  }
}
