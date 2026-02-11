/**
 * SmartLamppost v5.0 - Data Management Module
 * Import/Export functionality with field selection, preview, and multiple sheets
 */

import React, { useState, useEffect } from 'react'
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
  ArrowLeft,
  Eye,
  FileCheck,
  X,
  ChevronDown,
  ChevronUp,
  Settings2,
  Layers
} from 'lucide-react'

// Types
interface ExportField {
  name: string
  label: string
  category: string
  selected: boolean
}

interface PreviewRow {
  row_num: number
  serial_number: string
  status: string
  action: 'create' | 'update'
  is_valid: boolean
  errors: string[]
  warnings: string[]
  data: Record<string, any>
}

interface PreviewResult {
  headers: string[]
  rows: PreviewRow[]
  stats: {
    total: number
    new: number
    update: number
    errors: number
  }
  has_more: boolean
}

// Main component with routing
export default function DataManagementModule() {
  return (
    <Routes>
      <Route index element={<DataHome />} />
      <Route path="export" element={<ExportPage />} />
      <Route path="import" element={<ImportPage />} />
      <Route path="backup" element={<BackupPage />} />
      <Route path="catalog" element={<CatalogDataPage />} />
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
      title: t('data.catalogData'),
      description: t('data.catalogDataDesc'),
      icon: Layers,
      color: 'purple',
      path: '/data/catalog'
    },
    {
      title: t('data.backups'),
      description: t('data.backupsDesc'),
      icon: Database,
      color: 'yellow',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

// Export Page with Field Selection
function ExportPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [loadingFields, setLoadingFields] = useState(true)
  const [exportType, setExportType] = useState<'excel' | 'json'>('excel')
  const [fields, setFields] = useState<ExportField[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Excel options
  const [excelOptions, setExcelOptions] = useState({
    include_history: true,
    include_interventions: true,
    include_updates: true
  })

  // JSON options
  const [jsonOptions, setJsonOptions] = useState({
    assets: true,
    interventions: true,
    technicians: true
  })

  useEffect(() => {
    loadFields()
  }, [])

  const loadFields = async () => {
    try {
      const data = await api.get('/data/export/excel/fields')
      const fieldsWithSelection = (data.fields || []).map((f: any) => ({
        ...f,
        selected: true
      }))
      setFields(fieldsWithSelection)

      // Expand all categories by default
      const categories = [...new Set(fieldsWithSelection.map((f: ExportField) => f.category))]
      const expanded: Record<string, boolean> = {}
      categories.forEach(cat => { expanded[cat as string] = true })
      setExpandedCategories(expanded)
    } catch (error) {
      console.error('Error loading fields:', error)
    } finally {
      setLoadingFields(false)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const toggleAllInCategory = (category: string) => {
    const categoryFields = fields.filter(f => f.category === category)
    const allSelected = categoryFields.every(f => f.selected)
    setFields(fields.map(f =>
      f.category === category ? { ...f, selected: !allSelected } : f
    ))
  }

  const toggleField = (name: string) => {
    setFields(fields.map(f =>
      f.name === name ? { ...f, selected: !f.selected } : f
    ))
  }

  const selectAll = () => setFields(fields.map(f => ({ ...f, selected: true })))
  const selectNone = () => setFields(fields.map(f => ({ ...f, selected: false })))

  const groupedFields = fields.reduce((acc, field) => {
    const cat = field.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(field)
    return acc
  }, {} as Record<string, ExportField[]>)

  const handleExportExcel = async () => {
    setLoading(true)
    try {
      const selectedFieldNames = fields.filter(f => f.selected).map(f => f.name)

      const response = await fetch('/api/data/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fields: selectedFieldNames,
          ...excelOptions
        })
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

  const categoryLabels: Record<string, string> = {
    system: t('data.categorySystem'),
    identification: t('data.categoryIdentification'),
    specifications: t('data.categorySpecifications'),
    installation: t('data.categoryInstallation'),
    warranty: t('data.categoryWarranty'),
    maintenance: t('data.categoryMaintenance'),
    equipment: t('data.categoryEquipment'),
    other: t('data.categoryOther')
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
                <p className="text-sm text-gray-500">{t('data.export4Sheets')}</p>
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

        {/* Excel Options - Field Selection */}
        {exportType === 'excel' && (
          <div className="mt-6 space-y-4">
            {/* Sheet Options */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {t('data.includedSheets')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={excelOptions.include_history}
                    onChange={(e) => setExcelOptions(prev => ({ ...prev, include_history: e.target.checked }))}
                    className="rounded"
                  />
                  <span>{t('data.statusHistory')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={excelOptions.include_interventions}
                    onChange={(e) => setExcelOptions(prev => ({ ...prev, include_interventions: e.target.checked }))}
                    className="rounded"
                  />
                  <span>{t('navigation.interventions')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={excelOptions.include_updates}
                    onChange={(e) => setExcelOptions(prev => ({ ...prev, include_updates: e.target.checked }))}
                    className="rounded"
                  />
                  <span>{t('data.fieldUpdates')}</span>
                </label>
              </div>
            </div>

            {/* Field Selection */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  {t('data.fieldsToExport')}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('common.selectAll')}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={selectNone}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('common.selectNone')}
                  </button>
                </div>
              </div>

              {loadingFields ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(groupedFields).map(([category, categoryFields]) => (
                    <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={categoryFields.every(f => f.selected)}
                            onChange={() => toggleAllInCategory(category)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                          />
                          <span className="font-medium text-sm">
                            {categoryLabels[category] || category}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({categoryFields.filter(f => f.selected).length}/{categoryFields.length})
                          </span>
                        </div>
                        {expandedCategories[category] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {expandedCategories[category] && (
                        <div className="p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {categoryFields.map(field => (
                            <label key={field.name} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.selected}
                                onChange={() => toggleField(field.name)}
                                className="rounded"
                              />
                              <span className="truncate">{field.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

// Import Page with Preview
function ImportPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [importType, setImportType] = useState<'excel' | 'json'>('excel')
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<any>(null)

  // Import options
  const [importMode, setImportMode] = useState<'upsert' | 'create_only' | 'update_only'>('upsert')
  const [convertSuspended, setConvertSuspended] = useState(true)

  const handleFilesChange = (files: any[]) => {
    setUploadedFiles(files)
    setResult(null)
    setPreview(null)
  }

  const selectedFile = uploadedFiles.length > 0 ? uploadedFiles[0].file : null

  const handlePreview = async () => {
    if (!selectedFile) {
      alert(t('data.selectAFile'))
      return
    }

    setPreviewing(true)
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/data/import/excel/preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('data.errorPreviewing'))
      }

      setPreview(data)
    } catch (error: any) {
      alert(error.message || t('data.errorPreviewing'))
    } finally {
      setPreviewing(false)
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
      formData.append('mode', importMode)
      formData.append('convert_suspended', convertSuspended.toString())

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
      setPreview(null)
    } catch (error: any) {
      setResult({ error: error.message || t('data.errorImporting') })
    } finally {
      setLoading(false)
    }
  }

  const modeOptions = [
    { value: 'upsert', label: t('data.modeUpsert'), description: t('data.modeUpsertDesc') },
    { value: 'create_only', label: t('data.modeCreateOnly'), description: t('data.modeCreateOnlyDesc') },
    { value: 'update_only', label: t('data.modeUpdateOnly'), description: t('data.modeUpdateOnlyDesc') }
  ]

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
            onClick={() => { setImportType('excel'); setUploadedFiles([]); setResult(null); setPreview(null) }}
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
            onClick={() => { setImportType('json'); setUploadedFiles([]); setResult(null); setPreview(null) }}
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

        {/* Import Mode (Excel only) */}
        {importType === 'excel' && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">{t('data.importMode')}</h3>
            <div className="space-y-2">
              {modeOptions.map(option => (
                <label key={option.value} className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value={option.value}
                    checked={importMode === option.value}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={convertSuspended}
                  onChange={(e) => setConvertSuspended(e.target.checked)}
                  className="rounded"
                />
                <span>{t('data.convertSuspendedToActive')}</span>
              </label>
            </div>
          </div>
        )}

        {/* File Upload */}
        <FileUpload
          files={uploadedFiles}
          onFilesChange={handleFilesChange}
          accept={importType === 'excel' ? '.xlsx,.xls' : '.json'}
          maxFiles={1}
          multiple={false}
        />

        {/* Preview Section */}
        {preview && (
          <div className="mt-6 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('data.preview')}
                </h3>
                <button
                  onClick={() => setPreview(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <p className="text-gray-500">{t('data.total')}</p>
                  <p className="text-lg font-bold">{preview.stats.total}</p>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="text-green-600">{t('data.new')}</p>
                  <p className="text-lg font-bold text-green-600">{preview.stats.new}</p>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="text-blue-600">{t('data.updates')}</p>
                  <p className="text-lg font-bold text-blue-600">{preview.stats.update}</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <p className="text-red-600">{t('data.errors')}</p>
                  <p className="text-lg font-bold text-red-600">{preview.stats.errors}</p>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">{t('data.row')}</th>
                    <th className="p-2 text-left">{t('common.serialNumber')}</th>
                    <th className="p-2 text-left">{t('common.status')}</th>
                    <th className="p-2 text-left">{t('data.action')}</th>
                    <th className="p-2 text-left">{t('data.validation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(row => (
                    <tr key={row.row_num} className={`border-t border-gray-200 dark:border-gray-600 ${
                      !row.is_valid ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}>
                      <td className="p-2">{row.row_num}</td>
                      <td className="p-2 font-mono">{row.serial_number || '-'}</td>
                      <td className="p-2">{row.status}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          row.action === 'create'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {row.action === 'create' ? t('data.create') : t('data.update')}
                        </span>
                      </td>
                      <td className="p-2">
                        {row.is_valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600">{row.errors.join(', ')}</span>
                          </div>
                        )}
                        {row.warnings.length > 0 && (
                          <span className="text-xs text-yellow-600">{row.warnings.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.has_more && (
              <div className="p-2 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-700">
                {t('data.previewLimited')}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          {importType === 'excel' && !preview && (
            <button
              onClick={handlePreview}
              disabled={previewing || !selectedFile}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              {previewing ? t('data.loading') : t('data.preview')}
            </button>
          )}

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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {result.imported !== undefined && (
                    <div>
                      <span className="text-gray-500">{t('data.imported')}:</span>
                      <span className="ml-1 font-medium">{result.imported}</span>
                    </div>
                  )}
                  {result.updated !== undefined && (
                    <div>
                      <span className="text-gray-500">{t('data.updated')}:</span>
                      <span className="ml-1 font-medium">{result.updated}</span>
                    </div>
                  )}
                  {result.skipped !== undefined && (
                    <div>
                      <span className="text-gray-500">{t('data.skipped')}:</span>
                      <span className="ml-1 font-medium">{result.skipped}</span>
                    </div>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                    <p className="text-sm font-medium text-red-600">{t('data.errors')}:</p>
                    <ul className="text-sm text-red-600 list-disc list-inside">
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

// Catalog Data Page (Export/Import Catalog)
function CatalogDataPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)
  const [importMode, setImportMode] = useState<'upsert' | 'create_only' | 'update_only'>('upsert')

  const handleExportCatalog = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/data/export/catalog', {
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
      a.download = `catalogo_export_${new Date().toISOString().slice(0, 10)}.xlsx`
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
      const response = await fetch('/api/data/export/catalog/template', {
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
      a.download = 'template_catalogo.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || t('data.errorDownloadingTemplate'))
    }
  }

  const handleImportCatalog = async () => {
    const selectedFile = uploadedFiles.length > 0 ? uploadedFiles[0].file : null
    if (!selectedFile) {
      alert(t('data.selectAFile'))
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', importMode)

      const response = await fetch('/api/data/import/catalog', {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('data.catalogData')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('data.catalogDataDesc')}</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          {t('data.exportCatalog')}
        </h2>
        <p className="text-sm text-gray-500 mb-4">{t('data.exportCatalogDesc')}</p>

        <div className="flex gap-4">
          <button
            onClick={handleExportCatalog}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {loading ? t('data.exporting') : t('data.exportCatalog')}
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <FileCheck className="w-4 h-4" />
            {t('data.downloadTemplate')}
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {t('data.importCatalog')}
        </h2>

        {/* Import Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('data.importMode')}</label>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as any)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="upsert">{t('data.modeUpsert')}</option>
            <option value="create_only">{t('data.modeCreateOnly')}</option>
            <option value="update_only">{t('data.modeUpdateOnly')}</option>
          </select>
        </div>

        <FileUpload
          files={uploadedFiles}
          onFilesChange={(files) => { setUploadedFiles(files); setResult(null) }}
          accept=".xlsx,.xls"
          maxFiles={1}
          multiple={false}
        />

        <div className="mt-4">
          <button
            onClick={handleImportCatalog}
            disabled={loading || uploadedFiles.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {loading ? t('data.importing') : t('data.importCatalog')}
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
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{result.message}</span>
                </div>

                {result.results && Object.entries(result.results).map(([sheet, data]: [string, any]) => (
                  <div key={sheet} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded">
                    <p className="font-medium">{sheet}</p>
                    <p className="text-sm text-gray-500">
                      {t('data.imported')}: {data.imported} |{' '}
                      {t('data.updated')}: {data.updated} |{' '}
                      {t('data.skipped')}: {data.skipped}
                    </p>
                    {data.errors && data.errors.length > 0 && (
                      <ul className="text-xs text-red-600 mt-1">
                        {data.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Backup Page with Automatic Scheduling
function BackupPage() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()
  const [backups, setBackups] = useState<any[]>([])
  const [autoBackups, setAutoBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; backup: any }>({ open: false, backup: null })
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; backup: any }>({ open: false, backup: null })
  const [includeUploads, setIncludeUploads] = useState(true)
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic' | 'settings'>('manual')

  // Scheduler config state
  const [schedulerConfig, setSchedulerConfig] = useState({
    enabled: false,
    schedule_type: 'daily',
    time: '03:00',
    day_of_week: 0,
    day_of_month: 1,
    max_backups: 10,
    include_uploads: true
  })
  const [nextRun, setNextRun] = useState<string | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    loadBackups()
    loadSchedulerConfig()
  }, [])

  const loadBackups = async () => {
    try {
      const [manualData, autoData] = await Promise.all([
        api.get('/backup/list'),
        api.get('/backup/scheduler/history')
      ])
      setBackups(manualData.backups || [])
      setAutoBackups(autoData.history || [])
    } catch (error) {
      console.error('Error loading backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSchedulerConfig = async () => {
    try {
      const [configData, nextRunData] = await Promise.all([
        api.get('/backup/scheduler/config'),
        api.get('/backup/scheduler/next-run')
      ])
      setSchedulerConfig(configData.config || schedulerConfig)
      setNextRun(nextRunData.next_run)
    } catch (error) {
      console.error('Error loading scheduler config:', error)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      await api.post('/backup/create-full', { include_uploads: includeUploads })
      loadBackups()
    } catch (error: any) {
      alert(error.message || t('data.errorCreatingBackup'))
    } finally {
      setCreating(false)
    }
  }

  const handleRunNow = async () => {
    setCreating(true)
    try {
      await api.post('/backup/scheduler/run-now')
      loadBackups()
    } catch (error: any) {
      alert(error.message || t('data.errorCreatingBackup'))
    } finally {
      setCreating(false)
    }
  }

  const handleSaveSchedulerConfig = async () => {
    setSavingConfig(true)
    try {
      await api.put('/backup/scheduler/config', schedulerConfig)
      loadSchedulerConfig()
    } catch (error: any) {
      alert(error.message || 'Error saving configuration')
    } finally {
      setSavingConfig(false)
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
      window.location.reload()
    } catch (error: any) {
      alert(error.message || t('data.errorRestoringBackup'))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const dayOfWeekLabels = [
    t('backup.monday') || 'Segunda',
    t('backup.tuesday') || 'Terça',
    t('backup.wednesday') || 'Quarta',
    t('backup.thursday') || 'Quinta',
    t('backup.friday') || 'Sexta',
    t('backup.saturday') || 'Sábado',
    t('backup.sunday') || 'Domingo'
  ]

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
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          {[
            { id: 'manual', label: t('backup.manualBackups') || 'Backups Manuais' },
            { id: 'automatic', label: t('backup.automaticBackups') || 'Backups Automáticos' },
            { id: 'settings', label: t('backup.schedulerSettings') || 'Agendamento' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Manual Backups Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeUploads}
                  onChange={(e) => setIncludeUploads(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {t('backup.includeUploads') || 'Incluir ficheiros'}
              </label>
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
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        title={t('common.download')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRestoreDialog({ open: true, backup })}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title={t('data.restore')}
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ open: true, backup })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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
        </div>
      )}

      {/* Automatic Backups Tab */}
      {activeTab === 'automatic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {schedulerConfig.enabled ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {t('backup.schedulerEnabled') || 'Agendamento ativo'}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500">
                  <X className="w-4 h-4" />
                  {t('backup.schedulerDisabled') || 'Agendamento inativo'}
                </span>
              )}
              {nextRun && (
                <span className="text-sm text-gray-500 ml-4">
                  {t('backup.nextRun') || 'Próximo'}: {new Date(nextRun).toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={handleRunNow}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {t('backup.runNow') || 'Executar Agora'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {autoBackups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t('backup.noAutoBackups') || 'Nenhum backup automático'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {autoBackups.map((backup) => (
                  <div key={backup.filename} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">{backup.filename}</p>
                        <p className="text-sm text-gray-500">
                          {formatSize(backup.size)} • {new Date(backup.created_at).toLocaleString()}
                          {backup.include_uploads && (
                            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1 rounded">
                              + ficheiros
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadBackup(backup.filename)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        title={t('common.download')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRestoreDialog({ open: true, backup })}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title={t('data.restore')}
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ open: true, backup })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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
        </div>
      )}

      {/* Scheduler Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4">{t('backup.schedulerConfig') || 'Configuração do Agendamento'}</h3>

          <div className="space-y-4 max-w-lg">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={schedulerConfig.enabled}
                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, enabled: e.target.checked })}
                className="rounded border-gray-300 w-5 h-5"
              />
              <span className="font-medium">{t('backup.enableScheduler') || 'Ativar backup automático'}</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('backup.scheduleType') || 'Frequência'}</label>
                <select
                  value={schedulerConfig.schedule_type}
                  onChange={(e) => setSchedulerConfig({ ...schedulerConfig, schedule_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="daily">{t('backup.daily') || 'Diário'}</option>
                  <option value="weekly">{t('backup.weekly') || 'Semanal'}</option>
                  <option value="monthly">{t('backup.monthly') || 'Mensal'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('backup.time') || 'Hora'}</label>
                <input
                  type="time"
                  value={schedulerConfig.time}
                  onChange={(e) => setSchedulerConfig({ ...schedulerConfig, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            {schedulerConfig.schedule_type === 'weekly' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('backup.dayOfWeek') || 'Dia da semana'}</label>
                <select
                  value={schedulerConfig.day_of_week}
                  onChange={(e) => setSchedulerConfig({ ...schedulerConfig, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  {dayOfWeekLabels.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {schedulerConfig.schedule_type === 'monthly' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('backup.dayOfMonth') || 'Dia do mês'}</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={schedulerConfig.day_of_month}
                  onChange={(e) => setSchedulerConfig({ ...schedulerConfig, day_of_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{t('backup.maxBackups') || 'Máximo de backups a manter'}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={schedulerConfig.max_backups}
                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, max_backups: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('backup.maxBackupsHelp') || 'Backups antigos serão eliminados automaticamente'}
              </p>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={schedulerConfig.include_uploads}
                onChange={(e) => setSchedulerConfig({ ...schedulerConfig, include_uploads: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>{t('backup.includeUploadsInAuto') || 'Incluir ficheiros carregados no backup'}</span>
            </label>

            <div className="pt-4">
              <button
                onClick={handleSaveSchedulerConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingConfig ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

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
