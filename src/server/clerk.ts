import { createClerkClient } from '@clerk/backend'

const clerkBackend = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export { clerkBackend }
