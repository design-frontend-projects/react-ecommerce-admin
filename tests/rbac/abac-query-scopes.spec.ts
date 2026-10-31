import { describe, it, expect } from 'vitest'
import {
  buildScopeWhere,
  UserScopeContext,
  SENTINEL_EMPTY_UUID,
} from '../helpers/rbac-contracts'

describe('Feature 6: Query-Level ABAC Data Scope Engine', () => {
  const tenantId = 'tenant-corp-uuid'
  const tenantUserId = 'tenant-user-123'
  const authUserId = 'auth-user-123'

  describe('Tier 1: Feature Coverage (Core Data Scopes)', () => {
    it('generates TENANT scope filter scoped only by tenant_id', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-1', 'branch-2'],
        warehouseIds: ['wh-1'],
        dataScope: 'TENANT',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where).toEqual({ tenant_id: tenantId })
      expect(where.branch_id).toBeUndefined()
      expect(where.warehouse_id).toBeUndefined()
    })

    it('generates ASSIGNED_BRANCHES scope filter for single and multiple branch assignments', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-north', 'branch-south'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where.tenant_id).toBe(tenantId)
      expect(where.branch_id).toEqual({ in: ['branch-north', 'branch-south'] })
    })

    it('generates ASSIGNED_BRANCHES scope with dual-branch OR filter for stock_transfers', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-east'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('stock_transfers', ctx)
      expect(where.tenant_id).toBe(tenantId)
      expect(where.OR).toEqual([
        { from_branch_id: { in: ['branch-east'] } },
        { to_branch_id: { in: ['branch-east'] } },
      ])
    })

    it('generates ASSIGNED_WAREHOUSES scope filter for inventory and stock balance queries', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: [],
        warehouseIds: ['wh-central', 'wh-overflow'],
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('stock_balances', ctx)
      expect(where.tenant_id).toBe(tenantId)
      expect(where.warehouse_id).toEqual({ in: ['wh-central', 'wh-overflow'] })
    })

    it('generates OWN_RECORDS scope filter matching tenantUserId on requested_by or created_by', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: [],
        warehouseIds: [],
        dataScope: 'OWN_RECORDS',
        isSuperAdmin: false,
      }

      // Requisitions match requested_by_user_id
      const whereReq = buildScopeWhere('purchase_requisitions', ctx)
      expect(whereReq.tenant_id).toBe(tenantId)
      expect(whereReq.requested_by_user_id).toBe(tenantUserId)

      // Sales orders match created_by_user_id
      const whereOrder = buildScopeWhere('sales_orders', ctx)
      expect(whereOrder.tenant_id).toBe(tenantId)
      expect(whereOrder.created_by_user_id).toBe(tenantUserId)
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('produces sentinel impossible match when ASSIGNED_BRANCHES has empty branchIds array', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: [], // User has no assigned branches
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('sales_orders', ctx)
      expect(where.branch_id).toEqual({ in: [SENTINEL_EMPTY_UUID] })
      // Prevents accidental leakage of all branch orders
    })

    it('produces sentinel impossible match when ASSIGNED_WAREHOUSES has empty warehouseIds array', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: [],
        warehouseIds: [], // User has no assigned warehouses
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('goods_receipts', ctx)
      expect(where.warehouse_id).toEqual({ in: [SENTINEL_EMPTY_UUID] })
    })

    it('filters out empty or whitespace strings from branchIds and warehouseIds', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-valid', '', '  '],
        warehouseIds: ['', 'wh-valid'],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('pos_terminals', ctx)
      expect(where.branch_id).toEqual({ in: ['branch-valid'] })
    })

    it('SuperAdmin flag unconditionally bypasses sub-tenant filters for all scopes', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-restricted'],
        warehouseIds: ['wh-restricted'],
        dataScope: 'OWN_RECORDS', // Even with OWN_RECORDS or ASSIGNED_BRANCHES
        isSuperAdmin: true,
      }

      const where = buildScopeWhere('stock_balances', ctx)
      expect(where).toEqual({ tenant_id: tenantId })
      expect(where.warehouse_id).toBeUndefined()
      expect(where.created_by_user_id).toBeUndefined()
    })

    it('scopes POS terminal queries strictly to assigned branch', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: ['branch-downtown'],
        warehouseIds: [],
        dataScope: 'ASSIGNED_BRANCHES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('pos_terminals', ctx)
      expect(where.tenant_id).toBe(tenantId)
      expect(where.branch_id).toEqual({ in: ['branch-downtown'] })
    })
  })

  describe('Tier 3: Pairwise Query Execution Matrix', () => {
    it('pairwise: ASSIGNED_WAREHOUSES with stock_transfers covering both source and destination', () => {
      const ctx: UserScopeContext = {
        tenantId,
        tenantUserId,
        authUserId,
        branchIds: [],
        warehouseIds: ['wh-north'],
        dataScope: 'ASSIGNED_WAREHOUSES',
        isSuperAdmin: false,
      }

      const where = buildScopeWhere('stock_transfers', ctx)
      expect(where.tenant_id).toBe(tenantId)
      expect(where.OR).toBeDefined()
      expect(where.OR).toEqual([
        { source_warehouse_id: { in: ['wh-north'] } },
        { destination_warehouse_id: { in: ['wh-north'] } },
      ])
    })
  })
})
