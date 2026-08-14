'use server'

import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import { resolveTenantId } from '@/server/utils/tenant'
import {
  getFallbackPermissionNamesForRoles,
  getPrimaryRoleName,
  normalizeRoleName,
} from '@/features/users/data/rbac'
import { generateTempPassword } from '@/server/utils/temp-password'
import { ADMIN_ROLES } from '@/types/user-role.enum'

const MODULE_ACTIVITY_CODES = ['inventory', 'restaurant'] as const

export interface OnboardingUserInput {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  roleId: string
  branchId?: string
}

export interface CreateOnboardingUsersCaller {
  authUserId: string
  tenantId?: string
}

export interface CreatedOnboardingUser {
  email: string
  authUserId: string
  temporaryPassword: string
  roleName: string
  branchId: string | null
  tenantUserId: string
}

export interface CreateOnboardingUsersResult {
  users: CreatedOnboardingUser[]
  errors: Array<{ email: string; error: string }>
}

/**
 * Derive modules from the tenant's activity types. Mirrors the logic in create-user.ts.
 */
async function deriveTenantModules(
  parentTenantId: string | null
): Promise<string[]> {
  if (!parentTenantId) return [...MODULE_ACTIVITY_CODES]

  const rows = (await prisma.tenant_activity_types.findMany({
    where: { tenant_id: parentTenantId, is_active: true },
    include: { business_activity_types: { select: { code: true } } },
  })) as Array<{ business_activity_types: { code: string } }>

  const derived = rows
    .map((row) => row.business_activity_types.code)
    .filter((code) =>
      (MODULE_ACTIVITY_CODES as readonly string[]).includes(code)
    )

  return derived.length > 0 ? derived : [...MODULE_ACTIVITY_CODES]
}

/**
 * Sync new user metadata to Supabase Auth (display-only, non-fatal).
 */
async function syncNewUserMetadata(
  authUserId: string,
  roleNames: string[],
  primaryRole: string | null
): Promise<void> {
  const {
    data: { user },
  } = await supabaseAdmin.auth.admin.getUserById(authUserId)
  const currentMetadata = user?.user_metadata ?? {}
  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: {
      ...currentMetadata,
      role: primaryRole,
      roles: roleNames,
      permissions: getFallbackPermissionNamesForRoles(roleNames),
    },
  })
}

/**
 * Create multiple staff users during tenant onboarding.
 * 
 * Each user gets:
 * - Supabase Auth account with a generated temp password
 * - `tenant_users` record linked to the tenant's profile via `parent_tenant_id`
 * - `profiles` record with `is_user=true`, `is_paid=false`, `payment_method=null`
 * - `user_roles` entry
 * 
 * Each user creation is independent — one failure does NOT roll back others.
 * Failed Supabase auth users are compensated (deleted).
 */
export async function createOnboardingUsers(
  input: { users: OnboardingUserInput[] },
  caller: CreateOnboardingUsersCaller
): Promise<CreateOnboardingUsersResult> {
  if (!input.users || input.users.length === 0) {
    throw new Error('At least one user is required.')
  }

  // Resolve the caller's profile (must be owner)
  const callerProfile = (await prisma.profiles.findFirst({
    where: { auth_user_id: caller.authUserId },
    select: { id: true, is_owner: true },
  })) as { id: string; is_owner: boolean } | null

  if (!callerProfile || !callerProfile.is_owner) {
    throw new Error('Only tenant owners can create users during onboarding.')
  }

  // Resolve tenant ID from context or via resolveTenantId helper
  const tenantId = caller.tenantId ?? (await resolveTenantId(caller.authUserId)) ?? callerProfile.id
  const parentTenantId = tenantId

  // Validate all roleIds
  const roleIds = [...new Set(input.users.map((u) => u.roleId))]
  const roles = (await prisma.roles.findMany({
    where: { id: { in: roleIds } },
  })) as Array<{ id: string; name: string; is_active: boolean }>

  const roleMap = new Map(roles.map((r) => [r.id, r]))

  const modules = await deriveTenantModules(parentTenantId)

  const result: CreateOnboardingUsersResult = { users: [], errors: [] }

  for (const userInput of input.users) {
    const email = userInput.email.trim().toLowerCase()

    // Check if role exists
    const role = roleMap.get(userInput.roleId)
    if (!role) {
      result.errors.push({ email, error: `Role not found: ${userInput.roleId}` })
      continue
    }
    if (!role.is_active) {
      result.errors.push({ email, error: `Role "${role.name}" is not active.` })
      continue
    }

    // Check for existing user with same email
    const existingUser = await prisma.tenant_users.findUnique({
      where: { email },
    })
    if (existingUser) {
      result.errors.push({ email, error: 'A user with this email already exists.' })
      continue
    }

    const roleNames = [role.name]
    const primaryRole = getPrimaryRoleName(roleNames)
    const isOwner = roleNames.some((name) =>
      ADMIN_ROLES.includes(normalizeRoleName(name) as any)
    )

    // Generate temp password — tenant shares this with the user
    const temporaryPassword = generateTempPassword()

    // Create Supabase auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          role: primaryRole,
          roles: roleNames,
          onboardingComplete: true, // Staff users skip onboarding
          invitedViaRbac: true,
          force_password_change: true,
          firstName: userInput.firstName ?? '',
          lastName: userInput.lastName ?? '',
          isUser: true,
        },
      })

    if (authError || !authData.user) {
      result.errors.push({
        email,
        error: authError?.message ?? 'Failed to create auth user.',
      })
      continue
    }

    const authUserId = authData.user.id

    let tenantUserId: string
    try {
      const tenantUser = await prisma.$transaction(async (tx: typeof prisma) => {
        // Create tenant_users record
        const created = await tx.tenant_users.create({
          data: {
            auth_user_id: authUserId,
            email,
            first_name: userInput.firstName ?? null,
            last_name: userInput.lastName ?? null,
            phone: userInput.phone ?? null,
            is_active: true,
            default_role: primaryRole,
            is_restuarant_user: true,
            modules,
            primary_module: modules[0] ?? null,
            parent_tenant_id: parentTenantId,
            tenant_id: tenantId,
            onboarding_complete: true, // Staff users don't need to onboard
          },
        })

        // Create user_roles
        await tx.user_roles.create({
          data: {
            tenant_user_id: created.id,
            role_id: role.id,
          },
        })

        // Create profiles record with staff user flags
        await tx.profiles.create({
          data: {
            auth_user_id: authUserId,
            email,
            first_name: userInput.firstName ?? null,
            last_name: userInput.lastName ?? null,
            phone: userInput.phone ?? null,
            is_owner: isOwner,
            system_owner: false,
            onboarding_complete: true, // Skip onboarding for staff
            is_user: true,            // Staff user flag
            is_paid: false,           // Staff don't pay
            payment_method: null,     // Not a buyer
            branch_id: userInput.branchId || null,
            role: primaryRole,
            parent_auth_user_id: caller.authUserId, // Links to tenant creator
          },
        })

        return created
      })

      tenantUserId = tenantUser.id

      // Sync metadata (non-fatal)
      await syncNewUserMetadata(authUserId, roleNames, primaryRole).catch(
        () => undefined
      )

      result.users.push({
        email,
        authUserId,
        temporaryPassword,
        roleName: primaryRole ?? role.name,
        branchId: userInput.branchId ?? null,
        tenantUserId,
      })
    } catch (error) {
      // Compensate: delete orphaned auth user
      await supabaseAdmin.auth.admin
        .deleteUser(authUserId)
        .catch(() => undefined)
      result.errors.push({
        email,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create user records.',
      })
    }
  }

  return result
}
