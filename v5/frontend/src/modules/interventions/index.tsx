import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FormField } from '@/components/ui/FormField'
import { FileUpload } from '@/components/ui/FileUpload'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FilterBar } from '@/components/ui/FilterBar'
import { useToastActions } from '@/components/ui/Toast'
import { useLanguage } from '@/hooks/useLanguage'
import {
  Plus, ArrowLeft, Save, Loader2, CheckCircle, XCircle, Clock,
  FileText, Upload, Trash2, Edit2, Download, FolderOpen, Image, FileSpreadsheet,
  BarChart3, Calendar, User
} from 'lucide-react'

interface Intervention {
  id: number
  intervention_type: string
  status: string
  asset_serial: string
  problem_description?: string
  solution_description?: string
  created_at: string
  completed_at?: string
  created_by_name?: string
  total_cost?: number
  duration_hours?: number
}

interface TimeLog {
  id: number
  time_spent: number
  work_date: string
  description?: string
  logged_by_email?: string
  logged_by_name?: string
  created_at: string
}

interface InterventionFile {
  id: number
  file_name: string
  original_name: string
  file_category: string
  file_type: string
  file_size: number
  description?: string
  uploaded_by_email?: string
  uploaded_by_name?: string
  uploaded_at: string
}

const FILE_CATEGORIES = [
  { value: 'documento', label: 'documents', icon: FileText },
  { value: 'foto_antes', label: 'photosBefore', icon: Image },
  { value: 'foto_depois', label: 'photosAfter', icon: Image },
  { value: 'relatorio', label: 'reports', icon: FileSpreadsheet },
  { value: 'outros', label: 'others', icon: FolderOpen }
]

// Intervention List
const InterventionsList: React.FC = () => {
  const { t } = useTranslation()
  const { formatDate } = useLanguage()
  const navigate = useNavigate()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadInterventions()
  }, [page, statusFilter, typeFilter])

  const loadInterventions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), per_page: '20' })
      if (search) params.append('asset', search)
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const data = await api.get(`/interventions?${params}`)
      setInterventions(data.data || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error loading interventions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    loadInterventions()
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (value: number) => `#${value}`
    },
    {
      key: 'intervention_type',
      label: t('common.type'),
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'asset_serial',
      label: t('interventions.asset'),
      render: (value: string) => value || '-'
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'created_at',
      label: t('common.createdAt'),
      render: (value: string) => formatDate(value)
    },
    {
      key: 'created_by_name',
      label: t('interventions.assignedTo'),
      render: (value: string) => value || '-'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('interventions.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination?.total || 0} {t('interventions.title').toLowerCase()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            name: 'status',
            label: t('common.status'),
            value: statusFilter,
            onChange: (value) => { setStatusFilter(value); setPage(1) },
            options: [
              { value: 'em_curso', label: t('interventions.statuses.inProgress') },
              { value: 'concluida', label: t('interventions.statuses.completed') },
              { value: 'cancelada', label: t('interventions.statuses.cancelled') }
            ]
          },
          {
            name: 'type',
            label: t('common.type'),
            value: typeFilter,
            onChange: (value) => { setTypeFilter(value); setPage(1) },
            options: [
              { value: 'preventiva', label: t('interventions.types.preventive') },
              { value: 'corretiva', label: t('interventions.types.corrective') },
              { value: 'substituicao', label: t('interventions.types.installation') },
              { value: 'inspecao', label: t('interventions.types.inspection') }
            ]
          }
        ]}
        onReset={() => {
          setStatusFilter('')
          setTypeFilter('')
          setPage(1)
        }}
      />

      <DataTable
        data={interventions}
        columns={columns}
        loading={loading}
        searchable
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder={`${t('common.search')} ${t('interventions.asset').toLowerCase()}...`}
        onRowClick={(int) => navigate(`/interventions/${int.id}`)}
        emptyMessage={t('table.noResults')}
        pagination={pagination ? {
          page: pagination.page,
          perPage: pagination.per_page,
          total: pagination.total,
          onPageChange: setPage
        } : undefined}
        actions={
          <button
            onClick={() => navigate('/interventions/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('interventions.newIntervention')}
          </button>
        }
      />
    </div>
  )
}

