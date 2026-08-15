import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import {
  generateTenantCode,
  generateTenantSlug,
  mapActivityToTenantType,
} from '@/server/utils/tenant-utils'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'

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
}

export interface CompleteTenantOnboardingResult {
  success: boolean
  tenantId: string
  tenantCode: string
}

const inputSchema = z.object({
  authUserId: z.string().min(1, 'User ID is required.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().optional(),
  businessName: z.string().min(1, 'Business name is required.'),
  displayName: z.string().optional(),
  legalName: z.string().optional(),
  countryId: z.uuid('Invalid country ID format. Expected a valid UUID.'),
  activity: z.string().min(1, 'Activity is required.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  transferRef: z.string().optional(),
  subscriptionId: z.string().min(1, 'Subscription plan selection is required.'),
})

export const completeTenantOnboarding = createServerFn({ method: 'POST' })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data: input }): Promise<CompleteTenantOnboardingResult> => {
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

    console.log(input)

    // 2. Fetch country and its default currency
    const country = await prisma.countries.findUnique({
      where: { id: input.countryId },
      include: { currencies: true },
    })

    if (!country) {
      throw new Error('Selected country not found.')
    }

    const currencyId: string | null =
      country.currencies?.id || country.currency_id || null
    let currencyCode: string = country.currencies?.code || 'USD'

    if (!country.currencies && currencyId) {
      const fetchedCurrency = await prisma.currencies
        .findUnique({
          where: { id: currencyId },
        })
        .catch(() => null)
      if (fetchedCurrency) {
        currencyCode = fetchedCurrency.code
      }
    }

    // 3. Generate tenant code & slug
    const tenantCode = await generateTenantCode()
    const slug = await generateTenantSlug(input.businessName)
    const tenantType = mapActivityToTenantType(input.activity)

    // 4. Run atomic transaction for tenant setup
    const tenant = await prisma.$transaction(async (tx) => {
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
          currency_id: currencyId,
          currency_code: currencyCode,
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
          payment_method: input.paymentMethod,
          transfer_ref: input.transferRef || null,
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

      return createdTenant
    })

    // 5. Sync Supabase user metadata
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
    }
  })
