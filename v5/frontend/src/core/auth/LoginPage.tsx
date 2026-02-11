import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-slp-bg-dark px-4 relative overflow-hidden">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="slp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#00A0DC' }} />
            <stop offset="100%" style={{ stopColor: '#003366' }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slp-blue-bright/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slp-navy/20 rounded-full blur-3xl" />
      </div>

      {/* Top navigation */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slp-text-secondary hover:text-slp-text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span className="font-medium">{t('common.back')}</span>
        </Link>
        <LanguageSelector variant="icon" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/api/tenants/smartlamppost/logo"
            alt="SmartLamppost"
            className="h-16 mx-auto mb-4 brightness-0 invert"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <h1 className="text-2xl font-bold text-slp-text-primary">
            Asset <span className="text-slp-blue-bright">Management System</span>
          </h1>
          <p className="text-slp-text-secondary mt-2">{t('auth.signInToContinue')}</p>
        </div>

        {/* Login form */}
        <div className="bg-slp-bg-card border border-[var(--slp-border)] rounded-2xl shadow-xl shadow-slp-blue-bright/5 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slp-text-secondary mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-[var(--slp-border)] rounded-lg bg-slp-navy-deep text-slp-text-primary placeholder-slp-text-muted focus:ring-2 focus:ring-slp-blue-bright focus:border-slp-blue-bright outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slp-text-secondary mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 border border-[var(--slp-border)] rounded-lg bg-slp-navy-deep text-slp-text-primary placeholder-slp-text-muted focus:ring-2 focus:ring-slp-blue-bright focus:border-slp-blue-bright outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded hover:bg-white/10 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slp-blue-bright text-slp-navy-deep font-semibold rounded-lg hover:bg-slp-blue-light focus:ring-2 focus:ring-slp-blue-bright focus:ring-offset-2 focus:ring-offset-slp-bg-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slp-blue-bright/30 flex items-center justify-center"
            >
              {loading ? <LoadingSpinner size="sm" className="text-slp-navy-deep" /> : t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/forgot-password"
              className="text-sm text-slp-blue-bright hover:text-slp-blue-light transition-colors"
            >
              {t('auth.forgotPassword')}
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slp-text-muted mt-8">
          &copy; {new Date().getFullYear()} Smartlamppost. {t('landing.footer.rights')}
        </p>
      </div>
    </div>
  )
}
