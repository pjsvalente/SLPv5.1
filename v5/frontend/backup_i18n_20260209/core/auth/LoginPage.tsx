import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (!result.success) {
      // Check if error is an error code (all caps with underscores)
      const errorKey = result.error || 'UNKNOWN_ERROR'
      const translatedError = t(`errors.${errorKey}`, { defaultValue: '' })
      setError(translatedError || result.error || t('errors.UNKNOWN_ERROR'))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="icon" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/api/tenants/smartlamppost/logo"
            alt="SmartLamppost"
            className="h-16 mx-auto mb-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900">Asset Management Solutions</h1>
          <p className="text-gray-500 mt-1">{t('auth.signInToContinue')}</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? <LoadingSpinner size="sm" className="text-white" /> : t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          &copy; {new Date().getFullYear()} Smartlamppost.
        </p>
      </div>
    </div>
  )
}
