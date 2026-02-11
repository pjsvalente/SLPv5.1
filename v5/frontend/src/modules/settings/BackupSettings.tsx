/**
 * SmartLamppost v5.0 - Backup Settings Component
 * Manage tenant backups - create, download, restore, delete
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Download,
  Upload,
  Trash2,
  Plus,
  Loader2,
  HardDrive,
  Clock,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Backup {
  filename: string
  size: number
  created_at: string
  created_by: string
  version: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateString
  }
}

export const BackupSettings: React.FC = () => {
  const { t } = useTranslation()
  const [backups, setBackups] = useState<Backup[]>([])
  const [maxBackups, setMaxBackups] = useState(30)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    try {
      const data = await api.get('/settings/backups')
      setBackups(data.backups || [])
      setMaxBackups(data.max_backups || 30)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const result = await api.post('/settings/backups')
      setMessage({ type: 'success', text: t('backup.created') })
      loadBackups()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/settings/backups/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setMessage({ type: 'error', text: t('backup.downloadError') })
    }
  }

  const handleRestore = async (filename: string) => {
    setRestoring(filename)
    setConfirmRestore(null)
    setMessage(null)
    try {
      await api.post(`/settings/backups/${filename}/restore`)
      setMessage({ type: 'success', text: t('backup.restored') })
      // Reload after restore - page refresh might be needed
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setRestoring(null)
    }
  }

  const handleDelete = async (filename: string) => {
    setDeleting(filename)
    setConfirmDelete(null)
    setMessage(null)
    try {
      await api.delete(`/settings/backups/${filename}`)
      setMessage({ type: 'success', text: t('backup.deleted') })
      loadBackups()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('backup.description')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {t('backup.limit', { max: maxBackups })} • {backups.length} {t('backup.existing')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {t('backup.create')}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Backups List */}
      {backups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <HardDrive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('backup.noBackups')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('backup.createFirst')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => (
            <div
              key={backup.filename}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {backup.filename}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(backup.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {backup.created_by}
                  </span>
                  <span>{formatFileSize(backup.size)}</span>
                  {backup.version && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                      v{backup.version}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(backup.filename)}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title={t('backup.download')}
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setConfirmRestore(backup.filename)}
                  disabled={restoring === backup.filename}
                  className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                  title={t('backup.restore')}
                >
                  {restoring === backup.filename ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setConfirmDelete(backup.filename)}
                  disabled={deleting === backup.filename}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title={t('backup.delete')}
                >
                  {deleting === backup.filename ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmRestore !== null}
        onClose={() => setConfirmRestore(null)}
        onConfirm={() => confirmRestore && handleRestore(confirmRestore)}
        title={t('backup.restoreTitle')}
        message={t('backup.restoreConfirm')}
        confirmText={t('backup.restore')}
        variant="warning"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title={t('backup.deleteTitle')}
        message={t('backup.deleteConfirm')}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  )
}

export default BackupSettings
