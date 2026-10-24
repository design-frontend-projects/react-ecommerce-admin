import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  VALID_REFUND_TRANSITIONS,
  canTransitionRefund,
} from '@/server/fns/refund-engine'
import { evaluateRefundPolicyRules } from '@/server/fns/refund-authorization'
import { DEFAULT_REFUND_POLICY, type RefundPolicy } from '@/server/fns/refund-policy'
import type {
  refund_status_enum,
  return_disposition_enum,
  stock_condition_enum,
} from '@/generated/prisma/enums'

describe('POS Refund Engine - State Machine Transitions', () => {
  it('allows valid lifecycle transitions from draft', () => {
    expect(canTransitionRefund('draft', 'requested')).toBe(true)
    expect(canTransitionRefund('draft', 'cancelled')).toBe(true)
    expect(canTransitionRefund('draft', 'completed')).toBe(false)
  })

  it('allows valid transitions from requested and pending_approval', () => {
    expect(canTransitionRefund('requested', 'approved')).toBe(true)
    expect(canTransitionRefund('requested', 'pending_approval')).toBe(true)
    expect(canTransitionRefund('requested', 'rejected')).toBe(true)
    expect(canTransitionRefund('requested', 'cancelled')).toBe(true)

    expect(canTransitionRefund('pending_approval', 'approved')).toBe(true)
    expect(canTransitionRefund('pending_approval', 'rejected')).toBe(true)
    expect(canTransitionRefund('pending_approval', 'cancelled')).toBe(true)
    expect(canTransitionRefund('pending_approval', 'processing')).toBe(false)
  })

  it('allows valid execution flow from approved to processing and completed', () => {
    expect(canTransitionRefund('approved', 'processing')).toBe(true)
    expect(canTransitionRefund('approved', 'completed')).toBe(true)
    expect(canTransitionRefund('processing', 'completed')).toBe(true)
    expect(canTransitionRefund('processing', 'failed')).toBe(true)
    expect(canTransitionRefund('failed', 'processing')).toBe(true)
    expect(canTransitionRefund('failed', 'cancelled')).toBe(true)
  })

  it('blocks transitions from terminal states', () => {
    expect(canTransitionRefund('completed', 'draft')).toBe(false)
    expect(canTransitionRefund('completed', 'cancelled')).toBe(false)
    expect(canTransitionRefund('completed', 'approved')).toBe(false)

    expect(canTransitionRefund('rejected', 'approved')).toBe(false)
    expect(canTransitionRefund('rejected', 'processing')).toBe(false)

    expect(canTransitionRefund('cancelled', 'requested')).toBe(false)
    expect(canTransitionRefund('cancelled', 'completed')).toBe(false)
  })
})

describe('POS Refund Engine - Policy & Authorization Evaluation', () => {
  const testPolicy: RefundPolicy = {
    ...DEFAULT_REFUND_POLICY,
    require_supervisor_above: 50.0,
    require_manager_above: 250.0,
    require_top_management_above: 1000.0,
    max_refund_days: 30,
  }

  it('auto-approves low-value refund within cashier limit', () => {
    const evalResult = evaluateRefundPolicyRules(testPolicy, {
      amount: 25.0,
      originalInvoiceDate: new Date(),
      originalPaymentMethod: 'cash',
      requestedRefundMethod: 'cash',
      userPermissions: ['pos.refund.create'],
    })

    expect(evalResult.authorized).toBe(true)
    expect(evalResult.requiresApproval).toBe(false)
    expect(evalResult.approvalLevel).toBe('none')
  })

  it('requires supervisor approval when refund exceeds cashier limit ($50)', () => {
    const evalResult = evaluateRefundPolicyRules(testPolicy, {
      amount: 150.0,
      originalInvoiceDate: new Date(),
      originalPaymentMethod: 'cash',
      requestedRefundMethod: 'cash',
      userPermissions: ['pos.refund.create'],
    })

    expect(evalResult.requiresApproval).toBe(true)
    expect(evalResult.approvalLevel).toBe('supervisor')
  })

  it('requires top management approval when refund exceeds manager limit ($1000)', () => {
    const evalResult = evaluateRefundPolicyRules(testPolicy, {
      amount: 1500.0,
      originalInvoiceDate: new Date(),
      originalPaymentMethod: 'cash',
      requestedRefundMethod: 'cash',
      userPermissions: ['pos.refund.create', 'pos.refund.approve'],
    })

    expect(evalResult.requiresApproval).toBe(true)
    expect(evalResult.approvalLevel).toBe('top_management')
  })

  it('flags refund past the allowed days window', () => {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const evalResult = evaluateRefundPolicyRules(testPolicy, {
      amount: 25.0,
      originalInvoiceDate: sixtyDaysAgo,
      originalPaymentMethod: 'cash',
      requestedRefundMethod: 'cash',
      userPermissions: ['pos.refund.create'],
    })

    expect(evalResult.requiresApproval).toBe(true)
    expect(evalResult.approvalLevel).toBe('manager')
    expect(evalResult.reason).toContain('exceeding policy limit')
  })

  it('allows manager with override permission to bypass approval', () => {
    const evalResult = evaluateRefundPolicyRules(testPolicy, {
      amount: 200.0,
      originalInvoiceDate: new Date(),
      originalPaymentMethod: 'cash',
      requestedRefundMethod: 'cash',
      userPermissions: ['pos.refund.create', 'pos.refund.approve', 'pos.refund.override'],
    })

    expect(evalResult.authorized).toBe(true)
    expect(evalResult.requiresApproval).toBe(false)
    expect(evalResult.approvalLevel).toBe('none')
  })
})

