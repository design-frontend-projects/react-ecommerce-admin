import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runWithTenantContext,
  getTenantContext,
  getOptionalTenantContext,
} from '@/server/context/tenant-context'
import {
  createTenantExtendedPrisma,
  TENANT_SCOPED_MODELS,
} from '@/server/db/tenant-prisma'

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'

describe('Multi-Tenant Context (AsyncLocalStorage)', () => {
  it('throws UNAUTHORIZED_TENANT_ACCESS when called outside tenant context', () => {
    expect(() => getTenantContext()).toThrow(
      /UNAUTHORIZED_TENANT_ACCESS/i
    )
  })

  it('returns undefined for getOptionalTenantContext when outside context', () => {
    expect(getOptionalTenantContext()).toBeUndefined()
  })

  it('correctly provides tenant context inside runWithTenantContext', async () => {
    await runWithTenantContext(
      { tenantId: TENANT_A, userId: 'user-a', role: 'OWNER' },
      async () => {
        const context = getTenantContext()
        expect(context.tenantId).toBe(TENANT_A)
        expect(context.userId).toBe('user-a')
        expect(context.role).toBe('OWNER')
      }
    )
  })

  it('rejects empty or whitespace tenantId', async () => {
    await expect(
      runWithTenantContext({ tenantId: '   ' }, async () => {
        return true
      })
    ).rejects.toThrow(/valid, non-empty tenantId/i)
  })

  it('maintains strict isolation during concurrent async executions', async () => {
    const tasks = Array.from({ length: 20 }).map((_, index) => {
      const isEven = index % 2 === 0
      const targetTenant = isEven ? TENANT_A : TENANT_B
      const targetUser = isEven ? `user-a-${index}` : `user-b-${index}`

      return runWithTenantContext(
        { tenantId: targetTenant, userId: targetUser },
        async () => {
          // Add small async delay to simulate I/O concurrency
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 20))
          const current = getTenantContext()
          expect(current.tenantId).toBe(targetTenant)
          expect(current.userId).toBe(targetUser)
        }
      )
    })

    await Promise.all(tasks)
  })
})

describe('Prisma Multi-Tenant Extension ($extends)', () => {
  let mockQueryFn: ReturnType<typeof vi.fn>
  let extendedPrisma: any

  beforeEach(() => {
    mockQueryFn = vi.fn().mockImplementation(async (args) => {
      return { success: true, processedArgs: args }
    })

    // Simulate PrismaClient with $extends mechanism
    const fakeBasePrisma = {
      $extends: (extension: any) => {
        return {
          warehouses: {
            create: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'create',
                args,
                query: mockQueryFn,
              }),
            createMany: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'createMany',
                args,
                query: mockQueryFn,
              }),
            findMany: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'findMany',
                args,
                query: mockQueryFn,
              }),
            findFirst: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'findFirst',
                args,
                query: mockQueryFn,
              }),
            update: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'update',
                args,
                query: mockQueryFn,
              }),
            delete: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'warehouses',
                operation: 'delete',
                args,
                query: mockQueryFn,
              }),
          },
          inventory: {
            create: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'inventory',
                operation: 'create',
                args,
                query: mockQueryFn,
              }),
            findMany: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'inventory',
                operation: 'findMany',
                args,
                query: mockQueryFn,
              }),
          },
          currencies: {
            findMany: (args: any) =>
              extension.query.$allModels.$allOperations({
                model: 'currencies',
                operation: 'findMany',
                args,
                query: mockQueryFn,
              }),
          },
        }
      },
    } as any

    extendedPrisma = createTenantExtendedPrisma(fakeBasePrisma)
  })

  it('automatically injects tenant_id on single record create', async () => {
    await runWithTenantContext({ tenantId: TENANT_A }, async () => {
      await extendedPrisma.warehouses.create({
        data: {
          name: 'Main Logistics Center',
          code: 'WH-01',
        },
      })

      expect(mockQueryFn).toHaveBeenCalledTimes(1)
      const passedArgs = mockQueryFn.mock.calls[0][0]
      expect(passedArgs.data.tenant_id).toBe(TENANT_A)
      expect(passedArgs.data.name).toBe('Main Logistics Center')
    })
  })

  it('automatically injects tenant_id into all records on createMany', async () => {
    await runWithTenantContext({ tenantId: TENANT_A }, async () => {
      await extendedPrisma.warehouses.createMany({
        data: [
          { name: 'Bay 1', code: 'B-01' },
          { name: 'Bay 2', code: 'B-02' },
        ],
      })

      expect(mockQueryFn).toHaveBeenCalledTimes(1)
      const passedArgs = mockQueryFn.mock.calls[0][0]
      expect(passedArgs.data).toHaveLength(2)
      expect(passedArgs.data[0].tenant_id).toBe(TENANT_A)
      expect(passedArgs.data[1].tenant_id).toBe(TENANT_A)
    })
  })

  it('automatically scopes findMany queries with where: { tenant_id }', async () => {
    await runWithTenantContext({ tenantId: TENANT_A }, async () => {
      await extendedPrisma.warehouses.findMany({
        where: { is_active: true },
      })

      expect(mockQueryFn).toHaveBeenCalledTimes(1)
      const passedArgs = mockQueryFn.mock.calls[0][0]
      expect(passedArgs.where.tenant_id).toBe(TENANT_A)
      expect(passedArgs.where.is_active).toBe(true)
    })
  })

  it('automatically scopes update operations with tenant_id filter', async () => {
    await runWithTenantContext({ tenantId: TENANT_B }, async () => {
      await extendedPrisma.warehouses.update({
        where: { id: 'wh-uuid-123' },
        data: { name: 'Updated Name' },
      })

      expect(mockQueryFn).toHaveBeenCalledTimes(1)
      const passedArgs = mockQueryFn.mock.calls[0][0]
      expect(passedArgs.where.tenant_id).toBe(TENANT_B)
      expect(passedArgs.where.id).toBe('wh-uuid-123')
    })
  })

  it('does NOT inject tenant_id for non-tenant models (e.g. global currencies)', async () => {
    expect(TENANT_SCOPED_MODELS.has('currencies')).toBe(false)

    await runWithTenantContext({ tenantId: TENANT_A }, async () => {
      await extendedPrisma.currencies.findMany({
        where: { is_active: true },
      })

      expect(mockQueryFn).toHaveBeenCalledTimes(1)
      const passedArgs = mockQueryFn.mock.calls[0][0]
      expect(passedArgs.where.tenant_id).toBeUndefined()
    })
  })
})
