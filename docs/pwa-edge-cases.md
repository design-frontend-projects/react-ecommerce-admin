# PWA Edge Cases and Graceful Degradation

This document outlines the Progressive Web App (PWA) edge cases handled by the application and its fallback mechanisms.

## 1. Zero Network Access (Complete Offline)
- **Degradation**: Real-time Supabase subscriptions fail. Data mutations via API fail.
- **Graceful Handling**: 
  - The `PWAContext` listens to the browser's `offline` and `online` events, setting the `isOnline` state.
  - The `NetworkStatus` floating badge visually notifies the user of offline status.
  - Core POS page and ResPOS remain fully accessible via Service Worker `NetworkFirst` asset caching mechanisms.
  - Fonts and images are gracefully maintained through `CacheFirst` and `StaleWhileRevalidate` strategies.

## 2. Order Creation while Offline
- **Degradation**: API order submission is prevented due to zero connectivity (`POST` requests fail).
- **Graceful Handling**:
  - `offlineOrderService` catches the failure and dynamically saves the target order to IndexedDB via Dexie.
  - The order is assigned a mock tracking state alongside a generic UUID.
  - `syncManager` automatically registers a Background Sync event labeled `sync-orders`.
  - When the browser re-connects, either the Service Worker's `sync` event fires or the main thread catches `window.addEventListener('online')`, and processes the pending orders using an exponential backoff retry mechanism (1min -> 24hrs).

## 3. Safari and iOS Specific Limitations
- **Degradation**: Web Push notifications and Background Sync API are heavily throttled or unsupported on iOS Safari.
- **Graceful Handling**:
  - Apple touch icon link tags exist in `index.html` structure.
  - Background Sync API feature detection intercepts `syncManager` registration natively. When unsupported, we fall back to manual Sync triggers strictly reliant on `navigator.onLine`.
  - Application install banners feature distinct flows for iOS Safari vs Android Chrome (via standard BeforeInstallPrompt).

## 4. Quota Exceeded (Storage Near Limit)
- **Degradation**: Device refuses IndexedDB persistence or Service Worker cache additions.
- **Graceful Handling**:
  - `storageManager` checks device disk quota iteratively.
  - When consumption exceeds 90%, `NetworkStatus` widget displays a critical yellow warning alerting exactly this.
  - `workbox-expiration` restricts API caches to sensible dimensions (maxEntries: 200, maxAge: 24h).
