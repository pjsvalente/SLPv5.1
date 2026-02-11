import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconArrowLeft, IconEdit, IconTrash2, IconMapPin, IconCalendar, IconWrench,
  IconClock, IconLoader, IconCpu, IconCopy, IconSave
} from '@/components/icons'

interface Asset {
  id: number
  serial_number: string
  created_at: string
  updated_at?: string
  fields: Record<string, any>
  status_history?: StatusChange[]
}

interface StatusChange {
  id: number
  previous_status: string
  new_status: string
  description: string
  changed_at: string
  changed_by_name?: string
}

interface AssetModule {
  id: number
  module_name: string
  module_description: string
  serial_number: string
  updated_at?: string
}

export function AssetDetail() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { serialNumber } = useParams()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modules, setModules] = useState<AssetModule[]>([])
  const [editingModules, setEditingModules] = useState(false)
  const [moduleSerials, setModuleSerials] = useState<Record<string, string>>({})
  const [savingModules, setSavingModules] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateQuantity, setDuplicateQuantity] = useState(1)
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    loadAsset()
    loadModules()
  }, [serialNumber])

  const loadAsset = async () => {
    setLoading(true)
    try {
      const data = await api.get(`/assets/${serialNumber}`)
      setAsset(data)
    } catch (err: any) {
      setError(err.message || t('errors.ASSET_NOT_FOUND'))
    } finally {
      setLoading(false)
    }
  }

  const loadModules = async () => {
    try {
      const data = await api.get(`/assets/${serialNumber}/modules`)
      setModules(data.modules || [])
      const serials: Record<string, string> = {}
      data.modules?.forEach((m: AssetModule) => {
        serials[m.module_name] = m.serial_number || ''
      })
      setModuleSerials(serials)
    } catch (err) {
      console.error('Error loading modules:', err)
    }
  }

  const handleSaveModules = async () => {
    setSavingModules(true)
    try {
      const modulesData = Object.entries(moduleSerials).map(([name, serial]) => ({
        module_name: name,
        serial_number: serial
      }))
      await api.post(`/assets/${serialNumber}/modules/bulk`, { modules: modulesData })
      setEditingModules(false)
      loadModules()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingModules(false)
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const result = await api.post('/assets/duplicate', {
        serial_number: serialNumber,
        quantity: duplicateQuantity
      })
      setShowDuplicateDialog(false)
      navigate('/assets')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/assets/${serialNumber}`)
      navigate('/assets')
    } catch (err: any) {
      setError(err.message || t('errors.UNKNOWN_ERROR'))
      setShowDeleteDialog(false)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (date: string) => {
    const locale = i18n.language === 'pt' ? 'pt-PT' : i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'de' ? 'de-DE' : 'en-GB'
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/assets')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </button>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error || t('errors.ASSET_NOT_FOUND')}
        </div>
      </div>
    )
  }

  const fields = asset.fields || {}
  const status = fields.condition_status || fields.status

  // Group fields for display
  const fieldGroups = {
    identification: ['rfid_tag', 'product_reference', 'manufacturer', 'model'],
    location: ['installation_location', 'street_address', 'municipality', 'gps_latitude', 'gps_longitude'],
    specifications: ['height_meters', 'material', 'power_watts', 'connection_type'],
    dates: ['installation_date', 'warranty_end_date', 'last_inspection_date', 'next_inspection_date', 'next_maintenance_date']
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/assets')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {asset.serial_number}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {fields.product_reference || t('assetDetail.noReference')}
            </p>
            {status && <StatusBadge status={status} size="lg" />}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicateDialog(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <IconCopy className="h-4 w-4 mr-2" />
            {t('assets.duplicate') || 'Duplicar'}
          </button>
          <button
            onClick={() => navigate(`/assets/${serialNumber}/edit`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <IconEdit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <IconTrash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.categories.identification')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">{t('assets.serialNumber')}</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.serial_number}</dd>
              </div>
              {fieldGroups.identification.map(key => fields[key] && (
                <div key={key}>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{fields[key]}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <IconMapPin className="h-5 w-5" />
              {t('assets.location')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldGroups.location.map(key => fields[key] && (
                <div key={key}>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{fields[key]}</dd>
                </div>
              ))}
            </dl>
            {fields.gps_latitude && fields.gps_longitude && (
              <div className="mt-4">
                <a
                  href={`https://www.google.com/maps?q=${fields.gps_latitude},${fields.gps_longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {t('form.viewOnGoogleMaps')}
                </a>
              </div>
            )}
          </div>

          {/* Specifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <IconWrench className="h-5 w-5" />
              {t('settings.categories.specifications')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldGroups.specifications.map(key => fields[key] && (
                <div key={key}>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{fields[key]}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <IconCalendar className="h-5 w-5" />
              {t('assetDetail.importantDates')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">{t('common.createdAt')}</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(asset.created_at)}</dd>
              </div>
              {asset.updated_at && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('common.updatedAt')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(asset.updated_at)}</dd>
                </div>
              )}
              {fieldGroups.dates.map(key => fields[key] && (
                <div key={key}>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(fields[key]).toLocaleDateString('pt-PT')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Notes */}
          {fields.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('common.observations')}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {fields.notes}
              </p>
            </div>
          )}

          {/* Module Serials */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <IconCpu className="h-5 w-5" />
                {t('assets.modules') || 'Módulos/Equipamentos'}
              </h2>
              {editingModules ? (
                <button
                  onClick={handleSaveModules}
                  disabled={savingModules}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingModules ? <IconLoader className="h-4 w-4 mr-1 animate-spin" /> : <IconSave className="h-4 w-4 mr-1" />}
                  {t('common.save')}
                </button>
              ) : (
                <button
                  onClick={() => setEditingModules(true)}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <IconEdit className="h-4 w-4 mr-1" />
                  {t('common.edit')}
                </button>
              )}
            </div>

            {modules.length > 0 ? (
              <div className="space-y-3">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{module.module_name}</p>
                      {module.module_description && (
                        <p className="text-sm text-gray-500">{module.module_description}</p>
                      )}
                    </div>
                    {editingModules ? (
                      <input
                        type="text"
                        value={moduleSerials[module.module_name] || ''}
                        onChange={(e) => setModuleSerials(prev => ({ ...prev, [module.module_name]: e.target.value }))}
                        placeholder={t('assets.serialNumber') || 'Nº Série'}
                        className="w-48 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {module.serial_number || '-'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('assets.noModules') || 'Nenhum módulo configurado'}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <IconClock className="h-5 w-5" />
              {t('assetDetail.statusHistory')}
            </h2>
            {asset.status_history && asset.status_history.length > 0 ? (
              <div className="space-y-4">
                {asset.status_history.map((change, index) => (
                  <div key={change.id} className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {change.previous_status && (
                          <>
                            <StatusBadge status={change.previous_status} size="sm" />
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <StatusBadge status={change.new_status} size="sm" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {change.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(change.changed_at)}
                        {change.changed_by_name && ` ${t('common.by')} ${change.changed_by_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('assetDetail.noStatusHistory')}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('dashboard.quickActions')}
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/interventions/new?asset=${serialNumber}`)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t('interventions.newIntervention')}
              </button>
              <button
                onClick={() => navigate(`/interventions?asset=${serialNumber}`)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t('assetDetail.viewInterventions')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={t('assets.deleteAsset')}
        message={t('assets.confirmDelete')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={deleting}
      />

      {/* Duplicate Dialog */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('assets.duplicateAsset') || 'Duplicar Ativo'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('assets.duplicateDescription') || 'Os novos ativos terão estado Suspenso e sem RFID/GPS.'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assets.quantity') || 'Quantidade'}
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={duplicateQuantity}
                onChange={(e) => setDuplicateQuantity(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {duplicating ? <IconLoader className="h-4 w-4 mr-2 animate-spin" /> : <IconCopy className="h-4 w-4 mr-2" />}
                {t('assets.duplicate') || 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
