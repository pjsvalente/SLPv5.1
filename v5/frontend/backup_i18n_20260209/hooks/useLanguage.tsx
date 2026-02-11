/**
 * SmartLamppost v5.0 - Language Context & Hook
 * Provides language switching and locale-aware formatting
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n'

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  formatDate: (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (date: Date | string | null | undefined) => string
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (num: number, currency?: string) => string
  supportedLanguages: typeof SUPPORTED_LANGUAGES
}

const LanguageContext = createContext<LanguageContextType | null>(null)

// Map language codes to locale codes
const localeMap: Record<LanguageCode, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  fr: 'fr-FR',
  de: 'de-DE'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()

  const language = (i18n.language?.substring(0, 2) || 'pt') as LanguageCode
  const locale = localeMap[language] || 'pt-PT'

  const setLanguage = useCallback((lang: LanguageCode) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }, [i18n])

  const formatDate = useCallback((date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '-'
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return '-'
      return new Intl.DateTimeFormat(locale, options || {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d)
    } catch {
      return '-'
    }
  }, [locale])

  const formatDateTime = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return '-'
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return '-'
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d)
    } catch {
      return '-'
    }
  }, [locale])

  const formatNumber = useCallback((num: number, options?: Intl.NumberFormatOptions): string => {
    try {
      return new Intl.NumberFormat(locale, options).format(num)
    } catch {
      return String(num)
    }
  }, [locale])

  const formatCurrency = useCallback((num: number, currency = 'EUR'): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(num)
    } catch {
      return `${num} ${currency}`
    }
  }, [locale])

  const value = useMemo(() => ({
    language,
    setLanguage,
    formatDate,
    formatDateTime,
    formatNumber,
    formatCurrency,
    supportedLanguages: SUPPORTED_LANGUAGES
  }), [language, setLanguage, formatDate, formatDateTime, formatNumber, formatCurrency])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Re-export useTranslation for convenience
export { useTranslation } from 'react-i18next'
