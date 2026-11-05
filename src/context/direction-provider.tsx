import { createContext, useContext, useEffect, useState } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import i18n from '@/config/i18n'

export type Direction = 'ltr' | 'rtl'

const DEFAULT_DIRECTION: Direction = 'ltr'
const DIRECTION_COOKIE_NAME = 'dir'
const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Determines whether a given language code requires Right-to-Left (RTL) layout.
 */
export function isRtlLang(lang?: string | null): boolean {
  if (!lang) return false
  const normalized = lang.toLowerCase().trim().split('-')[0].split('_')[0]
  return normalized === 'ar' || normalized === 'fa' || normalized === 'he' || normalized === 'ur'
}

/**
 * Returns the expected layout direction ('rtl' | 'ltr') for a given language code.
 */
export function getDirectionForLanguage(lang?: string | null): Direction {
  return isRtlLang(lang) ? 'rtl' : 'ltr'
}

type DirectionContextType = {
  defaultDir: Direction
  dir: Direction
  setDir: (dir: Direction) => void
  resetDir: () => void
}

const DirectionContext = createContext<DirectionContextType | null>(null)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [dir, _setDir] = useState<Direction>(() => {
    // 1. In browser with initialized i18n language, synchronize direction to active language
    if (typeof window !== 'undefined' && i18n.isInitialized && i18n.language) {
      return getDirectionForLanguage(i18n.language)
    }
    // 2. Fall back to persisted cookie if present
    const cookieDir = getCookie(DIRECTION_COOKIE_NAME) as Direction | undefined
    if (cookieDir === 'ltr' || cookieDir === 'rtl') {
      return cookieDir
    }
    // 3. Fall back to default
    return DEFAULT_DIRECTION
  })

  // Synchronize document.documentElement attributes whenever dir changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement
      htmlElement.setAttribute('dir', dir)
      htmlElement.dir = dir

      const currentLang = i18n.language || (dir === 'rtl' ? 'ar' : 'en')
      htmlElement.setAttribute('lang', currentLang)
      htmlElement.lang = currentLang
    }
  }, [dir])

  // Listen to i18n language changes and synchronize direction automatically
  useEffect(() => {
    const handleLanguageChanged = (lang: string) => {
      const newDir = getDirectionForLanguage(lang)
      _setDir((prev) => {
        if (prev !== newDir) {
          setCookie(DIRECTION_COOKIE_NAME, newDir, DIRECTION_COOKIE_MAX_AGE)
          return newDir
        }
        return prev
      })
      if (typeof document !== 'undefined') {
        const htmlElement = document.documentElement
        htmlElement.setAttribute('dir', newDir)
        htmlElement.dir = newDir
        htmlElement.setAttribute('lang', lang)
        htmlElement.lang = lang
      }
    }

    // Synchronize initial state if language was resolved after initial render
    if (i18n.isInitialized && i18n.language) {
      const expectedDir = getDirectionForLanguage(i18n.language)
      _setDir((prev) => {
        if (prev !== expectedDir) {
          setCookie(DIRECTION_COOKIE_NAME, expectedDir, DIRECTION_COOKIE_MAX_AGE)
          return expectedDir
        }
        return prev
      })
    }

    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  const setDir = (newDir: Direction) => {
    _setDir(newDir)
    setCookie(DIRECTION_COOKIE_NAME, newDir, DIRECTION_COOKIE_MAX_AGE)
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement
      htmlElement.setAttribute('dir', newDir)
      htmlElement.dir = newDir
    }
  }

  const resetDir = () => {
    const langDefaultDir = getDirectionForLanguage(i18n.language)
    _setDir(langDefaultDir)
    removeCookie(DIRECTION_COOKIE_NAME)
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement
      htmlElement.setAttribute('dir', langDefaultDir)
      htmlElement.dir = langDefaultDir
    }
  }

  const defaultDir = getDirectionForLanguage(i18n.language)

  return (
    <DirectionContext.Provider
      value={{
        defaultDir,
        dir,
        setDir,
        resetDir,
      }}
    >
      <RdxDirProvider dir={dir}>{children}</RdxDirProvider>
    </DirectionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
