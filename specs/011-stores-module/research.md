# Research: Stores Management Module

## Column Mapping (Prisma vs UI)

| Database Column | UI Field Label | Type | Required | Notes |
|-----------------|----------------|------|----------|-------|
| `store_id` | ID | UUID | Yes (PK) | Auto-generated on create. |
| `name` | Store Name | String | Yes | Required for identification. |
| `clerk_user_id` | Owner | String | No | Link to Clerk Auth. |
| `phone` | Phone Number | String | No | Contact field. |
| `email` | Email Address | String | No | Contact field. |
| `address` | Street Address | String | No | Physical location. |
| `latitude` | Latitude | Decimal | No | Map coordinate. |
| `longitude` | Longitude | Decimal | No | Map coordinate. |
| `city_id` | City | UUID | No | FK to `cities`. |
| `country_id` | Country | UUID | No | FK to `countries`. |
| `status` | Active | Boolean | Yes | Default: `true`. |
| `branch_id` | Branch | UUID | No | FK to `branches`. |
| `created_at` | Created At | DateTime | Yes | Managed by DB/Prisma. |
| `updated_at` | Updated At | DateTime | Yes | Managed by DB/Prisma. |

## Technical Discovery

### 1. Coordinates Entry
**Decision**: Initial implementation will use manual text input for Latitude and Longitude to ensure simplicity and reliability. Map picker can be added as a future enhancement.

### 2. Localization Linkage
- **City**: Linked via `city_id` to the `cities` table.
- **Country**: Linked via `country_id` to the `countries` table.
- **Form UI**: Should provide dropdowns for Country and then filter Cities accordingly.

### 3. Owner Assignment
**Decision**: By default, the `clerk_user_id` will be set to the current authenticated user's ID using Clerk's `useUser()` hook on the frontend or server-side session.

### 4. Branch Association
- **Relation**: A store belongs to a `branch`.
- **UI**: Provide a dropdown for selecting the branch if multi-branch management is active.

## Performance Considerations
- The store list should be paginated if the number of stores exceeds 20.
- Search should filter by `name` and `address`.
- Caching: Use TanStack Query stale time of 5 minutes for store lists, as locations don't change frequently.
