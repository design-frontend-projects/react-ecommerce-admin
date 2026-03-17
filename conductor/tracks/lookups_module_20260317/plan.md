# Implementation Plan: Lookups Module

## Phase 1: Database Schema & Seeding
- [ ] Task: Update Prisma Schema with Lookup Models (Country, City, Currency, Branch)
- [ ] Task: Create Database Migrations and Push to Supabase
- [ ] Task: Implement Seed Script for Standard Lookups (Countries, Currencies)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Seeding' (Protocol in workflow.md)

## Phase 2: CRUD Logic & API
- [ ] Task: Create Repository/Service Layer for Each Lookup Entity
- [ ] Task: Write Tests for CRUD Service Logic (TDD: Red Phase)
- [ ] Task: Implement CRUD Service Logic (TDD: Green Phase)
- [ ] Task: Verify Test Coverage for Service Logic
- [ ] Task: Conductor - User Manual Verification 'Phase 2: CRUD Logic & API' (Protocol in workflow.md)

## Phase 3: UI & Routing
- [ ] Task: Define Routes for Country, City, Currency, and Branch Pages
- [ ] Task: Implement Listing Pages using `data-table` for each Entity
- [ ] Task: Implement Create/Edit Forms for each Entity using `react-hook-form` & `Zod`
- [ ] Task: Implement Delete Confirmation Dialogs
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI & Routing' (Protocol in workflow.md)

## Phase 4: Navigation & RBAC
- [ ] Task: Update Side Menu with "Lookups" Top-level Item and Sub-items
- [ ] Task: Apply Role-Based Access Control to Lookup Routes (Admin, Super Admin only)
- [ ] Task: Final Integration Testing across all Lookup Entities
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Navigation & RBAC' (Protocol in workflow.md)
