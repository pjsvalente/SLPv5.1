/**
 * SmartLamppost v5.0 - Notification Settings Component
 * Configure email alerts, maintenance reminders, and daily reports.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { IconBell, IconMail, IconSend, IconCheck, IconAlertTriangle, IconClock, IconCalendar } from '@/components/icons'

interface NotificationSettingsData {
  email_maintenance_alerts: string
  email_daily_report: string
  email_intervention_updates: string
  alert_days_before: string
  warranty_alert_days: string
}

const NotificationSettings: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email_maintenance_alerts: 'true',
    email_daily_report: 'false',
    email_intervention_updates: 'true',
    alert_days_before: '7',
    warranty_alert_days: '30'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.get('/settings/notifications')
      setSettings(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      await api.put('/settings/notifications', settings)
      setMessage({ type: 'success', text: t('notifications.settingsSaved') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errors.SERVER_ERROR') })
    } finally {
      setSaving(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) return

    setTesting(true)
    setMessage(null)

    try {
      await api.post('/settings/notifications/test', { email: testEmail })
      setMessage({ type: 'success', text: t('notifications.testEmailSent') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('notifications.testEmailFailed') })
    } finally {
      setTesting(false)
    }
  }

  const toggleSetting = (key: keyof NotificationSettingsData) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }))
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
        <IconBell className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('notifications.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('notifications.description')}
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

      {/* Email Notification Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        {/* Maintenance Alerts */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <IconClock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {t('notifications.maintenanceAlerts')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('notifications.maintenanceAlertsDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('email_maintenance_alerts')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.email_maintenance_alerts === 'true'
                ? 'bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.email_maintenance_alerts === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Intervention Updates */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <IconMail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {t('notifications.interventionUpdates')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('notifications.interventionUpdatesDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('email_intervention_updates')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.email_intervention_updates === 'true'
                ? 'bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.email_intervention_updates === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Report */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <IconCalendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {t('notifications.dailyReport')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('notifications.dailyReportDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('email_daily_report')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.email_daily_report === 'true'
                ? 'bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.email_daily_report === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Alert Timing Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {t('notifications.alertTiming')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notifications.daysBeforeMaintenance')}
            </label>
            <select
              value={settings.alert_days_before}
              onChange={(e) => setSettings(prev => ({ ...prev, alert_days_before: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="3">3 {t('common.days')}</option>
              <option value="7">7 {t('common.days')}</option>
              <option value="14">14 {t('common.days')}</option>
              <option value="30">30 {t('common.days')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notifications.daysBeforeWarranty')}
            </label>
            <select
              value={settings.warranty_alert_days}
              onChange={(e) => setSettings(prev => ({ ...prev, warranty_alert_days: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="14">14 {t('common.days')}</option>
              <option value="30">30 {t('common.days')}</option>
              <option value="60">60 {t('common.days')}</option>
              <option value="90">90 {t('common.days')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {t('notifications.testEmail')}
        </h3>

        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={t('notifications.enterEmailToTest')}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={sendTestEmail}
            disabled={!testEmail || testing}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
          >
            {testing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <IconSend className="h-4 w-4" />
            )}
            {t('notifications.sendTest')}
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <IconCheck className="h-4 w-4" />
          )}
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings
