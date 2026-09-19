import '@testing-library/jest-dom'

if (typeof window !== 'undefined') {
  if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
    const store = new Map<string, string>()
    const storageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    }
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    })
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
}
