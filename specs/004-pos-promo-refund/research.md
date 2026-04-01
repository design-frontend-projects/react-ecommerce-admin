# Research: POS & Promotions

## Decision: Field Naming Convention
- **Decision**: Use `start_date`, `end_date`, `usage_limit`, `minimum_purchase` fields.
- **Rationale**: User explicitly reverted types and logic to use these names, indicating they match the current schema or the desired application layer mapping.
- **Alternatives considered**: Using `starts_at`, `expires_at`, etc. (Rejected after user feedback).

## Decision: State Persistence
- **Decision**: Store `appliedPromo` in `useResposStore`.
- **Rationale**: Promotions need to be recalculated as items are added/removed from the cart, and should persist for the selected table until order is placed.

## Decision: Refund logic
- **Decision**: Implement a manual refund trigger in the UI that calls a Supabase RPC or mutation, restricted by Clerk role check (`admin` or `super_admin`).
- **Rationale**: User specified "Refund logic manually applied by admin".
