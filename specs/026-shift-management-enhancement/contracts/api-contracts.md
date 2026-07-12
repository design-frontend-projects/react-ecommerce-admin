# API Contracts: Shift Management Enhancement

All privileged shift operations move behind TanStack Start API routes
(**Pattern A**, canonical example `src/routes/api/users.ts`):

```
getBearerToken(request) → requireAuth(token, '<perm>')
  → src/server/fns/shifts.ts → Response.json({ success, data }) | jsonError()
```

- Zod schemas shared by client actions and server re-parse:
  `src/features/respos/data/shift-schemas.ts`.
- **Money as decimal strings** matching `/^-?\d+(\.\d{1,2})?$/`, converted to
  `Prisma.Decimal` / SQL parameters server-side. Responses return money as
  strings (`Decimal.toString()`).
- Envelope everywhere: `{ success: boolean, data?, error? }`.
- Client actions (`src/features/respos/data/shift-actions.ts`) follow the
  `authorizedRequest` style from `src/features/users/data/actions.ts`
  (bearer token attach + Zod-parse the envelope).

## Ownership pattern (own-vs-any)

`requireAuth` gates coarsely; the returned `AuthorizedUser` (userId +
`permissionNames`) is threaded into the server fn, which enforces ownership:
if target shift's `auth_user_id !== userId`, require `shifts.manage` in
`permissionNames`, else 403. Mirrors how `createUser` threads `{ authUserId }`.

## What stays direct-supabase (Pattern B, unchanged)

Own-scoped reads: `useActiveShift` / `useShifts`
(`src/features/respos/api/queries.ts:381,405`) — RLS already restricts them,
and keeping them untouched means the enforcement gate works during the entire
rollout.

## Endpoints

| # | Route file (`src/routes/api/respos/`) | Method | Gate perm | Purpose |
|---|---|---|---|---|
| 1 | `shifts.ts` | GET | `shifts.view` | Admin search/list (also lazily calls `res_shift_maintenance()`) |
| 2 | `shifts.ts` | POST | `shifts.use` | Open shift |
| 3 | `shifts.$shiftId.close.ts` | POST | `shifts.use` | Close own shift (or any with `shifts.manage`) |
| 4 | `shifts.$shiftId.force-close.ts` | POST | `shifts.manage` | Force-close with reason |
| 5 | `shifts.$shiftId.corrections.ts` | POST | `shifts.manage` | Correct a closed shift |
| 6 | `shifts.$shiftId.movements.ts` | GET/POST | `shifts.use` | List / add cash movements |
| 7 | `shifts.$shiftId.expected.ts` | GET | `shifts.use` | Live expected-cash preview for close dialog |
| 8 | `shifts.$shiftId.audit.ts` | GET | `shifts.manage` | Audit timeline |
| 9 | `shifts.$shiftId.review.ts` | POST | `shifts.manage` | Mark reviewed |
| 10 | `shifts.active.ts` | GET | `shifts.view` | Who's working now |
| 11 | `shifts.analytics.ts` | GET | `shifts.view` | Analytics aggregations |
| 12 | `shifts.settings.ts` | GET/PUT | GET `shifts.use` · PUT `shifts.manage` | Thresholds |

### 1 · GET /api/respos/shifts — admin list

Query: `status? (open|closed|force_closed|auto_closed)`, `userId?`, `branchId?`,
`from?`, `to?` (ISO), `needsReview? (bool)`, `page? (default 1)`,
`pageSize? (default 25, max 100)`.

`data`: `{ shifts: ShiftDto[], total: number, page, pageSize }` — each shift
joined with opener profile name and branch name; `isStale` computed on read
(`status='open' AND opened_at + stale_hours < now()`).

```ts
type ShiftDto = {
  id: string; authUserId: string | null; openedBy: string | null
  employeeName: string | null; branchId: string | null; branchName: string | null
  status: 'open' | 'closed' | 'force_closed' | 'auto_closed'
  openingCash: string; closingCash: string | null
  expectedCash: string | null; variance: string | null
  cashSalesTotal: string | null; movementsInTotal: string | null
  movementsOutTotal: string | null
  originalClosingCash: string | null; originalVariance: string | null
  varianceComment: string | null; closeReason: string | null
  closedByUserId: string | null
  needsReview: boolean; isCorrected: boolean; isStale: boolean
  reviewedBy: string | null; reviewedAt: string | null
  openedAt: string; closedAt: string | null; notes: string | null
}
```

### 2 · POST /api/respos/shifts — open

```ts
{ action: 'open', openingCash: MoneyString, branchId: Uuid, notes?: string }
```
- Inserts with `auth_user_id = actor`, audit `opened`.
- Postgres `23505` on `uq_res_shifts_one_open_per_user` → **409**
  `{ error: 'active_shift_exists' }` (client refetches active shift — handles
  the double-tab race).

