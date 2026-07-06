import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getPrimaryRoleName } from '@/features/users/data/rbac'
import { updateUserRoles } from './rbac'

const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  roleId: z.string().min(1),
  branchId: z.string().optional(),
  callerAuthUserId: z.string().min(1),
})

export type CreateUserServerInput = z.infer<typeof createUserInputSchema>

/**
 * Admin-only server function to create a new user directly.
 * 1. Verifies the caller has admin or super_admin role
 * 2. Creates the user in Supabase Auth
 * 3. Creates tenant_users, user_roles, and profiles records
 * 4. The new user can log in and will be redirected to /complete-account
 */
export const createUserDirect = createServerFn({ method: 'POST' })
  .validator((data: CreateUserServerInput) => createUserInputSchema.parse(data))
  .handler(async ({ data: input }) => {
    // 1. Verify caller is admin or super_admin
    const callerTenantUser = await prisma.tenant_users.findFirst({
      where: { auth_user_id: input.callerAuthUserId },
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
      },
    })

    if (!callerTenantUser) {
      throw new Error('Caller not found in tenant users')
    }

    const callerRoleNames = (
      callerTenantUser.user_roles as Array<{ roles: { name: string } }>
    ).map((ur) => ur.roles.name.toLowerCase())

    const isAdmin =
      callerRoleNames.includes('admin') ||
      callerRoleNames.includes('super_admin')

    // Also check profiles for system_owner / is_owner with role
    if (!isAdmin) {
      const callerProfile = await prisma.profiles.findFirst({
        where: { auth_user_id: input.callerAuthUserId },
      })
      const profileRole = callerProfile?.role?.toLowerCase()
      if (profileRole !== 'admin' && profileRole !== 'super_admin') {
        throw new Error('Only admin or super_admin users can create new users')
      }
    }

    // 2. Resolve the role
    const role = await prisma.roles.findUnique({
      where: { id: input.roleId },
    })

    if (!role) {
      throw new Error('Selected role was not found')
    }

    // 3. Check if email already exists
    const email = input.email.trim().toLowerCase()
    const existingTenantUser = await prisma.tenant_users.findUnique({
      where: { email },
    })

    if (existingTenantUser) {
      throw new Error('A user with this email already exists')
    }

    // 4. Create the user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          role: role.name,
          roles: [role.name],
          onboardingComplete: false,
          invitedViaRbac: true,
          firstName: input.firstName ?? '',
          lastName: input.lastName ?? '',
        },
      })

    if (authError || !authData.user) {
      throw new Error(
        authError?.message ?? 'Failed to create user in Supabase Auth'
      )
    }

    const authUserId = authData.user.id

    // 5. Create tenant_users record
    const tenantUser = await prisma.tenant_users.create({
      data: {
        auth_user_id: authUserId,
        email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        is_active: true,
        default_role: getPrimaryRoleName([role.name]),
        is_restuarant_user: true,
        modules: ['inventory', 'restaurant'],
        parent_tenant_id: callerTenantUser.parent_tenant_id,
        onboarding_complete: false,
      },
    })

    // 6. Create user_roles record
    await prisma.user_roles.create({
      data: {
        auth_user_id: tenantUser.id,
        role_id: role.id,
        auth_user_id: authUserId,
      },
    })

    // 7. Create profiles record
    await prisma.profiles.create({
      data: {
        auth_user_id: authUserId,
        email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        is_owner: false,
        system_owner: false,
        onboarding_complete: false,
        branch_id: input.branchId || null,
        role: role.name,
      },
    })

    // 8. Sync role metadata to Supabase Auth
    await updateUserRoles(tenantUser.id, [role.id], input.callerAuthUserId)

    return {
      success: true,
      tenantUserId: tenantUser.id,
      authUserId,
      message: 'User created successfully.',
    }
  })
