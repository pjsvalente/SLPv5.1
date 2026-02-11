/**
 * SmartLamppost v5.0 - i18n Configuration
 * Multi-language support: PT, EN, FR, DE
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import pt from './locales/pt.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import de from './locales/de.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
] as const

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de }
    },
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'fr', 'de'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  })

export default i18n
