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

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: ['en', 'ar'],
      debug: false,
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
    })
}

export default i18n
