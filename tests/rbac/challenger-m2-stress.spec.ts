/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  buildScopeWhere,
  NON_EXISTENT_UUID,
  type UserScopeContext,
} from '@/server/utils/scope-filter'
import {
  createTenantExtendedPrisma,
  TENANT_SCOPED_MODELS,
} from '@/server/db/tenant-prisma'
import { runWithTenantContext } from '@/server/context/tenant-context'

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'

describe('Challenger M2 Empirical Stress Suite', () => {
  describe('Challenge 1: ABAC Query Scopes Fail-Closed Sentinels & Tampering (src/server/utils/scope-filter)', () => {
    it('sentinel check: ASSIGNED_BRANCHES with empty array fails closed with NON_EXISTENT_UUID', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'user-1',
        authUserId: 'auth-1',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const poWhere = buildScopeWhere('purchase_orders', ctx)
      expect(poWhere.tenant_id).toBe(TENANT_A)
      expect(poWhere.branch_id).toEqual({ in: [NON_EXISTENT_UUID] })

      const soWhere = buildScopeWhere('sales_orders', ctx)
      expect(soWhere.tenant_id).toBe(TENANT_A)
      expect(soWhere.branch_id).toEqual({ in: [NON_EXISTENT_UUID] })

      const posWhere = buildScopeWhere('pos_terminals', ctx)
      expect(posWhere.tenant_id).toBe(TENANT_A)
      expect(posWhere.branch_id).toEqual({ in: [NON_EXISTENT_UUID] })

      const transferWhere = buildScopeWhere('stock_transfers', ctx)
      expect(transferWhere.tenant_id).toBe(TENANT_A)
      expect(transferWhere.OR).toEqual([
        { from_branch_id: { in: [NON_EXISTENT_UUID] } },
        { to_branch_id: { in: [NON_EXISTENT_UUID] } },
      ])
    })

    it('sentinel check: ASSIGNED_BRANCHES with whitespace/empty strings filters to sentinel', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'user-1',
        authUserId: 'auth-1',
        branchIds: ['', '   ', null as any, undefined as any],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where.branch_id).toEqual({ in: [NON_EXISTENT_UUID] })
    })

    it('sentinel check: ASSIGNED_WAREHOUSES with empty array fails closed with NON_EXISTENT_UUID', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'user-1',
        authUserId: 'auth-1',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const sbWhere = buildScopeWhere('stock_balances', ctx)
      expect(sbWhere.tenant_id).toBe(TENANT_A)
      expect(sbWhere.warehouse_id).toEqual({ in: [NON_EXISTENT_UUID] })

      const grWhere = buildScopeWhere('goods_receipts', ctx)
      expect(grWhere.tenant_id).toBe(TENANT_A)
      expect(grWhere.warehouse_id).toEqual({ in: [NON_EXISTENT_UUID] })

      const transferWhere = buildScopeWhere('stock_transfers', ctx)
      expect(transferWhere.tenant_id).toBe(TENANT_A)
      expect(transferWhere.OR).toEqual([
        { source_warehouse_id: { in: [NON_EXISTENT_UUID] } },
        { destination_warehouse_id: { in: [NON_EXISTENT_UUID] } },
      ])

      const itemWhere = buildScopeWhere('inventory_items', ctx)
      expect(itemWhere.tenant_id).toBe(TENANT_A)
      expect(itemWhere.stock_balances).toEqual({
        some: {
          warehouse_id: { in: [NON_EXISTENT_UUID] },
        },
      })
    })

    it('sentinel check: OWN_RECORDS with empty user IDs fails closed with NON_EXISTENT_UUID', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: '',
        authUserId: '   ',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'OWN_RECORDS',
        isSuperAdmin: false,
      }

      const reqWhere = buildScopeWhere('purchase_requisitions', ctx)
      expect(reqWhere.tenant_id).toBe(TENANT_A)
      expect(reqWhere.OR).toEqual([
        { created_by_user_id: NON_EXISTENT_UUID },
        { requested_by: NON_EXISTENT_UUID },
      ])

      const orderWhere = buildScopeWhere('sales_orders', ctx)
      expect(orderWhere.tenant_id).toBe(TENANT_A)
      expect(orderWhere.created_by_user_id).toBe(NON_EXISTENT_UUID)
    })

    it('security assertion: buildScopeWhere rejects empty or missing tenantId', () => {
      const ctxMissing: UserScopeContext = {
        tenantId: '',
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'TENANT',
        isSuperAdmin: false,
      }

      expect(() => buildScopeWhere('products', ctxMissing)).toThrow(
        /UserScopeContext requires a valid, non-empty tenantId/i
      )
    })

    it('tampering resilience: mergeWhere neutralizes attacker-supplied tenant_id in existingWhere', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: ['b-1'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      // Attacker attempts to query Tenant B's data
      const maliciousExistingWhere = {
        tenant_id: TENANT_B,
        status: 'completed',
      }

      const merged = buildScopeWhere('sales_orders', ctx, maliciousExistingWhere)
      // Must be forced to TENANT_A
      expect(merged.tenant_id).toBe(TENANT_A)
      expect(merged.status).toBe('completed')
      expect(merged.branch_id).toEqual({ in: ['b-1'] })
    })

    it('tampering resilience: mergeWhere wraps attacker-supplied OR clause in AND', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: ['b-1'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      // Attacker attempts to bypass tenant boundary using top-level OR
      const maliciousExistingWhere = {
        OR: [{ tenant_id: TENANT_B }, { name: 'Target Item' }],
      }

      const merged = buildScopeWhere('sales_orders', ctx, maliciousExistingWhere)
      expect(merged.AND).toBeDefined()
      expect(Array.isArray(merged.AND)).toBe(true)
      const andList = merged.AND as any[]
      expect(andList[0]).toEqual(maliciousExistingWhere)
      expect(andList[1]).toEqual({
        tenant_id: TENANT_A,
        branch_id: { in: ['b-1'] },
      })
    })

    it('tampering resilience: mergeWhere detects conflicting branch_id and wraps in AND', () => {
      const ctx: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: ['branch-allowed'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      // Attacker specifies branch they are not assigned to
      const maliciousExistingWhere = {
        branch_id: 'branch-forbidden',
      }

      const merged = buildScopeWhere('sales_orders', ctx, maliciousExistingWhere)
      expect(merged.AND).toBeDefined()
      expect(merged.AND).toEqual([
        { branch_id: 'branch-forbidden' },
        { tenant_id: TENANT_A, branch_id: { in: ['branch-allowed'] } },
      ])
    })

    it('security assertion: buildScopeWhere enforces Default DENY on unrecognized dataScope', () => {
      const invalidScopes = ['DEPARTMENT', 'RESTRICTED', 'UNKNOWN', 'INVALID_SCOPE', '', '   ']

      for (const badScope of invalidScopes) {
        const ctx: UserScopeContext = {
          tenantId: TENANT_A,
          tenantUserId: 'u-1',
          authUserId: 'a-1',
          branchIds: [],
          warehouseIds: [],
          dataScope: badScope as any,
          isSuperAdmin: false,
        }

        expect(() => buildScopeWhere('sales_orders', ctx)).toThrow(
          /UNSUPPORTED_DATA_SCOPE: Unrecognized dataScope '.*'\. Default DENY enforced\./
        )
      }
    })

    it('security assertion: buildScopeWhere enforces Default DENY when dataScope is undefined or null', () => {
      const ctxUndefined: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: [],
        warehouseIds: [],
        dataScope: undefined as any,
        isSuperAdmin: false,
      }

      expect(() => buildScopeWhere('sales_orders', ctxUndefined)).toThrow(
        /UNSUPPORTED_DATA_SCOPE: Unrecognized dataScope 'undefined'\. Default DENY enforced\./
      )
    })

    it('security assertion: SuperAdmin retains tenant visibility even if dataScope is unrecognized', () => {
      const ctxSuper: UserScopeContext = {
        tenantId: TENANT_A,
        tenantUserId: 'u-1',
        authUserId: 'a-1',
        branchIds: [],
        warehouseIds: [],
        dataScope: 'UNRECOGNIZED_SCOPE' as any,
        isSuperAdmin: true,
      }

      const where = buildScopeWhere('sales_orders', ctxSuper)
      expect(where).toEqual({ tenant_id: TENANT_A })
    })
  })

  describe('Challenge 2: Parameter Tampering & IDOR Protections (src/server/db/tenant-prisma)', () => {
    let mockQueryFn: ReturnType<typeof vi.fn>
    let mockFindFirstFn: ReturnType<typeof vi.fn>
    let mockFindFirstOrThrowFn: ReturnType<typeof vi.fn>
    let extendedPrisma: any

    beforeEach(() => {
      mockQueryFn = vi.fn().mockImplementation(async (args) => {
        return { success: true, processedArgs: args }
      })
      mockFindFirstFn = vi.fn().mockImplementation(async (args) => {
        return { id: args?.where?.id ?? 'record-1', ...args?.where }
      })
      mockFindFirstOrThrowFn = vi.fn().mockImplementation(async (args) => {
        return { id: args?.where?.id ?? 'record-1', ...args?.where }
      })

      const makeModelDelegate = (_modelName: string) => ({
        findFirst: (args: any) => mockFindFirstFn(args),
        findFirstOrThrow: (args: any) => mockFindFirstOrThrowFn(args),
      })

      const fakeBasePrisma: any = {
        products: makeModelDelegate('products'),
        product_variants: makeModelDelegate('product_variants'),
        warehouses: makeModelDelegate('warehouses'),
        sales_orders: makeModelDelegate('sales_orders'),
        tenant_users: makeModelDelegate('tenant_users'),
        roles: makeModelDelegate('roles'),
        $extends: (extension: any) => {
          const handler = extension.query.$allModels.$allOperations

          const makeExtendedDelegate = (modelName: string) => ({
            create: (args: any) =>
              handler({ model: modelName, operation: 'create', args, query: mockQueryFn }),
            createMany: (args: any) =>
              handler({ model: modelName, operation: 'createMany', args, query: mockQueryFn }),
            upsert: (args: any) =>
              handler({ model: modelName, operation: 'upsert', args, query: mockQueryFn }),
            findMany: (args: any) =>
              handler({ model: modelName, operation: 'findMany', args, query: mockQueryFn }),
            findFirst: (args: any) => mockFindFirstFn(args),
            findFirstOrThrow: (args: any) => mockFindFirstOrThrowFn(args),
            findUnique: (args: any) =>
              handler({ model: modelName, operation: 'findUnique', args, query: mockQueryFn }),
            findUniqueOrThrow: (args: any) =>
              handler({ model: modelName, operation: 'findUniqueOrThrow', args, query: mockQueryFn }),
            update: (args: any) =>
              handler({ model: modelName, operation: 'update', args, query: mockQueryFn }),
            delete: (args: any) =>
              handler({ model: modelName, operation: 'delete', args, query: mockQueryFn }),
          })

          const client: any = {
            products: makeExtendedDelegate('products'),
            product_variants: makeExtendedDelegate('product_variants'),
            warehouses: makeExtendedDelegate('warehouses'),
            sales_orders: makeExtendedDelegate('sales_orders'),
            tenant_users: makeExtendedDelegate('tenant_users'),
            roles: makeExtendedDelegate('roles'),
          }

          return client
        },
      }

      extendedPrisma = createTenantExtendedPrisma(fakeBasePrisma)
    })

    it('tampering on create: unconditionally overwrites client-supplied tenant_id with active context', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.products.create({
          data: {
            name: 'Injected Product',
            tenant_id: TENANT_B, // Tampered tenant ID!
          },
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]
        expect(passedArgs.data.tenant_id).toBe(TENANT_A)
        expect(passedArgs.data.tenant_id).not.toBe(TENANT_B)
      })
    })

    it('tampering on createMany: unconditionally overwrites client-supplied tenant_id in all items', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.products.createMany({
          data: [
            { name: 'Item 1', tenant_id: TENANT_B },
            { name: 'Item 2', tenant_id: '99999999-9999-9999-9999-999999999999' },
          ],
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]
        expect(passedArgs.data[0].tenant_id).toBe(TENANT_A)
        expect(passedArgs.data[1].tenant_id).toBe(TENANT_A)
      })
    })

    it('tampering on upsert: injects active tenant_id into create block', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.products.upsert({
          where: { id: 'prod-1' },
          create: { name: 'Upserted Product', tenant_id: TENANT_B },
          update: { name: 'Updated' },
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]
        expect(passedArgs.create.tenant_id).toBe(TENANT_A)
      })
    })

    it('tampering on findMany: active tenant_id overwrites tampered where.tenant_id', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.sales_orders.findMany({
          where: {
            tenant_id: TENANT_B, // Attacker tries to query tenant B
            status: 'pending',
          },
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]
        expect(passedArgs.where.tenant_id).toBe(TENANT_A)
        expect(passedArgs.where.status).toBe('pending')
      })
    })

    it('IDOR defense: update throws P2025 if target record does not belong to active tenant', async () => {
      // Mock findFirst returning null (record belongs to another tenant or does not exist)
      mockFindFirstFn.mockResolvedValueOnce(null)

      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await expect(
          extendedPrisma.warehouses.update({
            where: { id: 'wh-in-tenant-b' },
            data: { name: 'Hacked Warehouse' },
          })
        ).rejects.toThrow(/P2025: Record to update in model 'warehouses' does not exist or does not belong to the active tenant/i)
      })
    })

    it('IDOR defense: delete throws P2025 if target record does not belong to active tenant', async () => {
      // Mock findFirst returning null
      mockFindFirstFn.mockResolvedValueOnce(null)

      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await expect(
          extendedPrisma.warehouses.delete({
            where: { id: 'wh-in-tenant-b' },
          })
        ).rejects.toThrow(/P2025: Record to delete in model 'warehouses' does not exist or does not belong to the active tenant/i)
      })
    })

    it('findUnique safe rewrite: rewrites to findFirst with tenant_id for models without composite unique', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.products.findUnique({
          where: { id: 'prod-uuid' },
        })

        expect(mockFindFirstFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockFindFirstFn.mock.calls[0][0]
        expect(passedArgs.where.id).toBe('prod-uuid')
        expect(passedArgs.where.tenant_id).toBe(TENANT_A)
      })
    })

    it('critical adversarial defense: tenant_users strips tampered where.tenant_id and enforces active tenant hierarchy', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.tenant_users.findMany({
          where: {
            tenant_id: TENANT_B, // Tampered tenant_id!
          },
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]

        // Verified secure behavior:
        // Client-supplied tenant_id is stripped; activeTenantId hierarchy is enforced via OR
        expect(passedArgs.where.tenant_id).toBeUndefined()
        expect(passedArgs.where.OR).toEqual([
          { tenant_id: TENANT_A },
          { parent_tenant_id: TENANT_A },
        ])
      })
    })

    it('critical adversarial defense: tenant_users conjoins caller where.OR with mandatory tenant filter via AND', async () => {
      await runWithTenantContext({ tenantId: TENANT_A }, async () => {
        await extendedPrisma.tenant_users.findMany({
          where: {
            OR: [{ email: 'admin@other.com' }],
          },
        })

        expect(mockQueryFn).toHaveBeenCalledTimes(1)
        const passedArgs = mockQueryFn.mock.calls[0][0]

        // Verified secure behavior:
        // Caller OR is preserved and safely conjoined with tenant hierarchy filter via AND
        expect(passedArgs.where.AND).toEqual([
          { OR: [{ email: 'admin@other.com' }] },
          {
            OR: [
              { tenant_id: TENANT_A },
              { parent_tenant_id: TENANT_A },
            ],
          },
        ])
      })
    })
  })

  describe('Challenge 3: Multi-Tenant Model Coverage Analysis', () => {
    it('empirically extracts Prisma schema models and checks TENANT_SCOPED_MODELS coverage', () => {
      const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma')
      expect(fs.existsSync(schemaPath)).toBe(true)

      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      const modelRegex = /model\s+([a-zA-Z0-9_]+)\s+{([^}]+)}/g
      let match: RegExpExecArray | null

      const allModelsWithTenantId: string[] = []
      const allGlobalModels: string[] = []

      while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1]
        const modelBody = match[2]
        if (modelBody.includes('tenant_id')) {
          allModelsWithTenantId.push(modelName.toLowerCase())
        } else {
          allGlobalModels.push(modelName.toLowerCase())
        }
      }

      expect(allModelsWithTenantId.length).toBeGreaterThan(50)

      // Find models in schema with tenant_id that are NOT in TENANT_SCOPED_MODELS
      const missingFromScopedModels = allModelsWithTenantId.filter(
        (m) => !TENANT_SCOPED_MODELS.has(m)
      )

      // Expected intentional omissions from TENANT_SCOPED_MODELS:
      // - 'tenants': the tenant entity itself (each tenant has tenant_id or id)
      // - 'roles': contains system-wide roles (tenant_id = null) queried across tenants
      // - 'permissions': global permission registry
      // - 'app_modules', 'app_screens': global app definitions
      // - 'tenant_subscriptions', 'tenant_subscription_usage', 'subscription_invoices': platform billing
      // - 'rbac_audit': legacy audit log
      // - 'tenant_activity_types': business activity mapping
      // - 'lookup_values': system/tenant lookup values
      // - 'inventory_transaction_types': system/tenant transaction types
      const platformOrHybridOmissions = new Set([
        'tenants',
        'roles',
        'permissions',
        'app_modules',
        'app_screens',
        'tenant_subscriptions',
        'tenant_subscription_usage',
        'subscription_invoices',
        'rbac_audit',
        'tenant_activity_types',
        'lookup_values',
        'inventory_transaction_types',
      ])

      // Business ERP models with tenant_id that SHOULD be scoped:
      // All business ERP models ('uoms', 'promotion_menu_scopes', 'tenant_activity_types')
      // are now correctly registered in TENANT_SCOPED_MODELS.
      const unhandledBusinessOmissions = missingFromScopedModels.filter(
        (m) => !platformOrHybridOmissions.has(m)
      )

      // Empirically assert that 0 unhandled business omissions remain
      expect(unhandledBusinessOmissions).toEqual([])
      expect(TENANT_SCOPED_MODELS.has('uoms')).toBe(true)
      expect(TENANT_SCOPED_MODELS.has('promotion_menu_scopes')).toBe(true)
      expect(TENANT_SCOPED_MODELS.has('tenant_activity_types')).toBe(true)
    })

    it('verifies all major ERP domain models are included in TENANT_SCOPED_MODELS', () => {
      const keyModels = [
        'products',
        'product_variants',
        'categories',
        'warehouses',
        'branches',
        'stores',
        'inventory_items',
        'stock_balances',
        'stock_transfers',
        'purchase_orders',
        'purchase_requisitions',
        'sales_orders',
        'sales_invoices',
        'pos_terminals',
        'customers',
        'suppliers',
        'approval_requests',
        'security_audit_logs',
      ]

      for (const model of keyModels) {
        expect(
          TENANT_SCOPED_MODELS.has(model),
          `Expected model '${model}' to be included in TENANT_SCOPED_MODELS`
        ).toBe(true)
      }
    })
  })
})
