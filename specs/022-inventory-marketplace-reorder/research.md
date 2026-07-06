# Research - Marketplace Inventory & Auto-Reordering Database Changes

## Decisions and Rationale

### Decision 1: Add `is_marketplace` Boolean flag to `products` and `inventory` models
- **Decision**: Added `is_marketplace Boolean @default(false)` to both models in `prisma/schema.prisma`. Added corresponding Zod schemas and UI wizard integrations.
- **Rationale**: Storing this boolean flag in the base product and inventory records makes it extremely fast to query and filter items available for marketplace transactions.
- **Alternatives Considered**: A separate `marketplace_products` lookup table was evaluated, but rejected because it would require complex joins and duplicate basic product details.

### Decision 2: Add `is_preferred` Boolean flag to `suppliers` model
- **Decision**: Added `is_preferred Boolean @default(false)` to `suppliers` model. Expanded TypeScript types and input forms to support preferred supplier selection.
- **Rationale**: Scopes preferred status per supplier directly in the schema, making preference checks straightforward during auto-reorder queries.
- **Alternatives Considered**: A join table mapping `tenants` to `suppliers` with a priority index was considered. Since suppliers are already scoped to tenant accounts (via `auth_user_id`), a simple boolean flag on the supplier record is the most elegant solution.

### Decision 3: Add `auto_reorder` Boolean flag to `rbac_tenants` model
- **Decision**: Added `auto_reorder Boolean @default(false)` to `rbac_tenants`. Integrated validation under settings `BusinessSettingsSchema`.
- **Rationale**: Scopes the auto-reorder flag at the tenant profile level, allowing global enablement of automated purchase orders.
- **Alternatives Considered**: Storing the flag only as a JSON key in the `app_settings` model. Storing it as a concrete column in the `rbac_tenants` schema guarantees type safety and simplifies DB triggers/jobs that run in the background.
