import { PrismaClient } from '@prisma/client'
import { expect, test, describe } from 'vitest'

describe('Subscription Models', () => {
  const prisma = new PrismaClient()

  test('subscriptions model is defined in PrismaClient', () => {
    expect(prisma.subscriptions).toBeDefined()
  })

  test('tenant_subscriptions model is defined in PrismaClient', () => {
    expect(prisma.tenant_subscriptions).toBeDefined()
  })
})
