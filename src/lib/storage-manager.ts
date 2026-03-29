export const storageManager = {
  /**
   * Check storage quota and usage
   */
  async checkQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimation = await navigator.storage.estimate();
        const usageMb = (estimation.usage || 0) / (1024 * 1024);
        const quotaMb = (estimation.quota || 0) / (1024 * 1024);
        const percentUsed = (quotaMb > 0) ? (usageMb / quotaMb) * 100 : 0;

        return {
          usageMb,
          quotaMb,
          percentUsed,
          isNearLimit: percentUsed > 90
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[PWA] Storage estimation failed:', error);
      }
    }
    return null;
  }
};
