# Quickstart: Stores Management Module

## Prerequisites

- Access to Supabase/PostgreSQL database via Prisma.
- Authentication setup with Clerk.
- Pre-existing data in `cities` and `countries` tables if linked directly via the UI.

## Local Development Setup

1. **Environmental Variables**:
   Ensure `DATABASE_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` are configured in `.env`.

2. **Schema Update**:
   ```bash
   npx prisma generate
   ```

3. **Running the Application**:
   ```bash
   npm run dev
   ```

4. **Navigate to Stores**:
   Go to `http://localhost:3000/stores` to view the store list or `/stores/new` to create a new location.

## Common Operations

### Create a Store
- Fill in the compulsory **Store Name** and optional fields like address, phone, and status.
- The owner will be automatically assigned to your current session.

### Manage Status
- Use the toggle in the store list or detail page to switch the `status` boolean.
- Active stores are shown with a green badge; inactive with grey/red.

### Link with Branch
- Select the organizational branch from the dropdown menu to associate the store with a specific business unit.

## Testing with Vitest

Execute store-specific unit tests once implemented:
```bash
npm test stores
```
