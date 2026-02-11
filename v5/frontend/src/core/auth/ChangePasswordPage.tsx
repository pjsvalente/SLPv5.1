import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'

export const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation()
  const { changePassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    if (newPassword.length < 8) {
      setError(t('auth.passwordMinLength', { min: 8 }))
      return
    }

    setLoading(true)

    const result = await changePassword(currentPassword, newPassword, confirmPassword)

    if (!result.success) {
      setError(result.error || t('errors.UNKNOWN_ERROR'))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('auth.changePassword')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {t('auth.passwordChangeRequired')}
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

            <div>
              <label htmlFor="current" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.currentPassword')}
              </label>
              <input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="new" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.newPassword')}
              </label>
              <input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('auth.passwordMinLength', { min: 8 })}</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? <LoadingSpinner size="sm" className="text-white" /> : t('auth.changePassword')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('common.back')} {t('auth.login').toLowerCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
