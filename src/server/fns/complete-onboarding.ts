'use server'

import { supabaseAdmin } from '@/server/supabase-admin'
import {
  generateTenantCode,
  generateTenantSlug,
  mapActivityToTenantType,
} from '@/server/utils/tenant-utils'
import prisma from '@/lib/prisma'
import type { OnboardingBranchInput } from './onboarding-branches'
import {
  createOnboardingUsers,
  type CreatedOnboardingUser,
  type OnboardingUserInput,
} from './onboarding-users'

export interface CompleteTenantOnboardingInput {
  authUserId: string
  firstName: string
  lastName: string
  phone?: string
  businessName: string
  displayName?: string
  legalName?: string
  countryId: string
  activity: string
  paymentMethod: string
  transferRef?: string
  subscriptionId: string
  branches?: OnboardingBranchInput[]
  users?: OnboardingUserInput[]
}

export interface CompleteTenantOnboardingResult {
  success: boolean
  tenantId: string
  tenantCode: string
  createdBranches?: Array<{ id: string; name: string }>
  createdUsers?: CreatedOnboardingUser[]
  userErrors?: Array<{ email: string; error: string }>
}

export async function completeTenantOnboarding(
  input: CompleteTenantOnboardingInput
): Promise<CompleteTenantOnboardingResult> {
  if (!input.authUserId || !input.firstName || !input.lastName) {
    throw new Error(
      'User identity fields (authUserId, firstName, lastName) are required.'
    )
  }

  if (!input.businessName || !input.businessName.trim()) {
    throw new Error('Business name is required.')
  }

  if (!input.countryId) {
    throw new Error('Country selection is required.')
  }

  if (!input.subscriptionId || !input.subscriptionId.trim()) {
    throw new Error('Subscription plan selection is required.')
  }

  // 1. Resolve user from Supabase Auth
  const {
    data: { user: authUser },
    error: authUserError,
  } = await supabaseAdmin.auth.admin.getUserById(input.authUserId)

  if (authUserError || !authUser) {
    throw new Error('Unable to resolve user from Supabase Auth.')
  }

  const email = authUser.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Unable to resolve user email from Supabase Auth.')
  }

  // 2. Fetch country and its default currency
  console.log(input)
  console.log('input country id: ', input.countryId)

  const country = await prisma.countries.findUnique({
    where: { id: input.countryId },
    include: { currencies: true },
  })
  console.log('fetched country data')
  console.log(country)

  if (!country) {
    throw new Error('Selected country not found.')
  }

  // 3. Generate tenant code & slug
  const tenantCode = await generateTenantCode()
  const slug = await generateTenantSlug(input.businessName)
  const tenantType = mapActivityToTenantType(input.activity)

  // 4. Run atomic transaction for tenant setup
  const createdBranchResults: Array<{ id: string; name: string }> = []

  const tenant = await prisma.$transaction(async (tx: typeof prisma) => {
    // a. Create tenant
    const createdTenant = await tx.tenants.create({
      data: {
        tenant_code: tenantCode,
        auth_user_id: input.authUserId,
        name: input.businessName.trim(),
        slug,
        display_name: input.displayName?.trim() || input.businessName.trim(),
        legal_name: input.legalName?.trim() || input.businessName.trim(),
        type: tenantType,
        status: 'active',
        country_id: country.id,
        country_code: country.code,
        currency_id: country.currencies?.id || null,
        currency_code: country.currencies?.code || 'USD',
        created_by: input.authUserId,
      },
    })

    // b. Create tenant_subscriptions
    const tenantSub = await tx.tenant_subscriptions.create({
      data: {
        tenant_id: createdTenant.id,
        auth_user_id: input.authUserId,
        email,
        subscription_id: input.subscriptionId,
        status: 'paid',
        first_use: false,
        start_date: new Date(),
        first_name: input.firstName,
        last_name: input.lastName,
        is_owner: true,
      },
    })

    // c. Link current subscription back to tenant
    await tx.tenants.update({
      where: { id: createdTenant.id },
      data: { current_subscription_id: tenantSub.id },
    })

    // d. Upsert tenant_users for owner
    const existingTenantUser = await tx.tenant_users.findFirst({
      where: { auth_user_id: input.authUserId },
    })

    if (existingTenantUser) {
      await tx.tenant_users.update({
        where: { id: existingTenantUser.id },
        data: {
          tenant_id: createdTenant.id,
          parent_tenant_id: createdTenant.id,
          email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone || null,
          onboarding_complete: true,
          default_role: 'super_admin',
          updated_at: new Date(),
        },
      })
    } else {
      await tx.tenant_users.create({
        data: {
          auth_user_id: input.authUserId,
          tenant_id: createdTenant.id,
          parent_tenant_id: createdTenant.id,
          email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone || null,
          is_active: true,
          is_restuarant_user: true,
          modules: ['inventory', 'restaurant'],
          default_role: 'super_admin',
          onboarding_complete: true,
        },
      })
    }

    // f. Create branches if provided
    if (input.branches && input.branches.length > 0) {
      for (const branchInput of input.branches) {
        const b = await tx.branches.create({
          data: {
            name: branchInput.name.trim(),
            city_id: branchInput.cityId,
            address: branchInput.address?.trim() || null,
            phone: branchInput.phone?.trim() || null,
            auth_user_id: input.authUserId,
            tenant_id: createdTenant.id,
            is_active: true,
          },
        })
        createdBranchResults.push({ id: b.id, name: b.name })
      }

      if (createdBranchResults.length > 0) {
        await tx.tenants.update({
          where: { id: createdTenant.id },
          data: { default_branch_id: createdBranchResults[0].id },
        })
      }
    }

    return createdTenant
  })

  // 5. Create staff users if provided
  let createdUsers: CreatedOnboardingUser[] | undefined
  let userErrors: Array<{ email: string; error: string }> | undefined

  if (input.users && input.users.length > 0) {
    const userRes = await createOnboardingUsers(
      { users: input.users },
      { authUserId: input.authUserId, tenantId: tenant.id }
    )
    createdUsers = userRes.users
    userErrors = userRes.errors
  }

  // 6. Sync Supabase user metadata
  const currentMetadata = authUser.user_metadata || {}
  await supabaseAdmin.auth.admin.updateUserById(input.authUserId, {
    user_metadata: {
      ...currentMetadata,
      firstName: input.firstName,
      lastName: input.lastName,
      tenantId: tenant.id,
      tenantCode: tenantCode,
      onboardingComplete: true,
      invitedViaRbac: false,
    },
  })

  return {
    success: true,
    tenantId: tenant.id,
    tenantCode,
    createdBranches: createdBranchResults,
    createdUsers,
    userErrors,
  }
}
