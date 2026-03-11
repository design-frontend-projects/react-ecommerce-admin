# Implementation Plan: Offline Mode for POS/Respos

## Phase 1: Environment & Network Monitoring
- [ ] Task: Install and Configure RxDB Dependencies
    - [ ] Add `rxdb`, `pouchdb-adapter-idb`, and `rxjs` to the project.
    - [ ] Create a basic RxDB initialization script in `src/lib/rxdb.ts`.
- [ ] Task: Implement Network Status Monitoring
    - [ ] **Red Phase:** Write tests for a `useNetworkStatus` hook that simulates `online` and `offline` events.
    - [ ] **Green Phase:** Implement the hook using `navigator.onLine` and event listeners.
    - [ ] **Refactor:** Ensure clean removal of event listeners on unmount.
- [ ] Task: Connection Change Notifications
    - [ ] **Red Phase:** Write tests that verify a toast is triggered when the connection status changes.
    - [ ] **Green Phase:** Integrate the `useNetworkStatus` hook with the project's toast system.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Local Database Setup (RxDB)
- [ ] Task: Define RxDB Schemas
    - [ ] **Red Phase:** Write validation tests for the RxDB schemas of `Orders`, `Products`, `Customers`, and `Transactions`.
    - [ ] **Green Phase:** Implement the JSON schemas matching current Prisma models.
- [ ] Task: Initialize Offline Database
    - [ ] **Red Phase:** Write tests ensuring the database is correctly initialized and collections are created on app start.
    - [ ] **Green Phase:** Implement the initialization logic with error handling for IndexedDB access.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: POS Offline Integration (Reading)
- [ ] Task: Populate Local Cache for Product Catalog
    - [ ] **Red Phase:** Write tests for a background job that populates the RxDB product collection from Supabase on initial load.
    - [ ] **Green Phase:** Implement the population logic using TanStack Query's `onSuccess` or a dedicated background sync.
- [ ] Task: Adapt POS Reading Logic
    - [ ] **Red Phase:** Write tests for the POS component to ensure it fetches products from RxDB when offline.
    - [ ] **Green Phase:** Update the `useProducts` hook to check connection status and read from the local database if offline.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: POS Offline Integration (Writing)
- [ ] Task: Implement Offline Order Creation
    - [ ] **Red Phase:** Write tests for the order submission logic to ensure orders are saved to RxDB when offline.
    - [ ] **Green Phase:** Update the order creation handler to check connection status and route to RxDB if offline.
- [ ] Task: Offline Customer Management
    - [ ] **Red Phase:** Write tests for adding/searching customers locally in RxDB.
    - [ ] **Green Phase:** Implement customer capture logic that saves to RxDB when disconnected.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Synchronization Logic
- [ ] Task: Background Sync Manager
    - [ ] **Red Phase:** Write tests for a `SyncManager` that detects a "reconnected" event and starts processing the RxDB queue.
    - [ ] **Green Phase:** Implement the manager that iterates over local collections and pushes to Supabase/Prisma.
- [ ] Task: Conflict Resolution & Cleanup
    - [ ] **Red Phase:** Write tests for the "Server Wins" policy, ensuring local changes are discarded if the server version is newer.
    - [ ] **Green Phase:** Implement the conflict handler and add logic to clear local RxDB records after successful sync.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)

## Phase 6: Final Verification & Cleanup
- [ ] Task: End-to-End Offline Simulation
    - [ ] **Red Phase:** Write a Playwright/Vitest E2E test that simulates a network dropout, a completed sale, and a reconnection.
    - [ ] **Green Phase:** Fix any remaining edge cases identified during the E2E test.
- [ ] Task: Conductor - User Manual Verification 'Phase 6' (Protocol in workflow.md)
