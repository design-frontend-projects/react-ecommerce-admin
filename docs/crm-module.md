# CRM Module Documentation

## Overview
This module integrates a full CRM (Customer Relationship Management) into the POS and inventory application. It automatically creates and maintains records from POS transactions and manages leads, opportunities, tasks, and analytics.

## API Routes
- `POST /api/crm/sync-transaction` - Syncs POS transaction data to CRM Customer Profiles.
- `POST /api/crm/customers/segment` - Bulk update segments of customer profiles.
- `GET /api/crm/analytics` - Fetch metrics and dashboard aggregates for the CRM.

## Frontend Routes
- `/crm` - Base layout, protected by `withCRMAuth` and `requireCRMAuth`.
- `/crm/contacts` - Lazy route for Customer profiles and segmentation lists.
- `/crm/pipeline` - Lazy route for Lead and Opportunity Kanban board.
- `/crm/dashboard` - Lazy route for CRM Manager Analytics.

## Services
- `syncManager.ts` - Handles syncing POS transactions into customer profiles.
- `segmenter.ts` - Classifies customers into VIP, frequent, inactive, and new.
- `pipelineManager.ts` - Manages lead qualification and opportunity progression.
- `activityManager.ts` - Handles tasks and interaction scheduling.
- `analyticsEngine.ts` - Aggregates data for manager views.
- `audit.ts` - Logs access to customer profiles containing PII data.
