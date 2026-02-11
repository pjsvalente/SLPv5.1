/**
 * SmartLamppost v5.0 - Language Selector Component
 * Dropdown to switch between supported languages
 */

import React, { useState, useRef, useEffect } from 'react'
import { IconGlobe, IconChevronDown } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n'

interface LanguageSelectorProps {
  variant?: 'icon' | 'full' | 'compact'
  className?: string
}

export function LanguageSelector({ variant = 'icon', className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'right' | 'left'>('right')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language?.substring(0, 2)) || SUPPORTED_LANGUAGES[0]

  const handleLanguageChange = (langCode: LanguageCode) => {
    console.log('Changing language to:', langCode)
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
    setIsOpen(false)
  }

  // Calculate dropdown position to prevent overflow
  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 160 // w-40 = 10rem = 160px
      const spaceOnRight = window.innerWidth - rect.right

      // If not enough space on the right, position to the left
      if (spaceOnRight < dropdownWidth + 8) {
        setDropdownPosition('left')
      } else {
        setDropdownPosition('right')
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recalculate position on resize
  useEffect(() => {
    if (isOpen) {
      calculatePosition()
    }
    window.addEventListener('resize', calculatePosition)
    return () => window.removeEventListener('resize', calculatePosition)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition()
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
        title={currentLang.name}
      >
        {variant === 'icon' && (
          <>
            <IconGlobe className="w-5 h-5" />
            <span className="text-lg">{currentLang.flag}</span>
          </>
        )}
        {variant === 'full' && (
          <>
            <span className="text-lg">{currentLang.flag}</span>
            <span className="text-sm font-medium">{currentLang.name}</span>
            <IconChevronDown className="w-4 h-4" />
          </>
        )}
        {variant === 'compact' && (
          <span className="text-lg">{currentLang.flag}</span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden ${
            dropdownPosition === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                i18n.language?.substring(0, 2) === lang.code ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : ''
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
