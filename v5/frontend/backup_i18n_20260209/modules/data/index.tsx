/**
 * SmartLamppost v5.0 - Data Management Module
 * Import/Export functionality for assets and data
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { FormField, ConfirmDialog, FileUpload } from '@/components/ui'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Database,
  Package,
  Users,
  Wrench,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'

// Main component with routing
export default function DataManagementModule() {
  return (
    <Routes>
      <Route index element={<DataHome />} />
      <Route path="export" element={<ExportPage />} />
      <Route path="import" element={<ImportPage />} />
      <Route path="backup" element={<BackupPage />} />
    </Routes>
  )
}

// Home Component
function DataHome() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.get('/data/stats')
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const cards = [
    {
      title: t('data.exportData'),
      description: t('data.exportDataDesc'),
      icon: Download,
      color: 'blue',
      path: '/data/export'
    },
    {
      title: t('data.importData'),
      description: t('data.importDataDesc'),
      icon: Upload,
      color: 'green',
      path: '/data/import'
    },
    {
      title: t('data.backups'),
      description: t('data.backupsDesc'),
      icon: Database,
      color: 'purple',
      path: '/data/backup'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('data.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('data.subtitle')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('navigation.assets')}</p>
                <p className="text-xl font-bold">{stats.assets || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Wrench className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('navigation.interventions')}</p>
                <p className="text-xl font-bold">{stats.interventions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('navigation.technicians')}</p>
                <p className="text-xl font-bold">{stats.technicians || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('navigation.users')}</p>
                <p className="text-xl font-bold">{stats.users || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-left hover:shadow-lg transition-shadow"
            >
              <div className={`inline-flex p-3 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900 mb-4`}>
                <Icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{card.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Export Page
function ExportPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState<'excel' | 'json'>('excel')
  const [jsonOptions, setJsonOptions] = useState({
    assets: true,
    interventions: true,
    technicians: true
  })

  const handleExportExcel = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/data/export/excel', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error(t('data.errorExporting'))

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ativos_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || t('data.errorExporting'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportJson = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/data/export/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(jsonOptions)
      })

      if (!response.ok) throw new Error(t('data.errorExporting'))

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_data_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || t('data.errorExporting'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/data/import/excel/template', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error(t('data.errorDownloadingTemplate'))

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_importacao.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || t('data.errorDownloadingTemplate'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/data')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('data.exportData')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('data.exportDataToFiles')}</p>
        </div>
      </div>

      {/* Export Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4">{t('data.exportFormat')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setExportType('excel')}
            className={`p-4 rounded-lg border-2 text-left ${
              exportType === 'excel'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold">{t('data.excelFormat')}</p>
                <p className="text-sm text-gray-500">{t('data.exportAssetsExcel')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setExportType('json')}
            className={`p-4 rounded-lg border-2 text-left ${
              exportType === 'json'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="font-semibold">{t('data.jsonFormat')}</p>
                <p className="text-sm text-gray-500">{t('data.exportAllData')}</p>
              </div>
            </div>
          </button>
        </div>

        {/* JSON Options */}
        {exportType === 'json' && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">{t('data.includeInExport')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jsonOptions.assets}
                  onChange={(e) => setJsonOptions(prev => ({ ...prev, assets: e.target.checked }))}
                  className="rounded"
                />
                <span>{t('navigation.assets')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jsonOptions.interventions}
                  onChange={(e) => setJsonOptions(prev => ({ ...prev, interventions: e.target.checked }))}
                  className="rounded"
                />
                <span>{t('navigation.interventions')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jsonOptions.technicians}
                  onChange={(e) => setJsonOptions(prev => ({ ...prev, technicians: e.target.checked }))}
                  className="rounded"
                />
                <span>{t('navigation.technicians')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={exportType === 'excel' ? handleExportExcel : handleExportJson}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {loading ? t('data.exporting') : t('common.export')}
          </button>

          {exportType === 'excel' && (
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t('data.downloadTemplate')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Import Page
function ImportPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [importType, setImportType] = useState<'excel' | 'json'>('excel')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      alert(t('data.selectAFile'))
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const endpoint = importType === 'excel' ? '/api/data/import/excel' : '/api/data/import/json'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('data.errorImporting'))
      }

      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message || t('data.errorImporting') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/data')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('data.importData')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('data.importDataFromFiles')}</p>
        </div>
      </div>

      {/* Import Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4">{t('data.importFormat')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => { setImportType('excel'); setSelectedFile(null); setResult(null) }}
            className={`p-4 rounded-lg border-2 text-left ${
              importType === 'excel'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold">{t('data.excelFormat')}</p>
                <p className="text-sm text-gray-500">{t('data.importAssetsExcel')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setImportType('json'); setSelectedFile(null); setResult(null) }}
            className={`p-4 rounded-lg border-2 text-left ${
              importType === 'json'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="font-semibold">{t('data.jsonFormat')}</p>
                <p className="text-sm text-gray-500">{t('data.importBackupJson')}</p>
              </div>
            </div>
          </button>
        </div>

        {/* File Upload */}
        <FileUpload
          accept={importType === 'excel' ? '.xlsx,.xls' : '.json'}
          onFilesSelected={handleFileSelect}
          maxFiles={1}
        />

        {selectedFile && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2">
            {importType === 'excel' ? (
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            ) : (
              <FileJson className="w-5 h-5 text-yellow-600" />
            )}
            <span>{selectedFile.name}</span>
            <span className="text-sm text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6">
          <button
            onClick={handleImport}
            disabled={loading || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {loading ? t('data.importing') : t('common.import')}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            {result.error ? (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{result.error}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{result.message}</span>
                </div>
                {result.imported !== undefined && (
                  <p className="text-sm">{t('data.imported')}: {result.imported}</p>
                )}
                {result.updated !== undefined && (
                  <p className="text-sm">{t('data.updated')}: {result.updated}</p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-600">{t('data.errors')}:</p>
                    <ul className="text-sm text-red-600">
                      {result.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Backup Page
function BackupPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; backup: any }>({ open: false, backup: null })
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; backup: any }>({ open: false, backup: null })

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    try {
      const data = await api.get('/backup/list')
      setBackups(data.backups || [])
    } catch (error) {
      console.error('Error loading backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      await api.post('/backup/create', { description: 'Manual backup' })
      loadBackups()
    } catch (error: any) {
      alert(error.message || t('data.errorCreatingBackup'))
    } finally {
      setCreating(false)
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error(t('data.errorDownloadingBackup'))

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || t('data.errorDownloadingBackup'))
    }
  }

  const handleDeleteBackup = async () => {
    if (!deleteDialog.backup) return
    try {
      await api.delete(`/backup/${deleteDialog.backup.filename}`)
      setDeleteDialog({ open: false, backup: null })
      loadBackups()
    } catch (error: any) {
      alert(error.message || t('data.errorDeletingBackup'))
    }
  }

  const handleRestoreBackup = async () => {
    if (!restoreDialog.backup) return
    try {
      await api.post(`/backup/restore/${restoreDialog.backup.filename}`, { confirm: true })
      setRestoreDialog({ open: false, backup: null })
      alert(t('data.backupRestored'))
    } catch (error: any) {
      alert(error.message || t('data.errorRestoringBackup'))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/data')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('data.backups')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t('data.manageBackups')}</p>
          </div>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          {creating ? t('data.creating') : t('data.createBackup')}
        </button>
      </div>

      {/* Backups List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('data.noBackupsFound')}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {backups.map((backup) => (
              <div key={backup.filename} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{backup.filename}</p>
                    <p className="text-sm text-gray-500">
                      {formatSize(backup.size)} • {new Date(backup.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadBackup(backup.filename)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title={t('common.download')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRestoreDialog({ open: true, backup })}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title={t('data.restore')}
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog({ open: true, backup })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title={t('common.delete')}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title={t('data.deleteBackup')}
        message={t('data.confirmDeleteBackup', { name: deleteDialog.backup?.filename })}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDeleteBackup}
        onCancel={() => setDeleteDialog({ open: false, backup: null })}
      />

      {/* Restore Dialog */}
      <ConfirmDialog
        open={restoreDialog.open}
        title={t('data.restoreBackup')}
        message={t('data.confirmRestoreBackup', { name: restoreDialog.backup?.filename })}
        confirmLabel={t('data.restore')}
        variant="warning"
        onConfirm={handleRestoreBackup}
        onCancel={() => setRestoreDialog({ open: false, backup: null })}
      />
    </div>
  )
}
