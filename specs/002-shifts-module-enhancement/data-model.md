# Data Model: Shifts Module Enhancement

## Overview

The shifts module manages cash register shift operations in a restaurant POS system. Shifts track opening and closing cash amounts, employee assignments, and provide audit trails for financial accountability.

## Core Entities

### Shift Entity

**Purpose**: Represents a cash register shift period with financial tracking

**Attributes**:
```typescript
interface res_shifts {
  id: string                    // Primary key (UUID)
  clerk_user_id?: string        // Clerk authentication ID (optional for multi-tenant)
  restaurant_id?: string        // Multi-tenant support
  opened_by: string            // Employee ID who opened the shift
  closed_by?: string           // Employee ID who closed the shift
  opening_cash: number         // Starting cash amount (decimal 10,2)
  closing_cash?: number        // Ending cash amount (decimal 10,2)
  status: 'open' | 'closed'    // Shift state
  opened_at: string           // ISO timestamp when opened
  closed_at?: string          // ISO timestamp when closed
  notes?: string              // Optional notes about discrepancies

  // Relations (added for enhancement)
  opened_by_employee?: ResEmployee
  closed_by_employee?: ResEmployee
}
```

**Business Rules**:
- `opening_cash` must be >= 0
- `closing_cash` must be >= 0 when status = 'closed'
- Only one open shift per clerk_user_id at a time
- `closed_at` automatically set when status changes to 'closed'

**State Transitions**:
```
NEW → OPEN (insert with status='open')
OPEN → CLOSED (update with closing_cash, closed_at)
CLOSED → (terminal state)
```

**Validation Rules**:
- Opening cash: minimum 0, required for new shifts
- Closing cash: minimum 0, required for closing shifts
- Status: enum validation ('open', 'closed')
- Employee references: must exist in res_employees table

### Employee Entity

**Purpose**: Staff member who can open/close shifts

**Attributes**:
```typescript
interface ResEmployee {
  id: string              // Primary key (UUID)
  user_id: string         // Clerk user ID
  first_name: string      // Employee first name
  last_name: string       // Employee last name
  email: string           // Contact email
  phone?: string          // Contact phone
  pin_code?: string       // Login PIN
  id_number?: string      // Government ID
  is_active: boolean      // Employment status
  created_at: string      // Hire date
  updated_at: string      // Last update
}
```

**Business Rules**:
- Unique email and id_number
- is_active controls access to shift operations
- user_id links to Clerk authentication

## Relationships

### Shift ↔ Employee (Many-to-One)
- **opened_by**: Foreign key to res_employees.id
- **closed_by**: Foreign key to res_employees.id (nullable)
- Ensures shifts are always attributed to valid employees
- Supports audit trails and reporting

### Shift ↔ Orders (One-to-Many)
- **res_orders.shift_id**: Links orders to shifts
- Tracks all sales activity during a shift
- Used for financial reconciliation

## Derived Data

### Balance Calculation
```typescript
balance = closing_cash - opening_cash
```

**Purpose**: Shows net cash change during shift
- Positive: More cash than started with
- Negative: Less cash than started with
- Zero: Exact match (ideal scenario)

**Display Rules**:
- Green text for positive balances
- Red text for negative balances
- Gray text for open shifts (no balance yet)

### Variance in Real-time
```typescript
variance = current_input - opening_cash
```

**Purpose**: Live feedback during shift closing
- Updates as user types closing amount
- Visual indicator with color coding
- Helps identify discrepancies immediately

## Data Flow

### Shift Opening
1. User clicks "Open Shift" button
2. System fetches last closed shift for default values
3. User enters opening cash amount
4. INSERT into res_shifts with status='open'
5. Cache invalidation triggers UI updates

### Shift Closing
1. User clicks "Close Shift" button
2. System shows opening cash reference
3. User enters closing cash amount
4. Real-time variance calculation
5. UPDATE res_shifts with closing data
6. Status changes to 'closed', closed_at set
7. Cache invalidation triggers UI updates

### Admin View
1. Query fetches all shifts with employee relations
2. JOIN with res_employees for opened_by_employee
3. LEFT JOIN with res_employees for closed_by_employee
4. Sort by opened_at DESC
5. Calculate balances for closed shifts

## Data Integrity

### Constraints
- Foreign key constraints on employee references
- Check constraints on cash amounts (>= 0)
- Unique constraints on active shifts per user
- Row Level Security (RLS) policies for multi-tenant access

### Indexes
- `(clerk_user_id, status)` - Fast active shift lookup
- `(restaurant_id, opened_at)` - Multi-tenant chronological queries
- `(opened_by)` - Employee performance reporting
- `(status, opened_at)` - Shift history queries

## Migration Strategy

### Backward Compatibility
- No schema changes required (uses existing fields)
- Employee relations are optional (LEFT JOIN)
- Existing shift data remains accessible
- Gradual rollout with feature flags

### Performance Impact
- Additional JOINs for employee names
- Minimal impact due to existing indexes
- Query caching reduces database load
- Client-side balance calculations

## Testing Data

### Sample Shifts
```typescript
// Perfect shift (balance = 0)
{
  opening_cash: 100.00,
  closing_cash: 100.00,
  balance: 0,     // Green (exact match)
}

// Profitable shift
{
  opening_cash: 100.00,
  closing_cash: 150.00,
  balance: 50.00,  // Green (profit)
}

// Loss shift
{
  opening_cash: 100.00,
  closing_cash: 80.00,
  balance: -20.00, // Red (loss)
}

// Open shift (no balance yet)
{
  opening_cash: 100.00,
  closing_cash: null,
  balance: null,   // Gray (pending)
}
```

### Edge Cases
- Shift with zero opening cash
- Multiple users opening shifts simultaneously
- Network disconnection during operations
- Invalid employee references
- Decimal precision in cash calculations