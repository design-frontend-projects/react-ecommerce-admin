import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import arTranslation from '@/assets/i18n/ar.json'
import enTranslation from '@/assets/i18n/en.json'

const resources = {
  en: {
    translation: enTranslation,
  },
  ar: {
    translation: arTranslation,
  },
}

const isBrowser = typeof window !== 'undefined'

if (!i18n.isInitialized) {
  if (isBrowser) {
    i18n.use(LanguageDetector)
  }
  i18n
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: ['en', 'ar'],
      detection: {
        caches: isBrowser ? ['localStorage', 'cookie'] : [],
      },
      debug: false,
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
    })
}

export default i18n
