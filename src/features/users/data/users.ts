import { type User } from './schema'
import usersData from './users.json'

export const users: User[] = usersData.map((user) => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
})) as User[]