// Intervention Form
const InterventionForm: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToastActions()
  const [searchParams] = useSearchParams()
  const preselectedAsset = searchParams.get('asset') || ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assets, setAssets] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [formData, setFormData] = useState({
    asset_serial: preselectedAsset,
    intervention_type: 'corretiva',
    problem_description: '',
    notes: '',
    technicians: [] as number[]
  })

  useEffect(() => {
    loadAssets()
    loadTechnicians()
  }, [])

  const loadAssets = async () => {
    try {
      const data = await api.get('/assets?per_page=1000')
      setAssets(data.data || [])
    } catch (err) {
      console.error('Error loading assets:', err)
    }
  }

  const loadTechnicians = async () => {
    try {
      const data = await api.get('/users')
      setTechnicians((data.users || data || []).filter((u: any) =>
        ['operator', 'admin', 'superadmin'].includes(u.role)
      ))
    } catch (err) {
      console.error('Error loading technicians:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        technicians: formData.technicians.map(id => ({ user_id: id, role: 'participante' }))
      }
      const result = await api.post('/interventions', payload)
      toast.success(t('interventions.interventionCreated'))
      setTimeout(() => navigate(`/interventions/${result.id}`), 1500)
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('interventions.newIntervention')}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('interventions.interventionDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('interventions.asset')}
              name="asset_serial"
              type="select"
              value={formData.asset_serial}
              onChange={(v) => setFormData({ ...formData, asset_serial: String(v) })}
              options={assets.map(a => ({ value: a.serial_number, label: `${a.serial_number} - ${a.product_reference || ''}` }))}
              required
            />
            <FormField
              label={t('interventions.interventionType')}
              name="intervention_type"
              type="select"
              value={formData.intervention_type}
              onChange={(v) => setFormData({ ...formData, intervention_type: String(v) })}
              options={[
                { value: 'preventiva', label: t('interventions.types.preventive') },
                { value: 'corretiva', label: t('interventions.types.corrective') },
                { value: 'substituicao', label: t('interventions.types.installation') },
                { value: 'inspecao', label: t('interventions.types.inspection') }
              ]}
              required
            />
            <FormField
              label={t('interventions.problemDescription')}
              name="problem_description"
              type="textarea"
              value={formData.problem_description}
              onChange={(v) => setFormData({ ...formData, problem_description: String(v) })}
              className="md:col-span-2"
            />
            <FormField
              label={t('common.notes')}
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={(v) => setFormData({ ...formData, notes: String(v) })}
              className="md:col-span-2"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('interventions.technician')}</h2>
          <div className="space-y-2">
            {technicians.map(tech => (
              <label key={tech.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.technicians.includes(tech.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, technicians: [...formData.technicians, tech.id] })
                    } else {
                      setFormData({ ...formData, technicians: formData.technicians.filter(id => id !== tech.id) })
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>{tech.first_name || tech.email}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={loading} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('common.create')}
          </button>
        </div>
      </form>
    </div>
  )
}

// Time Log Edit Modal
const TimeLogEditModal: React.FC<{
  log: TimeLog | null
  onClose: () => void
  onSave: (id: number, data: any) => Promise<void>
}> = ({ log, onClose, onSave }) => {
  const { t } = useTranslation()
  const [timeSpent, setTimeSpent] = useState(log?.time_spent?.toString() || '')
  const [workDate, setWorkDate] = useState(log?.work_date || '')
  const [description, setDescription] = useState(log?.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!log) return
    setSaving(true)
    await onSave(log.id, {
      time_spent: parseFloat(timeSpent),
      work_date: workDate,
      description
    })
    setSaving(false)
    onClose()
  }

  if (!log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{t('interventions.editTimeLog')}</h3>
        <div className="space-y-4">
          <FormField
            label={t('interventions.hours')}
            name="time_spent"
            type="number"
            value={timeSpent}
            onChange={(v) => setTimeSpent(String(v))}
          />
          <FormField
            label={t('interventions.workDate')}
            name="work_date"
            type="date"
            value={workDate}
            onChange={(v) => setWorkDate(String(v))}
          />
          <FormField
            label={t('common.description')}
            name="description"
            type="textarea"
            value={description}
            onChange={(v) => setDescription(String(v))}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// File Upload Modal
const FileUploadModal: React.FC<{
  interventionId: string
  onClose: () => void
  onSuccess: () => void
}> = ({ interventionId, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState('documento')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('category', category)
    formData.append('description', description)

    try {
      await api.post(`/interventions/${interventionId}/files/multiple`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total))
        }
      })
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">{t('interventions.uploadFiles')}</h3>

        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">{t('interventions.dropFilesHere')}</p>
            <p className="text-sm text-gray-500">{t('interventions.maxFileSize')}: 3MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">{files.length} {t('common.files')}:</p>
              <ul className="space-y-1 text-sm max-h-32 overflow-y-auto">
                {files.map((file, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500 ml-2">{formatSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FormField
            label={t('interventions.fileCategory')}
            name="category"
            type="select"
            value={category}
            onChange={(v) => setCategory(String(v))}
            options={FILE_CATEGORIES.map(c => ({
              value: c.value,
              label: t(`interventions.fileCategories.${c.label}`)
            }))}
          />

          <FormField
            label={t('common.description')}
            name="description"
            type="textarea"
            value={description}
            onChange={(v) => setDescription(String(v))}
          />

          {uploading && (
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-gray-600 dark:text-gray-400">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('common.upload')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Intervention Detail
const InterventionDetail: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToastActions()
  const { interventionId } = useParams()
  const [intervention, setIntervention] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [finalStatus, setFinalStatus] = useState('Operacional')
  const [solution, setSolution] = useState('')
  const [timeSpent, setTimeSpent] = useState('')
  const [timeDesc, setTimeDesc] = useState('')
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0])
  const [editingTimeLog, setEditingTimeLog] = useState<TimeLog | null>(null)
  const [deletingTimeLogId, setDeletingTimeLogId] = useState<number | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null)
  const [timeStats, setTimeStats] = useState<any>(null)
  const [fileStats, setFileStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'time'>('details')

  useEffect(() => {
    loadIntervention()
  }, [interventionId])

  const loadIntervention = async () => {
    try {
      const [data, timeData, fileData] = await Promise.all([
        api.get(`/interventions/${interventionId}`),
        api.get(`/interventions/${interventionId}/time`),
        api.get(`/interventions/${interventionId}/files`)
      ])
      setIntervention(data)
      setSolution(data.solution_description || '')
      setTimeStats(timeData.statistics)
      setFileStats(fileData.statistics)
      // Merge detailed time logs and files
      data.time_logs = timeData.time_logs || data.time_logs
      data.files = fileData.files || data.files
      data.files_by_category = fileData.by_category
      setIntervention({ ...data })
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await api.post(`/interventions/${interventionId}/complete`, {
        solution_description: solution,
        final_asset_status: finalStatus
      })
      toast.success(t('interventions.interventionCompleted'))
      loadIntervention()
      setShowCompleteDialog(false)
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await api.post(`/interventions/${interventionId}/cancel`, { reason: 'Cancelada pelo utilizador' })
      toast.warning(t('interventions.interventionCancelled'))
      loadIntervention()
      setShowCancelDialog(false)
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogTime = async () => {
    if (!timeSpent || parseFloat(timeSpent) <= 0) return
    try {
      await api.post(`/interventions/${interventionId}/time`, {
        time_spent: parseFloat(timeSpent),
        work_date: workDate,
        description: timeDesc
      })
      toast.success(t('interventions.timeLogged'))
      setTimeSpent('')
      setTimeDesc('')
      loadIntervention()
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
      setError(err.message)
    }
  }

  const handleUpdateTimeLog = async (logId: number, data: any) => {
    try {
      await api.put(`/interventions/${interventionId}/time/${logId}`, data)
      toast.success(t('interventions.timeLogUpdated'))
      loadIntervention()
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
    }
  }

  const handleDeleteTimeLog = async () => {
    if (!deletingTimeLogId) return
    try {
      await api.delete(`/interventions/${interventionId}/time/${deletingTimeLogId}`)
      toast.success(t('interventions.timeLogDeleted'))
      setDeletingTimeLogId(null)
      loadIntervention()
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
    }
  }

  const handleDeleteFile = async () => {
    if (!deletingFileId) return
    try {
      await api.delete(`/interventions/${interventionId}/files/${deletingFileId}`)
      toast.success(t('common.fileDeleted'))
      setDeletingFileId(null)
      loadIntervention()
    } catch (err: any) {
      toast.error(t('common.error'), err.message)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getCategoryIcon = (category: string) => {
    const cat = FILE_CATEGORIES.find(c => c.value === category)
    return cat ? cat.icon : FileText
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!intervention) {
    return <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">{error || t('common.notFound')}</div>
  }

  const totalTime = timeStats?.total_hours || (intervention.time_logs || []).reduce((sum: number, log: any) => sum + log.time_spent, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/interventions')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('interventions.title')} #{intervention.id}</h1>
            <p className="text-gray-500">{t('interventions.asset')}: {intervention.asset_serial}</p>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={intervention.intervention_type} />
              <StatusBadge status={intervention.status} />
            </div>
          </div>
        </div>
        {intervention.status === 'em_curso' && (
          <div className="flex gap-2">
            <button onClick={() => setShowCompleteDialog(true)} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('interventions.statuses.completed')}
            </button>
            <button onClick={() => setShowCancelDialog(true)} className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <XCircle className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('interventions.totalHours')}</p>
            <p className="text-2xl font-bold">{totalTime.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('common.files')}</p>
            <p className="text-2xl font-bold">{fileStats?.total_files || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('interventions.timeEntries')}</p>
            <p className="text-2xl font-bold">{timeStats?.total_entries || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          {(['details', 'files', 'time'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t(`interventions.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('interventions.interventionDetails')}</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">{t('common.createdAt')}</dt>
                  <dd className="font-medium">{new Date(intervention.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">{t('common.createdBy')}</dt>
                  <dd className="font-medium">{intervention.created_by_name || intervention.created_by_email}</dd>
                </div>
                {intervention.completed_at && (
                  <div>
                    <dt className="text-sm text-gray-500">{t('interventions.completedDate')}</dt>
                    <dd className="font-medium">{new Date(intervention.completed_at).toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-gray-500">{t('interventions.laborHours')}</dt>
                  <dd className="font-medium">{totalTime.toFixed(1)} h</dd>
                </div>
              </dl>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('common.description')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t('interventions.problemDescription')}</h3>
                  <p className="mt-1">{intervention.problem_description || '-'}</p>
                </div>
                {intervention.solution_description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{t('interventions.solutionDescription')}</h3>
                    <p className="mt-1">{intervention.solution_description}</p>
                  </div>
                )}
                {intervention.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{t('common.notes')}</h3>
                    <p className="mt-1">{intervention.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Technicians */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('technicians.title')}</h2>
              {(intervention.technicians || []).length > 0 ? (
                <ul className="space-y-2">
                  {intervention.technicians.map((tech: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      {tech.user_name || tech.user_email || tech.external_name || t('interventions.technician')}
                      {tech.external_company && ` (${tech.external_company})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">{t('interventions.noTechniciansAssigned')}</p>
              )}
            </div>

            {/* Updates */}
            {(intervention.updates || []).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">{t('interventions.updates')}</h2>
                <ul className="space-y-3">
                  {intervention.updates.slice(0, 5).map((upd: any) => (
                    <li key={upd.id} className="text-sm border-l-2 border-blue-500 pl-3">
                      <p className="font-medium">{upd.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(upd.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Upload Button */}
          {intervention.status === 'em_curso' && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('interventions.uploadFiles')}
              </button>
            </div>
          )}

          {/* Files by Category */}
          {FILE_CATEGORIES.map((cat) => {
            const files = intervention.files_by_category?.[cat.value] || []
            if (files.length === 0) return null
            const Icon = cat.icon

            return (
              <div key={cat.value} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-gray-500" />
                  {t(`interventions.fileCategories.${cat.label}`)}
                  <span className="text-sm font-normal text-gray-500">({files.length})</span>
                </h3>
                <ul className="space-y-2">
                  {files.map((file: InterventionFile) => (
                    <li key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{file.original_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                            {file.uploaded_by_name && ` • ${file.uploaded_by_name}`}
                          </p>
                          {file.description && (
                            <p className="text-sm text-gray-500 mt-1">{file.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <a
                          href={`/api/interventions/${interventionId}/files/${file.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title={t('common.download')}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {intervention.status === 'em_curso' && (
                          <button
                            onClick={() => setDeletingFileId(file.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {(intervention.files || []).length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{t('common.noFiles')}</p>
              {intervention.status === 'em_curso' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  {t('interventions.uploadFirstFile')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'time' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Time Log Form */}
            {intervention.status === 'em_curso' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">{t('interventions.logTime')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    label={t('interventions.hours')}
                    name="time_spent"
                    type="number"
                    value={timeSpent}
                    onChange={(v) => setTimeSpent(String(v))}
                  />
                  <FormField
                    label={t('interventions.workDate')}
                    name="work_date"
                    type="date"
                    value={workDate}
                    onChange={(v) => setWorkDate(String(v))}
                  />
                  <FormField
                    label={t('common.description')}
                    name="time_desc"
                    type="text"
                    value={timeDesc}
                    onChange={(v) => setTimeDesc(String(v))}
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleLogTime}
                    disabled={!timeSpent || parseFloat(timeSpent) <= 0}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t('interventions.register')}
                  </button>
                </div>
              </div>
            )}

            {/* Time Logs List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('interventions.timeLog')}</h2>
              {(intervention.time_logs || []).length > 0 ? (
                <ul className="space-y-3">
                  {intervention.time_logs.map((log: TimeLog) => (
                    <li key={log.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold text-blue-600">{log.time_spent}h</span>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(log.work_date).toLocaleDateString()}
                          </span>
                          {log.logged_by_name && (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <User className="h-4 w-4" />
                              {log.logged_by_name}
                            </span>
                          )}
                        </div>
                        {log.description && (
                          <p className="text-gray-600 dark:text-gray-300 mt-2">{log.description}</p>
                        )}
                      </div>
                      {intervention.status === 'em_curso' && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setEditingTimeLog(log)}
                            className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                            title={t('common.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTimeLogId(log.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{t('interventions.noTimeLogs')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Time Statistics Sidebar */}
          <div className="space-y-6">
            {timeStats && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('interventions.timeByUser')}</h3>
                  {Object.keys(timeStats.by_user || {}).length > 0 ? (
                    <ul className="space-y-3">
                      {Object.entries(timeStats.by_user).map(([user, hours]: [string, any]) => (
                        <li key={user} className="flex justify-between items-center">
                          <span className="text-sm truncate">{user}</span>
                          <span className="font-semibold text-blue-600">{hours.toFixed(1)}h</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">{t('interventions.noData')}</p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('interventions.timeByDate')}</h3>
                  {Object.keys(timeStats.by_date || {}).length > 0 ? (
                    <ul className="space-y-3">
                      {Object.entries(timeStats.by_date).slice(0, 7).map(([date, hours]: [string, any]) => (
                        <li key={date} className="flex justify-between items-center">
                          <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                          <span className="font-semibold text-blue-600">{hours.toFixed(1)}h</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">{t('interventions.noData')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Complete Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('interventions.completeIntervention')}</h3>
            <div className="space-y-4">
              <FormField
                label={t('interventions.solutionDescription')}
                name="solution"
                type="textarea"
                value={solution}
                onChange={(v) => setSolution(String(v))}
              />
              <FormField
                label={t('interventions.finalAssetStatus')}
                name="final_status"
                type="select"
                value={finalStatus}
                onChange={(v) => setFinalStatus(String(v))}
                options={['Operacional', 'Manutencao Necessaria', 'Desativado']}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCompleteDialog(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">{t('common.cancel')}</button>
              <button onClick={handleComplete} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('interventions.complete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Time Log Modal */}
      {editingTimeLog && (
        <TimeLogEditModal
          log={editingTimeLog}
          onClose={() => setEditingTimeLog(null)}
          onSave={handleUpdateTimeLog}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploadModal
          interventionId={interventionId!}
          onClose={() => setShowUploadModal(false)}
          onSuccess={loadIntervention}
        />
      )}

      {/* Delete Time Log Confirm */}
      <ConfirmDialog
        isOpen={!!deletingTimeLogId}
        onClose={() => setDeletingTimeLogId(null)}
        onConfirm={handleDeleteTimeLog}
        title={t('interventions.deleteTimeLog')}
        message={t('interventions.deleteTimeLogConfirm')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Delete File Confirm */}
      <ConfirmDialog
        isOpen={!!deletingFileId}
        onClose={() => setDeletingFileId(null)}
        onConfirm={handleDeleteFile}
        title={t('common.deleteFile')}
        message={t('common.deleteFileConfirm')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Cancel Intervention Confirm */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title={t('interventions.cancelIntervention')}
        message={t('interventions.cancelConfirmMessage')}
        confirmText={t('interventions.cancelIntervention')}
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}

const Interventions: React.FC = () => {
  return (
    <Routes>
      <Route index element={<InterventionsList />} />
      <Route path="new" element={<InterventionForm />} />
      <Route path=":interventionId" element={<InterventionDetail />} />
    </Routes>
  )
}

export default Interventions
