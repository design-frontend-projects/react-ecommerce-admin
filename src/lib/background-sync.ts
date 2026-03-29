export const backgroundSync = {
  async register(tag: string) {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (registration as any).sync.register(tag);
        // eslint-disable-next-line no-console
        console.log(`[PWA] Background sync registered with tag: ${tag}`);
        return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[PWA] Background sync registration failed:', err);
        return false;
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('[PWA] Background sync is not supported by this browser.');
      return false;
    }
  }
};