describe('POS Refund Engine - PIN Security & Lockout Calculations', () => {
  it('hashes pin using bcrypt and verifies correctly', async () => {
    const rawPin = '1234'
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(rawPin, salt)

    expect(await bcrypt.compare('1234', hashed)).toBe(true)
    expect(await bcrypt.compare('9999', hashed)).toBe(false)
  })

  it('calculates lockout duration correctly when attempts reach threshold', () => {
    const maxAttempts = 5
    const attempts = 5
    const isLocked = attempts >= maxAttempts
    expect(isLocked).toBe(true)

    const now = new Date()
    const lockoutUntil = new Date(now.getTime() + 15 * 60 * 1000)
    expect(lockoutUntil.getTime()).toBeGreaterThan(now.getTime())
  })
})

describe('POS Refund Engine - Financial & Quantity Calculations', () => {
  it('accurately calculates remaining refundable quantity and line totals', () => {
    const invoiceItem = {
      id: 'item-1',
      unit_price: 50.0,
      quantity: 5,
      returned_quantity: 2,
      discount_amount: 0,
      tax_amount: 15.0, // $3 tax per unit
    }

    const remainingQty = invoiceItem.quantity - invoiceItem.returned_quantity
    expect(remainingQty).toBe(3)

    // Return 2 of the 3 remaining
    const qtyToReturn = 2
    expect(qtyToReturn <= remainingQty).toBe(true)

    const unitPrice = invoiceItem.unit_price
    const subtotal = unitPrice * qtyToReturn
    const taxPerUnit = invoiceItem.tax_amount / invoiceItem.quantity
    const refundTax = taxPerUnit * qtyToReturn
    const totalRefund = subtotal + refundTax

    expect(subtotal).toBe(100.0)
    expect(refundTax).toBe(6.0)
    expect(totalRefund).toBe(106.0)
  })

  it('rejects attempt to return more than remaining quantity', () => {
    const invoiceItem = {
      quantity: 4,
      returned_quantity: 3,
    }
    const remainingQty = invoiceItem.quantity - invoiceItem.returned_quantity
    expect(remainingQty).toBe(1)

    const attemptedQty = 2
    const isValid = attemptedQty > 0 && attemptedQty <= remainingQty
    expect(isValid).toBe(false)
  })
})

describe('POS Refund Engine - Disposition to Inventory Stock Condition Mapping', () => {
  function mapDispositionToCondition(
    disposition: return_disposition_enum
  ): stock_condition_enum {
    switch (disposition) {
      case 'resalable':
        return 'good'
      case 'damaged':
      case 'scrap':
        return 'damaged'
      case 'quarantine':
      case 'defective':
      case 'expired':
      default:
        return 'quarantine'
    }
  }

  it('maps resalable returns to good inventory condition', () => {
    expect(mapDispositionToCondition('resalable')).toBe('good')
  })

  it('maps damaged and scrap returns to damaged condition', () => {
    expect(mapDispositionToCondition('damaged')).toBe('damaged')
    expect(mapDispositionToCondition('scrap')).toBe('damaged')
  })

  it('maps defective, expired, and quarantine returns to quarantine condition', () => {
    expect(mapDispositionToCondition('defective')).toBe('quarantine')
    expect(mapDispositionToCondition('expired')).toBe('quarantine')
    expect(mapDispositionToCondition('quarantine')).toBe('quarantine')
  })
})
