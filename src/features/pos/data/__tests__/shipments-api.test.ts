import { describe, expect, it } from 'vitest'
import {
  buildNonRestaurantShipmentNotesUpdate,
  buildNonRestaurantShipmentStatusUpdates,
  parseSerializedShipmentDetails,
  validateNonRestaurantShipmentStatus,
} from '../api'

describe('parseSerializedShipmentDetails', () => {
  it('returns parsed recipient and address details when notes contain valid JSON', () => {
    const details = parseSerializedShipmentDetails(
      JSON.stringify({
        recipientName: 'John Doe',
        recipientPhone: '+123456789',
        deliveryAddress: '123 Main St',
        city: 'Cairo',
        state: 'Cairo Governorate',
        postalCode: '11511',
        notes: 'Call on arrival',
      })
    )

    expect(details).toEqual({
      recipientName: 'John Doe',
      recipientPhone: '+123456789',
      deliveryAddress: '123 Main St',
      city: 'Cairo',
      state: 'Cairo Governorate',
      postalCode: '11511',
      notes: 'Call on arrival',
    })
  })

  it('returns null when notes are invalid JSON or empty', () => {
    expect(parseSerializedShipmentDetails(null)).toBeNull()
    expect(parseSerializedShipmentDetails('')).toBeNull()
    expect(parseSerializedShipmentDetails('not-json')).toBeNull()
  })
})

describe('buildNonRestaurantShipmentStatusUpdates', () => {
  const nowIso = '2026-04-18T10:00:00.000Z'

  it('sets shipped_date when moving to in_transit and shipped_date is missing', () => {
    const updates = buildNonRestaurantShipmentStatusUpdates({
      nextStatus: 'in_transit',
      existing: {
        shipped_date: null,
        delivered_date: null,
      },
      nowIso,
    })

    expect(updates).toEqual({
      status: 'in_transit',
      shipped_date: nowIso,
    })
  })

  it('sets delivered_date and backfills shipped_date when moving to delivered', () => {
    const updates = buildNonRestaurantShipmentStatusUpdates({
      nextStatus: 'delivered',
      existing: {
        shipped_date: null,
        delivered_date: null,
      },
      nowIso,
    })

    expect(updates).toEqual({
      status: 'delivered',
      shipped_date: nowIso,
      delivered_date: nowIso,
    })
  })

  it('does not overwrite shipped_date when already present', () => {
    const updates = buildNonRestaurantShipmentStatusUpdates({
      nextStatus: 'shipped',
      existing: {
        shipped_date: '2026-04-17T09:00:00.000Z',
        delivered_date: null,
      },
      nowIso,
    })

    expect(updates).toEqual({
      status: 'shipped',
    })
  })

  it('clears shipped and delivered dates when moving back to prepared', () => {
    const updates = buildNonRestaurantShipmentStatusUpdates({
      nextStatus: 'prepared',
      existing: {
        shipped_date: '2026-04-17T09:00:00.000Z',
        delivered_date: '2026-04-18T09:00:00.000Z',
      },
      nowIso,
    })

    expect(updates).toEqual({
      status: 'prepared',
      shipped_date: null,
      delivered_date: null,
    })
  })
})

describe('buildNonRestaurantShipmentNotesUpdate', () => {
  it('preserves serialized recipient payload while updating notes text', () => {
    const existingSerializedNotes = JSON.stringify({
      recipientName: 'Jane Doe',
      recipientPhone: '+201234567890',
      deliveryAddress: '42 Nile Corniche',
      city: 'Cairo',
      state: 'Cairo',
      postalCode: '11511',
      notes: 'Old note',
    })

    const merged = buildNonRestaurantShipmentNotesUpdate({
      existingNotes: existingSerializedNotes,
      nextNotes: 'Updated note',
    })

    expect(parseSerializedShipmentDetails(merged)).toEqual({
      recipientName: 'Jane Doe',
      recipientPhone: '+201234567890',
      deliveryAddress: '42 Nile Corniche',
      city: 'Cairo',
      state: 'Cairo',
      postalCode: '11511',
      notes: 'Updated note',
    })
  })

  it('stores plain notes when existing notes are not serialized JSON', () => {
    const merged = buildNonRestaurantShipmentNotesUpdate({
      existingNotes: 'plain-note',
      nextNotes: 'new-plain-note',
    })

    expect(merged).toBe('new-plain-note')
  })
})

describe('validateNonRestaurantShipmentStatus', () => {
  it('accepts known statuses including delayed and refundable', () => {
    expect(validateNonRestaurantShipmentStatus('delayed')).toBe('delayed')
    expect(validateNonRestaurantShipmentStatus('refundable')).toBe('refundable')
    expect(validateNonRestaurantShipmentStatus('in_transit')).toBe('in_transit')
  })

  it('rejects invalid status values', () => {
    expect(() => validateNonRestaurantShipmentStatus('unknown_state')).toThrow(
      'Invalid shipment status: unknown_state'
    )
  })
})
