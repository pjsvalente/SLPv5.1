/**
 * SmartLamppost v5.0 - Custom Reports Module
 * Advanced report builder with templates, custom fields, and export
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { useLanguage } from '@/hooks/useLanguage'
import { FormField, StatusBadge } from '@/components/ui'
import {
  IconFileSpreadsheet, IconPlus, IconSave, IconTrash2, IconPlay, IconDownload,
  IconCopy, IconEdit, IconChevronDown, IconChevronUp, IconX, IconCheck,
  IconRefreshCw, IconFilter, IconColumns, IconClock, IconCalendar, IconFileText,
  IconBarChart3, IconPackage, IconWrench, IconUsers, IconEye, IconSettings, IconLayers
} from '@/components/icons'

interface ReportTemplate {
  id: number
  name: string
  description: string
  type: 'assets' | 'interventions' | 'technicians' | 'mixed'
  config: ReportConfig
  is_default: number
  created_at: string
  created_by: number
}

interface ReportConfig {
  columns: string[]
  filters: ReportFilter[]
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateRange?: {
    field: string
    start?: string
    end?: string
  }
  includeStats?: boolean
  chartType?: 'bar' | 'pie' | 'line' | 'none'
}

interface ReportFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
  value: string | string[]
}

interface GeneratedReport {
  data: any[]
  stats: Record<string, any>
  generated_at: string
  config: ReportConfig
}

// Available columns by report type
const AVAILABLE_COLUMNS: Record<string, { key: string; label: string; type: string }[]> = {
  assets: [
    { key: 'numero_serie', label: 'Serial Number', type: 'text' },
    { key: 'rfid_tag', label: 'RFID Tag', type: 'text' },
    { key: 'referencia_produto', label: 'Product Reference', type: 'text' },
    { key: 'fabricante', label: 'Manufacturer', type: 'text' },
    { key: 'modelo', label: 'Model', type: 'text' },
    { key: 'estado', label: 'Status', type: 'select' },
    { key: 'municipio', label: 'Municipality', type: 'text' },
    { key: 'morada', label: 'Address', type: 'text' },
    { key: 'gps_latitude', label: 'GPS Latitude', type: 'number' },
    { key: 'gps_longitude', label: 'GPS Longitude', type: 'number' },
    { key: 'data_instalacao', label: 'Installation Date', type: 'date' },
    { key: 'proxima_manutencao', label: 'Next Maintenance', type: 'date' },
    { key: 'fim_garantia', label: 'Warranty End', type: 'date' },
    { key: 'created_at', label: 'Created At', type: 'date' },
    { key: 'updated_at', label: 'Updated At', type: 'date' }
  ],
  interventions: [
    { key: 'numero', label: 'Intervention Number', type: 'text' },
    { key: 'tipo', label: 'Type', type: 'select' },
    { key: 'estado', label: 'Status', type: 'select' },
    { key: 'prioridade', label: 'Priority', type: 'select' },
    { key: 'asset_serial', label: 'Asset Serial', type: 'text' },
    { key: 'descricao_problema', label: 'Problem Description', type: 'text' },
    { key: 'descricao_solucao', label: 'Solution', type: 'text' },
    { key: 'data_agendada', label: 'Scheduled Date', type: 'date' },
    { key: 'data_conclusao', label: 'Completion Date', type: 'date' },
    { key: 'custo_total', label: 'Total Cost', type: 'number' },
    { key: 'created_at', label: 'Created At', type: 'date' },
    { key: 'created_by', label: 'Created By', type: 'text' }
  ],
  technicians: [
    { key: 'nome', label: 'Name', type: 'text' },
    { key: 'tipo', label: 'Type', type: 'select' },
    { key: 'empresa', label: 'Company', type: 'text' },
    { key: 'especializacao', label: 'Specialization', type: 'text' },
    { key: 'telefone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ativo', label: 'Active', type: 'boolean' },
    { key: 'intervention_count', label: 'Intervention Count', type: 'number' }
  ]
}

const FILTER_OPERATORS = [
  { key: 'eq', label: '= Equal' },
  { key: 'ne', label: '≠ Not Equal' },
  { key: 'gt', label: '> Greater Than' },
  { key: 'lt', label: '< Less Than' },
  { key: 'gte', label: '≥ Greater or Equal' },
  { key: 'lte', label: '≤ Less or Equal' },
  { key: 'contains', label: '∋ Contains' },
  { key: 'in', label: '∈ In List' }
]

export default function CustomReportsModule() {
  const { t } = useTranslation()
  const { formatDate, formatDateTime } = useLanguage()
  const api = useApi()

  // State
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Builder state
  const [builderName, setBuilderName] = useState('')
  const [builderDescription, setBuilderDescription] = useState('')
  const [builderType, setBuilderType] = useState<'assets' | 'interventions' | 'technicians' | 'mixed'>('assets')
  const [builderColumns, setBuilderColumns] = useState<string[]>([])
  const [builderFilters, setBuilderFilters] = useState<ReportFilter[]>([])
  const [builderGroupBy, setBuilderGroupBy] = useState('')
  const [builderSortBy, setBuilderSortBy] = useState('')
  const [builderSortOrder, setBuilderSortOrder] = useState<'asc' | 'desc'>('asc')
  const [builderDateField, setBuilderDateField] = useState('')
  const [builderDateStart, setBuilderDateStart] = useState('')
  const [builderDateEnd, setBuilderDateEnd] = useState('')
  const [builderIncludeStats, setBuilderIncludeStats] = useState(true)
  const [builderChartType, setBuilderChartType] = useState<'bar' | 'pie' | 'line' | 'none'>('bar')

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.get('/reports/templates')
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }, [api])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Reset builder
  const resetBuilder = () => {
    setBuilderName('')
    setBuilderDescription('')
    setBuilderType('assets')
    setBuilderColumns([])
    setBuilderFilters([])
    setBuilderGroupBy('')
    setBuilderSortBy('')
    setBuilderSortOrder('asc')
    setBuilderDateField('')
    setBuilderDateStart('')
    setBuilderDateEnd('')
    setBuilderIncludeStats(true)
    setBuilderChartType('bar')
    setSelectedTemplate(null)
  }

  // Load template into builder
  const loadTemplateToBuilder = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setBuilderName(template.name)
    setBuilderDescription(template.description || '')
    setBuilderType(template.type)
    setBuilderColumns(template.config.columns || [])
    setBuilderFilters(template.config.filters || [])
    setBuilderGroupBy(template.config.groupBy || '')
    setBuilderSortBy(template.config.sortBy || '')
    setBuilderSortOrder(template.config.sortOrder || 'asc')
    setBuilderDateField(template.config.dateRange?.field || '')
    setBuilderDateStart(template.config.dateRange?.start || '')
    setBuilderDateEnd(template.config.dateRange?.end || '')
    setBuilderIncludeStats(template.config.includeStats !== false)
    setBuilderChartType(template.config.chartType || 'bar')
    setShowBuilder(true)
  }

  // Save template
  const saveTemplate = async () => {
    if (!builderName.trim()) {
      alert(t('customReports.nameRequired'))
      return
    }

    if (builderColumns.length === 0) {
      alert(t('customReports.columnsRequired'))
      return
    }

    setLoading(true)
    try {
      const config: ReportConfig = {
        columns: builderColumns,
        filters: builderFilters,
        groupBy: builderGroupBy || undefined,
        sortBy: builderSortBy || undefined,
        sortOrder: builderSortOrder,
        includeStats: builderIncludeStats,
        chartType: builderChartType
      }

      if (builderDateField) {
        config.dateRange = {
          field: builderDateField,
          start: builderDateStart || undefined,
          end: builderDateEnd || undefined
        }
      }

      const payload = {
        name: builderName,
        description: builderDescription,
        type: builderType,
        config
      }

      if (selectedTemplate) {
        await api.put(`/reports/templates/${selectedTemplate.id}`, payload)
      } else {
        await api.post('/reports/templates', payload)
      }

      await loadTemplates()
      setShowBuilder(false)
      resetBuilder()
    } catch (error) {
      console.error('Error saving template:', error)
      alert(t('customReports.saveError'))
    } finally {
      setLoading(false)
    }
  }

  // Delete template
  const deleteTemplate = async (id: number) => {
    if (!confirm(t('customReports.confirmDelete'))) return

    try {
      await api.delete(`/reports/templates/${id}`)
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  // Generate report
  const generateReport = async (template?: ReportTemplate) => {
    setLoading(true)
    try {
      const config: ReportConfig = template ? template.config : {
        columns: builderColumns,
        filters: builderFilters,
        groupBy: builderGroupBy || undefined,
        sortBy: builderSortBy || undefined,
        sortOrder: builderSortOrder,
        includeStats: builderIncludeStats,
        chartType: builderChartType
      }

      if (!template && builderDateField) {
        config.dateRange = {
          field: builderDateField,
          start: builderDateStart || undefined,
          end: builderDateEnd || undefined
        }
      }

      const type = template ? template.type : builderType
      const response = await api.post('/reports/custom', {
        type,
        config
      })

      setGeneratedReport(response)
      setShowPreview(true)
    } catch (error) {
      console.error('Error generating report:', error)
      alert(t('customReports.generateError'))
    } finally {
      setLoading(false)
    }
  }

  // Export report
  const exportReport = async (format: 'csv' | 'excel') => {
    if (!generatedReport) return

    try {
      const blob = await api.getBlob(`/reports/export?format=${format}`, {
        method: 'POST',
        body: JSON.stringify(generatedReport)
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  // Add filter
  const addFilter = () => {
    setBuilderFilters([...builderFilters, { field: '', operator: 'eq', value: '' }])
  }

  // Remove filter
  const removeFilter = (index: number) => {
    setBuilderFilters(builderFilters.filter((_, i) => i !== index))
  }

  // Update filter
  const updateFilter = (index: number, key: keyof ReportFilter, value: any) => {
    const newFilters = [...builderFilters]
    newFilters[index] = { ...newFilters[index], [key]: value }
    setBuilderFilters(newFilters)
  }

  // Toggle column
  const toggleColumn = (column: string) => {
    if (builderColumns.includes(column)) {
      setBuilderColumns(builderColumns.filter(c => c !== column))
    } else {
      setBuilderColumns([...builderColumns, column])
    }
  }

  // Get available columns for current type
  const availableColumns = AVAILABLE_COLUMNS[builderType] || []

  // Get column label
  const getColumnLabel = (key: string) => {
    const column = availableColumns.find(c => c.key === key)
    return column ? t(`customReports.columns.${key}`, { defaultValue: column.label }) : key
  }

  // Render template card
  const renderTemplateCard = (template: ReportTemplate) => {
    const typeIcons = {
      assets: Package,
      interventions: Wrench,
      technicians: Users,
      mixed: Layers
    }
    const Icon = typeIcons[template.type] || FileText

    return (
      <div
        key={template.id}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {t(`customReports.types.${template.type}`)}
                </span>
                <span className="text-xs text-gray-400">
                  {template.config.columns?.length || 0} {t('customReports.columns')}
                </span>
                {template.is_default === 1 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    {t('customReports.default')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => generateReport(template)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title={t('customReports.generate')}
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadTemplateToBuilder(template)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title={t('common.edit')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteTemplate(template.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render builder
  const renderBuilder = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {selectedTemplate ? t('customReports.editTemplate') : t('customReports.newTemplate')}
          </h2>
          <button
            onClick={() => {
              setShowBuilder(false)
              resetBuilder()
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="name"
              label={t('customReports.templateName')}
              value={builderName}
              onChange={setBuilderName}
              required
            />
            <FormField
              name="type"
              label={t('customReports.reportType')}
              type="select"
              value={builderType}
              onChange={(v) => {
                setBuilderType(v as any)
                setBuilderColumns([])
                setBuilderFilters([])
              }}
              options={[
                { value: 'assets', label: t('customReports.types.assets') },
                { value: 'interventions', label: t('customReports.types.interventions') },
                { value: 'technicians', label: t('customReports.types.technicians') }
              ]}
            />
          </div>

          <FormField
            name="description"
            label={t('common.description')}
            type="textarea"
            value={builderDescription}
            onChange={setBuilderDescription}
          />

          {/* Column Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Columns className="w-4 h-4 inline-block mr-2" />
              {t('customReports.selectColumns')} *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {availableColumns.map((col) => (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    builderColumns.includes(col.key)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={builderColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`customReports.columns.${col.key}`, { defaultValue: col.label })}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Filter className="w-4 h-4 inline-block mr-2" />
                {t('customReports.filters')}
              </label>
              <button
                onClick={addFilter}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {t('customReports.addFilter')}
              </button>
            </div>
            {builderFilters.length > 0 ? (
              <div className="space-y-2">
                {builderFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, 'field', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">{t('customReports.selectField')}</option>
                      {availableColumns.map((col) => (
                        <option key={col.key} value={col.key}>
                          {t(`customReports.columns.${col.key}`, { defaultValue: col.label })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                      className="w-40 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.key} value={op.key}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={filter.value as string}
                      onChange={(e) => updateFilter(index, 'value', e.target.value)}
                      placeholder={t('customReports.filterValue')}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => removeFilter(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('customReports.noFilters')}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline-block mr-2" />
              {t('customReports.dateRange')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                name="dateField"
                label={t('customReports.dateField')}
                type="select"
                value={builderDateField}
                onChange={setBuilderDateField}
                options={[
                  { value: '', label: t('customReports.noDateFilter') },
                  ...availableColumns
                    .filter(c => c.type === 'date')
                    .map(c => ({ value: c.key, label: t(`customReports.columns.${c.key}`, { defaultValue: c.label }) }))
                ]}
              />
              <FormField
                name="dateStart"
                label={t('reports.startDate')}
                type="date"
                value={builderDateStart}
                onChange={setBuilderDateStart}
                disabled={!builderDateField}
              />
              <FormField
                name="dateEnd"
                label={t('reports.endDate')}
                type="date"
                value={builderDateEnd}
                onChange={setBuilderDateEnd}
                disabled={!builderDateField}
              />
            </div>
          </div>

          {/* Sorting and Grouping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="groupBy"
              label={t('customReports.groupBy')}
              type="select"
              value={builderGroupBy}
              onChange={setBuilderGroupBy}
              options={[
                { value: '', label: t('customReports.noGrouping') },
                ...builderColumns.map(c => ({ value: c, label: getColumnLabel(c) }))
              ]}
            />
            <FormField
              name="sortBy"
              label={t('customReports.sortBy')}
              type="select"
              value={builderSortBy}
              onChange={setBuilderSortBy}
              options={[
                { value: '', label: t('customReports.defaultSort') },
                ...builderColumns.map(c => ({ value: c, label: getColumnLabel(c) }))
              ]}
            />
            <FormField
              name="sortOrder"
              label={t('customReports.sortOrder')}
              type="select"
              value={builderSortOrder}
              onChange={(v) => setBuilderSortOrder(v as 'asc' | 'desc')}
              options={[
                { value: 'asc', label: t('customReports.ascending') },
                { value: 'desc', label: t('customReports.descending') }
              ]}
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={builderIncludeStats}
                onChange={(e) => setBuilderIncludeStats(e.target.checked)}
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('customReports.includeStats')}
                </span>
                <p className="text-xs text-gray-500">{t('customReports.includeStatsDesc')}</p>
              </div>
            </label>
            <FormField
              name="chartType"
              label={t('customReports.chartType')}
              type="select"
              value={builderChartType}
              onChange={(v) => setBuilderChartType(v as any)}
              options={[
                { value: 'none', label: t('customReports.noChart') },
                { value: 'bar', label: t('customReports.barChart') },
                { value: 'pie', label: t('customReports.pieChart') },
                { value: 'line', label: t('customReports.lineChart') }
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => generateReport()}
            disabled={loading || builderColumns.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-4 h-4" />
            {t('customReports.preview')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowBuilder(false)
                resetBuilder()
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={saveTemplate}
              disabled={loading || !builderName.trim() || builderColumns.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Render preview
  const renderPreview = () => {
    if (!generatedReport) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('customReports.reportPreview')}
              </h2>
              <p className="text-sm text-gray-500">
                {generatedReport.data.length} {t('common.results')} • {formatDateTime(generatedReport.generated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportReport('csv')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => exportReport('excel')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          {generatedReport.stats && Object.keys(generatedReport.stats).length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-4">
                {Object.entries(generatedReport.stats).map(([key, value]) => (
                  <div key={key} className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{key}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="flex-1 overflow-auto">
            {generatedReport.data.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                  <tr>
                    {generatedReport.config.columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {getColumnLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {generatedReport.data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {generatedReport.config.columns.map((col) => (
                        <td key={col} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                {t('common.noData')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('customReports.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('customReports.description')}
          </p>
        </div>
        <button
          onClick={() => {
            resetBuilder()
            setShowBuilder(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('customReports.newTemplate')}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customReports.totalTemplates')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{templates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customReports.assetReports')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {templates.filter(t => t.type === 'assets').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customReports.interventionReports')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {templates.filter(t => t.type === 'interventions').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('customReports.technicianReports')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {templates.filter(t => t.type === 'technicians').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('customReports.savedTemplates')}
        </h2>
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(renderTemplateCard)}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('customReports.noTemplates')}</p>
            <button
              onClick={() => {
                resetBuilder()
                setShowBuilder(true)
              }}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              {t('customReports.createFirst')}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBuilder && renderBuilder()}
      {showPreview && renderPreview()}
    </div>
  )
}
