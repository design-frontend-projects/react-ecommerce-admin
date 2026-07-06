# Data Model: POS CRM Module Integration

This document defines the database schema changes (Prisma 7 format) and corresponding Zod validation rules required to support the CRM module.

---

## 1. Prisma Schema Modifications

The following new models will be added to `prisma/schema.prisma`. All fields and table names use `snake_case` in alignment with the existing database conventions.

```prisma
// Lead pipeline status enum represented as text validation in database
model crm_leads {
  lead_id            Int                 @id @default(autoincrement())
  first_name         String              @db.VarChar(100)
  last_name          String              @db.VarChar(100)
  company            String?             @db.VarChar(150)
  email              String?             @db.VarChar(200)
  phone              String?             @db.VarChar(50)
  source             String              @default("web") @db.VarChar(50) // e.g. web, referral, pos_referral
  status             String              @default("new") @db.VarChar(30) // e.g. new, contacted, qualified, unqualified
  assigned_to_user_id String?            @db.VarChar(100) // Clerk user ID or system profile ID
  created_at         DateTime            @default(now()) @db.Timestamp(6)
  updated_at         DateTime            @default(now()) @db.Timestamp(6)

  crm_opportunities  crm_opportunities[]

  @@index([status])
  @@index([assigned_to_user_id])
}

model crm_opportunities {
  opportunity_id      Int        @id @default(autoincrement())
  lead_id             Int?
  customer_id         Int?       // Linked once lead is qualified/converted
  title               String     @db.VarChar(200)
  value               Decimal    @db.Decimal(12, 2)
  probability         Int        @default(10) // Percentage probability (0-100)
  stage               String     @default("qualification") @db.VarChar(50) // e.g. qualification, proposal, negotiation, closed_won, closed_lost
  expected_close_date DateTime?  @db.Date
  assigned_to_user_id String?    @db.VarChar(100)
  created_at          DateTime   @default(now()) @db.Timestamp(6)
  updated_at          DateTime   @default(now()) @db.Timestamp(6)

  crm_leads           crm_leads? @relation(fields: [lead_id], references: [lead_id], onDelete: SetNull)
  customers           customers? @relation(fields: [customer_id], references: [customer_id], onDelete: Cascade)

  @@index([stage])
  @@index([customer_id])
  @@index([assigned_to_user_id])
}

model crm_tasks {
  task_id             Int       @id @default(autoincrement())
  customer_id         Int?
  title               String    @db.VarChar(250)
  description         String?   @db.Text
  due_date            DateTime  @db.Timestamp(6)
  status              String    @default("pending") @db.VarChar(30) // e.g. pending, in_progress, completed, overdue
  priority            String    @default("medium") @db.VarChar(20) // e.g. low, medium, high
  assigned_to_user_id String?   @db.VarChar(100)
  created_at          DateTime  @default(now()) @db.Timestamp(6)
  updated_at          DateTime  @default(now()) @db.Timestamp(6)

  customers           customers? @relation(fields: [customer_id], references: [customer_id], onDelete: Cascade)

  @@index([status])
  @@index([due_date])
  @@index([assigned_to_user_id])
}

model crm_interactions {
  interaction_id      Int       @id @default(autoincrement())
  customer_id         Int
  channel             String    @db.VarChar(50) // e.g. email, phone, in_person, sms
  outcome             String    @db.VarChar(100) // e.g. interested, follow_up_scheduled, no_response
  notes               String?   @db.Text
  agent_user_id       String    @db.VarChar(100) // The Clerk user ID of the staff member
  created_at          DateTime  @default(now()) @db.Timestamp(6)

  customers           customers @relation(fields: [customer_id], references: [customer_id], onDelete: Cascade)

  @@index([customer_id])
  @@index([created_at])
}

model crm_audit_logs {
  audit_id            Int      @id @default(autoincrement())
  auth_user_id             String   @db.VarChar(100) // Action taker
  action              String   @db.VarChar(100) // e.g. VIEW_PII, UPDATE_CUSTOMER, EXPORT_ANALYTICS
  entity_type         String   @db.VarChar(50)  // e.g. customer, opportunity, lead
  entity_id           String   @db.VarChar(100)
  ip_address          String?  @db.VarChar(45)
  created_at          DateTime @default(now()) @db.Timestamp(6)

  @@index([auth_user_id])
  @@index([created_at])
}
```

---

## 2. Customer Table Extensions

The existing `customers` model must be extended with status fields for reviews and data retention purposes:

```prisma
model customers {
  // ... existing fields ...
  crm_status     String?   @default("active") @db.VarChar(30) // active, needs_review (for duplicate flagging), anonymized
  last_active_at DateTime? @default(now()) @db.Timestamp(6)
}
```

---

## 3. Zod Business Validation Rules

These schemas will live in `src/utils/validation/crm.ts` and sync validation logic between form inputs and Prisma DB operations.

```typescript
import { z } from 'zod';

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(150).optional().nullable(),
  email: z.string().email('Invalid email address').max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  source: z.enum(['web', 'referral', 'pos_referral', 'in-person']),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified']),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
});

export const opportunitySchema = z.object({
  lead_id: z.number().int().optional().nullable(),
  customer_id: z.number().int().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  value: z.number().positive('Value must be a positive number'),
  probability: z.number().int().min(0).max(100),
  stage: z.enum(['qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  expected_close_date: z.date().optional().nullable(),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
});

export const taskSchema = z.object({
  customer_id: z.number().int().optional().nullable(),
  title: z.string().min(1, 'Task title is required').max(250),
  description: z.string().optional().nullable(),
  due_date: z.date({ required_error: 'Due date is required' }),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']),
  priority: z.enum(['low', 'medium', 'high']),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
});
```
