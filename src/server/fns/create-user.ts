import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import {
  getFallbackPermissionNamesForRoles,
  getPrimaryRoleName,
  normalizeRoleName,
} from '@/features/users/data/rbac'
import { checkAdminAccess } from './rbac'

const MODULE_ACTIVITY_CODES = ['inventory', 'restaurant'] as const

export interface CreateUserInput {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  /** One or more role ids (min 1). */
  roleIds: string[]
  branchId?: string
}

export interface CreateUserCaller {
  /** Supabase auth id of the acting admin (from requireAuth). */
  authUserId: string
}

export interface CreateUserResult {
  tenantUserId: string
  authUserId: string
  roleNames: string[]
  primaryRole: string | null
}

async function deriveTenantModules(parentTenantId: string | null): Promise<string[]> {
  if (!parentTenantId) return [...MODULE_ACTIVITY_CODES]

  const rows = (await prisma.tenant_activity_types.findMany({
    where: { tenant_id: parentTenantId, is_active: true },
    include: { business_activity_types: { select: { code: true } } },
  })) as Array<{ business_activity_types: { code: string } }>

  const derived = rows
    .map((row) => row.business_activity_types.code)
    .filter((code) => (MODULE_ACTIVITY_CODES as readonly string[]).includes(code))

  // No configured activity types → preserve the all-visible default.
  return derived.length > 0 ? derived : [...MODULE_ACTIVITY_CODES]
}

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
 * Create a fully provisioned staff user with one or more roles. Server-side only;
 * authorization is enforced by the caller (`requireAuth(token, 'users.manage')`).
 *
 * Auth user is created first, then tenant_users / user_roles / profiles are written in a
 * single transaction. If the transaction fails, the orphaned auth user is deleted
 * (compensation) so no dangling Supabase user remains. Metadata sync is display-only and
 * runs post-commit, non-fatally.
 */
export async function createUser(
  input: CreateUserInput,
  caller: CreateUserCaller
): Promise<CreateUserResult> {
  if (!input.roleIds || input.roleIds.length === 0) {
    throw new Error('At least one role is required.')
  }

  const callerTenantUser = (await prisma.tenant_users.findFirst({
    where: { auth_user_id: caller.authUserId },
    select: { parent_tenant_id: true },
  })) as { parent_tenant_id: string | null } | null
  if (!callerTenantUser) {
    throw new Error('Caller not found in tenant users.')
  }

  // Validate every role exists and is active.
  const roles = (await prisma.roles.findMany({
    where: { id: { in: input.roleIds } },
  })) as Array<{ id: string; name: string; is_active: boolean }>
  if (roles.length !== new Set(input.roleIds).size) {
    throw new Error('One or more selected roles were not found.')
  }
  const inactiveRole = roles.find((role) => !role.is_active)
  if (inactiveRole) {
    throw new Error(`Role "${inactiveRole.name}" is not active.`)
  }

  const roleNames = roles.map((role) => role.name)
  const primaryRole = getPrimaryRoleName(roleNames)

  const email = input.email.trim().toLowerCase()
  const existingTenantUser = await prisma.tenant_users.findUnique({ where: { email } })
  if (existingTenantUser) {
    throw new Error('A user with this email already exists.')
  }

  const modules = await deriveTenantModules(callerTenantUser.parent_tenant_id)
  const isOwner = roleNames.some((name) =>
    ['admin', 'super_admin'].includes(normalizeRoleName(name))
  )

  // Create the Supabase auth user first.
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: primaryRole,
        roles: roleNames,
        onboardingComplete: false,
        invitedViaRbac: true,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
      },
    })

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Failed to create user in Supabase Auth.')
  }

  const authUserId = authData.user.id

  let tenantUserId: string
  try {
    const tenantUser = await prisma.$transaction(async (tx: typeof prisma) => {
      const created = await tx.tenant_users.create({
        data: {
          auth_user_id: authUserId,
          email,
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
          phone: input.phone ?? null,
          is_active: true,
          default_role: primaryRole,
          is_restuarant_user: true,
          modules,
          primary_module: modules[0] ?? null,
          parent_tenant_id: callerTenantUser.parent_tenant_id,
          onboarding_complete: false,
        },
      })

      await tx.user_roles.createMany({
        data: roles.map((role) => ({
          tenant_user_id: created.id,
          role_id: role.id,
        })),
        skipDuplicates: true,
      })

      await tx.profiles.create({
        data: {
          auth_user_id: authUserId,
          email,
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
          phone: input.phone ?? null,
          is_owner: isOwner,
          system_owner: false,
          onboarding_complete: false,
          branch_id: input.branchId || null,
          role: primaryRole,
        },
      })

      return created
    })
    tenantUserId = tenantUser.id
  } catch (error) {
    // Compensation: remove the orphaned auth user so no dangling account remains.
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined)
    throw error
  }

  // Display-only metadata sync — non-fatal.
  await syncNewUserMetadata(authUserId, roleNames, primaryRole).catch(() => undefined)

  return { tenantUserId, authUserId, roleNames, primaryRole }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED client-invoked path — kept one release so the existing `useCreateUser`
// hook keeps compiling. New callers use `POST /api/users` → `createUser`. Remove once
// the client is migrated (Phase 4).
// ─────────────────────────────────────────────────────────────────────────────

const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().optional(),
  roleId: z.string().min(1),
  branchId: z.string().optional(),
  callerAuthUserId: z.string().min(1),
})

export type CreateUserServerInput = z.infer<typeof createUserInputSchema>

/**
 * @deprecated Bypasses the API authorization layer. Use `POST /api/users` (→ `createUser`).
 * Retained one release for the legacy client hook; performs its own admin check because it
 * is invoked directly from the client without `requireAuth`.
 */
export const createUserDirect = createServerFn({ method: 'POST' })
  .validator((data: CreateUserServerInput) => createUserInputSchema.parse(data))
  .handler(async ({ data: input }) => {
    const isAdmin = await checkAdminAccess(input.callerAuthUserId)
    if (!isAdmin) {
      throw new Error('Only admin or super_admin users can create new users')
    }

    const result = await createUser(
      {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleIds: [input.roleId],
        branchId: input.branchId,
      },
      { authUserId: input.callerAuthUserId }
    )

    return {
      success: true,
      tenantUserId: result.tenantUserId,
      authUserId: result.authUserId,
      message: 'User created successfully.',
    }
  })
