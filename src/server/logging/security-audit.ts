import { createHash, randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import type { security_audit_logsModel } from '@/generated/prisma/models/security_audit_logs'

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────────────────────

export type security_audit_logs = security_audit_logsModel

/** Standard 64-zero SHA-256 hash used as the prev_record_hash for genesis records */
export const GENESIS_PREV_HASH = '0'.repeat(64)

export interface SecurityAuditInput {
  tenantId?: string | null
  actorAuthUserId?: string | null
  actorTenantUserId?: string | null
  actorEmail?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  status?: 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING' | string
  severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | string
  dataScope?: string | null
  diff?: unknown
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  route?: string | null
}

export interface CanonicalAuditPayload {
  id: string
  tenant_id: string | null
  actor_auth_user_id: string | null
  actor_tenant_user_id: string | null
  actor_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  status: string
  severity: string
  data_scope: string | null
  diff: unknown
  metadata: unknown
  ip_address: string | null
  user_agent: string | null
  route: string | null
  prev_record_hash: string
  created_at: string // ISO 8601 UTC timestamp
}

export type IntegrityErrorType =
  | 'INVALID_GENESIS'
  | 'BROKEN_CHAIN'
  | 'HASH_MISMATCH'
  | 'TIMESTAMP_OUT_OF_ORDER'

export interface IntegrityError {
  recordId: string
  sequenceIndex: number
  errorType: IntegrityErrorType
  message: string
  expected?: string
  actual?: string
}

export interface IntegrityVerificationResult {
  isValid: boolean
  totalRecords: number
  verifiedRecords: number
  tamperedRecords: number
  errors: IntegrityError[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical JSON & Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministically serialize any JavaScript value to JSON with recursively sorted object keys.
 */
export function canonicalJsonStringify(val: unknown): string {
  if (val === null || val === undefined) {
    return 'null'
  }
  if (val instanceof Date) {
    return JSON.stringify(val.toISOString())
  }
  if (typeof val === 'object' && typeof (val as { toJSON?: unknown }).toJSON === 'function') {
    return canonicalJsonStringify((val as { toJSON: () => unknown }).toJSON())
  }
  if (typeof val !== 'object') {
    return JSON.stringify(val)
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJsonStringify).join(',') + ']'
  }
  const obj = val as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const entries: string[] = []
  for (const k of sortedKeys) {
    if (obj[k] !== undefined) {
      entries.push(`${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`)
    }
  }
  return '{' + entries.join(',') + '}'
}

/**
 * Checks whether a hash is considered a valid genesis antecedent.
 */
export function isGenesisHash(hash?: string | null): boolean {
  if (!hash) return true
  if (hash === GENESIS_PREV_HASH) return true
  if (hash === 'GENESIS') return true
  if (hash === 'GENESIS_HASH_0000000000000000') return true
  return false
}

/**
 * Normalizes a database row or input record into the strictly typed CanonicalAuditPayload.
 */
export function toCanonicalPayload(record: {
  id: string
  tenant_id?: string | null
  actor_auth_user_id?: string | null
  actor_tenant_user_id?: string | null
  actor_email?: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  status?: string
  severity?: string
  data_scope?: string | null
  diff?: unknown
  metadata?: unknown
  ip_address?: string | null
  user_agent?: string | null
  route?: string | null
  prev_record_hash?: string | null
  created_at: Date | string
}): CanonicalAuditPayload {
  return {
    id: record.id,
    tenant_id: record.tenant_id ?? null,
    actor_auth_user_id: record.actor_auth_user_id ?? null,
    actor_tenant_user_id: record.actor_tenant_user_id ?? null,
    actor_email: record.actor_email ?? null,
    action: record.action,
    resource_type: record.resource_type,
    resource_id: record.resource_id ?? null,
    status: record.status ?? 'SUCCESS',
    severity: record.severity ?? 'INFO',
    data_scope: record.data_scope ?? null,
    diff: record.diff ?? null,
    metadata: record.metadata ?? {},
    ip_address: record.ip_address ?? null,
    user_agent: record.user_agent ?? null,
    route: record.route ?? null,
    prev_record_hash: record.prev_record_hash ?? GENESIS_PREV_HASH,
    created_at:
      record.created_at instanceof Date
        ? record.created_at.toISOString()
        : new Date(record.created_at).toISOString(),
  }
}

/**
 * Computes the cryptographic SHA-256 hash of an audit record.
 */
export function computeRecordHash(
  payloadOrRecord: CanonicalAuditPayload | Parameters<typeof toCanonicalPayload>[0]
): string {
  const canonical =
    'action' in payloadOrRecord &&
    'resource_type' in payloadOrRecord &&
    !(
      'prev_record_hash' in payloadOrRecord &&
      typeof (payloadOrRecord as Record<string, unknown>).created_at === 'string' &&
      typeof (payloadOrRecord as Record<string, unknown>).prev_record_hash === 'string'
    )
      ? toCanonicalPayload(payloadOrRecord as Parameters<typeof toCanonicalPayload>[0])
      : (payloadOrRecord as CanonicalAuditPayload)
  const canonicalString = canonicalJsonStringify(canonical)
  return createHash('sha256').update(canonicalString, 'utf8').digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency Control: Per-Tenant Async Mutex
// ─────────────────────────────────────────────────────────────────────────────

class TenantMutex {
  private queues = new Map<string, Promise<unknown>>()

  async runExclusive<T>(tenantKey: string, fn: () => Promise<T>): Promise<T> {
    const current = this.queues.get(tenantKey) ?? Promise.resolve()
    let resolveNext!: () => void
    const next = new Promise<void>((resolve) => {
      resolveNext = resolve
    })

    this.queues.set(tenantKey, next)

    try {
      await current
      return await fn()
    } finally {
      resolveNext()
      if (this.queues.get(tenantKey) === next) {
        this.queues.delete(tenantKey)
      }
    }
  }
}

const auditMutex = new TenantMutex()

// ─────────────────────────────────────────────────────────────────────────────
// Core Logging Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appends a tamper-resistant security audit log entry using cryptographic SHA-256 hash chaining.
 */
export async function logSecurityEvent(
  input: SecurityAuditInput,
  txClient?: Prisma.TransactionClient
): Promise<security_audit_logs> {
  const tenantKey = input.tenantId ?? '__GLOBAL__'

  return auditMutex.runExclusive(tenantKey, async () => {
    const executeInTx = async (tx: Prisma.TransactionClient) => {
      // Optional DB-level advisory lock for multi-instance deployments
      try {
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          `sec_audit:${tenantKey}`
        )
      } catch {
        // Fallback: in-memory mutex provides concurrency safety for single instance / Vitest
      }

      // Fetch the latest record in this tenant's chain
      const latest = await tx.security_audit_logs.findFirst({
        where: input.tenantId ? { tenant_id: input.tenantId } : { tenant_id: null },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: { id: true, record_hash: true, created_at: true },
      })

      const prevRecordHash = latest?.record_hash ?? GENESIS_PREV_HASH

      // Ensure strictly monotonic timestamp to prevent order ambiguity
      let createdAt = new Date()
      if (latest && latest.created_at && createdAt.getTime() <= latest.created_at.getTime()) {
        createdAt = new Date(latest.created_at.getTime() + 1)
      }

      const id = randomUUID()
      const canonical = toCanonicalPayload({
        id,
        tenant_id: input.tenantId ?? null,
        actor_auth_user_id: input.actorAuthUserId ?? null,
        actor_tenant_user_id: input.actorTenantUserId ?? null,
        actor_email: input.actorEmail ?? null,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId ?? null,
        status: input.status ?? 'SUCCESS',
        severity: input.severity ?? 'INFO',
        data_scope: input.dataScope ?? null,
        diff: input.diff ?? null,
        metadata: input.metadata ?? {},
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        route: input.route ?? null,
        prev_record_hash: prevRecordHash,
        created_at: createdAt,
      })

      const recordHash = computeRecordHash(canonical)

      return tx.security_audit_logs.create({
        data: {
          id,
          tenant_id: input.tenantId ?? null,
          actor_auth_user_id: input.actorAuthUserId ?? null,
          actor_tenant_user_id: input.actorTenantUserId ?? null,
          actor_email: input.actorEmail ?? null,
          action: input.action,
          resource_type: input.resourceType,
          resource_id: input.resourceId ?? null,
          status: input.status ?? 'SUCCESS',
          severity: input.severity ?? 'INFO',
          data_scope: input.dataScope ?? null,
          diff: input.diff === undefined ? undefined : (input.diff as object),
          metadata: input.metadata === undefined ? {} : (input.metadata as object),
          ip_address: input.ipAddress ?? null,
          user_agent: input.userAgent ?? null,
          route: input.route ?? null,
          prev_record_hash: prevRecordHash,
          record_hash: recordHash,
          created_at: createdAt,
        },
      })
    }

    if (txClient) {
      return executeInTx(txClient)
    }

    return prisma.$transaction((tx) => executeInTx(tx))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain Integrity Verification Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sequentially verifies the cryptographic hash chain of audit logs for a tenant.
 * Detects modified contents, deleted records, inserted records, and broken links.
 */
export async function verifyAuditLogIntegrity(
  tenantId?: string | null
): Promise<IntegrityVerificationResult> {
  const where = tenantId !== undefined ? { tenant_id: tenantId } : {}
  const records = await prisma.security_audit_logs.findMany({
    where,
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  })

  const errors: IntegrityError[] = []
  let previousHash: string | null = null
  let previousTime: number | null = null

  for (let i = 0; i < records.length; i++) {
    const record = records[i]

    // 1. Genesis check for the first entry
    if (i === 0) {
      if (!isGenesisHash(record.prev_record_hash)) {
        errors.push({
          recordId: record.id,
          sequenceIndex: i,
          errorType: 'INVALID_GENESIS',
          message: `Genesis record ${record.id} has invalid prev_record_hash: expected genesis hash but found ${record.prev_record_hash}`,
          expected: GENESIS_PREV_HASH,
          actual: record.prev_record_hash ?? 'null',
        })
      }
    } else {
      // 2. Chain link verification (prev_record_hash must match predecessor record_hash)
      if (record.prev_record_hash !== previousHash) {
        errors.push({
          recordId: record.id,
          sequenceIndex: i,
          errorType: 'BROKEN_CHAIN',
          message: `Broken chain link at record ${record.id} (index ${i}): prev_record_hash (${record.prev_record_hash}) does not match previous record_hash (${previousHash})`,
          expected: previousHash ?? undefined,
          actual: record.prev_record_hash ?? undefined,
        })
      }

      // 3. Monotonic timestamp verification
      if (record.created_at) {
        const currentTime = new Date(record.created_at).getTime()
        if (previousTime !== null && currentTime < previousTime) {
          errors.push({
            recordId: record.id,
            sequenceIndex: i,
            errorType: 'TIMESTAMP_OUT_OF_ORDER',
            message: `Record ${record.id} timestamp (${new Date(record.created_at).toISOString()}) is earlier than predecessor timestamp (${new Date(previousTime).toISOString()})`,
          })
        }
      }
    }

    // 4. Content Integrity Verification (recompute hash over row contents)
    const expectedHash = computeRecordHash(record as Parameters<typeof toCanonicalPayload>[0])
    if (expectedHash !== record.record_hash) {
      errors.push({
        recordId: record.id,
        sequenceIndex: i,
        errorType: 'HASH_MISMATCH',
        message: `Tampered content in record ${record.id}: stored hash (${record.record_hash}) does not match recomputed hash (${expectedHash})`,
        expected: expectedHash,
        actual: record.record_hash ?? undefined,
      })
    }

    previousHash = record.record_hash
    if (record.created_at) {
      previousTime = new Date(record.created_at).getTime()
    }
  }

  const tamperedRecords = new Set(errors.map((e) => e.recordId)).size
  return {
    isValid: errors.length === 0,
    totalRecords: records.length,
    verifiedRecords: records.length - tamperedRecords,
    tamperedRecords,
    errors,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Domain Logging Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log unauthorized access, denied permissions, tenant mismatch, or blocked user access.
 */
export async function logAccessDenied(params: {
  tenantId?: string | null
  actorAuthUserId?: string | null
  actorTenantUserId?: string | null
  actorEmail?: string | null
  resourceType: string
  resourceId?: string | null
  action?: string
  requiredPermission?: string
  reason?: string
  ipAddress?: string | null
  userAgent?: string | null
  route?: string | null
  metadata?: Record<string, unknown>
}): Promise<security_audit_logs> {
  return logSecurityEvent({
    tenantId: params.tenantId ?? null,
    actorAuthUserId: params.actorAuthUserId ?? null,
    actorTenantUserId: params.actorTenantUserId ?? null,
    actorEmail: params.actorEmail ?? null,
    action: params.action ?? 'auth.access_denied',
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    status: 'DENIED',
    severity: 'WARN',
    route: params.route ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    metadata: {
      requiredPermission: params.requiredPermission,
      reason: params.reason,
      ...params.metadata,
    },
  })
}

/**
 * Log approval workflow decisions, amount threshold triggers, and anti-self-approval violations.
 */
export async function logApprovalEvent(params: {
  action:
    | 'approval.requested'
    | 'approval.approved'
    | 'approval.rejected'
    | 'approval.cancelled'
    | 'approval.anti_self_approval_violation'
  tenantId: string
  actorAuthUserId: string
  requestId: string
  documentType: string
  amount?: number | null
  rejectionReason?: string
  metadata?: Record<string, unknown>
}): Promise<security_audit_logs> {
  const isViolation = params.action === 'approval.anti_self_approval_violation'
  return logSecurityEvent({
    tenantId: params.tenantId,
    actorAuthUserId: params.actorAuthUserId,
    action: params.action,
    resourceType: 'approval_request',
    resourceId: params.requestId,
    status: isViolation ? 'DENIED' : 'SUCCESS',
    severity: isViolation ? 'ERROR' : 'INFO',
    diff: {
      documentType: params.documentType,
      amount: params.amount,
      rejectionReason: params.rejectionReason,
    },
    metadata: params.metadata,
  })
}

/**
 * Log role lifecycle mutations (creation, updates, deletion).
 */
export async function logRoleMutation(params: {
  action: 'role.create' | 'role.update' | 'role.delete'
  tenantId?: string | null
  actorAuthUserId?: string | null
  roleId: string
  roleName: string
  diff?: unknown
  metadata?: Record<string, unknown>
}): Promise<security_audit_logs> {
  return logSecurityEvent({
    tenantId: params.tenantId ?? null,
    actorAuthUserId: params.actorAuthUserId ?? null,
    action: params.action,
    resourceType: 'role',
    resourceId: params.roleId,
    status: 'SUCCESS',
    severity: 'INFO',
    diff: params.diff,
    metadata: {
      roleName: params.roleName,
      ...params.metadata,
    },
  })
}

/**
 * Log sensitive data operations (cost/margin viewing, bulk CSV exports, data imports).
 */
export async function logSensitiveOperation(params: {
  action: 'sensitive_data.view_cost' | 'data.export' | 'data.import'
  tenantId?: string | null
  actorAuthUserId?: string | null
  resourceType: string
  resourceId?: string | null
  sensitiveFields?: string[]
  recordCount?: number
  metadata?: Record<string, unknown>
}): Promise<security_audit_logs> {
  return logSecurityEvent({
    tenantId: params.tenantId ?? null,
    actorAuthUserId: params.actorAuthUserId ?? null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    status: 'SUCCESS',
    severity: 'INFO',
    metadata: {
      sensitiveFields: params.sensitiveFields,
      recordCount: params.recordCount,
      ...params.metadata,
    },
  })
}
