# Antigravity Rules

## Project Identity

```yaml
project:
  name: Ecommerce Inventory Platform
  stack:
    frontend:
      - React 19
      - TanStack Router
      - TanStack Query
      - TanStack Form
      - TailwindCSS v4
      - Radix UI
      - Zustand

    backend:
      - TanStack Start
      - Prisma ORM
      - PostgreSQL
      - Redis
      - BullMQ
      - Socket.IO

    storage:
      - MinIO

    auth:
      - Supabase Auth

    validation:
      - Zod

    testing:
      - Vitest
      - Testing Library

    internationalization:
      - i18next
```

---

# Core Thinking Rules

## Rule 1: Understand Before Coding

Before creating or modifying code:

1. Read surrounding files.
2. Identify current architecture.
3. Identify affected modules.
4. Find existing patterns.
5. Reuse existing implementation whenever possible.
6. Never introduce a second pattern when one already exists.

### Required Output

```text
Context Analysis
- Existing pattern:
- Related components:
- Affected modules:
- Risks:
```

---

## Rule 2: Think in Business Flows

Never think in pages.

Think in:

```text
Business Domain
  → Use Case
      → Workflow
           → API
                → Database
```

Example:

```text
Inventory Adjustment

Workflow:
User
→ Submit Adjustment
→ Validate
→ Create Inventory Transaction
→ Update Product Stock
→ Broadcast Socket Event
→ Refresh Query Cache
```

---

## Rule 3: Always Build Vertically

Do not build UI alone.

Every feature should include:

```text
Database
→ Validation
→ Server Logic
→ API
→ Query
→ UI
→ Tests
```

Bad:

```text
Build Product Screen
```

Good:

```text
Build Product Management Flow
```

---

## Rule 4: Check Existing Features First

Before generating new code:

Search for:

```text
similar feature
similar hook
similar mutation
similar form
similar table
similar service
similar schema
```

Priority order:

```text
Reuse > Extend > Create
```

---

# Context Validation Rules

## Rule 5: Identify Project Layer

Every task must identify layer(s).

```typescript
type Layer =
  | "database"
  | "server"
  | "api"
  | "query"
  | "state"
  | "ui"
  | "socket"
  | "queue"
  | "storage";
```

Example:

```text
Create Product Category

Layers:
✅ Database
✅ Validation
✅ API
✅ Query
✅ UI
```

---

## Rule 6: Understand Dependencies

Before coding list dependencies.

Example:

```text
Depends On:
- Product
- Category
- Inventory
- Audit Log
- Socket Event
```

---

## Rule 7: Detect Multi-Tenant Impact

Every database change must evaluate:

```text
tenant_id
organization_id
branch_id
created_by
updated_by
```

Checklist:

```text
□ Is tenant isolated?
□ Is filtering applied?
□ Is authorization enforced?
□ Is audit trail present?
```

---

# Planning Rules

## Rule 8: Split Work Into Tasks

Every feature must be decomposed.

Example:

```text
Feature:
Purchase Orders

Tasks:

1. Database
   - schema
   - indexes
   - relations

2. Validation
   - create schema
   - update schema

3. Repository
   - create service
   - queries

4. API
   - list
   - details
   - create
   - update

5. Query Hooks
   - usePurchaseOrders
   - useCreatePO

6. UI
   - list page
   - form page
   - details page

7. Realtime
   - socket events

8. Tests
```

---

## Rule 9: Estimate Complexity

Always classify work.

```text
S = < 4 files

M = 5–15 files

L = 15–30 files

XL = 30+ files
```

Output:

```text
Complexity: L

Expected Changes:
- prisma
- services
- routes
- forms
- tables
```

---

# React Rules

## Rule 10: Query Server State Correctly

Use:

```typescript
TanStack Query
```

for:

```text
API Data
Server Data
Caching
```

Never use Zustand for server data.

Use Zustand only for:

```text
Theme
UI State
Filter State
Preferences
```

---

## Rule 11: Form Handling

Standard stack:

```typescript
TanStack Form
+
Zod
```

Avoid multiple validation systems.

---

## Rule 12: Component Structure

Preferred:

```text
Feature
 ├── components
 ├── hooks
 ├── schemas
 ├── services
 ├── types
 └── routes
```

Avoid:

```text
utils/
helpers/
misc/
data/
```

unless necessary.

---

# Database Rules

## Rule 13: Prisma First

All database operations:

```text
Prisma
```

Avoid:

```sql
Raw SQL
```

unless:

```text
Performance
Bulk Operations
Complex Reporting
```

---

## Rule 14: Transactions

For any operation affecting:

```text
Inventory
Payments
Orders
Transfers
```

Use:

```typescript
prisma.$transaction()
```

---

## Rule 15: Inventory Safety

Stock must never be updated directly.

Use:

```text
Inventory Transaction
    ↓
Stock Calculation
```

Never:

```typescript
product.quantity = 100;
```

Always:

```typescript
createInventoryTransaction(...)
```

---

# Realtime Rules

## Rule 16: Socket Event Design

Pattern:

```typescript
inventory.updated
product.created
order.completed
user.connected
```

Never:

```typescript
updateInventory123
```

---

## Rule 17: Query Invalidation

After mutations:

```typescript
queryClient.invalidateQueries(...)
```

must be defined.

Checklist:

```text
□ cache updated
□ sockets emitted
□ optimistic update handled
```

---

# Queue Rules

## Rule 18: Heavy Work Goes To BullMQ

Use Queue For:

```text
Export
Import
Email
Notifications
Reports
Barcode Generation
QR Generation
```

Avoid blocking requests.

---

# File Storage Rules

## Rule 19: MinIO Ownership

Store:

```text
objectKey
tenantId
uploadedBy
fileSize
mimeType
```

inside database.

Never store anonymous files.

---

# Security Rules

## Rule 20: Validate Everything

All DTOs:

```typescript
Zod
```

Required.

```text
Client
Server
Worker
Socket
```

must all validate.

---

## Rule 21: Authorization Before Business Logic

Order:

```text
Authenticate
→ Authorize
→ Validate
→ Execute
```

Never:

```text
Validate
→ Execute
→ Check Access
```

---

# Testing Rules

## Rule 22: Test Critical Paths

Priority:

```text
Inventory Adjustment
Sales
Purchase Orders
Stock Transfer
Authentication
```

Required tests:

```text
Success
Failure
Unauthorized
Validation Error
```

---

# AI Execution Protocol

Whenever a request is received, follow this process:

```text
STEP 1
Analyze Context

STEP 2
Identify Feature

STEP 3
Identify Layers

STEP 4
Identify Existing Code To Reuse

STEP 5
Create Task Breakdown

STEP 6
Identify Risks

STEP 7
Generate Implementation Plan

STEP 8
Generate Code
```

Output Format:

```text
# Context

# Feature Analysis

# Layers Impacted

# Reusable Code

# Task Breakdown

# Risks

# Implementation Plan

# Code Changes
```

---

# Definition of Done (DoD)

A feature is complete only when:

```text
□ Prisma schema updated
□ Migration created
□ Zod validation added
□ Server actions added
□ TanStack Query hooks added
□ UI completed
□ Loading states added
□ Error handling added
□ Socket events added
□ i18n texts added
□ Tenant isolation verified
□ Authorization verified
□ Query invalidation verified
□ Build passes
□ Lint passes
```
