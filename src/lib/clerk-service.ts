import { createClerkClient } from '@clerk/backend'

export const clerkService = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})
