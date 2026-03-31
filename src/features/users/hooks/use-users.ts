import { useQuery } from '@tanstack/react-query'
import type { User } from '../data/schema'
import { users as dummyUsers } from '../data/users'

// Placeholder for API client - replace with actual fetch call
const api = {
  getUsers: async (): Promise<User[]> => {
    // A real implementation would be: 
    // const res = await fetch('/api/users')
    // return res.json()
    console.log('Fetching users from server...')
    return new Promise((resolve) => {
      setTimeout(() => resolve(dummyUsers), 500)
    })
  }
}

export function useUsersList() {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  })
}
