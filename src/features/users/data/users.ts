import { type User } from './schema'
import usersData from './users.json'

export const users: User[] = usersData.map((user) => ({
  clerkUserId: user.id,
  ...user,
  roleNames: [user.role],
  roleIds: [],
  createdAt: new Date(user.createdAt).toISOString(),
  updatedAt: new Date(user.updatedAt).toISOString(),
})) as User[]
