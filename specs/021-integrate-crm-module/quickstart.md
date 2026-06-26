# Developer Quickstart: CRM Module Integration

This guide helps developers get the CRM module running in their local development environment.

---

## 1. Database Migrations

The CRM relies on several new tables added to PostgreSQL. To apply schema updates:

```bash
# Generate the migration files
npx prisma migrate dev --name init-crm-tables

# Verify the prisma client is regenerated
npx prisma generate
```

---

## 2. Running Local Dev Server

Start the local database container and Vite dev server:

```bash
# Ensure Docker Compose services are running (Postgres)
docker-compose up -d

# Run the project in dev mode
pnpm dev
```

---

## 3. Simulating POS Checkout Event

To test the synchronization service locally, you can fire a mock POS completion payload to the sync API endpoint:

```bash
curl -X POST http://localhost:5173/api/crm/sync-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "pos-order-9872",
    "transaction_id": "txn_8761273618",
    "total_amount": 120.50,
    "customer_email": "alice@example.com",
    "customer_phone": "+15550199"
  }'
```

After submitting this request, check the CRM dashboard or direct database query to confirm:
1. `customers` profile for `alice@example.com` has been created or updated.
2. The transaction timeline is updated.

---

## 4. Running Verification Test Suites

To verify database constraints, state updates, and transaction sync logic:

```bash
# Run unit and integration tests using Vitest
pnpm test tests/crm/
```
