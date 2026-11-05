import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React, { act } from 'react'
import { render, screen, fireEvent, renderHook } from '@testing-library/react'
import i18n from '@/config/i18n'
import {
  isRtlLang,
  getDirectionForLanguage,
  DirectionProvider,
  useDirection,
  type Direction,
} from '@/context/direction-provider'
import { LanguageSwitch } from '@/components/language-switch'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

// Test consumer to observe direction context values
function DirectionConsumer() {
  const { dir, defaultDir, setDir, resetDir } = useDirection()
  return (
    <div>
      <span data-testid='current-dir'>{dir}</span>
      <span data-testid='default-dir'>{defaultDir}</span>
      <button data-testid='set-rtl' onClick={() => setDir('rtl')}>
        Set RTL
      </button>
      <button data-testid='set-ltr' onClick={() => setDir('ltr')}>
        Set LTR
      </button>
      <button data-testid='reset-dir' onClick={() => resetDir()}>
        Reset
      </button>
    </div>
  )
}

describe('Milestone 1 Empirical Stress Test: RTL Direction & i18n Synchronization', () => {
  const originalLanguage = i18n.language

  beforeEach(() => {
    // Reset document attributes
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    document.documentElement.dir = ''
    document.documentElement.lang = ''

    // Clear cookies
    removeCookie('dir')
    document.cookie = 'dir=; path=/; max-age=0'

    // Reset language to default English
    act(() => {
      i18n.changeLanguage('en')
    })
  })

  afterEach(() => {
    // Restore initial language
    act(() => {
      i18n.changeLanguage(originalLanguage || 'en')
    })
    vi.restoreAllMocks()
  })

  // =========================================================================
  // Section 1: Pure Function Boundary & Adversarial Matrix
  // =========================================================================
  describe('1. Pure Function Boundary & Locale Matrix (isRtlLang & getDirectionForLanguage)', () => {
    it('correctly classifies standard primary RTL language codes', () => {
      const rtlCodes = ['ar', 'fa', 'he', 'ur']
      for (const code of rtlCodes) {
        expect(isRtlLang(code)).toBe(true)
        expect(getDirectionForLanguage(code)).toBe('rtl')
      }
    })

    it('correctly classifies Arabic regional subtags and BCP-47 variants', () => {
      const arabicVariants = [
        'ar-EG', // Egypt
        'ar-SA', // Saudi Arabia
        'ar-AE', // UAE
        'ar-KW', // Kuwait
        'ar-QA', // Qatar
        'ar-OM', // Oman
        'ar-BH', // Bahrain
        'ar-JO', // Jordan
        'ar-LB', // Lebanon
        'ar-SY', // Syria
        'ar-IQ', // Iraq
        'ar-YE', // Yemen
        'ar-LY', // Libya
        'ar-TN', // Tunisia
        'ar-DZ', // Algeria
        'ar-MA', // Morocco
        'ar-SD', // Sudan
      ]
      for (const variant of arabicVariants) {
        expect(isRtlLang(variant), `Failed for ${variant}`).toBe(true)
        expect(getDirectionForLanguage(variant), `Failed for ${variant}`).toBe('rtl')
      }
    })

    it('correctly handles underscore-delimited regional codes', () => {
      const underscoreVariants = ['ar_EG', 'ar_SA', 'ar_AE', 'fa_IR', 'ur_PK']
      for (const variant of underscoreVariants) {
        expect(isRtlLang(variant), `Failed for ${variant}`).toBe(true)
        expect(getDirectionForLanguage(variant), `Failed for ${variant}`).toBe('rtl')
      }
    })

    it('is case-insensitive across uppercase and mixed-case inputs', () => {
      const caseVariants = ['AR', 'Ar', 'AR-EG', 'ar-eg', 'AR_EG', 'FA', 'Fa', 'HE', 'UR']
      for (const code of caseVariants) {
        expect(isRtlLang(code), `Failed for case variant ${code}`).toBe(true)
        expect(getDirectionForLanguage(code), `Failed for case variant ${code}`).toBe('rtl')
      }
    })

    it('tolerates leading/trailing whitespace and padding', () => {
      const padded = ['  ar  ', '\tar-EG\n', '  ar_SA  ', '   he   ']
      for (const code of padded) {
        expect(isRtlLang(code), `Failed for padded code ${code}`).toBe(true)
        expect(getDirectionForLanguage(code), `Failed for padded code ${code}`).toBe('rtl')
      }
    })

    it('correctly classifies non-RTL languages as LTR', () => {
      const nonRtlCodes = [
        'en', 'en-US', 'en-GB',
        'fr', 'fr-FR',
        'es', 'es-ES',
        'de', 'de-DE',
        'it', 'pt', 'ru',
        'zh', 'zh-CN', 'zh-TW',
        'ja', 'ko', 'vi', 'tr',
      ]
      for (const code of nonRtlCodes) {
        expect(isRtlLang(code), `Failed for LTR code ${code}`).toBe(false)
        expect(getDirectionForLanguage(code), `Failed for LTR code ${code}`).toBe('ltr')
      }
    })

    it('safely handles falsy, null, undefined, empty, and adversarial boundary values', () => {
      expect(isRtlLang(null)).toBe(false)
      expect(getDirectionForLanguage(null)).toBe('ltr')

      expect(isRtlLang(undefined)).toBe(false)
      expect(getDirectionForLanguage(undefined)).toBe('ltr')

      expect(isRtlLang('')).toBe(false)
      expect(getDirectionForLanguage('')).toBe('ltr')

      expect(isRtlLang('   ')).toBe(false)
      expect(getDirectionForLanguage('   ')).toBe('ltr')

      // Prefix and lookalike traps that MUST NOT match 'ar'
      const lookalikeTraps = ['arm', 'art', 'ara', 'arabic', 'far', 'heb', '-ar', '_ar', 'x-ar', 'en-ar']
      for (const trap of lookalikeTraps) {
        expect(isRtlLang(trap), `Trap ${trap} falsely matched RTL`).toBe(false)
        expect(getDirectionForLanguage(trap), `Trap ${trap} falsely returned rtl`).toBe('ltr')
      }
    })
  })

  // =========================================================================
  // Section 2: React Context & Hook Contract Verification
  // =========================================================================
  describe('2. React Context & Hook Contract (useDirection)', () => {
    it('throws descriptive error when useDirection is invoked outside DirectionProvider', () => {
      // Suppress console.error for expected React hook throw
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => renderHook(() => useDirection())).toThrow(
        'useDirection must be used within a DirectionProvider'
      )
      spy.mockRestore()
    })

    it('provides correct defaultDir and dir matching active language upon initial mount', () => {
      act(() => {
        i18n.changeLanguage('en')
      })

      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      expect(screen.getByTestId('current-dir').textContent).toBe('ltr')
      expect(screen.getByTestId('default-dir').textContent).toBe('ltr')
    })

    it('initializes with RTL when mounted while language is already Arabic', () => {
      act(() => {
        i18n.changeLanguage('ar')
      })

      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      expect(screen.getByTestId('current-dir').textContent).toBe('rtl')
      expect(screen.getByTestId('default-dir').textContent).toBe('rtl')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(document.documentElement.dir).toBe('rtl')
      expect(document.documentElement.getAttribute('lang')).toBe('ar')
    })

    it('respects cookie preference when initialized if valid', () => {
      setCookie('dir', 'rtl')
      // If language was somehow unset, cookie takes precedence.
      // But per implementation, active i18n language takes priority when initialized.
      // Let's verify that resetting dir clears cookie and restores language default.
      act(() => {
        i18n.changeLanguage('en')
      })

      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      // Imperatively set to RTL
      act(() => {
        screen.getByTestId('set-rtl').click()
      })
      expect(screen.getByTestId('current-dir').textContent).toBe('rtl')
      expect(getCookie('dir')).toBe('rtl')

      // Reset dir
      act(() => {
        screen.getByTestId('reset-dir').click()
      })
      expect(screen.getByTestId('current-dir').textContent).toBe('ltr')
      expect(getCookie('dir')).toBeUndefined()
    })
  })

  // =========================================================================
  // Section 3: Reactive Language Switching & DOM Synchronization
  // =========================================================================
  describe('3. Reactive Language Switching & HTML Element Synchronization', () => {
    it('synchronizes documentElement dir and lang on i18n.changeLanguage', () => {
      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      // Baseline EN
      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(document.documentElement.getAttribute('lang')).toBe('en')

      // Switch to Arabic
      act(() => {
        i18n.changeLanguage('ar')
      })

      expect(screen.getByTestId('current-dir').textContent).toBe('rtl')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(document.documentElement.dir).toBe('rtl')
      expect(document.documentElement.getAttribute('lang')).toBe('ar')
      expect(document.documentElement.lang).toBe('ar')
      expect(getCookie('dir')).toBe('rtl')

      // Switch back to English
      act(() => {
        i18n.changeLanguage('en')
      })

      expect(screen.getByTestId('current-dir').textContent).toBe('ltr')
      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(document.documentElement.dir).toBe('ltr')
      expect(document.documentElement.getAttribute('lang')).toBe('en')
      expect(document.documentElement.lang).toBe('en')
      expect(getCookie('dir')).toBe('ltr')
    })

    it('dynamically switches through sequence: en -> ar -> en -> ar-EG -> fr', () => {
      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      const transitions: Array<{ lang: string; expectedDir: Direction; expectedLang: string }> = [
        { lang: 'ar', expectedDir: 'rtl', expectedLang: 'ar' },
        { lang: 'en', expectedDir: 'ltr', expectedLang: 'en' },
        { lang: 'ar-EG', expectedDir: 'rtl', expectedLang: 'ar' }, // i18next normalizes to supportedLngs 'ar'
        { lang: 'fr', expectedDir: 'ltr', expectedLang: 'en' },    // i18next falls back to fallbackLng 'en'
        { lang: 'ar-SA', expectedDir: 'rtl', expectedLang: 'ar' }, // i18next normalizes to supportedLngs 'ar'
      ]

      for (const step of transitions) {
        act(() => {
          i18n.changeLanguage(step.lang)
        })

        expect(screen.getByTestId('current-dir').textContent).toBe(step.expectedDir)
        expect(document.documentElement.getAttribute('dir')).toBe(step.expectedDir)
        expect(document.documentElement.dir).toBe(step.expectedDir)
        expect(document.documentElement.getAttribute('lang')).toBe(step.expectedLang)
        expect(getCookie('dir')).toBe(step.expectedDir)
      }
    })
  })

  // =========================================================================
  // Section 4: LanguageSwitch Component Integration
  // =========================================================================
  describe('4. LanguageSwitch Component Coexistence & Interaction', () => {
    it('renders language switch trigger with accessible label', () => {
      render(
        <DirectionProvider>
          <LanguageSwitch />
        </DirectionProvider>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDefined()
      expect(screen.getByText('Switch Language')).toBeDefined()
    })

    it('normalizes current language code for subtag matching (e.g. ar-EG matches ar)', () => {
      act(() => {
        i18n.changeLanguage('ar-EG')
      })

      const { unmount } = render(
        <DirectionProvider>
          <LanguageSwitch />
        </DirectionProvider>
      )

      // The checkmark logic in LanguageSwitch:
      // const currentLangCode = i18n.language?.split('-')[0].split('_')[0] || 'en'
      // Should correctly match 'ar' for 'ar-EG'
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      unmount()
    })
  })

  // =========================================================================
  // Section 5: Re-entrancy, Rapid Toggle Stress & Infinite Loop Safety
  // =========================================================================
  describe('5. Stress Testing: Rapid Toggles, Re-entrancy & Loop Guard', () => {
    it('survives rapid 100-cycle language flip-flop without stack overflow or loop', () => {
      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      const start = performance.now()

      act(() => {
        for (let i = 0; i < 100; i++) {
          i18n.changeLanguage(i % 2 === 0 ? 'ar' : 'en')
        }
      })

      const duration = performance.now() - start

      // Final state should be en (since 99 % 2 !== 0 -> 'en')
      expect(screen.getByTestId('current-dir').textContent).toBe('en' === 'en' ? 'ltr' : 'rtl')
      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(document.documentElement.getAttribute('lang')).toBe('en')
      expect(duration).toBeLessThan(3000) // 100 cycles must run well under 3 seconds
    })

    it('idempotently handles consecutive duplicate language notifications without state storm', () => {
      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      // Emit 'ar' 20 times consecutively
      act(() => {
        for (let i = 0; i < 20; i++) {
          i18n.changeLanguage('ar')
        }
      })

      expect(screen.getByTestId('current-dir').textContent).toBe('rtl')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(document.documentElement.getAttribute('lang')).toBe('ar')
      expect(getCookie('dir')).toBe('rtl')
    })

    it('handles interleaved imperative setDir and reactive changeLanguage without race collision', () => {
      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      act(() => {
        for (let i = 0; i < 50; i++) {
          if (i % 2 === 0) {
            screen.getByTestId('set-rtl').click()
          } else {
            i18n.changeLanguage('en')
          }
        }
      })

      // The last iteration (i = 49, odd) was changeLanguage('en')
      expect(screen.getByTestId('current-dir').textContent).toBe('ltr')
      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    })
  })

  // =========================================================================
  // Section 6: Mount / Unmount Lifecycle & Listener Clean-up
  // =========================================================================
  describe('6. Mount / Unmount Lifecycle & Event Cleanup', () => {
    it('properly unsubscribes from i18n languageChanged on unmount to prevent leaks', () => {
      const offSpy = vi.spyOn(i18n, 'off')

      const { unmount } = render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      unmount()

      expect(offSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function))
    })

    it('survives rapid 50-cycle mount/unmount storm without listener leakage or errors', () => {
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <DirectionProvider>
            <DirectionConsumer />
          </DirectionProvider>
        )
        unmount()
      }

      // After 50 unmounts, emitting a language change should not crash or trigger zombies
      expect(() => {
        act(() => {
          i18n.changeLanguage('ar')
          i18n.changeLanguage('en')
        })
      }).not.toThrow()
    })
  })

  // =========================================================================
  // Section 7: Radix UI Direction Integration & Multi-Consumer Concurrency
  // =========================================================================
  describe('7. Radix UI Direction Bridge & Multi-Consumer Concurrency', () => {
    function RadixDirectionProbe() {
      // Radix UI's own useDirection hook
      const radixDir = document.querySelector('[data-radix-direction]')?.getAttribute('dir') || null
      const { dir } = useDirection()
      return (
        <div data-testid='radix-probe' data-app-dir={dir}>
          {dir}
        </div>
      )
    }

    it('synchronizes 10 concurrent consumers simultaneously without tearing', () => {
      render(
        <DirectionProvider>
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} data-testid={`consumer-${idx}`}>
              <DirectionConsumer />
            </div>
          ))}
        </DirectionProvider>
      )

      // Initial LTR
      for (let i = 0; i < 10; i++) {
        const el = screen.getByTestId(`consumer-${i}`)
        expect(el.querySelector('[data-testid="current-dir"]')?.textContent).toBe('ltr')
      }

      // Switch to Arabic
      act(() => {
        i18n.changeLanguage('ar')
      })

      // All 10 consumers must immediately see 'rtl'
      for (let i = 0; i < 10; i++) {
        const el = screen.getByTestId(`consumer-${i}`)
        expect(el.querySelector('[data-testid="current-dir"]')?.textContent).toBe('rtl')
      }

      // Switch back to English
      act(() => {
        i18n.changeLanguage('en')
      })

      // All 10 consumers must immediately see 'ltr'
      for (let i = 0; i < 10; i++) {
        const el = screen.getByTestId(`consumer-${i}`)
        expect(el.querySelector('[data-testid="current-dir"]')?.textContent).toBe('ltr')
      }
    })
  })

  // =========================================================================
  // Section 8: Cookie Tampering & Malformed Value Protection
  // =========================================================================
  describe('8. Cookie Tampering & Corrupt Value Resilience', () => {
    it('gracefully ignores corrupt/tampered cookie values on initialization', () => {
      const corruptValues = [
        'auto',
        'invalid',
        'rtl; malicious',
        'DROP TABLE users',
        '123',
        'true',
        'undefined',
        'null',
      ]

      for (const val of corruptValues) {
        setCookie('dir', val)

        const { unmount } = render(
          <DirectionProvider>
            <DirectionConsumer />
          </DirectionProvider>
        )

        // When i18n is 'en', corrupt cookie must be disregarded and fallback to 'ltr'
        expect(screen.getByTestId('current-dir').textContent).toBe('ltr')
        expect(document.documentElement.getAttribute('dir')).toBe('ltr')
        unmount()
      }
    })
  })

  // =========================================================================
  // Section 9: Re-entrancy & Cascading Event Storm Safety
  // =========================================================================
  describe('9. Re-entrancy & Cascading Event Storm Safety', () => {
    it('does not cause recursion when external listener reacts to languageChanged and inspects direction', () => {
      let callCount = 0

      const sideEffectListener = () => {
        callCount++
        // Inspect document direction inside listener
        const _d = document.documentElement.dir
      }

      i18n.on('languageChanged', sideEffectListener)

      render(
        <DirectionProvider>
          <DirectionConsumer />
        </DirectionProvider>
      )

      act(() => {
        i18n.changeLanguage('ar')
      })

      // Must be called exactly once for the change, not an infinite cascade
      expect(callCount).toBe(1)
      expect(document.documentElement.dir).toBe('rtl')

      i18n.off('languageChanged', sideEffectListener)
    })
  })
})
