import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './use-network-status';

describe('useNetworkStatus', () => {
  let originalNavigatorOnLine: boolean;

  beforeAll(() => {
    // Save original navigator.onLine descriptor if it exists
    const descriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    originalNavigatorOnLine = descriptor?.value ?? true;
  });

  afterAll(() => {
    // Restore original navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('should return initial state based on navigator.onLine', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('should update state when offline event fires', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('should update state when online event fires', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });
});
