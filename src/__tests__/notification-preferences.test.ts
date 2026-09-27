import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationPreferences } from '../features/notifications/hooks/use-notification-preferences'
import { playNotificationSound } from '../features/notifications/lib/notification-sound'

describe('Notification Preferences & Audio Synthesizer', () => {
  beforeEach(() => {
    useNotificationPreferences.setState({
      soundEnabled: true,
      toastsEnabled: true,
      minSeverity: 'INFO',
    })
  })

  it('initializes with default preferences', () => {
    const state = useNotificationPreferences.getState()
    expect(state.soundEnabled).toBe(true)
    expect(state.toastsEnabled).toBe(true)
    expect(state.minSeverity).toBe('INFO')
  })

  it('updates soundEnabled preference', () => {
    useNotificationPreferences.getState().setSoundEnabled(false)
    expect(useNotificationPreferences.getState().soundEnabled).toBe(false)

    useNotificationPreferences.getState().setSoundEnabled(true)
    expect(useNotificationPreferences.getState().soundEnabled).toBe(true)
  })

  it('updates toastsEnabled preference', () => {
    useNotificationPreferences.getState().setToastsEnabled(false)
    expect(useNotificationPreferences.getState().toastsEnabled).toBe(false)
  })

  it('updates minSeverity preference', () => {
    useNotificationPreferences.getState().setMinSeverity('WARNING')
    expect(useNotificationPreferences.getState().minSeverity).toBe('WARNING')
  })

  it('synthesizes audio chime using AudioContext without errors', () => {
    const mockOscillator = {
      connect: vi.fn(),
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
    }
    const mockGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }
    const mockContext = {
      currentTime: 10,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGain),
    }

    const MockAudioContext = vi.fn(function () {
      return mockContext
    })

    vi.stubGlobal('AudioContext', MockAudioContext)
    if (typeof window !== 'undefined') {
      window.AudioContext = MockAudioContext as unknown as typeof AudioContext
    }

    expect(() => playNotificationSound('INFO')).not.toThrow()
    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockContext.createGain).toHaveBeenCalled()
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()

    // Test other severity sounds
    expect(() => playNotificationSound('SUCCESS')).not.toThrow()
    expect(() => playNotificationSound('WARNING')).not.toThrow()
    expect(() => playNotificationSound('ERROR')).not.toThrow()
    expect(() => playNotificationSound('CRITICAL')).not.toThrow()

    // Test playTestSound on store
    expect(() => useNotificationPreferences.getState().playTestSound('SUCCESS')).not.toThrow()

    vi.unstubAllGlobals()
  })

  it('gracefully handles missing AudioContext in unsupported environments', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    expect(() => playNotificationSound('INFO')).not.toThrow()

    vi.unstubAllGlobals()
  })
})
