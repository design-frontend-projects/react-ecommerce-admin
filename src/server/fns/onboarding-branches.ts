'use server'

import prisma from '@/lib/prisma'
import { resolveTenantId } from '@/server/utils/tenant'

export interface OnboardingBranchInput {
  name: string
  cityId: string
  address?: string
  phone?: string
}

export interface CreateOnboardingBranchesInput {
  branches: OnboardingBranchInput[]
}

export interface CreateOnboardingBranchesCaller {
  authUserId: string
  tenantId?: string
}

export interface CreatedBranch {
  id: string
  name: string
  cityId: string
  address: string | null
  phone: string | null
}

/**
 * Create branches during tenant onboarding. The caller must be the tenant owner.
 * Validates all city IDs exist, then bulk-inserts branches linked to the tenant.
 */
export async function createOnboardingBranches(
  input: CreateOnboardingBranchesInput,
  caller: CreateOnboardingBranchesCaller
): Promise<CreatedBranch[]> {
  if (!input.branches || input.branches.length === 0) {
    throw new Error('At least one branch is required.')
  }

  // Verify the caller is associated with a tenant
  const tenantId = caller.tenantId ?? (await resolveTenantId(caller.authUserId))
  if (!tenantId) {
    throw new Error('Only tenant owners can create branches during onboarding.')
  }

  // Validate all city IDs exist
  const cityIds = [...new Set(input.branches.map((b) => b.cityId))]
  const existingCities = (await prisma.cities.findMany({
    where: { id: { in: cityIds } },
    select: { id: true },
  })) as Array<{ id: string }>

  if (existingCities.length !== cityIds.length) {
    const foundIds = new Set(existingCities.map((c) => c.id))
    const missing = cityIds.filter((id) => !foundIds.has(id))
    throw new Error(`City IDs not found: ${missing.join(', ')}`)
  }

  // Create branches in a transaction
  const createdBranches = await prisma.$transaction(
    input.branches.map((branch) =>
      prisma.branches.create({
        data: {
          name: branch.name,
          city_id: branch.cityId,
          address: branch.address ?? null,
          phone: branch.phone ?? null,
          auth_user_id: caller.authUserId,
          tenant_id: tenantId,
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          city_id: true,
          address: true,
          phone: true,
        },
      })
    )
  )

  return createdBranches.map(
    (b: {
      id: string
      name: string
      city_id: string
      address: string | null
      phone: string | null
    }) => ({
      id: b.id,
      name: b.name,
      cityId: b.city_id,
      address: b.address,
      phone: b.phone,
    })
  )
}
