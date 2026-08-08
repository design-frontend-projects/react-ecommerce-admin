'use server'

import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import { generateTempPassword } from '@/server/utils/temp-password'

export interface CreateTenantInput {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
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

  // Generate a temporary password
  const temporaryPassword = generateTempPassword()

  // 1. Create Supabase Auth user (with onboarding NOT complete)
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      // Omit email_confirm so that Supabase sends the confirmation email if configured in project settings.
      user_metadata: {
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        onboardingComplete: false,
        force_password_change: true,
      },
    })

  if (authError || !authData.user) {
    throw new Error(
      authError?.message ?? 'Failed to create user in Supabase Auth.'
    )
  }

  const authUserId = authData.user.id

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
