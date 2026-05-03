import prisma from '@/lib/prisma'
import type { User } from '@/features/users/data/types'

function buildUserStatus(user: { auth_user_id: string | null; is_active: boolean | null }) {
  if (!user.is_active) {
    return 'inactive'
  }

  if (!user.auth_user_id) {
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
    auth_user_id: string | null
    email: string | null
    phone: string | null
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

  return dbUsers.map((user) => {
    const roleNames = user.user_roles.map((assignment) => assignment.roles.name)
    const roleIds = user.user_roles.map((assignment) => assignment.roles.id)
    const primaryRole = roleNames[0] ?? user.default_role ?? 'staff'
    const username = user.email?.split('@')[0] ?? user.phone ?? user.auth_user_id ?? 'invited'

    return {
      id: user.id,
      authUserId: user.auth_user_id ?? '',
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      username,
      email: user.email ?? '',
      phoneNumber: user.phone ?? '',
      role: primaryRole,
      roleNames,
      roleIds,
      status: buildUserStatus(user),
      createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
      updatedAt: user.updated_at?.toISOString() ?? new Date().toISOString(),
    }
  })
}
