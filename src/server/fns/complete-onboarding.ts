import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import {
  generateTenantCode,
  generateTenantSlug,
  mapActivityToTenantType,
} from '@/server/utils/tenant-utils'
import { createServerFn } from '@tanstack/react-start'
import { calculateEndDate } from '@/lib/subscription_utils'
import prisma from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

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
  countryId: z.string().min(1, 'Country selection is required.'),
  activity: z.string().min(1, 'Activity is required.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  transferRef: z.string().optional(),
  subscriptionId: z.string().min(1, 'Subscription plan selection is required.'),
})

export const completeTenantOnboarding = createServerFn({ method: 'POST' })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data: input }): Promise<CompleteTenantOnboardingResult> => {
    try {
      // 1. Resolve user from Supabase Auth
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabaseAdmin.auth.admin.getUserById(input.authUserId)

      if (authUserError || !authUser) {
        console.error('[completeTenantOnboarding] Supabase getUserById error:', authUserError)
        throw new Error(
          authUserError?.message
            ? `Unable to resolve user from Supabase Auth: ${authUserError.message}`
            : 'Unable to resolve user from Supabase Auth.'
        )
      }

      const email = authUser.email?.trim().toLowerCase()
      if (!email) {
        throw new Error('Unable to resolve user email from Supabase Auth.')
      }

      // 2. Fetch country and its default currency with resilient lookups
      const rawCountryInput = input.countryId?.trim() || ''
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawCountryInput
      )

      type CountryWithCurrencies =
        | Prisma.countriesGetPayload<{
            include: { currencies: true }
          }>
        | {
            id: string | null
            code: string
            name: string
            currencies?: { id: string; code: string } | null
            currency_id?: string | null
          }

      let country: CountryWithCurrencies | null = null

      // 2a. Primary Lookup: by UUID id if input is formatted as UUID
      if (isUuid) {
        country = await prisma.countries
          .findUnique({
            where: { id: rawCountryInput },
            include: { currencies: true },
          })
          .catch(() => null)
      }

      // 2b. Secondary Lookup: by Country Code (e.g., 'USA', 'EGY', 'US', 'EG') or Name
      if (!country) {
        country = await prisma.countries
          .findFirst({
            where: {
              OR: [
                { code: { equals: rawCountryInput, mode: 'insensitive' } },
                { name: { equals: rawCountryInput, mode: 'insensitive' } },
              ],
            },
            include: { currencies: true },
          })
          .catch(() => null)
      }

      // 2c. Fallback Lookup: First available active country in the database
      if (!country) {
        country = await prisma.countries
          .findFirst({
            where: { is_active: true },
            include: { currencies: true },
          })
          .catch(() => null)
      }

      // 2d. In-memory emergency fallback if countries table is completely empty
      if (!country) {
        country = {
          id: null,
          code: 'USA',
          name: 'United States',
        }
      }

      // 2e. Resolve Currency ID & Currency Code safely (ensuring max 3 chars for Char(3))
      let currencyId: string | null =
        country.currencies?.id || country.currency_id || null
      let currencyCode: string = (
        country.currencies?.code || 'USD'
      )
        .slice(0, 3)
        .toUpperCase()

      if (!country.currencies && currencyId) {
        const fetchedCurrency = await prisma.currencies
          .findUnique({
            where: { id: currencyId },
          })
          .catch(() => null)
        if (fetchedCurrency?.code) {
          currencyCode = fetchedCurrency.code.slice(0, 3).toUpperCase()
        }
      } else if (!currencyId) {
        const defaultCurrency = await prisma.currencies
          .findFirst({
            where: { is_active: true },
          })
          .catch(() => null)
        if (defaultCurrency) {
          currencyId = defaultCurrency.id
          currencyCode = defaultCurrency.code.slice(0, 3).toUpperCase()
        }
      }

      // 2f. Resolve Subscription ID format & duration
      const rawSubInput = input.subscriptionId?.trim() || ''
      const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawSubInput
      )
      let validSubscriptionId = rawSubInput
      let subscriptionPlan: { id: string; duration_months: number } | null = null

      if (isSubUuid) {
        subscriptionPlan = await prisma.subscriptions
          .findUnique({
            where: { id: validSubscriptionId },
            select: { id: true, duration_months: true },
          })
          .catch(() => null)
      }

      if (!subscriptionPlan) {
        subscriptionPlan = await prisma.subscriptions
          .findFirst({
            where: {
              OR: [
                { name: { equals: rawSubInput, mode: 'insensitive' } },
              ],
            },
            select: { id: true, duration_months: true },
          })
          .catch(() => null)
      }

      if (!subscriptionPlan) {
        subscriptionPlan = await prisma.subscriptions
          .findFirst({
            select: { id: true, duration_months: true },
          })
          .catch(() => null)
      }

      if (subscriptionPlan?.id) {
        validSubscriptionId = subscriptionPlan.id
      }
      const durationMonths = subscriptionPlan?.duration_months ?? 1
      const startDate = new Date()
      const endDate = calculateEndDate(startDate, durationMonths)

      // 3. Generate tenant code & slug
      const tenantCode = await generateTenantCode()
      const slug = await generateTenantSlug(input.businessName)
      const tenantType = mapActivityToTenantType(input.activity)

      // 4. Run atomic transaction for tenant setup
      const tenant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            country_id: country.id || undefined,
            country_code: country.code ? String(country.code).slice(0, 3).toUpperCase() : undefined,
            currency_id: currencyId || undefined,
            currency_code: currencyCode ? String(currencyCode).slice(0, 3).toUpperCase() : 'USD',
            created_by: input.authUserId,
          },
        })

        // b. Create tenant_subscriptions
        const tenantSub = await tx.tenant_subscriptions.create({
          data: {
            tenant_id: createdTenant.id,
            auth_user_id: input.authUserId,
            email,
            subscription_id: validSubscriptionId,
            status: 'paid',
            first_use: false,
            start_date: startDate,
            end_date: endDate,
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
              primary_module: 'inventory',
              modules: ['inventory', 'restaurant'],
              default_role: 'super_admin',
              onboarding_complete: true,
            },
          })
        }

        return createdTenant
      })

      // 5. Sync Supabase user metadata
      try {
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
      } catch (metaErr) {
        console.warn('[completeTenantOnboarding] Non-fatal metadata sync warning:', metaErr)
      }

      return {
        success: true,
        tenantId: tenant.id,
        tenantCode,
      }
    } catch (err: unknown) {
      console.error('[completeTenantOnboarding] Execution error:', err)
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to complete tenant account setup.'
      throw new Error(message)
    }
  })
