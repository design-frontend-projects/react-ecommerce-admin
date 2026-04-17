import prisma from '@/lib/prisma'
import { User } from '@/features/users/data/types'

/**
 * Fetches the list of all users from the database.
 * This function should only be called in a server context.
 */
export async function getUsers(): Promise<User[]> {
  try {
    const dbUsers = await prisma.tenant_users.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user_roles: {
          include: {
            res_roles: true
          }
        }
      }
    })

    return dbUsers.map((user: any) => ({
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.email.split('@')[0], // Fallback if no username exists
      email: user.email,
      phoneNumber: '', // Not in tenant_users schema
      role: user.user_roles?.[0]?.res_roles?.name || user.default_role || 'user',
      createdAt: user.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: user.updated_at?.toISOString() || new Date().toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching users from DB:', error)
    throw new Error('Failed to fetch users')
  }
}
