import React, { createContext, useContext, useState, useEffect } from 'react'

interface TenantBranding {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  setTenantBranding: (branding: TenantBranding) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(prev => !prev)
  }

  const setTenantBranding = (branding: TenantBranding) => {
    const root = document.documentElement
    if (branding.primary_color) {
      root.style.setProperty('--tenant-primary', branding.primary_color)
    }
    if (branding.secondary_color) {
      root.style.setProperty('--tenant-secondary', branding.secondary_color)
    }
    if (branding.accent_color) {
      root.style.setProperty('--tenant-accent', branding.accent_color)
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTenantBranding }}>
      {children}
    </ThemeContext.Provider>
  )
}
