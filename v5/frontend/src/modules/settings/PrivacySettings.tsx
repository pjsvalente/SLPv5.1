/**
 * SmartLamppost v5.0 - Privacy Settings Component (RGPD/GDPR)
 * Export personal data, manage consents, and request account deletion.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconShield, IconDownload, IconTrash, IconCheck, IconAlertTriangle, IconClock,
  IconFileText, IconToggleLeft, IconToggleRight, IconX
} from '@/components/icons'

interface DeletionStatus {
  has_pending_request: boolean
  status?: string
  scheduled_deletion_date?: string
  created_at?: string
}

interface Consent {
  consent_type: string
  granted: boolean
  updated_at: string
}

const PrivacySettings: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)
  const [consents, setConsents] = useState<Consent[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [deletionRes, consentsRes] = await Promise.all([
        api.get('/users/me/deletion-status'),
        api.get('/users/me/consents')
      ])
      setDeletionStatus(deletionRes)
      setConsents(consentsRes)
    } catch (err: any) {
      console.error('Error loading privacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/me/data-export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao exportar dados')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my_data_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: t('privacy.exportSuccess') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    } finally {
      setExporting(false)
    }
  }

  const handleRequestDeletion = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: t('privacy.passwordRequired') })
      return
    }

    setDeleting(true)
    setMessage(null)

    try {
      await api.post('/users/me/delete-request', {
        password: deletePassword,
        reason: deleteReason
      })
      setShowDeleteDialog(false)
      setDeletePassword('')
      setDeleteReason('')
      await loadData()
      setMessage({ type: 'success', text: t('privacy.deletionRequested') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDeletion = async () => {
    try {
      await api.post('/users/me/cancel-deletion')
      await loadData()
      setMessage({ type: 'success', text: t('privacy.deletionCancelled') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    }
  }

  const handleConsentToggle = async (consentType: string, currentValue: boolean) => {
    try {
      await api.post('/users/consent-log', {
        consent_type: consentType,
        granted: !currentValue
      })
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    }
  }

  const consentTypes = [
    { type: 'marketing', label: t('privacy.consentMarketing'), description: t('privacy.consentMarketingDesc') },
    { type: 'analytics', label: t('privacy.consentAnalytics'), description: t('privacy.consentAnalyticsDesc') },
    { type: 'notifications', label: t('privacy.consentNotifications'), description: t('privacy.consentNotificationsDesc') }
  ]

  const getConsentValue = (type: string): boolean => {
    const consent = consents.find(c => c.consent_type === type)
    return consent?.granted || false
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconShield className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('privacy.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('privacy.description')}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {message.type === 'success' ? (
            <IconCheck className="h-5 w-5" />
          ) : (
            <IconAlertTriangle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Data Export - RGPD Art. 20 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <IconDownload className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('privacy.exportTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('privacy.exportDescription')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              RGPD Art. 20 - {t('privacy.dataPortability')}
            </p>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <IconFileText className="h-4 w-4" />
              )}
              {t('privacy.downloadMyData')}
            </button>
          </div>
        </div>
      </div>

      {/* Consent Management - RGPD Art. 7 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <IconToggleRight className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('privacy.consentTitle')}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('privacy.consentDescription')}
        </p>

        <div className="space-y-4">
          {consentTypes.map((consent) => {
            const isGranted = getConsentValue(consent.type)
            return (
              <div
                key={consent.type}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {consent.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {consent.description}
                  </p>
                </div>
                <button
                  onClick={() => handleConsentToggle(consent.type, isGranted)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isGranted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isGranted ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Account Deletion - RGPD Art. 17 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <IconTrash className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('privacy.deleteTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('privacy.deleteDescription')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              RGPD Art. 17 - {t('privacy.rightToErasure')}
            </p>

            {deletionStatus?.has_pending_request ? (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <IconClock className="h-5 w-5" />
                  <span className="font-medium">{t('privacy.pendingDeletion')}</span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-2">
                  {t('privacy.scheduledFor')}: {new Date(deletionStatus.scheduled_deletion_date!).toLocaleDateString()}
                </p>
                <button
                  onClick={handleCancelDeletion}
                  className="mt-3 px-4 py-2 bg-white dark:bg-gray-700 text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 flex items-center gap-2"
                >
                  <IconX className="h-4 w-4" />
                  {t('privacy.cancelDeletion')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <IconTrash className="h-4 w-4" />
                {t('privacy.requestDeletion')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <IconAlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('privacy.confirmDeletion')}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('privacy.deletionWarning')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.password')} *
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={t('privacy.enterPassword')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('privacy.reason')} ({t('common.optional')})
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  placeholder={t('privacy.reasonPlaceholder')}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletePassword('')
                  setDeleteReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={deleting || !deletePassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <LoadingSpinner size="sm" /> : <IconTrash className="h-4 w-4" />}
                {t('privacy.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrivacySettings
