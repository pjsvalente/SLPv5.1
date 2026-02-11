import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import i18n from '@/i18n'

interface User {
  id: number
  email: string
  role: 'user' | 'operator' | 'admin' | 'superadmin'
  first_name?: string
  last_name?: string
  tenant_id: string
  tenant_name?: string
  must_change_password?: boolean
  two_factor_enabled?: boolean
  menu_items?: MenuItem[]
  language?: string
}

interface MenuItem {
  id: string
  label: string
  path: string
  icon: string
  order: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  mustChangePassword: boolean
  requires2FA: boolean
  pending2FA: { user_id: number; tenant_id: string; method: string } | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>
  resend2FA: () => Promise<{ success: boolean; error?: string }>
  logout: () => void
  changePassword: (current: string, newPass: string, confirm: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  updateUserLanguage: (language: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [pending2FA, setPending2FA] = useState<{ user_id: number; tenant_id: string; method: string } | null>(null)

  const applyUserLanguage = useCallback((language?: string) => {
    if (language && ['pt', 'en', 'fr', 'de'].includes(language)) {
      i18n.changeLanguage(language)
      localStorage.setItem('language', language)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const data = await api.get('/auth/me')
      setUser(data)
      setMustChangePassword(data.must_change_password || false)
      // Apply user's saved language preference
      applyUserLanguage(data.language)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token, applyUserLanguage])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const data = await api.post('/auth/login', { email, password })

      if (data.requires_2fa) {
        setRequires2FA(true)
        setPending2FA({
          user_id: data.user_id,
          tenant_id: data.tenant_id,
          method: data.method
        })
        return { success: true }
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      setMustChangePassword(data.user?.must_change_password || false)
      setRequires2FA(false)
      setPending2FA(null)

      // Apply user's saved language preference after login
      if (data.user?.language) {
        applyUserLanguage(data.user.language)
      }

      return { success: true }
    } catch (error: any) {
      // Return the error_code if available for translation
      const errorCode = error.error_code || error.message || 'UNKNOWN_ERROR'
      return { success: false, error: errorCode }
    }
  }

  const verify2FA = async (code: string) => {
    if (!pending2FA) {
      return { success: false, error: 'SESSION_EXPIRED' }
    }

    try {
      const data = await api.post('/auth/verify-2fa', {
        user_id: pending2FA.user_id,
        tenant_id: pending2FA.tenant_id,
        code
      })

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      setMustChangePassword(data.user?.must_change_password || false)
      setRequires2FA(false)
      setPending2FA(null)

      // Apply user's saved language preference
      if (data.user?.language) {
        applyUserLanguage(data.user.language)
      }

      return { success: true }
    } catch (error: any) {
      const errorCode = error.error_code || error.message || 'INVALID_2FA_CODE'
      return { success: false, error: errorCode }
    }
  }

  const resend2FA = async () => {
    if (!pending2FA) {
      return { success: false, error: 'SESSION_EXPIRED' }
    }

    try {
      await api.post('/auth/resend-2fa', {
        user_id: pending2FA.user_id,
        tenant_id: pending2FA.tenant_id
      })
      return { success: true }
    } catch (error: any) {
      const errorCode = error.error_code || error.message || 'UNKNOWN_ERROR'
      return { success: false, error: errorCode }
    }
  }

  const logout = () => {
    if (token) {
      api.post('/auth/logout').catch(() => {})
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setMustChangePassword(false)
    setRequires2FA(false)
    setPending2FA(null)
  }

  const changePassword = async (current: string, newPass: string, confirm: string) => {
    try {
      await api.post('/auth/change-password', {
        current_password: current,
        new_password: newPass,
        confirm_password: confirm
      })
      setMustChangePassword(false)
      return { success: true }
    } catch (error: any) {
      const errorCode = error.error_code || error.message || 'UNKNOWN_ERROR'
      return { success: false, error: errorCode }
    }
  }

  const updateUserLanguage = async (language: string) => {
    try {
      await api.put('/auth/preferences', { language })
      applyUserLanguage(language)
      if (user) {
        setUser({ ...user, language })
      }
    } catch (error) {
      console.error('Failed to update language preference:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        mustChangePassword,
        requires2FA,
        pending2FA,
        login,
        verify2FA,
        resend2FA,
        logout,
        changePassword,
        refreshUser,
        updateUserLanguage
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