### 3 · POST /api/respos/shifts/:shiftId/close

```ts
{ countedCash: MoneyString, comment?: string }
```
- Ownership check → `SELECT res_close_shift($1,$2,$3,$4,'closed')` via
  `prisma.$queryRaw`.
- Error mapping: `variance_comment_required` → **422**; `shift_not_open` → **409**.
- `data`: closed `ShiftDto`.

### 4 · POST /api/respos/shifts/:shiftId/force-close

```ts
{ countedCash?: MoneyString, reason: string /* min 5 */ }
```
- `res_close_shift(..., 'force_closed', reason)`; `shift_force_closed`
  notification to shift owner. `needs_review=true` always.

### 5 · POST /api/respos/shifts/:shiftId/corrections

```ts
{ closingCash?: MoneyString, openingCash?: MoneyString, reason: string /* min 5 */ }
```
- 409 if shift still open. Prisma tx: update effective fields, recompute
  `variance` from stored `expected_cash` snapshot, `is_corrected=true`, insert
  `corrected` audit row (old/new + reason).
- `data`: `{ shift: ShiftDto, auditId: string }`.

### 6 · /api/respos/shifts/:shiftId/movements

POST:
```ts
{ type: 'in' | 'out',
  reason: 'income' | 'expense' | 'payout' | 'adjustment'
        | 'customer_payment' | 'supplier_payment',
  amount: MoneyString /* > 0 */, note?: string }
```
- Ownership check; insert via server (trigger raises `shift_not_open` → **409**);
  audit `movement_added`.

GET → `data: { movements: CashMovementDto[] }` (own; any with `shifts.manage`).

```ts
type CashMovementDto = {
  id: string; shiftId: string; movementType: 'in' | 'out'; reason: string
  amount: string; note: string | null; createdBy: string | null; createdAt: string
}
```

### 7 · GET /api/respos/shifts/:shiftId/expected

`data`: `{ expected: string, cashSales: string, movementsIn: string,
movementsOut: string, openingCash: string }` — live
`res_shift_expected_cash()`, ownership-checked. Drives the close dialog's
Expected / Counted / Variance preview.

### 8 · GET /api/respos/shifts/:shiftId/audit

`data`: `{ entries: { id, action, actorUserId, actorName, oldValues, newValues,
reason, createdAt }[] }` ordered oldest→newest.

### 9 · POST /api/respos/shifts/:shiftId/review

Body: `{}`. Sets `needs_review=false`, `reviewed_by/at`; audit `reviewed`.

### 10 · GET /api/respos/shifts/active

Query: `branchId?`.
`data`: `{ shifts: (ShiftDto & { elapsedMinutes: number })[] }` — open shifts
only, `isStale` computed. Paired with a `res_shifts` realtime subscription for
live invalidation.

### 11 · GET /api/respos/shifts/analytics

Query: `metric: 'duration' | 'variance' | 'coverage' | 'offenders'`,
`range: '1d' | '7d' | '15d' | '30d' | '90d'`, `branchId?`, `userId?`.

Per-metric `data` shapes:
- `duration`: `{ points: { day: string, avgHours: number, medianHours: number, shifts: number }[] }`
  (excludes `auto_closed` — artificial durations)
- `variance`: `{ series: { key: string /* employee or branch */, label: string,
  points: { day: string, totalVariance: string, avgAbsVariance: string, overThreshold: number }[] }[] }`
- `coverage`: `{ grid: { weekday: number, hour: number, avgHeadcount: number }[] }`
- `offenders`: `{ rows: { userId: string, employeeName: string, shifts: number,
  sumAbsVariance: string, countOverThreshold: number }[] }`

### 12 · /api/respos/shifts/settings

GET → effective settings for the caller's restaurant (+branch override if any).
PUT (admin):
```ts
{ varianceThreshold: MoneyString, requireCommentOverThreshold: boolean,
  staleShiftHours: number /* int ≥ 1 */, autoCloseHours: number /* > staleShiftHours */,
  branchId?: Uuid /* omit = restaurant default */ }
```
Upsert on `(restaurant_id, branch_id)`.

## Error codes summary

| Condition | Status | `error` |
|---|---|---|
| Missing/invalid token | 401 | `Unauthorized` |
| Lacks gate permission / not owner without manage | 403 | `Forbidden` |
| Zod validation failure | 400 | field errors |
| Concurrent open (unique index) | 409 | `active_shift_exists` |
| Close/movement on non-open shift | 409 | `shift_not_open` |
| Variance over threshold without comment | 422 | `variance_comment_required` |
| Correction on open shift | 409 | `shift_still_open` |
