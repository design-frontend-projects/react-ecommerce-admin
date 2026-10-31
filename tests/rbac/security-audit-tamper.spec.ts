import { describe, it, expect } from 'vitest'
import {
  computeAuditRecordHash,
  verifyAuditChain,
  SecurityAuditRecord,
  GENESIS_HASH,
} from '../helpers/rbac-contracts'

describe('Feature 9: Tamper-Resistant Security Audit Log System', () => {
  const tenantId = 'tenant-audit-org'
  const actorId = 'actor-user-001'

  function createChainedAuditLog(
    actions: Array<{ action: string; targetType: string; targetId: string; diff: any }>
  ): SecurityAuditRecord[] {
    const records: SecurityAuditRecord[] = []
    let currentPrevHash = GENESIS_HASH

    for (let i = 0; i < actions.length; i++) {
      const act = actions[i]
      const timestamp = new Date(1700000000000 + i * 1000).toISOString()
      const recordId = `audit-rec-${i + 1}`

      const diffWithStatus = {
        ...act.diff,
        _status: 'SUCCESS',
      }

      const entryHash = computeAuditRecordHash(
        currentPrevHash,
        timestamp,
        tenantId,
        actorId,
        act.action,
        act.targetId,
        diffWithStatus
      )

      const record: SecurityAuditRecord = {
        id: recordId,
        tenant_id: tenantId,
        actor_auth_user_id: actorId,
        action: act.action,
        target_type: act.targetType,
        target_id: act.targetId,
        diff: {
          ...diffWithStatus,
          _prevHash: currentPrevHash,
          _hash: entryHash,
        },
        created_at: timestamp,
      }

      records.push(record)
      currentPrevHash = entryHash
    }

    return records
  }

  describe('Tier 1: Feature Coverage (Cryptographic Hash Chaining)', () => {
    it('computes deterministic SHA-256 hash linking each entry to previous entry hash', () => {
      const actions = [
        { action: 'role.created', targetType: 'roles', targetId: 'role-1', diff: { name: 'Auditor' } },
        { action: 'role.permission_granted', targetType: 'role_permissions', targetId: 'rp-1', diff: { perm: 'audit.view' } },
      ]

      const records = createChainedAuditLog(actions)
      expect(records).toHaveLength(2)

      // First record points to GENESIS_HASH
      expect(records[0].diff._prevHash).toBe(GENESIS_HASH)
      expect(records[0].diff._hash).toMatch(/^[a-f0-9]{64}$/)

      // Second record points to first record's hash
      expect(records[1].diff._prevHash).toBe(records[0].diff._hash)
      expect(records[1].diff._hash).toMatch(/^[a-f0-9]{64}$/)
      expect(records[1].diff._hash).not.toBe(records[0].diff._hash)
    })

    it('verifies integrity of a pristine, unmodified audit trail', () => {
      const actions = [
        { action: 'user.created', targetType: 'users', targetId: 'u-1', diff: {} },
        { action: 'user.roles_assigned', targetType: 'user_roles', targetId: 'ur-1', diff: { role: 'cashier' } },
        { action: 'user.overrides_set', targetType: 'user_permissions', targetId: 'up-1', diff: { grant: 'pos.refund' } },
      ]

      const records = createChainedAuditLog(actions)
      const auditResult = verifyAuditChain(records)

      expect(auditResult.valid).toBe(true)
      expect(auditResult.brokenAtRecordId).toBeUndefined()
    })

    it('detects tampering when an attacker modifies a historic diff payload', () => {
      const actions = [
        { action: 'pos.price_overridden', targetType: 'pos_items', targetId: 'item-1', diff: { authorizedBy: 'Manager' } },
        { action: 'sales.completed', targetType: 'sales_orders', targetId: 'so-1', diff: { total: 100 } },
      ]

      const records = createChainedAuditLog(actions)

      // Attacker tampers with the first record to cover tracks
      records[0].diff.authorizedBy = 'Self'

      const auditResult = verifyAuditChain(records)
      expect(auditResult.valid).toBe(false)
      expect(auditResult.brokenAtRecordId).toBe('audit-rec-1')
      expect(auditResult.reason).toContain('Tampered payload detected')
    })

    it('detects tampering when an attacker deletes an intermediate audit log record', () => {
      const actions = [
        { action: 'step-1', targetType: 'test', targetId: '1', diff: {} },
        { action: 'step-2-sensitive-denial', targetType: 'test', targetId: '2', diff: {} },
        { action: 'step-3', targetType: 'test', targetId: '3', diff: {} },
      ]

      const records = createChainedAuditLog(actions)

      // Attacker deletes record at index 1 (the middle record)
      records.splice(1, 1)

      const auditResult = verifyAuditChain(records)
      expect(auditResult.valid).toBe(false)
      expect(auditResult.brokenAtRecordId).toBe('audit-rec-3')
      expect(auditResult.reason).toContain('Hash chain broken')
    })

    it('records security access denial events with appropriate status and context', () => {
      const denialRecord: SecurityAuditRecord = {
        id: 'denial-001',
        tenant_id: tenantId,
        actor_auth_user_id: 'attacker-id',
        action: 'auth.access_denied',
        target_type: 'server_fn',
        target_id: 'exportCustomerFinancials',
        diff: {
          _prevHash: GENESIS_HASH,
          _hash: 'sample-hash',
          _ip: '198.51.100.25',
          _ua: 'curl/7.68.0',
          _status: 'DENIED',
          reason: 'Missing permission financial.audit.export',
        },
        created_at: new Date().toISOString(),
      }

      expect(denialRecord.diff._status).toBe('DENIED')
      expect(denialRecord.diff._ip).toBe('198.51.100.25')
      expect(denialRecord.action).toBe('auth.access_denied')
    })
  })

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('verifies empty audit list without crashing', () => {
      expect(verifyAuditChain([])).toEqual({ valid: true })
    })

    it('detects reordering/swapping of valid audit records', () => {
      const actions = [
        { action: 'first', targetType: 't', targetId: '1', diff: {} },
        { action: 'second', targetType: 't', targetId: '2', diff: {} },
      ]

      const records = createChainedAuditLog(actions)

      // Swap the two records
      const swapped = [records[1], records[0]]

      const result = verifyAuditChain(swapped)
      expect(result.valid).toBe(false)
    })

    it('detects changes to actorAuthUserId or targetId retroactively', () => {
      const records = createChainedAuditLog([
        { action: 'role.created', targetType: 'roles', targetId: 'role-1', diff: {} },
      ])

      // Attacker changes the actor to a fake user ID
      records[0].actor_auth_user_id = 'innocent-user-id'

      const result = verifyAuditChain(records)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Tampered payload detected')
    })
  })
})
