import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { FormField } from '@/components/ui/FormField'
import { useToastActions } from '@/components/ui/Toast'
import { IconArrowLeft, IconSave, IconLoader, IconSettings, IconZap, IconCheckCircle, IconXCircle } from '@/components/icons'
import { ReferenceConfigurator } from '@/modules/catalog/ReferenceConfigurator'

interface SchemaField {
  id: number
  field_name: string
  field_type: string
  field_label: string
  required: boolean
  field_order: number
  field_category: string
  field_options?: string[]
}

interface ConfigurationResult {
  column_reference: string
  column_id: number
  pack: string
  height_m: number
  modules: {
    luminaire_id: number | null
    electrical_panel_id: number | null
    fuse_box_id: number | null
    telemetry_id: number | null
    ev_charger_id: number | null
    mupi_id: number | null
    lateral_id: number | null
    antenna_id: number | null
  }
  power_calculation: {
    max_power: number
    installed_power: number
    remaining_power: number
    connection_type: string
    power_source: string
    is_valid: boolean
    modules: Array<{ name: string; power: number }>
  }
}

interface AssetFormProps {
  mode: 'create' | 'edit'
}

export function AssetForm({ mode }: AssetFormProps) {
  const navigate = useNavigate()
  const { serialNumber } = useParams()
  const { i18n, t } = useTranslation()
  const toast = useToastActions()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [schema, setSchema] = useState<SchemaField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({
    serial_number: ''
  })

  // Reference Configurator state
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [configurationApplied, setConfigurationApplied] = useState<ConfigurationResult | null>(null)

  useEffect(() => {
    loadSchema()
    if (mode === 'edit' && serialNumber) {
      loadAsset()
    } else if (mode === 'create') {
      loadNextNumber()
    }
  }, [mode, serialNumber, i18n.language])

  const loadSchema = async () => {
    try {
      // Use the new endpoint that returns only active fields for the tenant
      const data = await api.get(`/settings/fields/active?lang=${i18n.language}`)
      setSchema(data.fields || [])
    } catch (err) {
      console.error('Error loading schema:', err)
      // Fallback to old endpoint if new one fails
      try {
        const data = await api.get('/assets/schema')
        // The /assets/schema endpoint returns an array directly, not { fields: [...] }
        setSchema(Array.isArray(data) ? data : (data.fields || []))
      } catch (fallbackErr) {
        console.error('Error loading schema (fallback):', fallbackErr)
      }
    }
  }

  const loadNextNumber = async () => {
    try {
      const data = await api.get('/assets/next-number')
      setFormData(prev => ({ ...prev, serial_number: data.next_number || '' }))
    } catch (err) {
      console.error('Error loading next number:', err)
    }
  }

  const loadAsset = async () => {
    setLoading(true)
    try {
      const data = await api.get(`/assets/${serialNumber}`)
      const assetData: Record<string, any> = {
        serial_number: data.serial_number
      }

      // Copy all fields from response (they come directly at root level, not in 'fields' object)
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'serial_number' && key !== 'created_at' &&
            key !== 'updated_at' && key !== 'created_by' && key !== 'updated_by' &&
            key !== 'status_history') {
          assetData[key] = data[key]
        }
      })

      // Reconstruct gps_coordinates from gps_latitude and gps_longitude
      if (assetData.gps_latitude && assetData.gps_longitude) {
        assetData.gps_coordinates = `${assetData.gps_latitude}, ${assetData.gps_longitude}`
      }

      setFormData(assetData)
    } catch (err: any) {
      setError(err.message || t('errors.ASSET_NOT_FOUND'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  // Handle configuration applied from ReferenceConfigurator
  const handleConfigurationComplete = (config: ConfigurationResult) => {
    setConfigurationApplied(config)
    setShowConfigurator(false)

    // Apply configuration to form data
    const updatedFormData = { ...formData }

    // Set product reference
    updatedFormData.product_reference = config.column_reference

    // Set height
    if (config.height_m) {
      updatedFormData.height_meters = config.height_m
    }

    // Set electrical balance data
    if (config.power_calculation) {
      updatedFormData.electrical_max_power = config.power_calculation.max_power
      updatedFormData.total_installed_power = config.power_calculation.installed_power
      updatedFormData.remaining_power = config.power_calculation.remaining_power
      updatedFormData.electrical_connection_type = config.power_calculation.connection_type
    }

    // Set power
    if (config.power_calculation?.installed_power) {
      updatedFormData.power_watts = config.power_calculation.installed_power
    }

    setFormData(updatedFormData)
    toast.success(t('configurator.apply'))
  }

  const validateOperationalStatus = async () => {
    // Check if status is Operacional and validate required fields
    const status = formData.condition_status || formData.status
    if (status === 'Operacional') {
      const requiredForOperational = ['rfid_tag', 'manufacturer', 'model']
      const missing = requiredForOperational.filter(field => !formData[field]?.toString().trim())

      if (missing.length > 0) {
        const labels: Record<string, string> = {
          rfid_tag: 'RFID Tag',
          manufacturer: t('assets.manufacturer') || 'Fabricante',
          model: t('assets.model') || 'Modelo'
        }
        const missingLabels = missing.map(f => labels[f]).join(', ')
        throw new Error(`Para estado Operacional, preencha: ${missingLabels}`)
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Validate operational status requirements
      await validateOperationalStatus()

      // Prepare data - separate serial_number from dynamic fields
      const { serial_number, ...fields } = formData

      // Add configuration data if applied
      if (configurationApplied) {
        fields.catalog_column_id = configurationApplied.column_id
        fields.catalog_configuration = JSON.stringify({
          modules: configurationApplied.modules,
          power_calculation: configurationApplied.power_calculation
        })
      }

      if (mode === 'create') {
        await api.post('/assets', { serial_number, ...fields })
        toast.success(t('assets.assetCreated'))
        setTimeout(() => navigate('/assets'), 1500)
      } else {
        await api.put(`/assets/${serialNumber}`, fields)
        toast.success(t('assets.assetUpdated'))
        setTimeout(() => navigate(`/assets/${serialNumber}`), 1500)
      }
    } catch (err: any) {
      toast.error(t('errors.UNKNOWN_ERROR'), err.message)
      setError(err.message || t('errors.UNKNOWN_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  // Group fields by category
  const categories: Record<string, SchemaField[]> = {}
  schema.forEach(field => {
    const cat = field.field_category || 'other'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(field)
  })

  const categoryLabels: Record<string, string> = {
    identification: t('settings.categories.identification') || 'Identificação',
    specifications: t('settings.categories.specifications') || 'Especificações',
    installation: t('settings.categories.installation') || 'Instalação',
    warranty: t('settings.categories.warranty') || 'Garantia',
    maintenance: t('settings.categories.maintenance') || 'Manutenção',
    equipment: t('settings.categories.equipment') || 'Equipamento',
    other: t('settings.categories.other') || 'Outros'
  }

  const categoryOrder = ['identification', 'specifications', 'installation', 'warranty', 'maintenance', 'equipment', 'other']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
        >
          <IconArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {mode === 'create' ? t('assets.newAsset') : t('assets.editAsset')}
          </h1>
          {mode === 'edit' && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{serialNumber}</p>
          )}
        </div>

        {/* Reference Configurator Button */}
        <button
          type="button"
          onClick={() => setShowConfigurator(true)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs sm:text-sm flex-shrink-0"
        >
          <IconSettings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('configurator.openConfigurator')}</span>
          <span className="sm:hidden">{t('configurator.title')}</span>
        </button>
      </div>

      {/* Configuration Applied Banner */}
      {configurationApplied && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <IconCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm sm:text-base text-green-800 dark:text-green-200 truncate">
                {t('configurator.title')} - {configurationApplied.column_reference}
              </h3>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1">
                Pack: {configurationApplied.pack} • {configurationApplied.height_m}m
              </p>

              {/* Electrical Balance Summary */}
              {configurationApplied.power_calculation && (
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                    <IconZap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                    <span>{configurationApplied.power_calculation.max_power}W max</span>
                  </div>
                  <span className="text-gray-400 hidden sm:inline">→</span>
                  <span>{configurationApplied.power_calculation.installed_power}W {t('configurator.installedPower')}</span>
                  <span className="text-gray-400 hidden sm:inline">→</span>
                  <span className={configurationApplied.power_calculation.is_valid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {configurationApplied.power_calculation.remaining_power}W {t('configurator.remainingPower')}
                  </span>
                  {configurationApplied.power_calculation.is_valid ? (
                    <IconCheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  ) : (
                    <IconXCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowConfigurator(true)}
              className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium flex-shrink-0"
            >
              {t('common.edit')}
            </button>
          </div>
        </div>
      )}

      {/* Error message (inline for validation errors) */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8">
        {/* Serial Number - always first */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            {t('assets.serialNumber')}
          </h2>
          <FormField
            label={t('assets.serialNumber')}
            name="serial_number"
            type="text"
            value={formData.serial_number || ''}
            onChange={(value) => handleChange('serial_number', value)}
            required
            disabled={mode === 'edit'}
            helpText={mode === 'create' ? t('assetForm.autoGeneratedNumber') : undefined}
          />
        </div>

        {/* Dynamic fields by category */}
        {categoryOrder.map(catKey => {
          const fields = categories[catKey]
          if (!fields || fields.length === 0) return null

          return (
            <div key={catKey} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                {categoryLabels[catKey] || catKey}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {fields
                  .sort((a, b) => a.field_order - b.field_order)
                  // Hide separate lat/lng fields since gps_coordinates handles both
                  .filter(field => !['gps_latitude', 'gps_longitude'].includes(field.field_name))
                  .map(field => {
                    let options: string[] = []
                    if (field.field_options) {
                      try {
                        options = typeof field.field_options === 'string'
                          ? JSON.parse(field.field_options)
                          : field.field_options
                      } catch {
                        options = []
                      }
                    }

                    // Check if this field was filled by configurator
                    const filledByConfigurator = configurationApplied && (
                      field.field_name === 'product_reference' ||
                      field.field_name === 'height_meters' ||
                      field.field_name === 'power_watts' ||
                      field.field_name === 'electrical_max_power' ||
                      field.field_name === 'total_installed_power' ||
                      field.field_name === 'remaining_power' ||
                      field.field_name === 'electrical_connection_type'
                    )

                    return (
                      <FormField
                        key={field.id}
                        label={field.field_label}
                        name={field.field_name}
                        type={field.field_type as any}
                        value={formData[field.field_name] ?? ''}
                        onChange={(value) => handleChange(field.field_name, value)}
                        required={Boolean(field.required)}
                        options={options}
                        className={`${field.field_type === 'textarea' || field.field_type === 'gps' ? 'md:col-span-2' : ''} ${filledByConfigurator ? 'ring-2 ring-purple-200 dark:ring-purple-800 rounded-lg' : ''}`}
                        helpText={filledByConfigurator ? t('configurator.title') : undefined}
                      />
                    )
                  })}
              </div>
            </div>
          )
        })}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm sm:text-base order-2 sm:order-1"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
          >
            {saving ? (
              <>
                <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <IconSave className="h-4 w-4 mr-2" />
                {mode === 'create' ? t('assets.newAsset') : t('common.save')}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Reference Configurator Modal */}
      {showConfigurator && (
        <ReferenceConfigurator
          onComplete={handleConfigurationComplete}
          onCancel={() => setShowConfigurator(false)}
          initialColumn={configurationApplied?.column_id}
        />
      )}
    </div>
  )
}
