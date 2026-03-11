# Specification: Offline Mode for POS/Respos

## 1. Overview
Implement a comprehensive offline-first capability for the Point of Sale (POS) and Restaurant POS (Respos) modules. This track uses **RxDB** for local data persistence and provides seamless synchronization with **Supabase** when internet connectivity is restored.

## 2. Functional Requirements
- **Network Status Detection:**
    - Monitor browser's online/offline status in real-time.
    - Display "You are currently offline" toast when disconnected.
    - Display "Internet restored, syncing data..." toast when reconnected.
- **Local Persistence (RxDB):**
    - Implement an RxDB-based local database to store:
        - `POS/Respos Orders` (Drafts and Completed).
        - `Product Catalog` (Read-only for offline use).
        - `Customer Data` (Creation and lookup).
        - `Transactions/Shifts` (Local record keeping).
    - Ensure all POS actions (adding items, applying discounts, capturing customers) work without an active connection.
- **Data Synchronization:**
    - Automatically trigger a background sync process when the internet is restored.
    - Push local changes to Supabase using established Prisma/Supabase patterns.
    - **Conflict Policy:** "Server Wins" — If data on Supabase has changed since the last sync, the server's version will overwrite local changes to maintain data integrity.
    - **Post-Sync Cleanup:** Clear synchronized local records from RxDB once successfully pushed to Supabase to save local storage.

## 3. Non-Functional Requirements
- **Performance:** Offline data access should be faster than network requests.
- **Reliability:** No data loss during transitions between online and offline states.
- **UI Consistency:** The user experience (buttons, forms, navigation) should remain identical in both states.

## 4. Acceptance Criteria
- [ ] Application remains functional (no crashes or stuck loading states) when disconnecting the network.
- [ ] Users can create and "complete" a POS order while offline.
- [ ] Offline-created orders are saved locally and survive a browser refresh.
- [ ] Toasts correctly indicate connection status changes.
- [ ] Upon reconnecting, orders are automatically sent to Supabase and become visible in the global transactions list.
- [ ] Local RxDB storage is cleared of "Synced" items after successful upload.

## 5. Out of Scope
- Manual conflict resolution UI.
- Offline support for non-POS modules (e.g., Settings, Profile Management).
- Large media (images) offline caching (focus is on data/text records).
