import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import type { User } from '@/features/users/data/types'

function buildUserStatus(user: {
  auth_user_id: string
  is_active: boolean | null
}) {
  if (!user.is_active) {
    return 'inactive'
  }

  if (user.auth_user_id.startsWith('pending_')) {
    return 'invited'
  }

  return 'active'
}

export async function getUsers(): Promise<User[]> {
  const dbUsers = (await prisma.tenant_users.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      user_roles: {
        include: {
          roles: true,
        },
      },
    },
  })) as Array<{
    id: string
    auth_user_id: string
    email: string
    first_name: string | null
    last_name: string | null
    is_active: boolean | null
    default_role: string | null
    created_at: Date | null
    updated_at: Date | null
    user_roles: Array<{
      roles: {
        id: string
        name: string
      }
    }>
  }>

  const userIds = dbUsers.map((u) => u.auth_user_id)
  const profiles = await prisma.profiles.findMany({
    where: { auth_user_id: { in: userIds } },
    select: { auth_user_id: true, branch_id: true, phone: true } as any,
  })

  const profileMap = new Map(profiles.map((p: any) => [p.auth_user_id, p]))

  return dbUsers.map((user) => {
    const roleNames = user.user_roles.map((assignment) => assignment.roles.name)
    const roleIds = user.user_roles.map((assignment) => assignment.roles.id)
    const primaryRole = roleNames[0] ?? user.default_role ?? 'staff'
    const username = user.email.split('@')[0] ?? user.auth_user_id

    return {
      id: user.id,
      authUserId: user.auth_user_id,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      username,
      email: user.email ?? '',
      phoneNumber: (profileMap.get(user.auth_user_id) as any)?.phone ?? '',
      role: primaryRole,
      roleNames,
      roleIds,
      branchId: (profileMap.get(user.auth_user_id) as any)?.branch_id ?? undefined,
      status: buildUserStatus(user),
      createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
      updatedAt: user.updated_at?.toISOString() ?? new Date().toISOString(),
    }
  })
}

export const updateUserBranch = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; branchId: string | null }) => data)
  .handler(async ({ data: { userId, branchId } }) => {
    // Try to update existing profile
    const updated = await prisma.profiles.updateMany({
      where: { auth_user_id: userId },
      data: { branch_id: branchId, updated_at: new Date() },
    })

    // If profile didn't exist yet for this user
    if (updated.count === 0) {
      const tenantUser = await prisma.tenant_users.findUnique({
        where: { auth_user_id: userId },
      })
      if (tenantUser) {
        await prisma.profiles.create({
          data: {
            auth_user_id: userId,
            email: tenantUser.email,
            is_owner: false,
            system_owner: false,
            onboarding_complete: false,
            branch_id: branchId,
          },
        })
      }
    }

    return { success: true }
  })

export const getUserProfile = createServerFn({ method: 'GET' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data: { userId } }) => {
    const profile = await prisma.profiles.findFirst({
      where: { auth_user_id: userId },
    })
    
    return {
      success: true,
      profile,
    }
  })

export const updateUserProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string().optional(),
    })
  )
  .handler(async ({ data: { userId, firstName, lastName, phone } }) => {
    await prisma.profiles.updateMany({
      where: { auth_user_id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date(),
      },
    })
    
    await prisma.tenant_users.updateMany({
      where: { auth_user_id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date(),
      },
    })

    return { success: true }
  })

export const changeUserPassword = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string(),
      password: z.string().min(6),
    })
  )
  .handler(async ({ data: { userId, password } }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })

export const deactivateUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }) => {
    await prisma.tenant_users.updateMany({
      where: { auth_user_id: userId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    })

    return { success: true }
  })
