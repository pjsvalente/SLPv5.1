import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { FormField } from '@/components/ui/FormField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconSave as Save, IconLoader as Loader2, IconPlus as Plus, IconTrash2 as Trash2, IconShield as Shield, IconTag as Tag, IconEdit as Edit, IconX as X } from '@/components/icons'

interface CatalogField {
  id: number
  field_name: string
  field_type: string
  field_label_pt: string
  field_label_en: string
  field_label_fr: string
  field_label_de: string
  field_category: string
  field_options?: string[]
  field_order: number
  is_system: number
  is_required_default: number
}

const FieldCatalog: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [fields, setFields] = useState<CatalogField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState<CatalogField | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: 'text',
    field_label_pt: '',
    field_label_en: '',
    field_label_fr: '',
    field_label_de: '',
    field_category: 'other',
    field_options: '',
    is_required_default: false
  })

  useEffect(() => {
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    try {
      const data = await api.get('/settings/field-catalog')
      console.log('Field catalog data:', data)
      setFields(data.fields || [])
    } catch (err: any) {
      console.error('Field catalog error:', err)
      setMessage({ type: 'error', text: err.message || 'Erro ao carregar catálogo' })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const payload: any = {
        ...newField,
        field_options: newField.field_options
          ? newField.field_options.split(',').map(o => o.trim())
          : undefined
      }
      await api.post('/settings/field-catalog', payload)
      setShowAddDialog(false)
      setNewField({
        field_name: '',
        field_type: 'text',
        field_label_pt: '',
        field_label_en: '',
        field_label_fr: '',
        field_label_de: '',
        field_category: 'other',
        field_options: '',
        is_required_default: false
      })
      loadCatalog()
      setMessage({ type: 'success', text: t('settings.fieldAdded') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!showEditDialog) return
    setSaving(true)
    try {
      const payload: any = {
        field_label_pt: showEditDialog.field_label_pt,
        field_label_en: showEditDialog.field_label_en,
        field_label_fr: showEditDialog.field_label_fr,
        field_label_de: showEditDialog.field_label_de,
        field_type: showEditDialog.field_type,
        field_category: showEditDialog.field_category,
        field_order: showEditDialog.field_order,
        is_required_default: showEditDialog.is_required_default,
        field_options: showEditDialog.field_options
      }
      await api.put(`/settings/field-catalog/${showEditDialog.field_name}`, payload)
      setShowEditDialog(null)
      loadCatalog()
      setMessage({ type: 'success', text: t('settings.saved') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (fieldName: string) => {
    try {
      await api.delete(`/settings/field-catalog/${fieldName}`)
      setShowDeleteDialog(null)
      loadCatalog()
      setMessage({ type: 'success', text: t('settings.fieldDeleted') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const categoryLabels: Record<string, string> = {
    identification: t('settings.categories.identification'),
    specifications: t('settings.categories.specifications'),
    installation: t('settings.categories.installation'),
    warranty: t('settings.categories.warranty'),
    maintenance: t('settings.categories.maintenance'),
    equipment: t('settings.categories.equipment'),
    electrical: t('settings.categories.electrical') || 'Elétrico',
    other: t('settings.categories.other')
  }

  const typeLabels: Record<string, string> = {
    text: 'Texto',
    number: 'Número',
    date: 'Data',
    select: 'Seleção',
    textarea: 'Texto Longo'
  }

  // Group fields by category
  const groupedFields: Record<string, CatalogField[]> = {}
  fields.forEach(field => {
    const cat = field.field_category || 'other'
    if (!groupedFields[cat]) groupedFields[cat] = []
    groupedFields[cat].push(field)
  })

  const categoryOrder = ['identification', 'specifications', 'installation', 'electrical', 'warranty', 'maintenance', 'equipment', 'other']

  const getFieldLabel = (field: CatalogField) => {
    const lang = i18n.language
    const key = `field_label_${lang}` as keyof CatalogField
    return (field[key] as string) || field.field_label_pt
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 size={32} className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.fieldCatalogDescription') || 'Gerir campos disponíveis para todos os tenants'}
        </p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('settings.newField')}
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
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-3">
                    {field.is_system ? (
                      <Shield className="h-5 w-5 text-blue-500" title={t('settings.systemField')} />
                    ) : (
                      <Tag className="h-5 w-5 text-gray-400" title={t('settings.customField')} />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getFieldLabel(field)}
                        {field.is_required_default === 1 && (
                          <span className="ml-2 text-xs text-red-500">*</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{field.field_name}</code>
                        {' · '}
                        {typeLabels[field.field_type] || field.field_type}
                        {field.is_system === 1 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                            {t('settings.systemField')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditDialog(field)}
                      className="p-2 text-gray-400 hover:text-blue-500"
                      title={t('common.edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {!field.is_system && (
                      <button
                        onClick={() => setShowDeleteDialog(field.field_name)}
                        className="p-2 text-gray-400 hover:text-red-500"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('settings.newField')}</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <FormField
                label={t('settings.fieldName') + ' (ID)'}
                name="field_name"
                value={newField.field_name}
                onChange={(v) => setNewField({ ...newField, field_name: String(v).toLowerCase().replace(/\s+/g, '_') })}
                required
                helpText="ex: contract_number"
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Label PT"
                  name="field_label_pt"
                  value={newField.field_label_pt}
                  onChange={(v) => setNewField({ ...newField, field_label_pt: String(v) })}
                  required
                />
                <FormField
                  label="Label EN"
                  name="field_label_en"
                  value={newField.field_label_en}
                  onChange={(v) => setNewField({ ...newField, field_label_en: String(v) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Label FR"
                  name="field_label_fr"
                  value={newField.field_label_fr}
                  onChange={(v) => setNewField({ ...newField, field_label_fr: String(v) })}
                />
                <FormField
                  label="Label DE"
                  name="field_label_de"
                  value={newField.field_label_de}
                  onChange={(v) => setNewField({ ...newField, field_label_de: String(v) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={t('common.type')}
                  name="field_type"
                  type="select"
                  value={newField.field_type}
                  onChange={(v) => setNewField({ ...newField, field_type: String(v) })}
                  options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
                />
                <FormField
                  label={t('common.category')}
                  name="field_category"
                  type="select"
                  value={newField.field_category}
                  onChange={(v) => setNewField({ ...newField, field_category: String(v) })}
                  options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
                />
              </div>
              {newField.field_type === 'select' && (
                <FormField
                  label={t('settings.options') || 'Opções'}
                  name="field_options"
                  value={newField.field_options}
                  onChange={(v) => setNewField({ ...newField, field_options: String(v) })}
                  helpText="Separar opções por vírgula"
                />
              )}
              <FormField
                label={t('common.required') + ' ' + t('settings.byDefault' || 'por defeito')}
                name="is_required_default"
                type="checkbox"
                value={newField.is_required_default}
                onChange={(v) => setNewField({ ...newField, is_required_default: Boolean(v) })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !newField.field_name || !newField.field_label_pt}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('common.edit')}: <code className="bg-gray-100 dark:bg-gray-700 px-2 rounded">{showEditDialog.field_name}</code>
              </h3>
              <button onClick={() => setShowEditDialog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Label PT"
                  name="field_label_pt"
                  value={showEditDialog.field_label_pt}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_label_pt: String(v) })}
                  required
                />
                <FormField
                  label="Label EN"
                  name="field_label_en"
                  value={showEditDialog.field_label_en || ''}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_label_en: String(v) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Label FR"
                  name="field_label_fr"
                  value={showEditDialog.field_label_fr || ''}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_label_fr: String(v) })}
                />
                <FormField
                  label="Label DE"
                  name="field_label_de"
                  value={showEditDialog.field_label_de || ''}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_label_de: String(v) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={t('common.type')}
                  name="field_type"
                  type="select"
                  value={showEditDialog.field_type}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_type: String(v) })}
                  options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
                />
                <FormField
                  label={t('common.category')}
                  name="field_category"
                  type="select"
                  value={showEditDialog.field_category}
                  onChange={(v) => setShowEditDialog({ ...showEditDialog, field_category: String(v) })}
                  options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
                />
              </div>
              <FormField
                label={t('settings.order') || 'Ordem'}
                name="field_order"
                type="number"
                value={showEditDialog.field_order}
                onChange={(v) => setShowEditDialog({ ...showEditDialog, field_order: Number(v) })}
              />
              <FormField
                label={t('common.required') + ' ' + (t('settings.byDefault') || 'por defeito')}
                name="is_required_default"
                type="checkbox"
                value={showEditDialog.is_required_default === 1}
                onChange={(v) => setShowEditDialog({ ...showEditDialog, is_required_default: v ? 1 : 0 })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog !== null}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => showDeleteDialog && handleDelete(showDeleteDialog)}
        title={t('settings.deleteField')}
        message={t('settings.deleteFieldConfirm')}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  )
}

export default FieldCatalog
