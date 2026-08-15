'use server'

import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase-admin'

export interface ProvisionSignupUserInput {
  authUserId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}

export interface ProvisionSignupUserResult {
  id: string
  authUserId: string
  email: string
  onboardingComplete: boolean
  isNew: boolean
}

/**
 * Idempotently provisions a tenant_users record when a user signs up or confirms their account.
 * This guarantees that a tenant_users row exists with onboarding_complete: false
 * before the user completes the full onboarding questionnaire.
 */
export async function provisionSignupUser(
  input: ProvisionSignupUserInput
): Promise<ProvisionSignupUserResult> {
  const email = input.email.trim().toLowerCase()
  const authUserId = input.authUserId.trim()

  if (!authUserId || !email) {
    throw new Error('authUserId and email are required to provision a user.')
  }

  // 1. Check if tenant_users record already exists by auth_user_id or email
  const existingByAuth = await prisma.tenant_users.findFirst({
    where: { auth_user_id: authUserId },
  })

  if (existingByAuth) {
    return {
      id: existingByAuth.id,
      authUserId: existingByAuth.auth_user_id ?? authUserId,
      email: existingByAuth.email ?? email,
      onboardingComplete: existingByAuth.onboarding_complete === true,
      isNew: false,
    }
  }

  const existingByEmail = await prisma.tenant_users.findFirst({
    where: { email },
  })

  if (existingByEmail) {
    // If the record existed by email but had a placeholder/old auth_user_id, link it now
    const updated = await prisma.tenant_users.update({
      where: { id: existingByEmail.id },
      data: {
        auth_user_id: authUserId,
        first_name: input.firstName ?? existingByEmail.first_name,
        last_name: input.lastName ?? existingByEmail.last_name,
        phone: input.phone ?? existingByEmail.phone,
        updated_at: new Date(),
      },
    })

    return {
      id: updated.id,
      authUserId: updated.auth_user_id ?? authUserId,
      email: updated.email ?? email,
      onboardingComplete: updated.onboarding_complete === true,
      isNew: false,
    }
  }

  // 2. Create fresh tenant_users record with onboarding_complete = false
  const created = await prisma.tenant_users.create({
    data: {
      auth_user_id: authUserId,
      email,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      phone: input.phone ?? null,
      is_active: true,
      default_role: 'super_admin',
      is_restuarant_user: true,
      modules: ['inventory', 'restaurant'],
      primary_module: 'inventory',
      onboarding_complete: false,
    },
  })

  // 3. Ensure user metadata has onboardingComplete = false if not set
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(authUserId)
    if (userData?.user) {
      const currentMeta = userData.user.user_metadata || {}
      if (currentMeta.onboardingComplete === undefined) {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            ...currentMeta,
            firstName: input.firstName ?? currentMeta.firstName ?? '',
            lastName: input.lastName ?? currentMeta.lastName ?? '',
            onboardingComplete: false,
          },
        })
      }
    }
  } catch {
    // Non-fatal metadata sync failure
  }

  return {
    id: created.id,
    authUserId: created.auth_user_id ?? authUserId,
    email: created.email ?? email,
    onboardingComplete: false,
    isNew: true,
  }
}
