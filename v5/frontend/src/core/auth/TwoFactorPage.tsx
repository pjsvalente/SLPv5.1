import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'

export const TwoFactorPage: React.FC = () => {
  const { t } = useTranslation()
  const { verify2FA, resend2FA, pending2FA } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await verify2FA(code)

    if (!result.success) {
      setError(result.error || t('errors.INVALID_2FA_CODE'))
    }

    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    setResendSuccess(false)
    setError('')

    const result = await resend2FA()

    if (result.success) {
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } else {
      setError(result.error || t('errors.UNKNOWN_ERROR'))
    }

    setResending(false)
  }

  const methodLabel = pending2FA?.method === 'sms' ? 'SMS' : 'email'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('auth.twoFactorTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {t('twoFactor.enterCodeSentBy', { method: methodLabel })}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-lg">
                {t('twoFactor.codeResent')}
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.verificationCode')}
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? <LoadingSpinner size="sm" className="text-white" /> : t('auth.verify')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {resending ? t('twoFactor.sending') : t('twoFactor.resendCode')}
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          {t('twoFactor.codeExpiresHelp')}
        </p>
      </div>
    </div>
  )
}
