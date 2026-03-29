# API Contracts: Shifts Module

## Overview

The shifts module exposes RESTful APIs through Supabase for shift management operations. All endpoints support row-level security and multi-tenant isolation.

## Core Endpoints

### Shift Management

#### POST /shifts/open
**Purpose**: Create a new shift with opening cash

**Request**:
```typescript
interface OpenShiftRequest {
  opened_by: string        // Employee ID
  opening_cash: number     // Starting cash amount
  clerk_user_id?: string   // For multi-tenant support
  restaurant_id?: string   // For multi-tenant support
}
```

**Response**:
```typescript
interface OpenShiftResponse extends ResShift {
  // Full shift object with generated ID and timestamps
}
```

**Validation**:
- `opening_cash >= 0`
- `opened_by` must reference valid employee
- No active shift for the same clerk_user_id

**Error Codes**:
- `400`: Invalid cash amount or employee
- `409`: Active shift already exists
- `403`: Insufficient permissions

#### PUT /shifts/{id}/close
**Purpose**: Close an existing shift with final cash count

**Request**:
```typescript
interface CloseShiftRequest {
  closed_by: string        // Employee ID performing close
  closing_cash: number     // Final cash amount
  notes?: string          // Optional discrepancy notes
}
```

**Response**:
```typescript
interface CloseShiftResponse extends ResShift {
  // Updated shift with closing data
}
```

**Validation**:
- `closing_cash >= 0`
- `closed_by` must reference valid employee
- Shift must be in 'open' status
- Employee must have close permissions

**Error Codes**:
- `400`: Invalid cash amount
- `404`: Shift not found
- `409`: Shift already closed
- `403`: Insufficient permissions

#### GET /shifts
**Purpose**: Retrieve shifts with optional filtering

**Query Parameters**:
```typescript
interface ShiftQuery {
  clerk_user_id?: string   // Filter by user (admin sees all if null)
  status?: 'open' | 'closed'  // Filter by status
  limit?: number          // Pagination limit (default: 50)
  offset?: number         // Pagination offset
}
```

**Response**:
```typescript
interface ShiftListResponse {
  data: ResShift[]         // Array of shifts with employee relations
  count: number           // Total records (for pagination)
}
```

**Features**:
- Employee names included via JOINs
- Chronological ordering (newest first)
- Role-based filtering (admins see all, users see own)

#### GET /shifts/active
**Purpose**: Get current active shift for a user

**Query Parameters**:
```typescript
interface ActiveShiftQuery {
  clerk_user_id?: string   // User to check for active shift
}
```

**Response**:
```typescript
interface ActiveShiftResponse extends ResShift {
  // Current open shift or null if none
}
```

## Data Contracts

### Shift Object Schema

```typescript
interface ResShift {
  // Core fields
  id: string
  clerk_user_id?: string
  restaurant_id?: string
  opened_by: string
  closed_by?: string
  opening_cash: number
  closing_cash?: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  notes?: string

  // Relations (included in responses)
  opened_by_employee?: {
    id: string
    first_name: string
    last_name: string
  }
  closed_by_employee?: {
    id: string
    first_name: string
    last_name: string
  }
}
```

### Employee Object Schema

```typescript
interface ResEmployee {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  is_active: boolean
}
```

## Authentication & Authorization

### Authentication
- **Method**: Bearer token via Clerk
- **Required**: All endpoints require valid authentication
- **Multi-tenant**: restaurant_id scoping where applicable

### Authorization
- **Open Shift**: Requires 'shifts' permission
- **Close Shift**: Requires 'shifts' permission
- **View Shifts**: Users see own shifts, admins see all
- **Admin Operations**: Require 'admin' or 'super_admin' role

## Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  error: {
    message: string
    code: string
    details?: any
  }
}
```

### Common Error Codes
- `auth/invalid-token`: Authentication failed
- `auth/insufficient-permissions`: User lacks required permissions
- `validation/invalid-input`: Request data validation failed
- `business/active-shift-exists`: Cannot open shift when one exists
- `business/shift-not-found`: Referenced shift does not exist
- `business/shift-already-closed`: Cannot modify closed shift

## Rate Limiting

- **Open Shift**: 10 requests per minute per user
- **Close Shift**: 10 requests per minute per user
- **List Shifts**: 60 requests per minute per user
- **Active Shift**: 120 requests per minute per user

## Caching Strategy

### Client-side Caching
- **Library**: TanStack Query v5
- **TTL**: 5 minutes for shift lists, 1 minute for active shift
- **Invalidation**: Automatic on mutations

### Server-side Caching
- **Strategy**: Database query caching
- **TTL**: 30 seconds for frequently accessed data
- **Invalidation**: On shift state changes

## Monitoring & Observability

### Metrics
- **Counter**: shifts_opened_total
- **Counter**: shifts_closed_total
- **Histogram**: shift_operation_duration
- **Gauge**: active_shifts_current

### Logs
- **Level**: INFO for successful operations
- **Level**: WARN for validation errors
- **Level**: ERROR for system failures
- **Fields**: user_id, shift_id, operation_type, duration

## Testing Contracts

### Unit Tests
- Schema validation for all request/response objects
- Business rule enforcement
- Error handling scenarios
- Permission checking

### Integration Tests
- Full CRUD operations
- Multi-user scenarios
- Race condition handling
- Database consistency

### Contract Tests
- API response format verification
- Backward compatibility checks
- Performance benchmarks