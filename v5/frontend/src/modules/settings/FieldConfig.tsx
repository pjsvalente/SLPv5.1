import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { IconSave as Save, IconLoader as Loader2, IconShield as Shield, IconTag as Tag, IconCheck as Check, IconX as X, IconLock as Lock } from '@/components/icons'

interface TenantField {
  id: number
  field_name: string
  field_type: string
  field_label: string
  field_label_pt: string
  field_category: string
  field_options?: string[]
  field_order: number
  is_system: number
  is_required_default: number
  is_active: number
  is_required: number
  custom_label?: string
  custom_order?: number
}

const FieldConfig: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [fields, setFields] = useState<TenantField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadFields()
  }, [i18n.language])

  const loadFields = async () => {
    try {
      const data = await api.get(`/settings/fields?lang=${i18n.language}`)
      setFields(data.fields || [])
      setHasChanges(false)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = (fieldName: string) => {
    setFields(prev => prev.map(f => {
      if (f.field_name === fieldName && !f.is_system) {
        return { ...f, is_active: f.is_active ? 0 : 1 }
      }
      return f
    }))
    setHasChanges(true)
  }

  const handleToggleRequired = (fieldName: string) => {
    setFields(prev => prev.map(f => {
      if (f.field_name === fieldName) {
        return { ...f, is_required: f.is_required ? 0 : 1 }
      }
      return f
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fieldsToUpdate = fields.map(f => ({
        field_name: f.field_name,
        is_active: f.is_active,
        is_required: f.is_required
      }))

      await api.put('/settings/fields/bulk', { fields: fieldsToUpdate })
      setMessage({ type: 'success', text: t('settings.saved') })
      setHasChanges(false)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const categoryLabels: Record<string, string> = {
    identification: t('settings.categories.identification'),
    specifications: t('settings.categories.specifications'),
    installation: t('settings.categories.installation'),
    warranty: t('settings.categories.warranty'),
    maintenance: t('settings.categories.maintenance'),
    equipment: t('settings.categories.equipment'),
    other: t('settings.categories.other')
  }

  // Group fields by category
  const groupedFields: Record<string, TenantField[]> = {}
  fields.forEach(field => {
    const cat = field.field_category || 'other'
    if (!groupedFields[cat]) groupedFields[cat] = []
    groupedFields[cat].push(field)
  })

  const categoryOrder = ['identification', 'specifications', 'installation', 'warranty', 'maintenance', 'equipment', 'other']

  // Count active and total
  const activeCount = fields.filter(f => f.is_active).length
  const totalCount = fields.length

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.fieldConfigDescription') || 'Ativar/desativar campos visíveis no formulário de ativos'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {activeCount} / {totalCount} {t('settings.fieldsActive') || 'campos ativos'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('common.save')}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Fields grouped by category */}
      {categoryOrder.map(catKey => {
        const catFields = groupedFields[catKey]
        if (!catFields || catFields.length === 0) return null

        return (
          <div key={catKey} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              {categoryLabels[catKey] || catKey}
            </h3>
            <div className="space-y-2">
              {catFields.sort((a, b) => a.field_order - b.field_order).map(field => (
                <div
                  key={field.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    field.is_active
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                      : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {field.is_system ? (
                      <Shield className="h-5 w-5 text-blue-500" title={t('settings.systemField')} />
                    ) : (
                      <Tag className="h-5 w-5 text-gray-400" title={t('settings.customField')} />
                    )}
                    <div>
                      <p className={`font-medium ${field.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {field.field_label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{field.field_name}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Required toggle */}
                    {field.is_active === 1 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.is_required === 1}
                          onChange={() => handleToggleRequired(field.field_name)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('common.required')}
                        </span>
                      </label>
                    )}

                    {/* Active toggle */}
                    {field.is_system ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                        <Lock className="h-3 w-3" />
                        {t('settings.alwaysActive')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(field.field_name)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                          field.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                        }`}
                      >
                        {field.is_active ? (
                          <>
                            <Check className="h-3 w-3" />
                            {t('settings.fieldActive') || 'Ativo'}
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" />
                            {t('settings.fieldInactive') || 'Inativo'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Save button fixed at bottom if there are changes */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            {t('settings.saveChanges') || 'Guardar Alterações'}
          </button>
        </div>
      )}
    </div>
  )
}

export default FieldConfig
